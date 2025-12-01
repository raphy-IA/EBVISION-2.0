const { pool } = require('../src/utils/database');

async function seedObjectiveTypes() {
    console.log('🌱 Starting seed of objective types...');

    try {
        // 1. Fetch Unit IDs and Symbols
        console.log('🔍 Fetching unit IDs and symbols...');
        const unitsResult = await pool.query('SELECT id, code, type, symbol FROM objective_units');
        const units = {};
        unitsResult.rows.forEach(u => {
            units[u.code] = u; // Store full object
        });

        console.log('✅ Units found:', Object.keys(units).join(', '));

        // Helper to get unit object by code (or type fallback)
        const getUnit = (code) => {
            if (units[code]) return units[code];
            // Fallback mapping if codes differ in DB
            if (code === 'COUNT' && units['NUMBER']) return units['NUMBER'];
            if (code === 'CURRENCY' && units['EUR']) return units['EUR'];
            if (code === 'CURRENCY' && units['FCFA']) return units['FCFA'];
            return null;
        };

        // 2. Define Types to Insert
        const typesToInsert = [
            // --- OPPORTUNITIES ---
            {
                code: 'OPP_WON_COUNT',
                label: 'Opportunités Gagnées (Nombre)',
                category: 'commercial',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'OPPORTUNITY',
                operation: 'WON',
                value_field: 'id',
                description: 'Nombre d\'opportunités passées au statut "Gagnée"'
            },
            {
                code: 'OPP_WON_AMOUNT',
                label: 'CA Signé (Montant)',
                category: 'commercial',
                unit_code: 'CURRENCY',
                is_financial: true,
                entity_type: 'OPPORTUNITY',
                operation: 'WON',
                value_field: 'montant_estime',
                description: 'Somme des montants des opportunités gagnées'
            },
            {
                code: 'OPP_NEW_COUNT',
                label: 'Nouvelles Opportunités',
                category: 'commercial',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'OPPORTUNITY',
                operation: 'CREATED',
                value_field: 'id',
                description: 'Nombre d\'opportunités créées'
            },
            {
                code: 'OPP_LOST_COUNT',
                label: 'Opportunités Perdues',
                category: 'commercial',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'OPPORTUNITY',
                operation: 'LOST',
                value_field: 'id',
                description: 'Nombre d\'opportunités perdues'
            },

            // --- MISSIONS ---
            {
                code: 'MISS_START_COUNT',
                label: 'Missions Démarrées',
                category: 'operations',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'MISSION',
                operation: 'STARTED',
                value_field: 'id',
                description: 'Nombre de missions dont la date de début est atteinte'
            },
            {
                code: 'MISS_DONE_COUNT',
                label: 'Missions Terminées',
                category: 'operations',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'MISSION',
                operation: 'COMPLETED',
                value_field: 'id',
                description: 'Nombre de missions terminées'
            },
            {
                code: 'MISS_REVENUE',
                label: 'Revenu Missions',
                category: 'financial',
                unit_code: 'CURRENCY',
                is_financial: true,
                entity_type: 'MISSION',
                operation: 'COMPLETED',
                value_field: 'montant_total',
                description: 'Revenu total généré par les missions terminées'
            },

            // --- CLIENTS & INVOICES ---
            {
                code: 'CLIENT_NEW',
                label: 'Nouveaux Clients',
                category: 'commercial',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'CLIENT',
                operation: 'CREATED',
                value_field: 'id',
                description: 'Nombre de nouveaux clients créés'
            },
            {
                code: 'INV_SENT_COUNT',
                label: 'Factures Envoyées',
                category: 'financial',
                unit_code: 'COUNT',
                is_financial: false,
                entity_type: 'INVOICE',
                operation: 'SENT',
                value_field: 'id',
                description: 'Nombre de factures envoyées'
            },
            {
                code: 'INV_PAID_AMT',
                label: 'Encaissements (TTC)',
                category: 'financial',
                unit_code: 'CURRENCY',
                is_financial: true,
                entity_type: 'INVOICE',
                operation: 'PAID',
                value_field: 'montant_total',
                description: 'Montant total des factures payées'
            }
        ];

        // 3. Insert Loop
        console.log(`📝 Preparing to insert/update ${typesToInsert.length} types...`);

        for (const type of typesToInsert) {
            // Resolve Unit
            let unitObj = getUnit(type.unit_code);

            // Fallback logic
            if (!unitObj) {
                if (type.unit_code === 'COUNT') {
                    unitObj = unitsResult.rows.find(u => u.type === 'NUMBER' || u.type === 'COUNT' || u.code === 'NB');
                } else if (type.unit_code === 'CURRENCY') {
                    unitObj = unitsResult.rows.find(u => u.type === 'CURRENCY');
                }
            }

            if (!unitObj) {
                console.warn(`⚠️ Warning: Could not find unit for ${type.code} (requested: ${type.unit_code}). Skipping.`);
                continue;
            }

            // Upsert Query
            // NOTE: 'unit' column stores the SYMBOL or CODE (varchar 20), 'default_unit_id' stores the UUID
            const query = `
                INSERT INTO objective_types (
                    code, label, category, unit, default_unit_id, is_financial, 
                    entity_type, operation, value_field, description,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                ON CONFLICT (code) DO UPDATE SET
                    label = EXCLUDED.label,
                    category = EXCLUDED.category,
                    unit = EXCLUDED.unit,
                    default_unit_id = EXCLUDED.default_unit_id,
                    is_financial = EXCLUDED.is_financial,
                    entity_type = EXCLUDED.entity_type,
                    operation = EXCLUDED.operation,
                    value_field = EXCLUDED.value_field,
                    description = EXCLUDED.description,
                    updated_at = NOW()
                RETURNING id, code;
            `;

            const values = [
                type.code,
                type.label,
                type.category,
                unitObj.symbol || unitObj.code, // Use symbol if available, else code
                unitObj.id,                     // UUID
                type.is_financial,
                type.entity_type,
                type.operation,
                type.value_field,
                type.description
            ];

            try {
                const res = await pool.query(query, values);
                console.log(`✅ Processed: ${type.code} (ID: ${res.rows[0].id})`);
            } catch (err) {
                console.error(`❌ Error processing ${type.code}:`, err.message);
            }
        }

        console.log('🎉 Seed completed successfully!');

    } catch (error) {
        console.error('❌ Fatal error during seed:', error);
    } finally {
        await pool.end();
    }
}

seedObjectiveTypes();
