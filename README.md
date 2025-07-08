# Tower Rush

Tower Rush est un jeu de stratégie en temps réel (RTS) médiéval fantastique jouable dans le navigateur. Les joueurs contrôlent des bâtiments qui produisent des unités et s'engagent dans des batailles tactiques sur une carte médiévale.

## Caractéristiques

- **Gameplay Stratégique** : Contrôlez des bâtiments, produisez des unités et conquérez la carte
- **Mode Multijoueur** : Jouez jusqu'à 4 joueurs en temps réel via WebRTC
- **Progression des Bâtiments** : Les bâtiments évoluent visuellement (maison → tour → château)
- **Système de Combat** : Bonus défensif de 20% pour les défenseurs
- **Interface Moderne** : Design responsive avec animations fluides
- **Système de Profil** : Créez votre profil avec avatar personnalisé
- **Classement** : Suivez vos statistiques et comparez-vous aux autres joueurs

## Comment Jouer

### Commandes

- **Clic gauche** : Sélectionner/désélectionner des bâtiments
- **Clic droit** : Envoyer des unités vers une cible
- **Molette de souris** : Ajuster le pourcentage d'unités à envoyer (10%-100%)
- **Espace** : Pause (mode solo uniquement)

### Objectif

Conquérir tous les bâtiments ennemis en envoyant vos unités les attaquer. Chaque bâtiment produit automatiquement des unités (1/seconde pour les bâtiments normaux, 2/seconde pour les châteaux).

## Installation

1. Clonez le repository :
```bash
git clone https://github.com/votre-username/tower-rush.git
cd tower-rush
```

2. Ouvrez `index.html` dans votre navigateur moderne préféré

Aucune installation ou compilation n'est nécessaire - c'est une application web pure en JavaScript vanilla !

## Mode Multijoueur

1. L'hôte crée une partie et partage le code de la salle
2. Les autres joueurs rejoignent avec ce code
3. Jusqu'à 4 joueurs peuvent jouer ensemble
4. La connexion se fait en peer-to-peer via WebRTC

## Structure du Projet

```
tower-rush/
├── index.html          # Page d'accueil
├── game.html           # Interface de jeu
├── style.css           # Styles principaux
├── modern-style.css    # Styles modernes additionnels
├── src/
│   ├── core/
│   │   ├── Game.js     # Logique principale du jeu
│   │   └── LeaderboardManager.js
│   └── multiplayer/
│       └── MultiplayerManager.js
└── assets/             # Sprites et ressources graphiques
    ├── Buildings/
    ├── Factions/
    ├── Decorations/
    └── Terrain/
```

## Technologies Utilisées

- **JavaScript Vanilla** : Aucun framework, code pur
- **Canvas API** : Pour le rendu 2D
- **WebRTC (PeerJS)** : Pour le multijoueur peer-to-peer
- **LocalStorage** : Pour sauvegarder les profils et scores
- **GitHub Actions** : Pour le déploiement automatique

## Développement

Pour contribuer au projet :

1. Forkez le repository
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements en utilisant les [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/)
4. Poussez vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une Pull Request

### Format des commits

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) pour automatiser les releases :

- `feat:` - Nouvelle fonctionnalité (version mineure)
- `fix:` - Correction de bug (version patch)
- `docs:` - Documentation uniquement
- `style:` - Changements de formatage
- `refactor:` - Refactoring du code
- `perf:` - Amélioration des performances
- `test:` - Ajout ou modification de tests
- `chore:` - Maintenance

Exemples :
```bash
feat: ajouter le mode multijoueur
fix: corriger le bug d'affichage des unités
docs: mettre à jour le README
```

### Releases automatiques

Les releases sont automatiquement créées lors des merges dans `master` grâce à [semantic-release](https://semantic-release.gitbook.io/semantic-release/). Un changelog est généré automatiquement basé sur les commits.

## Déploiement

### GitHub Pages

Le jeu est automatiquement déployé sur GitHub Pages à chaque push sur la branche principale.

### BunnyCDN

Pour déployer sur BunnyCDN :

1. **Configurer les secrets GitHub** :
   ```bash
   # Rendre le script exécutable
   chmod +x setup-bunny-secrets.sh
   
   # Exécuter le script de configuration
   ./setup-bunny-secrets.sh
   ```

2. **Informations requises** :
   - Nom de votre Storage Zone BunnyCDN
   - Mot de passe FTP/API de votre Storage Zone
   - Région de votre Storage Zone
   - Clé API BunnyCDN (dans Account Settings)
   - ID de votre Pull Zone

3. **Déploiement** :
   - Automatique : À chaque push sur `main` ou `master`
   - Manuel : Via GitHub Actions → Deploy to BunnyCDN → Run workflow

### Configuration manuelle des secrets

Si vous préférez configurer manuellement, ajoutez ces secrets dans Settings → Secrets → Actions :

- `BUNNY_STORAGE_ZONE` : Nom de votre storage zone
- `BUNNY_STORAGE_PASSWORD` : Mot de passe FTP/API
- `BUNNY_STORAGE_ENDPOINT` : storage, ny.storage, la.storage, etc.
- `BUNNY_API_KEY` : Votre clé API BunnyCDN
- `BUNNY_PULL_ZONE_ID` : ID de votre pull zone

## License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Crédits

- Développé avec passion pour les amateurs de jeux de stratégie
- Assets graphiques : [Source des assets si applicable]
- Musique et sons : [Source audio si applicable]

---

Fait avec ❤️ pour la communauté des joueurs RTS