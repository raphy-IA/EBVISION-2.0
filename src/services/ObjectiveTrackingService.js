const { query } = require('../utils/database');
const Objective = require('../models/Objective');

class ObjectiveTrackingService {
    /**
     * Mettre à jour la progression de tous les objectifs liés à une métrique spécifique
     * @param {string} metricCode - Le code de la métrique (ex: 'CAMPAIGNS_COUNT')
     * @param {string} userId - L'ID de l'utilisateur qui déclenche l'action (pour le tracking)
     */
    static async updateProgress(metricCode, userId) {
        console.log(`🔄 Mise à jour automatique des objectifs pour la métrique: ${metricCode}`);

        try {
            // 1. Calculer la valeur actuelle de la métrique
            const currentValue = await this.calculateMetricValue(metricCode);
            console.log(`📊 Valeur calculée pour ${metricCode}: ${currentValue}`);

            // 2. Trouver tous les objectifs liés à cette métrique
            const objectives = await this.findObjectivesByMetric(metricCode);
            console.log(`🎯 ${objectives.length} objectifs trouvés à mettre à jour`);

            // 3. Mettre à jour la progression pour chaque objectif
            for (const obj of objectives) {
                await Objective.updateProgress(
                    obj.type,
                    obj.id,
                    currentValue,
                    `Mise à jour automatique (${metricCode})`,
                    userId || 'SYSTEM'
                );
            }

            return { success: true, updatedCount: objectives.length, value: currentValue };
        } catch (error) {
            console.error(`❌ Erreur lors de la mise à jour automatique des objectifs (${metricCode}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Calculer la valeur d'une métrique en fonction des données du système
     */
    static async calculateMetricValue(metricCode) {
        switch (metricCode) {
            case 'CAMPAIGNS_COUNT':
                // Compter le nombre total de campagnes de prospection
                const campaignsResult = await query('SELECT COUNT(*) as count FROM prospecting_campaigns');
                return parseInt(campaignsResult.rows[0].count);

            case 'CONVERSION_RATE':
                // Taux de conversion global (Opportunités gagnées / Total Opportunités) * 100
                const conversionResult = await query(`
                    SELECT 
                        (COUNT(CASE WHEN status = 'GAGNEE' THEN 1 END)::float / NULLIF(COUNT(*), 0)::float) * 100 as rate
                    FROM opportunities
                `);
                return parseFloat(conversionResult.rows[0].rate || 0).toFixed(2);

            case 'OPPORTUNITIES_WON':
                // Nombre d'opportunités gagnées
                const wonResult = await query("SELECT COUNT(*) as count FROM opportunities WHERE status = 'GAGNEE'");
                return parseInt(wonResult.rows[0].count);

            case 'MISSIONS_COUNT':
                // Nombre de missions actives
                const missionsResult = await query("SELECT COUNT(*) as count FROM missions WHERE status = 'EN_COURS'");
                return parseInt(missionsResult.rows[0].count);

            case 'REVENUE_GENERATED':
                // Somme des factures payées (ou émises selon la logique métier)
                // Ici on prend le total des missions facturables pour l'exemple, ou une table invoices si elle existe
                // Pour l'instant, simulons avec le budget des missions
                const revenueResult = await query("SELECT SUM(budget) as total FROM missions");
                return parseFloat(revenueResult.rows[0].total || 0);

            default:
                console.warn(`⚠️ Métrique inconnue: ${metricCode}`);
                return 0;
        }
    }

    /**
     * Trouver tous les objectifs (Global, BU, Division, Individuel) liés à une métrique
     */
    static async findObjectivesByMetric(metricCode) {
        const objectives = [];

        // 1. Objectifs Globaux
        const globalRes = await query(
            "SELECT id FROM global_objectives WHERE tracking_type = 'AUTOMATIC' AND metric_code = $1",
            [metricCode]
        );
        globalRes.rows.forEach(row => objectives.push({ type: 'GLOBAL', id: row.id }));

        // 2. Objectifs BU
        const buRes = await query(
            "SELECT id FROM business_unit_objectives WHERE tracking_type = 'AUTOMATIC' AND metric_code = $1",
            [metricCode]
        );
        buRes.rows.forEach(row => objectives.push({ type: 'BUSINESS_UNIT', id: row.id }));

        // 3. Objectifs Division
        const divRes = await query(
            "SELECT id FROM division_objectives WHERE tracking_type = 'AUTOMATIC' AND metric_code = $1",
            [metricCode]
        );
        divRes.rows.forEach(row => objectives.push({ type: 'DIVISION', id: row.id }));

        // 4. Objectifs Individuels
        const indRes = await query(
            "SELECT id FROM individual_objectives WHERE tracking_type = 'AUTOMATIC' AND metric_code = $1",
            [metricCode]
        );
        indRes.rows.forEach(row => objectives.push({ type: 'INDIVIDUAL', id: row.id }));

        return objectives;
    }
}

module.exports = ObjectiveTrackingService;
