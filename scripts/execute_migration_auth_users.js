require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Hash from existing user (ensures format validity)
const DEFAULT_HASH = '$2a$12$5fCFUGtRoPxuOh5i4EDoXOapadh1oN0/rbTslGABbxQgrxbjW3o5O';

async function createAuthUsers() {
    console.log('🚀 Creating Missing Auth Users...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get Orphans
        const res = await client.query("SELECT id, nom, prenom, email FROM collaborateurs WHERE user_id IS NULL");
        const orphans = res.rows;

        console.log(`   Found ${orphans.length} collaborators without User ID.`);

        let created = 0;
        let linked = 0;
        let errors = 0;

        for (const collab of orphans) {
            try {
                await client.query('SAVEPOINT sp_user');
                const { id: collabId, nom, prenom, email } = collab;

                if (!email) {
                    console.log(`   ⚠️ Skipping ${nom} ${prenom} - No Email.`);
                    errors++;
                    continue;
                }

                // Check if User exists
                const uCheck = await client.query("SELECT id FROM users WHERE email = $1", [email]);

                let userId = null;

                if (uCheck.rows.length > 0) {
                    userId = uCheck.rows[0].id;
                    console.log(`   🔗 Linking existing user for ${email}`);
                    linked++;
                } else {
                    // Create User
                    const insert = await client.query(`
                        INSERT INTO users (
                            id, email, password_hash, statut, nom, prenom, login, role, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), $1, $2, 'ACTIF', $3, $4, $5, 'COLLABORATEUR', NOW(), NOW()
                        ) RETURNING id
                    `, [email, DEFAULT_HASH, nom, prenom || '', email]);

                    userId = insert.rows[0].id;
                    console.log(`   ✨ Created user for ${email}`);
                    created++;
                }

                // Update Collaborateur
                await client.query("UPDATE collaborateurs SET user_id = $1 WHERE id = $2", [userId, collabId]);

                await client.query('RELEASE SAVEPOINT sp_user');

            } catch (err) {
                await client.query('ROLLBACK TO SAVEPOINT sp_user');
                console.error(`   ❌ Error processing ${collab.email}:`, err.message);
                errors++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Auth User Migration Done.`);
        console.log(`   Created: ${created}`);
        console.log(`   Linked:  ${linked}`);
        console.log(`   Errors:  ${errors}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Fatal:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

createAuthUsers();
