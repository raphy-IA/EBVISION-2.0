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
            WON: { label: 'Gagnée', trackField: 'date_fermeture_reelle' },
            LOST: { label: 'Perdue', trackField: 'date_fermeture_reelle' }
        },
        valueFields: {
            AMOUNT: { field: 'montant_estime', label: 'Montant Esti.' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'collaborateur_id',
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
            STARTED: { label: 'Démarrée', trackField: 'date_debut_reelle' },
            COMPLETED: { label: 'Terminée', trackField: 'date_fin_reelle' }
        },
        valueFields: {
            AMOUNT: { field: 'montant_honoraires', label: 'Honoraires' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            MARGIN: { field: 'montant_honoraires', label: 'Marge (Simulée)' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'collaborateur_id',
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
            SENT: { label: 'Envoyée', trackField: 'date_emission' },
            PAID: { label: 'Payée', trackField: 'date_dernier_paiement' }
        },
        valueFields: {
            AMOUNT: { field: 'montant_ht', label: 'Montant HT' },
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            TAX_AMOUNT: { field: 'montant_tva', label: 'Montant TVA' },
            NET_AMOUNT: { field: 'montant_ttc', label: 'Montant TTC' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'created_by',
            business_unit: 'business_unit_id',
            division: 'division_id'
        }
    },
    CLIENT: {
        label: 'Client',
        table: 'clients',
        operations: {
            CREATED: { label: 'Créé', trackField: 'created_at' },
            UPDATED: { label: 'Modifié', trackField: 'updated_at' }
        },
        valueFields: {
            COUNT: { field: 'id', label: 'Nombre', countMode: true },
            ANNUAL_REVENUE: { field: 'chiffre_affaires', label: 'CA Annuel' }
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'collaborateur_id',
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
     * Obtenir le champ de valeur par défaut pour une entité et une unité
     * (Utilisé pour l'auto-sélection dans l'UI)
     */
    getDefaultValueField(entityCode, unitType) {
        const fields = this.getValueFields(entityCode, unitType);
        if (fields.length === 0) return null;
        return fields[0]; // Retourne le premier champ compatible par défaut
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
