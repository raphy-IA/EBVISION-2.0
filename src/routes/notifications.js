const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications - Récupérer les notifications de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, unread_only = false } = req.query;
        
        let notifications;
        if (unread_only === 'true') {
            // Récupérer seulement les notifications non lues
            const allNotifications = await NotificationService.getUserNotifications(req.user.id, 1000, 0);
            notifications = allNotifications.filter(n => !n.read_at).slice(offset, offset + parseInt(limit));
        } else {
            notifications = await NotificationService.getUserNotifications(req.user.id, parseInt(limit), parseInt(offset));
        }

        // Récupérer les statistiques
        const stats = await NotificationService.getNotificationStats(req.user.id);

        res.json({
            success: true,
            data: {
                notifications: notifications,
                stats: stats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des notifications'
        });
    }
});

// GET /api/notifications/stats - Récupérer les statistiques de notifications
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await NotificationService.getNotificationStats(req.user.id);
        
        res.json({
            success: true,
            data: {
                stats: stats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// PUT /api/notifications/:id/read - Marquer une notification comme lue
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification non trouvée'
            });
        }

        res.json({
            success: true,
            data: {
                notification: notification
            }
        });
    } catch (error) {
        console.error('Erreur lors du marquage de la notification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du marquage de la notification'
        });
    }
});

// PUT /api/notifications/read-all - Marquer toutes les notifications comme lues
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            UPDATE notifications 
            SET read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND read_at IS NULL
            RETURNING id
        `;

        const result = await pool.query(query, [req.user.id]);
        
        res.json({
            success: true,
            data: {
                updated_count: result.rows.length
            }
        });
    } catch (error) {
        console.error('Erreur lors du marquage de toutes les notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du marquage de toutes les notifications'
        });
    }
});

// DELETE /api/notifications/:id - Supprimer une notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notification = await NotificationService.deleteNotification(req.params.id, req.user.id);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Notification supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la notification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la notification'
        });
    }
});

// DELETE /api/notifications/clear-read - Supprimer toutes les notifications lues
router.delete('/clear-read', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        
        const query = `
            DELETE FROM notifications 
            WHERE user_id = $1 AND read_at IS NOT NULL
            RETURNING id
        `;

        const result = await pool.query(query, [req.user.id]);
        
        res.json({
            success: true,
            data: {
                deleted_count: result.rows.length
            }
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des notifications lues:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression des notifications lues'
        });
    }
});

module.exports = router; 