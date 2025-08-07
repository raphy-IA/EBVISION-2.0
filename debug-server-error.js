const { pool } = require('./src/utils/database');
const { generateToken } = require('./src/middleware/auth');
const TimeSheetApproval = require('./src/models/TimeSheetApproval');

async function debugServerError() {
    console.log('🔍 Débogage de l\'erreur serveur...');
    
    const client = await pool.connect();
    try {
        // 1. Générer un token valide pour Raphaël
        const raphaelUser = {
            id: 'b306cee5-cab6-453a-b753-cdaa54cad0d4',
            email: 'rngos@eb-paersf.cm',
            nom: 'Ngos',
            prenom: 'Raphaël',
            role: 'MANAGER'
        };
        
        const token = generateToken(raphaelUser);
        console.log('🎯 Token généré:', token);
        
        // 2. Tester canSupervisorApprove directement
        const timeSheetId = 'f5db5871-8872-4862-81f8-5b47ed7d8ec9';
        const supervisorId = 'b306cee5-cab6-453a-b753-cdaa54cad0d4';
        
        console.log('\n🔍 Test canSupervisorApprove:');
        console.log('  - timeSheetId:', timeSheetId);
        console.log('  - supervisorId:', supervisorId);
        
        try {
            const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, supervisorId);
            console.log('✅ canSupervisorApprove résultat:', canApprove);
        } catch (error) {
            console.error('❌ Erreur canSupervisorApprove:', error);
        }
        
        // 3. Tester la création d'approbation
        console.log('\n🔍 Test création d\'approbation:');
        try {
            const approval = await TimeSheetApproval.create(timeSheetId, supervisorId, 'approve', 'Test approbation');
            console.log('✅ Approbation créée:', approval);
        } catch (error) {
            console.error('❌ Erreur création approbation:', error);
            
            // Vérifier la structure de la table
            console.log('\n📋 Vérification structure table time_sheet_approvals:');
            const structureResult = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'time_sheet_approvals'
                ORDER BY ordinal_position
            `);
            console.log('Structure:', structureResult.rows);
        }
        
        // 4. Vérifier les données existantes
        console.log('\n📊 Données existantes dans time_sheet_approvals:');
        const existingData = await client.query(`
            SELECT * FROM time_sheet_approvals LIMIT 5
        `);
        console.log('Données existantes:', existingData.rows);
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    } finally {
        client.release();
    }
}

debugServerError().catch(console.error);
