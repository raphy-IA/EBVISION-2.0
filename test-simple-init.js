// Test non-interactif de l'initialisation simple
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const config = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Information@2025',
    database: 'ewm_simple_test',
    ssl: false
};

async function test() {
    console.log('\n🧪 TEST D\'INITIALISATION SIMPLE\n');
    
    const pool = new Pool(config);
    
    try {
        console.log('📡 Connexion...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connecté!\n');

        console.log('📄 Chargement du schéma...');
        const schemaPath = path.join(__dirname, 'scripts/database/schema-complete.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔨 Application du schéma...');
        await pool.query(schemaSql);
        console.log('✅ Schéma appliqué!\n');

        console.log('👥 Création des rôles...');
        const roles = [
            { nom: 'SUPER_ADMIN', badge_bg_class: 'bg-red-100', badge_text_class: 'text-red-800', badge_hex_color: '#DC2626', badge_priority: 1 },
            { nom: 'Administrateur', badge_bg_class: 'bg-orange-100', badge_text_class: 'text-orange-800', badge_hex_color: '#EA580C', badge_priority: 2 },
            { nom: 'Manager', badge_bg_class: 'bg-blue-100', badge_text_class: 'text-blue-800', badge_hex_color: '#2563EB', badge_priority: 3 },
            { nom: 'Utilisateur', badge_bg_class: 'bg-green-100', badge_text_class: 'text-green-800', badge_hex_color: '#16A34A', badge_priority: 4 }
        ];

        for (const role of roles) {
            await pool.query(`
                INSERT INTO roles (nom, description, badge_bg_class, badge_text_class, badge_hex_color, badge_priority)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (nom) DO UPDATE SET
                    badge_bg_class = EXCLUDED.badge_bg_class,
                    badge_text_class = EXCLUDED.badge_text_class,
                    badge_hex_color = EXCLUDED.badge_hex_color,
                    badge_priority = EXCLUDED.badge_priority
            `, [role.nom, `Rôle ${role.nom}`, role.badge_bg_class, role.badge_text_class, role.badge_hex_color, role.badge_priority]);
        }
        console.log('✅ Rôles créés!\n');

        console.log('👤 Création du super admin...');
        const email = 'admin@ebvision.com';
        const password = 'Admin@2025';
        const passwordHash = await bcrypt.hash(password, 10);

        const userResult = await pool.query(`
            INSERT INTO users (email, password_hash, statut)
            VALUES ($1, $2, 'ACTIF')
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
            RETURNING id
        `, [email, passwordHash]);

        const userId = userResult.rows[0].id;
        const roleResult = await pool.query(`SELECT id FROM roles WHERE nom = 'SUPER_ADMIN'`);
        const roleId = roleResult.rows[0].id;

        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
        `, [userId, roleId]);

        console.log(`   📧 Email: ${email}`);
        console.log(`   🔑 Mot de passe: ${password}`);
        console.log('✅ Super admin créé!\n');

        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        console.log(`✅ ${result.rows.length} tables créées!\n`);
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                  ✅ TEST RÉUSSI !                           ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

test();


