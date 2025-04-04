#!/usr/bin/env python3
"""
Script de traitement de fichiers JSON pour analyse de harcèlement
Module de fallback lorsque l'API Azure AI n'est pas disponible
"""

import sys
import json
import argparse
import os
from datetime import datetime

def main():
    # Analyse des arguments de la ligne de commande
    parser = argparse.ArgumentParser(description="Analyse de fichiers JSON pour détecter le harcèlement")
    parser.add_argument("json_file", help="Chemin vers le fichier JSON à analyser")
    parser.add_argument("--api-endpoint", help="Point de terminaison de l'API (optionnel)")
    parser.add_argument("--api-key", help="Clé d'API (optionnel)")
    
    args = parser.parse_args()
    
    # Vérifier que le fichier existe
    if not os.path.exists(args.json_file):
        print(f"Erreur: Le fichier {args.json_file} n'existe pas.")
        sys.exit(1)
    
    try:
        # Lire le contenu du fichier JSON
        with open(args.json_file, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        # Générer un message simple (mode fallback)
        message = "ANALYSE DE FALLBACK: Ce message a été généré car l'API Azure AI n'est pas disponible.\n\n"
        message += "Résumé:\n"
        message += "- Le fichier JSON a été reçu et analysé correctement\n"
        message += "- L'analyse complète n'est pas disponible - veuillez configurer l'API Azure AI\n"
        message += f"- Date et heure de l'analyse: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"

        output_file = os.path.join(
            os.path.dirname(args.json_file),
            f"output_{os.path.basename(args.json_file).replace('.json', '')}.txt"
        )

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(message)

        try:
            os.remove(args.json_file)
            print(f"Fichier JSON supprimé: {args.json_file}")
        except Exception as delete_error:
            print(f"Erreur lors de la suppression du fichier JSON: {str(delete_error)}")

        print(f"Le compte rendu simplifié a été enregistré dans: {output_file}")

    except json.JSONDecodeError:
        print(f"Erreur: Le fichier {args.json_file} n'est pas un JSON valide.")
        sys.exit(1)
    except Exception as e:
        print(f"Erreur lors du traitement: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()