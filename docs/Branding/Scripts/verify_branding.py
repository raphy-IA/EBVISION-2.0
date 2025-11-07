#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Vérification Complète du Branding - EB-Vision 2.0
===========================================================

Ce script vérifie que tout le système de branding est correctement configuré.

Usage:
    python verify_branding.py [options]
    
Options:
    -v, --verbose    Mode verbeux (affiche plus de détails)
    -j, --json       Sortie au format JSON
    --fix            Tente de corriger automatiquement les problèmes

Auteur: Assistant IA
Date: 2 novembre 2024
Version: 1.0
"""

import os
import sys
import json
import subprocess
import requests
import platform
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime

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

class BrandingVerifier:
    """Classe pour vérifier la configuration du branding."""
    
    def __init__(self, verbose: bool = False, auto_fix: bool = False):
        self.verbose = verbose
        self.auto_fix = auto_fix
        self.root = self._get_project_root()
        self.results = []
        self.errors = []
        self.warnings = []
        self.success_count = 0
        self.error_count = 0
        self.warning_count = 0
    
    def _get_project_root(self) -> Path:
        """Retourne la racine du projet."""
        script_dir = Path(__file__).resolve().parent
        return script_dir.parent.parent.parent
    
    def print_header(self, text: str):
        """Affiche un en-tête."""
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.ENDC}")
        print(f"{Colors.CYAN}{Colors.BOLD}{text.center(70)}{Colors.ENDC}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")
    
    def print_section(self, text: str):
        """Affiche une section."""
        print(f"\n{Colors.YELLOW}{Colors.BOLD}{text}{Colors.ENDC}")
        print(f"{Colors.YELLOW}{'-'*len(text)}{Colors.ENDC}")
    
    def print_success(self, text: str):
        """Affiche un succès."""
        print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")
        self.success_count += 1
    
    def print_error(self, text: str):
        """Affiche une erreur."""
        print(f"{Colors.RED}✗ {text}{Colors.ENDC}")
        self.errors.append(text)
        self.error_count += 1
    
    def print_warning(self, text: str):
        """Affiche un avertissement."""
        print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")
        self.warnings.append(text)
        self.warning_count += 1
    
    def print_info(self, text: str):
        """Affiche une information."""
        if self.verbose:
            print(f"{Colors.BLUE}ℹ {text}{Colors.ENDC}")
    
    def verify_project_structure(self) -> bool:
        """Vérifie la structure du projet."""
        self.print_section("1. STRUCTURE DU PROJET")
        
        # Vérifier package.json
        package_json = self.root / "package.json"
        if package_json.exists():
            self.print_success("package.json trouvé")
            self.print_info(f"   Chemin: {package_json}")
        else:
            self.print_error("package.json introuvable - Mauvais répertoire?")
            return False
        
        # Vérifier le dossier config/branding
        branding_dir = self.root / "config" / "branding"
        if branding_dir.exists() and branding_dir.is_dir():
            self.print_success("Dossier config/branding/ existe")
            
            # Compter les configurations
            configs = list(branding_dir.glob("*.json"))
            config_count = len([c for c in configs if c.stem != 'client-template'])
            self.print_info(f"   {config_count} configurations trouvées")
        else:
            self.print_error("Dossier config/branding/ introuvable")
            return False
        
        # Vérifier les dossiers source
        required_dirs = [
            ("src/services", "Services backend"),
            ("src/routes", "Routes API"),
            ("public/js", "JavaScript frontend"),
            ("public/assets/brands", "Assets de branding")
        ]
        
        for dir_path, description in required_dirs:
            full_path = self.root / dir_path
            if full_path.exists():
                self.print_success(f"{description}: {dir_path}")
            else:
                self.print_warning(f"{description} manquant: {dir_path}")
        
        return True
    
    def verify_env_file(self) -> Tuple[bool, Optional[str]]:
        """Vérifie le fichier .env."""
        self.print_section("2. FICHIER .ENV")
        
        env_file = self.root / ".env"
        
        if not env_file.exists():
            self.print_error("Fichier .env introuvable")
            if self.auto_fix:
                self.print_info("Tentative de création du fichier .env...")
                try:
                    with open(env_file, 'w', encoding='utf-8') as f:
                        f.write("BRAND_CONFIG=default\n")
                    self.print_success("Fichier .env créé avec BRAND_CONFIG=default")
                    return True, "default"
                except Exception as e:
                    self.print_error(f"Impossible de créer .env: {e}")
                    return False, None
            return False, None
        
        self.print_success("Fichier .env existe")
        
        # Lire le contenu
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Chercher BRAND_CONFIG
            brand_config = None
            for line in content.split('\n'):
                line = line.strip()
                if line.startswith('BRAND_CONFIG='):
                    brand_config = line.split('=', 1)[1].strip()
                    break
            
            if brand_config:
                self.print_success(f"BRAND_CONFIG trouvé: {brand_config}")
                self.print_info(f"   Chemin: {env_file}")
                return True, brand_config
            else:
                self.print_error("BRAND_CONFIG non défini dans .env")
                if self.auto_fix:
                    self.print_info("Ajout de BRAND_CONFIG=default...")
                    with open(env_file, 'a', encoding='utf-8') as f:
                        f.write("\nBRAND_CONFIG=default\n")
                    self.print_success("BRAND_CONFIG ajouté")
                    return True, "default"
                return False, None
                
        except Exception as e:
            self.print_error(f"Erreur lors de la lecture de .env: {e}")
            return False, None
    
    def verify_configuration_file(self, config_id: str) -> Tuple[bool, Optional[Dict]]:
        """Vérifie le fichier de configuration."""
        self.print_section("3. FICHIER DE CONFIGURATION")
        
        config_file = self.root / "config" / "branding" / f"{config_id}.json"
        
        if not config_file.exists():
            self.print_error(f"Fichier de configuration introuvable: {config_file.name}")
            self.print_info(f"   Chemin recherché: {config_file}")
            return False, None
        
        self.print_success(f"Fichier de configuration existe: {config_file.name}")
        
        # Lire et valider le JSON
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            self.print_success("JSON valide")
            
            # Vérifier les champs requis
            required_fields = {
                'id': 'ID',
                'name': 'Nom de l\'application',
                'tagline': 'Slogan',
                'colors': 'Couleurs',
                'footer': 'Footer'
            }
            
            all_fields_present = True
            for field, description in required_fields.items():
                if field in config_data:
                    self.print_success(f"{description}: ✓")
                    if self.verbose and isinstance(config_data[field], str):
                        self.print_info(f"   Valeur: {config_data[field]}")
                else:
                    self.print_warning(f"{description}: manquant")
                    all_fields_present = False
            
            # Vérifier les couleurs
            if 'colors' in config_data:
                colors = config_data['colors']
                color_fields = ['primary', 'secondary', 'success', 'danger', 'warning', 'info']
                
                missing_colors = [c for c in color_fields if c not in colors]
                if missing_colors:
                    self.print_warning(f"Couleurs manquantes: {', '.join(missing_colors)}")
                else:
                    self.print_success(f"Toutes les couleurs définies ({len(color_fields)})")
            
            return all_fields_present, config_data
            
        except json.JSONDecodeError as e:
            self.print_error(f"JSON invalide: {e}")
            return False, None
        except Exception as e:
            self.print_error(f"Erreur lors de la lecture: {e}")
            return False, None
    
    def verify_assets(self, config_id: str) -> bool:
        """Vérifie les assets de branding."""
        self.print_section("4. ASSETS DE BRANDING")
        
        # Extraire l'ID simple (sans suffixe -2, etc.)
        base_id = config_id.rsplit('-', 1)[0] if '-' in config_id and config_id.split('-')[-1].isdigit() else config_id
        
        assets_dir = self.root / "public" / "assets" / "brands" / base_id
        
        if not assets_dir.exists():
            self.print_warning(f"Dossier assets introuvable: {assets_dir.name}/")
            self.print_info("   Les assets sont optionnels (FontAwesome utilisé par défaut)")
            
            if self.auto_fix:
                self.print_info(f"Création du dossier assets...")
                try:
                    assets_dir.mkdir(parents=True, exist_ok=True)
                    readme = assets_dir / "README.md"
                    with open(readme, 'w', encoding='utf-8') as f:
                        f.write(f"# Assets pour {config_id}\n\n")
                        f.write("Placez ici vos fichiers de logos et icônes personnalisés.\n")
                    self.print_success(f"Dossier créé: {assets_dir}")
                except Exception as e:
                    self.print_error(f"Impossible de créer le dossier: {e}")
            return True
        
        self.print_success(f"Dossier assets existe: {base_id}/")
        
        # Lister les fichiers
        logo_extensions = {'.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp'}
        logo_files = [f for f in assets_dir.iterdir() 
                     if f.is_file() and f.suffix.lower() in logo_extensions]
        
        if logo_files:
            self.print_success(f"{len(logo_files)} logo(s) trouvé(s)")
            if self.verbose:
                for logo in logo_files:
                    self.print_info(f"   - {logo.name} ({logo.stat().st_size} bytes)")
        else:
            self.print_info("   Aucun logo personnalisé (utilise FontAwesome)")
        
        return True
    
    def verify_source_files(self) -> bool:
        """Vérifie les fichiers source du branding."""
        self.print_section("5. FICHIERS SOURCE")
        
        source_files = {
            "src/services/brandingService.js": "Service backend",
            "src/routes/branding.js": "Routes API",
            "public/js/branding-loader.js": "Loader frontend",
            "public/js/sidebar-branding.js": "Branding sidebar",
            "config/themes/brand-variables.css": "Variables CSS"
        }
        
        all_present = True
        for file_path, description in source_files.items():
            full_path = self.root / file_path
            if full_path.exists():
                self.print_success(f"{description}: {file_path}")
                if self.verbose:
                    size = full_path.stat().st_size
                    self.print_info(f"   Taille: {size} bytes")
            else:
                self.print_error(f"{description} manquant: {file_path}")
                all_present = False
        
        return all_present
    
    def verify_server(self) -> Tuple[bool, List[int]]:
        """Vérifie si le serveur Node.js est en cours d'exécution."""
        self.print_section("6. SERVEUR NODE.JS")
        
        try:
            if platform.system() == "Windows":
                result = subprocess.run(
                    ["tasklist", "/FI", "IMAGENAME eq node.exe"],
                    capture_output=True,
                    text=True
                )
                if "node.exe" in result.stdout:
                    self.print_success("Serveur Node.js en cours d'exécution")
                    # Extraire les PIDs
                    lines = result.stdout.split('\n')
                    pids = []
                    for line in lines:
                        if 'node.exe' in line:
                            parts = line.split()
                            if len(parts) >= 2:
                                try:
                                    pids.append(int(parts[1]))
                                except ValueError:
                                    pass
                    if pids:
                        self.print_info(f"   PID(s): {', '.join(map(str, pids))}")
                    return True, pids
            else:
                result = subprocess.run(
                    ["pgrep", "-f", "node"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    pids = [int(pid) for pid in result.stdout.strip().split('\n') if pid]
                    self.print_success("Serveur Node.js en cours d'exécution")
                    self.print_info(f"   PID(s): {', '.join(map(str, pids))}")
                    return True, pids
            
            self.print_warning("Aucun serveur Node.js en cours")
            self.print_info("   Démarrez avec: npm start")
            return False, []
            
        except Exception as e:
            self.print_warning(f"Impossible de vérifier le serveur: {e}")
            return False, []
    
    def verify_api(self, config_data: Optional[Dict]) -> bool:
        """Vérifie l'API de branding."""
        self.print_section("7. API DE BRANDING")
        
        url = "http://localhost:3000/api/branding/config"
        
        try:
            self.print_info(f"Test de l'API: {url}")
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                self.print_success("API accessible (HTTP 200)")
                
                try:
                    data = response.json()
                    
                    if 'data' in data:
                        api_config = data['data']
                        app_name = api_config.get('app', {}).get('name', 'N/A')
                        
                        self.print_success(f"Nom de l'application: {app_name}")
                        
                        # Comparer avec la configuration attendue
                        if config_data and 'name' in config_data:
                            expected_name = config_data['name']
                            if app_name == expected_name:
                                self.print_success("✓ Configuration correcte!")
                            else:
                                self.print_warning(f"Configuration différente (attendu: {expected_name})")
                                self.print_info("   → Redémarrez le serveur si vous avez modifié .env")
                        
                        # Afficher les détails si verbose
                        if self.verbose and 'app' in api_config:
                            self.print_info(f"   ID: {api_config['app'].get('id', 'N/A')}")
                            self.print_info(f"   Tagline: {api_config['app'].get('tagline', 'N/A')}")
                        
                        return True
                    else:
                        self.print_error("Format de réponse incorrect")
                        return False
                        
                except json.JSONDecodeError:
                    self.print_error("Réponse JSON invalide")
                    return False
            else:
                self.print_error(f"Erreur HTTP {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            self.print_error("Impossible de se connecter à l'API")
            self.print_info("   → Le serveur est-il démarré? (npm start)")
            return False
        except requests.exceptions.Timeout:
            self.print_error("Timeout lors de la connexion à l'API")
            return False
        except Exception as e:
            self.print_error(f"Erreur lors du test de l'API: {e}")
            return False
    
    def verify_documentation(self) -> bool:
        """Vérifie la documentation."""
        self.print_section("8. DOCUMENTATION")
        
        doc_files = {
            "docs/Branding/README.md": "Index principal",
            "docs/Branding/START-HERE.md": "Démarrage rapide",
            "docs/Branding/REFERENCE-RAPIDE.md": "Référence rapide",
            "docs/Branding/Guides/LISEZ-MOI-EN-PREMIER.md": "Guide démarrage",
            "config/branding/README.md": "Guide configurations"
        }
        
        all_present = True
        for file_path, description in doc_files.items():
            full_path = self.root / file_path
            if full_path.exists():
                self.print_success(f"{description}: ✓")
            else:
                self.print_warning(f"{description}: manquant")
                all_present = False
        
        return all_present
    
    def print_summary(self):
        """Affiche le résumé."""
        self.print_header("RÉSUMÉ DE LA VÉRIFICATION")
        
        print(f"{Colors.GREEN}✓ Succès: {self.success_count}{Colors.ENDC}")
        print(f"{Colors.YELLOW}⚠ Avertissements: {self.warning_count}{Colors.ENDC}")
        print(f"{Colors.RED}✗ Erreurs: {self.error_count}{Colors.ENDC}")
        
        if self.errors:
            print(f"\n{Colors.RED}{Colors.BOLD}ERREURS CRITIQUES:{Colors.ENDC}")
            for error in self.errors:
                print(f"{Colors.RED}  - {error}{Colors.ENDC}")
        
        if self.warnings:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}AVERTISSEMENTS:{Colors.ENDC}")
            for warning in self.warnings[:5]:  # Limiter à 5
                print(f"{Colors.YELLOW}  - {warning}{Colors.ENDC}")
            if len(self.warnings) > 5:
                print(f"{Colors.YELLOW}  ... et {len(self.warnings) - 5} autre(s){Colors.ENDC}")
        
        # Recommandations
        print(f"\n{Colors.CYAN}{Colors.BOLD}RECOMMANDATIONS:{Colors.ENDC}")
        
        if self.error_count > 0:
            print(f"{Colors.RED}❌ Des erreurs critiques doivent être corrigées{Colors.ENDC}")
        elif self.warning_count > 0:
            print(f"{Colors.YELLOW}⚠ Quelques avertissements, mais le système devrait fonctionner{Colors.ENDC}")
        else:
            print(f"{Colors.GREEN}✅ Tout est parfaitement configuré!{Colors.ENDC}")
        
        # Statut global
        print(f"\n{Colors.BOLD}STATUT GLOBAL:{Colors.ENDC} ", end='')
        if self.error_count == 0 and self.warning_count == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}EXCELLENT ✓{Colors.ENDC}")
        elif self.error_count == 0:
            print(f"{Colors.YELLOW}{Colors.BOLD}BON (avec avertissements) ⚠{Colors.ENDC}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}PROBLÈMES DÉTECTÉS ✗{Colors.ENDC}")
    
    def run(self) -> bool:
        """Exécute toutes les vérifications."""
        self.print_header("VÉRIFICATION COMPLÈTE DU BRANDING")
        
        print(f"{Colors.BOLD}Date:{Colors.ENDC} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{Colors.BOLD}Système:{Colors.ENDC} {platform.system()} {platform.release()}")
        print(f"{Colors.BOLD}Python:{Colors.ENDC} {sys.version.split()[0]}")
        print(f"{Colors.BOLD}Répertoire:{Colors.ENDC} {self.root}")
        
        # 1. Structure
        if not self.verify_project_structure():
            self.print_error("Structure du projet invalide - Arrêt")
            return False
        
        # 2. Fichier .env
        env_ok, config_id = self.verify_env_file()
        if not env_ok or not config_id:
            self.print_error("Impossible de déterminer la configuration - Arrêt")
            return False
        
        # 3. Fichier de configuration
        config_ok, config_data = self.verify_configuration_file(config_id)
        
        # 4. Assets
        self.verify_assets(config_id)
        
        # 5. Fichiers source
        self.verify_source_files()
        
        # 6. Serveur
        server_ok, pids = self.verify_server()
        
        # 7. API (seulement si serveur actif)
        if server_ok:
            self.verify_api(config_data)
        else:
            self.print_section("7. API DE BRANDING")
            self.print_info("Test ignoré (serveur non démarré)")
        
        # 8. Documentation
        self.verify_documentation()
        
        # Résumé
        self.print_summary()
        
        return self.error_count == 0

def main():
    """Fonction principale."""
    verbose = '-v' in sys.argv or '--verbose' in sys.argv
    auto_fix = '--fix' in sys.argv
    json_output = '-j' in sys.argv or '--json' in sys.argv
    
    if '-h' in sys.argv or '--help' in sys.argv:
        print("Usage: python verify_branding.py [options]")
        print()
        print("Options:")
        print("  -v, --verbose    Mode verbeux")
        print("  -j, --json       Sortie JSON")
        print("  --fix            Correction automatique")
        print("  -h, --help       Afficher l'aide")
        sys.exit(0)
    
    verifier = BrandingVerifier(verbose=verbose, auto_fix=auto_fix)
    success = verifier.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nVérification interrompue par l'utilisateur")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Erreur inattendue: {e}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)





