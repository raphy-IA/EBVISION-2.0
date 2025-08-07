const { pool } = require('./src/utils/database');

async function debugServerLogs() {
    console.log('🔍 Ajout de logs détaillés pour identifier l\'erreur...');
    
    const client = await pool.connect();
    try {
        const timeSheetId = '57499401-2882-412e-9aba-efb97a42dff0';
        const supervisorUserId = 'b306cee5-cab6-453a-b753-cdaa54cad0d4';
        
        console.log('\n📋 Test étape par étape:');
        
        // 1. Vérifier l'authentification
        console.log('\n1️⃣ Test d\'authentification:');
        const { verifyToken } = require('./src/middleware/auth');
        
        // Simuler un token
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = 'eb_vision_2_0_super_secret_key_2024';
        
        const raphaelUser = {
            id: 'b306cee5-cab6-453a-b753-cdaa54cad0d4',
            email: 'rngos@eb-paersf.cm',
            nom: 'Ngos',
            prenom: 'Raphaël',
            role: 'MANAGER'
        };
        
        const token = jwt.sign(raphaelUser, JWT_SECRET, { expiresIn: '24h' });
        const decoded = verifyToken(token);
        console.log('✅ Token décodé:', decoded);
        
        // 2. Vérifier canSupervisorApprove
        console.log('\n2️⃣ Test canSupervisorApprove:');
        const TimeSheetApproval = require('./src/models/TimeSheetApproval');
        
        try {
            const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, supervisorUserId);
            console.log('✅ canSupervisorApprove:', canApprove);
        } catch (error) {
            console.error('❌ Erreur canSupervisorApprove:', error);
        }
        
        // 3. Tester la création d'approbation avec try-catch détaillé
        console.log('\n3️⃣ Test création d\'approbation:');
        
        try {
            // Vérifier d'abord si la feuille existe
            const timeSheetCheck = await client.query(`
                SELECT id, status FROM time_sheets WHERE id = $1
            `, [timeSheetId]);
            
            console.log('📋 Feuille trouvée:', timeSheetCheck.rows[0]);
            
            if (timeSheetCheck.rows.length === 0) {
                throw new Error('Feuille de temps non trouvée');
            }
            
            const status = timeSheetCheck.rows[0].status;
            console.log('📋 Statut de la feuille:', status);
            
            if (status !== 'submitted') {
                throw new Error(`Feuille de temps en statut ${status}, impossible d'approuver`);
            }
            
            // Tester la création
            const approval = await TimeSheetApproval.create(timeSheetId, supervisorUserId, 'approve', 'Test approbation avec logs');
            console.log('✅ Approbation créée:', approval);
            
        } catch (error) {
            console.error('❌ Erreur détaillée:', error);
            console.error('❌ Stack trace:', error.stack);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    } finally {
        client.release();
    }
}

debugServerLogs().catch(console.error);
