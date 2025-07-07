# Générateur d'Assets Colorés - Tower Rush

Ce script Python permet de créer automatiquement de nouvelles variantes colorées des assets du jeu Tower Rush.

## Installation

Assurez-vous d'avoir Python 3 et Pillow installés :

```bash
pip install Pillow
```

## Utilisation

### Créer des assets verts (pour les neutres)

```bash
python create_colored_assets.py --green
```

Cette commande crée automatiquement :
- Des bâtiments verts dans `assets/Buildings/Green Buildings/`
- Des unités vertes dans `assets/Factions/Knights/Troops/Warrior/Green/`

### Créer une couleur personnalisée

```bash
python create_colored_assets.py --custom Base_Color Target_Color hue_shift saturation brightness
```

Exemple pour créer des assets orange :
```bash
python create_colored_assets.py --custom Blue Orange -30 1.1 1.0
```

### Créer toutes les couleurs prédéfinies

```bash
python create_colored_assets.py --all-presets
```

Crée automatiquement :
- Vert (pour neutres)
- Orange
- Rose
- Cyan

## Paramètres

- **hue_shift** : Décalage de teinte (-180 à 180)
  - 0 = pas de changement
  - 60 = vers le vert
  - -30 = vers l'orange
  - -60 = vers le rose

- **saturation** : Multiplicateur de saturation (0.0 à 2.0)
  - 1.0 = pas de changement
  - > 1.0 = plus saturé
  - < 1.0 = moins saturé

- **brightness** : Multiplicateur de luminosité (0.0 à 2.0)
  - 1.0 = pas de changement
  - > 1.0 = plus lumineux
  - < 1.0 = plus sombre

## Structure des Assets

Le script fonctionne avec la structure suivante :

```
assets/
├── Buildings/
│   ├── Blue Buildings/
│   ├── Red Buildings/
│   ├── Green Buildings/    (généré)
│   └── ...
└── Factions/
    └── Knights/
        └── Troops/
            └── Warrior/
                ├── Blue/
                ├── Red/
                ├── Green/  (généré)
                └── ...
```

## Couleurs Actuelles

- **Joueur 1** : Bleu
- **Joueur 2** : Rouge  
- **Joueur 3** : Noir
- **Joueur 4** : Jaune
- **Neutres** : Vert (nouvellement ajouté)