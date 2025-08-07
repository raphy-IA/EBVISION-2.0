const express = require('express');
const router = express.Router();
const TimeSheetApproval = require('../models/TimeSheetApproval');
const TimeSheetSupervisor = require('../models/TimeSheetSupervisor');
const { authenticateToken } = require('../middleware/auth');

/**
 * Soumettre une feuille de temps pour approbation
 * POST /api/time-sheet-approvals/:timeSheetId/submit
 */
router.post('/:timeSheetId/submit', authenticateToken, async (req, res) => {
    try {
        const { timeSheetId } = req.params;
        const userId = req.user.id;
        let supervisors; // Déclarer la variable ici pour qu'elle soit accessible plus tard
        
        console.log('🔍 Informations de la requête:');
        console.log('  - timeSheetId:', timeSheetId);
        console.log('  - userId:', userId);
        console.log('  - req.user:', req.user);

        // Vérifier que la feuille de temps appartient à l'utilisateur
        const { pool } = require('../utils/database');
        const client = await pool.connect();
        
        try {
            const timeSheetCheck = await client.query(`
                SELECT id, status, user_id 
                FROM time_sheets 
                WHERE id = $1
            `, [timeSheetId]);

            if (timeSheetCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Feuille de temps non trouvée' });
            }

            const timeSheet = timeSheetCheck.rows[0];

            // Vérifier que l'utilisateur est le propriétaire de la feuille
            console.log('🔍 Vérification de propriété:');
            console.log('  - timeSheet.user_id:', timeSheet.user_id);
            console.log('  - userId:', userId);
            console.log('  - Sont-ils égaux?', timeSheet.user_id === userId);
            if (timeSheet.user_id !== userId) {
                return res.status(403).json({ 
                    error: 'Vous n\'êtes pas autorisé à soumettre cette feuille de temps' 
                });
            }

            // Vérifier que la feuille peut être soumise
            const submittableStatuses = ['draft', 'saved', 'rejected'];
            if (!submittableStatuses.includes(timeSheet.status)) {
                return res.status(400).json({ 
                    error: 'Cette feuille de temps a déjà été soumise' 
                });
            }

            // Vérifier qu'il y a au moins un superviseur configuré
            console.log('🔍 Vérification des superviseurs pour userId:', userId);
            supervisors = await TimeSheetSupervisor.getSupervisorsForUser(userId);
            console.log('📊 Superviseurs trouvés:', supervisors.length);
            console.log('📋 Détail des superviseurs:', supervisors);
            if (supervisors.length === 0) {
                return res.status(400).json({ 
                    error: 'Aucun superviseur configuré pour votre compte' 
                });
            }

            // Mettre à jour le statut de la feuille de temps
            await client.query(`
                UPDATE time_sheets 
                SET status = 'submitted', updated_at = NOW()
                WHERE id = $1
            `, [timeSheetId]);

            // Réponse de succès
            res.json({
                message: 'Feuille de temps soumise avec succès',
                data: {
                    timeSheetId,
                    supervisors: supervisors.length,
                    status: 'submitted'
                }
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erreur lors de la soumission de la feuille de temps:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la soumission de la feuille de temps' 
        });
    }
});

/**
 * Approuver une feuille de temps
 * POST /api/time-sheet-approvals/:timeSheetId/approve
 */
router.post('/:timeSheetId/approve', authenticateToken, async (req, res) => {
    try {
        const { timeSheetId } = req.params;
        const { comment } = req.body;
        const supervisorId = req.user.id;

        // Vérifier que le superviseur peut approuver cette feuille
        const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, supervisorId);
        
        if (!canApprove) {
            return res.status(403).json({ 
                error: 'Vous n\'êtes pas autorisé à approuver cette feuille de temps' 
            });
        }

        // Créer l'approbation
        const approval = await TimeSheetApproval.create(timeSheetId, supervisorId, 'approve', comment);

        res.json({
            message: 'Feuille de temps approuvée avec succès',
            data: approval
        });

    } catch (error) {
        console.error('Erreur lors de l\'approbation de la feuille de temps:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'approbation de la feuille de temps' 
        });
    }
});

