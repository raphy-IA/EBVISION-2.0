const express = require('express');
const FiscalYear = require('../models/FiscalYear');
const { fiscalYearValidation } = require('../utils/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Récupérer toutes les années fiscales
router.get('/', async (req, res) => {
    try {
        const result = await FiscalYear.findAll();

        res.json({
            success: true,
            message: 'Années fiscales récupérées avec succès',
            data: result.fiscalYears || []
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des années fiscales:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer les statistiques des années fiscales
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await FiscalYear.getGlobalStats();
        console.log('📊 Statistiques récupérées:', stats);

        res.json({
            success: true,
            message: 'Statistiques récupérées avec succès',
            data: {
                total: parseInt(stats.total_fiscal_years) || 0,
                en_cours: parseInt(stats.current_years) || 0,
                ouverts: parseInt(stats.open_years) || 0,
                fermes: parseInt(stats.closed_years) || 0,
                budget_total: parseFloat(stats.total_budget) || 0
            }
        });
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des statistiques:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

// Récupérer une année fiscale par ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fiscalYear = await FiscalYear.findById(id);

        if (!fiscalYear) {
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Année fiscale récupérée avec succès',
            data: fiscalYear
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'année fiscale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Créer une nouvelle année fiscale
router.post('/', authenticateToken, requirePermission('fiscal_years:create'), async (req, res) => {
    try {
        const { error, value } = fiscalYearValidation.create.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        const newFiscalYear = await FiscalYear.create(value);

        res.status(201).json({
            success: true,
            message: 'Année fiscale créée avec succès',
            data: newFiscalYear
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'année fiscale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Mettre à jour une année fiscale
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Début mise à jour année fiscale');
        const { id } = req.params;
        console.log('📝 ID:', id);
        console.log('📝 Body:', req.body);

        const { error, value } = fiscalYearValidation.update.validate(req.body);
        console.log('📝 Validation result:', { error, value });

        if (error) {
            console.log('❌ Erreur de validation:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        console.log('🔍 Recherche de l\'année fiscale...');
        const fiscalYear = await FiscalYear.findById(id);
        if (!fiscalYear) {
            console.log('❌ Année fiscale non trouvée');
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }
        console.log('✅ Année fiscale trouvée:', fiscalYear.libelle);

        console.log('🔍 Appel de update...');
        const updatedFiscalYear = await FiscalYear.update(id, value);
        console.log('✅ Update terminé:', updatedFiscalYear);

        res.json({
            success: true,
            message: 'Année fiscale mise à jour avec succès',
            data: updatedFiscalYear
        });

    } catch (error) {
        console.error('❌ Erreur détaillée lors de la mise à jour:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Supprimer une année fiscale
router.delete('/:id', authenticateToken, requirePermission('fiscal_years:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const fiscalYear = await FiscalYear.findById(id);

        if (!fiscalYear) {
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }

        await FiscalYear.delete(id);

        res.json({
            success: true,
            message: 'Année fiscale supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'année fiscale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Marquer une année fiscale comme en cours
router.put('/:id/set-as-current', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Début set-as-current pour ID:', req.params.id);
        const { id } = req.params;

        console.log('🔍 Recherche de l\'année fiscale...');
        const fiscalYear = await FiscalYear.findById(id);

        if (!fiscalYear) {
            console.log('❌ Année fiscale non trouvée');
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }

        console.log('✅ Année fiscale trouvée:', fiscalYear);
        console.log('🔍 Appel de setAsCurrent...');
        const updatedFiscalYear = await FiscalYear.setAsCurrent(id);
        console.log('✅ setAsCurrent terminé:', updatedFiscalYear);

        res.json({
            success: true,
            message: 'Année fiscale marquée comme en cours avec succès',
            data: updatedFiscalYear
        });

    } catch (error) {
        console.error('❌ Erreur détaillée lors du changement de statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

// Ouvrir une année fiscale
router.put('/:id/open', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const fiscalYear = await FiscalYear.findById(id);

        if (!fiscalYear) {
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }

        const updatedFiscalYear = await FiscalYear.open(id);

        res.json({
            success: true,
            message: 'Année fiscale ouverte avec succès',
            data: updatedFiscalYear
        });

    } catch (error) {
        console.error('Erreur lors du changement de statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Fermer une année fiscale
router.put('/:id/close', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const fiscalYear = await FiscalYear.findById(id);

        if (!fiscalYear) {
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }

        const updatedFiscalYear = await FiscalYear.close(id);

        res.json({
            success: true,
            message: 'Année fiscale fermée avec succès',
            data: updatedFiscalYear
        });

    } catch (error) {
        console.error('Erreur lors du changement de statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Recalculer le budget global
router.post('/:id/recalculate-budget', authenticateToken, requirePermission('fiscal_years:update'), async (req, res) => {
    try {
        const { id } = req.params;
        const fiscalYear = await FiscalYear.findById(id);

        if (!fiscalYear) {
            return res.status(404).json({
                success: false,
                message: 'Année fiscale non trouvée'
            });
        }

        const newBudget = await FiscalYear.calculateGlobalBudget(id);

        res.json({
            success: true,
            message: 'Budget global recalculé avec succès',
            data: { budget_global: newBudget }
        });

    } catch (error) {
        console.error('Erreur lors du recalcul du budget:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;