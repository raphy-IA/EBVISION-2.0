const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const Client = require('../models/Client');
const Collaborateur = require('../models/Collaborateur');
const BusinessUnit = require('../models/BusinessUnit');
const OpportunityType = require('../models/OpportunityType');
const { authenticateToken } = require('../middleware/auth');

// GET /api/opportunities - Récupérer toutes les opportunités
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search, 
            statut, 
            client_id, 
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            search,
            statut,
            client_id,
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            sortBy,
            sortOrder
        };

        const result = await Opportunity.findAll(options);

        res.json({
            success: true,
            data: {
                opportunities: result.opportunities.map(opp => ({
                    id: opp.id,
                    nom: opp.nom,
                    description: opp.description,
                    client_id: opp.client_id,
                    client_nom: opp.client_nom,
                    client_email: opp.client_email,
                    collaborateur_id: opp.collaborateur_id,
                    collaborateur_nom: opp.collaborateur_nom,
                    collaborateur_prenom: opp.collaborateur_prenom,
                    business_unit_id: opp.business_unit_id,
                    business_unit_nom: opp.business_unit_nom,
                    business_unit_code: opp.business_unit_code,
                    opportunity_type_id: opp.opportunity_type_id,
                    opportunity_type_nom: opp.opportunity_type_nom,
                    opportunity_type_description: opp.opportunity_type_description,
                    statut: opp.statut,
                    type_opportunite: opp.type_opportunite,
                    source: opp.source,
                    probabilite: opp.probabilite,
                    montant_estime: opp.montant_estime,
                    devise: opp.devise,
                    date_fermeture_prevue: opp.date_fermeture_prevue,
                    date_fermeture_reelle: opp.date_fermeture_reelle,
                    etape_vente: opp.etape_vente,
                    notes: opp.notes,
                    created_at: opp.created_at,
                    updated_at: opp.updated_at
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.total,
                    pages: Math.ceil(result.total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des opportunités:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des opportunités'
        });
    }
});

// GET /api/opportunities/:id - Récupérer une opportunité par ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);
        
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        // Récupérer les étapes de l'opportunité
        const stages = await opportunity.getStages();
        const stageStats = await opportunity.getStageStats();

        res.json({
            success: true,
            data: {
                opportunity: {
                    id: opportunity.id,
                    nom: opportunity.nom,
                    description: opportunity.description,
                    client_id: opportunity.client_id,
                    client_nom: opportunity.client_nom,
                    client_email: opportunity.client_email,
                    client_telephone: opportunity.client_telephone,
                    collaborateur_id: opportunity.collaborateur_id,
                    collaborateur_nom: opportunity.collaborateur_nom,
                    collaborateur_prenom: opportunity.collaborateur_prenom,
                    collaborateur_email: opportunity.collaborateur_email,
                    business_unit_id: opportunity.business_unit_id,
                    business_unit_nom: opportunity.business_unit_nom,
                    business_unit_code: opportunity.business_unit_code,
                    opportunity_type_id: opportunity.opportunity_type_id,
                    opportunity_type_nom: opportunity.opportunity_type_nom,
                    opportunity_type_description: opportunity.opportunity_type_description,
                    statut: opportunity.statut,
                    type_opportunite: opportunity.type_opportunite,
                    source: opportunity.source,
                    probabilite: opportunity.probabilite,
                    montant_estime: opportunity.montant_estime,
                    devise: opportunity.devise,
                    date_fermeture_prevue: opportunity.date_fermeture_prevue,
                    date_fermeture_reelle: opportunity.date_fermeture_reelle,
                    etape_vente: opportunity.etape_vente,
                    notes: opportunity.notes,
                    created_at: opportunity.created_at,
                    updated_at: opportunity.updated_at
                },
                stages: stages,
                stageStats: stageStats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'opportunité'
        });
    }
});

// POST /api/opportunities - Créer une nouvelle opportunité
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            nom,
            description,
            client_id,
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            statut,
            type_opportunite,
            source,
            probabilite,
            montant_estime,
            devise,
            date_fermeture_prevue,
            notes
        } = req.body;

        if (!nom) {
            return res.status(400).json({
                success: false,
                error: 'Le nom de l\'opportunité est obligatoire'
            });
        }

        if (!business_unit_id) {
            return res.status(400).json({
                success: false,
                error: 'La business unit est obligatoire'
            });
        }

        const opportunity = await Opportunity.create({
            nom,
            description,
            client_id,
            collaborateur_id,
            business_unit_id,
            opportunity_type_id,
            statut,
            source,
            probabilite,
            montant_estime,
            devise,
            date_fermeture_prevue,
            notes,
            created_by: req.user?.id || null
        });

        res.status(201).json({
            success: true,
            data: {
                opportunity: opportunity
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de l\'opportunité'
        });
    }
});

// PUT /api/opportunities/:id - Mettre à jour une opportunité
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);
        
        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        const updatedOpportunity = await opportunity.update({
            ...req.body,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            data: {
                opportunity: updatedOpportunity
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de l\'opportunité'
        });
    }
});

// DELETE /api/opportunities/:id - Supprimer une opportunité
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await Opportunity.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Opportunité non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Opportunité supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'opportunité'
        });
    }
});

// GET /api/opportunities/stats/overview - Statistiques générales
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const stats = await Opportunity.getStats();
        
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

// GET /api/opportunities/form-data - Données pour les formulaires
router.get('/form-data', authenticateToken, async (req, res) => {
    try {
        const [clients, collaborateurs, businessUnits, opportunityTypes] = await Promise.all([
            Client.findAll(),
            Collaborateur.findAll(),
            BusinessUnit.findAll(),
            OpportunityType.findAll()
        ]);

        res.json({
            success: true,
            data: {
                clients: clients,
                collaborateurs: collaborateurs,
                businessUnits: businessUnits,
                opportunityTypes: opportunityTypes
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données de formulaire:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des données de formulaire'
        });
    }
});

module.exports = router; 