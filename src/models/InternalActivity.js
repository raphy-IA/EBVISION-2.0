const { pool } = require('../utils/database');

class InternalActivity {
    // Récupérer toutes les activités internes
    static async findAll() {
        const query = `
            SELECT 
                ia.*,
                COUNT(DISTINCT iabu.business_unit_id) as business_units_count
            FROM internal_activities ia
            LEFT JOIN internal_activity_business_units iabu ON ia.id = iabu.internal_activity_id
            WHERE ia.is_active = true
            GROUP BY ia.id
            ORDER BY ia.name
        `;
        
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des activités internes:', error);
            throw error;
        }
    }

    // Récupérer une activité interne par ID
    static async findById(id) {
        const query = `
            SELECT 
                ia.*,
                json_agg(
                    json_build_object(
                        'id', bu.id,
                        'name', bu.nom,
                        'is_active', iabu.is_active
                    )
                ) as business_units
            FROM internal_activities ia
            LEFT JOIN internal_activity_business_units iabu ON ia.id = iabu.internal_activity_id
            LEFT JOIN business_units bu ON iabu.business_unit_id = bu.id
            WHERE ia.id = $1
            GROUP BY ia.id
        `;
        
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'activité interne:', error);
            throw error;
        }
    }

    // Créer une nouvelle activité interne
    static async create(activityData) {
        const { name, description } = activityData;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Insérer l'activité interne (sans heures estimées)
            const insertQuery = `
                INSERT INTO internal_activities (name, description)
                VALUES ($1, $2)
                RETURNING *
            `;
            const activityResult = await client.query(insertQuery, [name, description]);
            const activity = activityResult.rows[0];
            
            await client.query('COMMIT');
            return activity;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de la création de l\'activité interne:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Mettre à jour une activité interne
    static async update(id, activityData) {
        const { name, description } = activityData;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Mettre à jour l'activité interne
            const updateQuery = `
                UPDATE internal_activities 
                SET name = $1::text, description = $2::text, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3::uuid
                RETURNING *
            `;
            const activityResult = await client.query(updateQuery, [name, description, id]);
            const activity = activityResult.rows[0];
            
            await client.query('COMMIT');
            return activity;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de la mise à jour de l\'activité interne:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Supprimer une activité interne (soft delete)
    static async delete(id) {
        const query = `
            UPDATE internal_activities 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        
        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'activité interne:', error);
            throw error;
        }
    }

    // Récupérer les activités internes par business unit
    static async findByBusinessUnit(businessUnitId) {
        const query = `
            SELECT 
                ia.*,
                iabu.is_active as is_assigned
            FROM internal_activities ia
            INNER JOIN internal_activity_business_units iabu ON ia.id = iabu.internal_activity_id
            WHERE iabu.business_unit_id = $1 AND ia.is_active = true
            ORDER BY ia.name
        `;
        
        try {
            const result = await pool.query(query, [businessUnitId]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des activités internes par business unit:', error);
            throw error;
        }
    }

    // Récupérer les business units par activité interne
    static async getBusinessUnitsByActivity(activityId) {
        const query = `
            SELECT 
                bu.id,
                bu.nom,
                bu.description,
                bu.is_active,
                iabu.is_active as is_assigned
            FROM business_units bu
            INNER JOIN internal_activity_business_units iabu ON bu.id = iabu.business_unit_id
            WHERE iabu.internal_activity_id = $1
            ORDER BY bu.nom
        `;
        
        try {
            const result = await pool.query(query, [activityId]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des business units par activité:', error);
            throw error;
        }
    }

    // Affecter une activité interne à des business units
    static async assignToBusinessUnits(activityId, businessUnitIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Supprimer toutes les affectations existantes
            await client.query(
                'DELETE FROM internal_activity_business_units WHERE internal_activity_id = $1',
                [activityId]
            );
            
            // Ajouter les nouvelles affectations
            if (businessUnitIds && businessUnitIds.length > 0) {
                const linkQuery = `
                    INSERT INTO internal_activity_business_units (internal_activity_id, business_unit_id)
                    VALUES ($1, $2)
                `;
                
                for (const buId of businessUnitIds) {
                    await client.query(linkQuery, [activityId, buId]);
                }
            }
            
            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de l\'affectation aux business units:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Récupérer toutes les business units disponibles (pour l'affectation)
    static async getAvailableBusinessUnits() {
        const query = `
            SELECT id, nom, description
            FROM business_units
            WHERE is_active = true
            ORDER BY nom
        `;
        
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des business units disponibles:', error);
            throw error;
        }
    }
}

module.exports = InternalActivity; 