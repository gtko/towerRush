#!/usr/bin/env python3
"""
Script pour créer de nouvelles variantes colorées des assets de Tower Rush.
Ce script permet de générer automatiquement de nouvelles couleurs pour les bâtiments et unités.
"""

import os
import sys
from PIL import Image, ImageEnhance, ImageOps
import argparse

def create_color_variant(image_path, output_path, color_name, hue_shift=0, saturation_multiplier=1.0, brightness_multiplier=1.0):
    """
    Crée une variante colorée d'une image en ajustant la teinte, saturation et luminosité.
    
    Args:
        image_path: Chemin vers l'image source
        output_path: Chemin de sortie pour la nouvelle image
        color_name: Nom de la couleur (utilisé dans les logs)
        hue_shift: Décalage de teinte (-180 à 180)
        saturation_multiplier: Multiplicateur de saturation (0.0 à 2.0)
        brightness_multiplier: Multiplicateur de luminosité (0.0 à 2.0)
    """
    try:
        # Ouvrir l'image source
        image = Image.open(image_path)
        
        # Convertir en RGBA si nécessaire pour préserver la transparence
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # Séparer les canaux RGBA
        r, g, b, a = image.split()
        
        # Recombiner en RGB pour les transformations de couleur
        rgb_image = Image.merge('RGB', (r, g, b))
        
        # Convertir en HSV pour manipuler la teinte
        hsv_image = rgb_image.convert('HSV')
        h, s, v = hsv_image.split()
        
        # Ajuster la teinte si nécessaire
        if hue_shift != 0:
            h_data = list(h.getdata())
            h_data = [(pixel + hue_shift) % 256 for pixel in h_data]
            h = Image.new('L', h.size)
            h.putdata(h_data)
        
        # Ajuster la saturation
        if saturation_multiplier != 1.0:
            s_enhancer = ImageEnhance.Color(Image.merge('HSV', (h, s, v)).convert('RGB'))
            enhanced = s_enhancer.enhance(saturation_multiplier)
            h, s, v = enhanced.convert('HSV').split()
        
        # Ajuster la luminosité
        if brightness_multiplier != 1.0:
            v_enhancer = ImageEnhance.Brightness(Image.merge('HSV', (h, s, v)).convert('RGB'))
            enhanced = v_enhancer.enhance(brightness_multiplier)
            h, s, v = enhanced.convert('HSV').split()
        
        # Reconvertir en RGB
        final_rgb = Image.merge('HSV', (h, s, v)).convert('RGB')
        r, g, b = final_rgb.split()
        
        # Recombiner avec le canal alpha original
        final_image = Image.merge('RGBA', (r, g, b, a))
        
        # Créer le dossier de sortie si nécessaire
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Sauvegarder l'image
        final_image.save(output_path, 'PNG')
        print(f"✓ Créé: {output_path} ({color_name})")
        
    except Exception as e:
        print(f"✗ Erreur lors de la création de {output_path}: {e}")

def create_green_buildings():
    """Crée des bâtiments verts pour les neutres."""
    base_path = "assets/Buildings"
    source_folder = "Blue Buildings"  # Utiliser les bâtiments bleus comme base
    target_folder = "Green Buildings"
    
    buildings = ["Castle.png", "House1.png", "House2.png", "House3.png", "Tower.png"]
    
    print(f"Création des bâtiments verts à partir de {source_folder}...")
    
    for building in buildings:
        source_path = os.path.join(base_path, source_folder, building)
        target_path = os.path.join(base_path, target_folder, building)
        
        if os.path.exists(source_path):
            # Ajuster vers le vert (décalage de teinte vers 120°)
            create_color_variant(
                source_path, 
                target_path, 
                "Vert",
                hue_shift=60,  # Décalage vers le vert
                saturation_multiplier=1.2,  # Légèrement plus saturé
                brightness_multiplier=0.9   # Légèrement plus sombre
            )
        else:
            print(f"✗ Fichier source non trouvé: {source_path}")

