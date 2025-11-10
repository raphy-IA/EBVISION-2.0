#!/usr/bin/env node

/**
 * Script pour peupler la table types_collaborateurs avec des données de base
 * Exécuter avec: node scripts/database/seed-types-collaborateurs.js
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

// Types de collaborateurs standards
const typesCollaborateurs = [
    {
        code: 'ADM',
        nom: 'Administratif',
        description: 'Personnel administratif et gestion',
        statut: 'ACTIF'
    },
    {
        code: 'TEC',
        nom: 'Technique',
        description: 'Personnel technique (IT, maintenance, infrastructure)',
        statut: 'ACTIF'
    },
    {
        code: 'CONS',
        nom: 'Consultant',
        description: 'Consultant en gestion et stratégie d\'entreprise',
        statut: 'ACTIF'
    },
    {
        code: 'SUP',
        nom: 'Support',
        description: 'Personnel de support et assistance',
        statut: 'ACTIF'
    }
];

async function seedTypesCollaborateurs() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     SEED - TYPES DE COLLABORATEURS                          ║');
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

        // Vérifier les types existants
        console.log('🔍 Vérification des types existants...');
        const existingTypesResult = await pool.query(
            'SELECT code, nom FROM types_collaborateurs ORDER BY code'
        );
        
        console.log(`📊 Types existants: ${existingTypesResult.rows.length}`);
        if (existingTypesResult.rows.length > 0) {
            existingTypesResult.rows.forEach(type => {
                console.log(`   - ${type.code}: ${type.nom}`);
            });
        }
        console.log('');

        // Créer ou mettre à jour les types
        let created = 0;
        let updated = 0;
        let skipped = 0;

        console.log('🚀 Vérification et insertion des types de collaborateurs...\n');

        // Créer un Set des codes existants pour une recherche rapide
        const existingCodes = new Set(existingTypesResult.rows.map(t => t.code));

        for (const type of typesCollaborateurs) {
            try {
                if (existingCodes.has(type.code)) {
                    // Type existe déjà - vérifier si mise à jour nécessaire
                    const checkResult = await pool.query(
                        'SELECT nom, description, statut FROM types_collaborateurs WHERE code = $1',
                        [type.code]
                    );
                    
                    const existing = checkResult.rows[0];
                    const needsUpdate = 
                        existing.nom !== type.nom || 
                        existing.description !== type.description ||
                        existing.statut !== type.statut;

                    if (needsUpdate) {
                        await pool.query(`
                            UPDATE types_collaborateurs 
                            SET nom = $1, 
                                description = $2,
                                statut = $3,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE code = $4
                        `, [type.nom, type.description, type.statut, type.code]);
                        
                        console.log(`✏️  Mis à jour: ${type.code} - ${type.nom} (modifications détectées)`);
                        updated++;
                    } else {
                        console.log(`⏭️  Ignoré: ${type.code} - ${type.nom} (déjà à jour)`);
                        skipped++;
                    }
                } else {
                    // Créer le nouveau type
                    await pool.query(`
                        INSERT INTO types_collaborateurs (code, nom, description, statut)
                        VALUES ($1, $2, $3, $4)
                    `, [type.code, type.nom, type.description, type.statut]);
                    
                    console.log(`✅ Créé: ${type.code} - ${type.nom}`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Erreur pour ${type.code}:`, error.message);
                skipped++;
            }
        }

        // Vérifier s'il existe des types dans la base qui ne sont pas dans notre liste
        const extraTypes = existingTypesResult.rows.filter(
            existing => !typesCollaborateurs.find(t => t.code === existing.code)
        );
        
        if (extraTypes.length > 0) {
            console.log('\n⚠️  Types existants non standard détectés:');
            extraTypes.forEach(type => {
                console.log(`   - ${type.code}: ${type.nom}`);
            });
            console.log('   (Ces types seront conservés)')
        }

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║                        RÉSUMÉ                                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log(`✅ Types créés        : ${created}`);
        console.log(`✏️  Types mis à jour   : ${updated}`);
        console.log(`⏭️  Types ignorés      : ${skipped} (déjà à jour)`);
        console.log(`📊 Total traité       : ${created + updated + skipped}`);
        console.log(`🗂️  Types existants    : ${existingTypesResult.rows.length}`);

        // Statistiques finales
        const finalStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE statut = 'ACTIF') as actifs,
                COUNT(*) FILTER (WHERE statut = 'INACTIF') as inactifs
            FROM types_collaborateurs
        `);

        console.log('\n📊 Statistiques finales:');
        console.log(`   Total types     : ${finalStats.rows[0].total}`);
        console.log(`   Types actifs    : ${finalStats.rows[0].actifs}`);
        console.log(`   Types inactifs  : ${finalStats.rows[0].inactifs}`);

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
seedTypesCollaborateurs();

