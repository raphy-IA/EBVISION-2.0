#!/usr/bin/env node

/**
 * Script pour peupler la table grades avec les données de base
 * Exécuter avec: node scripts/database/seed-grades.js
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

// Grades par défaut (du plus élevé au plus bas)
const grades = [
    { nom: 'Associé', code: 'ASSOC', niveau: 6, taux_min: 130, taux_max: 180 },
    { nom: 'Manager', code: 'MGR', niveau: 5, taux_min: 100, taux_max: 130 },
    { nom: 'Senior', code: 'SEN', niveau: 4, taux_min: 75, taux_max: 100 },
    { nom: 'Assistant', code: 'ASST', niveau: 3, taux_min: 50, taux_max: 75 },
    { nom: 'Junior', code: 'JUN', niveau: 2, taux_min: 35, taux_max: 50 },
    { nom: 'Stagiaire', code: 'STAG', niveau: 1, taux_min: 25, taux_max: 35 }
];

async function seedGrades() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    SEED - GRADES                             ║');
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

        // Vérifier les grades existants
        console.log('🔍 Vérification des grades existants...');
        const existingGradesResult = await pool.query(
            'SELECT code, nom, niveau FROM grades ORDER BY niveau DESC'
        );
        
        console.log(`📊 Grades existants: ${existingGradesResult.rows.length}`);
        if (existingGradesResult.rows.length > 0) {
            existingGradesResult.rows.forEach(grade => {
                console.log(`   - Niveau ${grade.niveau}: ${grade.code} - ${grade.nom}`);
            });
        }
        console.log('');

        // Créer ou mettre à jour les grades
        let created = 0;
        let updated = 0;

        console.log('🚀 Vérification et insertion des grades...\n');

        // Créer un Set des codes existants pour une recherche rapide
        const existingCodes = new Set(existingGradesResult.rows.map(g => g.code));
        let skipped = 0;

        for (const grade of grades) {
            try {
                if (existingCodes.has(grade.code)) {
                    // Grade existe déjà - vérifier si mise à jour nécessaire
                    const checkResult = await pool.query(
                        'SELECT nom, niveau, taux_min, taux_max FROM grades WHERE code = $1',
                        [grade.code]
                    );
                    
                    const existing = checkResult.rows[0];
                    const needsUpdate = 
                        existing.nom !== grade.nom || 
                        existing.niveau !== grade.niveau ||
                        existing.taux_min !== grade.taux_min ||
                        existing.taux_max !== grade.taux_max;

                    if (needsUpdate) {
                        await pool.query(`
                            UPDATE grades 
                            SET nom = $1, 
                                niveau = $2,
                                taux_min = $3,
                                taux_max = $4,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE code = $5
                        `, [grade.nom, grade.niveau, grade.taux_min, grade.taux_max, grade.code]);
                        
                        console.log(`✏️  Mis à jour: ${grade.code} - ${grade.nom} (Niveau ${grade.niveau}, modifications détectées)`);
                        updated++;
                    } else {
                        console.log(`⏭️  Ignoré: ${grade.code} - ${grade.nom} (Niveau ${grade.niveau}, déjà à jour)`);
                        skipped++;
                    }
                } else {
                    // Créer le nouveau grade
                    await pool.query(`
                        INSERT INTO grades (code, nom, niveau, taux_min, taux_max, statut)
                        VALUES ($1, $2, $3, $4, $5, 'ACTIF')
                    `, [grade.code, grade.nom, grade.niveau, grade.taux_min, grade.taux_max]);
                    
                    console.log(`✅ Créé: ${grade.code} - ${grade.nom} (Niveau ${grade.niveau})`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Erreur pour ${grade.code}:`, error.message);
                skipped++;
            }
        }

        // Vérifier s'il existe des grades dans la base qui ne sont pas dans notre liste
        const extraGrades = existingGradesResult.rows.filter(
            existing => !grades.find(g => g.code === existing.code)
        );
        
        if (extraGrades.length > 0) {
            console.log('\n⚠️  Grades existants non standard détectés:');
            extraGrades.forEach(grade => {
                console.log(`   - Niveau ${grade.niveau}: ${grade.code} - ${grade.nom}`);
            });
            console.log('   (Ces grades seront conservés)')
        }

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║                        RÉSUMÉ                                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log(`✅ Grades créés       : ${created}`);
        console.log(`✏️  Grades mis à jour  : ${updated}`);
        console.log(`⏭️  Grades ignorés     : ${skipped} (déjà à jour)`);
        console.log(`📊 Total traité       : ${created + updated + skipped}`);
        console.log(`🗂️  Grades existants   : ${existingGradesResult.rows.length}`);

        // Statistiques finales
        const finalStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE statut = 'ACTIF') as actifs,
                COUNT(*) FILTER (WHERE statut = 'INACTIF') as inactifs
            FROM grades
        `);

        console.log('\n📊 Statistiques finales:');
        console.log(`   Total grades    : ${finalStats.rows[0].total}`);
        console.log(`   Grades actifs   : ${finalStats.rows[0].actifs || finalStats.rows[0].total}`);
        console.log(`   Grades inactifs : ${finalStats.rows[0].inactifs || 0}`);

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
seedGrades();

