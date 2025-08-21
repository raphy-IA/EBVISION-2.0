const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CompanySource, Company, ProspectingTemplate, ProspectingCampaign } = require('../models/Prospecting');
const { authenticateToken } = require('../middleware/auth');

// Storage for uploads per-source
const uploadRoot = path.join(process.cwd(), 'public', 'uploads', 'company-sources');
fs.mkdirSync(uploadRoot, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sourceId = req.params.sourceId || 'general';
        const dir = path.join(uploadRoot, sourceId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${base}__${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// Sources
router.get('/sources', authenticateToken, async (req, res) => {
    const list = await CompanySource.findAll();
    res.json({ success: true, data: list });
});

router.post('/sources', authenticateToken, async (req, res) => {
    console.log('🔥 [PROSPECTING] POST /sources called');
    console.log('🔥 [PROSPECTING] Request body:', req.body);
    console.log('🔥 [PROSPECTING] User:', req.user?.id);
    try {
        const name = (req.body?.name || '').trim();
        console.log('🔥 [PROSPECTING] Extracted name:', name);
        if (!name) {
            console.log('🔥 [PROSPECTING] Name validation failed');
            return res.status(400).json({ success: false, error: 'Nom requis' });
        }
        console.log('🔥 [PROSPECTING] Creating source...');
        const created = await CompanySource.create({ name, description: req.body.description });
        console.log('🔥 [PROSPECTING] Source created:', created);
        res.status(201).json({ success: true, data: created });
    } catch (e) {
        console.error('🔥 [PROSPECTING] Exception:', e);
        if (e && e.code === '23505') {
            console.log('🔥 [PROSPECTING] Duplicate name error');
            return res.status(409).json({ success: false, error: 'Une source avec ce nom existe déjà' });
        }
        console.error('🔥 [PROSPECTING] Erreur création source:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la création de la source' });
    }
});

// Upload fichier d'une source (CSV/Excel support minimal CSV ici)
router.post('/sources/:sourceId/import', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        console.log('🔥 [CSV] Import démarré pour source:', req.params.sourceId);
        if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' });
        
        console.log('🔥 [CSV] Fichier reçu:', req.file.originalname, 'Taille:', req.file.size);
        
        // Parser CSV amélioré (support ; et , comme séparateurs)
        const content = fs.readFileSync(req.file.path, 'utf8');
        console.log('🔥 [CSV] Contenu brut (100 premiers chars):', content.substring(0, 100));
        
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        console.log('🔥 [CSV] Nombre de lignes:', lines.length);
        
        if (lines.length === 0) {
            return res.status(400).json({ success: false, error: 'Fichier vide' });
        }
        
        // Détecter le séparateur (virgule ou point-virgule)
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        console.log('🔥 [CSV] Séparateur détecté:', separator);
        
        const header = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
        console.log('🔥 [CSV] En-têtes détectés:', header);
        
        const dataLines = lines.slice(1);
        console.log('🔥 [CSV] Lignes de données:', dataLines.length);
        
        const rows = dataLines.map((line, index) => {
            const cols = line.split(separator).map(col => col.trim().replace(/"/g, ''));
            const obj = {};
            header.forEach((h, i) => obj[h] = cols[i] || '');
            
            const mappedRow = {
                name: obj.raison_sociale || obj.name || obj.nom || obj.company || obj.entreprise || '',
                industry: obj.activite_principale || obj.industry || obj.secteur || obj.sector || obj.activite || null,
                email: obj.email || obj.mail || obj.e_mail || null,
                phone: obj.telephone || obj.phone || obj.tel || obj.mobile || null,
                website: obj.website || obj.site || obj.web || obj.url || null,
                country: obj.pays || obj.country || obj.nation || null,
                city: obj.ville || obj.city || obj.localite || null,
                address: obj.adresse || obj.address || obj.rue || obj.lieux_dit || obj.quartier || null,
                siret: obj.niu || obj.siret || obj.siren || obj.rcs || null,
                size_label: obj.regime || obj.forme_juridique || obj.size || obj.effectif || obj.taille || obj.employees || null
            };
            
            if (index < 3) { // Log les 3 premières lignes pour debug
                console.log(`🔥 [CSV] Ligne ${index + 1} mappée:`, mappedRow);
            }
            
            return mappedRow;
        }).filter(r => r.name && r.name.length > 0);

        console.log('🔥 [CSV] Lignes valides après filtrage:', rows.length);
        
        if (rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Aucune entreprise valide trouvée. Vérifiez que le fichier contient une colonne "nom", "name" ou "entreprise"',
                debug: { header, separator, totalLines: lines.length }
            });
        }

        const result = await Company.bulkInsertFromRows(req.params.sourceId, rows);
        console.log('🔥 [CSV] Résultat insertion:', result);
        res.json({ success: true, message: 'Import réalisé', data: { inserted: result.inserted } });
    } catch (e) {
        console.error('🔥 [CSV] Import entreprises échoué:', e);
        res.status(500).json({ success: false, error: 'Import échoué', details: e.message });
    }
});

