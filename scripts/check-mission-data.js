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

async function checkMissionData() {
    try {
        console.log('🔍 Vérification des données des missions...\n');

        // 1. Vérifier la structure de la table missions
        console.log('📋 Structure de la table missions:');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `;
        const structureResult = await pool.query(structureQuery);
        console.table(structureResult.rows);

        // 2. Vérifier les données d'une mission
        console.log('\n📊 Données d\'une mission (première mission trouvée):');
        const missionQuery = `
            SELECT 
                m.*,
                c.nom as client_nom,
                mt.libelle as mission_type_nom,
                u.nom as responsable_nom,
                u.prenom as responsable_prenom,
                creator.nom as created_by_nom,
                creator.prenom as created_by_prenom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN mission_types mt ON m.mission_type_id = mt.id
            LEFT JOIN users u ON m.collaborateur_id = u.id
            LEFT JOIN users creator ON m.created_by = creator.id
            LIMIT 1
        `;
        const missionResult = await pool.query(missionQuery);
        
        if (missionResult.rows.length > 0) {
            const mission = missionResult.rows[0];
            console.log('Mission trouvée:');
            console.log('- ID:', mission.id);
            console.log('- Code:', mission.code);
            console.log('- Nom:', mission.nom);
            console.log('- Client:', mission.client_nom);
            console.log('- Type de mission:', mission.mission_type_nom);
            console.log('- Responsable:', mission.responsable_nom, mission.responsable_prenom);
            console.log('- Division:', mission.division_nom);
            console.log('- Business Unit:', mission.business_unit_nom);
            console.log('- Créé par:', mission.created_by_nom, mission.created_by_prenom);
            console.log('- Mission Type ID:', mission.mission_type_id);
            console.log('- Responsable ID:', mission.responsable_id);
            console.log('- Division ID:', mission.division_id);
            console.log('- Created By ID:', mission.created_by);
        } else {
            console.log('❌ Aucune mission trouvée');
        }

        // 3. Vérifier les tables liées
        console.log('\n🔗 Vérification des tables liées:');
        
        // Mission Types
        const missionTypesQuery = 'SELECT COUNT(*) as count FROM mission_types';
        const missionTypesResult = await pool.query(missionTypesQuery);
        console.log('- Mission Types:', missionTypesResult.rows[0].count);

        // Users
        const usersQuery = 'SELECT COUNT(*) as count FROM users';
        const usersResult = await pool.query(usersQuery);
        console.log('- Users:', usersResult.rows[0].count);

        // Divisions
        const divisionsQuery = 'SELECT COUNT(*) as count FROM divisions';
        const divisionsResult = await pool.query(divisionsQuery);
        console.log('- Divisions:', divisionsResult.rows[0].count);

        // Business Units
        const businessUnitsQuery = 'SELECT COUNT(*) as count FROM business_units';
        const businessUnitsResult = await pool.query(businessUnitsQuery);
        console.log('- Business Units:', businessUnitsResult.rows[0].count);

        // 4. Vérifier quelques exemples de données
        console.log('\n📝 Exemples de données:');
        
        // Mission Types
        const missionTypesDataQuery = 'SELECT id, codification, libelle FROM mission_types LIMIT 3';
        const missionTypesDataResult = await pool.query(missionTypesDataQuery);
        console.log('- Mission Types:', missionTypesDataResult.rows);

        // Users
        const usersDataQuery = 'SELECT id, nom, prenom FROM users LIMIT 3';
        const usersDataResult = await pool.query(usersDataQuery);
        console.log('- Users:', usersDataResult.rows);

        // Divisions
        const divisionsDataQuery = 'SELECT id, nom, code FROM divisions LIMIT 3';
        const divisionsDataResult = await pool.query(divisionsDataQuery);
        console.log('- Divisions:', divisionsDataResult.rows);

        // Business Units
        const businessUnitsDataQuery = 'SELECT id, nom, code FROM business_units LIMIT 3';
        const businessUnitsDataResult = await pool.query(businessUnitsDataQuery);
        console.log('- Business Units:', businessUnitsDataResult.rows);

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkMissionData(); 