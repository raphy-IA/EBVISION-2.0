require('dotenv').config();
const { pool } = require('../src/utils/database');

async function checkCollaborateursStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table collaborateurs...\n');
        
        // Vérifier si la table existe
        const tableExistsQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'collaborateurs';
        `;
        
        const tableResult = await pool.query(tableExistsQuery);
        
        if (tableResult.rows.length === 0) {
            console.log('❌ Table collaborateurs n\'existe pas');
            return;
        }
        
        console.log('✅ Table collaborateurs existe');
        
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs'
            ORDER BY ordinal_position;
        `;
        
        const structureResult = await pool.query(structureQuery);
        
        console.log('\n📋 Structure de la table collaborateurs:');
        console.log('=' .repeat(80));
        
        structureResult.rows.forEach((column, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${column.column_name.padEnd(20)} | ${column.data_type.padEnd(15)} | ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // Vérifier les données
        const dataQuery = 'SELECT COUNT(*) as count FROM collaborateurs';
        const dataResult = await pool.query(dataQuery);
        
        console.log(`\n📊 Nombre de collaborateurs: ${dataResult.rows[0].count}`);
        
        // Afficher quelques collaborateurs
        const sampleQuery = 'SELECT id, nom, prenom, email FROM collaborateurs LIMIT 3';
        const sampleResult = await pool.query(sampleQuery);
        
        console.log('\n📋 Exemples de collaborateurs:');
        console.log('=' .repeat(80));
        
        sampleResult.rows.forEach((col, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${col.id} | ${col.nom} ${col.prenom} | ${col.email}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkCollaborateursStructure(); 