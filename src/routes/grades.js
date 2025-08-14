const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const { authenticateToken, requireRole } = require('../middleware/auth');

// =====================================================
// ROUTES PUBLIQUES (lecture seule)
// =====================================================

// GET /api/grades - Liste des grades avec filtres
router.get('/', async (req, res) => {
    try {
        const filters = {
            division_id: req.query.division_id,
            statut: req.query.statut,
            niveau_min: req.query.niveau_min ? parseInt(req.query.niveau_min) : null,
            niveau_max: req.query.niveau_max ? parseInt(req.query.niveau_max) : null
        };

        const grades = await Grade.findAll(filters);
        
        res.json({
            success: true,
            data: grades.map(grade => grade.toJSON()),
            count: grades.length
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des grades:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des grades',
            error: error.message
        });
    }
});

// GET /api/grades/statistics - Statistiques des grades
router.get('/statistics', async (req, res) => {
    try {
        const stats = await Grade.getStatistics();
        const byDivision = await Grade.getGradesByDivision();
        
        res.json({
            success: true,
            data: {
                general: stats,
                byDivision: byDivision
            }
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

// GET /api/grades/hierarchy - Hiérarchie des grades avec statistiques
router.get('/hierarchy', async (req, res) => {
    try {
        const hierarchy = await Grade.getHierarchy();
        
        res.json({
            success: true,
            data: hierarchy
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la hiérarchie:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la hiérarchie',
            error: error.message
        });
    }
});

// GET /api/grades/code/:code - Recherche par code
router.get('/code/:code', async (req, res) => {
    try {
        const grade = await Grade.findByCode(req.params.code);
        
        if (!grade) {
            return res.status(404).json({
                success: false,
                message: 'Grade non trouvé'
            });
        }

        res.json({
            success: true,
            data: grade.toJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du grade par code:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du grade',
            error: error.message
        });
    }
});

// GET /api/grades/division/:divisionId - Grades par division
router.get('/division/:divisionId', async (req, res) => {
    try {
        const grades = await Grade.findByDivision(req.params.divisionId);
        
        res.json({
            success: true,
            data: grades.map(grade => grade.toJSON()),
            count: grades.length
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des grades par division:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des grades',
            error: error.message
        });
    }
});

// GET /api/grades/niveau/:niveau - Grades par niveau
router.get('/niveau/:niveau', async (req, res) => {
    try {
        const niveau = parseInt(req.params.niveau);
        if (isNaN(niveau) || niveau < 1 || niveau > 10) {
            return res.status(400).json({
                success: false,
                message: 'Le niveau doit être un nombre entre 1 et 10'
            });
        }

        const grades = await Grade.getGradesByNiveau(niveau);
        
        res.json({
            success: true,
            data: grades.map(grade => grade.toJSON()),
            count: grades.length
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des grades par niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des grades',
            error: error.message
        });
    }
});

// GET /api/grades/:id - Détails d'un grade
router.get('/:id', async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id);
        
        if (!grade) {
            return res.status(404).json({
                success: false,
                message: 'Grade non trouvé'
            });
        }

        res.json({
            success: true,
            data: grade.toJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du grade:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du grade',
            error: error.message
        });
    }
});

// =====================================================
// ROUTES PROTÉGÉES (authentification requise)
// =====================================================

// POST /api/grades - Créer un nouveau grade
router.post('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        // Validation des données
        const errors = Grade.validate(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors
            });
        }

        // Vérifier si le code existe déjà
        const exists = await Grade.exists(req.body.code);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Un grade avec ce code existe déjà'
            });
        }

        const grade = await Grade.create(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Grade créé avec succès',
            data: grade.toJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la création du grade:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du grade',
            error: error.message
        });
    }
});

// PUT /api/grades/:id - Modifier un grade
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id);
        
        if (!grade) {
            return res.status(404).json({
                success: false,
                message: 'Grade non trouvé'
            });
        }

        // Validation des données
        const errors = Grade.validate(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors
            });
        }

        // Vérifier si le code existe déjà (sauf pour ce grade)
        if (req.body.code && req.body.code !== grade.code) {
            const exists = await Grade.exists(req.body.code, grade.id);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: 'Un grade avec ce code existe déjà'
                });
            }
        }

        const updatedGrade = await grade.update(req.body);
        
        res.json({
            success: true,
            message: 'Grade modifié avec succès',
            data: updatedGrade.toJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la modification du grade:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la modification du grade',
            error: error.message
        });
    }
});

// DELETE /api/grades/:id - Supprimer un grade
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id);
        
        if (!grade) {
            return res.status(404).json({
                success: false,
                message: 'Grade non trouvé'
            });
        }

        // Vérifier s'il y a des collaborateurs avec ce grade (actuels)
        const collaborateurs = await require('../models/Collaborateur').findByGrade(grade.id);
        if (collaborateurs.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer ce grade car il est utilisé par des collaborateurs',
                data: { nb_collaborateurs: collaborateurs.length }
            });
        }

        // Vérifier si le grade a déjà été utilisé historiquement (évolutions de grade)
        const { pool } = require('../utils/database');
        const evo = await pool.query(
            `SELECT 1 FROM evolution_grades WHERE grade_id = $1 LIMIT 1`,
            [grade.id]
        );
        if (evo.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer ce grade car il a déjà été utilisé dans l\'historique (évolutions)',
                data: { historique: true }
            });
        }

        await grade.delete();
        
        res.json({
            success: true,
            message: 'Grade supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du grade:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du grade',
            error: error.message
        });
    }
});

// =====================================================
// ROUTES SPÉCIALISÉES
// =====================================================

// GET /api/grades/:id/taux-horaire - Obtenir le taux horaire d'un grade
router.get('/:id/taux-horaire', async (req, res) => {
    try {
        const { division_id } = req.query;
        const taux = await Grade.getTauxHoraireByGrade(req.params.id, division_id);
        
        if (taux === null) {
            return res.status(404).json({
                success: false,
                message: 'Grade non trouvé ou inactif'
            });
        }

        res.json({
            success: true,
            data: {
                grade_id: req.params.id,
                division_id: division_id,
                taux_horaire: taux
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du taux horaire:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du taux horaire',
            error: error.message
        });
    }
});

// POST /api/grades/:id/duplicate - Dupliquer un grade
router.post('/:id/duplicate', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const originalGrade = await Grade.findById(req.params.id);
        
        if (!originalGrade) {
            return res.status(404).json({
                success: false,
                message: 'Grade original non trouvé'
            });
        }

        const newCode = req.body.code || `${originalGrade.code}_COPY`;
        const exists = await Grade.exists(newCode);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Un grade avec ce code existe déjà'
            });
        }

        const gradeData = {
            nom: req.body.nom || `${originalGrade.nom} (Copie)`,
            code: newCode,
            division_id: req.body.division_id || originalGrade.division_id,
            taux_horaire_default: req.body.taux_horaire_default || originalGrade.taux_horaire_default,
            niveau: req.body.niveau || originalGrade.niveau,
            description: req.body.description || originalGrade.description,
            statut: 'ACTIF'
        };

        const newGrade = await Grade.create(gradeData);
        
        res.status(201).json({
            success: true,
            message: 'Grade dupliqué avec succès',
            data: newGrade.toJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la duplication du grade:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la duplication du grade',
            error: error.message
        });
    }
});

module.exports = router; 