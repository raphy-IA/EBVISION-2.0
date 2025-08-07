require('dotenv').config();
const { pool } = require('./src/utils/database');

async function verifierStructureTimeSheets() {
    console.log('🔍 Vérification de la structure de la table time_sheets');
    console.log('=' .repeat(60));
    
    try {
        // 1. Vérifier la structure complète de la table
        console.log('\n1️⃣ Structure complète de time_sheets:');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'time_sheets'
            ORDER BY ordinal_position
        `;
        const structureResult = await pool.query(structureQuery);
        
        console.log('📊 Colonnes de time_sheets:');
        structureResult.rows.forEach(row => {
            console.log(`   ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
        });
        
        // 2. Vérifier les valeurs dans les deux colonnes de statut
        console.log('\n2️⃣ Comparaison des colonnes statut et status:');
        const statutsComparisonQuery = `
            SELECT 
                statut,
                status,
                COUNT(*) as nombre
            FROM time_sheets
            GROUP BY statut, status
            ORDER BY nombre DESC
        `;
        const statutsComparisonResult = await pool.query(statutsComparisonQuery);
        
        console.log('📊 Comparaison statut vs status:');
        statutsComparisonResult.rows.forEach(row => {
            console.log(`   statut='${row.statut}' | status='${row.status}' | nombre: ${row.nombre}`);
        });
        
        // 3. Vérifier les feuilles de Cyrille spécifiquement
        console.log('\n3️⃣ Feuilles de Cyrille - détail complet:');
        const cyrilleDetailQuery = `
            SELECT 
                ts.id,
                ts.statut,
                ts.status,
                ts.week_start,
                ts.week_end,
                ts.created_at,
                ts.updated_at,
                c.prenom,
                c.nom
            FROM time_sheets ts
            JOIN collaborateurs c ON ts.user_id = c.user_id
            WHERE c.prenom = 'Cyrille' AND c.nom = 'Djiki'
            ORDER BY ts.week_start DESC
        `;
        const cyrilleDetailResult = await pool.query(cyrilleDetailQuery);
        
        console.log('📋 Feuilles de Cyrille (détail):');
        cyrilleDetailResult.rows.forEach((feuille, index) => {
            console.log(`${index + 1}. ID: ${feuille.id}`);
            console.log(`   Semaine: ${feuille.week_start} au ${feuille.week_end}`);
            console.log(`   statut: '${feuille.statut}'`);
            console.log(`   status: '${feuille.status}'`);
            console.log(`   Créé: ${feuille.created_at}`);
            console.log(`   Modifié: ${feuille.updated_at}`);
        });
        
        // 4. Vérifier les migrations pour comprendre l'origine
        console.log('\n4️⃣ Recherche dans les migrations...');
        console.log('🔍 Vérification des fichiers de migration pour time_sheets...');
        
        // 5. Proposer une solution
        console.log('\n5️⃣ Problème identifié:');
        console.log('❌ Il y a deux colonnes de statut:');
        console.log('   - statut (français): sauvegardé');
        console.log('   - status (anglais): draft');
        console.log('');
        console.log('✅ Solution recommandée:');
        console.log('   1. Standardiser sur une seule colonne (status)');
        console.log('   2. Utiliser les valeurs: draft, saved, submitted, approved, rejected');
        console.log('   3. Corriger l\'API pour utiliser la bonne colonne');
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifierStructureTimeSheets();
