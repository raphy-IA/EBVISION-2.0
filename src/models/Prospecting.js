const { pool } = require('../utils/database');

class CompanySource {
    static async create({ name, description }) {
        const res = await pool.query(
            `INSERT INTO company_sources(name, description) VALUES ($1,$2) RETURNING *`,
            [name, description || null]
        );
        return res.rows[0];
    }
    static async findAll() {
        const res = await pool.query(`SELECT * FROM company_sources ORDER BY name`);
        return res.rows;
    }
}

class Company {
    static async bulkInsertFromRows(sourceId, rows) {
        let inserted = 0;
        for (const r of rows) {
            await pool.query(
                `INSERT INTO companies(source_id, name, industry, email, phone, website, country, city, address, siret, size_label)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT DO NOTHING`,
                [
                    sourceId,
                    r.name,
                    r.industry || null,
                    r.email || null,
                    r.phone || null,
                    r.website || null,
                    r.country || null,
                    r.city || null,
                    r.address || null,
                    r.siret || null,
                    r.size_label || null
                ]
            );
            inserted++;
        }
        return { inserted };
    }
    static async findBySource(sourceId) {
        const res = await pool.query(`SELECT * FROM companies WHERE source_id = $1 ORDER BY name`, [sourceId]);
        return res.rows;
    }

    static async search({ q, source_id, limit = 20, offset = 0 }) {
        const conditions = [];
        const params = [];
        let idx = 1;
        if (q) {
            conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR website ILIKE $${idx})`);
            params.push(`%${q}%`);
            idx++;
        }
        if (source_id) {
            conditions.push(`source_id = $${idx}`);
            params.push(source_id);
            idx++;
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const count = await pool.query(`SELECT COUNT(*)::int AS total FROM companies ${where}`, params);
        const data = await pool.query(
            `SELECT * FROM companies ${where} ORDER BY name LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, offset]
        );
        return { companies: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }
}

class ProspectingTemplate {
    static async create(data) {
        const res = await pool.query(
            `INSERT INTO prospecting_templates(name, channel, type_courrier, business_unit_id, division_id, subject, body_template)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                data.name,
                data.channel,
                data.type_courrier,
                data.business_unit_id || null,
                data.division_id || null,
                data.subject || null,
                data.body_template
            ]
        );
        return res.rows[0];
    }
    static async findAll() {
        const res = await pool.query(`SELECT * FROM prospecting_templates ORDER BY created_at DESC`);
        return res.rows;
    }

    static async findById(id) {
        const res = await pool.query(`SELECT * FROM prospecting_templates WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }

    static async update(id, data) {
        const allowed = ['name','channel','type_courrier','business_unit_id','division_id','subject','body_template'];
        const sets = [];
        const vals = [];
        let idx = 1;
        for (const k of allowed) {
            if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
        }
        if (sets.length === 0) return this.findById(id);
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        vals.push(id);
        const res = await pool.query(`UPDATE prospecting_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        return res.rows[0] || null;
    }
}

class ProspectingCampaign {
    static async create(data) {
        const res = await pool.query(
            `INSERT INTO prospecting_campaigns(name, channel, template_id, business_unit_id, division_id, status, scheduled_date, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [
                data.name,
                data.channel,
                data.template_id || null,
                data.business_unit_id || null,
                data.division_id || null,
                data.status || 'DRAFT',
                data.scheduled_date || null,
                data.created_by || null
            ]
        );
        return res.rows[0];
    }
    static async addCompanies(campaignId, companyIds) {
        const values = [];
        const placeholders = [];
        let idx = 1;
        for (const id of companyIds) {
            placeholders.push(`($${idx++}, $${idx++})`);
            values.push(campaignId, id);
        }
        if (values.length === 0) return { inserted: 0 };
        await pool.query(
            `INSERT INTO prospecting_campaign_companies(campaign_id, company_id)
             VALUES ${placeholders.join(', ')}
             ON CONFLICT DO NOTHING`,
            values
        );
        return { inserted: companyIds.length };
    }

    static async findAll({ limit = 20, offset = 0 }) {
        const count = await pool.query(`SELECT COUNT(*)::int AS total FROM prospecting_campaigns`);
        const data = await pool.query(
            `SELECT pc.*, 
                    COALESCE(cnt.total,0)::int AS companies_count
             FROM prospecting_campaigns pc
             LEFT JOIN (
               SELECT campaign_id, COUNT(*) AS total 
               FROM prospecting_campaign_companies 
               GROUP BY campaign_id
             ) cnt ON cnt.campaign_id = pc.id
             ORDER BY pc.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return { campaigns: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async findById(id) {
        const res = await pool.query(
            `SELECT pc.*, 
                    COALESCE(cnt.total,0)::int AS companies_count
             FROM prospecting_campaigns pc
             LEFT JOIN (
               SELECT campaign_id, COUNT(*) AS total 
               FROM prospecting_campaign_companies 
               GROUP BY campaign_id
             ) cnt ON cnt.campaign_id = pc.id
             WHERE pc.id = $1`,
            [id]
        );
        return res.rows[0] || null;
    }

    static async getCompanies(id, { limit = 50, offset = 0 }) {
        const count = await pool.query(
            `SELECT COUNT(*)::int AS total FROM prospecting_campaign_companies WHERE campaign_id = $1`,
            [id]
        );
        const data = await pool.query(
            `SELECT c.*, pcc.status, pcc.sent_at, pcc.response_at
             FROM prospecting_campaign_companies pcc
             JOIN companies c ON c.id = pcc.company_id
             WHERE pcc.campaign_id = $1
             ORDER BY c.name
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );
        return { companies: data.rows, pagination: { total: count.rows[0].total, limit, offset } };
    }

    static async update(id, data) {
        const allowed = ['name','channel','template_id','business_unit_id','division_id','status','scheduled_date'];
        const sets = [];
        const vals = [];
        let idx = 1;
        for (const k of allowed) {
            if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
        }
        if (sets.length === 0) return this.findById(id);
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        vals.push(id);
        const res = await pool.query(`UPDATE prospecting_campaigns SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        return res.rows[0] || null;
    }
}

module.exports = { CompanySource, Company, ProspectingTemplate, ProspectingCampaign };


