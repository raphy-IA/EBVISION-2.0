const express = require('express');
const User = require('../models/User');
const { userValidation } = require('../utils/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Récupérer tous les utilisateurs (avec pagination)
router.get('/', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const result = await User.findAll({
            page,
            limit,
            search
        });

        res.json({
            success: true,
            message: 'Utilisateurs récupérés avec succès',
            data: result.users,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer les statistiques des utilisateurs (DOIT ÊTRE AVANT /:id)
router.get('/statistics', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const stats = await User.getStats();

        res.json({
            success: true,
            message: 'Statistiques récupérées avec succès',
            data: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer un utilisateur par ID (DOIT ÊTRE APRÈS /statistics)
router.get('/:id', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Utilisateur récupéré avec succès',
            data: user
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Créer un nouvel utilisateur
router.post('/', authenticateToken, requirePermission('users:create'), async (req, res) => {
    try {
        // Validation des données
        const { error, value } = userValidation.create.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Vérifier si l'email existe déjà
        const existingUser = await User.findByEmail(value.email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }



        // Créer l'utilisateur (le modèle User.create fait le hashage)
        const newUser = await User.create(value);

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: newUser
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Mettre à jour un utilisateur
router.put('/:id', authenticateToken, requirePermission('users:update'), async (req, res) => {
    try {
        const { id } = req.params;

        // Validation des données
        const { error, value } = userValidation.update.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Vérifier si l'utilisateur existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier si l'email existe déjà (sauf pour cet utilisateur)
        if (value.email && value.email !== existingUser.email) {
            const userWithEmail = await User.findByEmail(value.email);
            if (userWithEmail && userWithEmail.id !== id) {
                return res.status(400).json({
                    success: false,
                    message: 'Un utilisateur avec cet email existe déjà'
                });
            }
        }



        // Mettre à jour l'utilisateur
        const updatedUser = await User.update(id, value);

        res.json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Supprimer un utilisateur (soft delete)
router.delete('/:id', authenticateToken, requirePermission('users:delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier si l'utilisateur existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Soft delete (changer le statut à INACTIF)
        await User.delete(id);

        res.json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Récupérer les statistiques des utilisateurs
router.get('/stats/overview', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const stats = await User.getStats();

        res.json({
            success: true,
            message: 'Statistiques récupérées avec succès',
            data: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

module.exports = router; 