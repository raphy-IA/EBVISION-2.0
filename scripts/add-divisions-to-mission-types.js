const { pool } = require('../src/utils/database');

async function addDivisionsToMissionTypes() {
    try {
        console.log('🔧 Attribution des divisions aux types de mission');
        console.log('================================================');

        // Récupérer les divisions
        const divisionsQuery = 'SELECT id, nom FROM divisions WHERE statut = \'ACTIF\' ORDER BY nom';
        const divisionsResult = await pool.query(divisionsQuery);
        const divisions = divisionsResult.rows;

        console.log(`✅ Divisions disponibles: ${divisions.length}`);
        divisions.forEach(div => {
            console.log(`   - ${div.nom} (ID: ${div.id})`);
        });

        // Récupérer les types de mission sans division
        const missionTypesQuery = `
            SELECT id, codification, libelle 
            FROM mission_types 
            WHERE division_id IS NULL
            ORDER BY codification
        `;
        const missionTypesResult = await pool.query(missionTypesQuery);
        const missionTypes = missionTypesResult.rows;

        console.log(`\n📋 Types de mission sans division: ${missionTypes.length}`);

        // Mapping des types de mission vers les divisions
        const mapping = {
            'AUDIT': 'Division Administrative',
            'CONSEIL': 'Division Commerciale', 
            'DEV': 'Division Technique',
            'FINANCE': 'Division Finance',
            'FISCAL': 'Division Finance',
            'FORMATION': 'Division RH',
            'JURIDIQUE': 'Division Administrative',
            'LOGISTIQUE': 'Division Commerciale',
            'MARKETING': 'Division Commerciale',
            'RH': 'Division RH'
        };

        let updatedCount = 0;
        for (const type of missionTypes) {
            const divisionName = mapping[type.codification];
            if (divisionName) {
                const division = divisions.find(d => d.nom === divisionName);
                if (division) {
                    const updateQuery = `
                        UPDATE mission_types 
                        SET division_id = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    await pool.query(updateQuery, [division.id, type.id]);
                    console.log(`✅ ${type.codification} -> ${divisionName}`);
                    updatedCount++;
                } else {
                    console.log(`❌ Division non trouvée: ${divisionName}`);
                }
            } else {
                console.log(`⚠️  Pas de mapping pour: ${type.codification}`);
            }
        }

        console.log(`\n✅ Mise à jour terminée: ${updatedCount} types mis à jour`);

        // Vérification finale
        const finalQuery = `
            SELECT 
                mt.codification, mt.libelle, d.nom as division_nom
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            ORDER BY mt.codification
        `;
        const finalResult = await pool.query(finalQuery);
        
        console.log('\n📊 État final:');
        finalResult.rows.forEach(type => {
            const division = type.division_nom || 'Aucune division';
            console.log(`   - ${type.codification}: ${type.libelle} (${division})`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

addDivisionsToMissionTypes(); 