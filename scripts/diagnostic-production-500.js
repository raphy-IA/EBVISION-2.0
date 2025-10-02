// Script pour diagnostiquer l'erreur 500 en production
require('dotenv').config();
const { Pool } = require('pg');

async function diagnosticProduction500() {
    console.log('🔍 Diagnostic de l\'erreur 500 en production...\n');

    try {
        const productionPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
            user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
            password: process.env.DB_PASSWORD || '87ifet-Z)&',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: false,
            family: 4
        });

        console.log('1️⃣ Test de connexion à la production...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion production réussie - Heure: ${testResult.rows[0].current_time}`);

        console.log('\n2️⃣ Vérification de la structure role_permissions en production...');
        
        const structure = await productionPool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'role_permissions'
            ORDER BY ordinal_position
        `);

        console.log('📋 Colonnes de role_permissions en production:');
        structure.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultValue = col.column_default ? ` (défaut: ${col.column_default})` : '';
            console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`);
        });

        console.log('\n3️⃣ Vérification des contraintes en production...');
        
        const constraints = await productionPool.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'role_permissions'::regclass
        `);

        console.log('🔒 Contraintes en production:');
        constraints.rows.forEach(constraint => {
            console.log(`   - ${constraint.conname} (${constraint.contype}): ${constraint.definition}`);
        });

        console.log('\n4️⃣ Test d\'insertion en production...');
        
        // Récupérer un rôle et une permission existants
        const roleResult = await productionPool.query('SELECT id, name FROM roles WHERE name != \'SUPER_ADMIN\' LIMIT 1');
        const permissionResult = await productionPool.query('SELECT id, code FROM permissions WHERE name LIKE \'menu.%\' LIMIT 1');
        
        if (roleResult.rows.length === 0 || permissionResult.rows.length === 0) {
            console.log('❌ Pas de rôles ou permissions pour tester');
            return;
        }

        const roleId = roleResult.rows[0].id;
        const permissionId = permissionResult.rows[0].id;
        const roleName = roleResult.rows[0].name;
        const permissionCode = permissionResult.rows[0].code;
        
        console.log(`🔍 Test avec role: ${roleName} (${roleId}), permission: ${permissionCode} (${permissionId})`);

        // Vérifier si la permission existe déjà
        const existingPermission = await productionPool.query(`
            SELECT COUNT(*) as count FROM role_permissions 
            WHERE role_id = $1 AND permission_id = $2
        `, [roleId, permissionId]);

        if (parseInt(existingPermission.rows[0].count) > 0) {
            console.log('⚠️ Permission déjà existante, test de suppression...');
            
            try {
                const deleteResult = await productionPool.query(`
                    DELETE FROM role_permissions
                    WHERE role_id = $1 AND permission_id = $2
                    RETURNING *
                `, [roleId, permissionId]);
                
                console.log('✅ Suppression réussie pour le test');
                
            } catch (deleteError) {
                console.log(`❌ Erreur de suppression: ${deleteError.message}`);
                return;
            }
        }

        try {
            // Test d'insertion avec ON CONFLICT
            const insertResult = await productionPool.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
                ON CONFLICT (role_id, permission_id) DO NOTHING
                RETURNING *
            `, [roleId, permissionId]);
            
            console.log('✅ Insertion avec ON CONFLICT réussie !');
            console.log(`   Enregistrement créé: ${JSON.stringify(insertResult.rows[0])}`);
            
        } catch (insertError) {
            console.log(`❌ Erreur d'insertion avec ON CONFLICT: ${insertError.message}`);
            
            // Essayer sans ON CONFLICT
            try {
                const simpleInsert = await productionPool.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    RETURNING *
                `, [roleId, permissionId]);
                
                console.log('✅ Insertion simple réussie !');
                console.log(`   Enregistrement créé: ${JSON.stringify(simpleInsert.rows[0])}`);
                
            } catch (simpleError) {
                console.log(`❌ Erreur insertion simple: ${simpleError.message}`);
                
                // Vérifier les erreurs spécifiques
                if (simpleError.message.includes('duplicate key')) {
                    console.log('💡 Problème: Clé dupliquée - la contrainte unique ne fonctionne pas');
                } else if (simpleError.message.includes('foreign key')) {
                    console.log('💡 Problème: Clé étrangère invalide');
                } else if (simpleError.message.includes('not null')) {
                    console.log('💡 Problème: Valeur NULL dans une colonne NOT NULL');
                }
            }
        }

        console.log('\n5️⃣ Vérification des permissions actuelles du rôle...');
        
        const currentPermissions = await productionPool.query(`
            SELECT p.name, p.code, p.category
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = $1
            ORDER BY p.name
        `, [roleId]);

        console.log(`📋 Permissions actuelles du rôle ${roleName}:`);
        currentPermissions.rows.forEach(perm => {
            console.log(`   - ${perm.name} (${perm.code}) - ${perm.category}`);
        });

        await productionPool.end();

        console.log('\n🎯 DIAGNOSTIC TERMINÉ');
        console.log('\n💡 Si l\'insertion fonctionne ici mais pas via l\'API,');
        console.log('   le problème est dans le code de l\'application ou le middleware');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

diagnosticProduction500().catch(console.error);








