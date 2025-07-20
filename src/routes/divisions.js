const express = require('express');
const Division = require('../models/Division');
const BusinessUnit = require('../models/BusinessUnit');
const { divisionValidation } = require('../utils/validators');

const router = express.Router();

// Récupérer toutes les divisions
router.get('/', async (req, res) => {
    try {
        const divisions = await Division.findAll();

        res.json({
            success: true,
            message: 'Divisions récupérées avec succès',
            data: divisions
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des divisions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Statistiques des divisions (DOIT ÊTRE AVANT /:id)
router.get('/statistics', async (req, res) => {
    try {
        const globalStats = await Division.getGlobalStats();
        const divisions = await Division.findAll();
        
        const statistics = {
            ...globalStats,
            divisions_list: divisions.divisions.map(d => ({
                id: d.id,
                nom: d.nom,
                code: d.code,
                statut: d.statut
            }))
        };

        res.json({
            success: true,
            data: statistics
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des divisions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer une division par ID (DOIT ÊTRE APRÈS /statistics)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const division = await Division.findById(id);

        if (!division) {
            return res.status(404).json({
                success: false,
                message: 'Division non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Division récupérée avec succès',
            data: division
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la division:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Créer une nouvelle division
router.post('/', async (req, res) => {
    try {
        const { error, value } = divisionValidation.create.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Vérifier si la business unit existe
        const businessUnit = await BusinessUnit.findById(value.business_unit_id);
        if (!businessUnit) {
            return res.status(400).json({
                success: false,
                message: 'Business unit non trouvée'
            });
        }

        // Vérifier si le code existe déjà
        const existingDivision = await Division.findByCode(value.code);
        if (existingDivision) {
            return res.status(400).json({
                success: false,
                message: 'Une division avec ce code existe déjà'
            });
        }

        const newDivision = await Division.create(value);

        res.status(201).json({
            success: true,
            message: 'Division créée avec succès',
            data: newDivision
        });

    } catch (error) {
        console.error('Erreur lors de la création de la division:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Mettre à jour une division
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = divisionValidation.update.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        const division = await Division.findById(id);
        if (!division) {
            return res.status(404).json({
                success: false,
                message: 'Division non trouvée'
            });
        }

        const updatedDivision = await Division.update(id, value);

        res.json({
            success: true,
            message: 'Division mise à jour avec succès',
            data: updatedDivision
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la division:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Supprimer une division
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const division = await Division.findById(id);

        if (!division) {
            return res.status(404).json({
                success: false,
                message: 'Division non trouvée'
            });
        }

        await Division.delete(id);

        res.json({
            success: true,
            message: 'Division supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la division:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

module.exports = router; 