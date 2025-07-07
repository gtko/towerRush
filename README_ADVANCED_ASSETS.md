# Générateur d'Assets Avancé - Tower Rush

Ce script utilise un algorithme avancé qui préserve les détails naturels des images tout en changeant les couleurs de manière sélective.

## Différences avec le script basique

### Script basique (`create_colored_assets.py`)
- Change toute l'image uniformément
- Peut rendre les détails moins naturels
- Rapide mais moins précis

### Script avancé (`advanced_color_assets.py`)
- **Coloration sélective** : Ne change que certaines parties
- **Préservation des détails** : Garde les ombres, contours et reflets
- **Détection intelligente** : Identifie quelles zones recolorer
- **Rendu naturel** : Résultat plus réaliste

## Algorithme avancé

### Sélection des pixels
```python
# Ne recolorie que si :
- Le pixel a suffisamment de saturation (couleur visible)
- Ce n'est pas une ombre (luminosité > 60)
- Ce n'est pas un reflet (luminosité < 220)
- Le pixel a une couleur dominante identifiable
```

### Préservation des détails
- **Ombres** : Pixels sombres gardés intacts
- **Contours** : Bordures noires préservées  
- **Reflets** : Zones très claires non modifiées
- **Textures** : Détails de surface maintenus

## Utilisation

### Assets neutres effet pierre
```bash
python advanced_color_assets.py --stone
```
Crée des assets gris/brun naturels pour les neutres.

### Assets verts avancés
```bash
python advanced_color_assets.py --green-advanced
```
Coloration verte sélective préservant les détails.

### Test des méthodes
```bash
python test_advanced_coloring.py
```
Compare les différentes approches sur un même asset.

## Résultats

**Assets Pierre (Neutres)** :
- Couleur gris-brun naturelle
- Détails et textures préservés
- Aspect plus réaliste pour les neutres

**Coloration Sélective** :
- Change seulement les zones colorées principales
- Garde l'aspect original des matériaux
- Rendu plus professionnel

## Couleurs Finales

- **Joueur 1** : Bleu
- **Joueur 2** : Rouge  
- **Joueur 3** : Noir
- **Joueur 4** : Jaune
- **Neutres** : Pierre (gris-brun naturel)