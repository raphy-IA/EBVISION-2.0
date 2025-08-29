const { pool } = require('../src/utils/database');

async function checkTables() {
    try {
        const client = await pool.connect();
        console.log('🔍 Vérification des tables de permissions...');
        
        // Vérifier si les tables existent
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_roles', 'permissions', 'role_permissions', 'user_permissions', 'user_business_unit_access', 'permission_audit_log')
            ORDER BY table_name
        `);
        
        console.log('📋 Tables existantes:');
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
        // Vérifier la structure de toutes les tables
        for (const table of tables.rows) {
            const columns = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table.table_name]);
            
            console.log(`\n📋 Structure de ${table.table_name}:`);
            columns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
            
            // Compter les données
            const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
            console.log(`   📊 Nombre d'enregistrements: ${count.rows[0].count}`);
        }
        
        // Vérifier s'il y a des données dans user_roles
        if (tables.rows.some(t => t.table_name === 'user_roles')) {
            const userRoles = await client.query('SELECT * FROM user_roles LIMIT 5');
            console.log('\n📋 Exemples de données dans user_roles:');
            userRoles.rows.forEach(row => {
                console.log(`   - ${JSON.stringify(row)}`);
            });
        }
        
        // Vérifier s'il y a des données dans permissions
        if (tables.rows.some(t => t.table_name === 'permissions')) {
            const permissions = await client.query('SELECT * FROM permissions LIMIT 5');
            console.log('\n📋 Exemples de données dans permissions:');
            permissions.rows.forEach(row => {
                console.log(`   - ${JSON.stringify(row)}`);
            });
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkTables()
    .then(() => {
        console.log('✅ Vérification terminée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la vérification:', error);
        process.exit(1);
    });
