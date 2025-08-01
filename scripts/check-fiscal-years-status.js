require('dotenv').config();
const axios = require('axios');

async function checkFiscalYearsStatus() {
    console.log('🔍 Vérification du statut des années fiscales');
    
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
        
        // 2. Récupérer toutes les années fiscales
        console.log('\n2. Récupération de toutes les années fiscales...');
        const fiscalYearsResponse = await axios.get('http://localhost:3000/api/fiscal-years', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (fiscalYearsResponse.data.data && fiscalYearsResponse.data.data.fiscalYears) {
            const fiscalYears = fiscalYearsResponse.data.data.fiscalYears;
            
            console.log('\n📊 Statut des années fiscales:');
            console.log('='.repeat(80));
            
            fiscalYears.forEach((fy, index) => {
                const statusIcon = fy.statut === 'EN_COURS' ? '🟢' : 
                                 fy.statut === 'OUVERTE' ? '🟡' : '🔴';
                
                console.log(`${index + 1}. ${statusIcon} ${fy.libelle} (${fy.annee})`);
                console.log(`   Statut: ${fy.statut}`);
                console.log(`   Budget: ${parseFloat(fy.budget_global).toLocaleString('fr-FR')} €`);
                console.log(`   Période: ${new Date(fy.date_debut).toLocaleDateString('fr-FR')} - ${new Date(fy.date_fin).toLocaleDateString('fr-FR')}`);
                console.log(`   ID: ${fy.id}`);
                console.log('');
            });
            
            // Identifier l'année courante
            const currentYear = fiscalYears.find(fy => fy.statut === 'EN_COURS');
            const openYears = fiscalYears.filter(fy => fy.statut === 'OUVERTE');
            
            console.log('🎯 ANALYSE:');
            console.log('='.repeat(80));
            
            if (currentYear) {
                console.log(`✅ Année fiscale courante: ${currentYear.libelle} (${currentYear.annee})`);
                console.log(`   → C'est cette année qui sera utilisée pour les nouvelles missions et opportunités`);
            } else {
                console.log('⚠️  Aucune année fiscale avec le statut "EN_COURS"');
                
                if (openYears.length > 0) {
                    const mostRecentOpen = openYears[0]; // Déjà trié par année DESC
                    console.log(`🟡 Année ouverte la plus récente: ${mostRecentOpen.libelle} (${mostRecentOpen.annee})`);
                    console.log(`   → Cette année sera utilisée comme fallback pour les nouvelles missions et opportunités`);
                } else {
                    console.log('❌ Aucune année fiscale ouverte disponible');
                }
            }
            
            console.log('\n📋 Logique de sélection:');
            console.log('1. Priorité: Année avec statut "EN_COURS"');
            console.log('2. Fallback: Année avec statut "OUVERTE" la plus récente');
            console.log('3. Si aucune: Aucune année fiscale assignée');
            
        } else {
            console.log('❌ Aucune année fiscale trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
}

checkFiscalYearsStatus(); 