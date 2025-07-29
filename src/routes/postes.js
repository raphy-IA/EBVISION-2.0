const express = require('express');
const router = express.Router();
const Poste = require('../models/Poste');

// GET /api/postes - Liste des postes
router.get('/', async (req, res) => {
    try {
        const { page, limit, statut } = req.query;
        
        // Si pas de pagination spécifiée, retourner tous les postes
        const options = { statut };
        if (page && limit) {
            options.page = parseInt(page);
            options.limit = parseInt(limit);
        }
        
        const result = await Poste.findAll(options);
        
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des postes:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des postes',
            details: error.message 
        });
    }
});

// GET /api/postes/:id - Récupérer un poste par ID
router.get('/:id', async (req, res) => {
    try {
        const poste = await Poste.findById(req.params.id);
        
        if (!poste) {
            return res.status(404).json({
                success: false,
                error: 'Poste non trouvé',
                message: 'Le poste demandé n\'existe pas'
            });
        }
        
        res.json({
            success: true,
            data: poste
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du poste:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération du poste',
            details: error.message 
        });
    }
});

// POST /api/postes - Créer un nouveau poste
router.post('/', async (req, res) => {
    try {
        const poste = new Poste(req.body);
        const created = await Poste.create(poste);
        res.status(201).json({
            success: true,
            data: created,
            message: 'Poste créé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création du poste:', error);
        
        // Gérer spécifiquement l'erreur de contrainte unique
        if (error.message.includes('postes_code_key')) {
            return res.status(400).json({
                success: false,
                error: 'Code déjà utilisé',
                message: 'Ce code de poste existe déjà. Veuillez utiliser un code unique.',
                details: 'Le code doit être unique dans la base de données'
            });
        }
        
        // Gérer les autres erreurs de validation
        if (error.message.includes('Validation échouée')) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                message: error.message,
                details: 'Veuillez vérifier les données saisies'
            });
        }
        
        // Erreur générique
        res.status(400).json({ 
            success: false,
            error: 'Erreur lors de la création du poste',
            message: 'Une erreur est survenue lors de la création du poste',
            details: error.message 
        });
    }
});

// PUT /api/postes/:id - Mettre à jour un poste
router.put('/:id', async (req, res) => {
    try {
        const poste = await Poste.findById(req.params.id);
        
        if (!poste) {
            return res.status(404).json({
                success: false,
                error: 'Poste non trouvé',
                message: 'Le poste à modifier n\'existe pas'
            });
        }
        
        const updated = await poste.update(req.body);
        
        res.json({
            success: true,
            data: updated,
            message: 'Poste mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du poste:', error);
        
        // Gérer spécifiquement l'erreur de contrainte unique
        if (error.message.includes('postes_code_key')) {
            return res.status(400).json({
                success: false,
                error: 'Code déjà utilisé',
                message: 'Ce code de poste existe déjà. Veuillez utiliser un code unique.',
                details: 'Le code doit être unique dans la base de données'
            });
        }
        
        // Gérer les autres erreurs de validation
        if (error.message.includes('Validation échouée')) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                message: error.message,
                details: 'Veuillez vérifier les données saisies'
            });
        }
        
        res.status(400).json({ 
            success: false,
            error: 'Erreur lors de la mise à jour du poste',
            message: 'Une erreur est survenue lors de la mise à jour du poste',
            details: error.message 
        });
    }
});

// DELETE /api/postes/:id - Supprimer un poste
router.delete('/:id', async (req, res) => {
    try {
        const poste = await Poste.findById(req.params.id);
        
        if (!poste) {
            return res.status(404).json({
                success: false,
                error: 'Poste non trouvé',
                message: 'Le poste à supprimer n\'existe pas'
            });
        }
        
        // Vérifier s'il y a des collaborateurs avec ce poste
        const checkQuery = `
            SELECT COUNT(*) as count FROM collaborateurs 
            WHERE poste_actuel_id = $1
        `;
        const checkResult = await pool.query(checkQuery, [req.params.id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Poste utilisé',
                message: 'Impossible de supprimer ce poste car il est utilisé par des collaborateurs',
                details: 'Vous devez d\'abord réassigner les collaborateurs à un autre poste'
            });
        }
        
        await poste.delete();
        
        res.json({
            success: true,
            message: 'Poste supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du poste:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la suppression du poste',
            details: error.message 
        });
    }
});

// GET /api/postes/statistics - Statistiques des postes
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await Poste.getStatistics();
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message 
        });
    }
});

module.exports = router; 