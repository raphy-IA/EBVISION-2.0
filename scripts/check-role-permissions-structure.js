// Script pour vérifier la structure de la table role_permissions
require('dotenv').config();
const { Pool } = require('pg');

async function checkRolePermissionsStructure() {
    console.log('🔍 Vérification de la structure de role_permissions...\n');

    try {
        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'eb_vision_2_0',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'Canaan@2020',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: false
        });

        console.log('1️⃣ Test de connexion...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure: ${testResult.rows[0].current_time}`);

        console.log('\n2️⃣ Structure de la table role_permissions...');
        
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'role_permissions'
            ORDER BY ordinal_position
        `);

        if (structure.rows.length === 0) {
            console.log('❌ Table role_permissions n\'existe pas !');
            return;
        }

        console.log('📋 Colonnes de role_permissions:');
        structure.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultValue = col.column_default ? ` (défaut: ${col.column_default})` : '';
            console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`);
        });

        console.log('\n3️⃣ Contraintes de la table...');
        
        const constraints = await pool.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'role_permissions'::regclass
        `);

        if (constraints.rows.length === 0) {
            console.log('⚠️ Aucune contrainte trouvée');
        } else {
            console.log('🔒 Contraintes:');
            constraints.rows.forEach(constraint => {
                console.log(`   - ${constraint.conname} (${constraint.contype}): ${constraint.definition}`);
            });
        }

        console.log('\n4️⃣ Test d\'insertion...');
        
        // Récupérer un rôle et une permission existants
        const roleResult = await pool.query('SELECT id FROM roles LIMIT 1');
        const permissionResult = await pool.query('SELECT id FROM permissions LIMIT 1');
        
        if (roleResult.rows.length === 0 || permissionResult.rows.length === 0) {
            console.log('❌ Pas de rôles ou permissions pour tester');
            return;
        }

        const roleId = roleResult.rows[0].id;
        const permissionId = permissionResult.rows[0].id;
        
        console.log(`🔍 Test avec role_id: ${roleId}, permission_id: ${permissionId}`);

        try {
            // Test d'insertion simple
            const insertResult = await pool.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
                ON CONFLICT (role_id, permission_id) DO NOTHING
                RETURNING *
            `, [roleId, permissionId]);
            
            console.log('✅ Insertion réussie !');
            console.log(`   Enregistrement créé: ${JSON.stringify(insertResult.rows[0])}`);
            
            // Nettoyer le test
            await pool.query(`
                DELETE FROM role_permissions 
                WHERE role_id = $1 AND permission_id = $2
            `, [roleId, permissionId]);
            console.log('🧹 Test nettoyé');
            
        } catch (insertError) {
            console.log(`❌ Erreur d'insertion: ${insertError.message}`);
            
            // Essayer sans ON CONFLICT
            try {
                const simpleInsert = await pool.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    RETURNING *
                `, [roleId, permissionId]);
                
                console.log('✅ Insertion simple réussie !');
                console.log(`   Enregistrement créé: ${JSON.stringify(simpleInsert.rows[0])}`);
                
                // Nettoyer
                await pool.query(`
                    DELETE FROM role_permissions 
                    WHERE role_id = $1 AND permission_id = $2
                `, [roleId, permissionId]);
                console.log('🧹 Test simple nettoyé');
                
            } catch (simpleError) {
                console.log(`❌ Erreur insertion simple: ${simpleError.message}`);
            }
        }

        await pool.end();

        console.log('\n🎯 DIAGNOSTIC TERMINÉ');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkRolePermissionsStructure().catch(console.error);









