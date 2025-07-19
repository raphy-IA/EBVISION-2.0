const express = require('express');
const { FiscalYear } = require('../models/FiscalYear');
const { validateFiscalYear } = require('../utils/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Récupérer toutes les années fiscales
router.get('/', authenticateToken, requirePermission('fiscal_years:read'), async (req, res) => {
    try {
        const fiscalYears = await FiscalYear.findAll();

        res.json({
            success: true,
            message: 'Années fiscales récupérées avec succès',
            data: fiscalYears
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des années fiscales:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer une année fiscale par ID
router.get('/:id', authenticateToken, requirePermission('fiscal_years:read'), async (req, res) => {
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
        const { error, value } = validateFiscalYear.create.validate(req.body);
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

module.exports = router; 