const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CompanySource, Company, ProspectingTemplate, ProspectingCampaign } = require('../models/Prospecting');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

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

// Configuration multer pour les fichiers d'exécution
const executionUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, '../../public/uploads/executions');
            fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const extension = path.extname(file.originalname);
            const fileName = `execution_${req.params.campaignId}_${req.params.companyId}_${timestamp}${extension}`;
            cb(null, fileName);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé. Formats acceptés: PDF, JPG, PNG, DOC, DOCX'), false);
        }
    }
});

// Fonction utilitaire pour vérifier les autorisations sur une campagne
async function checkCampaignAuthorization(campaignId, userId) {
    const campaign = await ProspectingCampaign.findByIdWithDetails(campaignId);
    if (!campaign) {
        return { authorized: false, error: 'Campagne non trouvée' };
    }
    
    // Vérifier si l'utilisateur est le créateur de la campagne
    const isCreator = campaign.created_by === userId;
    
    // Vérifier si l'utilisateur est responsable de la BU/Division
    let isManager = false;
    if (campaign.business_unit_id) {
        const Manager = require('../models/Manager');
        const buManagers = await Manager.getBusinessUnitManagers(campaign.business_unit_id);
        if (buManagers) {
            // Obtenir l'ID du collaborateur de l'utilisateur actuel
            const user = await pool.query('SELECT collaborateur_id FROM users WHERE id = $1', [userId]);
            if (user.rows.length > 0 && user.rows[0].collaborateur_id) {
                const collabId = user.rows[0].collaborateur_id;
                isManager = (buManagers.principal_id === collabId || buManagers.adjoint_id === collabId);
            }
        }
    }
    
    if (campaign.division_id) {
        const Manager = require('../models/Manager');
        const divManagers = await Manager.getDivisionManagers(campaign.division_id);
        if (divManagers) {
            // Obtenir l'ID du collaborateur de l'utilisateur actuel
            const user = await pool.query('SELECT collaborateur_id FROM users WHERE id = $1', [userId]);
            if (user.rows.length > 0 && user.rows[0].collaborateur_id) {
                const collabId = user.rows[0].collaborateur_id;
                isManager = isManager || (divManagers.principal_id === collabId || divManagers.adjoint_id === collabId);
            }
        }
    }
    
    return { 
        authorized: isCreator || isManager, 
        isCreator, 
        isManager,
        campaign 
    };
}

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

// Modifier une source
router.put('/sources/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, error: 'Nom requis' });
        }
        
        const updated = await CompanySource.update(req.params.id, { 
            name: name.trim(), 
            description: description || null 
        });
        
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Source non trouvée' });
        }
        
        res.json({ success: true, data: updated });
    } catch (e) {
        console.error('Erreur modification source:', e);
        if (e.code === '23505') {
            return res.status(409).json({ success: false, error: 'Une source avec ce nom existe déjà' });
        }
        res.status(500).json({ success: false, error: 'Erreur lors de la modification' });
    }
});

// Supprimer une source
router.delete('/sources/:id', authenticateToken, async (req, res) => {
    try {
        // Vérifier s'il y a des entreprises associées
        const companiesCount = await pool.query(
            'SELECT COUNT(*) as count FROM companies WHERE source_id = $1',
            [req.params.id]
        );
        
        if (parseInt(companiesCount.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Impossible de supprimer cette source car elle contient des entreprises',
                companiesCount: parseInt(companiesCount.rows[0].count)
            });
        }
        
        const deleted = await CompanySource.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Source non trouvée' });
        }
        
        res.json({ success: true, message: 'Source supprimée avec succès' });
    } catch (e) {
        console.error('Erreur suppression source:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
    }
});

