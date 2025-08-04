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

async function checkMissionConstraints() {
    const client = await pool.connect();
    try {
        console.log('🔍 Vérification des contraintes de la table missions...\n');

        // Vérifier les contraintes de vérification
        const constraintsQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'missions'::regclass 
            AND contype = 'c'
        `;
        const constraintsResult = await client.query(constraintsQuery);
        
        console.log('📊 Contraintes de vérification:');
        if (constraintsResult.rows.length > 0) {
            constraintsResult.rows.forEach((constraint, index) => {
                console.log(`   ${index + 1}. ${constraint.constraint_name}: ${constraint.constraint_definition}`);
            });
        } else {
            console.log('   Aucune contrainte de vérification trouvée');
        }

        // Vérifier les valeurs par défaut
        const defaultsQuery = `
            SELECT column_name, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            AND column_default IS NOT NULL
            ORDER BY ordinal_position
        `;
        const defaultsResult = await client.query(defaultsQuery);
        
        console.log('\n📋 Valeurs par défaut:');
        if (defaultsResult.rows.length > 0) {
            defaultsResult.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.column_name}: ${row.column_default}`);
            });
        } else {
            console.log('   Aucune valeur par défaut trouvée');
        }

        // Vérifier les types ENUM ou contraintes sur priorite et statut
        const enumQuery = `
            SELECT 
                typname as enum_name,
                enumlabel as enum_value
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE typname LIKE '%mission%' OR typname LIKE '%priorite%' OR typname LIKE '%statut%'
            ORDER BY typname, enumsortorder
        `;
        const enumResult = await client.query(enumQuery);
        
        console.log('\n📝 Types ENUM:');
        if (enumResult.rows.length > 0) {
            enumResult.rows.forEach((enumType, index) => {
                console.log(`   ${index + 1}. ${enumType.enum_name}: ${enumType.enum_value}`);
            });
        } else {
            console.log('   Aucun type ENUM trouvé');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkMissionConstraints(); 