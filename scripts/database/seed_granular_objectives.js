const { pool } = require('../../src/utils/database');

const GRANULAR_OBJECTIVES = [
    // Global
    { code: 'objectives.global.view', name: 'Voir tous les objectifs (Global)', category: 'objectives' },
    { code: 'objectives.global.distribute', name: 'Distribuer objectifs (Global)', category: 'objectives' },

    // BU
    { code: 'objectives.bu.view', name: 'Voir objectifs (BU)', category: 'objectives' },
    { code: 'objectives.bu.edit', name: 'Modifier objectifs (BU)', category: 'objectives' },
    { code: 'objectives.bu.distribute', name: 'Distribuer objectifs (BU)', category: 'objectives' },

    // Division
    { code: 'objectives.division.view', name: 'Voir objectifs (Division)', category: 'objectives' },
    { code: 'objectives.division.edit', name: 'Modifier objectifs (Division)', category: 'objectives' },
    { code: 'objectives.division.distribute', name: 'Distribuer objectifs (Division)', category: 'objectives' },

    // Individual
    { code: 'objectives.individual.view', name: 'Voir objectifs (Individuel)', category: 'objectives' },
    { code: 'objectives.individual.edit', name: 'Modifier objectifs (Individuel)', category: 'objectives' }
];

async function seedGranularObjectives() {
    console.log('🌱 Seeding granular OBJECTIVES permissions...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let createdDetails = 0;

        for (const perm of GRANULAR_OBJECTIVES) {
            const check = await client.query('SELECT id FROM permissions WHERE code = $1', [perm.code]);

            if (check.rows.length === 0) {
                await client.query(
                    'INSERT INTO permissions (code, name, category, description, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
                    [perm.code, perm.name, perm.category, `Permission ${perm.name}`]
                );
                createdDetails++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Restore complete. Created ${createdDetails} granular permissions.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error during seeding:', e);
    } finally {
        client.release();
        pool.end();
    }
}

if (require.main === module) {
    seedGranularObjectives();
}

module.exports = seedGranularObjectives;
