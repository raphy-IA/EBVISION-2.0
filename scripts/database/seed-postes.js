#!/usr/bin/env node

/**
 * Script pour peupler la table postes avec les données de base
 * Exécuter avec: node scripts/database/seed-postes.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Configuration PostgreSQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ewm_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
};

// Postes par défaut
const postes = [
    { nom: 'Directeur Général', code: 'DG', description: 'Direction générale de l\'entreprise' },
    { nom: 'Directeur des Opérations', code: 'DOPS', description: 'Direction des opérations' },
    { nom: 'Directeur', code: 'DIR', description: 'Directeur de département' },
    { nom: 'Responsable IT', code: 'RESPIT', description: 'Responsable informatique' },
    { nom: 'Secretaire', code: 'SEC', description: 'Secrétariat et assistance administrative' },
    { nom: 'Support IT', code: 'SUPIT', description: 'Support technique informatique' }
];

async function seedPostes() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    SEED - POSTES                             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Configuration PostgreSQL (depuis .env):');
    console.log(`🏠 Hôte       : ${dbConfig.host}`);
    console.log(`🔌 Port       : ${dbConfig.port}`);
    console.log(`👤 Utilisateur: ${dbConfig.user}`);
    console.log(`🗄️  Base      : ${dbConfig.database}`);
    console.log(`🔐 SSL        : Non\n`);

    const pool = new Pool(dbConfig);

    try {
        console.log('📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // Vérifier les postes existants
        console.log('🔍 Vérification des postes existants...');
        const existingPostesResult = await pool.query(
            'SELECT code, nom FROM postes ORDER BY code'
        );
        
        console.log(`📊 Postes existants: ${existingPostesResult.rows.length}`);
        if (existingPostesResult.rows.length > 0) {
            existingPostesResult.rows.forEach(poste => {
                console.log(`   - ${poste.code}: ${poste.nom}`);
            });
        }
        console.log('');

        // Créer ou mettre à jour les postes
        let created = 0;
        let updated = 0;

        console.log('🚀 Vérification et insertion des postes...\n');

        // Créer un Set des codes existants pour une recherche rapide
        const existingCodes = new Set(existingPostesResult.rows.map(p => p.code));
        let skipped = 0;

        for (const poste of postes) {
            try {
                if (existingCodes.has(poste.code)) {
                    // Poste existe déjà - vérifier si mise à jour nécessaire
                    const checkResult = await pool.query(
                        'SELECT nom, description FROM postes WHERE code = $1',
                        [poste.code]
                    );
                    
                    const existing = checkResult.rows[0];
                    const needsUpdate = 
                        existing.nom !== poste.nom || 
                        existing.description !== poste.description;

                    if (needsUpdate) {
                        await pool.query(`
                            UPDATE postes 
                            SET nom = $1, 
                                description = $2,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE code = $3
                        `, [poste.nom, poste.description, poste.code]);
                        
                        console.log(`✏️  Mis à jour: ${poste.code} - ${poste.nom} (modifications détectées)`);
                        updated++;
                    } else {
                        console.log(`⏭️  Ignoré: ${poste.code} - ${poste.nom} (déjà à jour)`);
                        skipped++;
                    }
                } else {
                    // Créer le nouveau poste
                    await pool.query(`
                        INSERT INTO postes (code, nom, description, statut)
                        VALUES ($1, $2, $3, 'ACTIF')
                    `, [poste.code, poste.nom, poste.description]);
                    
                    console.log(`✅ Créé: ${poste.code} - ${poste.nom}`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Erreur pour ${poste.code}:`, error.message);
                skipped++;
            }
        }

        // Vérifier s'il existe des postes dans la base qui ne sont pas dans notre liste
        const extraPostes = existingPostesResult.rows.filter(
            existing => !postes.find(p => p.code === existing.code)
        );
        
        if (extraPostes.length > 0) {
            console.log('\n⚠️  Postes existants non standard détectés:');
            extraPostes.forEach(poste => {
                console.log(`   - ${poste.code}: ${poste.nom}`);
            });
            console.log('   (Ces postes seront conservés)')
        }

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║                        RÉSUMÉ                                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log(`✅ Postes créés       : ${created}`);
        console.log(`✏️  Postes mis à jour  : ${updated}`);
        console.log(`⏭️  Postes ignorés     : ${skipped} (déjà à jour)`);
        console.log(`📊 Total traité       : ${created + updated + skipped}`);
        console.log(`🗂️  Postes existants   : ${existingPostesResult.rows.length}`);

        // Statistiques finales
        const finalStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE statut = 'ACTIF') as actifs,
                COUNT(*) FILTER (WHERE statut = 'INACTIF') as inactifs
            FROM postes
        `);

        console.log('\n📊 Statistiques finales:');
        console.log(`   Total postes    : ${finalStats.rows[0].total}`);
        console.log(`   Postes actifs   : ${finalStats.rows[0].actifs}`);
        console.log(`   Postes inactifs : ${finalStats.rows[0].inactifs}`);

        console.log('\n✅ Seed terminé avec succès!\n');

    } catch (error) {
        console.error('\n❌ Erreur lors du seed:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Exécuter le seed
seedPostes();

