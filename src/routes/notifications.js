const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Récupérer les notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Pour le développement, retourner des notifications de test
        const notifications = [
            {
                id: 1,
                type: 'info',
                title: 'Bienvenue sur TRS Dashboard',
                message: 'Votre session a été initialisée avec succès',
                created_at: new Date().toISOString(),
                read_at: null,
                priority: 'NORMAL'
            },
            {
                id: 2,
                type: 'warning',
                title: 'Mise à jour disponible',
                message: 'Une nouvelle version de l\'application est disponible',
                created_at: new Date(Date.now() - 86400000).toISOString(), // 1 jour ago
                read_at: new Date(Date.now() - 3600000).toISOString(), // 1 heure ago
                priority: 'HIGH'
            },
            {
                id: 3,
                type: 'success',
                title: 'Tâche terminée',
                message: 'La mission "Audit Q1" a été marquée comme terminée',
                created_at: new Date(Date.now() - 172800000).toISOString(), // 2 jours ago
                read_at: null,
                priority: 'NORMAL'
            }
        ];

        // Filtrer selon la pagination
        const paginatedNotifications = notifications.slice(offset, offset + limit);

        res.json({
            success: true,
            message: 'Notifications récupérées avec succès',
            data: {
                notifications: paginatedNotifications,
                stats: {
                    total: notifications.length,
                    unread: notifications.filter(n => !n.read).length,
                    read: notifications.filter(n => n.read).length
                }
            },
            pagination: {
                total: notifications.length,
                limit,
                offset,
                hasMore: offset + limit < notifications.length
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer les statistiques des notifications
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Pour le développement, retourner des stats de test
        const stats = {
            total: 3,
            unread: 2,
            read: 1
        };

        res.json({
            success: true,
            message: 'Statistiques des notifications récupérées',
            data: {
                stats: {
                    total: stats.total,
                    unread_notifications: stats.unread,
                    read_notifications: stats.read
                }
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des stats des notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Marquer une notification comme lue
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Pour le développement, simuler la mise à jour
        console.log(`Notification ${id} marquée comme lue`);

        res.json({
            success: true,
            message: 'Notification marquée comme lue'
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la notification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

module.exports = router; 