router.get('/sources/:sourceId/companies', authenticateToken, async (req, res) => {
    const list = await Company.findBySource(req.params.sourceId);
    res.json({ success: true, data: list });
});

router.get('/companies/search', authenticateToken, async (req, res) => {
    const { q, source_id, industry, city, limit, offset, sort_by, sort_order } = req.query;
    const result = await Company.search({ 
        q, source_id, industry, city, 
        limit: parseInt(limit)||20, 
        offset: parseInt(offset)||0,
        sort_by,
        sort_order
    });
    res.json({ success: true, data: result.companies, pagination: result.pagination });
});

// Obtenir les valeurs distinctes pour les filtres
router.get('/companies/filters', authenticateToken, async (req, res) => {
    const filters = await Company.getDistinctValues();
    res.json({ success: true, data: filters });
});

// CRUD entreprises individuelles
router.get('/companies/:id', authenticateToken, async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Entreprise non trouvée' });
    res.json({ success: true, data: company });
});

router.put('/companies/:id', authenticateToken, async (req, res) => {
    try {
        const updated = await Company.update(req.params.id, req.body);
        if (!updated) return res.status(404).json({ success: false, error: 'Entreprise non trouvée' });
        res.json({ success: true, data: updated });
    } catch (e) {
        console.error('Erreur modification entreprise:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la modification' });
    }
});

router.delete('/companies/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await Company.delete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'Entreprise non trouvée' });
        res.json({ success: true, message: 'Entreprise supprimée' });
    } catch (e) {
        console.error('Erreur suppression entreprise:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
    }
});

// Suppression en lot
router.delete('/companies', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'IDs requis sous forme de tableau' });
        }
        const result = await Company.bulkDelete(ids);
        res.json({ success: true, message: `${result.deleted} entreprise(s) supprimée(s)` });
    } catch (e) {
        console.error('Erreur suppression en lot:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression en lot' });
    }
});

// ===== ROUTES VALIDATIONS CAMPAGNES =====

// Obtenir une campagne avec ses détails complets
router.get('/campaigns/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await ProspectingCampaign.findByIdWithDetails(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }
        res.json({ success: true, data: campaign });
    } catch (e) {
        console.error('Erreur récupération campagne:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération' });
    }
});



// Obtenir les validations d'une campagne
router.get('/campaigns/:id/validations', authenticateToken, async (req, res) => {
    try {
        const validations = await ProspectingCampaign.getValidations(req.params.id);
        res.json({ success: true, data: validations });
    } catch (e) {
        console.error('Erreur récupération validations:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des validations' });
    }
});

// Soumettre une campagne pour validation
router.post('/campaigns/:id/submit-validation', authenticateToken, async (req, res) => {
    try {
        const { validation_level, comment } = req.body;
        
        if (!['DIVISION', 'BUSINESS_UNIT'].includes(validation_level)) {
            return res.status(400).json({ success: false, error: 'Niveau de validation invalide' });
        }
        
        const result = await ProspectingCampaign.submitForValidation(
            req.params.id, 
            req.user.id, 
            validation_level, 
            comment
        );
        
        if (result.success) {
            res.json({ success: true, data: result.validation });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('Erreur soumission validation:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la soumission' });
    }
});

