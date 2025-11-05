# 📝 Exemples d'Utilisation - Scripts Python Branding

## 🎯 configure_branding.py

### Exemple 1 : Mode Interactif (Recommandé)

```bash
$ python docs/Branding/Scripts/configure_branding.py

═══════════════════════════════════════════════════════════
        MODE INTERACTIF - CONFIGURATION BRANDING
═══════════════════════════════════════════════════════════

ℹ Configuration actuelle: default

═══════════════════════════════════════════════════════════
           CONFIGURATIONS DISPONIBLES
═══════════════════════════════════════════════════════════

ID                   Nom                                      Fichier
-------------------- ---------------------------------------- ------------------------------
default              ENTERPRISE WORKFLOW MANAGEMENT           default.json
demo                 ENTERPRISE WORKFLOW MANAGEMENT           demo.json
eb-vision-2          EB-VISION 2.0                           eb-vision-2.json


OPTIONS:
  • Entrez l'ID d'une configuration existante
  • Entrez un nouveau nom pour créer une configuration
  • Tapez 'new' pour créer avec assistant
  • Tapez 'q' pour quitter

Votre choix: mon-entreprise

ℹ Configuration 'mon-entreprise' introuvable
Voulez-vous la créer? (o/N): o

═══════════════════════════════════════════════════════════
        CRÉATION D'UNE NOUVELLE CONFIGURATION
═══════════════════════════════════════════════════════════

ℹ Nouvelle configuration: mon-entreprise

Nom de l'application (ex: MON ENTREPRISE): ACME Corporation
Slogan (ex: Solution de Gestion): Solutions Innovantes pour l'Entreprise
Couleur primaire (hex, ex: #2c3e50) [Enter pour défaut]: #1e3a8a

✓ Configuration créée avec succès!
ℹ Fichier: config/branding/mon-entreprise.json
ℹ Nom: ACME Corporation
ℹ Slogan: Solutions Innovantes pour l'Entreprise
ℹ Couleur: #1e3a8a

⚠ N'oubliez pas de personnaliser le fichier JSON si nécessaire!
ℹ   Éditez: config/branding/mon-entreprise.json
✓ Dossier assets créé: public/assets/brands/mon-entreprise/

✓ Configuration mise à jour dans .env
ℹ Ancienne configuration: default
ℹ Nouvelle configuration: mon-entreprise
ℹ Nom de l'application: ACME Corporation
```

---

### Exemple 2 : Activation Configuration Existante (Ligne de Commande)

```bash
$ python docs/Branding/Scripts/configure_branding.py eb-vision-2

═══════════════════════════════════════════════════════════
        CONFIGURATION BRANDING - EB-VISION 2.0
═══════════════════════════════════════════════════════════

ℹ Configuration demandée: eb-vision-2

✓ Configuration mise à jour dans .env
ℹ Ancienne configuration: default
ℹ Nouvelle configuration: eb-vision-2
ℹ Nom de l'application: EB-VISION 2.0

═══════════════════════════════════════════════════════════
                   PROCHAINES ÉTAPES
═══════════════════════════════════════════════════════════

1. Redémarrer le serveur
   → npm restart

2. Vider le cache du navigateur
   → Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)

3. Tester l'application
   → http://localhost:3000

4. Vérifier la configuration
   → python docs/Branding/Scripts/verify_branding.py

Voulez-vous redémarrer le serveur maintenant? (o/N): o
```

---

### Exemple 3 : Créer Nouvelle Configuration (Ligne de Commande)

```bash
$ python docs/Branding/Scripts/configure_branding.py techvision-pro

═══════════════════════════════════════════════════════════
        CONFIGURATION BRANDING - EB-VISION 2.0
═══════════════════════════════════════════════════════════

ℹ Configuration demandée: techvision-pro

⚠ Configuration 'techvision-pro' introuvable
Voulez-vous la créer? (o/N): o

═══════════════════════════════════════════════════════════
        CRÉATION D'UNE NOUVELLE CONFIGURATION
═══════════════════════════════════════════════════════════

ℹ Nouvelle configuration: techvision-pro

Nom de l'application (ex: MON ENTREPRISE): TechVision Pro
Slogan (ex: Solution de Gestion): Votre Partenaire Technologique
Couleur primaire (hex, ex: #2c3e50) [Enter pour défaut]: #7c3aed

✓ Configuration créée avec succès!
✓ Configuration mise à jour dans .env
✓ Dossier assets créé
```

