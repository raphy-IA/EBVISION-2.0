const fs = require('fs');
const path = require('path');

// Script pour corriger les problèmes de responsivité de la page collaborateurs
function fixCollaborateursResponsiveness() {
  console.log('🔧 Correction de la responsivité de la page collaborateurs...\n');
  
  try {
    const filePath = path.join(__dirname, '..', 'public', 'collaborateurs.html');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Fichier collaborateurs.html non trouvé');
      return;
    }
    
    console.log('📁 Lecture du fichier collaborateurs.html...');
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('🔧 Application des corrections de responsivité...');
    
    // 1. Améliorer les media queries pour une meilleure responsivité
    const improvedMediaQueries = `
        /* Améliorations de responsivité */
        @media (max-width: 1200px) {
            .main-content-area {
                padding: 1.5rem;
            }
            
            .stat-number {
                font-size: 2rem;
            }
        }
        
        @media (max-width: 992px) {
            .main-content-area {
                padding: 1rem;
            }
            
            .stat-card .card-body {
                padding: 1rem;
            }
            
            .stat-number {
                font-size: 1.8rem;
            }
            
            .table-responsive {
                font-size: 0.9rem;
            }
        }
        
        @media (max-width: 768px) {
            .page-wrapper {
                flex-direction: column;
            }
            
            .main-content-area {
                padding: 0.75rem;
            }
            
            .d-flex.justify-content-between {
                flex-direction: column;
                gap: 1rem;
            }
            
            .d-flex.justify-content-between h2 {
                margin-bottom: 0;
            }
            
            .stat-card .card-body {
                padding: 0.75rem;
            }
            
            .stat-number {
                font-size: 1.5rem;
            }
            
            .nav-tabs {
                flex-wrap: wrap;
            }
            
            .nav-tabs .nav-link {
                font-size: 0.9rem;
                padding: 0.5rem 0.75rem;
            }
            
            .table-responsive {
                font-size: 0.8rem;
            }
            
            .btn-group .btn {
                font-size: 0.8rem;
                padding: 0.25rem 0.5rem;
            }
            
            .modal-dialog {
                margin: 0.5rem;
                max-width: calc(100% - 1rem);
            }
            
            .form-control, .form-select {
                font-size: 0.9rem;
            }
        }
        
        @media (max-width: 576px) {
            .main-content-area {
                padding: 0.5rem;
            }
            
            .stat-card .card-body {
                padding: 0.5rem;
            }
            
            .stat-number {
                font-size: 1.2rem;
            }
            
            .stat-card i {
                font-size: 1.5rem !important;
            }
            
            .table-responsive {
                font-size: 0.75rem;
            }
            
            .btn {
                font-size: 0.8rem;
                padding: 0.375rem 0.75rem;
            }
            
            .modal-dialog {
                margin: 0.25rem;
                max-width: calc(100% - 0.5rem);
            }
            
            .form-control, .form-select {
                font-size: 0.85rem;
            }
            
            .collaborateur-avatar {
                width: 30px;
                height: 30px;
            }
        }
        
        /* Améliorations générales */
        .main-content-area {
            max-width: 100%;
            overflow-x: hidden;
        }
        
        .table-responsive {
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .card {
            margin-bottom: 1rem;
        }
        
        .stat-card {
            transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        /* Amélioration des filtres */
        .card .row {
            margin: 0;
        }
        
        .card .row > [class*="col-"] {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        
        /* Amélioration des boutons d'action */
        .btn-group .btn {
            white-space: nowrap;
        }
        
        @media (max-width: 768px) {
            .btn-group {
                flex-direction: column;
                width: 100%;
            }
            
            .btn-group .btn {
                border-radius: 0.375rem !important;
                margin-bottom: 0.25rem;
            }
            
            .btn-group .btn:last-child {
                margin-bottom: 0;
            }
        }
    `;
    
    // 2. Remplacer les media queries existantes
    const mediaQueryRegex = /@media \(max-width: 768px\) \{[\s\S]*?\}/g;
    content = content.replace(mediaQueryRegex, '');
    
    // 3. Ajouter les nouvelles media queries améliorées
    const styleEndRegex = /<\/style>/;
    content = content.replace(styleEndRegex, `${improvedMediaQueries}\n    </style>`);
    
    // 4. Améliorer la structure HTML pour la responsivité
    // Remplacer les colonnes fixes par des colonnes responsives
    content = content.replace(/col-md-3/g, 'col-lg-3 col-md-6 col-sm-12');
    content = content.replace(/col-md-4/g, 'col-lg-4 col-md-6 col-sm-12');
    content = content.replace(/col-md-6/g, 'col-lg-6 col-md-12');
    content = content.replace(/col-md-8/g, 'col-lg-8 col-md-12');
    content = content.replace(/col-md-12/g, 'col-12');
    
    // 5. Améliorer les boutons pour les petits écrans
    content = content.replace(
      /<button class="btn btn-primary" onclick="showNewCollaborateurModal\(\)">/g,
      '<button class="btn btn-primary w-100 w-md-auto" onclick="showNewCollaborateurModal()">'
    );
    
    // 6. Ajouter des classes responsives aux éléments critiques
    content = content.replace(
      /<div class="d-flex justify-content-between align-items-center mb-1">/g,
      '<div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">'
    );
    
    // 7. Améliorer les onglets pour les petits écrans
    content = content.replace(
      /<ul class="nav nav-tabs mb-2" id="collaborateursTabs" role="tablist">/g,
      '<ul class="nav nav-tabs nav-fill mb-3" id="collaborateursTabs" role="tablist">'
    );
    
    // 8. Ajouter des classes responsives aux cartes de statistiques
    content = content.replace(
      /<div class="row g-3 mb-3">/g,
      '<div class="row g-2 g-md-3 mb-3">'
    );
    
    // 9. Améliorer les filtres
    content = content.replace(
      /<div class="row">/g,
      '<div class="row g-2">'
    );
    
    // 10. Ajouter des classes responsives aux boutons d'export
    content = content.replace(
      /<button class="btn btn-outline-secondary" onclick="exportCollaborateurs\(\)">/g,
      '<button class="btn btn-outline-secondary w-100 w-md-auto" onclick="exportCollaborateurs()">'
    );
    
    // 11. Améliorer la responsivité des modales
    const modalRegex = /<div class="modal-dialog">/g;
    content = content.replace(modalRegex, '<div class="modal-dialog modal-dialog-scrollable">');
    
    // 12. Ajouter des classes responsives aux formulaires dans les modales
    content = content.replace(
      /<div class="row mb-3">/g,
      '<div class="row g-2 mb-3">'
    );
    
    // Sauvegarder le fichier modifié
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ Corrections appliquées avec succès !');
    console.log('');
    console.log('🔧 Améliorations apportées :');
    console.log('   - Media queries améliorées pour tous les écrans');
    console.log('   - Colonnes Bootstrap responsives (col-lg, col-md, col-sm)');
    console.log('   - Boutons adaptatifs (w-100 sur mobile, w-md-auto sur desktop)');
    console.log('   - Onglets en mode "nav-fill" pour une meilleure répartition');
    console.log('   - Espacement adaptatif (g-2 sur mobile, g-3 sur desktop)');
    console.log('   - Modales scrollables pour les petits écrans');
    console.log('   - Amélioration des filtres et formulaires');
    console.log('   - Transitions et effets hover pour une meilleure UX');
    console.log('');
    console.log('📱 La page est maintenant entièrement responsive !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  fixCollaborateursResponsiveness();
}

module.exports = { fixCollaborateursResponsiveness };





