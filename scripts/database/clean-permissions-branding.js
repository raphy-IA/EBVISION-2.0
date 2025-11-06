#!/usr/bin/env node

/**
 * SCRIPT DE NETTOYAGE DES RÉFÉRENCES DE BRANDING DANS LES PERMISSIONS
 * =====================================================================
 * 
 * Ce script nettoie toutes les références hardcodées à "EB Vision", "EB-Vision", 
 * "EWM" ou autres noms de marque dans les noms et descriptions des permissions.
 * 
 * Usage: node scripts/database/clean-permissions-branding.js
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     NETTOYAGE DES RÉFÉRENCES DE BRANDING                    ║');
console.log('║     DANS LES PERMISSIONS                                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

/**
 * Nettoyer une chaîne des références hardcodées à "EB Vision"
 * Note: On garde les références génériques (EWM, etc.) qui peuvent être personnalisées via le branding
 */
function cleanBrandingReferences(text) {
    if (!text) return text;
    
    // Nettoyer seulement les références hardcodées spécifiques à "EB Vision"
    // On garde les références génériques qui peuvent être dans le branding du client
    return text
        .replace(/ - EB-Vision 2\.0/gi, '')
        .replace(/ - EB Vision 2\.0/gi, '')
        .replace(/\bEB-Vision 2\.0\b/gi, '')
        .replace(/\bEB Vision 2\.0\b/gi, '')
        .replace(/\bEB-Vision\b/gi, '')
        .replace(/\bEB Vision\b/gi, '')
        // Ne pas supprimer "EWM" ou autres noms génériques qui peuvent être dans le branding
        .trim();
}

/**
 * Nettoyer toutes les permissions
 */
async function cleanPermissions() {
    try {
        console.log('📋 Récupération de toutes les permissions...\n');
        
        // Récupérer toutes les permissions
        const result = await pool.query(`
            SELECT id, code, name, description, category
            FROM permissions
            ORDER BY code
        `);
        
        const permissions = result.rows;
        console.log(`   ✅ ${permissions.length} permissions trouvées\n`);
        
        let updated = 0;
        let unchanged = 0;
        
        console.log('🔄 Nettoyage des références de branding...\n');
        
        for (const perm of permissions) {
            const cleanedName = cleanBrandingReferences(perm.name);
            const cleanedDescription = perm.description ? cleanBrandingReferences(perm.description) : null;
            
            // Vérifier si des changements sont nécessaires
            if (cleanedName !== perm.name || cleanedDescription !== perm.description) {
                try {
                    await pool.query(`
                        UPDATE permissions 
                        SET name = $1, 
                            description = $2,
                            updated_at = NOW()
                        WHERE id = $3
                    `, [cleanedName, cleanedDescription, perm.id]);
                    
                    updated++;
                    console.log(`   🔄 ${perm.code}:`);
                    if (cleanedName !== perm.name) {
                        console.log(`      Nom: "${perm.name}" → "${cleanedName}"`);
                    }
                    if (cleanedDescription !== perm.description) {
                        console.log(`      Description: "${perm.description}" → "${cleanedDescription}"`);
                    }
                } catch (error) {
                    console.error(`   ❌ Erreur pour ${perm.code}:`, error.message);
                }
            } else {
                unchanged++;
            }
        }
        
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ NETTOYAGE TERMINÉ                              ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        console.log(`   📊 Statistiques:`);
        console.log(`      ✅ ${updated} permissions mises à jour`);
        console.log(`      ➡️  ${unchanged} permissions inchangées`);
        console.log(`      📝 Total: ${permissions.length} permissions\n`);
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    }
}

/**
 * Fonction principale
 */
async function main() {
    try {
        // Tester la connexion
        await pool.query('SELECT 1');
        console.log('✅ Connexion à la base de données établie\n');
        
        // Nettoyer les permissions
        await cleanPermissions();
        
        console.log('✅ Script terminé avec succès\n');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = { cleanPermissions, cleanBrandingReferences };

