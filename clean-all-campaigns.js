const { pool } = require('./src/utils/database');

async function cleanAllCampaigns() {
    console.log('🧹 Nettoyage complet des campagnes de prospection...\n');
    
    try {
        // Démarrer une transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            console.log('📊 Statistiques avant nettoyage :');
            
            // Compter les données existantes
            const statsBefore = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM prospecting_campaigns) as campaigns,
                    (SELECT COUNT(*) FROM prospecting_campaign_companies) as campaign_companies,
                    (SELECT COUNT(*) FROM prospecting_campaign_validations) as validations,
                    (SELECT COUNT(*) FROM prospecting_campaign_validation_companies) as validation_companies,
                    (SELECT COUNT(*) FROM prospecting_campaign_summary) as summary_entries
            `);
            
            const stats = statsBefore.rows[0];
            console.log(`   - Campagnes: ${stats.campaigns}`);
            console.log(`   - Entreprises dans campagnes: ${stats.campaign_companies}`);
            console.log(`   - Validations: ${stats.validations}`);
            console.log(`   - Entreprises dans validations: ${stats.validation_companies}`);
            console.log(`   - Entrées dans le résumé: ${stats.summary_entries}\n`);
            
            // Demander confirmation
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const answer = await new Promise((resolve) => {
                rl.question('⚠️  ATTENTION: Cette action va supprimer TOUTES les campagnes et données associées.\nÊtes-vous sûr de vouloir continuer ? (oui/non): ', resolve);
            });
            
            rl.close();
            
            if (answer.toLowerCase() !== 'oui') {
                console.log('❌ Opération annulée par l\'utilisateur');
                return;
            }
            
            console.log('🗑️  Suppression en cours...\n');
            
            // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
            const deletions = [
                { table: 'prospecting_campaign_validation_companies', description: 'Entreprises dans les validations' },
                { table: 'prospecting_campaign_validations', description: 'Validations de campagnes' },
                { table: 'prospecting_campaign_companies', description: 'Entreprises dans les campagnes' },
                { table: 'prospecting_campaigns', description: 'Campagnes de prospection' }
            ];
            
            for (const deletion of deletions) {
                console.log(`   🗑️  Suppression de ${deletion.description}...`);
                const result = await client.query(`DELETE FROM ${deletion.table}`);
                console.log(`      ✅ ${result.rowCount} enregistrement(s) supprimé(s)`);
            }
            
            // Vérifier que la vue prospecting_campaign_summary est vide
            console.log('   🗑️  Vérification de la vue de résumé...');
            const summaryCheck = await client.query('SELECT COUNT(*) as count FROM prospecting_campaign_summary');
            console.log(`      ✅ Vue de résumé: ${summaryCheck.rows[0].count} entrée(s)`);
            
            // Valider la transaction
            await client.query('COMMIT');
            
            console.log('\n✅ Nettoyage terminé avec succès !');
            
            // Afficher les statistiques après nettoyage
            console.log('\n📊 Statistiques après nettoyage :');
            const statsAfter = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM prospecting_campaigns) as campaigns,
                    (SELECT COUNT(*) FROM prospecting_campaign_companies) as campaign_companies,
                    (SELECT COUNT(*) FROM prospecting_campaign_validations) as validations,
                    (SELECT COUNT(*) FROM prospecting_campaign_validation_companies) as validation_companies,
                    (SELECT COUNT(*) FROM prospecting_campaign_summary) as summary_entries
            `);
            
            const statsFinal = statsAfter.rows[0];
            console.log(`   - Campagnes: ${statsFinal.campaigns}`);
            console.log(`   - Entreprises dans campagnes: ${statsFinal.campaign_companies}`);
            console.log(`   - Validations: ${statsFinal.validations}`);
            console.log(`   - Entreprises dans validations: ${statsFinal.validation_companies}`);
            console.log(`   - Entrées dans le résumé: ${statsFinal.summary_entries}`);
            
            console.log('\n🎯 Base de données des campagnes maintenant propre !');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    } finally {
        await pool.end();
    }
}

cleanAllCampaigns();
