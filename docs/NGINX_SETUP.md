# Guide de configuration Nginx & HTTPS pour l'environnement de Test API

Ce guide explique comment rendre l'API de test accessible via `https://ebvision-test-api.bosssystemsai.com` au lieu de l'IP brute.

## 1. Créer la configuration Nginx

Connectez-vous au VPS et créez le fichier de configuration :

```bash
sudo nano /etc/nginx/sites-available/ebvision-test-api
```

Copiez et collez le contenu suivant dans l'éditeur :

```nginx
server {
    listen 80;
    server_name ebvision-test-api.bosssystemsai.com;

    location / {
        proxy_pass http://localhost:3005; 
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*Appuyez sur `Ctrl+X`, puis `Y` et `Entrée` pour sauvegarder.*

## 2. Activer le site

Créez un lien symbolique pour activer cette configuration :

```bash
sudo ln -s /etc/nginx/sites-available/ebvision-test-api /etc/nginx/sites-enabled/
```

Vérifiez que la configuration est valide :

```bash
sudo nginx -t
```

Rechargez Nginx :

```bash
sudo systemctl reload nginx
```

## 3. Sécuriser avec HTTPS (Recommandé)

Lancez Certbot pour transformer automatiquement votre configuration afin qu'elle ressemble exactement à votre production (redirection 301 + blocs SSL) :

```bash
sudo certbot --nginx -d ebvision-test-api.bosssystemsai.com
```

Certbot va ajouter automatiquement les lignes SSL (`listen 443`, certificats, etc.) comme sur votre fichier de prod.

## 4. Vérification

C'est terminé ! Vous pouvez maintenant transmettre cette URL professionnelle à votre prestataire :

👉 **https://ebvision-test-api.bosssystemsai.com/api-docs**
