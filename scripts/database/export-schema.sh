#!/bin/bash

# Script pour exporter le schéma complet de la base de développement
# Usage: ./scripts/database/export-schema.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        EXPORT DU SCHÉMA DE LA BASE DE DÉVELOPPEMENT         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Charger les variables d'environnement
source .env 2>/dev/null || true

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-ewm_db}

echo "📋 Configuration:"
echo "   🏠 Hôte: $DB_HOST"
echo "   🔌 Port: $DB_PORT"
echo "   👤 User: $DB_USER"
echo "   🗄️  Base: $DB_NAME"
echo ""

OUTPUT_FILE="scripts/database/schema-complete.sql"

echo "📤 Export du schéma vers: $OUTPUT_FILE"
echo ""

# Exporter uniquement le schéma (structure, pas les données)
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --no-security-labels \
    --no-comments \
    -f "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Export réussi!"
    echo ""
    echo "📊 Statistiques:"
    wc -l "$OUTPUT_FILE"
    echo ""
    echo "✅ Vous pouvez maintenant utiliser: node scripts/database/init-from-schema.js"
else
    echo "❌ Erreur lors de l'export"
    exit 1
fi

