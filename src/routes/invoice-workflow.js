const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// Appliquer l'authentification
router.use(authenticateToken);

/**
 * Helper: Récupérer les validateurs autorisés pour une facture
 * @param {UUID} invoiceId - ID de la facture
 * @returns {Array} Liste des user_ids autorisés à valider
 */
async function getAuthorizedValidators(invoiceId) {
    const query = `
        SELECT 
            m.associe_id,
            bu.responsable_principal_id,
            bu.responsable_adjoint_id
        FROM invoices i
        JOIN missions m ON i.mission_id = m.id
        JOIN business_units bu ON m.business_unit_id = bu.id
        WHERE i.id = $1
    `;

    const result = await pool.query(query, [invoiceId]);
    if (result.rows.length === 0) return [];

    const row = result.rows[0];
    return [
        row.associe_id,
        row.responsable_principal_id,
        row.responsable_adjoint_id
    ].filter(Boolean); // Enlever les nulls
}

/**
 * Helper: Vérifier si l'utilisateur a le rôle SENIOR_PARTNER
 */
async function isSeniorPartner(userId) {
    const query = `
        SELECT role FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 && result.rows[0].role === 'SENIOR_PARTNER';
}

/**
 * PATCH /api/invoices/:id/workflow/submit-validation
 * Soumettre une facture pour validation (BROUILLON → SOUMISE_VALIDATION)
 */
router.patch('/:id/workflow/submit-validation', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Vérifier que la facture existe et est en BROUILLON
        const invoiceQuery = `
            SELECT * FROM invoices WHERE id = $1
        `;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        if (invoice.workflow_status !== 'BROUILLON') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Impossible de soumettre une facture en statut ${invoice.workflow_status}`
            });
        }

        // Vérifier qu'il y a au moins une ligne de facture
        const itemsQuery = `
            SELECT COUNT(*) as count FROM invoice_items WHERE invoice_id = $1
        `;
        const itemsResult = await client.query(itemsQuery, [id]);

        if (parseInt(itemsResult.rows[0].count) === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'La facture doit contenir au moins une ligne'
            });
        }

        // Mettre à jour le statut
        const updateQuery = `
            UPDATE invoices
            SET 
                workflow_status = 'SOUMISE_VALIDATION',
                submitted_for_validation_at = CURRENT_TIMESTAMP,
                submitted_for_validation_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [req.user.id, id]);

        await client.query('COMMIT');

        // TODO: Créer notification pour les validateurs

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Facture soumise pour validation'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur soumission validation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PATCH /api/invoices/:id/workflow/validate
 * Valider une facture (SOUMISE_VALIDATION → VALIDEE → SOUMISE_EMISSION)
 */
router.patch('/:id/workflow/validate', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { notes } = req.body;

        await client.query('BEGIN');

        // Vérifier que la facture existe et est en SOUMISE_VALIDATION
        const invoiceQuery = `SELECT * FROM invoices WHERE id = $1`;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        if (invoice.workflow_status !== 'SOUMISE_VALIDATION') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Impossible de valider une facture en statut ${invoice.workflow_status}`
            });
        }

        // Vérifier que l'utilisateur est autorisé à valider
        const authorizedValidators = await getAuthorizedValidators(id);

        if (!authorizedValidators.includes(req.user.id)) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                error: 'Vous n\'êtes pas autorisé à valider cette facture'
            });
        }

        // Valider et passer automatiquement à SOUMISE_EMISSION
        const updateQuery = `
            UPDATE invoices
            SET 
                workflow_status = 'SOUMISE_EMISSION',
                validated_at = CURRENT_TIMESTAMP,
                validated_by = $1,
                validation_notes = $2,
                submitted_for_emission_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [req.user.id, notes, id]);

        await client.query('COMMIT');

        // TODO: Créer notification pour les Senior Partners

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Facture validée et soumise pour émission'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur validation facture:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PATCH /api/invoices/:id/workflow/reject
 * Rejeter une facture (retour à BROUILLON)
 */
router.patch('/:id/workflow/reject', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                error: 'La raison du rejet est obligatoire'
            });
        }

        await client.query('BEGIN');

        // Vérifier que la facture existe
        const invoiceQuery = `SELECT * FROM invoices WHERE id = $1`;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        // Vérifier que la facture est dans un statut rejetable
        const rejectableStatuses = ['SOUMISE_VALIDATION', 'SOUMISE_EMISSION'];
        if (!rejectableStatuses.includes(invoice.workflow_status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Impossible de rejeter une facture en statut ${invoice.workflow_status}`
            });
        }

        // Vérifier les permissions selon le statut
        if (invoice.workflow_status === 'SOUMISE_VALIDATION') {
            const authorizedValidators = await getAuthorizedValidators(id);
            if (!authorizedValidators.includes(req.user.id)) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    success: false,
                    error: 'Vous n\'êtes pas autorisé à rejeter cette facture'
                });
            }
        } else if (invoice.workflow_status === 'SOUMISE_EMISSION') {
            const isSP = await isSeniorPartner(req.user.id);
            if (!isSP) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    success: false,
                    error: 'Seul un Senior Partner peut rejeter une facture soumise pour émission'
                });
            }
        }

        // Rejeter la facture
        const updateQuery = `
            UPDATE invoices
            SET 
                workflow_status = 'BROUILLON',
                rejection_reason = $1,
                rejected_at = CURRENT_TIMESTAMP,
                rejected_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [rejection_reason, req.user.id, id]);

        await client.query('COMMIT');

        // TODO: Créer notification pour le créateur

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Facture rejetée'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur rejet facture:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PATCH /api/invoices/:id/workflow/validate-emission
 * Valider pour émission (SOUMISE_EMISSION → VALIDEE_EMISSION)
 */
router.patch('/:id/workflow/validate-emission', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { notes } = req.body;

        // Vérifier que l'utilisateur est Senior Partner
        const isSP = await isSeniorPartner(req.user.id);
        if (!isSP) {
            return res.status(403).json({
                success: false,
                error: 'Seul un Senior Partner peut valider une facture pour émission'
            });
        }

        await client.query('BEGIN');

        // Vérifier que la facture existe et est en SOUMISE_EMISSION
        const invoiceQuery = `SELECT * FROM invoices WHERE id = $1`;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        if (invoice.workflow_status !== 'SOUMISE_EMISSION') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Impossible de valider pour émission une facture en statut ${invoice.workflow_status}`
            });
        }

        // Valider pour émission
        const updateQuery = `
            UPDATE invoices
            SET 
                workflow_status = 'VALIDEE_EMISSION',
                emission_validated_at = CURRENT_TIMESTAMP,
                emission_validated_by = $1,
                emission_validation_notes = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [req.user.id, notes, id]);

        await client.query('COMMIT');

        // TODO: Créer notification pour le créateur

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Facture validée pour émission'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur validation émission:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PATCH /api/invoices/:id/workflow/emit
 * Émettre la facture (VALIDEE_EMISSION → EMISE)
 */
router.patch('/:id/workflow/emit', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Vérifier que la facture existe et est en VALIDEE_EMISSION
        const invoiceQuery = `SELECT * FROM invoices WHERE id = $1`;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        if (invoice.workflow_status !== 'VALIDEE_EMISSION') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Impossible d'émettre une facture en statut ${invoice.workflow_status}`
            });
        }

        // Émettre la facture
        const updateQuery = `
            UPDATE invoices
            SET 
                workflow_status = 'EMISE',
                emitted_at = CURRENT_TIMESTAMP,
                emitted_by = $1,
                statut = 'EMISE',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [req.user.id, id]);

        await client.query('COMMIT');

        // TODO: Générer le PDF final
        // TODO: Créer notification pour le client

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Facture émise avec succès'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur émission facture:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PATCH /api/invoices/:id/workflow/cancel
 * Annuler une facture (→ ANNULEE)
 */
router.patch('/:id/workflow/cancel', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { cancellation_reason } = req.body;

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                error: 'La raison de l\'annulation est obligatoire'
            });
        }

        // Vérifier que l'utilisateur est Admin ou Senior Partner
        const isSP = await isSeniorPartner(req.user.id);
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

        if (!isSP && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Seul un Admin ou Senior Partner peut annuler une facture'
            });
        }

        await client.query('BEGIN');

        // Vérifier que la facture existe
        const invoiceQuery = `SELECT * FROM invoices WHERE id = $1`;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        // Vérifier qu'il n'y a pas de paiements alloués
        const paymentsQuery = `
            SELECT COUNT(*) as count 
            FROM payment_allocations 
            WHERE invoice_id = $1
        `;
        const paymentsResult = await client.query(paymentsQuery, [id]);

        if (parseInt(paymentsResult.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Impossible d\'annuler une facture avec des paiements alloués. Veuillez d\'abord supprimer les allocations de paiement.'
            });
        }

        // Annuler la facture
        const updateQuery = `
            UPDATE invoices
            SET 
                workflow_status = 'ANNULEE',
                rejection_reason = $1,
                rejected_at = CURRENT_TIMESTAMP,
                rejected_by = $2,
                statut = 'ANNULEE',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [cancellation_reason, req.user.id, id]);

        await client.query('COMMIT');

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Facture annulée'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur annulation facture:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/invoices/:id/due-date
 * Modifier la date d'échéance
 */
router.put('/:id/due-date', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { date_echeance } = req.body;

        if (!date_echeance) {
            return res.status(400).json({
                success: false,
                error: 'La date d\'échéance est obligatoire'
            });
        }

        await client.query('BEGIN');

        // Vérifier que la facture existe
        const invoiceQuery = `SELECT * FROM invoices WHERE id = $1`;
        const invoiceResult = await client.query(invoiceQuery, [id]);

        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Facture introuvable'
            });
        }

        const invoice = invoiceResult.rows[0];

        // Vérifier que la facture est modifiable (BROUILLON ou SOUMISE_VALIDATION)
        const editableStatuses = ['BROUILLON', 'SOUMISE_VALIDATION'];
        if (!editableStatuses.includes(invoice.workflow_status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Impossible de modifier la date d'échéance d'une facture en statut ${invoice.workflow_status}`
            });
        }

        // Mettre à jour la date d'échéance
        const updateQuery = `
            UPDATE invoices
            SET 
                date_echeance = $1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $2
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [date_echeance, req.user.id, id]);

        await client.query('COMMIT');

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Date d\'échéance mise à jour'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur mise à jour date échéance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;
