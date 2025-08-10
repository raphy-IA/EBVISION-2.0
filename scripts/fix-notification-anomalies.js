const { Pool } = require('pg');

// Configuration de la base de données (paramètres de l'application)
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'Canaan@2020'
};

class NotificationAnomalyFixer {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.fixesApplied = [];
    }

    async init() {
        console.log('🔧 Initialisation du correcteur d\'anomalies...');
        
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as current_time');
            client.release();
            
            console.log(`✅ Connexion établie - ${result.rows[0].current_time}\n`);
        } catch (error) {
            console.error('❌ Erreur de connexion:', error.message);
            throw error;
        }
    }

    async fixMissingTables() {
        console.log('📋 Correction des tables manquantes...');
        
        const tableFixes = [
            {
                name: 'notifications',
                sql: `
                    CREATE TABLE IF NOT EXISTS notifications (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        type VARCHAR(100) NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        data JSONB DEFAULT '{}',
                        is_read BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        read_at TIMESTAMP,
                        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))
                    )
                `
            },
            {
                name: 'notification_settings',
                sql: `
                    CREATE TABLE IF NOT EXISTS notification_settings (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        category VARCHAR(50) NOT NULL,
                        settings JSONB NOT NULL DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, category)
                    )
                `
            },
            {
                name: 'time_sheet_notifications',
                sql: `
                    CREATE TABLE IF NOT EXISTS time_sheet_notifications (
                        id SERIAL PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        time_sheet_id UUID,
                        type VARCHAR(50) NOT NULL,
                        message TEXT NOT NULL,
                        is_read BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        read_at TIMESTAMP
                    )
                `
            }
        ];

        for (const fix of tableFixes) {
            try {
                await this.pool.query(fix.sql);
                console.log(`✅ Table ${fix.name} créée/vérifiée`);
                this.fixesApplied.push(`Table ${fix.name} créée/vérifiée`);
            } catch (error) {
                console.error(`❌ Erreur lors de la création de ${fix.name}:`, error.message);
            }
        }
    }

    async fixMissingColumns() {
        console.log('\n🔧 Correction des colonnes manquantes...');
        
        const columnFixes = [
            {
                table: 'notifications',
                column: 'data',
                type: 'JSONB',
                defaultValue: "'{}'"
            },
            {
                table: 'notifications',
                column: 'is_read',
                type: 'BOOLEAN',
                defaultValue: 'FALSE'
            },
            {
                table: 'notifications',
                column: 'priority',
                type: 'VARCHAR(20)',
                defaultValue: "'medium'",
                check: "CHECK (priority IN ('low', 'medium', 'high'))"
            },
            {
                table: 'notification_settings',
                column: 'category',
                type: 'VARCHAR(50)',
                defaultValue: "'general'",
                notNull: true
            },
            {
                table: 'notification_settings',
                column: 'settings',
                type: 'JSONB',
                defaultValue: "'{}'",
                notNull: true
            },
            {
                table: 'opportunities',
                column: 'last_activity_at',
                type: 'TIMESTAMP',
                defaultValue: 'CURRENT_TIMESTAMP'
            },
            {
                table: 'opportunity_stages',
                column: 'due_date',
                type: 'DATE',
                defaultValue: null
            }
        ];

        for (const fix of columnFixes) {
            try {
                // Vérifier si la colonne existe
                const checkResult = await this.pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [fix.table, fix.column]);
                
                if (checkResult.rows.length === 0) {
                    // La colonne n'existe pas, l'ajouter
                    let sql = `ALTER TABLE ${fix.table} ADD COLUMN ${fix.column} ${fix.type}`;
                    
                    if (fix.defaultValue) {
                        sql += ` DEFAULT ${fix.defaultValue}`;
                    }
                    
                    if (fix.notNull) {
                        sql += ' NOT NULL';
                    }
                    
                    await this.pool.query(sql);
                    
                    // Ajouter la contrainte CHECK si spécifiée
                    if (fix.check) {
                        await this.pool.query(`ALTER TABLE ${fix.table} ADD ${fix.check}`);
                    }
                    
                    console.log(`✅ Colonne ${fix.column} ajoutée dans ${fix.table}`);
                    this.fixesApplied.push(`Colonne ${fix.column} dans ${fix.table}`);
                } else {
                    console.log(`ℹ️ Colonne ${fix.column} existe déjà dans ${fix.table}`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors de l'ajout de ${fix.column} dans ${fix.table}:`, error.message);
            }
        }
    }

    async fixIndexes() {
        console.log('\n🔍 Correction des index manquants...');
        
        const indexFixes = [
            {
                name: 'idx_notifications_user_id',
                sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)'
            },
            {
                name: 'idx_notifications_type',
                sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)'
            },
            {
                name: 'idx_notifications_created_at',
                sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)'
            },
            {
                name: 'idx_notifications_unread',
                sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE'
            },
            {
                name: 'idx_notification_settings_user_category',
                sql: 'CREATE INDEX IF NOT EXISTS idx_notification_settings_user_category ON notification_settings(user_id, category)'
            },
            {
                name: 'idx_opportunity_stages_overdue',
                sql: 'CREATE INDEX IF NOT EXISTS idx_opportunity_stages_overdue ON opportunity_stages(status, due_date) WHERE status = \'IN_PROGRESS\''
            }
        ];

        for (const fix of indexFixes) {
            try {
                await this.pool.query(fix.sql);
                console.log(`✅ Index ${fix.name} créé/vérifié`);
                this.fixesApplied.push(`Index ${fix.name}`);
            } catch (error) {
                console.error(`❌ Erreur lors de la création de l'index ${fix.name}:`, error.message);
            }
        }
    }

    async fixDataInconsistencies() {
        console.log('\n🔧 Correction des incohérences de données...');
        
        const dataFixes = [
            {
                name: 'Nettoyer les notifications orphelines',
                sql: `
                    DELETE FROM notifications 
                    WHERE user_id NOT IN (SELECT id FROM users)
                `
            },
            {
                name: 'Mettre à jour les dates d\'activité des opportunités',
                sql: `
                    UPDATE opportunities 
                    SET last_activity_at = GREATEST(
                        COALESCE(created_at, CURRENT_TIMESTAMP),
                        COALESCE(updated_at, CURRENT_TIMESTAMP)
                    )
                    WHERE last_activity_at IS NULL
                `
            },
            {
                name: 'Corriger les statuts d\'étapes invalides',
                sql: `
                    UPDATE opportunity_stages 
                    SET status = 'PENDING' 
                    WHERE status NOT IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
                `
            },
            {
                name: 'Nettoyer les paramètres de notifications orphelins',
                sql: `
                    DELETE FROM notification_settings 
                    WHERE user_id NOT IN (SELECT id FROM users)
                `
            }
        ];

        for (const fix of dataFixes) {
            try {
                const result = await this.pool.query(fix.sql);
                console.log(`✅ ${fix.name}: ${result.rowCount} lignes affectées`);
                this.fixesApplied.push(`${fix.name} (${result.rowCount} lignes)`);
            } catch (error) {
                console.error(`❌ Erreur lors de ${fix.name}:`, error.message);
            }
        }
    }

    async seedDefaultSettings() {
        console.log('\n🌱 Création des paramètres par défaut...');
        
        try {
            // Récupérer tous les utilisateurs
            const usersResult = await this.pool.query('SELECT id FROM users');
            
            const defaultSettings = {
                general: {
                    enableNotifications: true,
                    enableEmailNotifications: true,
                    enableCronJobs: true
                },
                email: {
                    smtpHost: 'smtp.gmail.com',
                    smtpPort: 587,
                    smtpUser: 'trs.notifications@gmail.com',
                    enableSSL: true,
                    enableDebug: false
                },
                notification_types: {
                    opportunity_stage_overdue: { enabled: true, email: true },
                    opportunity_won: { enabled: true, email: true },
                    opportunity_lost: { enabled: true, email: true },
                    opportunity_inactive: { enabled: true, email: true },
                    timesheet_overdue: { enabled: true, email: true },
                    timesheet_approved: { enabled: true, email: false },
                    timesheet_rejected: { enabled: true, email: true }
                },
                alerts: {
                    overdueThreshold: 1,
                    inactiveThreshold: 7,
                    notificationRetention: 30,
                    timezone: 'Europe/Paris'
                }
            };

            for (const user of usersResult.rows) {
                for (const [category, settings] of Object.entries(defaultSettings)) {
                    await this.pool.query(`
                        INSERT INTO notification_settings (user_id, category, settings)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, category) 
                        DO UPDATE SET settings = $3, updated_at = CURRENT_TIMESTAMP
                    `, [user.id, category, JSON.stringify(settings)]);
                }
            }
            
            console.log(`✅ Paramètres par défaut créés pour ${usersResult.rows.length} utilisateurs`);
            this.fixesApplied.push(`Paramètres par défaut pour ${usersResult.rows.length} utilisateurs`);
            
        } catch (error) {
            console.error('❌ Erreur lors de la création des paramètres par défaut:', error.message);
        }
    }

    async fixEmailServiceConfiguration() {
        console.log('\n📧 Correction de la configuration email...');
        
        try {
            // Vérifier et corriger la configuration email dans les paramètres
            const emailSettings = {
                smtpHost: 'smtp.gmail.com',
                smtpPort: 587,
                smtpUser: 'trs.notifications@gmail.com',
                smtpPassword: '', // À configurer manuellement
                smtpFrom: 'TRS Notifications <trs.notifications@gmail.com>',
                enableSSL: true,
                enableDebug: false
            };

            // Mettre à jour les paramètres email pour tous les utilisateurs
            await this.pool.query(`
                UPDATE notification_settings 
                SET settings = $1, updated_at = CURRENT_TIMESTAMP
                WHERE category = 'email'
            `, [JSON.stringify(emailSettings)]);
            
            console.log('✅ Configuration email mise à jour');
            this.fixesApplied.push('Configuration email mise à jour');
            
        } catch (error) {
            console.error('❌ Erreur lors de la correction de la configuration email:', error.message);
        }
    }

    async createTriggers() {
        console.log('\n🔔 Création des triggers automatiques...');
        
        const triggerFixes = [
            {
                name: 'update_opportunity_activity',
                sql: `
                    CREATE OR REPLACE FUNCTION update_opportunity_activity()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        UPDATE opportunities 
                        SET last_activity_at = CURRENT_TIMESTAMP
                        WHERE id = NEW.opportunity_id;
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                    
                    DROP TRIGGER IF EXISTS trigger_update_opportunity_activity ON opportunity_actions;
                    CREATE TRIGGER trigger_update_opportunity_activity
                        AFTER INSERT OR UPDATE ON opportunity_actions
                        FOR EACH ROW
                        EXECUTE FUNCTION update_opportunity_activity();
                `
            },
            {
                name: 'update_notification_settings_timestamp',
                sql: `
                    CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = CURRENT_TIMESTAMP;
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                    
                    DROP TRIGGER IF EXISTS trigger_update_notification_settings_timestamp ON notification_settings;
                    CREATE TRIGGER trigger_update_notification_settings_timestamp
                        BEFORE UPDATE ON notification_settings
                        FOR EACH ROW
                        EXECUTE FUNCTION update_notification_settings_timestamp();
                `
            }
        ];

        for (const fix of triggerFixes) {
            try {
                await this.pool.query(fix.sql);
                console.log(`✅ Trigger ${fix.name} créé/vérifié`);
                this.fixesApplied.push(`Trigger ${fix.name}`);
            } catch (error) {
                console.error(`❌ Erreur lors de la création du trigger ${fix.name}:`, error.message);
            }
        }
    }

    async validateFixes() {
        console.log('\n✅ Validation des corrections...');
        
        const validations = [
            {
                name: 'Vérifier les tables',
                sql: `
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('notifications', 'notification_settings', 'time_sheet_notifications')
                    ORDER BY table_name
                `
            },
            {
                name: 'Vérifier les colonnes',
                sql: `
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications' 
                    AND column_name IN ('priority', 'data', 'is_read')
                    ORDER BY column_name
                `
            },
            {
                name: 'Vérifier les index',
                sql: `
                    SELECT indexname, tablename 
                    FROM pg_indexes 
                    WHERE indexname LIKE 'idx_notifications%'
                    ORDER BY indexname
                `
            },
            {
                name: 'Compter les paramètres',
                sql: `
                    SELECT category, COUNT(*) as count
                    FROM notification_settings 
                    GROUP BY category
                    ORDER BY category
                `
            }
        ];

        for (const validation of validations) {
            try {
                const result = await this.pool.query(validation.sql);
                console.log(`✅ ${validation.name}: ${result.rows.length} résultats`);
                
                if (result.rows.length > 0) {
                    console.log(`   Détails:`, result.rows);
                }
            } catch (error) {
                console.error(`❌ Erreur lors de ${validation.name}:`, error.message);
            }
        }
    }

    async generateReport() {
        console.log('\n📋 RAPPORT DE CORRECTION DES ANOMALIES');
        console.log('=' .repeat(60));
        
        console.log(`\n🔧 Corrections appliquées (${this.fixesApplied.length}):`);
        this.fixesApplied.forEach((fix, index) => {
            console.log(`${index + 1}. ${fix}`);
        });
        
        console.log('\n✅ Système de notifications corrigé et optimisé !');
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Configurer le mot de passe email dans les paramètres');
        console.log('   2. Tester l\'envoi d\'emails');
        console.log('   3. Vérifier les notifications dans l\'interface');
        console.log('   4. Surveiller les tâches cron');
        
        console.log('\n' + '=' .repeat(60));
    }

    async runAllFixes() {
        try {
            await this.init();
            await this.fixMissingTables();
            await this.fixMissingColumns();
            await this.fixIndexes();
            await this.fixDataInconsistencies();
            await this.seedDefaultSettings();
            await this.fixEmailServiceConfiguration();
            await this.createTriggers();
            await this.validateFixes();
            await this.generateReport();
        } catch (error) {
            console.error('❌ Erreur critique lors des corrections:', error.message);
        } finally {
            await this.pool.end();
        }
    }
}

// Exécution du script
async function main() {
    console.log('🔧 Démarrage de la correction des anomalies du système de notifications');
    console.log('📅 Date:', new Date().toLocaleString('fr-FR'));
    console.log('🔗 Base de données:', dbConfig.database);
    console.log('');
    
    const fixer = new NotificationAnomalyFixer();
    await fixer.runAllFixes();
}

// Exécution si le script est appelé directement
if (require.main === module) {
    main().catch(console.error);
}

module.exports = NotificationAnomalyFixer;
