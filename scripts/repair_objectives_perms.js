const { pool } = require('../src/utils/database');

async function repair() {
    try {
        console.log('--- RÉPARATION DES PERMISSIONS ---');

        const permissions = [
            { code: 'objectives.global.distribute', name: 'Distribuer objectifs (Global)', category: 'objectives' },
            { code: 'objectives.global.edit', name: 'Modifier objectifs (Global)', category: 'objectives' },
            { code: 'objectives.global.view', name: 'Voir tous les objectifs (Global)', category: 'objectives' },
            { code: 'objectives.bu.distribute', name: 'Distribuer objectifs (BU)', category: 'objectives' },
            { code: 'objectives.bu.edit', name: 'Modifier objectifs (BU)', category: 'objectives' },
            { code: 'objectives.bu.view', name: 'Voir objectifs (BU)', category: 'objectives' },
            { code: 'objectives.division.distribute', name: 'Distribuer objectifs (Division)', category: 'objectives' },
            { code: 'objectives.division.edit', name: 'Modifier objectifs (Division)', category: 'objectives' },
            { code: 'objectives.division.view', name: 'Voir objectifs (Division)', category: 'objectives' },
            { code: 'objectives.grade.distribute', name: 'Distribuer objectifs (Grade)', category: 'objectives' },
            { code: 'objectives.grade.edit', name: 'Modifier objectifs (Grade)', category: 'objectives' },
            { code: 'objectives.grade.view', name: 'Voir objectifs (Grade)', category: 'objectives' },
            { code: 'objectives.individual.edit', name: 'Modifier objectifs (Individuel)', category: 'objectives' },
            { code: 'objectives.individual.view', name: 'Voir objectifs (Individuel)', category: 'objectives' },
            { code: 'objectives:create', name: 'Créer objectives', category: 'objectives' },
            { code: 'objectives:delete', name: 'Supprimer objectives', category: 'objectives' },
            { code: 'objectives:update', name: 'Modifier objectives', category: 'objectives' }
        ];

        // 1. Créer les permissions si elles n'existent pas
        for (const p of permissions) {
            await pool.query(`
                INSERT INTO permissions (code, name, category)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO UPDATE SET name = $2, category = $3
            `, [p.code, p.name, p.category]);
        }
        console.log('✅ Permissions créées/mises à jour.');

        // 2. Récupérer l'ID du rôle SENIOR_PARTNER
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'SENIOR_PARTNER'");
        if (roleRes.rows.length === 0) {
            console.log('❌ Rôle SENIOR_PARTNER non trouvé.');
            return;
        }
        const roleId = roleRes.rows[0].id;

        // 3. Assigner toutes ces permissions au rôle SENIOR_PARTNER
        for (const p of permissions) {
            await pool.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT $1, id FROM permissions WHERE code = $2
                ON CONFLICT DO NOTHING
            `, [roleId, p.code]);
        }
        console.log('✅ Permissions assignées au rôle SENIOR_PARTNER.');

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}

repair();
