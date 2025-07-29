require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runMigration019() {
    try {
        console.log('🚀 Exécution de la migration 019: Création de la table opportunities...\n');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '019_create_opportunities_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Contenu de la migration:');
        console.log('=' .repeat(80));
        console.log(migrationSQL);
        console.log('=' .repeat(80));
        
        // Exécuter la migration
        console.log('\n🔧 Exécution de la migration...');
        await pool.query(migrationSQL);
        
        console.log('✅ Migration 019 exécutée avec succès !');
        
        // Vérifier que la table a été créée
        console.log('\n🔍 Vérification de la table opportunities...');
        const checkQuery = `
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunities'
            ORDER BY ordinal_position;
        `;
        
        const result = await pool.query(checkQuery);
        
        console.log('📋 Structure de la table opportunities:');
        console.log('=' .repeat(80));
        
        if (result.rows.length > 0) {
            result.rows.forEach((column, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${column.column_name.padEnd(20)} | ${column.data_type.padEnd(15)} | ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        } else {
            console.log('❌ Table opportunities non trouvée');
        }
        
        // Vérifier les données de test
        console.log('\n🔍 Vérification des données de test...');
        const dataQuery = 'SELECT COUNT(*) as count FROM opportunities';
        const dataResult = await pool.query(dataQuery);
        
        console.log(`📊 Nombre d'opportunités créées: ${dataResult.rows[0].count}`);
        
        // Afficher quelques opportunités
        const sampleQuery = `
            SELECT 
                o.nom,
                o.statut,
                o.montant_estime,
                o.devise,
                c.nom as client_nom
            FROM opportunities o
            LEFT JOIN clients c ON o.client_id = c.id
            LIMIT 3;
        `;
        
        const sampleResult = await pool.query(sampleQuery);
        
        console.log('\n📋 Exemples d\'opportunités:');
        console.log('=' .repeat(80));
        
        sampleResult.rows.forEach((opp, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${opp.nom.padEnd(35)} | ${opp.statut.padEnd(10)} | ${opp.montant_estime} ${opp.devise} | ${opp.client_nom}`);
        });
        
        console.log('\n✅ Migration 019 terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration 019:', error);
    } finally {
        await pool.end();
    }
}

runMigration019(); 