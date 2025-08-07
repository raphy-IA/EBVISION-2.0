require('dotenv').config();
const { pool } = require('./src/utils/database');

async function verifierFeuilleCyrille() {
    console.log('🔍 Vérification de la feuille de temps de Cyrille Djiki');
    console.log('📅 Semaine du 04/08/2025 au 09/08/2025');
    console.log('=' .repeat(60));
    
    try {
        // 1. Vérifier l'existence du collaborateur et son user_id
        console.log('\n1️⃣ Vérification du collaborateur...');
        const collaborateurQuery = `
            SELECT c.id, c.prenom, c.nom, c.email, c.user_id
            FROM collaborateurs c
            WHERE c.prenom = 'Cyrille' AND c.nom = 'Djiki'
        `;
        const collaborateurResult = await pool.query(collaborateurQuery);
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Collaborateur Cyrille Djiki non trouvé');
            return;
        }
        
        const collaborateur = collaborateurResult.rows[0];
        console.log('✅ Collaborateur trouvé:', collaborateur);
        
        // 2. Vérifier l'existence de la feuille de temps
        console.log('\n2️⃣ Vérification de la feuille de temps...');
        const feuilleQuery = `
            SELECT ts.*, c.prenom, c.nom, c.email
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE c.id = $1 
            AND ts.week_start = '2025-08-04'
            AND ts.week_end = '2025-08-09'
        `;
        const feuilleResult = await pool.query(feuilleQuery, [collaborateur.id]);
        
        if (feuilleResult.rows.length === 0) {
            console.log('❌ Feuille de temps non trouvée pour cette semaine');
            
            // Vérifier toutes les feuilles de temps de ce collaborateur
            console.log('\n🔍 Vérification de toutes les feuilles de temps de Cyrille:');
            const toutesFeuillesQuery = `
                SELECT ts.*, c.prenom, c.nom, c.email
                FROM time_sheets ts
                JOIN collaborateurs c ON ts.user_id = c.user_id
                WHERE c.id = $1
                ORDER BY ts.week_start DESC
                LIMIT 5
            `;
            const toutesFeuillesResult = await pool.query(toutesFeuillesQuery, [collaborateur.id]);
            
            if (toutesFeuillesResult.rows.length > 0) {
                console.log('📋 Feuilles de temps existantes:');
                toutesFeuillesResult.rows.forEach((feuille, index) => {
                    console.log(`${index + 1}. Semaine: ${feuille.week_start} au ${feuille.week_end}, Statut: ${feuille.statut}`);
                });
            } else {
                console.log('❌ Aucune feuille de temps trouvée pour ce collaborateur');
            }
            return;
        }
        
        const feuille = feuilleResult.rows[0];
        console.log('✅ Feuille de temps trouvée:', {
            id: feuille.id,
            statut: feuille.statut,
            semaine: `${feuille.week_start} au ${feuille.week_end}`,
            collaborateur: `${feuille.prenom} ${feuille.nom}`
        });
        
        // 3. Vérifier les entrées de temps
        console.log('\n3️⃣ Vérification des entrées de temps...');
        const entreesQuery = `
            SELECT te.*, 
                   m.nom as mission_nom,
                   t.description as task_nom,
                   ia.description as internal_activity_nom
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id
            WHERE te.time_sheet_id = $1
            ORDER BY te.date_saisie, te.type_heures
        `;
        const entreesResult = await pool.query(entreesQuery, [feuille.id]);
        
        console.log(`📊 ${entreesResult.rows.length} entrées de temps trouvées`);
        
        if (entreesResult.rows.length > 0) {
            console.log('\n📋 Détail des entrées:');
            entreesResult.rows.forEach((entree, index) => {
                console.log(`${index + 1}. ${entree.date_saisie} - ${entree.type_heures} - ${entree.heures}h`);
                if (entree.mission_nom) {
                    console.log(`   Mission: ${entree.mission_nom}`);
                }
                if (entree.task_nom) {
                    console.log(`   Tâche: ${entree.task_nom}`);
                }
                if (entree.internal_activity_nom) {
                    console.log(`   Activité: ${entree.internal_activity_nom}`);
                }
            });
        }
        
        // 4. Calculer les totaux
        console.log('\n4️⃣ Calcul des totaux...');
        const totauxQuery = `
            SELECT 
                type_heures,
                COUNT(*) as nombre_entrees,
                SUM(heures) as total_heures
            FROM time_entries 
            WHERE time_sheet_id = $1
            GROUP BY type_heures
        `;
        const totauxResult = await pool.query(totauxQuery, [feuille.id]);
        
        console.log('📈 Totaux par type:');
        totauxResult.rows.forEach(row => {
            const type = row.type_heures === 'chargeable' ? 'HC' : 'HNC';
            console.log(`   ${type}: ${row.total_heures}h (${row.nombre_entrees} entrées)`);
        });
        
        // 5. Total général
        const totalGeneralQuery = `
            SELECT SUM(heures) as total_general
            FROM time_entries 
            WHERE time_sheet_id = $1
        `;
        const totalGeneralResult = await pool.query(totalGeneralQuery, [feuille.id]);
        const totalGeneral = totalGeneralResult.rows[0].total_general || 0;
        
        console.log(`\n🎯 Total général: ${totalGeneral}h`);
        
        // 6. Vérifier les approbations
        console.log('\n5️⃣ Vérification des approbations...');
        const approbationsQuery = `
            SELECT tsa.*, u.prenom, u.nom
            FROM time_sheet_approvals tsa
            JOIN users u ON tsa.approver_id = u.id
            WHERE tsa.time_sheet_id = $1
            ORDER BY tsa.created_at
        `;
        const approbationsResult = await pool.query(approbationsQuery, [feuille.id]);
        
        console.log(`📋 ${approbationsResult.rows.length} approbation(s) trouvée(s)`);
        approbationsResult.rows.forEach((approbation, index) => {
            console.log(`${index + 1}. ${approbation.action} par ${approbation.prenom} ${approbation.nom} le ${approbation.created_at}`);
            if (approbation.comment) {
                console.log(`   Commentaire: "${approbation.comment}"`);
            }
        });
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifierFeuilleCyrille();
