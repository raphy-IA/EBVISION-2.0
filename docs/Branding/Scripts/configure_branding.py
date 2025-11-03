#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Configuration Branding - EB-Vision 2.0
================================================

Ce script permet de configurer facilement le branding de l'application.

Usage:
    python configure_branding.py [nom_configuration]
    
Exemples:
    python configure_branding.py eb-vision-2
    python configure_branding.py demo
    python configure_branding.py default

Auteur: Assistant IA
Date: 2 novembre 2024
Version: 1.0
"""

import os
import sys
import json
import subprocess
import platform
from pathlib import Path
from typing import Optional, Dict, List

# Codes couleur ANSI
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    """Affiche un en-tête formaté."""
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text.center(70)}{Colors.ENDC}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

def print_success(text: str):
    """Affiche un message de succès."""
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")

def print_error(text: str):
    """Affiche un message d'erreur."""
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Affiche un avertissement."""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")

def print_info(text: str):
    """Affiche une information."""
    print(f"{Colors.BLUE}ℹ {text}{Colors.ENDC}")

def get_project_root() -> Path:
    """Retourne la racine du projet."""
    script_dir = Path(__file__).resolve().parent
    # Remonter de Scripts/ -> Branding/ -> docs/ -> racine
    return script_dir.parent.parent.parent

def list_available_configs() -> List[Dict]:
    """Liste toutes les configurations disponibles."""
    root = get_project_root()
    branding_dir = root / "config" / "branding"
    
    configs = []
    if branding_dir.exists():
        for config_file in branding_dir.glob("*.json"):
            if config_file.stem not in ['client-template']:
                try:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        configs.append({
                            'id': config_file.stem,
                            'name': data.get('name', 'N/A'),
                            'file': config_file.name,
                            'path': str(config_file)
                        })
                except Exception as e:
                    print_warning(f"Impossible de lire {config_file.name}: {e}")
    
    return sorted(configs, key=lambda x: x['id'])

def display_available_configs(configs: List[Dict]):
    """Affiche les configurations disponibles."""
    print_header("CONFIGURATIONS DISPONIBLES")
    
    if not configs:
        print_error("Aucune configuration trouvée!")
        return
    
    print(f"{'ID':<20} {'Nom':<40} {'Fichier':<30}")
    print(f"{'-'*20} {'-'*40} {'-'*30}")
    
    for config in configs:
        print(f"{Colors.CYAN}{config['id']:<20}{Colors.ENDC} "
              f"{config['name']:<40} "
              f"{Colors.YELLOW}{config['file']:<30}{Colors.ENDC}")
    
    print()

def read_env_file() -> Dict[str, str]:
    """Lit le fichier .env et retourne un dictionnaire."""
    root = get_project_root()
    env_file = root / ".env"
    
    env_vars = {}
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    return env_vars

def write_env_file(env_vars: Dict[str, str]):
    """Écrit le fichier .env."""
    root = get_project_root()
    env_file = root / ".env"
    
    with open(env_file, 'w', encoding='utf-8') as f:
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")

def get_current_config() -> Optional[str]:
    """Retourne la configuration actuellement active."""
    env_vars = read_env_file()
    return env_vars.get('BRAND_CONFIG')

def set_config(config_id: str) -> bool:
    """Configure le branding avec l'ID spécifié."""
    root = get_project_root()
    config_file = root / "config" / "branding" / f"{config_id}.json"
    
    # Vérifier que la configuration existe
    if not config_file.exists():
        print_error(f"Configuration '{config_id}' introuvable!")
        print_info(f"Fichier recherché: {config_file}")
        return False
    
    # Lire et valider le fichier JSON
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            config_name = config_data.get('name', 'N/A')
    except Exception as e:
        print_error(f"Erreur lors de la lecture du fichier de configuration: {e}")
        return False
    
    # Mettre à jour le fichier .env
    env_vars = read_env_file()
    old_config = env_vars.get('BRAND_CONFIG', 'aucune')
    env_vars['BRAND_CONFIG'] = config_id
    
    try:
        write_env_file(env_vars)
        print_success(f"Configuration mise à jour dans .env")
        print_info(f"Ancienne configuration: {old_config}")
        print_info(f"Nouvelle configuration: {config_id}")
        print_info(f"Nom de l'application: {config_name}")
        return True
    except Exception as e:
        print_error(f"Erreur lors de l'écriture du fichier .env: {e}")
        return False

