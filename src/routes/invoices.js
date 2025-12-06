const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { authenticateToken } = require('../middleware/auth');
// Appliquer l'authentification réelle
router.use(authenticateToken);

const WORKFLOW_ROUTES = [
    { path: 'submit', method: 'submit', success: 'Facture soumise pour validation' },
    { path: 'validate', method: 'validate', success: 'Facture validée avec succès' },
    { path: 'approve', method: 'approve', success: 'Facture approuvée pour émission' },
    { path: 'reject', method: 'reject', success: 'Facture rejetée', bodyParams: ['reason'] },
    { path: 'emit', method: 'emit', success: 'Facture émise avec succès' }
];

WORKFLOW_ROUTES.forEach(route => {
    router.post(`/:id/workflow/${route.path}`, async (req, res) => {
        try {
            const invoice = await Invoice.findById(req.params.id);
            if (!invoice) return res.status(404).json({ success: false, error: 'Facture non trouvée' });

            // TODO: Ajouter vérification des permissions ici (ex: seul un Manager peut valider)

            const args = route.bodyParams ? route.bodyParams.map(p => req.body[p]) : [];
            await invoice[route.method](req.user.id, ...args);

            res.json({
                success: true,
                message: route.success,
                data: invoice
            });
        } catch (error) {
            console.error(`Erreur workflow ${route.path}:`, error);
            res.status(400).json({ success: false, error: error.message });
        }
    });
});

// GET /api/invoices - Liste des factures avec filtres et pagination
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            statut,
            client_id,
            mission_id,
            date_debut,
            date_fin,
            search,
            view // 'my_scope', 'action_needed', 'emitted', 'suggestions', 'all'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            statut,
            client_id,
            mission_id,
            date_debut,
            date_fin,
            search,
            view,
            user: req.user // Pass user for scoping
        };

        const result = await Invoice.findAll(options);
        // Debug léger: vérifier que BU/Division sont bien présents dans les objets renvoyés
        try {
            if (Array.isArray(result.invoices) && result.invoices.length > 0) {
                const sample = result.invoices.slice(0, 3).map(i => ({
                    id: i.id,
                    numero: i.numero_facture,
                    bu: i.business_unit_nom,
                    bu_id: i.business_unit_id,
                    division: i.division_nom,
                    division_id: i.division_id
                }));
                console.log('🧾 Aperçu factures BU/Division:', sample);
            }
        } catch (_) { }

        res.json({
            success: true,
            data: result.invoices,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des factures:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des factures'
        });
    }
});

// GET /api/invoices/stats - Statistiques de facturation
router.get('/stats', async (req, res) => {
    try {
        const stats = await Invoice.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// GET /api/invoices/overdue - Factures en retard
router.get('/overdue', async (req, res) => {
    try {
        const overdueInvoices = await Invoice.getOverdueInvoices();
        res.json({
            success: true,
            data: overdueInvoices
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des factures en retard:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des factures en retard'
        });
    }
});

// GET /api/invoices/:id - Détails d'une facture
router.get('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        // Récupérer les lignes de facture
        const items = await invoice.getItems();

        // Récupérer les paiements
        const payments = await invoice.getPayments();

        try {
            console.log('🧾 Détail facture BU/Division:', {
                id: invoice.id,
                numero: invoice.numero_facture,
                bu_id: invoice.business_unit_id,
                bu: invoice.business_unit_nom,
                division_id: invoice.division_id,
                division: invoice.division_nom
            });
        } catch (_) { }

        res.json({
            success: true,
            data: {
                ...invoice,
                items,
                payments
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la facture'
        });
    }
});

// POST /api/invoices - Créer une nouvelle facture
router.post('/', async (req, res) => {
    try {
        const invoiceData = {
            ...req.body,
            created_by: req.user.id
        };

        const invoice = await Invoice.create(invoiceData);

        res.status(201).json({
            success: true,
            data: invoice,
            message: 'Facture créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de la facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la facture'
        });
    }
});

// PUT /api/invoices/:id - Mettre à jour une facture
router.put('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        const updateData = {
            ...req.body,
            updated_by: req.user.id
        };

        const updatedInvoice = await invoice.update(updateData);

        res.json({
            success: true,
            data: updatedInvoice,
            message: 'Facture mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la facture'
        });
    }
});

// DELETE /api/invoices/:id - Supprimer une facture
router.delete('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        await invoice.delete();

        res.json({
            success: true,
            message: 'Facture supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la facture'
        });
    }
});

// POST /api/invoices/:id/generate-items - Générer les lignes de facture depuis la mission
router.post('/:id/generate-items', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        await invoice.generateItemsFromMission();

        // Récupérer les lignes générées
        const items = await invoice.getItems();

        res.json({
            success: true,
            data: items,
            message: 'Lignes de facture générées avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la génération des lignes de facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération des lignes de facture'
        });
    }
});

