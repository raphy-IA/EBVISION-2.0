// Script pour déboguer les données de campagne
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function debugCampaignData() {
    console.log('🔍 Débogage des données de campagne\n');
    
    try {
        // 1. Vérifier la campagne spécifique
        console.log('1️⃣ Vérification de la campagne "Campagne 2"...');
        const campaign = await pool.query(`
            SELECT * FROM prospecting_campaigns 
            WHERE name = 'Campagne 2'
        `);
        
        if (campaign.rows.length > 0) {
            const camp = campaign.rows[0];
            console.log(`   ✅ Campagne trouvée:`);
            console.log(`   📋 ID: ${camp.id}`);
            console.log(`   📋 Nom: ${camp.name}`);
            console.log(`   📋 Créé par: ${camp.created_by}`);
            console.log(`   📋 Statut: ${camp.validation_statut}`);
            
            // 2. Vérifier l'utilisateur créateur
            if (camp.created_by) {
                console.log('\n2️⃣ Vérification de l\'utilisateur créateur...');
                const user = await pool.query(`
                    SELECT * FROM users WHERE id = $1
                `, [camp.created_by]);
                
                if (user.rows.length > 0) {
                    const u = user.rows[0];
                    console.log(`   ✅ Utilisateur trouvé:`);
                    console.log(`   📋 ID: ${u.id}`);
                    console.log(`   📋 Email: ${u.email}`);
                    console.log(`   📋 Nom: ${u.nom} ${u.prenom}`);
                    console.log(`   📋 Role: ${u.role}`);
                    
                    // 3. Vérifier le collaborateur associé
                    console.log('\n3️⃣ Vérification du collaborateur...');
                    const collab = await pool.query(`
                        SELECT * FROM collaborateurs WHERE user_id = $1
                    `, [u.id]);
                    
                    if (collab.rows.length > 0) {
                        const c = collab.rows[0];
                        console.log(`   ✅ Collaborateur trouvé:`);
                        console.log(`   📋 ID: ${c.id}`);
                        console.log(`   📋 Nom: ${c.nom} ${c.prenom}`);
                        console.log(`   📋 User ID: ${c.user_id}`);
                    } else {
                        console.log(`   ❌ Aucun collaborateur trouvé pour user_id: ${u.id}`);
                    }
                } else {
                    console.log(`   ❌ Aucun utilisateur trouvé pour created_by: ${camp.created_by}`);
                }
            } else {
                console.log(`   ❌ Aucun créateur défini pour cette campagne`);
            }
        } else {
            console.log(`   ❌ Campagne "Campagne 2" non trouvée`);
        }
        
        // 4. Lister tous les collaborateurs disponibles
        console.log('\n4️⃣ Liste des collaborateurs disponibles...');
        const allCollabs = await pool.query(`
            SELECT c.id, c.nom, c.prenom, c.user_id, u.email, u.role
            FROM collaborateurs c
            LEFT JOIN users u ON c.user_id = u.id
            LIMIT 5
        `);
        
        console.log(`   ✅ ${allCollabs.rows.length} collaborateurs trouvés`);
        allCollabs.rows.forEach((collab, index) => {
            console.log(`   👤 ${index + 1}: ${collab.prenom} ${collab.nom} - User: ${collab.user_id || 'Aucun'} - Role: ${collab.role || 'Non défini'}`);
        });
        
        console.log('\n🎉 Débogage terminé !');
        
    } catch (error) {
        console.error('❌ Erreur lors du débogage:', error);
    } finally {
        await pool.end();
    }
}

debugCampaignData();

