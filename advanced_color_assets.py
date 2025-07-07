#!/usr/bin/env python3
"""
Script avancé pour créer de nouvelles variantes colorées des assets de Tower Rush.
Utilise une approche plus sophistiquée qui ne colorie que certaines parties des images.
"""

import os
import sys
import numpy as np
from PIL import Image, ImageEnhance
import argparse

def rgb_to_hsv(r, g, b):
    """Convertit RGB en HSV."""
    r, g, b = r/255.0, g/255.0, b/255.0
    mx = max(r, g, b)
    mn = min(r, g, b)
    diff = mx - mn
    
    if mx == mn:
        h = 0
    elif mx == r:
        h = (60 * ((g - b) / diff) + 360) % 360
    elif mx == g:
        h = (60 * ((b - r) / diff) + 120) % 360
    elif mx == b:
        h = (60 * ((r - g) / diff) + 240) % 360
    
    if mx == 0:
        s = 0
    else:
        s = (diff / mx) * 100
    
    v = mx * 100
    return h, s, v

def hsv_to_rgb(h, s, v):
    """Convertit HSV en RGB."""
    h = h % 360
    s = s / 100.0
    v = v / 100.0
    
    c = v * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = v - c
    
    if 0 <= h < 60:
        r, g, b = c, x, 0
    elif 60 <= h < 120:
        r, g, b = x, c, 0
    elif 120 <= h < 180:
        r, g, b = 0, c, x
    elif 180 <= h < 240:
        r, g, b = 0, x, c
    elif 240 <= h < 300:
        r, g, b = x, 0, c
    elif 300 <= h < 360:
        r, g, b = c, 0, x
    
    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)
    
    return r, g, b

def is_colored_pixel(r, g, b, tolerance=30):
    """
    Détermine si un pixel est suffisamment coloré pour être recolorié.
    Évite de recolorer les pixels gris/neutres (pierre, métal, etc.)
    """
    if r == 0 and g == 0 and b == 0:  # Noir
        return False
    
    # Calculer la saturation
    mx = max(r, g, b)
    mn = min(r, g, b)
    
    if mx == 0:
        return False
    
    saturation = ((mx - mn) / mx) * 100
    
    # Seulement recolorer les pixels avec suffisamment de saturation
    return saturation > tolerance

def is_blue_dominant(r, g, b, tolerance=20):
    """Vérifie si un pixel a une dominante bleue (pour les assets bleus)."""
    return b > r + tolerance and b > g + tolerance

def is_red_dominant(r, g, b, tolerance=20):
    """Vérifie si un pixel a une dominante rouge (pour les assets rouges)."""
    return r > g + tolerance and r > b + tolerance

def selective_recolor(image_path, output_path, target_hue, intensity=0.8, preserve_shadows=True):
    """
    Recolorie sélectivement une image en préservant les détails naturels.
    
    Args:
        image_path: Chemin vers l'image source
        output_path: Chemin de sortie
        target_hue: Teinte cible (0-360)
        intensity: Intensité de la recoloration (0.0-1.0)
        preserve_shadows: Préserver les ombres et détails sombres
    """
    try:
        # Ouvrir l'image
        image = Image.open(image_path)
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # Convertir en array numpy pour manipulation
        data = np.array(image)
        
        # Traiter chaque pixel
        for y in range(data.shape[0]):
            for x in range(data.shape[1]):
                r, g, b, a = data[y, x]
                
                # Ignorer les pixels transparents
                if a == 0:
                    continue
                
                # Calculer la luminosité
                brightness = (r + g + b) / 3
                
                # Préserver les pixels très sombres (ombres, contours)
                if preserve_shadows and brightness < 60:
                    continue
                
                # Préserver les pixels très clairs (reflets)
                if brightness > 220:
                    continue
                
                # Seulement recolorer les pixels avec couleur dominante
                if is_colored_pixel(r, g, b, tolerance=25):
                    # Convertir en HSV
                    h, s, v = rgb_to_hsv(r, g, b)
                    
                    # Seulement si le pixel a une saturation significative
                    if s > 20:
                        # Changer la teinte vers la cible
                        new_hue = target_hue
                        
                        # Ajuster l'intensité de la recoloration
                        h = h + (new_hue - h) * intensity
                        
                        # Légèrement réduire la saturation pour un look plus naturel
                        s = min(s * 0.9, 100)
                        
                        # Convertir de retour en RGB
                        new_r, new_g, new_b = hsv_to_rgb(h, s, v)
                        
                        # Appliquer la nouvelle couleur
                        data[y, x] = [new_r, new_g, new_b, a]
        
        # Créer la nouvelle image
        new_image = Image.fromarray(data, 'RGBA')
        
        # Créer le dossier de sortie
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Sauvegarder
        new_image.save(output_path, 'PNG')
        print(f"✓ Créé: {output_path}")
        
    except Exception as e:
        print(f"✗ Erreur: {e}")

