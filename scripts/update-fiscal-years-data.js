const { pool } = require('../src/utils/database.js');

async function updateFiscalYearsData() {
    try {
        console.log('🔄 Mise à jour des données des années fiscales...');

        // 1. Mettre à jour les libellés avec des valeurs plus appropriées
        const updateLibelles = `
            UPDATE fiscal_years 
            SET libelle = CASE 
                WHEN annee = 2023 THEN 'FY23'
                WHEN annee = 2024 THEN 'FY24'
                WHEN annee = 2025 THEN 'FY25'
                WHEN annee = 2026 THEN 'FY26'
                ELSE 'FY' || annee::text
            END
            WHERE libelle LIKE 'FY%'
        `;
        
        await pool.query(updateLibelles);
        console.log('✅ Libellés mis à jour');

        // 2. S'assurer qu'une seule année fiscale soit en cours
        const checkCurrent = await pool.query(`
            SELECT COUNT(*) as count 
            FROM fiscal_years 
            WHERE statut = 'EN_COURS'
        `);
        
        const currentCount = parseInt(checkCurrent.rows[0].count);
        
        if (currentCount > 1) {
            // Si plusieurs années sont en cours, ne garder que la plus récente
            await pool.query(`
                UPDATE fiscal_years 
                SET statut = 'OUVERTE' 
                WHERE statut = 'EN_COURS' 
                AND id NOT IN (
                    SELECT id FROM fiscal_years 
                    WHERE statut = 'EN_COURS' 
                    ORDER BY annee DESC 
                    LIMIT 1
                )
            `);
            console.log('✅ Correction des années en cours - une seule année active');
        } else if (currentCount === 0) {
            // Si aucune année n'est en cours, activer la plus récente ouverte
            await pool.query(`
                UPDATE fiscal_years 
                SET statut = 'EN_COURS' 
                WHERE id = (
                    SELECT id FROM fiscal_years 
                    WHERE statut = 'OUVERTE' 
                    ORDER BY annee DESC 
                    LIMIT 1
                )
            `);
            console.log('✅ Activation de l\'année fiscale la plus récente');
        }

        // 3. Afficher l'état final
        const finalState = await pool.query(`
            SELECT annee, libelle, statut, budget_global 
            FROM fiscal_years 
            ORDER BY annee DESC
        `);
        
        console.log('\n📊 État final des années fiscales:');
        finalState.rows.forEach(row => {
            console.log(`   ${row.libelle} (${row.annee}) - ${row.statut} - ${row.budget_global.toLocaleString('fr-FR')} €`);
        });

        console.log('\n✅ Mise à jour terminée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
    } finally {
        await pool.end();
    }
}

updateFiscalYearsData(); 