def restart_server():
    """Redémarre le serveur Node.js."""
    print_header("REDÉMARRAGE DU SERVEUR")
    
    system = platform.system()
    
    # Arrêter les processus Node existants
    print_info("Arrêt des processus Node.js existants...")
    try:
        if system == "Windows":
            subprocess.run(["taskkill", "/F", "/IM", "node.exe"], 
                          capture_output=True, check=False)
        else:
            subprocess.run(["pkill", "-f", "node"], 
                          capture_output=True, check=False)
        print_success("Processus Node.js arrêtés")
    except Exception as e:
        print_warning(f"Impossible d'arrêter les processus Node: {e}")
    
    # Démarrer le serveur
    print_info("Démarrage du serveur...")
    print_warning("Appuyez sur Ctrl+C pour arrêter le serveur une fois démarré")
    print()
    
    root = get_project_root()
    os.chdir(root)
    
    try:
        subprocess.run(["npm", "start"])
    except KeyboardInterrupt:
        print("\n")
        print_info("Serveur arrêté par l'utilisateur")

def display_next_steps(config_id: str):
    """Affiche les prochaines étapes."""
    print_header("PROCHAINES ÉTAPES")
    
    print(f"{Colors.YELLOW}1. Redémarrer le serveur{Colors.ENDC}")
    print("   → npm restart")
    print()
    
    print(f"{Colors.YELLOW}2. Vider le cache du navigateur{Colors.ENDC}")
    print("   → Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)")
    print()
    
    print(f"{Colors.YELLOW}3. Tester l'application{Colors.ENDC}")
    print("   → http://localhost:3000")
    print()
    
    print(f"{Colors.YELLOW}4. Vérifier la configuration{Colors.ENDC}")
    print("   → python docs/Branding/Scripts/verify_branding.py")
    print()

