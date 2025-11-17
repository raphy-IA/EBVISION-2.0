# 📁 Logos EB-Vision 2.0

## ℹ️ Ce Dossier Est Vide - C'EST NORMAL !

### ✅ L'Application Fonctionne Sans Logos

Par défaut, l'application utilise des **icônes FontAwesome** :
- Icône de l'œil : `<i class="fas fa-eye"></i>`
- Icône utilisateur : `<i class="fas fa-user-circle"></i>`

**Aucun fichier n'est nécessaire dans ce dossier pour que l'application fonctionne !**

---

## 🎨 Ajouter Vos Propres Logos (Optionnel)

Si vous voulez personnaliser avec vos propres logos :

### Fichiers Attendus

1. **logo.svg** (Recommandé : SVG)
   - Usage : Logo principal dans la sidebar
   - Taille recommandée : 200x60 px
   - Format : SVG (ou PNG transparent)

2. **icon.svg** (Recommandé : SVG)
   - Usage : Petite icône
   - Taille recommandée : 64x64 px
   - Format : SVG (ou PNG transparent)

3. **favicon.ico**
   - Usage : Favicon du navigateur
   - Taille : 32x32 ou 16x16 px
   - Format : ICO ou PNG

### Exemple de Structure

```
public/assets/brands/eb-vision/
├── logo.svg       (Logo principal)
├── icon.svg       (Petite icône)
└── favicon.ico    (Favicon)
```

---

## 🔧 Comment Ajouter Vos Logos

### Méthode 1 : Copie Manuelle

```bash
# Copier vos fichiers dans ce dossier
copy votre-logo.svg public\assets\brands\eb-vision\logo.svg
copy votre-icon.svg public\assets\brands\eb-vision\icon.svg
copy votre-favicon.ico public\assets\brands\eb-vision\favicon.ico
```

### Méthode 2 : Via l'Explorateur Windows

1. Ouvrir `public\assets\brands\eb-vision\`
2. Copier vos fichiers logo
3. Renommer en `logo.svg`, `icon.svg`, `favicon.ico`

---

## 📝 Configuration

Les chemins sont déjà configurés dans `config/branding/eb-vision-2.json` :

```json
{
  "branding": {
    "logo": {
      "main": "/assets/brands/eb-vision/logo.svg",
      "icon": "/assets/brands/eb-vision/icon.svg",
      "favicon": "/assets/brands/eb-vision/favicon.ico"
    }
  }
}
```

---

## ✅ Vérification

### Si les fichiers n'existent pas :
✅ L'application utilise l'icône FontAwesome par défaut  
✅ Aucune erreur  
✅ Tout fonctionne normalement

### Si les fichiers existent :
✅ L'application charge automatiquement vos logos  
✅ Remplace les icônes FontAwesome  
✅ Applique votre branding complet

---

## 🎨 Créer un Logo Rapidement

### Outils Gratuits

1. **Canva** : https://canva.com
   - Template "Logo"
   - Exporter en SVG ou PNG

2. **Figma** : https://figma.com
   - Gratuit pour usage personnel
   - Export SVG haute qualité

3. **Inkscape** : https://inkscape.org
   - Logiciel gratuit et open-source
   - Parfait pour créer des SVG

4. **Online Logo Makers**
   - https://www.freelogodesign.org
   - https://www.designevo.com
   - https://www.canva.com/create/logos/

---

## 💡 Conseil

**Vous n'avez PAS besoin de logos pour que l'application fonctionne !**

Si vous n'avez pas de logo :
1. ✅ Laissez ce dossier vide
2. ✅ L'application utilisera les icônes FontAwesome
3. ✅ C'est parfaitement fonctionnel et professionnel

Ajoutez des logos seulement si vous voulez une personnalisation visuelle complète.

---

## 🔄 Après Ajout de Logos

```bash
# 1. Redémarrer le serveur (optionnel mais recommandé)
npm restart

# 2. Vider le cache navigateur
Ctrl + Shift + R

# 3. Vos logos s'affichent maintenant !
```

---

**Note** : Ce dossier est spécifique à EB-Vision 2.0. Chaque configuration client a son propre dossier dans `public/assets/brands/`.