// Valider ou rejeter une campagne (pour les responsables)
router.post('/campaigns/:id/validate', authenticateToken, async (req, res) => {
    try {
        const { validation_id, decision, comment } = req.body;
        
        if (!['APPROUVE', 'REFUSE'].includes(decision)) {
            return res.status(400).json({ success: false, error: 'Décision invalide' });
        }
        
        const result = await ProspectingCampaign.processValidation(
            validation_id,
            req.user.id,
            decision,
            comment
        );
        
        if (result.success) {
            res.json({ success: true, data: result.validation });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('Erreur traitement validation:', e);
        res.status(500).json({ success: false, error: 'Erreur lors du traitement' });
    }
});

// Annuler une demande de validation
router.delete('/campaigns/:id/validations/:validationId', authenticateToken, async (req, res) => {
    try {
        const result = await ProspectingCampaign.cancelValidation(
            req.params.validationId,
            req.user.id
        );
        
        if (result.success) {
            res.json({ success: true, message: 'Validation annulée' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('Erreur annulation validation:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de l\'annulation' });
    }
});

// Templates de campagne
router.get('/templates', authenticateToken, async (req, res) => {
    const list = await ProspectingTemplate.findAll();
    res.json({ success: true, data: list });
});

router.get('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const template = await ProspectingTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Modèle non trouvé' });
        }
        res.json({ success: true, data: template });
    } catch (e) {
        console.error('Erreur récupération modèle:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération du modèle' });
    }
});

router.post('/templates', authenticateToken, async (req, res) => {
    try {
        const name = (req.body?.name || '').trim();
        const body_template = (req.body?.body_template || '').trim();
        if (!name || !body_template) {
            return res.status(400).json({ success: false, error: 'Nom et corps requis' });
        }
        const created = await ProspectingTemplate.create({
            ...req.body,
            name,
            body_template
        });
        res.status(201).json({ success: true, data: created });
    } catch (e) {
        console.error('Erreur création modèle de prospection:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la création du modèle' });
    }
});

router.put('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const name = (req.body?.name || '').trim();
        const body_template = (req.body?.body_template || '').trim();
        if (!name || !body_template) {
            return res.status(400).json({ success: false, error: 'Nom et corps requis' });
        }
        const updated = await ProspectingTemplate.update(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Modèle non trouvé' });
        }
        res.json({ success: true, data: updated });
    } catch (e) {
        console.error('Erreur modification modèle de prospection:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la modification du modèle' });
    }
});

router.delete('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const result = await ProspectingTemplate.delete(req.params.id);
        if (result.success) {
            res.json({ success: true, message: 'Modèle supprimé avec succès' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('Erreur suppression modèle de prospection:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression du modèle' });
    }
});

// Campagnes
router.post('/campaigns', authenticateToken, async (req, res) => {
    try {
        const name = (req.body?.name || '').trim();
        const channel = (req.body?.channel || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, error: 'Nom requis' });
        }
        if (!channel || !['EMAIL','PHYSIQUE'].includes(channel)) {
            return res.status(400).json({ success: false, error: 'Canal invalide' });
        }
        const created = await ProspectingCampaign.create({ ...req.body, name, channel, created_by: req.user.id });
        res.status(201).json({ success: true, data: created });
    } catch (e) {
        console.error('Erreur création campagne de prospection:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la création de la campagne' });
    }
});

router.post('/campaigns/:id/companies', authenticateToken, async (req, res) => {
    const { company_ids } = req.body;
    if (!Array.isArray(company_ids) || company_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'company_ids requis' });
    }
    const result = await ProspectingCampaign.addCompanies(req.params.id, company_ids);
    res.json({ success: true, data: result });
});