// Supprimer toutes les entreprises d'une source (non associées aux campagnes)
router.delete('/sources/:id/companies', authenticateToken, async (req, res) => {
    try {
        // Compter les entreprises avant suppression
        const beforeCount = await pool.query(
            'SELECT COUNT(*) as count FROM companies WHERE source_id = $1',
            [req.params.id]
        );
        
        // Supprimer seulement les entreprises non associées aux campagnes
        const result = await pool.query(`
            DELETE FROM companies 
            WHERE source_id = $1 
            AND id NOT IN (
                SELECT DISTINCT company_id 
                FROM prospecting_campaign_companies
            )
        `, [req.params.id]);
        
        const deletedCount = result.rowCount;
        const remainingCount = parseInt(beforeCount.rows[0].count) - deletedCount;
        
        res.json({
            success: true,
            message: `${deletedCount} entreprises supprimées`,
            data: {
                deleted: deletedCount,
                remaining: remainingCount,
                total: parseInt(beforeCount.rows[0].count)
            }
        });
    } catch (e) {
        console.error('Erreur suppression entreprises source:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
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
                size_label: obj.regime || obj.forme_juridique || obj.size || obj.effectif || obj.taille || obj.employees || null,
                sigle: obj.sigle || obj.acronyme || obj.abbreviation || obj.code || null
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
        res.json({ 
            success: true, 
            message: result.message, 
            data: { 
                inserted: result.inserted,
                skipped: result.skipped,
                errors: result.errors,
                total: result.total
            } 
        });
    } catch (e) {
        console.error('🔥 [CSV] Import entreprises échoué:', e);
        res.status(500).json({ success: false, error: 'Import échoué', details: e.message });
    }
});

router.get('/sources/:sourceId/companies', authenticateToken, async (req, res) => {
    const list = await Company.findBySource(req.params.sourceId);
    res.json({ success: true, data: list });
});

// Obtenir toutes les entreprises avec leurs sources (DOIT ÊTRE AVANT /companies/search)
router.get('/companies', authenticateToken, async (req, res) => {
    try {
        const companies = await Company.findAllWithSources();
        res.json({ success: true, data: companies });
    } catch (e) {
        console.error('Erreur récupération toutes entreprises:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération' });
    }
});

// Obtenir les valeurs distinctes pour les filtres
router.get('/companies/filters', authenticateToken, async (req, res) => {
    const filters = await Company.getDistinctValues();
    res.json({ success: true, data: filters });
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
        
        if (deleted.hasDependencies) {
            return res.status(400).json({
                success: false,
                message: deleted.message,
                dependencies: deleted.dependencies
            });
        }
        
        res.json({ success: true, message: 'Entreprise supprimée' });
    } catch (e) {
        console.error('Erreur suppression entreprise:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
    }
});

