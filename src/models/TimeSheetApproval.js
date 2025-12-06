const { pool } = require('../utils/database');

class TimeSheetApproval {
    /**
     * Créer une approbation/rejet de feuille de temps
     */
    static async create(timeSheetId, supervisorUserId, action, comment = null) {
        const client = await pool.connect();
        try {
            // D'abord, récupérer le collaborateur_id du superviseur
            const supervisorResult = await client.query(`
                SELECT c.id as collaborateur_id
                FROM users u
                JOIN collaborateurs c ON u.id = c.user_id
                WHERE u.id = $1
            `, [supervisorUserId]);

            if (supervisorResult.rows.length === 0) {
                throw new Error('Superviseur non trouvé');
            }

            const supervisorCollaborateurId = supervisorResult.rows[0].collaborateur_id;

            // Démarrer une transaction
            await client.query('BEGIN');

            // Créer l'enregistrement d'approbation
            const approvalResult = await client.query(`
                INSERT INTO time_sheet_approvals (time_sheet_id, supervisor_id, action, comment)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [timeSheetId, supervisorCollaborateurId, action, comment]);

            // Mettre à jour le statut de la feuille de temps
            const statut = action === 'approve' ? 'validé' : 'rejeté';
            await client.query(`
                UPDATE time_sheets 
                SET statut = $1, updated_at = NOW()
                WHERE id = $2
            `, [statut, timeSheetId]);

            // NOTE: time_entries n'a pas de colonne status, donc on supprime cette synchronisation
            // Les entrées de temps héritent du statut de leur feuille parente

            // Valider la transaction
            await client.query('COMMIT');

            return approvalResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer l'historique des approbations d'une feuille de temps
     */
    static async getApprovalHistory(timeSheetId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    tsa.id,
                    tsa.action,
                    tsa.comment,
                    tsa.created_at,
                    c.nom,
                    c.prenom,
                    c.email
                FROM time_sheet_approvals tsa
                JOIN collaborateurs c ON tsa.supervisor_id = c.id
                WHERE tsa.time_sheet_id = $1
                ORDER BY tsa.created_at DESC
            `, [timeSheetId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Vérifier si une feuille de temps a été approuvée ou rejetée
     */
    static async getTimeSheetStatus(timeSheetId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    ts.statut,
                    ts.week_start,
                    ts.week_end,
                    u.nom as collaborateur_nom,
                    u.prenom as collaborateur_prenom,
                    u.email as collaborateur_email
                FROM time_sheets ts
                JOIN users u ON ts.user_id = u.id
                WHERE ts.id = $1
            `, [timeSheetId]);

            if (result.rows.length === 0) {
                return null;
            }

            const timeSheet = result.rows[0];

            // Récupérer l'historique des approbations
            const approvals = await this.getApprovalHistory(timeSheetId);

            return {
                ...timeSheet,
                approvals
            };
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer les feuilles de temps en attente d'approbation pour un superviseur
     */
    static async getPendingApprovals(supervisorUserId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    ts.id,
                    ts.week_start,
                    ts.week_end,
                    ts.statut,
                    ts.created_at,
                    ts.updated_at,
                    u.nom as collaborateur_nom,
                    u.prenom as collaborateur_prenom,
                    u.email as collaborateur_email
                FROM time_sheets ts
                JOIN users u ON ts.user_id = u.id
                JOIN collaborateurs c ON u.id = c.user_id
                JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
                JOIN collaborateurs supervisor_c ON supervisor_c.user_id = $1
                WHERE tss.supervisor_id = supervisor_c.id 
                AND ts.statut IN ('soumis', 'submitted')
                ORDER BY ts.week_start DESC, ts.created_at DESC
            `, [supervisorUserId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer toutes les feuilles de temps pour un superviseur (avec historique)
     */
    static async getAllTimeSheetsForSupervisor(supervisorUserId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    ts.id,
                    ts.week_start,
                    ts.week_end,
                    ts.statut,
                    ts.created_at,
                    ts.updated_at,
                    u.nom as collaborateur_nom,
                    u.prenom as collaborateur_prenom,
                    u.email as collaborateur_email,
                    -- Récupérer l'historique des approbations
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', tsa.id,
                                'action', tsa.action,
                                'comment', tsa.comment,
                                'created_at', tsa.created_at,
                                'approver_prenom', approver_u.prenom,
                                'approver_nom', approver_u.nom
                            ) ORDER BY tsa.created_at DESC
                        ) FILTER (WHERE tsa.id IS NOT NULL),
                        '[]'::json
                    ) as approvals_history
                FROM time_sheets ts
                JOIN users u ON ts.user_id = u.id
                JOIN collaborateurs c ON u.id = c.user_id
                JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
                JOIN collaborateurs supervisor_c ON supervisor_c.user_id = $1
                LEFT JOIN time_sheet_approvals tsa ON ts.id = tsa.time_sheet_id
                LEFT JOIN collaborateurs approver_c ON tsa.supervisor_id = approver_c.id
                LEFT JOIN users approver_u ON approver_c.user_id = approver_u.id
                WHERE tss.supervisor_id = supervisor_c.id 
                AND ts.statut IN ('soumis', 'validé', 'rejeté', 'submitted', 'approved', 'rejected')
                GROUP BY ts.id, ts.week_start, ts.week_end, ts.statut, ts.created_at, ts.updated_at,
                         u.nom, u.prenom, u.email
                ORDER BY ts.week_start DESC, ts.created_at DESC
            `, [supervisorUserId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Récupérer toutes les feuilles de temps soumises (pour les admins)
     */
    static async getAllSubmittedTimeSheets() {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    ts.id,
                    ts.week_start,
                    ts.week_end,
                    ts.statut,
                    ts.created_at,
                    ts.updated_at,
                    u.nom as collaborateur_nom,
                    u.prenom as collaborateur_prenom,
                    u.email as collaborateur_email
                FROM time_sheets ts
                JOIN users u ON ts.user_id = u.id
                WHERE ts.statut IN ('soumis', 'validé', 'rejeté', 'submitted', 'approved', 'rejected')
                ORDER BY ts.week_start DESC, ts.created_at DESC
            `);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Vérifier si un superviseur peut approuver une feuille de temps
     */
    static async canSupervisorApprove(timeSheetId, supervisorUserId) {
        const client = await pool.connect();
        try {
            console.log('🔍 canSupervisorApprove - Début de la vérification');
            console.log('  - timeSheetId:', timeSheetId);
            console.log('  - supervisorUserId:', supervisorUserId);

            // D'abord, récupérer le collaborateur_id du superviseur
            const supervisorResult = await client.query(`
                SELECT c.id as collaborateur_id
                FROM users u
                JOIN collaborateurs c ON u.id = c.user_id
                WHERE u.id = $1
            `, [supervisorUserId]);

            console.log('📊 Résultat recherche collaborateur superviseur:', supervisorResult.rows);

            if (supervisorResult.rows.length === 0) {
                console.log('❌ Aucun collaborateur trouvé pour le superviseur');
                return false;
            }

            const supervisorCollaborateurId = supervisorResult.rows[0].collaborateur_id;
            console.log('✅ collaborateur_id du superviseur:', supervisorCollaborateurId);

            const result = await client.query(`
                SELECT COUNT(*) as count
                FROM time_sheets ts
                JOIN users u ON ts.user_id = u.id
                JOIN collaborateurs c ON u.id = c.user_id
                JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
                WHERE ts.id = $1 
                AND tss.supervisor_id = $2
                AND ts.statut IN ('soumis', 'submitted')
            `, [timeSheetId, supervisorCollaborateurId]);

            console.log('📊 Résultat vérification autorisation:', result.rows);
            console.log('  - count:', result.rows[0].count);

            const canApprove = parseInt(result.rows[0].count) > 0;
            console.log(canApprove ? '✅ Superviseur AUTORISÉ' : '❌ Superviseur NON AUTORISÉ');

            return canApprove;
        } finally {
            client.release();
        }
    }

    /**
     * Soumettre une feuille de temps pour approbation
     */
    static async submit(timeSheetId, userId) {
        const client = await pool.connect();
        try {
            // Vérifier que l'utilisateur a des superviseurs configurés
            const supervisorsResult = await client.query(`
                SELECT COUNT(*) as count
                FROM users u
                JOIN collaborateurs c ON u.id = c.user_id
                JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
                WHERE u.id = $1
            `, [userId]);

            if (parseInt(supervisorsResult.rows[0].count) === 0) {
                throw new Error('Aucun superviseur configuré pour votre compte');
            }

            // Mettre à jour le statut de la feuille de temps
            const result = await client.query(`
                UPDATE time_sheets 
                SET statut = 'soumis', updated_at = NOW()
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `, [timeSheetId, userId]);

            if (result.rows.length === 0) {
                throw new Error('Feuille de temps non trouvée ou vous n\'êtes pas autorisé à la soumettre');
            }

            return result.rows[0];
        } finally {
            client.release();
        }
    }
}

module.exports = TimeSheetApproval; 