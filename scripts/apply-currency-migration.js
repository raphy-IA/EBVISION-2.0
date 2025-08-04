const { Pool } = require('pg');
require('dotenv').config();

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trs_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function applyCurrencyMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Début de la migration des devises vers XAF...');
        
        // 1. Mettre à jour les valeurs par défaut dans la table missions
        console.log('📝 Mise à jour des valeurs par défaut...');
        await client.query(`
            ALTER TABLE missions ALTER COLUMN devise_honoraires SET DEFAULT 'XAF';
            ALTER TABLE missions ALTER COLUMN devise_debours SET DEFAULT 'XAF';
        `);
        
        // 2. Mettre à jour les données existantes
        console.log('🔄 Mise à jour des données existantes...');
        const result1 = await client.query(`
            UPDATE missions 
            SET devise_honoraires = 'XAF' 
            WHERE devise_honoraires = 'EUR' OR devise_honoraires IS NULL
        `);
        console.log(`   ✅ ${result1.rowCount} missions honoraires mises à jour`);
        
        const result2 = await client.query(`
            UPDATE missions 
            SET devise_debours = 'XAF' 
            WHERE devise_debours = 'EUR' OR devise_debours IS NULL
        `);
        console.log(`   ✅ ${result2.rowCount} missions débours mises à jour`);
        
        // 3. Vérifier si la table opportunites existe et a une colonne devise
        console.log('🔍 Vérification de la table opportunites...');
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'opportunites'
            );
        `);
        
        if (tableExists.rows[0].exists) {
            const columnExists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'opportunites' AND column_name = 'devise'
                );
            `);
            
            if (columnExists.rows[0].exists) {
                console.log('📝 Mise à jour de la table opportunites...');
                await client.query(`
                    ALTER TABLE opportunites ALTER COLUMN devise SET DEFAULT 'XAF';
                `);
                
                const result3 = await client.query(`
                    UPDATE opportunites 
                    SET devise = 'XAF' 
                    WHERE devise = 'EUR' OR devise IS NULL
                `);
                console.log(`   ✅ ${result3.rowCount} opportunités mises à jour`);
            } else {
                console.log('   ℹ️  Colonne devise non trouvée dans opportunites');
            }
        } else {
            console.log('   ℹ️  Table opportunites non trouvée');
        }
        
        // 4. Ajouter les commentaires
        console.log('📝 Ajout des commentaires...');
        await client.query(`
            COMMENT ON COLUMN missions.devise_honoraires IS 'Devise des honoraires (XAF par défaut)';
            COMMENT ON COLUMN missions.devise_debours IS 'Devise des débours (XAF par défaut)';
        `);
        
        console.log('✅ Migration des devises terminée avec succès !');
        console.log('');
        console.log('📊 Résumé des modifications :');
        console.log(`   - ${result1.rowCount} missions honoraires mises à jour`);
        console.log(`   - ${result2.rowCount} missions débours mises à jour`);
        if (tableExists.rows[0].exists && columnExists.rows[0].exists) {
            console.log(`   - ${result3.rowCount} opportunités mises à jour`);
        }
        console.log('   - Devise par défaut changée de EUR vers XAF');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
    applyCurrencyMigration()
        .then(() => {
            console.log('🎉 Migration terminée avec succès !');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erreur lors de la migration:', error);
            process.exit(1);
        });
}

module.exports = { applyCurrencyMigration }; 