const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { pool } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware d'authentification (à implémenter plus tard)
// const auth = require('../middleware/auth');

// Fonction pour résoudre l'ID d'un pays par son nom
async function resolvePaysId(paysNom) {
    if (!paysNom) return null;

    try {
        const result = await pool.query(
            'SELECT id FROM pays WHERE nom = $1',
            [paysNom]
        );
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        console.error('Erreur lors de la résolution du pays:', error);
        return null;
    }
}

// Fonction pour résoudre l'ID d'un secteur par son nom
async function resolveSecteurId(secteurNom) {
    if (!secteurNom) return null;

    try {
        const result = await pool.query(
            'SELECT id FROM secteurs_activite WHERE nom = $1',
            [secteurNom]
        );
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        console.error('Erreur lors de la résolution du secteur:', error);
        return null;
    }
}

// Fonction pour résoudre l'ID d'un sous-secteur par son nom et secteur parent
async function resolveSousSecteurId(sousSecteurNom, secteurNom) {
    if (!sousSecteurNom || !secteurNom) return null;

    try {
        const result = await pool.query(
            `SELECT ss.id FROM sous_secteurs_activite ss
             JOIN secteurs_activite s ON ss.secteur_activite_id = s.id
             WHERE ss.nom = $1 AND s.nom = $2`,
            [sousSecteurNom, secteurNom]
        );
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        console.error('Erreur lors de la résolution du sous-secteur:', error);
        return null;
    }
}

// GET /api/clients/form-data - Récupérer les données pour les formulaires
router.get('/form-data', authenticateToken, async (req, res) => {
    try {
        // Récupérer les données depuis les nouvelles tables
        const [paysResult, secteursResult, sourcesResult, statutsResult, clientSecteursResult] = await Promise.all([
            pool.query('SELECT nom, code_pays, code_appel, devise FROM pays WHERE actif = true ORDER BY nom'),
            pool.query(`
                SELECT s.nom, s.code, s.couleur, s.icone, s.ordre,
                       array_agg(ss.nom ORDER BY ss.ordre) as sous_secteurs
                FROM secteurs_activite s
                LEFT JOIN sous_secteurs_activite ss ON s.id = ss.secteur_id AND ss.actif = true
                WHERE s.actif = true
                GROUP BY s.id, s.nom, s.code, s.couleur, s.icone, s.ordre
                ORDER BY s.ordre, s.nom
            `),
            pool.query('SELECT DISTINCT source_prospection FROM clients WHERE source_prospection IS NOT NULL ORDER BY source_prospection'),
            pool.query('SELECT DISTINCT statut FROM clients WHERE statut IS NOT NULL ORDER BY statut'),
            pool.query('SELECT DISTINCT secteur_activite FROM clients WHERE secteur_activite IS NOT NULL ORDER BY secteur_activite')
        ]);

        // Valeurs standardisées
        const formData = {
            pays: paysResult.rows.map(pays => ({
                nom: pays.nom,
                code: pays.code_pays,
                code_appel: pays.code_appel,
                devise: pays.devise
            })),
            secteurs: secteursResult.rows.map(secteur => ({
                nom: secteur.nom,
                code: secteur.code,
                couleur: secteur.couleur,
                icone: secteur.icone,
                sous_secteurs: secteur.sous_secteurs.filter(ss => ss !== null)
            })),
            sources_prospection: [
                'recommandation',
                'web',
                'salon',
                'réseau',
                'appel_froid',
                'emailing',
                'linkedin',
                'partenaire',
                'ancien_client',
                'prospection_terrain',
                'publicité',
                'média',
                'autre'
            ],
            statuts: [
                'ACTIF',
                'INACTIF',
                'ABANDONNE'
            ],
            types: [
                'PROSPECT',
                'CLIENT',
                'CLIENT_FIDELE'
            ],
            tailles_entreprise: [
                'TPE',
                'PME',
                'ETI',
                'GE'
            ],
            formes_juridiques: [
                'EI',
                'EIRL',
                'EURL',
                'SARL',
                'SAS',
                'SASU',
                'SA',
                'SCOP',
                'SCIC',
                'Association',
                'Fondation',
                'Autre'
            ],
            // Valeurs existantes dans la base
            sources_existantes: sourcesResult.rows.map(row => row.source_prospection),
            statuts_existants: statutsResult.rows.map(row => row.statut)
        };

        res.json({
            success: true,
            data: formData
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données de formulaire:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des données de formulaire',
            error: error.message
        });
    }
});

// GET /api/clients - Récupérer tous les clients avec pagination et filtres
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            statut,
            type,
            collaborateur_id,
            secteur_activite,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            statut,
            type, // Keep distinct from statut
            collaborateur_id,
            secteur_activite,
            search,
            sortBy,
            sortOrder
        };

        const result = await Client.findAll(options);

        res.json({
            success: true,
            data: {
                clients: result.clients
            },
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

        // Résoudre les IDs des pays, secteurs et sous-secteurs
        const [paysId, secteurId, sousSecteurId] = await Promise.all([
            resolvePaysId(req.body.pays),
            resolveSecteurId(req.body.secteur_activite),
            resolveSousSecteurId(req.body.sous_secteur_activite, req.body.secteur_activite)
        ]);

        const clientData = {
            ...req.body,
            pays_id: paysId,
            secteur_activite_id: secteurId,
            sous_secteur_activite_id: sousSecteurId,
            created_by: req.body.created_by || null // À remplacer par l'ID de l'utilisateur connecté
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

        // Résoudre les IDs des pays, secteurs et sous-secteurs
        const [paysId, secteurId, sousSecteurId] = await Promise.all([
            resolvePaysId(req.body.pays),
            resolveSecteurId(req.body.secteur_activite),
            resolveSousSecteurId(req.body.sous_secteur_activite, req.body.secteur_activite)
        ]);

        const updateData = {
            ...req.body,
            pays_id: paysId,
            secteur_activite_id: secteurId,
            sous_secteur_activite_id: sousSecteurId,
            updated_by: req.body.updated_by || null // À remplacer par l'ID de l'utilisateur connecté
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