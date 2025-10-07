#!/usr/bin/env node

/**
 * Script pour diagnostiquer le problème de mot de passe de l'utilisateur
 */

const { pool } = require('../src/utils/database');

async function diagnoseUserPasswordIssue() {
    console.log('🔍 DIAGNOSTIC DU PROBLÈME DE MOT DE PASSE');
    console.log('==========================================\n');

    try {
        // Connexion à la base de données
        console.log('🔗 Connexion à la base de données...');
        const client = await pool.connect();
        console.log('✅ Connexion réussie\n');

        // Récupérer tous les utilisateurs et leurs informations de mot de passe
        console.log('👥 VÉRIFICATION DES UTILISATEURS:');
        console.log('=================================');
        
        const usersQuery = `
            SELECT 
                id,
                login,
                email,
                nom,
                prenom,
                password_hash,
                CASE 
                    WHEN password_hash IS NULL THEN '❌ AUCUN'
                    WHEN password_hash = '' THEN '❌ VIDE'
                    ELSE '✅ DÉFINI'
                END as password_status,
                LENGTH(password_hash) as password_length,
                created_at,
                updated_at
            FROM users 
            ORDER BY created_at DESC
        `;

        const usersResult = await client.query(usersQuery);
        
        if (usersResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé dans la base de données');
            return;
        }

        console.log(`📊 ${usersResult.rows.length} utilisateur(s) trouvé(s):\n`);

        usersResult.rows.forEach((user, index) => {
            console.log(`${index + 1}. 👤 ${user.nom} ${user.prenom} (${user.login})`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🔑 Mot de passe: ${user.password_status}`);
            if (user.password_hash) {
                console.log(`   📏 Longueur hash: ${user.password_length} caractères`);
            }
            console.log(`   📅 Créé: ${user.created_at}`);
            console.log(`   🔄 Modifié: ${user.updated_at}`);
            console.log('');
        });

        // Identifier les utilisateurs sans mot de passe
        const usersWithoutPassword = usersResult.rows.filter(user => !user.password_hash);
        
        if (usersWithoutPassword.length > 0) {
            console.log('⚠️  UTILISATEURS SANS MOT DE PASSE:');
            console.log('===================================');
            usersWithoutPassword.forEach(user => {
                console.log(`❌ ${user.nom} ${user.prenom} (${user.login}) - ${user.email}`);
            });
            console.log('');
        }

        // Vérifier la structure de la table users
        console.log('🔍 STRUCTURE DE LA TABLE USERS:');
        console.log('===============================');
        
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `;
        
        const structureResult = await client.query(structureQuery);
        structureResult.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
        });

        client.release();
        
        console.log('\n💡 RECOMMANDATIONS:');
        console.log('===================');
        if (usersWithoutPassword.length > 0) {
            console.log('1. Les utilisateurs sans mot de passe doivent en avoir un défini');
            console.log('2. Utilisez le script de réinitialisation de mot de passe');
            console.log('3. Ou créez un nouveau mot de passe pour ces utilisateurs');
        } else {
            console.log('✅ Tous les utilisateurs ont un mot de passe défini');
        }

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le diagnostic
diagnoseUserPasswordIssue().catch(console.error);




