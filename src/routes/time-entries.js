const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const TimeSheet = require('../models/TimeSheet');
const { authenticateToken } = require('../middleware/auth');

// ROUTES DE COMPATIBILITÉ POUR L'ANCIEN FRONTEND
// GET /api/time-entries - Récupérer les entrées d'un utilisateur (compatibilité)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, date, week_start, week_end, time_sheet_id } = req.query;
        const userId = user_id || req.user.id;

        let entries = [];

        if (time_sheet_id) {
            // Récupérer les entrées pour une feuille de temps spécifique
            console.log(`🔍 Récupération des entrées pour la feuille de temps: ${time_sheet_id}`);
            entries = await TimeEntry.findByTimeSheet(time_sheet_id);
            console.log(`✅ ${entries.length} entrées trouvées pour la feuille ${time_sheet_id}`);

            // Fallback de compatibilité : si aucune entrée directe n'est trouvée,
            // tenter de retrouver les entrées par utilisateur + période de la feuille.
            if (!entries.length) {
                try {
                    console.log('ℹ️ Aucune entrée directe trouvée pour cette feuille, tentative de fallback par période');
                    const timeSheet = await TimeSheet.findById(time_sheet_id);
                    if (timeSheet) {
                        const fallbackUserId = timeSheet.user_id;
                        const fallbackStart = timeSheet.week_start;
                        const fallbackEnd = timeSheet.week_end;

                        console.log('🔍 Fallback TimeSheet:', {
                            id: timeSheet.id,
                            user_id: fallbackUserId,
                            week_start: fallbackStart,
                            week_end: fallbackEnd
                        });

                        entries = await TimeEntry.findByUserAndPeriod(
                            fallbackUserId,
                            fallbackStart,
                            fallbackEnd
                        );

                        console.log(`✅ Fallback: ${entries.length} entrées trouvées pour l'utilisateur ${fallbackUserId} entre ${fallbackStart} et ${fallbackEnd}`);
                    } else {
                        console.log('ℹ️ Aucun time_sheet trouvé pour l\'ID fourni, aucun fallback possible');
                    }
                } catch (fallbackError) {
                    console.error('❌ Erreur lors du fallback par période pour time_sheet_id:', time_sheet_id, fallbackError);
                }
            }
        } else if (userId) {
            if (week_start && week_end) {
                // Récupérer les entrées pour une période spécifique
                entries = await TimeEntry.findByUserAndPeriod(userId, week_start, week_end);
            } else if (date) {
                // Récupérer les entrées pour une date spécifique
                const weekStart = new Date(date);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                entries = await TimeEntry.findByUserAndPeriod(userId, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]);
            } else {
                // Retourner un tableau vide pour la compatibilité
                entries = [];
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur ou ID feuille de temps requis'
            });
        }

        res.json({
            success: true,
            data: entries
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des entrées:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des entrées',
            error: error.message
        });
    }
});

// POST /api/time-entries - Créer une entrée (compatibilité)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            user_id,
            date_saisie,
            heures,
            mission_id,
            task_id,
            internal_activity_id,
            type_heures = 'HC',
            description
        } = req.body;

        // Validation des données
        if (!date_saisie || type_heures === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes'
            });
        }

        // Pour l'instant, accepter les UUIDs tronqués (compatibilité)
        // TODO: Corriger le frontend pour envoyer des UUIDs complets

        // Créer ou récupérer la feuille de temps pour cette semaine
        const weekStart = new Date(date_saisie);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi de la semaine

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Dimanche de la semaine

        let timeSheet = await TimeSheet.findOrCreate(
            userId,
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0]
        );

        // Créer l'entrée d'heures
        const timeEntryData = {
            time_sheet_id: timeSheet.id,
            user_id: userId,
            date_saisie,
            heures: parseFloat(heures) || 0,
            type_heures: type_heures, // Utiliser directement la valeur envoyée par le frontend
            mission_id: type_heures === 'HC' ? mission_id : null,
            task_id: type_heures === 'HC' ? task_id : null,
            internal_activity_id: type_heures === 'HNC' ? internal_activity_id : null,
            description: description || 'Saisie automatique'
        };

        const entry = await TimeEntry.findOrCreate(timeEntryData);

        res.json({
            success: true,
            message: entry ? 'Entrée créée avec succès' : 'Entrée supprimée (heures = 0)',
            data: entry
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'entrée de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'entrée de temps',
            error: error.message
        });
    }
});

