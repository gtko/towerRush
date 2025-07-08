# GitHub Actions Deployment to BunnyCDN

## Configuration requise

Pour que le déploiement fonctionne, vous devez configurer les secrets suivants dans votre repository GitHub :

### 1. Secrets BunnyCDN Storage

- **`BUNNY_STORAGE_ZONE`** : Le nom de votre Storage Zone BunnyCDN (ex: `kids-corner-storage`)
- **`BUNNY_STORAGE_PASSWORD`** : Le mot de passe FTP/API de votre Storage Zone
- **`BUNNY_STORAGE_ENDPOINT`** : L'endpoint de votre région (ex: `storage`, `ny`, `la`, `sg`, etc.)
  - `storage` = Falkenstein (Europe)
  - `ny` = New York (USA Est)
  - `la` = Los Angeles (USA Ouest)
  - `sg` = Singapour (Asie)
  - `syd` = Sydney (Océanie)
  - `br` = São Paulo (Amérique du Sud)
  - `jh` = Johannesburg (Afrique)

### 2. Secrets BunnyCDN API

- **`BUNNY_API_KEY`** : Votre clé API BunnyCDN (trouvable dans Account Settings)
- **`BUNNY_PULL_ZONE_ID`** : L'ID de votre Pull Zone (visible dans le dashboard BunnyCDN)

## Comment ajouter les secrets

1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** → **Secrets and variables** → **Actions**
3. Cliquez sur **New repository secret**
4. Ajoutez chaque secret avec le nom exact et la valeur correspondante

## Exemple de configuration

```yaml
BUNNY_STORAGE_ZONE: kids-corner-storage
BUNNY_STORAGE_PASSWORD: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_STORAGE_ENDPOINT: storage
BUNNY_API_KEY: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BUNNY_PULL_ZONE_ID: 123456
```

## Utilisation

### Déploiement automatique
Le site sera automatiquement déployé à chaque push sur la branche `main`.

### Déploiement manuel
1. Allez dans l'onglet **Actions** de votre repository
2. Sélectionnez **Deploy to BunnyCDN**
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche et cliquez sur **Run workflow**

## Vérification du déploiement

Après le déploiement :
1. Vérifiez la console BunnyCDN pour voir les fichiers uploadés
2. Testez votre site sur l'URL BunnyCDN configurée
3. Le cache est automatiquement purgé après chaque déploiement

## Dépannage

### Erreur 401 Unauthorized
- Vérifiez que `BUNNY_STORAGE_PASSWORD` est correct
- Assurez-vous que le Storage Zone existe

### Erreur 404 Not Found
- Vérifiez que `BUNNY_STORAGE_ZONE` correspond exactement au nom dans BunnyCDN
- Vérifiez que `BUNNY_STORAGE_ENDPOINT` est correct pour votre région

### Les fichiers ne se mettent pas à jour
- Le cache a été purgé automatiquement, mais attendez 1-2 minutes
- Essayez de faire un hard refresh (Ctrl+F5) dans votre navigateur