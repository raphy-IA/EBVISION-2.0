require('dotenv').config();
const axios = require('axios');

async function checkCurrentStatus() {
    console.log('🔍 Vérification de l\'état actuel des années fiscales');
    
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
        
        // 2. Récupérer l'état actuel
        console.log('\n2. État actuel des années fiscales...');
        const response = await axios.get('http://localhost:3000/api/fiscal-years', { headers });
        const fiscalYears = response.data.data;
        
        console.log('📊 État actuel:');
        fiscalYears.forEach((fy, index) => {
            const statusIcon = fy.statut === 'EN_COURS' ? '🟢' : 
                             fy.statut === 'OUVERTE' ? '🟡' : '🔴';
            console.log(`${index + 1}. ${statusIcon} ${fy.libelle} (${fy.annee}) - ${fy.statut} - ID: ${fy.id}`);
        });
        
        // 3. Analyser les statuts
        const currentYears = fiscalYears.filter(fy => fy.statut === 'EN_COURS');
        const openYears = fiscalYears.filter(fy => fy.statut === 'OUVERTE');
        const closedYears = fiscalYears.filter(fy => fy.statut === 'FERMEE');
        
        console.log('\n📈 Analyse:');
        console.log(`- Années en cours: ${currentYears.length}`);
        console.log(`- Années ouvertes: ${openYears.length}`);
        console.log(`- Années fermées: ${closedYears.length}`);
        
        if (currentYears.length > 1) {
            console.log('⚠️ ATTENTION: Plusieurs années en cours détectées !');
        } else if (currentYears.length === 1) {
            console.log('✅ Une seule année en cours (normal)');
        } else {
            console.log('⚠️ Aucune année en cours détectée');
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.response?.data || error.message);
    }
}

checkCurrentStatus(); 