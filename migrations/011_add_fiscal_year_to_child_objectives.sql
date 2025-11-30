-- Add fiscal_year_id to child objective tables to support autonomous objectives

-- business_unit_objectives
ALTER TABLE business_unit_objectives 
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id);

-- division_objectives
ALTER TABLE division_objectives 
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id);

-- grade_objectives
ALTER TABLE grade_objectives 
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id);

-- individual_objectives
ALTER TABLE individual_objectives 
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id);
