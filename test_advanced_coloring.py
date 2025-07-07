#!/usr/bin/env python3
"""
Script de test pour comparer les différentes méthodes de coloration.
"""

import os
from advanced_color_assets import selective_recolor, create_stone_variant

def test_different_methods():
    """Teste différentes approches de coloration sur un asset."""
    source = "assets/Buildings/Blue Buildings/House1.png"
    
    if not os.path.exists(source):
        print("Fichier source non trouvé pour le test")
        return
    
    print("Test de différentes méthodes de coloration...")
    
    # Test 1: Coloration sélective verte
    selective_recolor(source, "test_outputs/house1_selective_green.png", 120, intensity=0.6)
    
    # Test 2: Coloration sélective orange
    selective_recolor(source, "test_outputs/house1_selective_orange.png", 30, intensity=0.7)
    
    # Test 3: Effet pierre
    create_stone_variant(source, "test_outputs/house1_stone.png")
    
    # Test 4: Coloration sélective rouge foncé
    selective_recolor(source, "test_outputs/house1_selective_darkred.png", 0, intensity=0.8)
    
    print("Tests terminés. Vérifiez le dossier test_outputs/")

if __name__ == "__main__":
    test_different_methods()