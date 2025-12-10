const express = require('express');
const Division = require('../models/Division');
const BusinessUnit = require('../models/BusinessUnit');
const { divisionValidation } = require('../utils/validators');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Récupérer toutes les divisions
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 12, search = '', statut = '', business_unit_id = '' } = req.query;

        const result = await Division.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            statut,
            business_unit_id
        });

        res.json({
            success: true,
            message: 'Divisions récupérées avec succès',
            data: result.divisions,
            pagination: result.pagination
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

// Vérifier les dépendances d'une division (DOIT ÊTRE AVANT /:id)
router.get('/:id/dependencies', async (req, res) => {
    try {
        const { id } = req.params;
        const division = await Division.findById(id);

        if (!division) {
            return res.status(404).json({
                success: false,
                message: 'Division non trouvée'
            });
        }

        const dependencies = await Division.checkDependencies(id);
        const deps = dependencies.dependencies;
        const reasons = [];

        if (deps.active_collaborateurs > 0) reasons.push(`${deps.active_collaborateurs} collaborateur(s) actif(s)`);
        if (deps.prospecting_campaigns > 0) reasons.push(`${deps.prospecting_campaigns} campagne(s) de prospection`);
        if (deps.time_entries > 0) reasons.push(`${deps.time_entries} saisie(s) de temps`);
        if (deps.taux_horaires > 0) reasons.push(`${deps.taux_horaires} taux horaire(s) défini(s)`);

        res.json({
            success: true,
            data: {
                canDelete: dependencies.canDelete,
                reasons: reasons,
                dependencies: deps
            }
        });

    } catch (error) {
        console.error('Erreur lors de la vérification des dépendances:', error);
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
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;
        const forceDelete = force === 'true' || force === true;

        console.log(`[DELETE Division] ID: ${id}, Force: ${forceDelete} (raw: ${force})`);

        const division = await Division.findById(id);

        if (!division) {
            return res.status(404).json({
                success: false,
                message: 'Division non trouvée'
            });
        }

        // Vérifier les dépendances
        const dependencies = await Division.checkDependencies(id);
        const deps = dependencies.dependencies || {};

        if (!dependencies.canDelete && !forceDelete) {
            // Construire le message d'erreur détaillé
            const reasons = [];

            if (deps.active_collaborateurs > 0) reasons.push(`${deps.active_collaborateurs} collaborateur(s) actif(s)`);
            if (deps.prospecting_campaigns > 0) reasons.push(`${deps.prospecting_campaigns} campagne(s) de prospection`);
            if (deps.time_entries > 0) reasons.push(`${deps.time_entries} saisie(s) de temps`);
            if (deps.taux_horaires > 0) reasons.push(`${deps.taux_horaires} taux horaire(s) défini(s)`);

            return res.status(400).json({
                success: false,
                message: `Impossible de supprimer cette division car elle contient des données liées`,
                details: {
                    reasons: reasons,
                    dependencies: deps,
                    suggestion: 'Utilisez la désactivation au lieu de la suppression'
                }
            });
        }

        let result;
        if (dependencies.canDelete) {
            // Suppression définitive
            result = await Division.delete(id);
            res.json({
                success: true,
                message: 'Division supprimée définitivement avec succès',
                data: result,
                action: 'deleted'
            });
        } else {
            // Désactivation (force = true)
            console.log(`[DELETE Division] Deactivating division ${id}...`);
            result = await Division.deactivate(id);

            // Safer reasons construction
            const reasons = [];
            const safeDeps = dependencies.dependencies || {};

            if (safeDeps.active_collaborateurs > 0) reasons.push(`${safeDeps.active_collaborateurs} collaborateur(s) actif(s)`);
            if (safeDeps.prospecting_campaigns > 0) reasons.push(`${safeDeps.prospecting_campaigns} campagne(s) de prospection`);
            if (safeDeps.time_entries > 0) reasons.push(`${safeDeps.time_entries} saisie(s) de temps`);
            if (safeDeps.taux_horaires > 0) reasons.push(`${safeDeps.taux_horaires} taux horaire(s) défini(s)`);

            res.json({
                success: true,
                message: 'Division désactivée avec succès (des données liées existent)',
                data: result,
                action: 'deactivated',
                details: {
                    reasons: reasons,
                    dependencies: safeDeps
                }
            });
        }

    } catch (error) {
        console.error('Erreur lors de la suppression de la division:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

module.exports = router;