def create_new_configuration(config_id: str) -> bool:
    """Crée une nouvelle configuration à partir du template."""
    root = get_project_root()
    template_file = root / "config" / "branding" / "client-template.json"
    new_config_file = root / "config" / "branding" / f"{config_id}.json"
    
    print_header("CRÉATION D'UNE NOUVELLE CONFIGURATION")
    
    # Vérifier que le template existe
    if not template_file.exists():
        print_error("Fichier template introuvable!")
        print_info(f"Attendu: {template_file}")
        
        # Créer un template de base
        print_info("Création d'un template de base...")
        default_template = {
            "id": config_id,
            "name": config_id.upper().replace('-', ' '),
            "tagline": "Solution de Gestion d'Entreprise",
            "colors": {
                "primary": "#2c3e50",
                "secondary": "#3498db",
                "success": "#27ae60",
                "danger": "#e74c3c",
                "warning": "#f39c12",
                "info": "#3498db"
            },
            "logos": {
                "main": f"/assets/brands/{config_id}/logo.svg",
                "favicon": f"/assets/brands/{config_id}/favicon.ico"
            },
            "footer": {
                "copyright": f"© 2024 {config_id.upper().replace('-', ' ')}",
                "subtitle": "Tous droits réservés"
            },
            "localization": {
                "language": "fr",
                "currency": "EUR",
                "dateFormat": "DD/MM/YYYY"
            }
        }
        
        try:
            with open(new_config_file, 'w', encoding='utf-8') as f:
                json.dump(default_template, f, indent=2, ensure_ascii=False)
            print_success(f"Configuration créée: {config_id}.json")
            print_info(f"Chemin: {new_config_file}")
            print_warning("⚠ Configuration minimale créée - À personnaliser!")
            return True
        except Exception as e:
            print_error(f"Erreur lors de la création: {e}")
            return False
    
    # Demander confirmation
    print_info(f"Nouvelle configuration: {Colors.CYAN}{config_id}{Colors.ENDC}")
    print()
    
    # Demander le nom de l'application
    print(f"{Colors.BOLD}Nom de l'application{Colors.ENDC} (ex: MON ENTREPRISE): ", end='')
    app_name = input().strip()
    if not app_name:
        app_name = config_id.upper().replace('-', ' ')
    
    # Demander le slogan
    print(f"{Colors.BOLD}Slogan{Colors.ENDC} (ex: Solution de Gestion): ", end='')
    tagline = input().strip()
    if not tagline:
        tagline = "Solution de Gestion d'Entreprise"
    
    # Demander la couleur primaire
    print(f"{Colors.BOLD}Couleur primaire{Colors.ENDC} (hex, ex: #2c3e50) [Enter pour défaut]: ", end='')
    primary_color = input().strip()
    if not primary_color:
        primary_color = "#2c3e50"
    
    # Lire le template
    try:
        with open(template_file, 'r', encoding='utf-8') as f:
            template_data = json.load(f)
        
        # Personnaliser avec les valeurs saisies
        template_data['id'] = config_id
        
        # Gérer la structure app.name ou name directement
        if 'app' in template_data:
            template_data['app']['name'] = app_name
            if 'tagline' in template_data['app']:
                template_data['app']['tagline'] = tagline
            if 'shortName' in template_data['app']:
                template_data['app']['shortName'] = ''.join([w[0] for w in app_name.split()]).upper()
        else:
            template_data['name'] = app_name
            template_data['tagline'] = tagline
        
        # Remplacer les couleurs avec des valeurs réelles
        if 'branding' in template_data and 'colors' in template_data['branding']:
            template_data['branding']['colors']['primary'] = primary_color
            # Remplacer les placeholders
            if 'YOUR_' in str(template_data['branding']['colors'].get('secondary', '')):
                template_data['branding']['colors']['secondary'] = '#34495e'
            if 'YOUR_' in str(template_data['branding']['colors'].get('accent', '')):
                template_data['branding']['colors']['accent'] = '#3498db'
            if 'YOUR_' in str(template_data['branding']['colors'].get('dark', '')):
                template_data['branding']['colors']['dark'] = '#1a252f'
            if 'YOUR_' in str(template_data['branding']['colors'].get('light', '')):
                template_data['branding']['colors']['light'] = '#ecf0f1'
        elif 'colors' in template_data:
            template_data['colors']['primary'] = primary_color
        
        # Mettre à jour les chemins de logos et remplacer [CLIENT-ID]
        if 'branding' in template_data and 'logo' in template_data['branding']:
            if 'main' in template_data['branding']['logo']:
                template_data['branding']['logo']['main'] = template_data['branding']['logo']['main'].replace('[CLIENT-ID]', config_id)
            if 'icon' in template_data['branding']['logo']:
                template_data['branding']['logo']['icon'] = template_data['branding']['logo']['icon'].replace('[CLIENT-ID]', config_id)
            if 'favicon' in template_data['branding']['logo']:
                template_data['branding']['logo']['favicon'] = template_data['branding']['logo']['favicon'].replace('[CLIENT-ID]', config_id)
        elif 'logos' in template_data:
            template_data['logos']['main'] = f"/assets/brands/{config_id}/logo.svg"
            template_data['logos']['favicon'] = f"/assets/brands/{config_id}/favicon.ico"
        
        # Remplacer les placeholders UI
        if 'ui' in template_data:
            if 'sidebarTitle' in template_data['ui'] and 'VOTRE' in template_data['ui']['sidebarTitle']:
                template_data['ui']['sidebarTitle'] = app_name
            if 'sidebarSubtitle' in template_data['ui'] and 'Votre' in template_data['ui']['sidebarSubtitle']:
                template_data['ui']['sidebarSubtitle'] = tagline
            if 'loginTitle' in template_data['ui'] and '[NOM]' in template_data['ui']['loginTitle']:
                template_data['ui']['loginTitle'] = f"Bienvenue sur {app_name}"
            if 'footer' in template_data['ui']:
                if 'text' in template_data['ui']['footer'] and 'votre' in template_data['ui']['footer']['text'].lower():
                    template_data['ui']['footer']['text'] = app_name
                template_data['ui']['footer']['copyright'] = f"© 2024 {app_name}. Tous droits réservés."
        elif 'footer' in template_data:
            template_data['footer']['copyright'] = f"© 2024 {app_name}"
        
        # Remplacer les placeholders de contact
        if 'contact' in template_data:
            domain_name = config_id.lower().replace('-', '').replace('_', '')
            if 'votre-entreprise' in template_data['contact'].get('email', ''):
                template_data['contact']['email'] = f"contact@{domain_name}.com"
            if 'votre-entreprise' in template_data['contact'].get('website', ''):
                template_data['contact']['website'] = f"https://{domain_name}.com"
            if 'votre-entreprise' in template_data['contact'].get('supportUrl', ''):
                template_data['contact']['supportUrl'] = f"https://support.{domain_name}.com"
        
        # Écrire la nouvelle configuration
        with open(new_config_file, 'w', encoding='utf-8') as f:
            json.dump(template_data, f, indent=2, ensure_ascii=False)
        
        print()
        print_success(f"Configuration créée avec succès!")
        print_info(f"Fichier: {new_config_file}")
        print_info(f"Nom: {app_name}")
        print_info(f"Slogan: {tagline}")
        print_info(f"Couleur: {primary_color}")
        print()
        print_warning("⚠ N'oubliez pas de personnaliser le fichier JSON si nécessaire!")
        print_info(f"   Éditez: config/branding/{config_id}.json")
        
        # Créer le dossier assets
        assets_dir = root / "public" / "assets" / "brands" / config_id
        if not assets_dir.exists():
            assets_dir.mkdir(parents=True, exist_ok=True)
            readme = assets_dir / "README.md"
            with open(readme, 'w', encoding='utf-8') as f:
                f.write(f"# Assets pour {app_name}\n\n")
                f.write("Placez ici vos fichiers de logos et icônes personnalisés:\n\n")
                f.write("- `logo.svg` ou `logo.png` : Logo principal\n")
                f.write("- `favicon.ico` : Icône du navigateur\n")
            print_success(f"Dossier assets créé: public/assets/brands/{config_id}/")
        
        return True
        
    except Exception as e:
        print_error(f"Erreur lors de la création de la configuration: {e}")
        import traceback
        traceback.print_exc()
        return False

