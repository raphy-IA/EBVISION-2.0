const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runFixMigration() {
    try {
        console.log('🚀 Exécution de la migration 010_fix_taux_horaires_structure.sql...');
        
        const migrationPath = path.join(__dirname, '../database/migrations/010_fix_taux_horaires_structure.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📊 Exécution des requêtes SQL...');
        await pool.query(migrationSQL);
        
        console.log('✅ Migration 010 exécutée avec succès !');
        
        // Vérifier que les taux horaires ont été créés avec le salaire de base
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_taux,
                COUNT(CASE WHEN salaire_base IS NOT NULL THEN 1 END) as avec_salaire_base,
                AVG(taux_horaire) as taux_moyen,
                AVG(salaire_base) as salaire_moyen
            FROM taux_horaires
        `);
        
        const stats = result.rows[0];
        console.log(`📋 Taux horaires créés: ${stats.total_taux}`);
        console.log(`💰 Avec salaire de base: ${stats.avec_salaire_base}`);
        console.log(`📊 Taux horaire moyen: ${parseFloat(stats.taux_moyen).toFixed(2)}€`);
        console.log(`💵 Salaire de base moyen: ${parseFloat(stats.salaire_moyen).toFixed(2)}€`);
        
        // Afficher quelques exemples
        const examples = await pool.query(`
            SELECT 
                th.taux_horaire,
                th.salaire_base,
                g.nom as grade,
                d.nom as division
            FROM taux_horaires th
            LEFT JOIN grades g ON th.grade_id = g.id
            LEFT JOIN divisions d ON th.division_id = d.id
            LIMIT 5
        `);
        
        console.log('\n📋 Exemples de taux horaires:');
        examples.rows.forEach(row => {
            console.log(`  ${row.grade} - ${row.division}: ${row.taux_horaire}€/h, ${row.salaire_base}€/mois`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error.message);
    } finally {
        await pool.end();
    }
}

runFixMigration(); 