def create_advanced_green_assets():
    """Crée des assets verts avec l'algorithme avancé."""
    print("Création d'assets verts avec algorithme avancé...")
    
    # Bâtiments
    base_path = "assets/Buildings"
    buildings = ["Castle.png", "House1.png", "House2.png", "House3.png", "Tower.png"]
    
    for building in buildings:
        source_path = os.path.join(base_path, "Blue Buildings", building)
        target_path = os.path.join(base_path, "Green Buildings Advanced", building)
        
        if os.path.exists(source_path):
            selective_recolor(source_path, target_path, 120, intensity=0.7)  # Vert
    
    # Unités
    source_path = os.path.join("assets/Factions/Knights/Troops/Warrior/Blue", "Warrior_Blue.png")
    target_path = os.path.join("assets/Factions/Knights/Troops/Warrior/Green Advanced", "Warrior_Green.png")
    
    if os.path.exists(source_path):
        selective_recolor(source_path, target_path, 120, intensity=0.7)

def create_neutral_stone_assets():
    """Crée des assets neutres avec apparence de pierre."""
    print("Création d'assets neutres avec effet pierre...")
    
    # Bâtiments
    base_path = "assets/Buildings"
    buildings = ["Castle.png", "House1.png", "House2.png", "House3.png", "Tower.png"]
    
    for building in buildings:
        source_path = os.path.join(base_path, "Blue Buildings", building)
        target_path = os.path.join(base_path, "Stone Buildings", building)
        
        if os.path.exists(source_path):
            create_stone_variant(source_path, target_path)
    
    # Unités
    source_path = os.path.join("assets/Factions/Knights/Troops/Warrior/Blue", "Warrior_Blue.png")
    target_path = os.path.join("assets/Factions/Knights/Troops/Warrior/Stone", "Warrior_Stone.png")
    
    if os.path.exists(source_path):
        create_stone_variant(source_path, target_path)

def create_stone_variant(image_path, output_path):
    """Crée une variante pierre/gris d'une image."""
    try:
        image = Image.open(image_path)
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        data = np.array(image)
        
        for y in range(data.shape[0]):
            for x in range(data.shape[1]):
                r, g, b, a = data[y, x]
                
                if a == 0:
                    continue
                
                # Convertir vers des tons de gris/brun pour effet pierre
                if is_colored_pixel(r, g, b, tolerance=20):
                    # Calculer une moyenne pondérée pour garder les détails
                    gray = int(0.3 * r + 0.4 * g + 0.3 * b)
                    
                    # Ajouter une légère teinte brune
                    stone_r = min(255, int(gray * 1.1))
                    stone_g = min(255, int(gray * 0.95))
                    stone_b = min(255, int(gray * 0.8))
                    
                    data[y, x] = [stone_r, stone_g, stone_b, a]
        
        new_image = Image.fromarray(data, 'RGBA')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        new_image.save(output_path, 'PNG')
        print(f"✓ Créé: {output_path}")
        
    except Exception as e:
        print(f"✗ Erreur: {e}")

def main():
    parser = argparse.ArgumentParser(description='Crée des assets avec coloration avancée')
    parser.add_argument('--green-advanced', action='store_true', 
                       help='Crée des assets verts avec algorithme avancé')
    parser.add_argument('--stone', action='store_true', 
                       help='Crée des assets neutres effet pierre')
    parser.add_argument('--custom-advanced', nargs=2, metavar=('SOURCE', 'HUE'),
                       help='Recolorie avec algorithme avancé: source_folder target_hue')
    
    args = parser.parse_args()
    
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        print("Erreur: Installez les dépendances avec: pip install Pillow numpy")
        sys.exit(1)
    
    if args.green_advanced:
        create_advanced_green_assets()
    
    elif args.stone:
        create_neutral_stone_assets()
    
    elif args.custom_advanced:
        source_folder, target_hue = args.custom_advanced
        print(f"Recoloration avancée vers teinte {target_hue}...")
        # Implementation pour couleur personnalisée
    
    else:
        parser.print_help()
        print("\nExemples:")
        print("  python advanced_color_assets.py --green-advanced")
        print("  python advanced_color_assets.py --stone")

if __name__ == "__main__":
    main()