// PUT /api/time-entries/:id - Mettre à jour une entrée existante
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { heures } = req.body;

        if (heures === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Heures requises'
            });
        }

        const updatedEntry = await TimeEntry.update(id, { heures: parseFloat(heures) || 0 });

        if (!updatedEntry) {
            return res.status(404).json({
                success: false,
                message: 'Entrée non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Entrée mise à jour avec succès',
            data: updatedEntry
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'entrée de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'entrée de temps',
            error: error.message
        });
    }
});

// DELETE /api/time-entries/delete-week - Supprimer toutes les entrées d'une semaine
router.delete('/delete-week', authenticateToken, async (req, res) => {
    try {
        const { user_id, week_start, week_end } = req.query;
        const userId = user_id || req.user.id;

        if (!userId || !week_start || !week_end) {
            return res.status(400).json({
                success: false,
                message: 'Paramètres manquants: user_id, week_start, week_end'
            });
        }

        // Vérifier que l'utilisateur demande la suppression de ses propres entrées
        // Comparaison avec conversion de type pour éviter les problèmes de string vs UUID
        if (user_id && user_id.toString() !== userId.toString()) {
            console.warn(`⚠️ Tentative de suppression d'entrées d'un autre utilisateur: ${user_id} !== ${userId}`);
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        // Supprimer toutes les entrées de la semaine pour cet utilisateur
        const deletedCount = await TimeEntry.deleteByUserAndPeriod(userId, week_start, week_end);

        res.json({
            success: true,
            message: `${deletedCount} entrée(s) supprimée(s) avec succès`,
            deletedCount
        });

    } catch (error) {
        console.error('Erreur lors de la suppression des entrées de la semaine:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression des entrées de la semaine',
            error: error.message
        });
    }
});

// DELETE /api/time-entries/:id - Supprimer une entrée individuelle
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Vérifier que l'entrée appartient à l'utilisateur connecté
        const entry = await TimeEntry.findById(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Entrée non trouvée'
            });
        }

        if (entry.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const deleted = await TimeEntry.delete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Entrée non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Entrée supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'entrée de temps:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'entrée de temps',
            error: error.message
        });
    }
});

// API POUR LE DASHBOARD PERSONNEL

// GET /api/time-entries/personal-stats/:userId - Statistiques personnelles
router.get('/personal-stats/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Vérifier que l'utilisateur demande ses propres statistiques
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const pool = require('../utils/database');

        // Calculer la date de début du mois en cours
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Statistiques du mois en cours
        const statsQuery = `
            SELECT 
                COALESCE(SUM(te.heures), 0) as heures_mois,
                COUNT(DISTINCT m.id) as missions_actives,
                COALESCE(AVG(te.heures), 0) as moyenne_quotidienne
            FROM time_entries te
            LEFT JOIN missions m ON te.mission_id = m.id
            WHERE te.user_id = $1 
            AND te.date_saisie >= $2 
            AND te.date_saisie <= $3
        `;

        const statsResult = await pool.query(statsQuery, [userId, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]]);

        // Statistiques du mois précédent pour calculer les tendances
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const prevStatsQuery = `
            SELECT COALESCE(SUM(te.heures), 0) as heures_mois_precedent
            FROM time_entries te
            WHERE te.user_id = $1 
            AND te.date_saisie >= $2 
            AND te.date_saisie <= $3
        `;

        const prevStatsResult = await pool.query(prevStatsQuery, [userId, prevMonthStart.toISOString().split('T')[0], prevMonthEnd.toISOString().split('T')[0]]);

        const stats = statsResult.rows[0];
        const prevStats = prevStatsResult.rows[0];

        // Calculer les tendances
        const heuresMois = stats.heures_mois || 0;
        const heuresMoisPrecedent = prevStats.heures_mois_precedent || 0;
        const tendanceHeures = heuresMoisPrecedent > 0 ? ((heuresMois - heuresMoisPrecedent) / heuresMoisPrecedent) * 100 : 0;

        // Objectif mensuel (exemple: 160h)
        const objectifMensuel = 160;
        const objectifAtteint = (heuresMois / objectifMensuel) * 100;

        // Taux de facturation (exemple: 85%)
        const tauxFacturation = 85.0;
        const tendanceFacturation = 2.5; // Simulation

        const data = {
            heures_mois: Math.round(heuresMois * 10) / 10,
            tendance_heures: Math.round(tendanceHeures * 10) / 10,
            missions_actives: stats.missions_actives || 0,
            tendance_missions: 5.2, // Simulation
            objectif_atteint: Math.min(objectifAtteint, 100),
            tendance_objectif: 3.1, // Simulation
            taux_facturation: tauxFacturation,
            tendance_facturation: tendanceFacturation,
            moyenne_quotidienne: Math.round((stats.moyenne_quotidienne || 0) * 10) / 10
        };

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques personnelles:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques personnelles',
            error: error.message
        });
    }
});

