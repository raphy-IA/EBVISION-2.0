require('dotenv').config();
const { pool } = require('../src/utils/database');

async function checkClientData() {
    try {
        console.log('🔍 Vérification des données d\'un client...\n');
        
        // Récupérer un client avec toutes ses colonnes
        const clientQuery = `
            SELECT 
                id, nom, email, telephone, adresse, ville, code_postal, pays,
                secteur_activite, taille_entreprise, statut, source_prospection,
                notes, collaborateur_id, created_by, created_at, updated_by, updated_at,
                numero_contribuable, forme_juridique, effectif, chiffre_affaires, resultat_net,
                groupe_id, est_filiale, latitude, longitude, site_web, linkedin_url,
                date_creation_entreprise, secteur_geographique, notation, risque_client,
                date_derniere_activite, nombre_missions, nombre_opportunites, chiffre_affaires_total
            FROM clients 
            LIMIT 1;
        `;
        
        const result = await pool.query(clientQuery);
        
        if (result.rows.length > 0) {
            const client = result.rows[0];
            
            console.log('📋 Données du client:');
            console.log('=' .repeat(80));
            
            Object.keys(client).forEach(key => {
                const value = client[key];
                const status = value === null || value === undefined || value === '' ? '❌ VIDE' : '✅ REMPLI';
                console.log(`${key.padEnd(25)} | ${status} | ${value}`);
            });
            
            console.log('\n📊 Résumé:');
            const totalColumns = Object.keys(client).length;
            const filledColumns = Object.values(client).filter(v => v !== null && v !== undefined && v !== '').length;
            const emptyColumns = totalColumns - filledColumns;
            
            console.log(`- Total colonnes: ${totalColumns}`);
            console.log(`- Colonnes remplies: ${filledColumns}`);
            console.log(`- Colonnes vides: ${emptyColumns}`);
            console.log(`- Taux de remplissage: ${((filledColumns / totalColumns) * 100).toFixed(1)}%`);
            
        } else {
            console.log('Aucun client trouvé en base de données.');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkClientData(); 