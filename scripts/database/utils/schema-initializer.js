const path = require('path');

const ROLE_COLOR_COLUMNS = [
    {
        name: 'badge_bg_class',
        type: 'VARCHAR(50)',
        default: `'secondary'`,
        notNull: true
    },
    {
        name: 'badge_text_class',
        type: 'VARCHAR(50)',
        default: `'white'`,
        notNull: true
    },
    {
        name: 'badge_hex_color',
        type: 'VARCHAR(7)',
        default: "'#6c757d'",
        notNull: true
    },
    {
        name: 'badge_priority',
        type: 'INTEGER',
        default: '0',
        notNull: true
    }
];

const BASE_ROLES = [
    {
        name: 'SUPER_ADMIN',
        description: 'Super Administrateur - Accès total au système',
        is_system_role: true,
        badge_bg_class: 'danger',
        badge_text_class: 'white',
        badge_hex_color: '#dc3545',
        badge_priority: 100
    },
    {
        name: 'ADMIN',
        description: 'Administrateur général',
        is_system_role: true,
        badge_bg_class: 'primary',
        badge_text_class: 'white',
        badge_hex_color: '#0d6efd',
        badge_priority: 90
    },
    {
        name: 'ADMIN_IT',
        description: 'Administrateur IT',
        is_system_role: true,
        badge_bg_class: 'info',
        badge_text_class: 'white',
        badge_hex_color: '#0dcaf0',
        badge_priority: 80
    },
    {
        name: 'ASSOCIE',
        description: 'Associé',
        is_system_role: false,
        badge_bg_class: 'warning',
        badge_text_class: 'dark',
        badge_hex_color: '#ffc107',
        badge_priority: 70
    },
    {
        name: 'DIRECTEUR',
        description: 'Directeur',
        is_system_role: false,
        badge_bg_class: 'success',
        badge_text_class: 'white',
        badge_hex_color: '#198754',
        badge_priority: 60
    },
    {
        name: 'MANAGER',
        description: 'Manager / Chef d\'équipe',
        is_system_role: false,
        badge_bg_class: 'secondary',
        badge_text_class: 'white',
        badge_hex_color: '#6c757d',
        badge_priority: 50
    },
    {
        name: 'SUPERVISEUR',
        description: 'Superviseur',
        is_system_role: false,
        badge_bg_class: 'dark',
        badge_text_class: 'white',
        badge_hex_color: '#212529',
        badge_priority: 40
    },
    {
        name: 'CONSULTANT',
        description: 'Consultant',
        is_system_role: false,
        badge_bg_class: 'success',
        badge_text_class: 'white',
        badge_hex_color: '#198754',
        badge_priority: 30
    },
    {
        name: 'COLLABORATEUR',
        description: 'Collaborateur standard',
        is_system_role: false,
        badge_bg_class: 'info',
        badge_text_class: 'white',
        badge_hex_color: '#17a2b8',
        badge_priority: 20
    },
    {
        name: 'USER',
        description: 'Utilisateur standard',
        is_system_role: false,
        badge_bg_class: 'secondary',
        badge_text_class: 'white',
        badge_hex_color: '#6c757d',
        badge_priority: 10
    }
];

async function ensureExtensions(pool) {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
}

async function columnExists(pool, tableName, columnName) {
    const result = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [tableName, columnName]
    );
    return result.rows.length > 0;
}

async function ensureColumn(pool, tableName, column) {
    const exists = await columnExists(pool, tableName, column.name);
    if (exists) {
        return false;
    }

    let definition = `${column.name} ${column.type}`;
    if (column.default) {
        definition += ` DEFAULT ${column.default}`;
    }
    if (column.notNull) {
        definition += ' NOT NULL';
    }

    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${definition}`;
    await pool.query(sql);
    return true;
}

async function ensureBaseRoles(pool) {
    const tableCheck = await pool.query(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'roles'
        ) as exists`
    );

    if (!tableCheck.rows[0]?.exists) {
        throw new Error('La table "roles" est introuvable. Assurez-vous que les migrations ont été exécutées.');
    }

    let addedColumns = 0;
    for (const column of ROLE_COLOR_COLUMNS) {
        const created = await ensureColumn(pool, 'roles', column);
        if (created) {
            addedColumns += 1;
            console.log(`   ✓ Colonne ${column.name} ajoutée à roles`);
        }
    }

    if (addedColumns > 0) {
        console.log(`✅ ${addedColumns} colonne(s) de couleur ajoutée(s) à "roles"`);
    }

    const insertValues = BASE_ROLES.map(role => [
        role.name,
        role.description,
        role.is_system_role,
        role.badge_bg_class,
        role.badge_text_class,
        role.badge_hex_color,
        role.badge_priority
    ]);

    const placeholders = insertValues
        .map((_, index) => `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`)
        .join(', ');

    const flatValues = insertValues.flat();

    await pool.query(
        `INSERT INTO roles (name, description, is_system_role, badge_bg_class, badge_text_class, badge_hex_color, badge_priority)
         VALUES ${placeholders}
         ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description,
             is_system_role = EXCLUDED.is_system_role,
             badge_bg_class = EXCLUDED.badge_bg_class,
             badge_text_class = EXCLUDED.badge_text_class,
             badge_hex_color = EXCLUDED.badge_hex_color,
             badge_priority = EXCLUDED.badge_priority;`,
        flatValues
    );

    console.log(`✅ Rôles de base synchronisés (${BASE_ROLES.length})`);
}

async function runMigrationsWithConfig(connectionConfig) {
    const migratePath = path.join(__dirname, '..', '..', '..', 'database', 'migrate.js');
    const dbUtilPath = path.join(__dirname, '..', '..', '..', 'src', 'utils', 'database.js');

    const previousEnv = {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD
    };

    process.env.DB_HOST = connectionConfig.host || process.env.DB_HOST;
    process.env.DB_PORT = connectionConfig.port ? String(connectionConfig.port) : process.env.DB_PORT;
    process.env.DB_NAME = connectionConfig.database || process.env.DB_NAME;
    process.env.DB_USER = connectionConfig.user || process.env.DB_USER;
    process.env.DB_PASSWORD = connectionConfig.password || process.env.DB_PASSWORD;

    delete require.cache[require.resolve(dbUtilPath)];
    delete require.cache[require.resolve(migratePath)];

    const { runMigrations } = require(migratePath);
    await runMigrations();

    // Restaurer l'environnement précédent pour éviter les surprises
    process.env.DB_HOST = previousEnv.DB_HOST;
    process.env.DB_PORT = previousEnv.DB_PORT;
    process.env.DB_NAME = previousEnv.DB_NAME;
    process.env.DB_USER = previousEnv.DB_USER;
    process.env.DB_PASSWORD = previousEnv.DB_PASSWORD;
}

module.exports = {
    ensureExtensions,
    ensureBaseRoles,
    runMigrationsWithConfig
};