// GET /api/time-entries/personal-chart-data/:userId - Données pour les graphiques
router.get('/personal-chart-data/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Vérifier que l'utilisateur demande ses propres données
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const pool = require('../utils/database');

        // Données pour les 30 derniers jours
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // Évolution des heures par jour
        const evolutionQuery = `
            SELECT 
                te.date_saisie,
                COALESCE(SUM(te.heures), 0) as heures_jour
            FROM time_entries te
            WHERE te.user_id = $1 
            AND te.date_saisie >= $2 
            AND te.date_saisie <= $3
            GROUP BY te.date_saisie
            ORDER BY te.date_saisie
        `;

        const evolutionResult = await pool.query(evolutionQuery, [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

        // Répartition par type d'heures
        const repartitionQuery = `
            SELECT 
                te.type_heures,
                COALESCE(SUM(te.heures), 0) as total_heures
            FROM time_entries te
            WHERE te.user_id = $1 
            AND te.date_saisie >= $2 
            AND te.date_saisie <= $3
            GROUP BY te.type_heures
        `;

        const repartitionResult = await pool.query(repartitionQuery, [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

        // Préparer les données pour les graphiques
        const evolutionData = evolutionResult.rows.map(row => ({
            date: row.date_saisie,
            heures: parseFloat(row.heures_jour)
        }));

        const repartitionData = repartitionResult.rows.map(row => ({
            type: row.type_heures,
            heures: parseFloat(row.total_heures)
        }));

        const data = {
            evolution: evolutionData,
            repartition: repartitionData
        };

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des données graphiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des données graphiques',
            error: error.message
        });
    }
});

// GET /api/time-entries/statistics - Statistiques globales des time entries
router.get('/statistics', authenticateToken, async (req, res) => {
    try {
        const pool = require('../utils/database');

        // Statistiques globales
        const statsQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN ts.statut = 'VALIDE' THEN 1 END) as validated_entries,
                COUNT(CASE WHEN ts.statut = 'EN_ATTENTE' THEN 1 END) as pending_entries,
                COUNT(CASE WHEN ts.statut = 'REJETE' THEN 1 END) as rejected_entries,
                COALESCE(SUM(te.heures), 0) as total_hours
            FROM time_entries te
            LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
        `;

        const statsResult = await pool.query(statsQuery);
        const stats = statsResult.rows[0];

        // Statistiques par mois (12 derniers mois)
        const monthlyQuery = `
            SELECT 
                DATE_TRUNC('month', te.date_saisie) as month,
                COUNT(*) as entries_count,
                COALESCE(SUM(te.heures), 0) as total_hours
            FROM time_entries te
            WHERE te.date_saisie >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', te.date_saisie)
            ORDER BY month DESC
        `;

        const monthlyResult = await pool.query(monthlyQuery);

        const data = {
            global: {
                total_entries: parseInt(stats.total_entries) || 0,
                validated_entries: parseInt(stats.validated_entries) || 0,
                pending_entries: parseInt(stats.pending_entries) || 0,
                rejected_entries: parseInt(stats.rejected_entries) || 0,
                total_hours: parseFloat(stats.total_hours) || 0
            },
            monthly: monthlyResult.rows.map(row => ({
                month: row.month,
                entries_count: parseInt(row.entries_count),
                total_hours: parseFloat(row.total_hours)
            }))
        };

        res.json({
            success: true,
            data: data
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

module.exports = router; 