---

### Exemple 4 : Mode Création Assistée

```bash
$ python docs/Branding/Scripts/configure_branding.py --new

Entrez l'ID de la nouvelle configuration
(ex: mon-client, entreprise-abc): startup-innov

═══════════════════════════════════════════════════════════
        CRÉATION D'UNE NOUVELLE CONFIGURATION
═══════════════════════════════════════════════════════════

Nom de l'application (ex: MON ENTREPRISE): Startup Innovation
Slogan (ex: Solution de Gestion): L'Innovation au Service de la Croissance
Couleur primaire (hex, ex: #2c3e50) [Enter pour défaut]: #059669

✓ Configuration créée avec succès!
```

---

### Exemple 5 : Lister Toutes les Configurations

```bash
$ python docs/Branding/Scripts/configure_branding.py --list

═══════════════════════════════════════════════════════════
           CONFIGURATIONS DISPONIBLES
═══════════════════════════════════════════════════════════

ID                   Nom                                      Fichier
-------------------- ---------------------------------------- ------------------------------
default              ENTERPRISE WORKFLOW MANAGEMENT           default.json
demo                 ENTERPRISE WORKFLOW MANAGEMENT           demo.json
eb-vision-2          EB-VISION 2.0                           eb-vision-2.json
mon-entreprise       ACME Corporation                         mon-entreprise.json
startup-innov        Startup Innovation                       startup-innov.json
techvision-pro       TechVision Pro                          techvision-pro.json
```

---

## 🔍 verify_branding.py

### Exemple 1 : Vérification Standard

```bash
$ python docs/Branding/Scripts/verify_branding.py

═══════════════════════════════════════════════════════════
        VÉRIFICATION COMPLÈTE DU BRANDING
═══════════════════════════════════════════════════════════

Date: 2024-11-02 16:45:30
Système: Windows 10
Python: 3.11.0
Répertoire: D:\Projects\EB-Vision 2.0

1. STRUCTURE DU PROJET
────────────────────────────────────────────
✓ package.json trouvé
✓ Dossier config/branding/ existe
✓ Services backend: src/services
✓ Routes API: src/routes
✓ JavaScript frontend: public/js
✓ Assets de branding: public/assets/brands

2. FICHIER .ENV
────────────────────────────────────────────
✓ Fichier .env existe
✓ BRAND_CONFIG trouvé: mon-entreprise

3. FICHIER DE CONFIGURATION
────────────────────────────────────────────
✓ Fichier de configuration existe: mon-entreprise.json
✓ JSON valide
✓ ID: ✓
✓ Nom de l'application: ✓
✓ Slogan: ✓
✓ Couleurs: ✓
✓ Footer: ✓
✓ Toutes les couleurs définies (6)

4. ASSETS DE BRANDING
────────────────────────────────────────────
✓ Dossier assets existe: mon-entreprise/

5. FICHIERS SOURCE
────────────────────────────────────────────
✓ Service backend: src/services/brandingService.js
✓ Routes API: src/routes/branding.js
✓ Loader frontend: public/js/branding-loader.js
✓ Branding sidebar: public/js/sidebar-branding.js
✓ Variables CSS: config/themes/brand-variables.css

6. SERVEUR NODE.JS
────────────────────────────────────────────
✓ Serveur Node.js en cours d'exécution

7. API DE BRANDING
────────────────────────────────────────────
✓ API accessible (HTTP 200)
✓ Nom de l'application: ACME Corporation
✓ ✓ Configuration correcte!

8. DOCUMENTATION
────────────────────────────────────────────
✓ Index principal: ✓
✓ Démarrage rapide: ✓
✓ Référence rapide: ✓
✓ Guide démarrage: ✓
✓ Guide configurations: ✓

═══════════════════════════════════════════════════════════
              RÉSUMÉ DE LA VÉRIFICATION
═══════════════════════════════════════════════════════════

✓ Succès: 28
⚠ Avertissements: 0
✗ Erreurs: 0

RECOMMANDATIONS:
✅ Tout est parfaitement configuré!

STATUT GLOBAL: EXCELLENT ✓
```

