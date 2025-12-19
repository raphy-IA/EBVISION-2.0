-- Migration: Fix default folder structure (Convert files to folders for major categories)
-- Date: 2025-12-19
-- Description: Convertit les éléments administratifs et livrables (Contrat, KYC, Rapports) en DOSSIERS conteneurs.

UPDATE mission_types 
SET default_folder_structure = '[
  {
    "name": "01_ADMINISTRATIF",
    "type": "folder",
    "children": [
      {"name": "Contrat de mission", "type": "folder", "children": []},
      {"name": "KYC & Conformité", "type": "folder", "children": []},
      {"name": "Lettre de mission", "type": "folder", "children": []}
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
      {"name": "Rapports provisoires", "type": "folder", "children": []},
      {"name": "Rapport final", "type": "folder", "children": []}
    ]
  },
  {
    "name": "04_FACTURATION",
    "type": "folder",
    "children": [
      {"name": "Factures émises", "type": "folder", "children": []},
      {"name": "Notes de frais", "type": "folder", "children": []}
    ]
  }
]'::jsonb
WHERE default_folder_structure IS NOT NULL;
