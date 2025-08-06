require('dotenv').config();
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function fixDatabaseTables() {
    let client;
    try {
        console.log('🔍 Connexion à la base de données...');
        client = await pool.connect();
        console.log('✅ Connexion réussie');

        // Vérifier si les tables existent
        console.log('\n📋 Vérification des tables...');
        
        const tablesCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('time_sheets', 'time_entries')
            ORDER BY table_name
        `);
        
        console.log('Tables trouvées:', tablesCheck.rows.map(r => r.table_name));

        // Si les tables n'existent pas, les créer
        if (tablesCheck.rows.length < 2) {
            console.log('\n🏗️ Création des tables manquantes...');
            
            // Créer la table time_sheets
            await client.query(`
                CREATE TABLE IF NOT EXISTS time_sheets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id),
                    week_start DATE NOT NULL,
                    week_end DATE NOT NULL,
                    statut VARCHAR(20) NOT NULL DEFAULT 'sauvegardé' CHECK (statut IN ('sauvegardé', 'soumis', 'validé', 'rejeté')),
                    notes_rejet TEXT,
                    validateur_id UUID REFERENCES users(id),
                    date_validation TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, week_start)
                )
            `);
            console.log('✅ Table time_sheets créée');

            // Créer la table time_entries
            await client.query(`
                CREATE TABLE IF NOT EXISTS time_entries (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    time_sheet_id UUID NOT NULL REFERENCES time_sheets(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL REFERENCES users(id),
                    date_saisie DATE NOT NULL,
                    heures DECIMAL(5,2) NOT NULL DEFAULT 0,
                    type_heures VARCHAR(3) NOT NULL CHECK (type_heures IN ('HC', 'HNC')),
                    mission_id UUID REFERENCES missions(id),
                    task_id UUID REFERENCES tasks(id),
                    internal_activity_id UUID REFERENCES internal_activities(id),
                    statut VARCHAR(20) NOT NULL DEFAULT 'saisie' CHECK (statut IN ('saisie', 'soumise', 'validée', 'rejetée')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT check_hc_requires_mission CHECK (
                        (type_heures = 'HC' AND mission_id IS NOT NULL AND task_id IS NOT NULL) OR
                        (type_heures = 'HNC' AND internal_activity_id IS NOT NULL)
                    ),
                    UNIQUE(time_sheet_id, date_saisie, type_heures, mission_id, task_id, internal_activity_id)
                )
            `);
            console.log('✅ Table time_entries créée');

            // Créer les triggers pour updated_at
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);

            await client.query(`
                DROP TRIGGER IF EXISTS update_time_sheets_updated_at ON time_sheets;
                CREATE TRIGGER update_time_sheets_updated_at
                    BEFORE UPDATE ON time_sheets
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);

            await client.query(`
                DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
                CREATE TRIGGER update_time_entries_updated_at
                    BEFORE UPDATE ON time_entries
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);

            console.log('✅ Triggers créés');
        }

        // Vérifier la structure des tables
        console.log('\n🏗️ Structure de time_sheets:');
        const timeSheetsStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'time_sheets' 
            ORDER BY ordinal_position
        `);
        timeSheetsStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
        });

        console.log('\n🏗️ Structure de time_entries:');
        const timeEntriesStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position
        `);
        timeEntriesStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
        });

        // Vérifier les contraintes
        console.log('\n🔒 Contraintes de time_sheets:');
        const timeSheetsConstraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'time_sheets'::regclass
        `);
        timeSheetsConstraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.conname}: ${constraint.definition}`);
        });

        console.log('\n🔒 Contraintes de time_entries:');
        const timeEntriesConstraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'time_entries'::regclass
        `);
        timeEntriesConstraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.conname}: ${constraint.definition}`);
        });

        console.log('\n✅ Vérification terminée');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

fixDatabaseTables(); 