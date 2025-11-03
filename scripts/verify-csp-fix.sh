#!/bin/bash

# Script de vérification post-déploiement
# Vérifie que les corrections CSP fonctionnent

echo "🔍 Vérification des corrections CSP..."

# Vérifier que le serveur répond
echo "📡 Test de l'API Health..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "   ✅ API Health: OK"
else
    echo "   ❌ API Health: ERREUR"
    exit 1
fi

# Vérifier la configuration CSP
echo "🔒 Test de la configuration CSP..."
response=$(curl -s -I http://localhost:3000/api/health | grep -i "content-security-policy")
if echo "$response" | grep -q "connect-src"; then
    echo "   ✅ CSP connect-src configuré"
else
    echo "   ❌ CSP connect-src manquant"
fi

if echo "$response" | grep -q "cdnjs.cloudflare.com"; then
    echo "   ✅ CSP cdnjs.cloudflare.com autorisé"
else
    echo "   ❌ CSP cdnjs.cloudflare.com manquant"
fi

# Test de l'API campagnes (nécessite un token valide)
echo "📊 Test de l'API campagnes..."
if curl -s http://localhost:3000/api/prospecting/campaigns > /dev/null; then
    echo "   ✅ API Campagnes: Accessible"
else
    echo "   ⚠️ API Campagnes: Nécessite authentification"
fi

echo "🎉 Vérification terminée"

















