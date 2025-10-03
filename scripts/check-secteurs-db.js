const { Pool } = require('pg');

// Configuration de la base de données de production
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: 'Canaan@2020',
    ssl: false
});

async function checkSecteursDatabase() {
    console.log('🔍 Vérification des secteurs d\'activité dans la base de données...\n');

    try {
        // Test 1: Vérifier la table secteurs_activite
        console.log('1️⃣ Vérification de la table secteurs_activite:');
        const secteursResult = await pool.query(`
            SELECT COUNT(*) as total, 
                   COUNT(CASE WHEN actif = true THEN 1 END) as actifs
            FROM secteurs_activite
        `);
        console.log(`   📊 Total secteurs: ${secteursResult.rows[0].total}`);
        console.log(`   ✅ Secteurs actifs: ${secteursResult.rows[0].actifs}`);

        // Test 2: Lister les secteurs actifs
        console.log('\n2️⃣ Secteurs actifs:');
        const secteursActifs = await pool.query(`
            SELECT id, nom, code, actif, ordre
            FROM secteurs_activite 
            WHERE actif = true 
            ORDER BY ordre, nom
        `);
        
        if (secteursActifs.rows.length > 0) {
            secteursActifs.rows.forEach((secteur, index) => {
                console.log(`   ${index + 1}. ${secteur.nom} (${secteur.code}) - Ordre: ${secteur.ordre}`);
            });
        } else {
            console.log('   ❌ Aucun secteur actif trouvé!');
        }

        // Test 3: Vérifier les sous-secteurs
        console.log('\n3️⃣ Vérification des sous-secteurs:');
        const sousSecteursResult = await pool.query(`
            SELECT COUNT(*) as total, 
                   COUNT(CASE WHEN actif = true THEN 1 END) as actifs
            FROM sous_secteurs_activite
        `);
        console.log(`   📊 Total sous-secteurs: ${sousSecteursResult.rows[0].total}`);
        console.log(`   ✅ Sous-secteurs actifs: ${sousSecteursResult.rows[0].actifs}`);

        // Test 4: Requête exacte de l'API
        console.log('\n4️⃣ Test de la requête exacte de l\'API:');
        const apiQuery = await pool.query(`
            SELECT s.nom, s.code, s.couleur, s.icone, 
                   array_agg(ss.nom ORDER BY ss.ordre) as sous_secteurs
            FROM secteurs_activite s
            LEFT JOIN sous_secteurs_activite ss ON s.id = ss.secteur_id AND ss.actif = true
            WHERE s.actif = true
            GROUP BY s.id, s.nom, s.code, s.couleur, s.icone
            ORDER BY s.ordre, s.nom
        `);
        
        console.log(`   📊 Résultats de la requête API: ${apiQuery.rows.length} secteurs`);
        if (apiQuery.rows.length > 0) {
            apiQuery.rows.forEach((secteur, index) => {
                const sousSecteurs = secteur.sous_secteurs.filter(ss => ss !== null);
                console.log(`   ${index + 1}. ${secteur.nom} (${secteur.code}) - ${sousSecteurs.length} sous-secteurs`);
            });
        } else {
            console.log('   ❌ Aucun résultat pour la requête API!');
        }

        // Test 5: Vérifier la structure des tables
        console.log('\n5️⃣ Structure des tables:');
        const structureSecteurs = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'secteurs_activite' 
            ORDER BY ordinal_position
        `);
        console.log('   📋 Colonnes de secteurs_activite:');
        structureSecteurs.rows.forEach(col => {
            console.log(`      - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        console.error('   Détails:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
checkSecteursDatabase();