---

### Exemple 2 : Mode Verbeux

```bash
$ python docs/Branding/Scripts/verify_branding.py --verbose

[Sortie détaillée avec toutes les informations]
ℹ   Chemin: D:\Projects\EB-Vision 2.0\package.json
ℹ   5 configurations trouvées
ℹ   Chemin: D:\Projects\EB-Vision 2.0\.env
ℹ   Valeur: ACME Corporation
ℹ   Taille: 1250 bytes
ℹ   PID(s): 15234
ℹ   ID: mon-entreprise
ℹ   Tagline: Solutions Innovantes pour l'Entreprise
...
```

---

### Exemple 3 : Avec Correction Automatique

```bash
$ python docs/Branding/Scripts/verify_branding.py --fix

[La vérification détecte un problème]
✗ BRAND_CONFIG non défini dans .env
ℹ Ajout de BRAND_CONFIG=default...
✓ BRAND_CONFIG ajouté

[Le script crée automatiquement les fichiers manquants]
ℹ Création du dossier assets...
✓ Dossier créé: public/assets/brands/default

[Continue la vérification]
✓ Tout est maintenant configuré correctement
```

---

## 🎯 Scénarios Courants

### Scénario 1 : Premier Déploiement

```bash
# 1. Créer la configuration
python docs/Branding/Scripts/configure_branding.py

# 2. Choisir 'new' et entrer les informations
# 3. Vérifier que tout est OK
python docs/Branding/Scripts/verify_branding.py --fix

# 4. Redémarrer
npm restart
```

---

### Scénario 2 : Nouveau Client

```bash
# 1. Créer directement
python docs/Branding/Scripts/configure_branding.py client-xyz

# 2. Confirmer la création quand demandé
# 3. Personnaliser si nécessaire
code config/branding/client-xyz.json

# 4. Vérifier
python docs/Branding/Scripts/verify_branding.py
```

---

### Scénario 3 : Changer de Configuration

```bash
# 1. Lister les configurations disponibles
python docs/Branding/Scripts/configure_branding.py --list

# 2. Activer la configuration souhaitée
python docs/Branding/Scripts/configure_branding.py eb-vision-2

# 3. Redémarrer le serveur
npm restart
```

---

### Scénario 4 : Dépannage

```bash
# 1. Vérification complète
python docs/Branding/Scripts/verify_branding.py --verbose > rapport.txt

# 2. Consulter le rapport
cat rapport.txt

# 3. Corriger automatiquement
python docs/Branding/Scripts/verify_branding.py --fix

# 4. Re-vérifier
python docs/Branding/Scripts/verify_branding.py
```

---

## 💡 Astuces

### Astuce 1 : Créer Plusieurs Configurations Rapidement

```bash
# Créer avec assistant
python docs/Branding/Scripts/configure_branding.py --new

# Répéter pour chaque client
```

### Astuce 2 : Tester une Configuration Sans L'Activer

```bash
# Créer sans activer (Ctrl+C après création)
python docs/Branding/Scripts/configure_branding.py test-config
# [Entrer les infos]
# [Ctrl+C quand demandé de redémarrer]
```

### Astuce 3 : Vérification Automatique dans un Script

```bash
#!/bin/bash
# deploy.sh

echo "Déploiement de la configuration..."
python docs/Branding/Scripts/configure_branding.py $1

if python docs/Branding/Scripts/verify_branding.py; then
    echo "✓ Configuration OK - Déploiement"
    npm restart
else
    echo "✗ Erreurs détectées - Annulation"
    exit 1
fi
```

---

**Version** : 1.0  
**Date** : 2 novembre 2024

📝 **Exemples pratiques. Cas d'usage réels. Guide complet.**



