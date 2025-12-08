const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

/**
 * Script d'audit complet de la base de données
 * Vérifie la cohérence, les duplications, et l'utilisation des tables
 */

async function auditDatabase() {
    const client = await pool.connect();
    const results = {
        tables: [],
        duplicates: [],
        orphans: [],
        unusedTables: [],
        missingReferences: []
    };

    try {
        console.log('\n' + '='.repeat(80));
        console.log('📊 AUDIT COMPLET DE LA BASE DE DONNÉES');
        console.log('='.repeat(80) + '\n');

        // 1. Liste de toutes les tables
        console.log('1️⃣  INVENTAIRE DES TABLES\n');
        const tablesResult = await client.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        results.tables = tablesResult.rows;
        console.log(`   ✅ ${results.tables.length} tables trouvées\n`);

        // 2. Recherche de tables potentiellement dupliquées (noms similaires)
        console.log('2️⃣  RECHERCHE DE DUPLICATIONS POTENTIELLES\n');
        const tableNames = results.tables.map(t => t.tablename);
        const similarTables = new Map();

        tableNames.forEach(name => {
            // Normaliser le nom (enlever pluriel, tirets, etc.)
            const normalized = name
                .replace(/_/g, '')
                .replace(/-/g, '')
                .replace(/s$/, '')
                .toLowerCase();

            if (!similarTables.has(normalized)) {
                similarTables.set(normalized, []);
            }
            similarTables.get(normalized).push(name);
        });

        similarTables.forEach((tables, normalized) => {
            if (tables.length > 1) {
                results.duplicates.push({ normalized, tables });
                console.log(`   ⚠️  Tables similaires: ${tables.join(', ')}`);
            }
        });

        if (results.duplicates.length === 0) {
            console.log(`   ✅ Aucune duplication détectée\n`);
        } else {
            console.log(`   ⚠️  ${results.duplicates.length} groupes de tables similaires trouvés\n`);
        }

        // 3. Vérifier les tables référencées dans le code
        console.log('3️⃣  VÉRIFICATION DE L\'UTILISATION DES TABLES\n');

        // Chercher les fichiers du projet
        const projectRoot = path.join(__dirname, '../..');
        const codeReferences = new Map();

        // Scan des modèles
        const modelsDir = path.join(projectRoot, 'src/models');
        if (fs.existsSync(modelsDir)) {
            const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
            modelFiles.forEach(file => {
                const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
                tableNames.forEach(tableName => {
                    // Chercher "FROM table" ou "INTO table"
                    const regex = new RegExp(`(FROM|INTO|UPDATE|JOIN)\\s+["\`']?${tableName}["\`']?`, 'gi');
                    if (regex.test(content)) {
                        if (!codeReferences.has(tableName)) {
                            codeReferences.set(tableName, []);
                        }
                        codeReferences.get(tableName).push(`models/${file}`);
                    }
                });
            });
        }

        // Scan des routes
        const routesDir = path.join(projectRoot, 'src/routes');
        if (fs.existsSync(routesDir)) {
            const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
            routeFiles.forEach(file => {
                const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
                tableNames.forEach(tableName => {
                    const regex = new RegExp(`(FROM|INTO|UPDATE|JOIN)\\s+["\`']?${tableName}["\`']?`, 'gi');
                    if (regex.test(content)) {
                        if (!codeReferences.has(tableName)) {
                            codeReferences.set(tableName, []);
                        }
                        codeReferences.get(tableName).push(`routes/${file}`);
                    }
                });
            });
        }

        // Tables non référencées
        tableNames.forEach(tableName => {
            // Ignorer les tables système
            if (['schema_migrations', 'spatial_ref_sys'].includes(tableName)) {
                return;
            }

            if (!codeReferences.has(tableName)) {
                results.unusedTables.push(tableName);
            }
        });

        console.log(`   ✅ ${codeReferences.size} tables référencées dans le code`);
        if (results.unusedTables.length > 0) {
            console.log(`   ⚠️  ${results.unusedTables.length} tables potentiellement inutilisées:`);
            results.unusedTables.forEach(t => console.log(`      - ${t}`));
        }
        console.log();

        // 4. Vérifier les contraintes de clés étrangères
        console.log('4️⃣  VÉRIFICATION DES CLÉS ÉTRANGÈRES\n');
        const fkResult = await client.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name
        `);

        console.log(`   ✅ ${fkResult.rows.length} contraintes de clés étrangères trouvées`);

        // Vérifier les références vers des tables inexistantes
        fkResult.rows.forEach(fk => {
            if (!tableNames.includes(fk.foreign_table_name)) {
                results.missingReferences.push({
                    from: fk.table_name,
                    column: fk.column_name,
                    to: fk.foreign_table_name
                });
            }
        });

        if (results.missingReferences.length > 0) {
            console.log(`   ❌ ${results.missingReferences.length} références vers des tables inexistantes:`);
            results.missingReferences.forEach(ref => {
                console.log(`      ${ref.from}.${ref.column} → ${ref.to} (table introuvable)`);
            });
        } else {
            console.log(`   ✅ Toutes les références sont valides`);
        }
        console.log();

        // 5. Rapport final
        console.log('='.repeat(80));
        console.log('📋 RÉSUMÉ DE L\'AUDIT');
        console.log('='.repeat(80) + '\n');

        console.log(`📊 Statistiques:`);
        console.log(`   - Total de tables: ${results.tables.length}`);
        console.log(`   - Tables référencées dans le code: ${codeReferences.size}`);
        console.log(`   - Groupes de tables similaires: ${results.duplicates.length}`);
        console.log(`   - Tables potentiellement inutilisées: ${results.unusedTables.length}`);
        console.log(`   - Contraintes FK invalides: ${results.missingReferences.length}`);
        console.log();

        if (results.duplicates.length === 0 &&
            results.unusedTables.length === 0 &&
            results.missingReferences.length === 0) {
            console.log('✅ AUDIT RÉUSSI - Aucun problème détecté\n');
        } else {
            console.log('⚠️  ATTENTION - Quelques points nécessitent votre attention\n');
        }

        // Sauvegarder le rapport
        const reportPath = path.join(__dirname, '../../reports/database-audit.json');
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`📄 Rapport détaillé sauvegardé dans: ${reportPath}\n`);

    } catch (e) {
        console.error('❌ Erreur lors de l\'audit:', e.message);
        console.error(e.stack);
    } finally {
        client.release();
        pool.end();
    }
}

auditDatabase();
