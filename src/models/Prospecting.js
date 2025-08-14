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
}

module.exports = { CompanySource, Company, ProspectingTemplate, ProspectingCampaign };