def interactive_mode():
    """Mode interactif pour choisir une configuration."""
    print_header("MODE INTERACTIF - CONFIGURATION BRANDING")
    
    # Afficher la configuration actuelle
    current = get_current_config()
    if current:
        print_info(f"Configuration actuelle: {Colors.CYAN}{current}{Colors.ENDC}")
    else:
        print_warning("Aucune configuration active")
    
    print()
    
    # Lister les configurations disponibles
    configs = list_available_configs()
    display_available_configs(configs)
    
    print()
    print(f"{Colors.YELLOW}{Colors.BOLD}OPTIONS:{Colors.ENDC}")
    print(f"  • Entrez l'ID d'une configuration existante")
    print(f"  • Entrez un {Colors.BOLD}nouveau nom{Colors.ENDC} pour créer une configuration")
    print(f"  • Tapez '{Colors.CYAN}new{Colors.ENDC}' pour créer avec assistant")
    print(f"  • Tapez '{Colors.RED}q{Colors.ENDC}' pour quitter")
    print()
    
    print(f"{Colors.BOLD}Votre choix: {Colors.ENDC}", end='')
    choice = input().strip()
    
    if choice.lower() == 'q':
        print_info("Annulé par l'utilisateur")
        return False
    
    # Mode création assistée
    if choice.lower() == 'new':
        print()
        print(f"{Colors.BOLD}Entrez l'ID de la nouvelle configuration{Colors.ENDC}")
        print(f"(ex: mon-client, entreprise-abc): ", end='')
        config_id = input().strip().lower()
        
        if not config_id:
            print_error("ID vide - Annulé")
            return False
        
        # Valider l'ID (alphanumérique et tirets seulement)
        import re
        if not re.match(r'^[a-z0-9-]+$', config_id):
            print_error("ID invalide - Utilisez uniquement des lettres minuscules, chiffres et tirets")
            return False
        
        if create_new_configuration(config_id):
            print()
            return set_config(config_id)
        return False
    
    # Vérifier si c'est une configuration existante
    valid_ids = [c['id'] for c in configs]
    
    if choice in valid_ids:
        # Configuration existante
        return set_config(choice)
    else:
        # Nouvelle configuration
        print()
        print_info(f"Configuration '{choice}' introuvable")
        print(f"{Colors.BOLD}Voulez-vous la créer? (o/N): {Colors.ENDC}", end='')
        
        create = input().strip().lower()
        if create in ['o', 'oui', 'y', 'yes']:
            # Valider l'ID
            import re
            if not re.match(r'^[a-z0-9-]+$', choice):
                print_error("ID invalide - Utilisez uniquement des lettres minuscules, chiffres et tirets")
                return False
            
            if create_new_configuration(choice):
                print()
                return set_config(choice)
        else:
            print_info("Annulé")
        
        return False

