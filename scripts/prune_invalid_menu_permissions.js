require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function prunePermissions() {
    try {
        console.log('🔌 Connexion à la base de données...');
        const client = await pool.connect();

        try {
            // 1. Extraire les codes valides du HTML
            console.log('📂 Lecture de template-modern-sidebar.html...');
            const sidebarPath = path.join(__dirname, '../public/template-modern-sidebar.html');
            const content = fs.readFileSync(sidebarPath, 'utf-8');

            const validCodes = new Set();
            const regex = /data-permission="([^"]+)"/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                validCodes.add(match[1]);
            }

            console.log(`✅ ${validCodes.size} codes de permission valides trouvés dans le HTML.`);

            // 2. Récupérer les permissions de menu en base
            console.log('🔍 Recherche des permissions de menu en base...');
            const res = await client.query(`
                SELECT id, code, name 
                FROM permissions 
                WHERE code LIKE 'menu.%'
            `);

            const dbPermissions = res.rows;
            console.log(`📊 ${dbPermissions.length} permissions de menu trouvées en base.`);

            // 3. Identifier les orphelins
            const orphans = dbPermissions.filter(p => !validCodes.has(p.code));

            if (orphans.length === 0) {
                console.log('✨ Aucun orphelin trouvé. Tout est propre !');
                return;
            }

            console.log(`⚠️  ${orphans.length} permissions orphelines trouvées :`);
            orphans.forEach(p => console.log(`   - ${p.code} (${p.name})`));

            // 4. Supprimer les orphelins
            console.log('\n🧹 Suppression des orphelins...');

            for (const orphan of orphans) {
                // Supprimer d'abord les liaisons
                await client.query('DELETE FROM role_permissions WHERE permission_id = $1', [orphan.id]);
                await client.query('DELETE FROM user_permissions WHERE permission_id = $1', [orphan.id]);

                // Supprimer la permission
                await client.query('DELETE FROM permissions WHERE id = $1', [orphan.id]);
                console.log(`   🗑️  Supprimé : ${orphan.code}`);
            }

            console.log('\n✅ Nettoyage terminé avec succès !');

        } finally {
            client.release();
        }
    } catch (e) {
        console.error('❌ Erreur :', e);
    } finally {
        await pool.end();
    }
}

prunePermissions();
