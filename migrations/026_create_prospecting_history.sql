-- Create table for tracking campaign execution history
CREATE TABLE IF NOT EXISTS prospecting_campaign_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES prospecting_campaigns(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'SENT', 'UPDATE', 'REMINDER', 'CONVERSION'
    action_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT,
    attachment_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster retrieval of history by company
CREATE INDEX IF NOT EXISTS idx_prospecting_history_campaign_company ON prospecting_campaign_history(campaign_id, company_id);
CREATE INDEX IF NOT EXISTS idx_prospecting_history_date ON prospecting_campaign_history(action_date DESC);
