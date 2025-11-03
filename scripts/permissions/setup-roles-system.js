#!/usr/bin/env node

/**
 * Script pour configurer le système de rôles
 * Crée la table roles et insère les rôles de base
 * Usage: node scripts/setup-roles-system.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 CONFIGURATION DU SYSTÈME DE RÔLES');
console.log('=====================================\n');

async function setupRolesSystem() {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'eb_vision',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
    });

    try {
        console.log('📋 VÉRIFICATIONS PRÉLIMINAIRES:');
        
        // 1. Vérifier la connexion à la base de données
        console.log('🔄 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion à la base de données réussie');
        
        // 2. Vérifier si la table roles existe
        console.log('🔍 Vérification de l\'existence de la table roles...');
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `);
        
        const rolesTableExists = tableExists.rows[0].exists;
        console.log(`📊 Table roles existe: ${rolesTableExists}`);
        
        if (!rolesTableExists) {
            console.log('🔄 Création de la table roles...');
            
            // Lire et exécuter la migration
            const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '052_create_roles_table.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            await pool.query(migrationSQL);
            console.log('✅ Table roles créée avec succès');
        } else {
            console.log('✅ Table roles existe déjà');
        }
        
        // 3. Vérifier les rôles existants
        console.log('🔍 Vérification des rôles existants...');
        const rolesResult = await pool.query('SELECT COUNT(*) as count FROM roles');
        const rolesCount = parseInt(rolesResult.rows[0].count);
        console.log(`📊 Nombre de rôles: ${rolesCount}`);
        
        if (rolesCount === 0) {
            console.log('🔄 Insertion des rôles de base...');
            
            const baseRoles = [
                ['SUPER_ADMIN', 'Administrateur système avec tous les droits'],
                ['ADMIN_IT', 'Administrateur informatique'],
                ['IT', 'Technicien informatique'],
                ['ADMIN', 'Administrateur général'],
                ['MANAGER', 'Manager/Chef d\'équipe'],
                ['CONSULTANT', 'Consultant'],
                ['COLLABORATEUR', 'Collaborateur standard'],
                ['ASSOCIE', 'Associé'],
                ['DIRECTEUR', 'Directeur'],
                ['SUPER_USER', 'Super utilisateur']
            ];
            
            for (const [name, description] of baseRoles) {
                await pool.query(
                    'INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                    [name, description]
                );
            }
            
            console.log('✅ Rôles de base insérés');
        } else {
            console.log('✅ Rôles déjà présents');
        }
        
        // 4. Vérifier la table user_roles
        console.log('🔍 Vérification de la table user_roles...');
        const userRolesExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_roles'
            );
        `);
        
        if (!userRolesExists.rows[0].exists) {
            console.log('🔄 Création de la table user_roles...');
            await pool.query(`
                CREATE TABLE user_roles (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, role_id)
                );
            `);
            console.log('✅ Table user_roles créée');
        } else {
            console.log('✅ Table user_roles existe déjà');
        }
        
        // 5. Lister tous les rôles
        console.log('📋 Liste des rôles disponibles:');
        const allRoles = await pool.query('SELECT id, name, description FROM roles ORDER BY name');
        allRoles.rows.forEach(role => {
            console.log(`   ${role.id}. ${role.name} - ${role.description}`);
        });
        
        console.log('\n📊 RÉSUMÉ DE LA CONFIGURATION:');
        console.log('===============================');
        console.log('✅ Table roles créée/vérifiée');
        console.log('✅ Table user_roles créée/vérifiée');
        console.log('✅ Rôles de base insérés');
        console.log('✅ Système de rôles multiples opérationnel');
        
        console.log('\n🎯 PROCHAINES ÉTAPES:');
        console.log('1. ✅ Redémarrer le serveur');
        console.log('2. ✅ Tester l\'API /api/users/roles');
        console.log('3. ✅ Vérifier l\'affichage des rôles dans le modal');
        console.log('4. ✅ Créer des utilisateurs avec rôles multiples');
        
        console.log('\n🎉 Configuration terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la configuration:', error);
        console.error('💡 Vérifiez les paramètres de connexion à la base de données');
    } finally {
        await pool.end();
    }
}

setupRolesSystem().catch(console.error);