// Créer une nouvelle entreprise
router.post('/companies', authenticateToken, async (req, res) => {
    try {
        const { 
            name, sigle, industry, size_label, email, phone, website, 
            siret, country, city, address, source_id 
        } = req.body;

        // Validation des champs obligatoires
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Le nom de l\'entreprise est obligatoire' });
        }

        if (!source_id) {
            return res.status(400).json({ success: false, error: 'L\'ID de la source est obligatoire' });
        }

        // Vérifier que la source existe
        const sourceExists = await pool.query('SELECT id FROM company_sources WHERE id = $1', [source_id]);
        if (sourceExists.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Source non trouvée' });
        }

        // Vérifier si une entreprise avec le même nom existe déjà dans cette source
        const existingCompany = await pool.query(
            'SELECT id FROM companies WHERE source_id = $1 AND name = $2',
            [source_id, name.trim()]
        );

        if (existingCompany.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'Une entreprise avec ce nom existe déjà dans cette source' 
            });
        }

        // Créer l'entreprise
        const companyData = {
            source_id,
            name: name.trim(),
            sigle: sigle && sigle.trim() ? sigle.trim() : null,
            industry: industry && industry.trim() ? industry.trim() : null,
            size_label: size_label || null,
            email: email && email.trim() ? email.trim() : null,
            phone: phone && phone.trim() ? phone.trim() : null,
            website: website && website.trim() ? website.trim() : null,
            siret: siret && siret.trim() ? siret.trim() : null,
            country: country && country.trim() ? country.trim() : null,
            city: city && city.trim() ? city.trim() : null,
            address: address && address.trim() ? address.trim() : null
        };

        const result = await pool.query(`
            INSERT INTO companies (
                source_id, name, sigle, industry, size_label, email, phone, 
                website, siret, country, city, address, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *
        `, [
            companyData.source_id, companyData.name, companyData.sigle, 
            companyData.industry, companyData.size_label, companyData.email, 
            companyData.phone, companyData.website, companyData.siret, 
            companyData.country, companyData.city, companyData.address
        ]);

        const newCompany = result.rows[0];

        console.log(`✅ [CREATE] Entreprise créée: ${newCompany.name} (ID: ${newCompany.id}) dans la source ${source_id}`);

        res.status(201).json({ 
            success: true, 
            message: 'Entreprise créée avec succès',
            data: newCompany
        });

    } catch (e) {
        console.error('Erreur création entreprise:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'entreprise' });
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
        
        if (result.hasDependencies) {
            return res.status(400).json({
                success: false,
                message: result.message,
                dependencies: result.dependencies,
                deleted: result.deleted
            });
        }
        
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
        // Récupérer les Business Units auxquelles l'utilisateur a accès
        const permissionManager = require('../utils/PermissionManager');
        const userBusinessUnits = await permissionManager.getUserBusinessUnits(req.user.id);
        const userBusinessUnitIds = userBusinessUnits.map(bu => bu.id);
        
        console.log(`🔍 Utilisateur ${req.user.id} a accès aux BU:`, userBusinessUnitIds);
        
        const result = await ProspectingCampaign.findAll({ userBusinessUnitIds });
        res.json({ success: true, data: result.campaigns });
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

/**
 * GET /api/prospecting/campaigns/:campaignId/companies/:companyId
 * Récupérer les détails d'une entreprise spécifique dans une campagne
 */
router.get('/campaigns/:campaignId/companies/:companyId', authenticateToken, async (req, res) => {
    try {
        const { campaignId, companyId } = req.params;

        const query = `
            SELECT 
                c.id as company_id,
                c.name,
                c.industry,
                c.city,
                c.email,
                c.phone,
                c.website,
                c.address,
                c.created_at,
                c.updated_at,
                pcc.validation_status,
                pcc.execution_status,
                pcc.execution_date,
                pcc.execution_notes,
                pcc.execution_file,
                pcc.converted_to_opportunity,
                pcc.opportunity_id
            FROM companies c
            JOIN prospecting_campaign_companies pcc ON c.id = pcc.company_id
            WHERE pcc.campaign_id = $1 AND pcc.company_id = $2
        `;

        const result = await pool.query(query, [campaignId, companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Entreprise non trouvée dans cette campagne'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erreur récupération détails entreprise:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des détails de l\'entreprise'
        });
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

// Récupérer les détails d'une validation (avec validations par entreprise)
router.get('/campaigns/:id/validations/:validationId/details', authenticateToken, async (req, res) => {
    try {
        const { id: campaignId, validationId } = req.params;
        
        // Récupérer la validation
        const validation = await ProspectingCampaign.getValidationById(validationId);
        if (!validation) {
            return res.status(404).json({
                success: false,
                error: 'Validation non trouvée'
            });
        }
        
        // Récupérer les validations par entreprise
        const companyValidations = await ProspectingCampaign.getCompanyValidations(validationId);
        
        res.json({
            success: true,
            data: {
                validation,
                company_validations: companyValidations
            }
        });
    } catch (e) {
        console.error('Erreur récupération détails validation:', e);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des détails de validation' });
    }
});

// Traiter une validation (approuver/rejeter)
router.post('/campaigns/:id/validations/:validationId/process', authenticateToken, async (req, res) => {
    try {
        const { decision, comment, company_validations } = req.body;
        
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
            comment,
            company_validations
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
        const includeAllStatuses = req.query.all === 'true';
        
        // Récupérer les campagnes pour ce responsable
        const validations = await ProspectingCampaign.getValidationsForUser(userId, includeAllStatuses);
        
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
 * GET /api/prospecting/reports
 * Générer un rapport des campagnes de prospection
 */
router.get('/reports', authenticateToken, async (req, res) => {
    try {
        const {
            business_unit_id,
            division_id,
            status,
            start_date,
            end_date
        } = req.query;

        console.log('🔍 Paramètres reçus:', { business_unit_id, division_id, status, start_date, end_date });

        // Construire les conditions de filtrage pour les campagnes
        let campaignWhereConditions = ['1=1'];
        let campaignParams = [];
        let campaignParamIndex = 1;

        if (business_unit_id) {
            campaignWhereConditions.push(`pcs.business_unit_name = (SELECT nom FROM business_units WHERE id = $${campaignParamIndex++})`);
            campaignParams.push(business_unit_id);
        }

        if (division_id) {
            campaignWhereConditions.push(`pcs.division_name = (SELECT nom FROM divisions WHERE id = $${campaignParamIndex++})`);
            campaignParams.push(division_id);
        }

        if (status) {
            campaignWhereConditions.push(`pcs.campaign_validation_status = $${campaignParamIndex++}`);
            campaignParams.push(status);
        }

        if (start_date && end_date) {
            campaignWhereConditions.push(`pcs.created_at BETWEEN $${campaignParamIndex++} AND $${campaignParamIndex++}`);
            campaignParams.push(start_date, end_date);
        }

        const campaignWhereClause = campaignWhereConditions.join(' AND ');
        console.log('🔍 Clause WHERE:', campaignWhereClause);
        console.log('🔍 Paramètres:', campaignParams);

        // Utiliser la vue pour les rapports de campagnes
        const campaignsQuery = `
            SELECT 
                pcs.campaign_id as id,
                pcs.campaign_name as name,
                pcs.campaign_validation_status as validation_statut,
                pcs.template_type,
                pcs.business_unit_name,
                pcs.division_name,
                pcs.responsible_name,
                pcs.responsible_prenom,
                pcs.total_companies as companies_count,
                pcs.approved_companies,
                pcs.rejected_companies,
                pcs.deposed_count,
                pcs.sent_count,
                pcs.pending_execution_count,
                pcs.converted_count,
                pcs.created_at,
                pcs.scheduled_date
            FROM prospecting_campaign_summary pcs
            WHERE ${campaignWhereClause}
            ORDER BY pcs.created_at DESC
        `;

        console.log('🔍 Requête campagnes:', campaignsQuery);

        const campaignsResult = await pool.query(campaignsQuery, campaignParams);
        const campaigns = campaignsResult.rows;
        
        console.log('📊 Campagnes trouvées:', campaigns.length);
        console.log('📊 Exemple de campagne:', campaigns[0]);

        // Calculer les statistiques en utilisant la vue
        const statsQuery = `
            SELECT 
                COUNT(*) as total_campaigns,
                COUNT(CASE WHEN pcs.campaign_validation_status = 'EN_VALIDATION' THEN 1 END) as pending_campaigns,
                COUNT(CASE WHEN pcs.campaign_validation_status = 'VALIDE' THEN 1 END) as approved_campaigns,
                COUNT(CASE WHEN pcs.campaign_validation_status = 'REJETE' THEN 1 END) as rejected_campaigns,
                COUNT(CASE WHEN pcs.campaign_validation_status = 'EN_COURS' THEN 1 END) as in_progress_campaigns,
                COUNT(CASE WHEN pcs.campaign_validation_status = 'TERMINEE' THEN 1 END) as completed_campaigns,
                COALESCE(SUM(pcs.total_companies), 0)::int as total_companies,
                COALESCE(SUM(pcs.deposed_count), 0)::int as total_deposed,
                COALESCE(SUM(pcs.sent_count), 0)::int as total_sent,
                COALESCE(SUM(pcs.converted_count), 0)::int as total_converted,
                COALESCE(SUM(pcs.pending_execution_count), 0)::int as total_pending_execution,
                COALESCE(AVG(
                    CASE 
                        WHEN pcs.total_companies > 0 THEN 
                            ((pcs.deposed_count + pcs.sent_count)::float / pcs.total_companies * 100)
                        ELSE 0 
                    END
                ), 0)::numeric(5,2) as avg_execution_rate,
                COALESCE(AVG(
                    CASE 
                        WHEN pcs.total_companies > 0 THEN 
                            (pcs.converted_count::float / pcs.total_companies * 100)
                        ELSE 0 
                    END
                ), 0)::numeric(5,2) as avg_conversion_rate
            FROM prospecting_campaign_summary pcs
            WHERE ${campaignWhereClause}
        `;

        console.log('🔍 Requête statistiques:', statsQuery);

        const statsResult = await pool.query(statsQuery, campaignParams);
        const stats = statsResult.rows[0];
        
        console.log('📊 Statistiques brutes:', stats);

        // Calculer le taux de réussite
        const totalProcessed = parseInt(stats.approved_campaigns) + parseInt(stats.rejected_campaigns);
        const completionRate = totalProcessed > 0 ? Math.round((parseInt(stats.approved_campaigns) / totalProcessed) * 100) : 0;

        const statistics = {
            // Métriques de campagnes
            totalCampaigns: parseInt(stats.total_campaigns) || 0,
            pendingCampaigns: parseInt(stats.pending_campaigns) || 0,
            approvedCampaigns: parseInt(stats.approved_campaigns) || 0,
            rejectedCampaigns: parseInt(stats.rejected_campaigns) || 0,
            inProgressCampaigns: parseInt(stats.in_progress_campaigns) || 0,
            completedCampaigns: parseInt(stats.completed_campaigns) || 0,
            completionRate: completionRate,
            
            // Métriques d'exécution des campagnes
            totalCompanies: parseInt(stats.total_companies) || 0,
            totalDeposed: parseInt(stats.total_deposed) || 0,
            totalSent: parseInt(stats.total_sent) || 0,
            totalConverted: parseInt(stats.total_converted) || 0,
            totalNotConverted: parseInt(stats.total_not_converted) || 0,
            totalPendingExecution: parseInt(stats.total_pending_execution) || 0,
            
            // Taux de performance
            avgExecutionRate: parseFloat(stats.avg_execution_rate) || 0,
            avgConversionRate: parseFloat(stats.avg_conversion_rate) || 0,
            
            // Calculs dérivés
            executionRate: stats.total_companies > 0 ? Math.round((parseInt(stats.total_deposed) + parseInt(stats.total_sent)) / parseInt(stats.total_companies) * 100) : 0,
            conversionRate: stats.total_companies > 0 ? Math.round(parseInt(stats.total_converted) / parseInt(stats.total_companies) * 100) : 0,
            deposedRate: stats.total_companies > 0 ? Math.round(parseInt(stats.total_deposed) / parseInt(stats.total_companies) * 100) : 0,
            sentRate: stats.total_companies > 0 ? Math.round(parseInt(stats.total_sent) / parseInt(stats.total_companies) * 100) : 0
        };
        
        console.log('📊 Statistiques finales:', statistics);

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json({
            success: true,
            data: {
                campaigns: campaigns,
                statistics: statistics
            }
        });

    } catch (error) {
        console.error('Erreur génération rapport:', error);
        res.status(500).json({
            success: false,
            error: `Erreur lors de la génération du rapport: ${error.message}`,
            details: error.stack
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
        
        // Vérifier que l'utilisateur est le créateur de la campagne
        const campaign = await ProspectingCampaign.findByIdWithDetails(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'Campagne non trouvée'
            });
        }
        
        // Vérifier les autorisations
        const auth = await checkCampaignAuthorization(campaignId, userId);
        if (!auth.authorized) {
            console.log('🔍 [DEBUG] Vérification autorisation:', {
                campaign_created_by: auth.campaign?.created_by,
                current_user_id: userId,
                is_creator: auth.isCreator,
                is_manager: auth.isManager
            });
            return res.status(403).json({
                success: false,
                error: auth.error || 'Vous n\'êtes pas autorisé à soumettre cette campagne'
            });
        }
        
        // Soumettre la campagne pour validation
        const result = await ProspectingCampaign.submitForValidation(campaignId, userId, 'BUSINESS_UNIT', 'Soumission automatique');
        
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
 * PUT /api/prospecting/campaigns/:campaignId/companies/:companyId/execution
 * Mettre à jour le statut d'exécution d'une entreprise dans une campagne
 */
router.put('/campaigns/:campaignId/companies/:companyId/execution', authenticateToken, executionUpload.single('executionFile'), async (req, res) => {
    try {
        const { campaignId, companyId } = req.params;
        const executionStatus = req.body.executionStatus;
        const notes = req.body.notes;
        const userId = req.user.id;
        
        console.log('🔍 [DEBUG] Données reçues:', {
            executionStatus,
            notes,
            userId,
            body: req.body,
            file: req.file
        });
        
        if (!executionStatus || !['pending_execution', 'deposed', 'sent', 'failed'].includes(executionStatus)) {
            return res.status(400).json({
                success: false,
                error: 'Statut d\'exécution invalide'
            });
        }
        
        // Vérifier les autorisations
        const auth = await checkCampaignAuthorization(campaignId, userId);
        if (!auth.authorized) {
            console.log('🔍 [DEBUG] Vérification autorisation exécution:', {
                campaign_created_by: auth.campaign?.created_by,
                current_user_id: userId,
                is_creator: auth.isCreator,
                is_manager: auth.isManager
            });
            return res.status(403).json({
                success: false,
                error: auth.error || 'Vous n\'êtes pas autorisé à exécuter cette campagne'
            });
        }
        
        // Gérer l'upload de fichier si présent
        let executionFile = null;
        if (req.file) {
            executionFile = req.file.filename;
            console.log(`📁 Fichier sauvegardé: ${executionFile}`);
        }
        
        const result = await ProspectingCampaign.updateCompanyExecutionStatus(campaignId, companyId, executionStatus, notes, executionFile);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Statut d\'exécution mis à jour avec succès',
                execution_file: result.execution_file
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Erreur mise à jour exécution:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du statut d\'exécution'
        });
    }
});

/**
 * POST /api/prospecting/campaigns/:campaignId/companies/:companyId/convert
 * Convertir une entreprise en opportunité
 */
router.post('/campaigns/:campaignId/companies/:companyId/convert', authenticateToken, async (req, res) => {
    try {
        const { campaignId, companyId } = req.params;
        const opportunityData = req.body;
        const userId = req.user.id;
        
        const result = await ProspectingCampaign.convertToOpportunity(campaignId, companyId, opportunityData);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Entreprise convertie en opportunité avec succès',
                opportunityId: result.opportunityId
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Erreur conversion opportunité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la conversion en opportunité'
        });
    }
});

/**
 * GET /api/prospecting/campaigns/:id/validators
 * Récupérer les validateurs assignés à une campagne
 */
router.get('/campaigns/:id/validators', authenticateToken, async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user.id;
        
        const validators = await ProspectingCampaign.getCampaignValidators(campaignId);
        
        res.json({
            success: true,
            data: validators
        });
    } catch (error) {
        console.error('Erreur récupération validateurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des validateurs'
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


