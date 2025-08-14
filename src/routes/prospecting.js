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
    const created = await CompanySource.create({ name: req.body.name, description: req.body.description });
    res.status(201).json({ success: true, data: created });
});

// Upload fichier d'une source (CSV/Excel support minimal CSV ici)
router.post('/sources/:sourceId/import', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' });
        // Parser CSV simple (séparateur ',')
        const content = fs.readFileSync(req.file.path, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        const header = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const rows = lines.map(l => {
            const cols = l.split(',');
            const obj = {};
            header.forEach((h, i) => obj[h] = (cols[i] || '').trim());
            return {
                name: obj.name || obj.nom || '',
                industry: obj.industry || obj.secteur || null,
                email: obj.email || null,
                phone: obj.phone || obj.telephone || null,
                website: obj.website || null,
                country: obj.country || obj.pays || null,
                city: obj.city || obj.ville || null,
                address: obj.address || obj.adresse || null,
                siret: obj.siret || null,
                size_label: obj.size || obj.effectif || null
            };
        }).filter(r => r.name);

        const result = await Company.bulkInsertFromRows(req.params.sourceId, rows);
        res.json({ success: true, message: 'Import réalisé', data: { inserted: result.inserted } });
    } catch (e) {
        console.error('Import entreprises échoué:', e);
        res.status(500).json({ success: false, error: 'Import échoué', details: e.message });
    }
});

router.get('/sources/:sourceId/companies', authenticateToken, async (req, res) => {
    const list = await Company.findBySource(req.params.sourceId);
    res.json({ success: true, data: list });
});

router.get('/companies/search', authenticateToken, async (req, res) => {
    const { q, source_id, limit, offset } = req.query;
    const result = await Company.search({ q, source_id, limit: parseInt(limit)||20, offset: parseInt(offset)||0 });
    res.json({ success: true, data: result.companies, pagination: result.pagination });
});

// Templates de campagne
router.get('/templates', authenticateToken, async (req, res) => {
    const list = await ProspectingTemplate.findAll();
    res.json({ success: true, data: list });
});

router.post('/templates', authenticateToken, async (req, res) => {
    const created = await ProspectingTemplate.create(req.body);
    res.status(201).json({ success: true, data: created });
});

router.put('/templates/:id', authenticateToken, async (req, res) => {
    const updated = await ProspectingTemplate.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
});

// Campagnes
router.post('/campaigns', authenticateToken, async (req, res) => {
    const created = await ProspectingCampaign.create({ ...req.body, created_by: req.user.id });
    res.status(201).json({ success: true, data: created });
});

router.post('/campaigns/:id/companies', authenticateToken, async (req, res) => {
    const { company_ids } = req.body;
    if (!Array.isArray(company_ids) || company_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'company_ids requis' });
    }
    const result = await ProspectingCampaign.addCompanies(req.params.id, company_ids);
    res.json({ success: true, data: result });
});

router.get('/campaigns', authenticateToken, async (req, res) => {
    const { limit, offset } = req.query;
    const result = await ProspectingCampaign.findAll({ limit: parseInt(limit)||20, offset: parseInt(offset)||0 });
    res.json({ success: true, data: result.campaigns, pagination: result.pagination });
});

router.get('/campaigns/:id', authenticateToken, async (req, res) => {
    const campaign = await ProspectingCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campagne non trouvée' });
    res.json({ success: true, data: campaign });
});

router.get('/campaigns/:id/companies', authenticateToken, async (req, res) => {
    const { limit, offset } = req.query;
    const result = await ProspectingCampaign.getCompanies(req.params.id, { limit: parseInt(limit)||50, offset: parseInt(offset)||0 });
    res.json({ success: true, data: result.companies, pagination: result.pagination });
});

router.put('/campaigns/:id', authenticateToken, async (req, res) => {
    const updated = await ProspectingCampaign.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
});

module.exports = router;


