require('dotenv').config();
const { Pool } = require('pg');

async function checkDBStructure() {
    console.log('🔍 Vérification de la structure de la base de données');
    
    try {
        const pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        
        // 1. Vérifier la structure de la table fiscal_years
        console.log('\n1. Structure de la table fiscal_years:');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'fiscal_years' 
            ORDER BY ordinal_position
        `;
        
        const structureResult = await pool.query(structureQuery);
        structureResult.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // 2. Vérifier les données actuelles
        console.log('\n2. Données actuelles:');
        const dataQuery = `
            SELECT id, annee, libelle, budget_global, statut, created_at, updated_at
            FROM fiscal_years
            ORDER BY annee DESC
        `;
        
        const dataResult = await pool.query(dataQuery);
        dataResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id}`);
            console.log(`   - Année: ${row.annee}`);
            console.log(`   - Libellé: ${row.libelle || 'NULL'}`);
            console.log(`   - Budget: ${row.budget_global}`);
            console.log(`   - Statut: ${row.statut}`);
            console.log('');
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkDBStructure(); 