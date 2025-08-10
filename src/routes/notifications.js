const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { pool } = require('../utils/database');

// Route pour récupérer toutes les notifications de l'utilisateur connecté
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        
        const notifications = await NotificationService.getUserNotifications(userId, parseInt(limit), parseInt(offset));
        
        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des notifications'
        });
    }
});

// Route pour récupérer les statistiques des notifications
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await NotificationService.getNotificationStats(userId);
        
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

// Route pour marquer une notification comme lue
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await NotificationService.markAsRead(id, userId);

        res.json({
            success: true,
            message: 'Notification marquée comme lue'
        });
    } catch (error) {
        console.error('Erreur lors du marquage de la notification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du marquage de la notification'
        });
    }
});

// Route pour supprimer une notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await NotificationService.deleteNotification(id, userId);

        res.json({
            success: true,
            message: 'Notification supprimée'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la notification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la notification'
        });
    }
});

// Route pour marquer toutes les notifications comme lues
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        await pool.query(`
            UPDATE notifications 
            SET read_at = CURRENT_TIMESTAMP 
            WHERE user_id = $1 AND read_at IS NULL
        `, [userId]);

        res.json({
            success: true,
            message: 'Toutes les notifications marquées comme lues'
        });
    } catch (error) {
        console.error('Erreur lors du marquage de toutes les notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du marquage de toutes les notifications'
        });
    }
});

module.exports = router; 