// Script pour vérifier la structure de la base de données
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function checkDBStructure() {
    console.log('🔍 Vérification de la structure de la base de données\n');
    
    try {
        // 1. Vérifier la table prospecting_campaigns
        console.log('1️⃣ Structure de prospecting_campaigns...');
        const campaignColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'prospecting_campaigns'
            ORDER BY ordinal_position
        `);
        console.log(`   ✅ ${campaignColumns.rows.length} colonnes trouvées`);
        campaignColumns.rows.forEach(col => {
            console.log(`   📋 ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // 2. Vérifier la table collaborateurs
        console.log('\n2️⃣ Structure de collaborateurs...');
        const collabColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'collaborateurs'
            ORDER BY ordinal_position
        `);
        console.log(`   ✅ ${collabColumns.rows.length} colonnes trouvées`);
        collabColumns.rows.forEach(col => {
            console.log(`   📋 ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // 3. Vérifier la table users
        console.log('\n3️⃣ Structure de users...');
        const userColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        console.log(`   ✅ ${userColumns.rows.length} colonnes trouvées`);
        userColumns.rows.forEach(col => {
            console.log(`   📋 ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // 4. Vérifier quelques exemples de données
        console.log('\n4️⃣ Exemples de données...');
        
        // Campagnes
        const campaigns = await pool.query('SELECT id, name, created_by, validation_statut FROM prospecting_campaigns LIMIT 3');
        console.log(`   📊 ${campaigns.rows.length} campagnes trouvées`);
        campaigns.rows.forEach(camp => {
            console.log(`   🏢 "${camp.name}" - Créé par: ${camp.created_by}, Statut: ${camp.validation_statut}`);
        });
        
        // Collaborateurs
        const collaborateurs = await pool.query('SELECT id, nom, prenom, user_id FROM collaborateurs LIMIT 3');
        console.log(`   👥 ${collaborateurs.rows.length} collaborateurs trouvés`);
        collaborateurs.rows.forEach(collab => {
            console.log(`   👤 ${collab.prenom} ${collab.nom} - User ID: ${collab.user_id}`);
        });
        
        // Users
        const users = await pool.query('SELECT id, email, role FROM users LIMIT 3');
        console.log(`   👤 ${users.rows.length} utilisateurs trouvés`);
        users.rows.forEach(user => {
            console.log(`   🔑 ${user.email} - Role: ${user.role}`);
        });
        
        console.log('\n🎉 Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkDBStructure();