def create_green_units():
    """Crée des unités vertes pour les neutres."""
    base_path = "assets/Factions/Knights/Troops/Warrior"
    source_folder = "Blue"
    target_folder = "Green"
    
    unit_file = "Warrior_Blue.png"
    target_file = "Warrior_Green.png"
    
    print(f"Création des unités vertes à partir de {source_folder}...")
    
    source_path = os.path.join(base_path, source_folder, unit_file)
    target_path = os.path.join(base_path, target_folder, target_file)
    
    if os.path.exists(source_path):
        create_color_variant(
            source_path, 
            target_path, 
            "Vert",
            hue_shift=60,  # Décalage vers le vert
            saturation_multiplier=1.2,
            brightness_multiplier=0.9
        )
    else:
        print(f"✗ Fichier source non trouvé: {source_path}")

def create_custom_color(base_color, target_color, hue_shift, saturation_mult, brightness_mult):
    """Crée une couleur personnalisée."""
    print(f"Création d'assets {target_color} à partir de {base_color}...")
    
    # Bâtiments
    base_path = "assets/Buildings"
    source_folder = f"{base_color} Buildings"
    target_folder = f"{target_color} Buildings"
    
    buildings = ["Castle.png", "House1.png", "House2.png", "House3.png", "Tower.png"]
    
    for building in buildings:
        source_path = os.path.join(base_path, source_folder, building)
        target_path = os.path.join(base_path, target_folder, building)
        
        if os.path.exists(source_path):
            create_color_variant(
                source_path, target_path, target_color,
                hue_shift, saturation_mult, brightness_mult
            )
    
    # Unités
    base_path = "assets/Factions/Knights/Troops/Warrior"
    source_folder = base_color
    target_folder = target_color
    
    source_file = f"Warrior_{base_color}.png"
    target_file = f"Warrior_{target_color}.png"
    
    source_path = os.path.join(base_path, source_folder, source_file)
    target_path = os.path.join(base_path, target_folder, target_file)
    
    if os.path.exists(source_path):
        create_color_variant(
            source_path, target_path, target_color,
            hue_shift, saturation_mult, brightness_mult
        )

def main():
    parser = argparse.ArgumentParser(description='Crée de nouvelles variantes colorées des assets Tower Rush')
    parser.add_argument('--green', action='store_true', help='Crée des assets verts pour les neutres')
    parser.add_argument('--custom', nargs=5, metavar=('BASE', 'TARGET', 'HUE', 'SAT', 'BRIGHT'),
                       help='Crée une couleur personnalisée: base_color target_color hue_shift saturation brightness')
    parser.add_argument('--all-presets', action='store_true', help='Crée toutes les couleurs prédéfinies')
    
    args = parser.parse_args()
    
    try:
        from PIL import Image
    except ImportError:
        print("Erreur: Pillow n'est pas installé. Installez-le avec: pip install Pillow")
        sys.exit(1)
    
    if args.green:
        create_green_buildings()
        create_green_units()
    
    elif args.custom:
        base_color, target_color, hue_shift, saturation_mult, brightness_mult = args.custom
        create_custom_color(
            base_color, target_color, 
            int(hue_shift), float(saturation_mult), float(brightness_mult)
        )
    
    elif args.all_presets:
        # Créer plusieurs couleurs prédéfinies
        presets = [
            ("Blue", "Green", 60, 1.2, 0.9),     # Vert pour neutres
            ("Blue", "Orange", -30, 1.1, 1.0),   # Orange
            ("Blue", "Pink", -60, 1.3, 1.1),     # Rose
            ("Blue", "Cyan", 30, 1.0, 1.1),      # Cyan
        ]
        
        for base, target, hue, sat, bright in presets:
            create_custom_color(base, target, hue, sat, bright)
    
    else:
        parser.print_help()
        print("\nExemples d'utilisation:")
        print("  python create_colored_assets.py --green")
        print("  python create_colored_assets.py --custom Blue Orange -30 1.1 1.0")
        print("  python create_colored_assets.py --all-presets")

if __name__ == "__main__":
    main()