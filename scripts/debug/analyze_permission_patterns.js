const pool = require('../../src/utils/database').pool;

async function analyzePermissionPatterns() {
    try {
        console.log('🔍 Analyse des patterns de permissions...\n');

        // Récupérer toutes les permissions non-menu
        const query = `
            SELECT code, name, category
            FROM permissions
            WHERE NOT code LIKE 'menu.%'
            ORDER BY category, code;
        `;

        const result = await pool.query(query);

        console.log(`📊 Total permissions (hors menu): ${result.rows.length}\n`);

        // Analyser les patterns
        const patterns = {
            crud: [],      // Permissions avec pattern CRUD
            standalone: [], // Permissions sans pattern
            byCategory: {}
        };

        const crudActions = ['view', 'read', 'create', 'edit', 'update', 'delete', 'remove'];

        result.rows.forEach(perm => {
            // Extraire l'entité et l'action
            const match = perm.code.match(/^([^.:]+)[.:](.+)$/);

            if (match) {
                const [_, entity, action] = match;

                if (crudActions.includes(action)) {
                    patterns.crud.push({
                        entity,
                        action,
                        code: perm.code,
                        name: perm.name,
                        category: perm.category
                    });
                } else {
                    patterns.standalone.push(perm);
                }
            } else {
                patterns.standalone.push(perm);
            }

            // Grouper par catégorie
            if (!patterns.byCategory[perm.category]) {
                patterns.byCategory[perm.category] = [];
            }
            patterns.byCategory[perm.category].push(perm);
        });

        // Grouper les CRUD par entité
        const crudByEntity = {};
        patterns.crud.forEach(p => {
            if (!crudByEntity[p.entity]) {
                crudByEntity[p.entity] = {
                    entity: p.entity,
                    category: p.category,
                    actions: {}
                };
            }
            crudByEntity[p.entity].actions[p.action] = p;
        });

        console.log('📋 RÉSUMÉ DES PATTERNS\n');
        console.log(`✅ Permissions CRUD: ${patterns.crud.length}`);
        console.log(`   Entités avec CRUD: ${Object.keys(crudByEntity).length}`);
        console.log(`⚠️  Permissions standalone: ${patterns.standalone.length}\n`);

        console.log('📊 PAR CATÉGORIE:\n');
        Object.entries(patterns.byCategory).forEach(([cat, perms]) => {
            const crudCount = perms.filter(p => {
                const match = p.code.match(/^([^.:]+)[.:](.+)$/);
                return match && crudActions.includes(match[2]);
            }).length;

            console.log(`${cat}:`);
            console.log(`  Total: ${perms.length} | CRUD: ${crudCount} | Autres: ${perms.length - crudCount}`);
        });

        console.log('\n🔍 ENTITÉS AVEC CRUD COMPLET:\n');
        Object.values(crudByEntity).forEach(entity => {
            const actions = Object.keys(entity.actions).sort();
            if (actions.length >= 3) { // Au moins 3 actions CRUD
                console.log(`${entity.entity} [${entity.category}]:`);
                console.log(`  Actions: ${actions.join(', ')}`);
            }
        });

        console.log('\n⚠️  PERMISSIONS STANDALONE (exemples):\n');
        patterns.standalone.slice(0, 20).forEach(p => {
            console.log(`  - ${p.code} (${p.category})`);
        });

        if (patterns.standalone.length > 20) {
            console.log(`  ... et ${patterns.standalone.length - 20} autres`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

analyzePermissionPatterns();
