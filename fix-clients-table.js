const { pool } = require('./src/utils/database');

async function fixClientsTable() {
    try {
        console.log('🔧 Correction de la table clients...');
        
        // Ajouter les colonnes manquantes une par une
        const columns = [
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero_contribuable VARCHAR(20)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS forme_juridique VARCHAR(100)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS effectif INTEGER',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS chiffre_affaires DECIMAL(15,2)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS resultat_net DECIMAL(15,2)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS notation VARCHAR(10)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS risque_client VARCHAR(20) DEFAULT \'faible\'',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS groupe_id UUID REFERENCES clients(id) ON DELETE SET NULL',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS est_filiale BOOLEAN DEFAULT FALSE',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS site_web VARCHAR(255)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_creation_entreprise DATE',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS secteur_geographique VARCHAR(100)',
            'ALTER TABLE clients ADD COLUMN IF NOT EXISTS classification_abc VARCHAR(1)'
        ];
        
        for (let i = 0; i < columns.length; i++) {
            console.log(`📝 Ajout de la colonne ${i + 1}/${columns.length}...`);
            await pool.query(columns[i]);
        }
        
        console.log('✅ Toutes les colonnes ont été ajoutées');
        
        // Vérifier la structure finale
        const structureQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'clients'
            ORDER BY ordinal_position;
        `;
        
        const structure = await pool.query(structureQuery);
        console.log('📊 Structure finale de la table clients:');
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}`);
        });
        
        console.log(`📈 Nombre total de colonnes: ${structure.rows.length}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

fixClientsTable(); 