const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function analyzeMissionFields() {
    try {
        console.log('🔍 ANALYSE DES CHAMPS DE LA TABLE MISSIONS\n');

        // 1. Structure complète de la table missions
        console.log('📋 STRUCTURE COMPLÈTE DE LA TABLE MISSIONS:');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `;
        const structureResult = await pool.query(structureQuery);
        
        console.table(structureResult.rows.map(row => ({
            'Colonne': row.column_name,
            'Type': row.data_type,
            'Nullable': row.is_nullable,
            'Défaut': row.column_default
        })));

        // 2. Champs utilisés dans l'API de création
        console.log('\n📝 CHAMPS UTILISÉS DANS L\'API DE CRÉATION:');
        const apiFields = [
            'code', 'nom', 'description', 'client_id', 'opportunity_id', 'mission_type_id',
            'date_debut', 'date_fin', 'budget_estime', 'devise',
            'priorite', 'statut', 'notes',
            'montant_honoraires', 'devise_honoraires', 'description_honoraires',
            'montant_debours', 'devise_debours', 'description_debours',
            'conditions_paiement', 'pourcentage_avance', 'created_by'
        ];
        
        console.log('Champs utilisés dans l\'INSERT:');
        apiFields.forEach((field, index) => {
            console.log(`${index + 1}. ${field}`);
        });

        // 3. Champs de la base de données NON utilisés
        console.log('\n❌ CHAMPS DE LA BASE DE DONNÉES NON UTILISÉS:');
        const dbFields = structureResult.rows.map(row => row.column_name);
        const unusedFields = dbFields.filter(field => !apiFields.includes(field));
        
        if (unusedFields.length > 0) {
            unusedFields.forEach(field => {
                console.log(`- ${field}`);
            });
        } else {
            console.log('Aucun champ inutilisé');
        }

        // 4. Champs utilisés dans l'API mais non présents en base
        console.log('\n⚠️ CHAMPS UTILISÉS DANS L\'API MAIS NON PRÉSENTS EN BASE:');
        const missingFields = apiFields.filter(field => !dbFields.includes(field));
        
        if (missingFields.length > 0) {
            missingFields.forEach(field => {
                console.log(`- ${field}`);
            });
        } else {
            console.log('Tous les champs de l\'API sont présents en base');
        }

        // 5. Analyse des champs problématiques
        console.log('\n🔍 ANALYSE DES CHAMPS PROBLÉMATIQUES:');
        
        // Champs qui devraient être utilisés mais ne le sont pas
        const importantFields = [
            'collaborateur_id', // Responsable de la mission
            'date_fin_prevue', // Date de fin prévue
            'date_fin_reelle', // Date de fin réelle
            'budget_reel', // Budget réel
            'devise', // Devise générale
            'fiscal_year_id', // Année fiscale
            'updated_by', // Modifié par
            'updated_at' // Date de modification
        ];

        console.log('\nChamps importants non utilisés dans l\'API:');
        importantFields.forEach(field => {
            if (dbFields.includes(field) && !apiFields.includes(field)) {
                console.log(`- ${field} (présent en base mais non utilisé dans l'API)`);
            }
        });

        // 6. Mapping des champs API vs Base de données
        console.log('\n🔄 MAPPING API vs BASE DE DONNÉES:');
        const mapping = {
            'titre (API)': 'nom (Base)',
            'date_fin_prevue (API)': 'date_fin (Base)',
            'budget_prevue (API)': 'budget_estime (Base)',
            'devise_honoraires (API)': 'devise (Base)',
            'responsable_id (API)': 'collaborateur_id (Base) - NON UTILISÉ'
        };

        Object.entries(mapping).forEach(([apiField, dbField]) => {
            console.log(`${apiField} → ${dbField}`);
        });

        // 7. Recommandations
        console.log('\n💡 RECOMMANDATIONS:');
        console.log('1. Utiliser collaborateur_id au lieu de responsable_id');
        console.log('2. Ajouter date_fin_prevue et date_fin_reelle');
        console.log('3. Ajouter budget_reel pour le suivi');
        console.log('4. Ajouter fiscal_year_id pour l\'organisation');
        console.log('5. Ajouter updated_by et updated_at pour l\'audit');

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);
    } finally {
        await pool.end();
    }
}

analyzeMissionFields(); 