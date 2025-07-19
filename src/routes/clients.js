const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// Middleware d'authentification (à implémenter plus tard)
// const auth = require('../middleware/auth');

// GET /api/clients - Récupérer tous les clients avec pagination et filtres
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            statut,
            collaborateur_id,
            secteur_activite,
            search,
            sortBy = 'date_creation',
            sortOrder = 'DESC'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            statut,
            collaborateur_id,
            secteur_activite,
            search,
            sortBy,
            sortOrder
        };

        const result = await Client.findAll(options);
        
        res.json({
            success: true,
            data: result.clients,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des clients:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des clients',
            error: error.message
        });
    }
});

// GET /api/clients/statistics - Statistiques des clients
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await Client.getStatistics();
        
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

// GET /api/clients/:id - Récupérer un client par ID
router.get('/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client non trouvé'
            });
        }

        res.json({
            success: true,
            data: client
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du client:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du client',
            error: error.message
        });
    }
});

// GET /api/clients/:id/missions - Récupérer les missions d'un client
router.get('/:id/missions', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client non trouvé'
            });
        }

        const missions = await client.getMissions();
        
        res.json({
            success: true,
            data: missions
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des missions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des missions',
            error: error.message
        });
    }
});

// GET /api/clients/:id/opportunites - Récupérer les opportunités d'un client
router.get('/:id/opportunites', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client non trouvé'
            });
        }

        const opportunites = await client.getOpportunites();
        
        res.json({
            success: true,
            data: opportunites
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des opportunités:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des opportunités',
            error: error.message
        });
    }
});

// POST /api/clients - Créer un nouveau client
router.post('/', async (req, res) => {
    try {
        // Validation des données
        const errors = Client.validate(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors
            });
        }

        const clientData = {
            ...req.body,
            created_by: req.body.created_by || 'system' // À remplacer par l'ID de l'utilisateur connecté
        };

        const client = await Client.create(clientData);
        
        res.status(201).json({
            success: true,
            message: 'Client créé avec succès',
            data: client
        });
    } catch (error) {
        console.error('Erreur lors de la création du client:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du client',
            error: error.message
        });
    }
});

// PUT /api/clients/:id - Mettre à jour un client
router.put('/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client non trouvé'
            });
        }

        // Validation des données
        const errors = Client.validate(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors
            });
        }

        const updateData = {
            ...req.body,
            updated_by: req.body.updated_by || 'system' // À remplacer par l'ID de l'utilisateur connecté
        };

        const updatedClient = await client.update(updateData);
        
        res.json({
            success: true,
            message: 'Client mis à jour avec succès',
            data: updatedClient
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du client:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du client',
            error: error.message
        });
    }
});

// PATCH /api/clients/:id/statut - Changer le statut d'un client
router.patch('/:id/statut', async (req, res) => {
    try {
        const { statut } = req.body;
        
        if (!statut) {
            return res.status(400).json({
                success: false,
                message: 'Le nouveau statut est requis'
            });
        }

        const client = await Client.findById(req.params.id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client non trouvé'
            });
        }

        const updatedClient = await client.changeStatut(statut, req.body.updated_by || 'system');
        
        res.json({
            success: true,
            message: 'Statut du client mis à jour avec succès',
            data: updatedClient
        });
    } catch (error) {
        console.error('Erreur lors du changement de statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de statut',
            error: error.message
        });
    }
});

// DELETE /api/clients/:id - Supprimer un client
router.delete('/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client non trouvé'
            });
        }

        const deleted = await client.delete();
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Client supprimé avec succès'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression du client'
            });
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du client:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du client',
            error: error.message
        });
    }
});

// GET /api/clients/statut/:statut - Récupérer les clients par statut
router.get('/statut/:statut', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const result = await Client.getByStatut(req.params.statut, {
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        res.json({
            success: true,
            data: result.clients,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des clients par statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des clients',
            error: error.message
        });
    }
});

// GET /api/clients/search/:term - Rechercher des clients
router.get('/search/:term', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const result = await Client.search(req.params.term, {
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        res.json({
            success: true,
            data: result.clients,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des clients:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche des clients',
            error: error.message
        });
    }
});

module.exports = router; 