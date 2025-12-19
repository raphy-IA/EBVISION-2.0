-- Add default_folder_structure column to mission_types table
ALTER TABLE mission_types 
ADD COLUMN IF NOT EXISTS default_folder_structure JSONB DEFAULT '[]'::jsonb;

-- Update existing mission types with the default structure (Example based)
UPDATE mission_types 
SET default_folder_structure = '[
  {
    "name": "01_ADMINISTRATIF",
    "type": "folder",
    "children": [
      {"name": "Contrat de mission", "type": "file"},
      {"name": "KYC & Conformité", "type": "file"},
      {"name": "Lettre de mission", "type": "file"}
    ]
  },
  {
    "name": "02_TECHNIQUE",
    "type": "folder",
    "children": [
      {"name": "Travaux Préparatoires", "type": "folder", "children": []},
      {"name": "Feuilles de Maîtresse", "type": "folder", "children": []},
      {"name": "Correspondances", "type": "folder", "children": []}
    ]
  },
  {
    "name": "03_LIVRABLES",
    "type": "folder",
    "children": [
      {"name": "Rapports provisoires", "type": "file"},
      {"name": "Rapport final", "type": "file"}
    ]
  },
  {
    "name": "04_FACTURATION",
    "type": "folder",
    "children": [
      {"name": "Factures émises", "type": "file"},
      {"name": "Notes de frais", "type": "file"}
    ]
  }
]'::jsonb
WHERE default_folder_structure IS NULL OR default_folder_structure = '[]'::jsonb;