// POST /api/invoices/:id/items - Ajouter une ligne de facture
router.post('/:id/items', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        const item = await invoice.addItem(req.body);

        res.status(201).json({
            success: true,
            data: item,
            message: 'Ligne de facture ajoutée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la ligne de facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'ajout de la ligne de facture'
        });
    }
});

// PUT /api/invoices/:id/items/:itemId - Mettre à jour une ligne de facture
router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        // Mettre à jour la ligne de facture
        const query = `
            UPDATE invoice_items 
            SET 
                description = $1,
                quantite = $2,
                unite = $3,
                prix_unitaire = $4,
                taux_tva = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND invoice_id = $7
            RETURNING *
        `;

        const values = [
            req.body.description,
            req.body.quantite,
            req.body.unite,
            req.body.prix_unitaire,
            req.body.taux_tva,
            req.params.itemId,
            req.params.id
        ];

        const { pool } = require('../utils/database');
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ligne de facture non trouvée'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Ligne de facture mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la ligne de facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la ligne de facture'
        });
    }
});

// DELETE /api/invoices/:id/items/:itemId - Supprimer une ligne de facture
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        const deleted = await invoice.removeItem(req.params.itemId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Ligne de facture non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Ligne de facture supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la ligne de facture:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la ligne de facture'
        });
    }
});

// POST /api/invoices/:id/payments - Ajouter un paiement
router.post('/:id/payments', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        const paymentData = {
            ...req.body,
            created_by: req.user.id
        };

        const payment = await invoice.addPayment(paymentData);

        res.status(201).json({
            success: true,
            data: payment,
            message: 'Paiement ajouté avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du paiement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'ajout du paiement'
        });
    }
});

// PUT /api/invoices/:id/payments/:paymentId - Mettre à jour un paiement
router.put('/:id/payments/:paymentId', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        const payment = await invoice.updatePayment(req.params.paymentId, req.body);

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Paiement non trouvé'
            });
        }

        res.json({
            success: true,
            data: payment,
            message: 'Paiement mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du paiement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du paiement'
        });
    }
});

// DELETE /api/invoices/:id/payments/:paymentId - Supprimer un paiement
router.delete('/:id/payments/:paymentId', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Facture non trouvée'
            });
        }

        const deleted = await invoice.removePayment(req.params.paymentId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Paiement non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Paiement supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du paiement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du paiement'
        });
    }
});

// GET /api/missions/:missionId/invoices - Factures d'une mission
router.get('/mission/:missionId', async (req, res) => {
    try {
        const options = {
            ...req.query,
            mission_id: req.params.missionId
        };

        const result = await Invoice.findAll(options);

        res.json({
            success: true,
            data: result.invoices,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des factures de la mission:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des factures de la mission'
        });
    }
});

// =========================================================================
// WORKFLOW ROUTES
// =========================================================================

// PATCH /api/invoices/:id/workflow/submit
router.patch('/:id/workflow/submit', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, error: 'Facture non trouvée' });

        await invoice.submit(req.user.id);

        res.json({
            success: true,
            data: invoice,
            message: 'Facture soumise pour validation'
        });
    } catch (error) {
        console.error('Erreur workflow submit:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PATCH /api/invoices/:id/workflow/validate
router.patch('/:id/workflow/validate', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, error: 'Facture non trouvée' });

        await invoice.validate(req.user.id);

        res.json({
            success: true,
            data: invoice,
            message: 'Facture validée'
        });
    } catch (error) {
        console.error('Erreur workflow validate:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PATCH /api/invoices/:id/workflow/approve
router.patch('/:id/workflow/approve', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, error: 'Facture non trouvée' });

        await invoice.approve(req.user.id);

        res.json({
            success: true,
            data: invoice,
            message: 'Facture approuvée'
        });
    } catch (error) {
        console.error('Erreur workflow approve:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PATCH /api/invoices/:id/workflow/reject
router.patch('/:id/workflow/reject', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, error: 'Facture non trouvée' });

        const { reason } = req.body;
        await invoice.reject(req.user.id, reason);

        res.json({
            success: true,
            data: invoice,
            message: 'Facture rejetée'
        });
    } catch (error) {
        console.error('Erreur workflow reject:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// PATCH /api/invoices/:id/workflow/emit
router.patch('/:id/workflow/emit', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, error: 'Facture non trouvée' });

        await invoice.emit(req.user.id);

        res.json({
            success: true,
            data: invoice,
            message: 'Facture émise avec succès'
        });
    } catch (error) {
        console.error('Erreur workflow emit:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router; 