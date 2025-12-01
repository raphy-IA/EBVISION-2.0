// Configuration simplifiée des entités et opérations
// Basée sur l'analyse réelle des modèles de base de données

const ENTITY_OPERATIONS = {
    OPPORTUNITY: {
        label: 'Opportunité',
        table: 'opportunities',
        operations: {
            CREATED: { label: 'Créée', trackField: 'created_at' },
            WON: { label: 'Gagnée', trackField: 'date_fermeture_reelle', statusCondition: 'GAGNEE' },
            LOST: { label: 'Perdue', trackField: 'date_fermeture_reelle', statusCondition: 'PERDUE' }
        },
        // Champ principal pour chaque type d'unité
        defaultValueFields: {
            COUNT: 'id',              // Comptage = toujours l'ID
            CURRENCY: 'montant_estime' // Montant = montant estimé
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'collaborateur_id',
            business_unit: 'business_unit_id',
            client: 'client_id'
        }
    },
    MISSION: {
        label: 'Mission',
        table: 'missions',
        operations: {
            CREATED: { label: 'Créée', trackField: 'date_creation' },
            STARTED: { label: 'Démarrée', trackField: 'date_debut' },
            COMPLETED: { label: 'Terminée', trackField: 'date_fin_reelle' }
        },
        defaultValueFields: {
            COUNT: 'id',
            CURRENCY: 'montant_total'  // Revenu total
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'responsable_id',
            division: 'division_id',
            client: 'client_id'
        }
    },
    CLIENT: {
        label: 'Client',
        table: 'clients',
        operations: {
            CREATED: { label: 'Créé', trackField: 'created_at' },
            CONVERTED: { label: 'Converti', trackField: 'updated_at', statusCondition: 'CLIENT' }
        },
        defaultValueFields: {
            COUNT: 'id'
            // Pas de champ CURRENCY direct
        },
        contextFields: {
            creator: 'created_by',
            assignee: 'assigned_to'
        }
    },
    INVOICE: {
        label: 'Facture',
        table: 'invoices',
        operations: {
            CREATED: { label: 'Créée', trackField: 'created_at' },
            SENT: { label: 'Envoyée', trackField: 'date_envoi' },
            PAID: { label: 'Payée', trackField: 'date_paiement' }
        },
        defaultValueFields: {
            COUNT: 'id',
            CURRENCY: 'montant_total'  // Montant TTC
        },
        contextFields: {
            creator: 'created_by',
            client: 'client_id'
        }
    }
};

// Mapping simplifié : les types d'unités vers les types de données
const UNIT_TYPE_MAPPING = {
    // Tous ces types signifient "comptage"
    'COUNT': 'COUNT',
    'NUMBER': 'COUNT',
    'NUMERIC': 'COUNT',

    // Type monétaire
    'CURRENCY': 'CURRENCY',

    // Autres types
    'PERCENTAGE': 'PERCENTAGE',
    'DURATION': 'DURATION'
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
     * Obtenir le champ de valeur par défaut pour une entité et un type d'unité
     * NOUVELLE LOGIQUE SIMPLIFIÉE
     */
    getDefaultValueField(entityCode, unitType) {
        const entity = ENTITY_OPERATIONS[entityCode];
        if (!entity) return null;

        // Normaliser le type d'unité
        const normalizedType = UNIT_TYPE_MAPPING[unitType] || unitType;

        // Retourner le champ par défaut pour ce type
        const field = entity.defaultValueFields?.[normalizedType];

        if (field) {
            return {
                code: field,
                label: normalizedType === 'COUNT' ? 'Nombre' : 'Montant',
                isCount: normalizedType === 'COUNT',
                autoDetected: true
            };
        }

        return null;
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
     * Valider qu'une combinaison entité/opération/unité est valide
     * NOUVELLE LOGIQUE : Le champ de valeur est auto-détecté
     */
    validateConfiguration(entityCode, operation, unitType) {
        const entity = ENTITY_OPERATIONS[entityCode];
        if (!entity) return { valid: false, error: 'Entité inconnue' };

        if (!entity.operations[operation]) {
            return { valid: false, error: 'Opération invalide pour cette entité' };
        }

        // Normaliser le type d'unité
        const normalizedType = UNIT_TYPE_MAPPING[unitType] || unitType;

        // Vérifier qu'un champ par défaut existe pour ce type
        const hasDefaultField = entity.defaultValueFields?.[normalizedType];
        if (!hasDefaultField) {
            return {
                valid: false,
                error: `Aucun champ ${normalizedType} disponible pour cette entité`
            };
        }

        return { valid: true };
    }
};

// Export pour Node.js et Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ENTITY_OPERATIONS, EntityOperationsConfig, UNIT_TYPE_MAPPING };
} else {
    window.ENTITY_OPERATIONS = ENTITY_OPERATIONS;
    window.EntityOperationsConfig = EntityOperationsConfig;
    window.UNIT_TYPE_MAPPING = UNIT_TYPE_MAPPING;
}
