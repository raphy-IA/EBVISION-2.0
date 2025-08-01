require('dotenv').config();
const axios = require('axios');

async function debugOpenLogic() {
    console.log('🔍 Debug de la logique d\'ouverture');
    
    try {
        // 1. Authentification
        console.log('\n1. Authentification...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@trs.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.data?.token;
        if (!token) {
            console.error('❌ Aucun token reçu');
            return;
        }
        console.log('✅ Authentification réussie');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. État initial
        console.log('\n2. État initial...');
        const initialResponse = await axios.get('http://localhost:3000/api/fiscal-years', { headers });
        const fiscalYears = initialResponse.data.data;
        
        console.log('📊 État initial:');
        fiscalYears.forEach((fy, index) => {
            const statusIcon = fy.statut === 'EN_COURS' ? '🟢' : 
                             fy.statut === 'OUVERTE' ? '🟡' : '🔴';
            console.log(`${index + 1}. ${statusIcon} ${fy.libelle} (${fy.annee}) - ${fy.statut} - ID: ${fy.id}`);
        });
        
        const currentYear = fiscalYears.find(fy => fy.statut === 'EN_COURS');
        const closedYear = fiscalYears.find(fy => fy.statut === 'FERMEE');
        
        if (!currentYear) {
            console.log('❌ Aucune année en cours trouvée');
            return;
        }
        
        if (!closedYear) {
            console.log('❌ Aucune année fermée trouvée');
            return;
        }
        
        console.log(`\n🎯 Année en cours: ${currentYear.libelle} (${currentYear.annee}) - ${currentYear.statut}`);
        console.log(`🎯 Année fermée à ouvrir: ${closedYear.libelle} (${closedYear.annee}) - ${closedYear.statut}`);
        
        // 3. Analyser la logique attendue
        console.log('\n3. Analyse de la logique attendue...');
        console.log(`- FY26 (EN_COURS) ne devrait PAS être affectée par l'ouverture de FY25`);
        console.log(`- Seules les années OUVERTE devraient être fermées`);
        console.log(`- FY25 devrait passer de FERMEE à OUVERTE`);
        
        // 4. Test avec vérification étape par étape
        console.log('\n4. Test d\'ouverture avec vérification...');
        console.log(`🧪 Ouverture de ${closedYear.libelle} (${closedYear.annee})...`);
        
        try {
            // Vérifier l'état avant
            console.log('\n📊 État AVANT ouverture:');
            fiscalYears.forEach((fy, index) => {
                const statusIcon = fy.statut === 'EN_COURS' ? '🟢' : 
                                 fy.statut === 'OUVERTE' ? '🟡' : '🔴';
                console.log(`${index + 1}. ${statusIcon} ${fy.libelle} (${fy.annee}) - ${fy.statut}`);
            });
            
            await axios.put(`http://localhost:3000/api/fiscal-years/${closedYear.id}/open`, {}, { headers });
            console.log('✅ Année ouverte avec succès');
            
            // Vérifier l'état après
            const afterOpenResponse = await axios.get('http://localhost:3000/api/fiscal-years', { headers });
            const afterOpen = afterOpenResponse.data.data;
            
            console.log('\n📊 État APRÈS ouverture:');
            afterOpen.forEach((fy, index) => {
                const statusIcon = fy.statut === 'EN_COURS' ? '🟢' : 
                                 fy.statut === 'OUVERTE' ? '🟡' : '🔴';
                console.log(`${index + 1}. ${statusIcon} ${fy.libelle} (${fy.annee}) - ${fy.statut}`);
            });
            
            // Vérifications détaillées
            const currentYearAfter = afterOpen.find(fy => fy.id === currentYear.id);
            const openedYearAfter = afterOpen.find(fy => fy.id === closedYear.id);
            
            console.log('\n🔍 Vérifications détaillées:');
            console.log(`- FY26 (année en cours) avant: ${currentYear.statut}`);
            console.log(`- FY26 (année en cours) après: ${currentYearAfter?.statut}`);
            console.log(`- FY25 (année ouverte) avant: ${closedYear.statut}`);
            console.log(`- FY25 (année ouverte) après: ${openedYearAfter?.statut}`);
            
            if (currentYearAfter && currentYearAfter.statut === 'EN_COURS') {
                console.log('✅ FY26 reste en cours (correct)');
            } else {
                console.log(`❌ ERREUR: FY26 est passée de ${currentYear.statut} à ${currentYearAfter?.statut}`);
            }
            
            if (openedYearAfter && openedYearAfter.statut === 'OUVERTE') {
                console.log('✅ FY25 a été ouverte correctement');
            } else {
                console.log(`❌ ERREUR: FY25 est passée de ${closedYear.statut} à ${openedYearAfter?.statut}`);
            }
            
        } catch (error) {
            console.log('❌ Erreur lors de l\'ouverture:', error.response?.status, error.response?.data);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

debugOpenLogic(); 