/**
 * Rejeter une feuille de temps
 * POST /api/time-sheet-approvals/:timeSheetId/reject
 */
router.post('/:timeSheetId/reject', authenticateToken, async (req, res) => {
    try {
        const { timeSheetId } = req.params;
        const { comment } = req.body;
        const supervisorId = req.user.id;

        if (!comment) {
            return res.status(400).json({ 
                error: 'Un commentaire est requis pour rejeter une feuille de temps' 
            });
        }

        // Vérifier que le superviseur peut rejeter cette feuille
        const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, supervisorId);
        
        if (!canApprove) {
            return res.status(403).json({ 
                error: 'Vous n\'êtes pas autorisé à rejeter cette feuille de temps' 
            });
        }

        // Créer le rejet
        const rejection = await TimeSheetApproval.create(timeSheetId, supervisorId, 'reject', comment);

        res.json({
            message: 'Feuille de temps rejetée',
            data: rejection
        });

    } catch (error) {
        console.error('Erreur lors du rejet de la feuille de temps:', error);
        res.status(500).json({ 
            error: 'Erreur lors du rejet de la feuille de temps' 
        });
    }
});

/**
 * Récupérer l'historique des approbations d'une feuille de temps
 * GET /api/time-sheet-approvals/:timeSheetId/history
 */
router.get('/:timeSheetId/history', authenticateToken, async (req, res) => {
    try {
        const { timeSheetId } = req.params;
        const history = await TimeSheetApproval.getApprovalHistory(timeSheetId);
        
        res.json({
            message: 'Historique des approbations récupéré avec succès',
            data: history
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération de l\'historique' 
        });
    }
});

/**
 * Récupérer le statut d'une feuille de temps
 * GET /api/time-sheet-approvals/:timeSheetId/status
 */
router.get('/:timeSheetId/status', authenticateToken, async (req, res) => {
    try {
        const { timeSheetId } = req.params;
        const status = await TimeSheetApproval.getTimeSheetStatus(timeSheetId);
        
        if (!status) {
            return res.status(404).json({ error: 'Feuille de temps non trouvée' });
        }
        
        res.json({
            message: 'Statut de la feuille de temps récupéré avec succès',
            data: status
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du statut:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du statut' 
        });
    }
});

/**
 * Récupérer les feuilles de temps en attente d'approbation pour un superviseur
 * GET /api/time-sheet-approvals/pending
 */
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        const supervisorId = req.user.id;
        const pendingApprovals = await TimeSheetApproval.getPendingApprovals(supervisorId);
        
        res.json({
            message: 'Feuilles en attente récupérées avec succès',
            data: pendingApprovals
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des feuilles en attente:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des feuilles en attente' 
        });
    }
});

/**
 * Récupérer toutes les feuilles de temps pour un superviseur (avec historique)
 * GET /api/time-sheet-approvals/all
 */
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const supervisorId = req.user.id;
        const allTimeSheets = await TimeSheetApproval.getAllTimeSheetsForSupervisor(supervisorId);
        
        res.json({
            message: 'Toutes les feuilles récupérées avec succès',
            data: allTimeSheets
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de toutes les feuilles:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération de toutes les feuilles' 
        });
    }
});

/**
 * Récupérer toutes les feuilles de temps soumises (pour les admins)
 * GET /api/time-sheet-approvals/all-submitted
 */
router.get('/all-submitted', authenticateToken, async (req, res) => {
    try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ 
                error: 'Accès réservé aux administrateurs' 
            });
        }

        const submittedTimeSheets = await TimeSheetApproval.getAllSubmittedTimeSheets();
        
        res.json({
            message: 'Toutes les feuilles soumises récupérées avec succès',
            data: submittedTimeSheets
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de toutes les feuilles soumises:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération de toutes les feuilles soumises' 
        });
    }
});

module.exports = router; 