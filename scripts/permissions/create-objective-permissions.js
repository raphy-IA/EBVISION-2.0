// Script pour créer les permissions liées aux objectifs
require('dotenv').config();
const { Pool } = require('pg');

async function createObjectivePermissions() {
    console.log('🔌 Création des permissions d\'objectifs...\n');

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

        console.log('1️⃣ Test de connexion...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure: ${testResult.rows[0].current_time}`);

        console.log('\n2️⃣ Création des permissions d\'objectifs...');

        const objectivePermissions = [
            // GLOBAL
            { name: 'objectives.global.view', code: 'OBJECTIVES_GLOBAL_VIEW', description: 'Voir les objectifs globaux', category: 'objectives' },
            { name: 'objectives.global.create', code: 'OBJECTIVES_GLOBAL_CREATE', description: 'Créer des objectifs globaux', category: 'objectives' },
            { name: 'objectives.global.edit', code: 'OBJECTIVES_GLOBAL_EDIT', description: 'Modifier les objectifs globaux', category: 'objectives' },
            { name: 'objectives.global.delete', code: 'OBJECTIVES_GLOBAL_DELETE', description: 'Supprimer les objectifs globaux', category: 'objectives' },
            { name: 'objectives.global.distribute', code: 'OBJECTIVES_GLOBAL_DISTRIBUTE', description: 'Distribuer les objectifs globaux', category: 'objectives' },

            // BUSINESS UNIT
            { name: 'objectives.bu.view', code: 'OBJECTIVES_BU_VIEW', description: 'Voir les objectifs BU', category: 'objectives' },
            { name: 'objectives.bu.create', code: 'OBJECTIVES_BU_CREATE', description: 'Créer des objectifs BU', category: 'objectives' },
            { name: 'objectives.bu.edit', code: 'OBJECTIVES_BU_EDIT', description: 'Modifier les objectifs BU', category: 'objectives' },
            { name: 'objectives.bu.delete', code: 'OBJECTIVES_BU_DELETE', description: 'Supprimer les objectifs BU', category: 'objectives' },
            { name: 'objectives.bu.distribute', code: 'OBJECTIVES_BU_DISTRIBUTE', description: 'Distribuer les objectifs BU', category: 'objectives' },

            // DIVISION
            { name: 'objectives.division.view', code: 'OBJECTIVES_DIVISION_VIEW', description: 'Voir les objectifs Division', category: 'objectives' },
            { name: 'objectives.division.create', code: 'OBJECTIVES_DIVISION_CREATE', description: 'Créer des objectifs Division', category: 'objectives' },
            { name: 'objectives.division.edit', code: 'OBJECTIVES_DIVISION_EDIT', description: 'Modifier les objectifs Division', category: 'objectives' },
            { name: 'objectives.division.delete', code: 'OBJECTIVES_DIVISION_DELETE', description: 'Supprimer les objectifs Division', category: 'objectives' },
            { name: 'objectives.division.distribute', code: 'OBJECTIVES_DIVISION_DISTRIBUTE', description: 'Distribuer les objectifs Division', category: 'objectives' },

            // GRADE
            { name: 'objectives.grade.view', code: 'OBJECTIVES_GRADE_VIEW', description: 'Voir les objectifs Grade', category: 'objectives' },
            { name: 'objectives.grade.create', code: 'OBJECTIVES_GRADE_CREATE', description: 'Créer des objectifs Grade', category: 'objectives' },
            { name: 'objectives.grade.edit', code: 'OBJECTIVES_GRADE_EDIT', description: 'Modifier les objectifs Grade', category: 'objectives' },
            { name: 'objectives.grade.delete', code: 'OBJECTIVES_GRADE_DELETE', description: 'Supprimer les objectifs Grade', category: 'objectives' },
            { name: 'objectives.grade.distribute', code: 'OBJECTIVES_GRADE_DISTRIBUTE', description: 'Distribuer les objectifs Grade', category: 'objectives' },

            // INDIVIDUAL
            { name: 'objectives.individual.view', code: 'OBJECTIVES_INDIVIDUAL_VIEW', description: 'Voir les objectifs Individuels', category: 'objectives' },
            { name: 'objectives.individual.create', code: 'OBJECTIVES_INDIVIDUAL_CREATE', description: 'Créer des objectifs Individuels', category: 'objectives' },
            { name: 'objectives.individual.edit', code: 'OBJECTIVES_INDIVIDUAL_EDIT', description: 'Modifier les objectifs Individuels', category: 'objectives' },
            { name: 'objectives.individual.delete', code: 'OBJECTIVES_INDIVIDUAL_DELETE', description: 'Supprimer les objectifs Individuels', category: 'objectives' }
        ];

        let createdCount = 0;

        for (const perm of objectivePermissions) {
            try {
                // Vérifier si la permission existe déjà
                const existing = await productionPool.query('SELECT id FROM permissions WHERE code = $1', [perm.code]);

                if (existing.rows.length === 0) {
                    await productionPool.query(`
                        INSERT INTO permissions (id, name, code, description, category, created_at, updated_at)
                        VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `, [perm.name, perm.code, perm.description, perm.category]);

                    console.log(`   ✅ ${perm.name} (${perm.code}) créée`);
                    createdCount++;
                } else {
                    console.log(`   ⚠️ ${perm.name} - déjà existante`);
                }

            } catch (error) {
                console.log(`   ❌ ${perm.name} - ${error.message}`);
            }
        }

        console.log(`\n🎯 Résultat: ${createdCount} permissions d'objectifs créées`);

        console.log('\n3️⃣ Association des permissions au rôle SUPER_ADMIN...');

        const superAdminRole = await productionPool.query('SELECT id FROM roles WHERE name = $1', ['SUPER_ADMIN']);

        if (superAdminRole.rows.length > 0) {
            const roleId = superAdminRole.rows[0].id;
            const allObjPermissions = await productionPool.query("SELECT id, name, code FROM permissions WHERE category = 'objectives'");

            let associatedCount = 0;
            for (const perm of allObjPermissions.rows) {
                try {
                    await productionPool.query(`
                        INSERT INTO role_permissions (id, role_id, permission_id, created_at) 
                        VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
                        ON CONFLICT (role_id, permission_id) DO NOTHING
                    `, [roleId, perm.id]);
                    associatedCount++;
                } catch (error) {
                    console.log(`   ❌ Erreur association ${perm.name}: ${error.message}`);
                }
            }
            console.log(`   ✅ ${associatedCount} permissions associées à SUPER_ADMIN`);
        }

        await productionPool.end();
        console.log('\n🎉 Terminé !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

createObjectivePermissions().catch(console.error);
