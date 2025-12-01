// Configuration des entités et opérations pour le système d'objectifs
// Ce fichier définit toutes les entités de l'application, leurs opérations possibles,
// et les champs de valeur disponibles pour chaque type d'unité

const ENTITY_OPERATIONS = {
    OPPORTUNITY: {
        label: 'Opportunité',
        table: 'opportunities',
        operations: {
            CREATED: { label: 'Créée', trackField: 'created_at' },
            UPDATED: { label: 'Modifiée', trackField: 'updated_at' },
            DELETED: { label: 'Supprimée', trackField: 'deleted_at' },
            CONVERTED: { label: 'Convertie', trackField: 'converted_at' },
            WON: { label: 'Gagnée', trackField: 'won_at' },
            LOST: { label: 'Perdue', trackField: 'lost_at' }
        },
        valueFields: {
            AMOUNT: { field: 'amount', label: 'Montant' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            MARGIN: { field: 'margin', label: 'Marge' },
            EXPECTED_REVENUE: { field: 'expected_revenue', label: 'Revenu attendu' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'assigned_to',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    CAMPAIGN: {
        label: 'Campagne',
        table: 'campaigns',
        operations: {
            CREATED: { label: 'Créée', trackField: 'created_at' },
            UPDATED: { label: 'Modifiée', trackField: 'updated_at' },
            DELETED: { label: 'Supprimée', trackField: 'deleted_at' },
            LAUNCHED: { label: 'Lancée', trackField: 'launched_at' },
            COMPLETED: { label: 'Terminée', trackField: 'completed_at' }
        },
        valueFields: {
            AMOUNT: { field: 'budget', label: 'Budget' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            LEADS_COUNT: { field: 'leads_count', label: 'Nombre de leads' },
            CONVERSION_RATE: { field: 'conversion_rate', label: 'Taux de conversion' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'assigned_to',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    CUSTOMER: {
        label: 'Client',
        table: 'customers',
        operations: {
            CREATED: { label: 'Créé', trackField: 'created_at' },
            UPDATED: { label: 'Modifié', trackField: 'updated_at' },
            DELETED: { label: 'Supprimé', trackField: 'deleted_at' },
            CONVERTED: { label: 'Converti', trackField: 'converted_at' }
        },
        valueFields: {
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            LIFETIME_VALUE: { field: 'lifetime_value', label: 'Valeur à vie' },
            ANNUAL_REVENUE: { field: 'annual_revenue', label: 'CA annuel' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'account_manager_id',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    MISSION: {
        label: 'Mission',
        table: 'missions',
        operations: {
            CREATED: { label: 'Créée', trackField: 'created_at' },
            UPDATED: { label: 'Modifiée', trackField: 'updated_at' },
            DELETED: { label: 'Supprimée', trackField: 'deleted_at' },
            STARTED: { label: 'Démarrée', trackField: 'start_date' },
            COMPLETED: { label: 'Terminée', trackField: 'end_date' }
        },
        valueFields: {
            AMOUNT: { field: 'total_amount', label: 'Montant total' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            DURATION: { field: 'duration_days', label: 'Durée (jours)' },
            MARGIN: { field: 'margin', label: 'Marge' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'assigned_to',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    INVOICE: {
        label: 'Facture',
        table: 'invoices',
        operations: {
            CREATED: { label: 'Créée', trackField: 'created_at' },
            UPDATED: { label: 'Modifiée', trackField: 'updated_at' },
            DELETED: { label: 'Supprimée', trackField: 'deleted_at' },
            SENT: { label: 'Envoyée', trackField: 'sent_at' },
            PAID: { label: 'Payée', trackField: 'paid_at' }
        },
        valueFields: {
            AMOUNT: { field: 'total_amount', label: 'Montant total' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            TAX_AMOUNT: { field: 'tax_amount', label: 'Montant TVA' },
            NET_AMOUNT: { field: 'net_amount', label: 'Montant HT' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'assigned_to',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    EMPLOYEE: {
        label: 'Collaborateur',
        table: 'employees',
        operations: {
            CREATED: { label: 'Créé', trackField: 'created_at' },
            UPDATED: { label: 'Modifié', trackField: 'updated_at' },
            DELETED: { label: 'Supprimé', trackField: 'deleted_at' },
            HIRED: { label: 'Embauché', trackField: 'hire_date' },
            TERMINATED: { label: 'Parti', trackField: 'termination_date' }
        },
        valueFields: {
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            SALARY: { field: 'salary', label: 'Salaire' },
            COST: { field: 'total_cost', label: 'Coût total' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'manager_id',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    CONTRACT: {
        label: 'Contrat',
        table: 'contracts',
        operations: {
            CREATED: { label: 'Créé', trackField: 'created_at' },
            UPDATED: { label: 'Modifié', trackField: 'updated_at' },
            DELETED: { label: 'Supprimé', trackField: 'deleted_at' },
            SIGNED: { label: 'Signé', trackField: 'signed_at' },
            RENEWED: { label: 'Renouvelé', trackField: 'renewed_at' },
            TERMINATED: { label: 'Résilié', trackField: 'terminated_at' }
        },
        valueFields: {
            AMOUNT: { field: 'total_value', label: 'Valeur totale' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            ANNUAL_VALUE: { field: 'annual_value', label: 'Valeur annuelle' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'account_manager_id',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    }
};

// Mapping des unités vers les types de champs de valeur compatibles
const UNIT_VALUE_FIELD_MAPPING = {
    'CURRENCY': ['AMOUNT', 'MARGIN', 'EXPECTED_REVENUE', 'LIFETIME_VALUE', 'ANNUAL_REVENUE', 'TAX_AMOUNT', 'NET_AMOUNT', 'SALARY', 'COST', 'ANNUAL_VALUE'],
    'COUNT': ['COUNT', 'LEADS_COUNT'],
    'PERCENTAGE': ['CONVERSION_RATE'],
    'DURATION': ['DURATION']
};

// Helper functions
const EntityOperationsConfig = {
    /**
     * Obtenir toutes les entités disponibles
     */
    getEntities() {
        return Object.keys(ENTITY_OPERATIONS).map(key => ({
            code: key,
            label: ENTITY_OPERATIONS[key].label
        }));
    },

    /**
     * Obtenir les opérations disponibles pour une entité
     */
    getOperations(entityCode) {
        if (!ENTITY_OPERATIONS[entityCode]) return [];
        const ops = ENTITY_OPERATIONS[entityCode].operations;
        return Object.keys(ops).map(key => ({
            code: key,
            label: ops[key].label
        }));
    },

    /**
     * Obtenir les champs de valeur disponibles pour une entité et une unité
     */
    getValueFields(entityCode, unitType) {
        if (!ENTITY_OPERATIONS[entityCode]) return [];

        const fields = ENTITY_OPERATIONS[entityCode].valueFields;
        const compatibleFieldTypes = UNIT_VALUE_FIELD_MAPPING[unitType] || [];

        return Object.keys(fields)
            .filter(key => compatibleFieldTypes.includes(key))
            .map(key => ({
                code: fields[key].field,
                label: fields[key].label,
                isCount: fields[key].countMode || false
            }));
    },

    /**
     * Obtenir les champs de contexte (créateur, responsable, BU, division)
     */
    getContextFields(entityCode) {
        if (!ENTITY_OPERATIONS[entityCode]) return null;
        return ENTITY_OPERATIONS[entityCode].contextFields;
    },

    /**
     * Obtenir la configuration complète d'une entité
     */
    getEntityConfig(entityCode) {
        return ENTITY_OPERATIONS[entityCode] || null;
    },

    /**
     * Valider qu'une combinaison entité/opération/unité/champ est valide
     */
    validateConfiguration(entityCode, operation, unitType, valueField) {
        const entity = ENTITY_OPERATIONS[entityCode];
        if (!entity) return { valid: false, error: 'Entité inconnue' };

        if (!entity.operations[operation]) {
            return { valid: false, error: 'Opération invalide pour cette entité' };
        }

        const validFields = this.getValueFields(entityCode, unitType);
        if (!validFields.find(f => f.code === valueField)) {
            return { valid: false, error: 'Champ de valeur incompatible avec l\'unité' };
        }

        return { valid: true };
    }
};

// Export pour Node.js et Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ENTITY_OPERATIONS, EntityOperationsConfig, UNIT_VALUE_FIELD_MAPPING };
} else {
    window.ENTITY_OPERATIONS = ENTITY_OPERATIONS;
    window.EntityOperationsConfig = EntityOperationsConfig;
    window.UNIT_VALUE_FIELD_MAPPING = UNIT_VALUE_FIELD_MAPPING;
}
