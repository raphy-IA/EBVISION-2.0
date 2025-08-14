-- Migration 062: Structures de prospection (sources, entreprises, modèles, campagnes)
-- Date: 2025-08-14

-- 1) Sources d'entreprises
CREATE TABLE IF NOT EXISTS company_sources (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(150) NOT NULL UNIQUE,
	description TEXT,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_company_sources_updated_at
	BEFORE UPDATE ON company_sources
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- 2) Entreprises
CREATE TABLE IF NOT EXISTS companies (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	source_id UUID REFERENCES company_sources(id) ON DELETE SET NULL,
	name VARCHAR(200) NOT NULL,
	industry VARCHAR(100),
	email VARCHAR(150),
	phone VARCHAR(50),
	website VARCHAR(200),
	country VARCHAR(80),
	city VARCHAR(100),
	address TEXT,
	siret VARCHAR(20),
	size_label VARCHAR(50),
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_source ON companies(source_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

CREATE TRIGGER update_companies_updated_at
	BEFORE UPDATE ON companies
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- 3) Modèles de courrier de campagne (liés à BU/Division)
CREATE TABLE IF NOT EXISTS prospecting_templates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(150) NOT NULL,
	channel VARCHAR(20) NOT NULL CHECK (channel IN ('PHYSIQUE','EMAIL')),
	type_courrier VARCHAR(40) NOT NULL CHECK (type_courrier IN ('PRESENTATION_GENERALE','SERVICE_SPECIFIQUE')),
	business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
	division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
	subject VARCHAR(200),
	body_template TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prospecting_templates_bu ON prospecting_templates(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_prospecting_templates_div ON prospecting_templates(division_id);

CREATE TRIGGER update_prospecting_templates_updated_at
	BEFORE UPDATE ON prospecting_templates
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- 4) Campagnes de prospection
CREATE TABLE IF NOT EXISTS prospecting_campaigns (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(150) NOT NULL,
	channel VARCHAR(20) NOT NULL CHECK (channel IN ('PHYSIQUE','EMAIL')),
	template_id UUID REFERENCES prospecting_templates(id) ON DELETE SET NULL,
	business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
	division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','SENT','ARCHIVED')),
	scheduled_date DATE,
	created_by UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_bu ON prospecting_campaigns(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_div ON prospecting_campaigns(division_id);

CREATE TRIGGER update_prospecting_campaigns_updated_at
	BEFORE UPDATE ON prospecting_campaigns
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- 5) Rattachement entreprises ↔ campagnes
CREATE TABLE IF NOT EXISTS prospecting_campaign_companies (
	campaign_id UUID NOT NULL REFERENCES prospecting_campaigns(id) ON DELETE CASCADE,
	company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
	status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','BOUNCED','REPLIED','UNDELIVERABLE')),
	sent_at TIMESTAMPTZ,
	response_at TIMESTAMPTZ,
	notes TEXT,
	PRIMARY KEY (campaign_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_pcc_campaign ON prospecting_campaign_companies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pcc_company ON prospecting_campaign_companies(company_id);

-- 6) Imports par source (métadonnées)
CREATE TABLE IF NOT EXISTS company_imports (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	source_id UUID NOT NULL REFERENCES company_sources(id) ON DELETE CASCADE,
	file_name VARCHAR(255) NOT NULL,
	file_path VARCHAR(500) NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','PROCESSED','FAILED')),
	stats JSONB,
	uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
	processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_company_imports_source ON company_imports(source_id);


