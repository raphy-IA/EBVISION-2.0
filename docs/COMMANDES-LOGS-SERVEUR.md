# Commandes pour récupérer les logs du serveur

## Si vous utilisez PM2 (recommandé)

### Voir les logs en temps réel
```bash
pm2 logs ewmanagement --lines 100
```

### Voir les logs avec plus de détails
```bash
pm2 logs ewmanagement --lines 200 --err
```

### Voir uniquement les erreurs
```bash
pm2 logs ewmanagement --err --lines 50
```

### Voir les logs et les sauvegarder dans un fichier
```bash
pm2 logs ewmanagement --lines 200 --err > /tmp/pm2-logs-$(date +%Y%m%d-%H%M%S).txt 2>&1
```

## Si vous utilisez systemd

### Voir les logs du service
```bash
sudo journalctl -u ewmanagement -n 100 --no-pager
```

### Voir les logs en temps réel
```bash
sudo journalctl -u ewmanagement -f
```

## Si vous utilisez directement Node.js

### Voir les logs dans le terminal
Si l'application tourne en foreground, les logs apparaissent directement dans le terminal.

### Si l'application tourne en background
```bash
# Trouver le processus
ps aux | grep node

# Voir les logs si redirigés vers un fichier
tail -f /chemin/vers/logs/app.log
```

## Pour voir les logs de l'application Express

Si vous avez configuré un fichier de log spécifique :
```bash
tail -f logs/app.log
# ou
tail -f logs/error.log
```

## Commande recommandée pour ce problème

```bash
# Pour PM2 (le plus courant)
pm2 logs ewmanagement --lines 200 --err | grep -A 10 -B 10 "generate-user-account\|Erreur\|Error\|500"
```

Copiez-collez la sortie de cette commande dans votre réponse.