// Modifications par lot des entreprises d'une campagne (ajouts et suppressions)
router.put('/campaigns/:id/companies/batch', authenticateToken, async (req, res) => {
    try {
        const { added_company_ids, removed_company_ids } = req.body;
        const campaignId = req.params.id;
        
        console.log('🔥 [API] PUT /campaigns/:id/companies/batch');
        console.log('🔥 [API] Campaign ID:', campaignId);
        console.log('🔥 [API] Ajouts:', added_company_ids?.length || 0);
        console.log('🔥 [API] Suppressions:', removed_company_ids?.length || 0);
        
        // Vérifier que les données sont valides
        if (!Array.isArray(added_company_ids) || !Array.isArray(removed_company_ids)) {
            return res.status(400).json({ 
                success: false, 
                error: 'added_company_ids et removed_company_ids doivent être des tableaux' 
            });
        }
        
        // Effectuer les ajouts
        let addedResult = { added: 0 };
        if (added_company_ids.length > 0) {
            addedResult = await ProspectingCampaign.addCompanies(campaignId, added_company_ids);
        }
        
        // Effectuer les suppressions
        let removedResult = { removed: 0 };
        if (removed_company_ids.length > 0) {
            for (const companyId of removed_company_ids) {
                const result = await ProspectingCampaign.removeCompany(campaignId, companyId);
                if (result.success) {
                    removedResult.removed++;
                }
            }
        }
        
        res.json({ 
            success: true, 
            data: {
                added: addedResult.added || 0,
                removed: removedResult.removed || 0,
                total_operations: (addedResult.added || 0) + (removedResult.removed || 0)
            }
        });
    } catch (e) {
        console.error('🔥 [API] Erreur modifications par lot:', e);
        res.status(500).json({ success: false, error: 'Erreur lors des modifications par lot' });
    }
});

// Supprimer une entreprise d'une campagne
router.delete('/campaigns/:id/companies/:companyId', authenticateToken, async (req, res) => {
    try {
        const { id: campaignId, companyId } = req.params;
        
        console.log('🔥 [API] DELETE /campaigns/:id/companies/:companyId');
        console.log('🔥 [API] Campaign ID:', campaignId, 'Company ID:', companyId);
        
        const result = await ProspectingCampaign.removeCompany(campaignId, companyId);
        
        if (result.success) {
            res.json({ success: true, message: 'Entreprise retirée avec succès' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('🔥 [API] Erreur suppression entreprise de campagne:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
    }
});

router.get('/campaigns', authenticateToken, async (req, res) => {
    try {
        const campaigns = await ProspectingCampaign.findAll();
        res.json({ success: true, data: campaigns });
    } catch (e) {
        console.error('Erreur récupération campagnes:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des campagnes' });
    }
});

router.get('/campaigns/:id', authenticateToken, async (req, res) => {
    try {
        // Récupérer les détails complets de la campagne
        const campaign = await ProspectingCampaign.findByIdWithDetails(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }
        res.json({ success: true, data: campaign });
    } catch (e) {
        console.error('Erreur récupération campagne:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la campagne' });
    }
});

router.get('/campaigns/:id/companies', authenticateToken, async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const campaignId = req.params.id;
        
        console.log('🔥 [API] GET /campaigns/:id/companies - Campaign ID:', campaignId);
        console.log('🔥 [API] Query params - limit:', limit, 'offset:', offset);
        
        const result = await ProspectingCampaign.getCompanies(campaignId, { 
            limit: parseInt(limit)||50, 
            offset: parseInt(offset)||0 
        });
        
        console.log('🔥 [API] Résultat getCompanies:', {
            companiesCount: result.companies.length,
            pagination: result.pagination,
            firstCompany: result.companies[0] || 'Aucune'
        });
        
        res.json({ success: true, data: result.companies, pagination: result.pagination });
    } catch (e) {
        console.error('🔥 [API] Erreur récupération entreprises de campagne:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des entreprises' });
    }
});

router.put('/campaigns/:id', authenticateToken, async (req, res) => {
    try {
        const { name, template_id, responsible_id, scheduled_date, priority, description } = req.body;
        
        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Le nom de la campagne est obligatoire' });
        }
        if (!template_id) {
            return res.status(400).json({ success: false, error: 'Le modèle est obligatoire' });
        }
        if (!responsible_id) {
            return res.status(400).json({ success: false, error: 'Le responsable est obligatoire' });
        }
        
        const updated = await ProspectingCampaign.update(req.params.id, {
            name: name.trim(),
            template_id,
            responsible_id,
            scheduled_date,
            priority,
            description: description?.trim()
        });
        
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
        }
        
        res.json({ success: true, data: updated, message: 'Campagne mise à jour avec succès' });
    } catch (e) {
        console.error('Erreur modification campagne:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la modification de la campagne' });
    }
});

