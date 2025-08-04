const express = require('express');
const router = express.Router();
const TimeSheet = require('../models/TimeSheet');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/time-sheets
 * @desc    Récupérer toutes les feuilles de temps avec filtres
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            collaborateur_id,
            statut,
            semaine,
            annee,
            page = 1,
            limit = 50,
            search
        } = req.query;

        const options = {
            collaborateur_id,
            statut,
            semaine: semaine ? parseInt(semaine) : undefined,
            annee: annee ? parseInt(annee) : undefined,
            page: parseInt(page),
            limit: parseInt(limit),
            search
        };

        const result = await TimeSheet.findAll(options);

        res.json({
            success: true,
            data: result.timeSheets,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des feuilles de temps',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/time-sheets/:id
 * @desc    Récupérer une feuille de temps par ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const timeSheet = await TimeSheet.findById(id);

        if (!timeSheet) {
            return res.status(404).json({
                success: false,
                message: 'Feuille de temps non trouvée'
            });
        }

        res.json({
            success: true,
            data: timeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la feuille de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/time-sheets
 * @desc    Créer une nouvelle feuille de temps
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const timeSheetData = {
            collaborateur_id: req.body.collaborateur_id,
            semaine: req.body.semaine,
            annee: req.body.annee,
            statut: req.body.statut || 'BROUILLON',
            commentaire: req.body.commentaire
        };

        const timeSheet = await TimeSheet.create(timeSheetData);

        res.status(201).json({
            success: true,
            message: 'Feuille de temps créée avec succès',
            data: timeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la création de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la création de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/time-sheets/:id
 * @desc    Mettre à jour une feuille de temps
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const timeSheet = await TimeSheet.findById(id);

        if (!timeSheet) {
            return res.status(404).json({
                success: false,
                message: 'Feuille de temps non trouvée'
            });
        }

        const updateData = {
            statut: req.body.statut,
            commentaire: req.body.commentaire
        };

        // Supprimer les champs undefined
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const updatedTimeSheet = await timeSheet.update(updateData);

        res.json({
            success: true,
            message: 'Feuille de temps mise à jour avec succès',
            data: updatedTimeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la mise à jour de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/time-sheets/:id
 * @desc    Supprimer une feuille de temps
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TimeSheet.delete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Feuille de temps non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Feuille de temps supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la feuille de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/time-sheets/:id/submit
 * @desc    Soumettre une feuille de temps
 * @access  Private
 */
router.post('/:id/submit', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const timeSheet = await TimeSheet.findById(id);

        if (!timeSheet) {
            return res.status(404).json({
                success: false,
                message: 'Feuille de temps non trouvée'
            });
        }

        const submittedTimeSheet = await timeSheet.submit();

        res.json({
            success: true,
            message: 'Feuille de temps soumise avec succès',
            data: submittedTimeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la soumission de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la soumission de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/time-sheets/:id/validate
 * @desc    Valider une feuille de temps
 * @access  Private
 */
router.post('/:id/validate', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { commentaire } = req.body;
        const validateurId = req.user.id;

        const timeSheet = await TimeSheet.findById(id);

        if (!timeSheet) {
            return res.status(404).json({
                success: false,
                message: 'Feuille de temps non trouvée'
            });
        }

        const validatedTimeSheet = await timeSheet.validate(validateurId, commentaire);

        res.json({
            success: true,
            message: 'Feuille de temps validée avec succès',
            data: validatedTimeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la validation de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la validation de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/time-sheets/:id/reject
 * @desc    Rejeter une feuille de temps
 * @access  Private
 */
router.post('/:id/reject', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { commentaire } = req.body;
        const validateurId = req.user.id;

        if (!commentaire) {
            return res.status(400).json({
                success: false,
                message: 'Un commentaire est requis pour rejeter une feuille de temps'
            });
        }

        const timeSheet = await TimeSheet.findById(id);

        if (!timeSheet) {
            return res.status(404).json({
                success: false,
                message: 'Feuille de temps non trouvée'
            });
        }

        const rejectedTimeSheet = await timeSheet.reject(validateurId, commentaire);

        res.json({
            success: true,
            message: 'Feuille de temps rejetée',
            data: rejectedTimeSheet
        });
    } catch (error) {
        console.error('Erreur lors du rejet de la feuille de temps:', error);
        res.status(400).json({
            success: false,
            message: 'Erreur lors du rejet de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/time-sheets/collaborateur/:collaborateurId/week/:semaine/:annee
 * @desc    Récupérer ou créer une feuille de temps pour un collaborateur et une semaine
 * @access  Private
 */
router.get('/collaborateur/:collaborateurId/week/:semaine/:annee', auth, async (req, res) => {
    try {
        const { collaborateurId, semaine, annee } = req.params;
        
        const timeSheet = await TimeSheet.getOrCreate(
            collaborateurId,
            parseInt(semaine),
            parseInt(annee)
        );

        res.json({
            success: true,
            data: timeSheet
        });
    } catch (error) {
        console.error('Erreur lors de la récupération/création de la feuille de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la feuille de temps',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/time-sheets/statistics
 * @desc    Obtenir les statistiques des feuilles de temps
 * @access  Private
 */
router.get('/statistics', auth, async (req, res) => {
    try {
        const { annee } = req.query;
        const statistics = await TimeSheet.getStatistics({ annee });

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/time-sheets/overdue
 * @desc    Récupérer les feuilles de temps en retard
 * @access  Private
 */
router.get('/overdue', auth, async (req, res) => {
    try {
        const overdueTimeSheets = await TimeSheet.findOverdue();

        res.json({
            success: true,
            data: overdueTimeSheets
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles en retard:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des feuilles en retard',
            error: error.message
        });
    }
});

module.exports = router; 