def main():
    """Fonction principale."""
    print_header("CONFIGURATION BRANDING - EB-VISION 2.0")
    
    # Vérifier qu'on est dans le bon répertoire
    root = get_project_root()
    if not (root / "package.json").exists():
        print_error("Erreur: Ce script doit être exécuté depuis le projet EB-Vision 2.0")
        sys.exit(1)
    
    # Mode en ligne de commande
    if len(sys.argv) > 1:
        config_id = sys.argv[1]
        
        if config_id in ['-h', '--help', 'help']:
            print("Usage: python configure_branding.py [nom_configuration]")
            print()
            print("Exemples:")
            print("  python configure_branding.py eb-vision-2        # Activer config existante")
            print("  python configure_branding.py mon-nouveau-client # Créer si n'existe pas")
            print("  python configure_branding.py --list             # Lister toutes")
            print("  python configure_branding.py --new              # Mode création")
            print()
            print("Sans argument, le script démarre en mode interactif.")
            sys.exit(0)
        
        if config_id in ['-l', '--list', 'list']:
            configs = list_available_configs()
            display_available_configs(configs)
            sys.exit(0)
        
        if config_id in ['-n', '--new', 'new']:
            print()
            print(f"{Colors.BOLD}Entrez l'ID de la nouvelle configuration{Colors.ENDC}")
            print(f"(ex: mon-client, entreprise-abc): ", end='')
            new_id = input().strip().lower()
            
            if not new_id:
                print_error("ID vide - Annulé")
                sys.exit(1)
            
            import re
            if not re.match(r'^[a-z0-9-]+$', new_id):
                print_error("ID invalide - Utilisez uniquement lettres, chiffres et tirets")
                sys.exit(1)
            
            if create_new_configuration(new_id):
                print()
                if set_config(new_id):
                    display_next_steps(new_id)
                sys.exit(0)
            sys.exit(1)
        
        print_info(f"Configuration demandée: {config_id}")
        print()
        
        # Vérifier si la configuration existe
        root = get_project_root()
        config_file = root / "config" / "branding" / f"{config_id}.json"
        
        if not config_file.exists():
            print_warning(f"Configuration '{config_id}' introuvable")
            print(f"{Colors.BOLD}Voulez-vous la créer? (o/N): {Colors.ENDC}", end='')
            
            create = input().strip().lower()
            if create in ['o', 'oui', 'y', 'yes']:
                # Valider l'ID
                import re
                if not re.match(r'^[a-z0-9-]+$', config_id):
                    print_error("ID invalide - Utilisez uniquement lettres, chiffres et tirets")
                    sys.exit(1)
                
                if not create_new_configuration(config_id):
                    sys.exit(1)
                print()
            else:
                print_error("Configuration introuvable - Annulé")
                sys.exit(1)
        
        # Activer la configuration
        if set_config(config_id):
            print()
            display_next_steps(config_id)
            
            # Demander si on veut redémarrer
            print(f"{Colors.BOLD}Voulez-vous redémarrer le serveur maintenant? (o/N): {Colors.ENDC}", end='')
            restart = input().strip().lower()
            
            if restart in ['o', 'oui', 'y', 'yes']:
                restart_server()
            else:
                print_info("N'oubliez pas de redémarrer le serveur: npm restart")
        else:
            sys.exit(1)
    
    # Mode interactif
    else:
        if interactive_mode():
            print()
            current_config = get_current_config()
            display_next_steps(current_config)
            
            # Demander si on veut redémarrer
            print(f"{Colors.BOLD}Voulez-vous redémarrer le serveur maintenant? (o/N): {Colors.ENDC}", end='')
            restart = input().strip().lower()
            
            if restart in ['o', 'oui', 'y', 'yes']:
                restart_server()
            else:
                print_info("N'oubliez pas de redémarrer le serveur: npm restart")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n")
        print_warning("Opération annulée par l'utilisateur")
        sys.exit(0)
    except Exception as e:
        print_error(f"Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

