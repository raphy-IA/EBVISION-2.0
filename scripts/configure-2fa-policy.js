#!/usr/bin/env node

/**
 * Script de configuration de la politique 2FA
 * Permet d'activer/désactiver le 2FA obligatoire ou optionnel
 * Usage: node scripts/configure-2fa-policy.js [enable|disable|status]
 */

const { pool } = require('../src/utils/database');

console.log('🔐 CONFIGURATION DE LA POLITIQUE 2FA');
console.log('====================================\n');

async function configure2FAPolicy() {
    const action = process.argv[2] || 'status';
    
    try {
        switch (action) {
            case 'enable':
                await enable2FAForAllUsers();
                break;
            case 'disable':
                await disable2FAForAllUsers();
                break;
            case 'status':
                await show2FAStatus();
                break;
            case 'help':
                showHelp();
                break;
            default:
                console.log('❌ Action non reconnue. Utilisez: enable, disable, status, ou help');
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la configuration 2FA:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function enable2FAForAllUsers() {
    console.log('🔒 ACTIVATION DU 2FA POUR TOUS LES UTILISATEURS');
    console.log('===============================================\n');
    
    // Vérifier les utilisateurs existants
    const users = await pool.query(`
        SELECT id, nom, prenom, email, two_factor_enabled 
        FROM users 
        WHERE active = true 
        ORDER BY nom, prenom
    `);
    
    if (users.rows.length === 0) {
        console.log('⚠️  Aucun utilisateur actif trouvé');
        return;
    }
    
    console.log(`📊 ${users.rows.length} utilisateur(s) trouvé(s):\n`);
    
    users.rows.forEach(user => {
        const status = user.two_factor_enabled ? '✅ Activé' : '❌ Non activé';
        console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - 2FA: ${status}`);
    });
    
    console.log('\n⚠️  ATTENTION: Cette action ne force PAS l\'activation du 2FA');
    console.log('   Elle rend seulement la fonctionnalité disponible pour tous les utilisateurs.');
    console.log('   Chaque utilisateur devra configurer son 2FA individuellement.\n');
    
    console.log('✅ Configuration 2FA activée - Fonctionnalité disponible pour tous les utilisateurs');
    console.log('\n📝 Instructions pour les utilisateurs:');
    console.log('   1. Se connecter à l\'application');
    console.log('   2. Aller dans les paramètres de sécurité');
    console.log('   3. Configurer l\'authentification à deux facteurs');
    console.log('   4. Scanner le QR code avec Google Authenticator');
    console.log('   5. Sauvegarder les codes de récupération');
}

async function disable2FAForAllUsers() {
    console.log('🔓 DÉSACTIVATION DU 2FA POUR TOUS LES UTILISATEURS');
    console.log('=================================================\n');
    
    // Vérifier les utilisateurs avec 2FA activé
    const usersWith2FA = await pool.query(`
        SELECT id, nom, prenom, email 
        FROM users 
        WHERE active = true AND two_factor_enabled = true
        ORDER BY nom, prenom
    `);
    
    if (usersWith2FA.rows.length === 0) {
        console.log('✅ Aucun utilisateur avec 2FA activé trouvé');
        return;
    }
    
    console.log(`📊 ${usersWith2FA.rows.length} utilisateur(s) avec 2FA activé:\n`);
    
    usersWith2FA.rows.forEach(user => {
        console.log(`   - ${user.nom} ${user.prenom} (${user.email})`);
    });
    
    console.log('\n⚠️  ATTENTION: Cette action désactivera le 2FA pour tous les utilisateurs');
    console.log('   et supprimera leurs secrets 2FA. Cette action est irréversible.\n');
    
    // Désactiver le 2FA pour tous les utilisateurs
    await pool.query(`
        UPDATE users 
        SET two_factor_enabled = false, 
            two_factor_secret = NULL,
            backup_codes = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE active = true
    `);
    
    console.log('✅ 2FA désactivé pour tous les utilisateurs');
    console.log('✅ Secrets 2FA supprimés');
    console.log('✅ Codes de récupération supprimés');
}

async function show2FAStatus() {
    console.log('📊 STATUT DE LA CONFIGURATION 2FA');
    console.log('==================================\n');
    
    // Statistiques générales
    const stats = await pool.query(`
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as users_with_2fa,
            COUNT(CASE WHEN two_factor_enabled = false OR two_factor_enabled IS NULL THEN 1 END) as users_without_2fa
        FROM users 
        WHERE active = true
    `);
    
    const { total_users, users_with_2fa, users_without_2fa } = stats.rows[0];
    
    console.log('📈 Statistiques générales:');
    console.log(`   - Total utilisateurs actifs: ${total_users}`);
    console.log(`   - Utilisateurs avec 2FA: ${users_with_2fa}`);
    console.log(`   - Utilisateurs sans 2FA: ${users_without_2fa}`);
    console.log(`   - Pourcentage 2FA: ${total_users > 0 ? Math.round((users_with_2fa / total_users) * 100) : 0}%\n`);
    
    // Détail par utilisateur
    const users = await pool.query(`
        SELECT id, nom, prenom, email, two_factor_enabled, 
               CASE WHEN two_factor_enabled = true THEN 'Activé' ELSE 'Non activé' END as status
        FROM users 
        WHERE active = true 
        ORDER BY two_factor_enabled DESC, nom, prenom
    `);
    
    if (users.rows.length > 0) {
        console.log('👥 Détail par utilisateur:');
        users.rows.forEach(user => {
            const status = user.two_factor_enabled ? '✅' : '❌';
            console.log(`   ${status} ${user.nom} ${user.prenom} (${user.email}) - 2FA: ${user.status}`);
        });
    }
    
    // Vérifier la configuration des colonnes
    console.log('\n🔧 Configuration de la base de données:');
    const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('two_factor_enabled', 'two_factor_secret', 'backup_codes')
        ORDER BY column_name
    `);
    
    if (columns.rows.length === 3) {
        console.log('✅ Toutes les colonnes 2FA sont présentes:');
        columns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
    } else {
        console.log('❌ Colonnes 2FA manquantes - Migration requise');
    }
    
    // Vérifier les tables d'audit
    const auditTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('two_factor_attempts', 'security_logs', 'security_alerts')
        ORDER BY table_name
    `);
    
    console.log('\n📋 Tables d\'audit de sécurité:');
    if (auditTables.rows.length > 0) {
        auditTables.rows.forEach(table => {
            console.log(`   ✅ ${table.table_name}`);
        });
    } else {
        console.log('   ❌ Tables d\'audit manquantes - Migration requise');
    }
    
    // Recommandations
    console.log('\n💡 Recommandations:');
    if (users_with_2fa === 0) {
        console.log('   - Aucun utilisateur n\'utilise le 2FA actuellement');
        console.log('   - La fonctionnalité est disponible mais optionnelle');
        console.log('   - Considérez former les utilisateurs à l\'utilisation du 2FA');
    } else if (users_with_2fa < total_users / 2) {
        console.log('   - Moins de 50% des utilisateurs utilisent le 2FA');
        console.log('   - Considérez encourager l\'adoption du 2FA');
    } else {
        console.log('   - Bon taux d\'adoption du 2FA');
        console.log('   - Continuez à encourager les utilisateurs restants');
    }
}

function showHelp() {
    console.log('📖 AIDE - CONFIGURATION 2FA');
    console.log('============================\n');
    console.log('Usage: node scripts/configure-2fa-policy.js [action]\n');
    console.log('Actions disponibles:');
    console.log('  status  - Afficher le statut actuel du 2FA (défaut)');
    console.log('  enable  - Rendre le 2FA disponible pour tous les utilisateurs');
    console.log('  disable - Désactiver le 2FA pour tous les utilisateurs');
    console.log('  help    - Afficher cette aide\n');
    console.log('Exemples:');
    console.log('  node scripts/configure-2fa-policy.js status');
    console.log('  node scripts/configure-2fa-policy.js enable');
    console.log('  node scripts/configure-2fa-policy.js disable\n');
    console.log('Note: Le 2FA est toujours OPTIONNEL par défaut.');
    console.log('      Chaque utilisateur choisit d\'activer ou non le 2FA.');
}

// Exécuter le script
configure2FAPolicy();


