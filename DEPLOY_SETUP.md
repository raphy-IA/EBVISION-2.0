# Instructions pour rendre deploy.sh exécutable sur Linux

## Sur le serveur de production (après le premier git pull)

Exécutez cette commande une seule fois :

```bash
chmod +x deploy.sh
```

## Vérification

```bash
# Vérifier que le fichier est exécutable
ls -la deploy.sh

# Devrait afficher : -rwxr-xr-x (le 'x' indique exécutable)
```

## Ensuite vous pouvez l'utiliser

```bash
./deploy.sh
```

---

**Note pour Windows :** Sur Windows, ce fichier n'est pas utilisable directement. Utilisez uniquement les commandes npm :
- `npm run migrate`
- `npm run validate-schema`
