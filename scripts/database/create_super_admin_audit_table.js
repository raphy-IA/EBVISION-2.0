const { pool } = require('../../src/utils/database');

async function createAuditTable() {
    try {
        console.log('🔄 Vérification de la table super_admin_audit_log...');

        const query = `
            CREATE TABLE IF NOT EXISTS super_admin_audit_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(255) NOT NULL,
                target_user_id INTEGER REFERENCES users(id),
                details JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_super_admin_audit_user_id ON super_admin_audit_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_super_admin_audit_action ON super_admin_audit_log(action);
            CREATE INDEX IF NOT EXISTS idx_super_admin_audit_timestamp ON super_admin_audit_log(timestamp);
        `;

        await pool.query(query);
        console.log('✅ Table super_admin_audit_log créée ou déjà existante.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la création de la table:', error);
        process.exit(1);
    }
}

createAuditTable();
