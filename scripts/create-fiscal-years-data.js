const { pool } = require('../src/utils/database.js');

async function createFiscalYearsData() {
    try {
        // Vérifier s'il y a déjà des exercices fiscaux
        const existingCount = await pool.query('SELECT COUNT(*) as count FROM fiscal_years');
        if (existingCount.rows[0].count > 0) {
            console.log('✅ Des exercices fiscaux existent déjà');
            return;
        }

        // Créer des exercices fiscaux de test
        const fiscalYears = [
            {
                annee: 2023,
                date_debut: '2023-01-01',
                date_fin: '2023-12-31',
                budget_global: 5000000,
                statut: 'FERMEE'
            },
            {
                annee: 2024,
                date_debut: '2024-01-01',
                date_fin: '2024-12-31',
                budget_global: 6000000,
                statut: 'FERMEE'
            },
            {
                annee: 2025,
                date_debut: '2025-01-01',
                date_fin: '2025-12-31',
                budget_global: 7000000,
                statut: 'EN_COURS'
            },
            {
                annee: 2026,
                date_debut: '2026-01-01',
                date_fin: '2026-12-31',
                budget_global: 8000000,
                statut: 'OUVERTE'
            }
        ];

        for (const fy of fiscalYears) {
            await pool.query(`
                INSERT INTO fiscal_years (annee, date_debut, date_fin, budget_global, statut)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (annee) DO NOTHING
            `, [fy.annee, fy.date_debut, fy.date_fin, fy.budget_global, fy.statut]);
        }

        console.log('✅ Exercices fiscaux de test créés avec succès');
        
        // Afficher les exercices créés
        const result = await pool.query('SELECT * FROM fiscal_years ORDER BY annee');
        console.log('\n📋 Exercices fiscaux créés:');
        result.rows.forEach(fy => {
            console.log(`  - ${fy.annee}: ${fy.statut} (${fy.budget_global.toLocaleString('fr-FR')} €)`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création des exercices fiscaux:', error);
    } finally {
        process.exit(0);
    }
}

createFiscalYearsData(); 