#!/bin/bash

echo "🧹 Organisation des fichiers pour la production (Bash)..."
echo ""

# Créer le dossier development-scripts s'il n'existe pas
if [ ! -d "development-scripts" ]; then
    mkdir development-scripts
    echo "✅ Dossier development-scripts créé"
fi

# Créer le dossier docs s'il n'existe pas
if [ ! -d "docs" ]; then
    mkdir docs
    echo "✅ Dossier docs créé"
fi

echo ""
echo "📦 Déplacement des fichiers de développement..."

# Déplacer les fichiers de test et debug
echo "   Déplacement des scripts de test..."
for file in test-*.js check-*.js debug-*.js verify-*.js fix-*.js add-*.js create-*.js run-*.js clean-*.js restore-*.js force-*.js quick-*.js simulate-*.js find-*.js send-*.js setup-*.js diagnostic-*.js; do
    if [ -f "$file" ]; then
        mv "$file" development-scripts/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

# Déplacer les fichiers de documentation de développement
echo "   Déplacement de la documentation de développement..."
for file in GUIDE_*.md RESOLUTION_*.md RESUME_*.md AMELIORATIONS_*.md OPTIMISATIONS_*.md FONCTIONNALITE_*.md COMMENT_*.md CORRECTIONS_*.md GESTION_*.md RAPPORT_*.md REPRISE_*.md NETTOYAGE_*.md TEST_*.md; do
    if [ -f "$file" ]; then
        mv "$file" docs/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

# Déplacer les fichiers de configuration temporaires
echo "   Déplacement des fichiers de configuration temporaires..."
for file in .env.example .env.local .gitignore.production; do
    if [ -f "$file" ]; then
        mv "$file" development-scripts/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

# Déplacer les fichiers SQL
echo "   Déplacement des fichiers SQL..."
for file in *.sql; do
    if [ -f "$file" ]; then
        mv "$file" development-scripts/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

# Déplacer les fichiers de test spécifiques
echo "   Déplacement des fichiers de test spécifiques..."
for file in test-*.md test-*.png test-*.json; do
    if [ -f "$file" ]; then
        mv "$file" development-scripts/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

# Déplacer les fichiers de configuration Docker
echo "   Déplacement des fichiers Docker..."
for file in Dockerfile docker-compose.yml; do
    if [ -f "$file" ]; then
        mv "$file" development-scripts/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

# Déplacer les fichiers de configuration temporaires
echo "   Déplacement des fichiers de configuration temporaires..."
for file in env.example; do
    if [ -f "$file" ]; then
        mv "$file" development-scripts/ 2>/dev/null && echo "   ✅ Déplacé: $file"
    fi
done

echo ""
echo "📁 Structure finale de production :"
echo ""

# Afficher les fichiers restants
echo "📄 Fichiers de production restants :"
for file in *; do
    if [ -f "$file" ]; then
        echo "   - $file"
    fi
done

echo ""
echo "📂 Dossiers :"
for dir in */; do
    if [ -d "$dir" ]; then
        echo "   - $dir"
    fi
done

echo ""
echo "🎉 Organisation terminée !"
echo ""
echo "📋 Fichiers de production essentiels :"
echo "   ✅ server.js"
echo "   ✅ package.json"
echo "   ✅ config.production.js"
echo "   ✅ install.sh"
echo "   ✅ install-nodejs-nvm.sh"
echo "   ✅ check-prerequisites.sh"
echo "   ✅ DEPLOYMENT.md"
echo "   ✅ README.md"
echo ""
echo "🚀 Vous pouvez maintenant installer Node.js et l'application !"