router.delete('/campaigns/:id', authenticateToken, async (req, res) => {
    try {
        const result = await ProspectingCampaign.delete(req.params.id);
        
        if (result.success) {
            res.json({ success: true, message: 'Campagne supprimée avec succès' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('Erreur suppression campagne:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la campagne' });
    }
});

// Récupérer les validations d'une campagne
router.get('/campaigns/:id/validations', authenticateToken, async (req, res) => {
    try {
        const validations = await ProspectingCampaign.getValidations(req.params.id);
        res.json({ success: true, data: validations });
    } catch (e) {
        console.error('Erreur récupération validations:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des validations' });
    }
});

// Traiter une validation (approuver/rejeter)
router.post('/campaigns/:id/validations/:validationId/process', authenticateToken, async (req, res) => {
    try {
        const { decision, comment } = req.body;
        
        if (!decision || !['APPROUVE', 'REFUSE'].includes(decision)) {
            return res.status(400).json({
                success: false,
                error: 'Décision invalide (APPROUVE ou REFUSE requis)'
            });
        }
        
        const result = await ProspectingCampaign.processValidation(
            req.params.validationId,
            req.user.id,
            decision,
            comment
        );
        
        if (result.success) {
            res.json({
                success: true,
                data: result.validation,
                message: `Validation ${decision.toLowerCase()}e avec succès`
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        console.error('Erreur traitement validation:', e);
        res.status(500).json({ success: false, error: 'Erreur lors du traitement de la validation' });
    }
});

// =====================================================
// ROUTES DE VALIDATION DES CAMPAGNES
// =====================================================

/**
 * GET /api/prospecting/validations
 * Récupérer les campagnes à valider pour le responsable connecté
 */
router.get('/validations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Récupérer les campagnes à valider pour ce responsable
        const validations = await ProspectingCampaign.getValidationsForUser(userId);
        
        res.json({
            success: true,
            data: validations
        });
    } catch (error) {
        console.error('Erreur récupération validations:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des validations'
        });
    }
});

/**
 * POST /api/prospecting/campaigns/:id/submit
 * Soumettre une campagne pour validation
 */
router.post('/campaigns/:id/submit', authenticateToken, async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user.id;
        
        // Vérifier que l'utilisateur est le responsable de la campagne
        const campaign = await ProspectingCampaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'Campagne non trouvée'
            });
        }
        
        if (campaign.created_by !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Vous n\'êtes pas autorisé à soumettre cette campagne'
            });
        }
        
        // Soumettre la campagne pour validation
        const result = await ProspectingCampaign.submitForValidation(campaignId);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Campagne soumise pour validation avec succès',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Erreur soumission campagne:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la soumission de la campagne'
        });
    }
});

/**
 * POST /api/prospecting/campaigns/:id/validate
 * Valider ou rejeter une campagne
 */
router.post('/campaigns/:id/validate', authenticateToken, async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user.id;
        const { action, note, company_validations } = req.body;
        
        if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Action de validation invalide'
            });
        }
        
        // Valider la campagne
        const result = await ProspectingCampaign.validateCampaign(campaignId, userId, action, note, company_validations);
        
        if (result.success) {
            res.json({
                success: true,
                message: `Campagne ${action === 'APPROVED' ? 'validée' : 'rejetée'} avec succès`,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Erreur validation campagne:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la validation de la campagne'
        });
    }
});

/**
 * GET /api/prospecting/campaigns/:id/validation-details
 * Récupérer les détails d'une campagne pour validation
 */
router.get('/campaigns/:id/validation-details', authenticateToken, async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user.id;
        
        // Récupérer les détails de la campagne avec les entreprises
        const details = await ProspectingCampaign.getValidationDetails(campaignId, userId);
        
        if (details.success) {
            res.json({
                success: true,
                data: details.data
            });
        } else {
            res.status(404).json({
                success: false,
                error: details.error
            });
        }
    } catch (error) {
        console.error('Erreur récupération détails validation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des détails'
        });
    }
});

module.exports = router;


