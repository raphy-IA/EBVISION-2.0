const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Token d'authentification (utilisez un token valide)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhlYjU0OTE2LWEwYjMtNGY5ZS1hY2QxLTc1ODMwMjcxZmViYWIiLCJlbWFpbCI6ImFkbWluQHRycy5jb20iLCJub20iOiJBZG1pbmlzdHJhdGV1ciIsInByZW5vbSI6IlN5c3TDqG1lIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcnM6cmVhZCIsInVzZXJzOmNyZWF0ZSIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSJdLCJpYXQiOjE3NTQ0ODQyMDMsImV4cCI6MTc1NDU3MDYwM30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function checkAPIData() {
    try {
        console.log('🔍 Vérification des données via l\'API...\n');
        
        // Configuration des headers avec le token
        const headers = {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        };
        
        // Vérifier les feuilles de temps
        console.log('📋 FEUILLES DE TEMPS:');
        try {
            const timeSheetsResponse = await axios.get(`${API_BASE_URL}/time-sheets`, { headers });
            console.log('✅ Feuilles de temps récupérées:', timeSheetsResponse.data);
        } catch (error) {
            console.log('❌ Erreur lors de la récupération des feuilles de temps:', error.response?.data || error.message);
        }
        
        // Vérifier les entrées de temps pour différentes semaines
        console.log('\n⏰ ENTREES DE TEMPS:');
        const weeks = [
            { start: '2025-08-04', end: '2025-08-10' },
            { start: '2025-08-11', end: '2025-08-17' },
            { start: '2025-07-28', end: '2025-08-03' }
        ];
        
        for (const week of weeks) {
            try {
                const response = await axios.get(`${API_BASE_URL}/time-entries?week_start=${week.start}&week_end=${week.end}`, { headers });
                console.log(`\n📅 Semaine ${week.start} à ${week.end}:`);
                console.log('   Données:', response.data);
                if (response.data.data && response.data.data.length > 0) {
                    console.log(`   ✅ ${response.data.data.length} entrée(s) trouvée(s)`);
                    response.data.data.forEach((entry, index) => {
                        console.log(`     ${index + 1}. Date: ${entry.date_saisie}, Heures: ${entry.heures}, Type: ${entry.type_heures}`);
                    });
                } else {
                    console.log('   ℹ️ Aucune entrée trouvée');
                }
            } catch (error) {
                console.log(`❌ Erreur pour la semaine ${week.start}:`, error.response?.data || error.message);
            }
        }
        
        // Vérifier les missions
        console.log('\n🎯 MISSIONS:');
        try {
            const missionsResponse = await axios.get(`${API_BASE_URL}/missions`, { headers });
            console.log('✅ Missions récupérées:', missionsResponse.data);
        } catch (error) {
            console.log('❌ Erreur lors de la récupération des missions:', error.response?.data || error.message);
        }
        
        // Vérifier les activités internes
        console.log('\n🏢 ACTIVITES INTERNES:');
        try {
            const activitiesResponse = await axios.get(`${API_BASE_URL}/internal-activities`, { headers });
            console.log('✅ Activités internes récupérées:', activitiesResponse.data);
        } catch (error) {
            console.log('❌ Erreur lors de la récupération des activités internes:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
}

checkAPIData(); 