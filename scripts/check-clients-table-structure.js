require('dotenv').config();
const { pool } = require('../src/utils/database');

async function checkClientsTableStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table clients...\n');
        
        // Vérifier les colonnes existantes
        const columnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            ORDER BY ordinal_position;
        `;
        
        const columnsResult = await pool.query(columnsQuery);
        
        console.log('📋 Colonnes actuelles de la table clients:');
        console.log('=' .repeat(80));
        
        const existingColumns = [];
        columnsResult.rows.forEach((row, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(5)} | ${row.column_default || 'NULL'}`);
            existingColumns.push(row.column_name);
        });
        
        console.log('\n📊 Résumé:');
        console.log(`- Nombre total de colonnes: ${existingColumns.length}`);
        
        // Vérifier les colonnes enrichies attendues
        const expectedColumns = [
            'id', 'nom', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'pays',
            'secteur_activite', 'taille_entreprise', 'statut', 'source_prospection',
            'notes', 'collaborateur_id', 'created_by', 'created_at', 'updated_by', 'updated_at',
            'numero_contribuable', 'forme_juridique', 'effectif', 'chiffre_affaires', 'resultat_net',
            'groupe_id', 'est_filiale', 'latitude', 'longitude', 'site_web', 'linkedin_url',
            'date_creation_entreprise', 'secteur_geographique', 'notation', 'risque_client',
            'date_derniere_activite', 'nombre_missions', 'nombre_opportunites', 'chiffre_affaires_total'
        ];
        
        const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
        const extraColumns = existingColumns.filter(col => !expectedColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log('\n❌ Colonnes manquantes:');
            missingColumns.forEach(col => console.log(`  - ${col}`));
        }
        
        if (extraColumns.length > 0) {
            console.log('\n⚠️  Colonnes supplémentaires:');
            extraColumns.forEach(col => console.log(`  - ${col}`));
        }
        
        if (missingColumns.length === 0 && extraColumns.length === 0) {
            console.log('\n✅ Structure de la table clients est correcte !');
        }
        
        // Vérifier un exemple de données
        console.log('\n📄 Exemple de données actuelles:');
        const sampleQuery = 'SELECT * FROM clients LIMIT 1';
        const sampleResult = await pool.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
            const sample = sampleResult.rows[0];
            console.log('Premier client en base:');
            Object.keys(sample).forEach(key => {
                console.log(`  ${key}: ${sample[key]}`);
            });
        } else {
            console.log('Aucun client en base de données.');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkClientsTableStructure(); 