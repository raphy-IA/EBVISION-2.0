const { pool } = require('./src/utils/database');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function cleanInactiveElements() {
    try {
        console.log('🧹 Nettoyage définitif des BU et Divisions inactives...\n');
        
        // 1. Afficher les éléments inactifs à supprimer
        console.log('📊 1. Éléments inactifs à supprimer:');
        
        // BU inactives
        const inactiveBUResult = await pool.query(`
            SELECT id, nom, code, statut, created_at 
            FROM business_units 
            WHERE statut = 'INACTIF'
            ORDER BY nom
        `);
        
        console.log(`   BU inactives (${inactiveBUResult.rows.length}):`);
        if (inactiveBUResult.rows.length > 0) {
            inactiveBUResult.rows.forEach(bu => {
                console.log(`     - ${bu.nom} (${bu.code}) - Créée le ${bu.created_at}`);
            });
        } else {
            console.log('     Aucune BU inactive');
        }
        
        // Divisions inactives
        const inactiveDivResult = await pool.query(`
            SELECT d.id, d.nom, d.code, d.statut, d.created_at, bu.nom as bu_nom
            FROM divisions d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            WHERE d.statut = 'INACTIF'
            ORDER BY bu.nom, d.nom
        `);
        
        console.log(`   Divisions inactives (${inactiveDivResult.rows.length}):`);
        if (inactiveDivResult.rows.length > 0) {
            inactiveDivResult.rows.forEach(div => {
                console.log(`     - ${div.nom} (${div.code}) - BU: ${div.bu_nom || 'N/A'} - Créée le ${div.created_at}`);
            });
        } else {
            console.log('     Aucune division inactive');
        }
        
        const totalInactive = inactiveBUResult.rows.length + inactiveDivResult.rows.length;
        
        if (totalInactive === 0) {
            console.log('\n✅ Aucun élément inactif à supprimer !');
            return;
        }
        
        // 2. Vérifier les dépendances
        console.log('\n📊 2. Vérification des dépendances:');
        
        // Vérifier si les divisions inactives ont des collaborateurs
        if (inactiveDivResult.rows.length > 0) {
            const divWithCollabResult = await pool.query(`
                SELECT d.id, d.nom, COUNT(c.id) as collaborateurs_count
                FROM divisions d
                LEFT JOIN collaborateurs c ON d.id = c.division_id
                WHERE d.statut = 'INACTIF'
                GROUP BY d.id, d.nom
                HAVING COUNT(c.id) > 0
            `);
            
            if (divWithCollabResult.rows.length > 0) {
                console.log('   ⚠️  Divisions inactives avec collaborateurs:');
                divWithCollabResult.rows.forEach(div => {
                    console.log(`     - ${div.nom}: ${div.collaborateurs_count} collaborateur(s)`);
                });
                console.log('   ❌ Impossible de supprimer ces divisions (dépendances)');
                return;
            } else {
                console.log('   ✅ Aucune division inactive avec collaborateurs');
            }
        }
        
        // Vérifier si les BU inactives ont des divisions
        if (inactiveBUResult.rows.length > 0) {
            const buWithDivsResult = await pool.query(`
                SELECT bu.id, bu.nom, COUNT(d.id) as divisions_count
                FROM business_units bu
                LEFT JOIN divisions d ON bu.id = d.business_unit_id
                WHERE bu.statut = 'INACTIF'
                GROUP BY bu.id, bu.nom
                HAVING COUNT(d.id) > 0
            `);
            
            if (buWithDivsResult.rows.length > 0) {
                console.log('   ⚠️  BU inactives avec divisions:');
                buWithDivsResult.rows.forEach(bu => {
                    console.log(`     - ${bu.nom}: ${bu.divisions_count} division(s)`);
                });
                console.log('   ❌ Impossible de supprimer ces BU (dépendances)');
                return;
            } else {
                console.log('   ✅ Aucune BU inactive avec divisions');
            }
        }
        
        // 3. Demander confirmation
        console.log(`\n⚠️  ATTENTION: ${totalInactive} élément(s) inactif(s) seront supprimé(s) définitivement.`);
        console.log('   Cette action ne peut pas être annulée !');
        
        const confirm = await question('Êtes-vous ABSOLUMENT sûr de vouloir continuer ? (oui/non): ');
        
        if (confirm.toLowerCase() !== 'oui') {
            console.log('❌ Opération annulée');
            return;
        }
        
        // 4. Supprimer les divisions inactives d'abord
        console.log('\n🗑️  4. Suppression des divisions inactives...');
        if (inactiveDivResult.rows.length > 0) {
            for (const div of inactiveDivResult.rows) {
                try {
                    await pool.query('DELETE FROM divisions WHERE id = $1', [div.id]);
                    console.log(`   ✅ Division supprimée: ${div.nom}`);
                } catch (error) {
                    console.log(`   ❌ Erreur suppression division ${div.nom}:`, error.message);
                }
            }
        } else {
            console.log('   Aucune division inactive à supprimer');
        }
        
        // 5. Supprimer les BU inactives
        console.log('\n🗑️  5. Suppression des BU inactives...');
        if (inactiveBUResult.rows.length > 0) {
            for (const bu of inactiveBUResult.rows) {
                try {
                    await pool.query('DELETE FROM business_units WHERE id = $1', [bu.id]);
                    console.log(`   ✅ BU supprimée: ${bu.nom}`);
                } catch (error) {
                    console.log(`   ❌ Erreur suppression BU ${bu.nom}:`, error.message);
                }
            }
        } else {
            console.log('   Aucune BU inactive à supprimer');
        }
        
        // 6. Vérification finale
        console.log('\n📊 6. Vérification finale:');
        const finalBUResult = await pool.query('SELECT COUNT(*) as total FROM business_units');
        const finalDivResult = await pool.query('SELECT COUNT(*) as total FROM divisions');
        const finalActiveBUResult = await pool.query("SELECT COUNT(*) as total FROM business_units WHERE statut = 'ACTIF'");
        const finalActiveDivResult = await pool.query("SELECT COUNT(*) as total FROM divisions WHERE statut = 'ACTIF'");
        
        console.log(`   Total BU: ${finalBUResult.rows[0].total} (toutes actives: ${finalActiveBUResult.rows[0].total})`);
        console.log(`   Total divisions: ${finalDivResult.rows[0].total} (toutes actives: ${finalActiveDivResult.rows[0].total})`);
        
        if (finalBUResult.rows[0].total === finalActiveBUResult.rows[0].total && 
            finalDivResult.rows[0].total === finalActiveDivResult.rows[0].total) {
            console.log('   ✅ Tous les éléments restants sont actifs !');
        }
        
        console.log('\n✅ Nettoyage terminé avec succès !');
        console.log('   Tous les sélecteurs n\'afficheront maintenant que les éléments actifs.');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        rl.close();
        await pool.end();
    }
}

cleanInactiveElements();
