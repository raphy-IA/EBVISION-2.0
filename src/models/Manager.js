const { pool } = require('../utils/database');

/**
 * Modèle pour la gestion des responsables des Business Units et Divisions
 */
class Manager {
    
    /**
     * Obtenir les responsables d'une Business Unit
     */
    static async getBusinessUnitManagers(businessUnitId) {
        try {
            const result = await pool.query(`
                SELECT 
                    bu.id as business_unit_id,
                    bu.nom as business_unit_name,
                    principal.id as principal_id,
                    principal.nom as principal_nom,
                    principal.prenom as principal_prenom,
                    principal.email as principal_email,
                    adjoint.id as adjoint_id,
                    adjoint.nom as adjoint_nom,
                    adjoint.prenom as adjoint_prenom,
                    adjoint.email as adjoint_email
                FROM business_units bu
                LEFT JOIN collaborateurs principal ON bu.responsable_principal_id = principal.id
                LEFT JOIN collaborateurs adjoint ON bu.responsable_adjoint_id = adjoint.id
                WHERE bu.id = $1
            `, [businessUnitId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération des responsables BU:', error);
            throw error;
        }
    }
    
    /**
     * Obtenir les responsables d'une Division
     */
    static async getDivisionManagers(divisionId) {
        try {
            const result = await pool.query(`
                SELECT 
                    d.id as division_id,
                    d.nom as division_name,
                    d.business_unit_id,
                    bu.nom as business_unit_name,
                    principal.id as principal_id,
                    principal.nom as principal_nom,
                    principal.prenom as principal_prenom,
                    principal.email as principal_email,
                    adjoint.id as adjoint_id,
                    adjoint.nom as adjoint_nom,
                    adjoint.prenom as adjoint_prenom,
                    adjoint.email as adjoint_email
                FROM divisions d
                LEFT JOIN business_units bu ON d.business_unit_id = bu.id
                LEFT JOIN collaborateurs principal ON d.responsable_principal_id = principal.id
                LEFT JOIN collaborateurs adjoint ON d.responsable_adjoint_id = adjoint.id
                WHERE d.id = $1
            `, [divisionId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération des responsables Division:', error);
            throw error;
        }
    }
    
    /**
     * Définir les responsables d'une Business Unit
     */
    static async setBusinessUnitManagers(businessUnitId, principalId = null, adjointId = null) {
        try {
            const result = await pool.query(`
                UPDATE business_units 
                SET responsable_principal_id = $1, 
                    responsable_adjoint_id = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `, [principalId, adjointId, businessUnitId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la définition des responsables BU:', error);
            throw error;
        }
    }
    
    /**
     * Définir les responsables d'une Division
     */
    static async setDivisionManagers(divisionId, principalId = null, adjointId = null) {
        try {
            const result = await pool.query(`
                UPDATE divisions 
                SET responsable_principal_id = $1, 
                    responsable_adjoint_id = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `, [principalId, adjointId, divisionId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la définition des responsables Division:', error);
            throw error;
        }
    }
    
    /**
     * Obtenir tous les collaborateurs éligibles pour être responsables
     * (collaborateurs actifs d'une BU ou division donnée)
     */
    static async getEligibleManagers(businessUnitId = null, divisionId = null) {
        try {
            let whereClause = "WHERE c.statut = 'ACTIF'";
            let params = [];
            
            if (businessUnitId) {
                whereClause += " AND c.business_unit_id = $1";
                params.push(businessUnitId);
            }
            
            if (divisionId) {
                whereClause += ` AND c.division_id = $${params.length + 1}`;
                params.push(divisionId);
            }
            
            const result = await pool.query(`
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.email,
                    c.business_unit_id,
                    c.division_id,
                    bu.nom as business_unit_name,
                    d.nom as division_name,
                    g.nom as grade_name
                FROM collaborateurs c
                LEFT JOIN business_units bu ON c.business_unit_id = bu.id
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                ${whereClause}
                ORDER BY c.nom, c.prenom
            `, params);
            
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des collaborateurs éligibles:', error);
            throw error;
        }
    }
    
    /**
     * Vérifier si un collaborateur est responsable d'une BU
     */
    static async isBusinessUnitManager(collaborateurId, businessUnitId) {
        try {
            const result = await pool.query(`
                SELECT id 
                FROM business_units 
                WHERE id = $1 
                AND (responsable_principal_id = $2 OR responsable_adjoint_id = $2)
            `, [businessUnitId, collaborateurId]);
            
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors de la vérification responsable BU:', error);
            throw error;
        }
    }
    
    /**
     * Vérifier si un collaborateur est responsable d'une Division
     */
    static async isDivisionManager(collaborateurId, divisionId) {
        try {
            const result = await pool.query(`
                SELECT id 
                FROM divisions 
                WHERE id = $1 
                AND (responsable_principal_id = $2 OR responsable_adjoint_id = $2)
            `, [divisionId, collaborateurId]);
            
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur lors de la vérification responsable Division:', error);
            throw error;
        }
    }
    
    /**
     * Obtenir toutes les BU où un collaborateur est responsable
     */
    static async getBusinessUnitsWhereManagedBy(collaborateurId) {
        try {
            const result = await pool.query(`
                SELECT 
                    bu.id,
                    bu.nom,
                    bu.code,
                    CASE 
                        WHEN bu.responsable_principal_id = $1 THEN 'PRINCIPAL'
                        WHEN bu.responsable_adjoint_id = $1 THEN 'ADJOINT'
                    END as role
                FROM business_units bu
                WHERE bu.responsable_principal_id = $1 OR bu.responsable_adjoint_id = $1
                ORDER BY bu.nom
            `, [collaborateurId]);
            
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des BU gérées:', error);
            throw error;
        }
    }
    
    /**
     * Obtenir toutes les Divisions où un collaborateur est responsable
     */
    static async getDivisionsWhereManagedBy(collaborateurId) {
        try {
            const result = await pool.query(`
                SELECT 
                    d.id,
                    d.nom,
                    d.code,
                    d.business_unit_id,
                    bu.nom as business_unit_name,
                    CASE 
                        WHEN d.responsable_principal_id = $1 THEN 'PRINCIPAL'
                        WHEN d.responsable_adjoint_id = $1 THEN 'ADJOINT'
                    END as role
                FROM divisions d
                LEFT JOIN business_units bu ON d.business_unit_id = bu.id
                WHERE d.responsable_principal_id = $1 OR d.responsable_adjoint_id = $1
                ORDER BY bu.nom, d.nom
            `, [collaborateurId]);
            
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des Divisions gérées:', error);
            throw error;
        }
    }
    
    /**
     * Obtenir le responsable approprié pour une validation selon le niveau
     */
    static async getValidatorForCampaign(businessUnitId, divisionId, level) {
        try {
            if (level === 'DIVISION' && divisionId) {
                // Chercher d'abord le responsable principal de la division
                const divisionManagers = await this.getDivisionManagers(divisionId);
                if (divisionManagers && divisionManagers.principal_id) {
                    return {
                        id: divisionManagers.principal_id,
                        nom: divisionManagers.principal_nom,
                        prenom: divisionManagers.principal_prenom,
                        email: divisionManagers.principal_email,
                        type: 'DIVISION_PRINCIPAL'
                    };
                }
                // Si pas de responsable principal, chercher l'adjoint
                if (divisionManagers && divisionManagers.adjoint_id) {
                    return {
                        id: divisionManagers.adjoint_id,
                        nom: divisionManagers.adjoint_nom,
                        prenom: divisionManagers.adjoint_prenom,
                        email: divisionManagers.adjoint_email,
                        type: 'DIVISION_ADJOINT'
                    };
                }
            }
            
            if (level === 'BUSINESS_UNIT' && businessUnitId) {
                // Chercher le responsable principal de la BU
                const buManagers = await this.getBusinessUnitManagers(businessUnitId);
                if (buManagers && buManagers.principal_id) {
                    return {
                        id: buManagers.principal_id,
                        nom: buManagers.principal_nom,
                        prenom: buManagers.principal_prenom,
                        email: buManagers.principal_email,
                        type: 'BU_PRINCIPAL'
                    };
                }
                // Si pas de responsable principal, chercher l'adjoint
                if (buManagers && buManagers.adjoint_id) {
                    return {
                        id: buManagers.adjoint_id,
                        nom: buManagers.adjoint_nom,
                        prenom: buManagers.adjoint_prenom,
                        email: buManagers.adjoint_email,
                        type: 'BU_ADJOINT'
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lors de la recherche du validateur:', error);
            throw error;
        }
    }

    /**
     * Obtenir TOUS les validateurs (principal + adjoint) pour une campagne
     */
    static async getAllValidatorsForCampaign(businessUnitId, divisionId, level) {
        try {
            const validators = [];
            
            if (level === 'DIVISION' && divisionId) {
                // Récupérer les responsables de la division
                const divisionManagers = await this.getDivisionManagers(divisionId);
                
                if (divisionManagers && divisionManagers.principal_id) {
                    validators.push({
                        id: divisionManagers.principal_id,
                        nom: divisionManagers.principal_nom,
                        prenom: divisionManagers.principal_prenom,
                        email: divisionManagers.principal_email,
                        type: 'DIVISION_PRINCIPAL',
                        role: 'Responsable Principal'
                    });
                }
                
                if (divisionManagers && divisionManagers.adjoint_id) {
                    validators.push({
                        id: divisionManagers.adjoint_id,
                        nom: divisionManagers.adjoint_nom,
                        prenom: divisionManagers.adjoint_prenom,
                        email: divisionManagers.adjoint_email,
                        type: 'DIVISION_ADJOINT',
                        role: 'Responsable Adjoint'
                    });
                }
            }
            
            if (level === 'BUSINESS_UNIT' && businessUnitId) {
                // Récupérer les responsables de la BU
                const buManagers = await this.getBusinessUnitManagers(businessUnitId);
                
                if (buManagers && buManagers.principal_id) {
                    validators.push({
                        id: buManagers.principal_id,
                        nom: buManagers.principal_nom,
                        prenom: buManagers.principal_prenom,
                        email: buManagers.principal_email,
                        type: 'BU_PRINCIPAL',
                        role: 'Responsable Principal'
                    });
                }
                
                if (buManagers && buManagers.adjoint_id) {
                    validators.push({
                        id: buManagers.adjoint_id,
                        nom: buManagers.adjoint_nom,
                        prenom: buManagers.adjoint_prenom,
                        email: buManagers.adjoint_email,
                        type: 'BU_ADJOINT',
                        role: 'Responsable Adjoint'
                    });
                }
            }
            
            return validators;
        } catch (error) {
            console.error('Erreur lors de la recherche des validateurs:', error);
            throw error;
        }
    }
}

module.exports = Manager;




