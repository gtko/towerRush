class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas gameCanvas introuvable! Vérifiez que vous êtes sur la bonne page.');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.buildings = [];
        this.unitGroups = [];
        this.selectedBuildings = [];
        this.targetBuilding = null;
        this.gameOver = false;
        this.gameStarted = false;
        this.gameLoopStarted = false;
        this.sendPercentage = 50;
        this.backgroundSprites = [];
        
        // Sélection par rectangle
        this.isSelecting = false;
        this.wasSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionRect = null;
        
        // Bâtiment survolé
        this.hoveredBuilding = null;
        
        // Canvas pour pré-générer le terrain
        this.terrainCanvas = null;
        this.terrainGenerated = false;
        
        // Système d'IA avec niveaux de difficulté
        this.aiDifficulty = 'medium';
        this.aiSettings = this.getAISettings();
        this.lastAIActions = {}; // Pour tracker les dernières actions par faction
        
        // Système audio
        this.backgroundMusic = null;
        this.musicEnabled = true;
        this.initAudio();
        
        // Système multijoueur
        this.multiplayerManager = null;
        this.isMultiplayer = false;
        this.localPlayerIndex = 0; // Index du joueur local (0 = joueur 1, 1 = joueur 2, etc.)
        this.networkGameState = null;
        
        // Optimisations performance multijoueur
        this.lastBroadcast = null;
        this.lastBackgroundSync = null;
        this.lastNetworkUpdate = null;
        this.pendingBroadcast = null;
        this.pendingNetworkUpdate = null;
        
        // Timer pour le mode arrière-plan
        this.backgroundTimer = null;
        this.backgroundInterval = null;
        this.gameStartTime = null;
        
        // Système de profil et base de données
        this.neonClient = null;
        this.leaderboardManager = null;
        this.playerProfile = this.loadProfile();
        this.initializeDatabase();
        
        if (this.canvas) {
            this.setupCanvas();
            this.loadBackground();
            this.setupEventListeners();
        }
        this.setupMenuListeners();
        this.setupAudioControls();
        this.setupVisibilityHandlers();
        this.setupProfileSystem();
        this.setupLeaderboardListeners();
        
        // Initialiser le multijoueur après un délai pour s'assurer que tout est chargé
        setTimeout(() => {
            this.initializeMultiplayer();
        }, 500);
    }
    
    getPlayerOwner(index) {
        const owners = ['player', 'enemy', 'enemy2', 'enemy3'];
        return owners[index] || 'enemy';
    }
    
    setupCanvas() {
        if (!this.canvas) {
            console.error('Canvas non disponible pour setupCanvas');
            return;
        }
        
        // Définir la taille du canvas en fonction de la fenêtre
        const container = this.canvas.parentElement;
        
        if (!container) {
            console.error('Container parent du canvas introuvable');
            return;
        }
        
        console.log('setupCanvas - Container:', container.id, 'Client dimensions:', container.clientWidth, 'x', container.clientHeight);
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Ratio fixe pour éviter les déformations
        const aspectRatio = 16 / 9;
        let canvasWidth, canvasHeight;
        
        // Calculer la taille optimale en gardant le ratio
        if (containerWidth / containerHeight > aspectRatio) {
            // Container plus large que le ratio
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * aspectRatio;
        } else {
            // Container plus haut que le ratio
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / aspectRatio;
        }
        
        // Taille fixe du canvas pour éviter les déformations
        this.canvas.width = 1920;
        this.canvas.height = 1080;
        
        // Ajuster le style CSS pour l'affichage
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        
        // S'assurer que le canvas est visible
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
        
        console.log(`Canvas resolution: 1920x1080, Display size: ${Math.round(canvasWidth)}x${Math.round(canvasHeight)}`);
        console.log('Canvas final style:', this.canvas.style.display, this.canvas.style.visibility);
    }
    
    handleResize() {
        // Sauvegarder les positions relatives des bâtiments
        const relativeBuildingPositions = this.buildings.map(building => ({
            building: building,
            relativeX: building.x / this.canvas.width,
            relativeY: building.y / this.canvas.height
        }));
        
        // Reconfigurer le canvas
        this.setupCanvas();
        
        // Repositionner les bâtiments
        relativeBuildingPositions.forEach(({building, relativeX, relativeY}) => {
            building.x = this.canvas.width * relativeX;
            building.y = this.canvas.height * relativeY;
        });
        
        // Forcer la régénération du terrain
        this.terrainGenerated = false;
        this.terrainCanvas = null;
        
        // Recharger le background avec nouvelles positions
        this.loadBackground();
    }
    
    
    generateTerrain() {
        // Générer le terrain une seule fois dans un canvas séparé
        if (this.terrainGenerated && this.terrainCanvas) return;
        
        // Créer un canvas temporaire pour le terrain
        this.terrainCanvas = document.createElement('canvas');
        this.terrainCanvas.width = this.canvas.width;
        this.terrainCanvas.height = this.canvas.height;
        const terrainCtx = this.terrainCanvas.getContext('2d');
        
        // Créer un terrain texturé avec de très petites tuiles de 2 pixels
        const tileSize = 2;
        const cols = Math.ceil(this.canvas.width / tileSize);
        const rows = Math.ceil(this.canvas.height / tileSize);
        
        // Palette de verts variés
        const grassColors = [
            '#3a6b47', '#4a7c59', '#5a8d69', '#3f7050',
            '#4b7d5a', '#52845f', '#457556', '#486253'
        ];
        
        // Générer le terrain pixel par pixel
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * tileSize;
                const y = row * tileSize;
                
                // Utiliser un bruit simple pour créer de la variation naturelle
                const noiseX = Math.sin(x * 0.01) * Math.cos(y * 0.008);
                const noiseY = Math.cos(x * 0.008) * Math.sin(y * 0.01);
                const noise = (noiseX + noiseY + 2) / 4;
                
                const zoneIndex = Math.floor(noise * grassColors.length);
                let colorIndex = zoneIndex % grassColors.length;
                
                if ((row + col) % 7 === 0) {
                    colorIndex = (colorIndex + 1) % grassColors.length;
                }
                
                terrainCtx.fillStyle = grassColors[colorIndex];
                terrainCtx.fillRect(x, y, tileSize, tileSize);
            }
        }
        
        this.terrainGenerated = true;
    }

    drawTerrain(ctx) {
        // Générer le terrain si ce n'est pas déjà fait
        this.generateTerrain();
        
        // Dessiner le terrain pré-généré (ultra rapide)
        if (this.terrainCanvas) {
            ctx.drawImage(this.terrainCanvas, 0, 0);
        }
    }


    loadBackground() {
        // Terrain simple en couleur verte - pas besoin de sprites
        this.terrainLoaded = true;
        
        // Décorations positionnées relativement au canvas
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        this.decorations = [
            // Beaucoup plus d'arbres répartis sur tout le terrain
            { x: canvasWidth * 0.08, y: canvasHeight * 0.15, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 300, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.12, y: canvasHeight * 0.35, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 400, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.15, y: canvasHeight * 0.75, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 350, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.18, y: canvasHeight * 0.92, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 3, frameCount: 6, animationSpeed: 450, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.22, y: canvasHeight * 0.08, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 4, frameCount: 6, animationSpeed: 380, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.25, y: canvasHeight * 0.45, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 5, frameCount: 6, animationSpeed: 420, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.28, y: canvasHeight * 0.68, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 360, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.32, y: canvasHeight * 0.22, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 410, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.35, y: canvasHeight * 0.85, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 390, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.38, y: canvasHeight * 0.12, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 3, frameCount: 6, animationSpeed: 340, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.42, y: canvasHeight * 0.58, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 4, frameCount: 6, animationSpeed: 320, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.45, y: canvasHeight * 0.28, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 5, frameCount: 6, animationSpeed: 460, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.48, y: canvasHeight * 0.88, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 370, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.52, y: canvasHeight * 0.05, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 430, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.55, y: canvasHeight * 0.42, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 350, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.58, y: canvasHeight * 0.72, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 3, frameCount: 6, animationSpeed: 480, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.62, y: canvasHeight * 0.18, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 4, frameCount: 6, animationSpeed: 310, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.65, y: canvasHeight * 0.95, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 5, frameCount: 6, animationSpeed: 440, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.68, y: canvasHeight * 0.32, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 380, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.72, y: canvasHeight * 0.62, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 420, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.75, y: canvasHeight * 0.08, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 360, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.78, y: canvasHeight * 0.78, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 3, frameCount: 6, animationSpeed: 400, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.82, y: canvasHeight * 0.25, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 4, frameCount: 6, animationSpeed: 350, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.85, y: canvasHeight * 0.52, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 5, frameCount: 6, animationSpeed: 410, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.88, y: canvasHeight * 0.88, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 330, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.92, y: canvasHeight * 0.15, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 470, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.95, y: canvasHeight * 0.65, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 390, lastFrameTime: Date.now() },
            
            // Rochers pour la variété
            { x: canvasWidth * 0.3, y: canvasHeight * 0.45, sprite: new Image(), type: 'rock', loaded: false },
            { x: canvasWidth * 0.7, y: canvasHeight * 0.55, sprite: new Image(), type: 'rock', loaded: false },
            { x: canvasWidth * 0.2, y: canvasHeight * 0.65, sprite: new Image(), type: 'rock', loaded: false },
            { x: canvasWidth * 0.8, y: canvasHeight * 0.25, sprite: new Image(), type: 'rock', loaded: false },
            
            // Buissons pour remplir
            { x: canvasWidth * 0.18, y: canvasHeight * 0.35, sprite: new Image(), type: 'bush', loaded: false },
            { x: canvasWidth * 0.42, y: canvasHeight * 0.22, sprite: new Image(), type: 'bush', loaded: false },
            { x: canvasWidth * 0.58, y: canvasHeight * 0.78, sprite: new Image(), type: 'bush', loaded: false },
            { x: canvasWidth * 0.82, y: canvasHeight * 0.48, sprite: new Image(), type: 'bush', loaded: false },
            { x: canvasWidth * 0.28, y: canvasHeight * 0.88, sprite: new Image(), type: 'bush', loaded: false },
            { x: canvasWidth * 0.72, y: canvasHeight * 0.18, sprite: new Image(), type: 'bush', loaded: false }
        ];
        
        this.decorations.forEach(deco => {
            deco.sprite.onload = () => {
                deco.loaded = true;
                console.log(`${deco.type} decoration loaded successfully`);
            };
            deco.sprite.onerror = () => {
                console.log(`Failed to load ${deco.type} decoration`);
                deco.loaded = false;
            };
            
            switch(deco.type) {
                case 'tree':
                    deco.sprite.src = './assets/Resources/Trees/Tree.png';
                    break;
                case 'rock':
                    deco.sprite.src = './assets/Terrain/Water/Rocks/Rocks_01.png';
                    break;
                case 'bush':
                    deco.sprite.src = './assets/Decorations/Bushes/Bushe1.png';
                    break;
            }
        });
    }

    initBuildings() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        console.log(`Initialisation des bâtiments sur carte ${canvasWidth}x${canvasHeight}`);
        
        // Réinitialiser la liste des bâtiments
        this.buildings = [];
        
        // Générer des positions aléatoires pour chaque faction
        this.generateRandomBuildings(canvasWidth, canvasHeight);
        
        console.log(`Total bâtiments générés: ${this.buildings.length}`);
        const neutralBuildings = this.buildings.filter(b => b.owner === 'neutral');
        const strongNeutrals = neutralBuildings.filter(b => b.units >= 20);
        console.log(`Bâtiments neutres: ${neutralBuildings.length}, dont ${strongNeutrals.length} châteaux (≥20 unités)`);
    }
    
    generateRandomBuildings(canvasWidth, canvasHeight) {
        // Générer des bases pour tous les joueurs
        const playerPositions = this.getPlayerStartingPositions(canvasWidth, canvasHeight);
        
        for (let i = 0; i < this.playerCount; i++) {
            const owner = this.getPlayerOwner(i);
            const pos = playerPositions[i];
            this.buildings.push(new Building(pos.x, pos.y, owner, 5));
        }
        
        // Générer des bâtiments neutres équilibrés sur toute la carte
        this.generateAllNeutrals(canvasWidth, canvasHeight, playerPositions);
    }
    
    generatePlayerBuildings(basePos, canvasWidth, canvasHeight, owner) {
        // Bâtiment avec 10 soldats (distance moyenne)
        const pos10 = this.getPositionNearBase(basePos, canvasWidth, canvasHeight, 100, 160);
        if (pos10) {
            this.buildings.push(new Building(pos10.x, pos10.y, owner, 10));
        }
        
        // Bâtiment avec 15 soldats (un peu plus loin)
        const pos15 = this.getPositionNearBase(basePos, canvasWidth, canvasHeight, 140, 200);
        if (pos15) {
            this.buildings.push(new Building(pos15.x, pos15.y, owner, 15));
        }
    }
    
    generateAllNeutrals(canvasWidth, canvasHeight, playerPositions) {
        // Générer des bâtiments neutres près de chaque base avec espacement intelligent
        const baseBuildings = [
            { distance: [250, 350], units: 8 },
            { distance: [350, 450], units: 12 },
            { distance: [450, 550], units: 15 }
        ];
        
        playerPositions.forEach(basePos => {
            baseBuildings.forEach(building => {
                let attempts = 0;
                let pos;
                
                // Essayer plusieurs fois pour trouver une bonne position
                do {
                    pos = this.getPositionNearBase(basePos, canvasWidth, canvasHeight, 
                        building.distance[0], building.distance[1]);
                    attempts++;
                } while (!pos && attempts < 20);
                
                if (pos) {
                    this.buildings.push(new Building(pos.x, pos.y, 'neutral', building.units));
                }
            });
        });
        
        // Générer quelques châteaux neutres stratégiques
        this.generateStrategicCastles(canvasWidth, canvasHeight, playerPositions);
        
        // Générer des bâtiments neutres au centre avec espacement garantie
        this.generateCenterNeutrals(canvasWidth, canvasHeight);
    }

    generateCenterNeutrals(canvasWidth, canvasHeight) {
        // Générer plus de bâtiments neutres au centre avec espacement garanti
        const normalCount = 4 + Math.floor(Math.random() * 3); // 4 à 6 bâtiments normaux
        const castleCount = 3 + Math.floor(Math.random() * 2); // 3 à 4 châteaux GARANTIS
        
        const centerZone = { x: 0.2, y: 0.15, width: 0.6, height: 0.7 }; // Zone plus grande
        
        // Forces pour bâtiments normaux
        const normalForces = [12, 15, 18, 22, 25];
        
        // Forces pour châteaux (20-80 unités)
        const castleForces = [20, 30, 50, 80];
        
        console.log(`Génération centraux: ${normalCount} normaux + ${castleCount} châteaux`);
        
        // D'abord placer les châteaux (priorité)
        for (let i = 0; i < castleCount; i++) {
            let bestPos = null;
            let attempts = 0;
            
            while (!bestPos && attempts < 200) {
                const x = centerZone.x * canvasWidth + Math.random() * centerZone.width * canvasWidth;
                const y = centerZone.y * canvasHeight + Math.random() * centerZone.height * canvasHeight;
                const pos = { x, y };
                
                if (x > 200 && x < canvasWidth - 200 && 
                    y > 200 && y < canvasHeight - 200 && 
                    !this.isPositionTooClose(pos)) {
                    bestPos = pos;
                }
                attempts++;
            }
            
            if (bestPos) {
                const units = castleForces[Math.floor(Math.random() * castleForces.length)];
                this.buildings.push(new Building(bestPos.x, bestPos.y, 'neutral', units));
                console.log(`Château neutre créé avec ${units} unités à (${Math.round(bestPos.x)}, ${Math.round(bestPos.y)})`);
            } else {
                console.log(`Échec placement château ${i + 1}`);
            }
        }
        
        // Ensuite placer les bâtiments normaux
        for (let i = 0; i < normalCount; i++) {
            let bestPos = null;
            let attempts = 0;
            
            while (!bestPos && attempts < 150) {
                const x = centerZone.x * canvasWidth + Math.random() * centerZone.width * canvasWidth;
                const y = centerZone.y * canvasHeight + Math.random() * centerZone.height * canvasHeight;
                const pos = { x, y };
                
                if (x > 180 && x < canvasWidth - 180 && 
                    y > 180 && y < canvasHeight - 180 && 
                    !this.isPositionTooClose(pos)) {
                    bestPos = pos;
                }
                attempts++;
            }
            
            if (bestPos) {
                const units = normalForces[Math.floor(Math.random() * normalForces.length)];
                this.buildings.push(new Building(bestPos.x, bestPos.y, 'neutral', units));
            }
        }
    }
    
    getPositionNearBase(basePos, canvasWidth, canvasHeight, minDist, maxDist) {
        let attempts = 0;
        let position;
        
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = minDist + Math.random() * (maxDist - minDist);
            
            position = {
                x: basePos.x + Math.cos(angle) * distance,
                y: basePos.y + Math.sin(angle) * distance
            };
            
            // Vérifier que la position est dans les limites du canvas avec marge plus importante
            if (position.x < 120 || position.x > canvasWidth - 120 || 
                position.y < 120 || position.y > canvasHeight - 120) {
                position = null;
            } else if (this.isPositionTooClose(position)) {
                position = null;
            }
            
            attempts++;
        } while (!position && attempts < 100); // Plus de tentatives
        
        return position;
    }
    
    getRandomPositionInZone(zone, canvasWidth, canvasHeight) {
        // Éviter les collisions en essayant plusieurs positions
        let attempts = 0;
        let position;
        
        do {
            position = {
                x: (zone.x + Math.random() * zone.width) * canvasWidth,
                y: (zone.y + Math.random() * zone.height) * canvasHeight
            };
            
            // Vérifier les limites du canvas
            if (position.x < 120 || position.x > canvasWidth - 120 || 
                position.y < 120 || position.y > canvasHeight - 120) {
                position = null;
            }
            
            attempts++;
        } while ((!position || this.isPositionTooClose(position)) && attempts < 100);
        
        return position;
    }
    
    isPositionTooClose(newPos, minDistance = null) {
        return this.buildings.some(building => {
            const distance = Math.sqrt(
                (building.x - newPos.x) ** 2 + (building.y - newPos.y) ** 2
            );
            
            // Distance dynamique basée sur le type de bâtiment
            const requiredDistance = minDistance || this.getRequiredDistance(building);
            return distance < requiredDistance;
        });
    }
    
    getRequiredDistance(building) {
        // Rayon d'exclusion basé sur le type et la taille du bâtiment
        const baseRadius = 120; // Rayon de base
        const buildingTypeMultiplier = {
            'house1': 1.0,
            'house2': 1.2,
            'house3': 1.4,
            'tower': 1.6,
            'castle': 2.0
        };
        
        const buildingType = building.getBuildingType();
        const multiplier = buildingTypeMultiplier[buildingType] || 1.0;
        
        // Distance plus importante pour les bâtiments neutres
        const ownerMultiplier = building.owner === 'neutral' ? 1.5 : 1.0;
        
        return baseRadius * multiplier * ownerMultiplier;
    }

    initializeCanvas() {
        // NOUVEAU: Initialisation robuste du canvas pour le multijoueur
        if (this.canvas && this.ctx) {
            console.log('Canvas déjà initialisé');
            return true;
        }
        
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas introuvable dans le DOM!');
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Impossible d\'obtenir le contexte 2D!');
            return false;
        }
        
        // Configuration complète
        this.setupCanvas();
        this.loadBackground();
        this.setupEventListeners();
        
        // Vérifier les dimensions
        const rect = this.canvas.getBoundingClientRect();
        console.log(`Canvas initialisé: ${this.canvas.width}x${this.canvas.height}, visible: ${rect.width}x${rect.height}`);
        
        // Forcer un redimensionnement pour s'assurer que le canvas est visible
        setTimeout(() => {
            this.setupCanvas();
        }, 50);
        
        console.log('Canvas initialisé avec succès');
        return true;
    }

    setupEventListeners() {
        // Désactiver le menu contextuel sur le canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Gestion du clic gauche
        this.canvas.addEventListener('click', (e) => {
            // Empêcher le traitement du clic si on était en train de faire une sélection par rectangle
            if (this.wasSelecting) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const adjustedX = x * scaleX;
            const adjustedY = y * scaleY;
            
            // Vérifier si on a cliqué sur un bâtiment
            const clickedBuilding = this.buildings.find(building => building.isPointInside(adjustedX, adjustedY));
            
            // Si pas de bâtiment cliqué et pas de modificateur, désélectionner tout
            if (!clickedBuilding && !e.ctrlKey && !e.metaKey) {
                this.clearSelection();
                return;
            }
            
            this.handleClick(x, y, e);
        });
        

        // Gestion unifiée du mousedown pour sélection et attaque
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            if (e.button === 0) { // Clic gauche - sélection
                // Vérifier si on clique sur un bâtiment du joueur
                const localPlayerOwner = this.getLocalPlayerOwner();
                const clickedBuilding = this.buildings.find(building => {
                    const distance = Math.sqrt((building.x - x * scaleX) ** 2 + (building.y - y * scaleY) ** 2);
                    return distance < 40 && building.owner === localPlayerOwner;
                });
                
                // Si on ne clique pas sur un bâtiment et qu'on n'a pas Ctrl/Cmd enfoncé, commencer la sélection par rectangle
                if (!clickedBuilding && !e.ctrlKey && !e.metaKey) {
                    this.isSelecting = true;
                    this.selectionStart = { x: x * scaleX, y: y * scaleY };
                    this.selectionEnd = { x: x * scaleX, y: y * scaleY };
                    console.log(`Début de sélection rectangle à: ${x * scaleX}, ${y * scaleY}`);
                    
                    // Empêcher la propagation pour éviter le clic normal
                    e.stopPropagation();
                }
            } else if (e.button === 2) { // Clic droit - attaque
                e.preventDefault();
                
                // Trouver le bâtiment cible
                const targetBuilding = this.buildings.find(building => {
                    const distance = Math.sqrt((building.x - x * scaleX) ** 2 + (building.y - y * scaleY) ** 2);
                    return distance < 40;
                });
                
                // Si on a une cible et des bâtiments sélectionnés, attaquer directement
                if (targetBuilding && this.selectedBuildings.length > 0 && !this.selectedBuildings.includes(targetBuilding)) {
                    console.log(`Clic droit sur ${targetBuilding.owner} - Attaque!`);
                    this.targetBuilding = targetBuilding;
                    this.sendUnitsFromSelected();
                }
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            if (this.isSelecting) {
                this.selectionEnd = { x: x * scaleX, y: y * scaleY };
                
                // Calculer le rectangle de sélection
                this.selectionRect = {
                    x: Math.min(this.selectionStart.x, this.selectionEnd.x),
                    y: Math.min(this.selectionStart.y, this.selectionEnd.y),
                    width: Math.abs(this.selectionEnd.x - this.selectionStart.x),
                    height: Math.abs(this.selectionEnd.y - this.selectionStart.y)
                };
                
                // Log pour debug
                if (this.selectionRect.width > 5 && this.selectionRect.height > 5) {
                    console.log(`Rectangle en cours: ${this.selectionRect.x}, ${this.selectionRect.y}, ${this.selectionRect.width}x${this.selectionRect.height}`);
                }
            }
            
            // Mettre à jour le curseur et le bâtiment survolé
            this.hoveredBuilding = this.buildings.find(building => {
                const distance = Math.sqrt((building.x - x * scaleX) ** 2 + (building.y - y * scaleY) ** 2);
                return distance < 40;
            });
            
            if (this.hoveredBuilding && this.selectedBuildings.length > 0 && !this.selectedBuildings.includes(this.hoveredBuilding)) {
                // Curseur d'attaque si on peut attaquer
                this.canvas.style.cursor = 'crosshair';
            } else if (this.hoveredBuilding && this.canPlayerControl(this.hoveredBuilding)) {
                // Curseur de sélection pour nos bâtiments
                this.canvas.style.cursor = 'pointer';
            } else {
                // Curseur par défaut
                this.canvas.style.cursor = 'default';
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isSelecting && e.button === 0) {
                this.isSelecting = false;
                this.wasSelecting = true;
                
                // Sélectionner tous les bâtiments du joueur dans le rectangle
                if (this.selectionRect && this.selectionRect.width > 5 && this.selectionRect.height > 5) {
                    const localPlayerOwner = this.getLocalPlayerOwner();
                    
                    console.log(`Sélection rectangle: ${this.selectionRect.x}, ${this.selectionRect.y}, ${this.selectionRect.width}x${this.selectionRect.height}`);
                    console.log(`Recherche de bâtiments du joueur: ${localPlayerOwner}`);
                    
                    // Ne pas appeler clearSelection qui réinitialise tout, juste désélectionner les bâtiments
                    this.selectedBuildings.forEach(building => {
                        building.selected = false;
                    });
                    this.selectedBuildings = [];
                    
                    // Puis sélectionner les bâtiments dans le rectangle
                    let playersBuildings = this.buildings.filter(b => b.owner === localPlayerOwner);
                    console.log(`Bâtiments du joueur (${localPlayerOwner}): ${playersBuildings.length}`);
                    
                    this.buildings.forEach(building => {
                        if (building.owner === localPlayerOwner) {
                            const inRect = building.x >= this.selectionRect.x &&
                                   building.x <= this.selectionRect.x + this.selectionRect.width &&
                                   building.y >= this.selectionRect.y &&
                                   building.y <= this.selectionRect.y + this.selectionRect.height;
                            
                            if (inRect) {
                                console.log(`Bâtiment sélectionné: ${building.owner} à ${building.x}, ${building.y}`);
                                building.selected = true;
                                this.selectedBuildings.push(building);
                            }
                        }
                    });
                    
                    console.log(`${this.selectedBuildings.length} bâtiments sélectionnés`);
                    
                    this.updateSelectedBuildingInfo();
                    this.updateUI();
                }
                
                this.selectionRect = null;
                this.selectionStart = null;
                this.selectionEnd = null;
                
                // Réinitialiser wasSelecting après un court délai
                setTimeout(() => {
                    this.wasSelecting = false;
                }, 200);
            }
        });
        
        // Double-clic pour sélectionner tous les bâtiments du même type
        this.canvas.addEventListener('dblclick', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const clickedBuilding = this.buildings.find(building => {
                const distance = Math.sqrt((building.x - x * scaleX) ** 2 + (building.y - y * scaleY) ** 2);
                return distance < 40;
            });
            
            if (clickedBuilding && clickedBuilding.owner === 'player') {
                const buildingType = clickedBuilding.getBuildingType();
                this.selectedBuildings = this.buildings.filter(building => 
                    building.owner === 'player' && building.getBuildingType() === buildingType
                );
                this.updateSelectedBuildingInfo();
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.sendPercentage = Math.max(10, this.sendPercentage - 10);
            } else {
                this.sendPercentage = Math.min(100, this.sendPercentage + 10);
            }
            this.updateUI();
        });

        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (this.selectedBuildings.length > 0 && this.targetBuilding) {
                    this.selectedBuildings.forEach(building => {
                        // NOUVEAU: Toujours exécuter localement + envoyer au réseau
                        building.sendUnits(this.targetBuilding, this.sendPercentage, this);
                        
                        // Envoyer l'action au réseau si multijoueur
                        if (this.isMultiplayer && this.multiplayerManager) {
                            const sourceId = this.buildings.indexOf(building);
                            const targetId = this.buildings.indexOf(this.targetBuilding);
                            this.multiplayerManager.sendAction({
                                type: 'send_units',
                                sourceId: sourceId,
                                targetId: targetId,
                                percentage: this.sendPercentage,
                                playerId: this.localPlayerIndex
                            });
                        }
                });
                
                    // Réinitialiser les sélections après envoi
                    this.targetBuilding = null;
                    this.clearSelection();
                }
            });
        }

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });

        // Bouton Menu dans l'écran de fin de partie
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                document.getElementById('gameOver').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'none';
                document.getElementById('menuScreen').style.display = 'flex';
                this.stopBackgroundMode();
            });
        }

        // Gérer le bouton d'aide
        const helpBtn = document.getElementById('helpBtn');
        const helpPanel = document.getElementById('helpPanel');
        const helpClose = document.getElementById('helpClose');
        
        if (helpBtn && helpPanel && helpClose) {
            helpBtn.addEventListener('click', () => {
                helpPanel.style.display = 'flex';
            });
            
            helpClose.addEventListener('click', () => {
                helpPanel.style.display = 'none';
            });
            
            // Fermer avec Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && helpPanel.style.display === 'flex') {
                    helpPanel.style.display = 'none';
                }
            });
        }
        
        // Redimensionnement dynamique
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (this.gameStarted && !this.gameOver) {
                // Ctrl/Cmd + A ou simplement A : Sélectionner tous les bâtiments du joueur
                if ((e.key === 'a' || e.key === 'A') && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    this.selectAllPlayerBuildings();
                }
                
                // Touche D : Désélectionner tous les bâtiments
                if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    this.clearSelection();
                    this.updateSelectedBuildingInfo();
                    this.updateUI();
                }
                
                // Touche 1-9 : Sélectionner des groupes de contrôle
                if (e.key >= '1' && e.key <= '9') {
                    const groupNum = parseInt(e.key);
                    if (e.ctrlKey || e.metaKey) {
                        // Ctrl + 1-9 : Créer un groupe de contrôle
                        this.createControlGroup(groupNum);
                    } else {
                        // 1-9 : Sélectionner un groupe de contrôle
                        this.selectControlGroup(groupNum);
                    }
                }
            }
        });
    }
    
    selectAllPlayerBuildings() {
        this.clearSelection();
        const localPlayerOwner = this.getLocalPlayerOwner();
        this.selectedBuildings = this.buildings.filter(building => building.owner === localPlayerOwner);
        this.selectedBuildings.forEach(building => {
            building.selected = true;
        });
        this.updateSelectedBuildingInfo();
        this.updateUI();
    }
    
    createControlGroup(groupNum) {
        if (!this.controlGroups) {
            this.controlGroups = {};
        }
        
        if (this.selectedBuildings.length > 0) {
            this.controlGroups[groupNum] = [...this.selectedBuildings];
            console.log(`Groupe de contrôle ${groupNum} créé avec ${this.selectedBuildings.length} bâtiments`);
        }
    }
    
    selectControlGroup(groupNum) {
        if (this.controlGroups && this.controlGroups[groupNum]) {
            this.clearSelection();
            this.controlGroups[groupNum].forEach(building => {
                // Vérifier que le bâtiment existe toujours et appartient toujours au joueur
                if (this.buildings.includes(building) && this.canPlayerControl(building)) {
                    building.selected = true;
                    this.selectedBuildings.push(building);
                }
            });
            this.updateSelectedBuildingInfo();
            this.updateUI();
        }
    }

    handleClick(x, y, event) {
        // Ne pas traiter le clic si on était en train de faire une sélection par rectangle
        if (this.wasSelecting) {
            this.wasSelecting = false;
            return;
        }
        
        // Ajuster les coordonnées en fonction du scaling du canvas
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const adjustedX = x * scaleX;
        const adjustedY = y * scaleY;
        
        // Vérifier d'abord les clics sur les boutons de panneau de combat
        for (const group of this.unitGroups) {
            if (group.isFighting && group.combatDice) {
                // Bouton de fermeture/réduction
                if (group.closeButtonBounds && !group.combatPanelMinimized) {
                    const bounds = group.closeButtonBounds;
                    if (adjustedX >= bounds.x && adjustedX <= bounds.x + bounds.width &&
                        adjustedY >= bounds.y && adjustedY <= bounds.y + bounds.height) {
                        group.combatPanelMinimized = true;
                        return;
                    }
                }
                
                // Bouton d'expansion
                if (group.expandButtonBounds && group.combatPanelMinimized) {
                    const bounds = group.expandButtonBounds;
                    if (adjustedX >= bounds.x && adjustedX <= bounds.x + bounds.width &&
                        adjustedY >= bounds.y && adjustedY <= bounds.y + bounds.height) {
                        group.combatPanelMinimized = false;
                        return;
                    }
                }
            }
        }
        
        const clickedBuilding = this.buildings.find(building => building.isPointInside(adjustedX, adjustedY));
        
        if (clickedBuilding) {
            // Clic gauche sert uniquement à sélectionner les bâtiments du joueur
            if (this.canPlayerControl(clickedBuilding)) {
                console.log(`Clic sur bâtiment contrôlable: ${clickedBuilding.owner} (joueur: ${this.getLocalPlayerOwner()})`);
                const isCtrlPressed = event && (event.ctrlKey || event.metaKey);
                
                if (isCtrlPressed) {
                    // Ctrl/Cmd + Clic : ajouter ou retirer de la sélection
                    if (clickedBuilding.selected) {
                        clickedBuilding.selected = false;
                        this.selectedBuildings = this.selectedBuildings.filter(b => b !== clickedBuilding);
                        console.log('Bâtiment désélectionné');
                    } else {
                        clickedBuilding.selected = true;
                        this.selectedBuildings.push(clickedBuilding);
                        console.log('Bâtiment ajouté à la sélection');
                    }
                } else {
                    // Clic simple : remplacer la sélection
                    this.clearSelection();
                    clickedBuilding.selected = true;
                    this.selectedBuildings = [clickedBuilding];
                    console.log('Sélection remplacée par ce bâtiment');
                }
                
                this.updateSelectedBuildingInfo();
                this.updateUI();
            } else {
                console.log(`Clic sur bâtiment non-contrôlable: ${clickedBuilding ? clickedBuilding.owner : 'aucun'} (joueur: ${this.getLocalPlayerOwner()})`);
            }
        } else {
            // Clic dans le vide = tout désélectionner (sauf si Ctrl/Cmd est enfoncé)
            if (!event || (!event.ctrlKey && !event.metaKey)) {
                this.clearSelection();
            }
        }
    }

    clearSelection() {
        this.selectedBuildings.forEach(building => {
            building.selected = false;
        });
        this.selectedBuildings = [];
        this.targetBuilding = null;
        this.updateSelectedBuildingInfo();
        this.updateUI();
        console.log('Sélections nettoyées');
    }
    
    sendUnitsFromSelected() {
        if (this.selectedBuildings.length === 0 || !this.targetBuilding) return;
        
        console.log(`Envoi d'unités vers ${this.targetBuilding.owner} depuis ${this.selectedBuildings.length} bâtiment(s)`);
        
        // Envoyer les unités depuis chaque bâtiment sélectionné
        this.selectedBuildings.forEach(building => {
            if (building.units > 0) {
                // NOUVEAU: Toujours exécuter localement + diffuser si multijoueur
                building.sendUnits(this.targetBuilding, this.sendPercentage, this);
                
                if (this.isMultiplayer && this.multiplayerManager) {
                    // Diffuser l'action aux autres joueurs
                    const sourceId = this.buildings.indexOf(building);
                    const targetId = this.buildings.indexOf(this.targetBuilding);
                    
                    this.multiplayerManager.sendAction({
                        type: 'send_units',
                        sourceId: sourceId,
                        targetId: targetId,
                        percentage: this.sendPercentage,
                        playerId: this.localPlayerIndex
                    });
                }
            }
        });
        
        // Réinitialiser la cible après l'envoi
        this.targetBuilding = null;
        this.updateUI();
    }
    
    updateSelectedBuildingInfo() {
        const selectedInfo = document.getElementById('selectedBuildingInfo');
        if (this.selectedBuildings.length > 0) {
            const totalUnits = this.selectedBuildings.reduce((sum, building) => sum + building.units, 0);
            const buildingTypes = {};
            
            // Compter les types de bâtiments
            this.selectedBuildings.forEach(building => {
                const type = building.getBuildingType();
                buildingTypes[type] = (buildingTypes[type] || 0) + 1;
            });
            
            // Créer le texte descriptif
            let description = `${this.selectedBuildings.length} bâtiment${this.selectedBuildings.length > 1 ? 's' : ''} (${totalUnits} unités)`;
            
            // Afficher le détail si plusieurs types
            const types = Object.entries(buildingTypes);
            if (types.length > 1 || this.selectedBuildings.length > 3) {
                const details = types.map(([type, count]) => `${count} ${type}`).join(', ');
                description += ` - ${details}`;
            }
            
            selectedInfo.textContent = description;
        }
    }

    updateUI() {
        const selectedInfo = document.getElementById('selectedBuildingInfo');
        const sendBtn = document.getElementById('sendBtn');
        const percentageInfo = document.getElementById('percentageInfo');
        
        if (this.selectedBuildings.length > 0) {
            const totalUnits = this.selectedBuildings.reduce((sum, building) => sum + building.units, 0);
            selectedInfo.textContent = `${this.selectedBuildings.length} bâtiment(s) sélectionné(s): ${totalUnits} unités`;
            sendBtn.style.display = 'none'; // Cacher le bouton car on utilise le clic droit
        } else {
            selectedInfo.textContent = 'Sélectionnez vos bâtiments (clic gauche ou glisser)';
            sendBtn.style.display = 'none';
        }
        
        percentageInfo.textContent = `${this.sendPercentage}%`;
        
        // Mettre à jour le compteur de bâtiments
        const localPlayerOwner = this.getLocalPlayerOwner();
        const playerBuildings = this.buildings.filter(b => b.owner === localPlayerOwner).length;
        const enemyBuildings = this.buildings.filter(b => b.owner !== localPlayerOwner && b.owner !== 'neutral').length;
        document.getElementById('playerBuildings').textContent = playerBuildings;
        document.getElementById('enemyBuildings').textContent = enemyBuildings;
    }

    addUnitGroup(source, target, units) {
        const newGroup = new UnitGroup(source, target, units, source.owner);
        this.unitGroups.push(newGroup);
        
        // NOUVEAU: Plus de broadcast automatique - les actions sont gérées individuellement
    }

    update() {
        if (this.gameOver) return;
        
        // Sauvegarder l'état précédent pour détecter les changements
        const previousState = this.isMultiplayer && this.multiplayerManager && this.multiplayerManager.isHost ? 
            this.getGameStateChecksum() : null;
        
        // Mettre à jour les bâtiments
        this.buildings.forEach(building => {
            // Vérifier si le bâtiment est sous siège
            const isUnderSiege = this.unitGroups.some(group => 
                group.isFighting && 
                group.target === building && 
                group.owner !== building.owner
            );
            building.update(isUnderSiege);
        });
        
        // Mettre à jour les groupes d'unités
        this.unitGroups = this.unitGroups.filter(group => {
            // Supprimer les groupes marqués pour suppression
            if (group.toRemove) {
                console.log(`Suppression d'un groupe: ${group.units} unités de ${group.owner}`);
                return false;
            }
            
            // Vérification de sécurité pour éviter la suppression accidentelle
            if (group.units <= 0 && !group.isFighting) {
                console.log(`Groupe avec 0 unités supprimé (pas en combat): ${group.owner}`);
                return false;
            }
            
            return group.update(this);
        });
        
        // Vérifier les conditions de victoire
        this.checkGameOver();
        
        // Mettre à jour l'interface
        this.updateUI();
        
        // IA simple (désactivée en multijoueur)
        if (!this.isMultiplayer) {
            this.updateAI();
        }
        
        // NOUVEAU: Plus de synchronisation d'état automatique
        // Chaque joueur gère son état localement
        // Les actions sont synchronisées via sendAction()
    }

    getAISettings() {
        switch(this.aiDifficulty) {
            case 'easy':
                return {
                    actionFrequency: 0.005, // 0.5% chance par frame
                    minUnitsToAttack: 15, // Attaque seulement avec 15+ unités
                    attackPercentage: 40, // Envoie 40% des unités
                    neutralCaptureChance: 0.3, // 30% de chance de cibler neutres
                    waitForAccumulation: true, // Attend d'avoir plus d'unités
                    strategicWaitTime: 5000, // Attend 5 secondes entre attaques
                    groupAttackChance: 0.2 // 20% chance d'attaque groupée
                };
            case 'medium':
                return {
                    actionFrequency: 0.008, // 0.8% chance par frame
                    minUnitsToAttack: 12,
                    attackPercentage: 50,
                    neutralCaptureChance: 0.5,
                    waitForAccumulation: true,
                    strategicWaitTime: 3000,
                    groupAttackChance: 0.4
                };
            case 'hard':
                return {
                    actionFrequency: 0.012, // 1.2% chance par frame
                    minUnitsToAttack: 8,
                    attackPercentage: 60,
                    neutralCaptureChance: 0.7,
                    waitForAccumulation: false, // Attaque plus agressivement
                    strategicWaitTime: 1500,
                    groupAttackChance: 0.6
                };
            default:
                return this.getAISettings.call({aiDifficulty: 'medium'});
        }
    }

    updateAI() {
        const now = Date.now();
        
        // IA intelligente avec niveaux de difficulté
        if (Math.random() < this.aiSettings.actionFrequency) {
            const enemyFactions = ['enemy', 'enemy2', 'enemy3'];
            
            enemyFactions.forEach(faction => {
                this.performAIAction(faction, now);
            });
        }
    }

    performAIAction(faction, currentTime) {
        const factionBuildings = this.buildings.filter(b => b.owner === faction);
        if (factionBuildings.length === 0) return;

        // Vérifier le cooldown stratégique
        const lastAction = this.lastAIActions[faction] || 0;
        if (currentTime - lastAction < this.aiSettings.strategicWaitTime) {
            return;
        }

        // 1. Priorité: Capturer les bâtiments neutres
        if (Math.random() < this.aiSettings.neutralCaptureChance) {
            const neutralTargets = this.buildings.filter(b => b.owner === 'neutral');
            if (neutralTargets.length > 0) {
                const source = this.selectBestAttacker(factionBuildings);
                if (source) {
                    const target = this.selectBestNeutralTarget(neutralTargets, source);
                    if (target && this.shouldAttack(source, target)) {
                        this.executeAIAttack(source, target, faction, currentTime);
                        return;
                    }
                }
            }
        }

        // 2. Attaquer les ennemis
        const enemyTargets = this.buildings.filter(b => b.owner !== faction && b.owner !== 'neutral');
        if (enemyTargets.length > 0) {
            const source = this.selectBestAttacker(factionBuildings);
            if (source) {
                const target = this.selectBestEnemyTarget(enemyTargets, source);
                if (target && this.shouldAttack(source, target)) {
                    this.executeAIAttack(source, target, faction, currentTime);
                }
            }
        }
    }

    selectBestAttacker(buildings) {
        // Filtrer les bâtiments avec assez d'unités
        const validAttackers = buildings.filter(b => b.units >= this.aiSettings.minUnitsToAttack);
        if (validAttackers.length === 0) return null;

        // Privilégier les châteaux et tours (plus d'unités)
        const strongBuildings = validAttackers.filter(b => b.getBuildingType() === 'castle' || b.getBuildingType() === 'tower');
        if (strongBuildings.length > 0) {
            return strongBuildings[Math.floor(Math.random() * strongBuildings.length)];
        }

        return validAttackers[Math.floor(Math.random() * validAttackers.length)];
    }

    selectBestNeutralTarget(neutrals, source) {
        // Privilégier les bâtiments neutres faibles et proches
        const sorted = neutrals.sort((a, b) => {
            const distA = Math.sqrt((a.x - source.x) ** 2 + (a.y - source.y) ** 2);
            const distB = Math.sqrt((b.x - source.x) ** 2 + (b.y - source.y) ** 2);
            const scoreA = a.units * 0.3 + distA * 0.1; // Moins d'unités et plus proche = meilleur
            const scoreB = b.units * 0.3 + distB * 0.1;
            return scoreA - scoreB;
        });
        
        return sorted[0];
    }

    selectBestEnemyTarget(enemies, source) {
        // Privilégier les bâtiments ennemis faibles
        const sorted = enemies.sort((a, b) => {
            const distA = Math.sqrt((a.x - source.x) ** 2 + (a.y - source.y) ** 2);
            const distB = Math.sqrt((b.x - source.x) ** 2 + (b.y - source.y) ** 2);
            const scoreA = a.units * 0.5 + distA * 0.2;
            const scoreB = b.units * 0.5 + distB * 0.2;
            return scoreA - scoreB;
        });
        
        return sorted[0];
    }

    shouldAttack(source, target) {
        // Logique d'attaque intelligente
        const attackForce = Math.floor(source.units * this.aiSettings.attackPercentage / 100);
        const targetDefense = target.units + (target.owner !== 'neutral' ? Math.floor(target.units * 0.1) : 0); // Bonus défensif réduit
        
        // En difficulté facile, être plus prudent
        if (this.aiDifficulty === 'easy') {
            return attackForce > targetDefense * 1.3; // Attaque seulement si supériorité nette
        } else if (this.aiDifficulty === 'medium') {
            return attackForce > targetDefense * 1.1;
        } else { // hard
            return attackForce > targetDefense * 0.8; // Plus agressif
        }
    }

    executeAIAttack(source, target, faction, currentTime) {
        const unitsToSend = Math.floor(source.units * this.aiSettings.attackPercentage / 100);
        
        // Attaque groupée possible en difficulté plus élevée
        if (Math.random() < this.aiSettings.groupAttackChance) {
            this.executeGroupAttack(faction, target);
        } else {
            source.sendUnits(target, this.aiSettings.attackPercentage, this);
        }
        
        this.lastAIActions[faction] = currentTime;
    }

    executeGroupAttack(faction, mainTarget) {
        // Attaque coordonnée avec plusieurs bâtiments
        const factionBuildings = this.buildings.filter(b => 
            b.owner === faction && 
            b.units >= this.aiSettings.minUnitsToAttack
        );
        
        const attackers = factionBuildings.slice(0, Math.min(3, factionBuildings.length)); // Max 3 attaquants
        attackers.forEach(building => {
            if (Math.random() < 0.7) { // 70% chance que chaque bâtiment participe
                building.sendUnits(mainTarget, this.aiSettings.attackPercentage, this);
            }
        });
    }

    checkGameOver() {
        // CORRECTION: Utiliser le propriétaire du joueur local
        const localPlayerOwner = this.getLocalPlayerOwner();
        const myBuildings = this.buildings.filter(b => b.owner === localPlayerOwner).length;
        
        // En multijoueur, vérifier seulement la défaite (plus de bâtiments)
        if (myBuildings === 0) {
            this.endGame('Défaite!', 'Les ennemis ont conquis tous vos bâtiments.');
            return;
        }
        
        // Condition de victoire différente selon le mode
        if (this.isMultiplayer) {
            // En multijoueur: victoire si on contrôle tous les bâtiments non-neutres
            const totalNonNeutralBuildings = this.buildings.filter(b => b.owner !== 'neutral').length;
            if (myBuildings === totalNonNeutralBuildings) {
                this.endGame('Victoire!', 'Vous contrôlez tous les territoires!');
            }
        } else {
            // En solo: victoire si plus d'ennemis IA
            const enemyBuildings = this.buildings.filter(b => b.owner !== localPlayerOwner && b.owner !== 'neutral').length;
            if (enemyBuildings === 0) {
                this.endGame('Victoire!', 'Vous avez conquis tous les bâtiments ennemis!');
            }
        }
    }

    endGame(title, message) {
        this.gameOver = true;
        
        // Calculer la durée de la partie
        const gameDuration = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
        
        // Compter les bâtiments capturés/perdus pour les stats
        const playerBuildings = this.buildings.filter(b => b.owner === 'player').length;
        const totalBuildings = this.buildings.length;
        const isVictory = title.includes('Victoire');
        
        // Sauvegarder le résultat dans la base de données
        this.saveGameResult(
            isVictory, 
            gameDuration, 
            isVictory ? totalBuildings - playerBuildings : 0, // bâtiments capturés
            isVictory ? 0 : totalBuildings - playerBuildings  // bâtiments perdus
        );
        
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        
        // Mettre à jour l'icône et la classe selon le résultat
        const gameOverContent = document.querySelector('.game-over-content');
        const gameOverIcon = document.getElementById('gameOverIcon');
        
        if (isVictory) {
            gameOverContent.classList.add('victory');
            gameOverContent.classList.remove('defeat');
            gameOverIcon.textContent = '🏆';
        } else {
            gameOverContent.classList.add('defeat');
            gameOverContent.classList.remove('victory');
            gameOverIcon.textContent = '💀';
        }
        
        document.getElementById('gameOver').style.display = 'flex';
    }

    restart() {
        this.gameOver = false;
        this.buildings = [];
        this.unitGroups = [];
        this.selectedBuildings = [];
        this.targetBuilding = null;
        this.sendPercentage = 50;
        document.getElementById('gameOver').style.display = 'none';
        this.initBuildings();
    }
    
    startGame(playerCount) {
        // Utiliser le paramètre si fourni (multijoueur), sinon l'interface (local)
        this.playerCount = playerCount || parseInt(document.getElementById('playerCount').value);
        this.gameStarted = true;
        this.gameStartTime = Date.now(); // Marquer le début de la partie
        console.log(`Démarrage du jeu avec ${this.playerCount} joueurs`);
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        
        // Recalculer les dimensions du canvas après l'affichage du container
        this.handleResize();
        
        this.initBuildings();
        this.gameLoopStarted = true;
        this.gameLoop();
    }
    
    backToMenu() {
        this.gameStarted = false;
        this.gameLoopStarted = false;
        this.gameOver = false;
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
        
        // Réinitialiser le code de salle
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput) {
            roomCodeInput.value = '';
        }
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.textContent = '';
        }
        
        // Réinitialiser le jeu
        this.buildings = [];
        this.unitGroups = [];
        this.selectedBuildings = [];
        this.targetBuilding = null;
        
        // Arrêter la musique
        this.stopBackgroundMusic();
    }
    
    setupMenuListeners() {
        const menuScreen = document.getElementById('menuScreen');
        const gameContainer = document.getElementById('gameContainer');
        const roomCodeInput = document.getElementById('roomCode');
        
        // Variables pour stocker les paramètres
        let selectedPlayers = 2;
        let selectedDifficulty = 'medium';
        
        // Gestion des boutons d'options
        const playerBtns = document.querySelectorAll('[data-players]');
        const difficultyBtns = document.querySelectorAll('[data-difficulty]');
        
        playerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                playerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedPlayers = parseInt(btn.dataset.players);
            });
        });
        
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDifficulty = btn.dataset.difficulty;
            });
        });
        
        // Bouton Jouer rapide
        const quickPlayBtn = document.getElementById('quickPlayBtn');
        quickPlayBtn.addEventListener('click', () => {
            this.aiDifficulty = selectedDifficulty;
            this.aiSettings = this.getAISettings();
            this.isMultiplayer = false;
            
            // Afficher l'écran de chargement
            this.showGameLoadingScreen(() => {
                menuScreen.style.display = 'none';
                gameContainer.style.display = 'flex';
                this.startGame(selectedPlayers);
                setTimeout(() => this.startBackgroundMusic(), 500);
            });
        });
        
        // Gestion du multijoueur simplifiée
        const hostGameBtn = document.getElementById('hostGameBtn');
        const joinBtn = document.getElementById('joinBtn');
        const connectionStatus = document.getElementById('connectionStatus');
        
        hostGameBtn.addEventListener('click', () => {
            this.isMultiplayer = true;
            if (this.multiplayerManager) {
                this.multiplayerManager.isHost = true;
                this.multiplayerManager.setupHostMode();
            } else {
                console.error('MultiplayerManager not initialized');
                connectionStatus.textContent = 'Erreur: Service multijoueur non disponible';
            }
        });
        
        const handleJoin = () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode) {
                this.isMultiplayer = true;
                connectionStatus.textContent = 'Connexion...';
                if (this.multiplayerManager && this.multiplayerManager.connectToHost(roomCode)) {
                    console.log('Tentative de connexion...');
                } else if (!this.multiplayerManager) {
                    console.error('MultiplayerManager not initialized');
                    connectionStatus.textContent = 'Erreur: Service multijoueur non disponible';
                }
            } else {
                connectionStatus.textContent = 'Code requis';
            }
        };
        
        joinBtn.addEventListener('click', handleJoin);
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleJoin();
        });
        
        // Bouton retour au menu dans le jeu
        const backBtn = document.getElementById('backToMenuBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.backToMenu();
            });
        }
        
        // Focus sur le champ de code quand on charge la page
        roomCodeInput.addEventListener('focus', () => {
            connectionStatus.textContent = '';
        });
    }
    
    showGameLoadingScreen(callback) {
        const loadingScreen = document.getElementById('gameLoadingScreen');
        const loadingProgress = loadingScreen.querySelector('.loading-progress');
        const loadingTips = [
            "Les châteaux produisent 2 unités par seconde!",
            "Utilisez la molette pour ajuster la force d'attaque",
            "Sélectionnez plusieurs bâtiments pour des attaques coordonnées",
            "Les bâtiments évoluent automatiquement avec plus d'unités",
            "La défense offre un bonus de 10% aux unités"
        ];
        
        // Afficher un conseil aléatoire
        const tipElement = document.getElementById('loadingTip');
        tipElement.textContent = "Astuce: " + loadingTips[Math.floor(Math.random() * loadingTips.length)];
        
        // Afficher l'écran de chargement
        loadingScreen.style.display = 'flex';
        
        // Réinitialiser et animer la barre de progression
        loadingProgress.style.animation = 'none';
        setTimeout(() => {
            loadingProgress.style.animation = 'loadingProgress 4s ease-out forwards';
        }, 50);
        
        // Masquer après 4 secondes
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            if (callback) callback();
        }, 4000);
    }

    getPlayerStartingPositions(canvasWidth, canvasHeight) {
        const positions = [];
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const radius = Math.min(canvasWidth, canvasHeight) * 0.45; // Plus loin du centre
        
        for (let i = 0; i < this.playerCount; i++) {
            const angle = (i * 2 * Math.PI) / this.playerCount;
            let x = centerX + Math.cos(angle) * radius;
            let y = centerY + Math.sin(angle) * radius;
            
            // S'assurer que les positions sont dans les limites avec marge importante
            x = Math.max(200, Math.min(canvasWidth - 200, x));
            y = Math.max(200, Math.min(canvasHeight - 200, y));
            
            positions.push({ x, y });
            console.log(`Joueur ${i + 1} posé à (${Math.round(x)}, ${Math.round(y)})`);
        }
        
        return positions;
    }
    
    generateStrategicCastles(canvasWidth, canvasHeight, playerPositions) {
        // Générer 2-3 châteaux neutres stratégiques entre les joueurs
        const castleCount = 2 + Math.floor(Math.random() * 2); // 2 à 3 GARANTIS
        const castleForces = [25, 35, 45, 65]; // Forces variées pour châteaux stratégiques
        
        console.log(`Génération stratégique: ${castleCount} châteaux`);
        
        for (let i = 0; i < castleCount; i++) {
            let bestPos = null;
            let maxMinDistance = 0;
            
            // Essayer plusieurs positions et choisir celle qui maximise la distance minimale aux joueurs
            for (let attempt = 0; attempt < 150; attempt++) {
                const x = 250 + Math.random() * (canvasWidth - 500);
                const y = 250 + Math.random() * (canvasHeight - 500);
                const pos = { x, y };
                
                // Calculer la distance minimale aux joueurs
                let minDistanceToPlayer = Infinity;
                playerPositions.forEach(playerPos => {
                    const distance = Math.sqrt(
                        (pos.x - playerPos.x) ** 2 + (pos.y - playerPos.y) ** 2
                    );
                    minDistanceToPlayer = Math.min(minDistanceToPlayer, distance);
                });
                
                // Vérifier que la position est valide (critères assouplis)
                if (minDistanceToPlayer > 250 && // Un peu plus proche des joueurs
                    minDistanceToPlayer < 800 && // Zone plus large
                    !this.isPositionTooClose(pos)) {
                    
                    if (minDistanceToPlayer > maxMinDistance) {
                        maxMinDistance = minDistanceToPlayer;
                        bestPos = pos;
                    }
                }
            }
            
            // Si pas de position optimale, forcer un placement
            if (!bestPos) {
                for (let attempt = 0; attempt < 100; attempt++) {
                    const x = 300 + Math.random() * (canvasWidth - 600);
                    const y = 300 + Math.random() * (canvasHeight - 600);
                    const pos = { x, y };
                    
                    if (!this.isPositionTooClose(pos)) {
                        bestPos = pos;
                        break;
                    }
                }
            }
            
            if (bestPos) {
                const units = castleForces[Math.floor(Math.random() * castleForces.length)];
                this.buildings.push(new Building(bestPos.x, bestPos.y, 'neutral', units));
                console.log(`Château stratégique créé avec ${units} unités à (${Math.round(bestPos.x)}, ${Math.round(bestPos.y)})`);
            } else {
                console.log(`Échec placement château stratégique ${i + 1}`);
            }
        }
    }

    draw() {
        if (!this.canvas || !this.ctx) {
            console.error('Canvas ou contexte non disponible pour le rendu');
            return;
        }
        
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dessiner le terrain tuilé en premier
        this.drawTerrain(this.ctx);
        
        // Dessiner les décorations (arrière-plan) avec animations
        this.decorations.forEach(deco => {
            if (deco.loaded && deco.sprite && deco.sprite.complete) {
                if (deco.type === 'tree') {
                    // Animation frame par frame des arbres
                    const now = Date.now();
                    if (now - deco.lastFrameTime > deco.animationSpeed) {
                        deco.currentFrame = (deco.currentFrame + 1) % deco.frameCount;
                        deco.lastFrameTime = now;
                    }
                    
                    // Le sprite des arbres est organisé en 2 lignes de 4 frames, on utilise seulement les 6 premiers
                    const spriteWidth = deco.sprite.naturalWidth;
                    const spriteHeight = deco.sprite.naturalHeight;
                    const frameWidth = spriteWidth / 4; // 4 frames horizontales
                    const frameHeight = spriteHeight / 3; // 3 lignes (arbres + souche)
                    
                    // Calculer la position dans le sprite sheet - seulement les 6 premiers arbres
                    let row, col;
                    if (deco.currentFrame < 4) {
                        row = 0; // Première ligne
                        col = deco.currentFrame;
                    } else {
                        row = 1; // Deuxième ligne
                        col = deco.currentFrame - 4;
                    }
                    
                    const srcX = col * frameWidth;
                    const srcY = row * frameHeight;
                    
                    const size = 50; // Taille d'affichage réduite
                    
                    this.ctx.drawImage(
                        deco.sprite,
                        srcX, srcY, frameWidth, frameHeight, // Source
                        deco.x - size/2, deco.y - size/2, size, size // Destination
                    );
                } else {
                    // Rochers et buissons statiques mais avec tailles variées
                    const size = deco.type === 'rock' ? 45 : 35;
                    this.ctx.drawImage(deco.sprite, deco.x - size/2, deco.y - size/2, size, size);
                }
            } else {
                // Fallback visuel pour les décorations
                this.ctx.fillStyle = deco.type === 'tree' ? '#2D4A1E' : '#8B7355';
                const size = deco.type === 'tree' ? 15 : 10;
                this.ctx.fillRect(deco.x - size/2, deco.y - size/2, size, size * 1.5);
                if (deco.type === 'tree') {
                    this.ctx.fillStyle = '#4A7C3D';
                    this.ctx.beginPath();
                    this.ctx.arc(deco.x, deco.y - 15, 12, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });
        
        // Dessiner les bâtiments
        this.buildings.forEach(building => building.draw(this.ctx));
        
        // Dessiner les effets de dégâts sur les bâtiments en combat
        this.unitGroups.forEach(group => {
            if (group.isFighting && group.drawBuildingDamage) {
                group.drawBuildingDamage(this.ctx);
            }
        });
        
        // Dessiner les groupes d'unités et gérer les panneaux de combat
        const combatPanels = [];
        
        // D'abord, collecter tous les combats actifs
        this.unitGroups.forEach(group => {
            if (group.isFighting && group.combatDice) {
                let baseY = group.combatPanelMinimized ? 
                    group.target.y - 100 : // Position pour panneau minimal
                    group.target.y - 140; // Position pour panneau complet
                
                const panelHeight = group.combatPanelMinimized ? 40 : 110;
                
                // Vérifier si le panneau dépasse du haut
                if (baseY - panelHeight/2 < 10) {
                    // Placer en dessous
                    baseY = group.combatPanelMinimized ?
                        group.target.y + 100 :
                        group.target.y + 140;
                }
                    
                combatPanels.push({
                    group: group,
                    x: group.target.x,
                    y: baseY,
                    height: panelHeight
                });
            }
        });
        
        // Ajuster les positions des panneaux pour éviter les chevauchements
        for (let i = 0; i < combatPanels.length; i++) {
            for (let j = i + 1; j < combatPanels.length; j++) {
                const panel1 = combatPanels[i];
                const panel2 = combatPanels[j];
                const dx = Math.abs(panel1.x - panel2.x);
                const dy = Math.abs(panel1.y - panel2.y);
                
                // Largeur et hauteur pour la détection de chevauchement
                const width1 = panel1.group.combatPanelMinimized ? 140 : 300;
                const width2 = panel2.group.combatPanelMinimized ? 140 : 300;
                const avgWidth = (width1 + width2) / 2;
                const avgHeight = (panel1.height + panel2.height) / 2 + 20; // Marge
                
                // Si les panneaux se chevauchent
                if (dx < avgWidth && dy < avgHeight) {
                    // Décaler le deuxième panneau vers le haut
                    panel2.y -= avgHeight + 10;
                }
            }
        }
        
        // Stocker les positions ajustées dans les groupes
        combatPanels.forEach(panel => {
            panel.group.combatPanelY = panel.y;
        });
        
        // Dessiner tous les groupes
        this.unitGroups.forEach(group => group.draw(this.ctx));
        
        // Dessiner les effets d'entrée dans la ville
        this.drawCityEntryEffects();
        
        // Dessiner les lignes de ciblage
        if (this.selectedBuildings.length > 0 && this.targetBuilding) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([8, 4]);
            this.selectedBuildings.forEach(building => {
                this.ctx.beginPath();
                this.ctx.moveTo(building.x, building.y);
                this.ctx.lineTo(this.targetBuilding.x, this.targetBuilding.y);
                this.ctx.stroke();
            });
            this.ctx.setLineDash([]);
        }
        
        // Dessiner le rectangle de sélection
        if (this.isSelecting && this.selectionRect) {
            this.ctx.strokeStyle = '#4FC3F7';
            this.ctx.lineWidth = 2;
            this.ctx.fillStyle = 'rgba(79, 195, 247, 0.1)';
            
            // Remplir le rectangle
            this.ctx.fillRect(
                this.selectionRect.x,
                this.selectionRect.y,
                this.selectionRect.width,
                this.selectionRect.height
            );
            
            // Dessiner le contour
            this.ctx.strokeRect(
                this.selectionRect.x,
                this.selectionRect.y,
                this.selectionRect.width,
                this.selectionRect.height
            );
        }
        
        // Dessiner l'indicateur de cible survolée
        if (this.hoveredBuilding && this.selectedBuildings.length > 0) {
            if (!this.selectedBuildings.includes(this.hoveredBuilding)) {
                if (this.canPlayerControl(this.hoveredBuilding)) {
                    // Cercle vert pour les renforts (bâtiment allié)
                    this.ctx.save();
                    this.ctx.strokeStyle = '#00FF00';
                    this.ctx.lineWidth = 3;
                    this.ctx.globalAlpha = 0.7;
                    this.ctx.beginPath();
                    this.ctx.arc(this.hoveredBuilding.x, this.hoveredBuilding.y, 50, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // Texte "RENFORT"
                    this.ctx.font = 'bold 14px Arial';
                    this.ctx.fillStyle = '#00FF00';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('RENFORT', this.hoveredBuilding.x, this.hoveredBuilding.y - 60);
                    this.ctx.restore();
                } else {
                    // Cercle rouge pour les cibles (bâtiment ennemi)
                    this.ctx.save();
                    this.ctx.strokeStyle = '#FF0000';
                    this.ctx.lineWidth = 3;
                    this.ctx.globalAlpha = 0.7;
                    this.ctx.beginPath();
                    this.ctx.arc(this.hoveredBuilding.x, this.hoveredBuilding.y, 50, 0, Math.PI * 2);
                    this.ctx.stroke();
            
                    // Petite animation de pulsation
                    const pulse = Math.sin(Date.now() * 0.003) * 5;
                    this.ctx.lineWidth = 2;
                    this.ctx.globalAlpha = 0.4;
                    this.ctx.beginPath();
                    this.ctx.arc(this.hoveredBuilding.x, this.hoveredBuilding.y, 55 + pulse, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    this.ctx.restore();
                }
            }
        }
    }

    gameLoop() {
        if (this.gameStarted && this.canvas && this.ctx) {
            // NOUVEAU: Tous les joueurs font update + draw
            // Les clients peuvent interagir localement, l'hôte synchronise
            this.update();
            this.draw();
            
            // Debug multijoueur
            if (this.isMultiplayer) {
                this.updateMultiplayerDebug();
            }
        }
        
        if (document.visibilityState === 'visible') {
            requestAnimationFrame(() => this.gameLoop());
        } else {
            this.backgroundTimer = setTimeout(() => {
                if (this.gameStarted) {
                    this.update();
                }
                this.gameLoop();
            }, 33);
        }
    }
    
    updateMultiplayerDebug() {
        const debugPanel = document.getElementById('multiplayerDebug');
        if (!debugPanel) return;
        
        // Afficher le panneau en mode multijoueur
        debugPanel.style.display = 'block';
        
        // Calculer les FPS
        const now = Date.now();
        if (!this.lastFrameTime) {
            this.lastFrameTime = now;
            this.frameCount = 0;
        }
        this.frameCount++;
        
        if (now - this.lastFrameTime >= 1000) {
            const fps = Math.round(this.frameCount * 1000 / (now - this.lastFrameTime));
            document.getElementById('debugFPS').textContent = fps;
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        
        // Informations de debug
        document.getElementById('debugMode').textContent = this.multiplayerManager?.isHost ? 'Hôte' : 'Client';
        document.getElementById('debugPlayer').textContent = `${this.getLocalPlayerOwner()} (Index: ${this.localPlayerIndex})`;
        document.getElementById('debugState').textContent = this.gameStarted ? 'En jeu' : 'En attente';
        document.getElementById('debugCanvas').textContent = `${this.canvas.width}x${this.canvas.height}`;
    }
    
    updateClientSideOnly() {
        // Version allégée de update() pour les clients multijoueur
        // Ne met à jour que les éléments visuels et l'interface
        
        if (this.gameOver) return;
        
        // Mettre à jour seulement l'interface et les animations visuelles
        this.updateUI();
        
        // Mettre à jour les animations des groupes d'unités (pour la fluidité visuelle)
        this.unitGroups.forEach(group => {
            if (group.sprite && group.sprite.frames) {
                group.updateAnimation();
            }
        });
        
        // Mettre à jour les animations des bâtiments
        this.buildings.forEach(building => {
            if (building.sprite && building.sprite.frames) {
                building.updateAnimation();
            }
        });
    }
    
    setupVisibilityHandlers() {
        // Gérer les changements de visibilité de l'onglet
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Onglet redevenu actif - reprise du rendu normal');
                this.stopBackgroundMode();
                // Forcer une mise à jour immédiate quand on revient
                if (this.gameStarted) {
                    this.update();
                    this.draw();
                }
            } else {
                console.log('Onglet en arrière-plan - démarrage mode background');
                this.startBackgroundMode();
            }
        });
        
        // Gérer le focus/blur de la fenêtre (pour plus de compatibilité)
        window.addEventListener('focus', () => {
            this.stopBackgroundMode();
            if (this.gameStarted) {
                this.update();
                this.draw();
            }
        });
        
        window.addEventListener('blur', () => {
            this.startBackgroundMode();
        });
    }
    
    startBackgroundMode() {
        if (this.backgroundInterval) return; // Déjà actif
        
        console.log('Mode arrière-plan activé');
        
        // Créer un intervalle persistant qui ne sera pas throttlé
        this.backgroundInterval = setInterval(() => {
            if (this.gameStarted && document.visibilityState !== 'visible') {
                this.update(); // Continuer la logique du jeu
                console.log('Update background effectué');
            }
        }, 100); // 10 FPS en arrière-plan
    }
    
    stopBackgroundMode() {
        if (this.backgroundInterval) {
            console.log('Mode arrière-plan désactivé');
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }
        
        if (this.backgroundTimer) {
            clearTimeout(this.backgroundTimer);
            this.backgroundTimer = null;
        }
    }
    
    initAudio() {
        // Liste des musiques disponibles
        this.musicTracks = ['medieval.mp3', 'irish.mp3'];
        
        // Choisir une musique aléatoire
        const randomTrack = this.musicTracks[Math.floor(Math.random() * this.musicTracks.length)];
        
        // Créer l'élément audio pour la musique de fond
        this.backgroundMusic = new Audio(`./assets/Sounds/${randomTrack}`);
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3; // Volume modéré
        
        // Gérer les erreurs de chargement
        this.backgroundMusic.onerror = () => {
            console.log('Impossible de charger la musique de fond');
        };
        
        // Quand la musique se termine, charger une nouvelle musique aléatoire
        this.backgroundMusic.addEventListener('ended', () => {
            this.loadRandomMusic();
        });
        
        // Récupérer les préférences audio du localStorage
        const savedMusicSetting = localStorage.getItem('towerRushMusicEnabled');
        if (savedMusicSetting !== null) {
            this.musicEnabled = savedMusicSetting === 'true';
        }
    }
    
    startBackgroundMusic() {
        if (this.musicEnabled && this.backgroundMusic) {
            // Les navigateurs requièrent une interaction utilisateur pour jouer l'audio
            const playPromise = this.backgroundMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Lecture automatique bloquée par le navigateur');
                });
            }
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }
    
    loadRandomMusic() {
        if (!this.musicEnabled) return;
        
        // Choisir une nouvelle musique aléatoire
        const randomTrack = this.musicTracks[Math.floor(Math.random() * this.musicTracks.length)];
        
        // Créer un nouvel élément audio
        const newMusic = new Audio(`./assets/Sounds/${randomTrack}`);
        newMusic.loop = true;
        newMusic.volume = 0.3;
        
        // Remplacer l'ancienne musique
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }
        
        this.backgroundMusic = newMusic;
        
        // Ajouter l'écouteur pour la prochaine musique
        this.backgroundMusic.addEventListener('ended', () => {
            this.loadRandomMusic();
        });
        
        // Jouer la nouvelle musique
        const playPromise = this.backgroundMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Lecture automatique bloquée par le navigateur');
            });
        }
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('towerRushMusicEnabled', this.musicEnabled.toString());
        
        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        
        // Mettre à jour l'icône du bouton
        this.updateMusicButton();
    }
    
    updateMusicButton() {
        const musicBtn = document.getElementById('musicToggleBtn');
        if (musicBtn) {
            if (this.musicEnabled) {
                musicBtn.classList.remove('muted');
            } else {
                musicBtn.classList.add('muted');
            }
            musicBtn.title = this.musicEnabled ? 'Désactiver la musique' : 'Activer la musique';
        }
    }
    
    setupAudioControls() {
        const musicBtn = document.getElementById('musicToggleBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this.toggleMusic();
            });
            
            // Initialiser l'icône
            this.updateMusicButton();
        }
    }
    
    initializeMultiplayer() {
        console.log('Attempting to initialize multiplayer...');
        console.log('MultiplayerManager type:', typeof MultiplayerManager);
        console.log('window.MultiplayerManager type:', typeof window.MultiplayerManager);
        
        if (typeof window.MultiplayerManager !== 'undefined') {
            this.multiplayerManager = new window.MultiplayerManager(this);
            console.log('MultiplayerManager initialized successfully');
        } else if (typeof MultiplayerManager !== 'undefined') {
            this.multiplayerManager = new MultiplayerManager(this);
            console.log('MultiplayerManager initialized successfully (from global scope)');
        } else {
            console.error('MultiplayerManager class not found. Check if the file is loaded correctly.');
            this.multiplayerManager = null;
        }
    }
    
    initializeMultiplayerGame(networkGameState, playerIndex, realPlayerCount) {
        this.isMultiplayer = true;
        this.localPlayerIndex = playerIndex;
        console.log(`Initialisation multijoueur: playerIndex=${playerIndex}, isHost=${this.multiplayerManager?.isHost}`);
        console.log(`Joueur local sera: ${this.getPlayerOwner(playerIndex)}`);
        
        if (networkGameState) {
            // NOUVEAU: Clients - Charger l'état avec vérifications
            console.log('Client: Chargement de l\'état initial reçu');
            this.networkGameState = networkGameState;
            
            // S'assurer que le canvas est prêt
            if (!this.canvas || !this.ctx) {
                console.error('Canvas non prêt lors de l\'initialisation multijoueur!');
                this.initializeCanvas();
            }
            
            // Charger l'état et démarrer
            this.loadGameStateFromNetwork(networkGameState);
            this.gameStarted = true;
            this.gameStartTime = Date.now();
            
            // Démarrer la boucle si nécessaire
            if (!this.gameLoopStarted) {
                this.gameLoopStarted = true;
                this.gameLoop();
            }
        } else {
            // Hôte - Créer un nouvel état
            const playerCount = realPlayerCount || this.multiplayerManager.connections.size + 1;
            console.log(`Hôte: Initialisation avec ${playerCount} joueurs`);
            this.startGame(playerCount);
        }
        
        // Désactiver l'IA en mode multijoueur
        this.aiSettings.actionFrequency = 0;
    }
    
    processMultiplayerAction(action, playerId) {
        // Traiter une action reçue du réseau (seulement pour l'hôte)
        if (!this.multiplayerManager.isHost) return;
        
        switch (action.type) {
            case 'select_building':
                this.handleNetworkBuildingSelection(action, playerId);
                break;
                
            case 'send_units':
                this.handleNetworkSendUnits(action, playerId);
                break;
                
            case 'set_percentage':
                this.handleNetworkSetPercentage(action, playerId);
                break;
        }
    }
    
    handleNetworkBuildingSelection(action, playerId) {
        // SUPPRIMÉ: Les sélections ne sont plus synchronisées
        // Chaque joueur garde ses propres sélections locales
        console.log('Sélection ignorée - les sélections sont locales');
    }
    
    handleNetworkSendUnits(action, playerId) {
        const sourceBuilding = this.getBuildingById(action.sourceId);
        const targetBuilding = this.getBuildingById(action.targetId);
        
        console.log(`Traitement action réseau: joueur ${playerId} envoie de ${action.sourceId} vers ${action.targetId}`);
        
        if (sourceBuilding && targetBuilding && 
            this.canPlayerControlBuilding(playerId, sourceBuilding)) {
            console.log(`Action autorisée: ${sourceBuilding.owner} (${sourceBuilding.units} unités) -> ${targetBuilding.owner}`);
            sourceBuilding.sendUnits(targetBuilding, action.percentage, this);
            
            // Diffuser le nouvel état à tous les clients
            if (this.multiplayerManager && this.multiplayerManager.isHost) {
                this.multiplayerManager.broadcastGameState();
            }
        } else {
            console.log(`Action refusée: source=${!!sourceBuilding}, target=${!!targetBuilding}, contrôle=${this.canPlayerControlBuilding(playerId, sourceBuilding)}`);
        }
    }
    
    handleNetworkSetPercentage(action, playerId) {
        // Pour l'instant, chaque joueur peut modifier son propre pourcentage
        // On pourrait l'associer à un joueur spécifique plus tard
        this.sendPercentage = action.percentage;
    }
    
    canPlayerControlBuilding(playerId, building) {
        // Déterminer si un joueur peut contrôler un bâtiment
        const playerIndex = this.getPlayerIndexFromId(playerId);
        const expectedOwner = this.getPlayerOwner(playerIndex);
        return building.owner === expectedOwner;
    }
    
    getPlayerIndexFromId(playerId) {
        // Convertir l'ID du joueur en index
        if (playerId === 'host') return 0;
        
        // Pour les autres joueurs, on utilise l'ordre de connexion
        const connections = Array.from(this.multiplayerManager.connections.keys());
        return connections.indexOf(playerId) + 1;
    }
    
    getBuildingById(buildingId) {
        // Trouver un bâtiment par ID (pour l'instant, on utilise l'index)
        return this.buildings[buildingId];
    }
    
    updateFromNetworkState(networkGameState) {
        // NOUVEAU: Système simplifié - plus de synchronisation d'état
        // Les actions sont synchronisées directement via handlePlayerAction
        this.networkGameState = networkGameState;
    }
    
    updateGameStatePreservingLocalState(gameState) {
        // Sauvegarder les sélections locales actuelles
        const localSelections = new Map();
        this.buildings.forEach((building, index) => {
            if (building.selected) {
                localSelections.set(index, true);
            }
        });
        
        // Sauvegarder les bâtiments sélectionnés
        const selectedBuildingsIndices = this.selectedBuildings.map(building => 
            this.buildings.indexOf(building)
        ).filter(index => index >= 0);
        
        console.log('Mise à jour réseau - Préservation de', selectedBuildingsIndices.length, 'sélections locales');
        
        // Mettre à jour les bâtiments en préservant les sélections
        if (gameState.buildings && gameState.buildings.length > 0) {
            gameState.buildings.forEach((buildingData, index) => {
                if (this.buildings[index]) {
                    // Mettre à jour les propriétés du bâtiment existant
                    const building = this.buildings[index];
                    const wasSelected = building.selected; // Préserver la sélection locale
                    
                    building.owner = buildingData.owner;
                    building.units = buildingData.units;
                    building.maxUnits = buildingData.maxUnits;
                    building.productionRate = buildingData.productionRate;
                    building.lastProduction = buildingData.lastProduction;
                    
                    // Restaurer la sélection locale
                    building.selected = wasSelected;
                    
                    // Recharger le sprite si le propriétaire a changé
                    building.loadSprite();
                } else {
                    // Créer un nouveau bâtiment (cas rare)
                    const building = new Building(buildingData.x, buildingData.y, buildingData.owner, buildingData.units);
                    building.selected = false; // Nouveau bâtiment = pas sélectionné
                    building.maxUnits = buildingData.maxUnits;
                    building.productionRate = buildingData.productionRate;
                    building.lastProduction = buildingData.lastProduction;
                    this.buildings[index] = building;
                }
            });
        }
        
        // Reconstruire la liste des bâtiments sélectionnés
        this.selectedBuildings = [];
        selectedBuildingsIndices.forEach(index => {
            if (this.buildings[index] && this.buildings[index].selected) {
                this.selectedBuildings.push(this.buildings[index]);
            }
        });
        
        // Mettre à jour les groupes d'unités (ils ne sont pas sélectionnables)
        if (gameState.unitGroups) {
            this.unitGroups = gameState.unitGroups.map(groupData => {
                // Trouver les vrais bâtiments source et target
                const sourceBuilding = this.buildings.find(b => b.x === groupData.startX && b.y === groupData.startY);
                const targetBuilding = this.buildings.find(b => b.x === groupData.targetX && b.y === groupData.targetY);
                
                const group = new UnitGroup(
                    sourceBuilding || { x: groupData.startX, y: groupData.startY },
                    targetBuilding || { x: groupData.targetX, y: groupData.targetY },
                    groupData.units, 
                    groupData.owner
                );
                
                group.x = groupData.x;
                group.y = groupData.y;
                group.progress = groupData.progress || 0;
                group.speed = groupData.speed || 30;
                group.lastUpdate = groupData.lastUpdate || Date.now();
                
                // S'assurer que les références sont correctes
                group.source = sourceBuilding;
                group.target = targetBuilding;
                
                group.loadSprite();
                
                return group;
            });
        }
        
        // Mettre à jour l'état global
        this.gameOver = gameState.gameOver;
        this.sendPercentage = gameState.sendPercentage;
        
        console.log('État réseau mis à jour - Sélections préservées:', this.selectedBuildings.length);
    }
    
    loadGameStateFromNetwork(gameState) {
        console.log('Chargement de l\'état de jeu depuis le réseau');
        
        // NOUVEAU: Vérification et initialisation robuste
        try {
            // Ajuster la taille du canvas
            if (gameState.canvasWidth && gameState.canvasHeight) {
                this.canvas.width = gameState.canvasWidth;
                this.canvas.height = gameState.canvasHeight;
                this.setupCanvas(); // Reconfigurer le canvas
            }
            
            // Charger les bâtiments
            this.buildings = [];
            if (gameState.buildings && Array.isArray(gameState.buildings)) {
                this.buildings = gameState.buildings.map(buildingData => {
                    const building = new Building(
                        buildingData.x, 
                        buildingData.y, 
                        buildingData.owner, 
                        buildingData.units
                    );
                    building.maxUnits = buildingData.maxUnits || 100;
                    building.productionRate = buildingData.productionRate || 1;
                    building.lastProduction = Date.now(); // Réinitialiser pour éviter les problèmes
                    building.selected = false; // Les sélections sont toujours locales
                    return building;
                });
                console.log(`${this.buildings.length} bâtiments chargés`);
            }
            
            // Charger les groupes d'unités
            this.unitGroups = [];
            if (gameState.unitGroups && Array.isArray(gameState.unitGroups)) {
                gameState.unitGroups.forEach(groupData => {
                    try {
                        // Trouver les vrais bâtiments
                        const sourceBuilding = this.buildings.find(b => 
                            Math.abs(b.x - groupData.startX) < 1 && Math.abs(b.y - groupData.startY) < 1
                        );
                        const targetBuilding = this.buildings.find(b => 
                            Math.abs(b.x - groupData.targetX) < 1 && Math.abs(b.y - groupData.targetY) < 1
                        );
                        
                        if (sourceBuilding && targetBuilding) {
                            const group = new UnitGroup(
                                sourceBuilding, 
                                targetBuilding, 
                                groupData.units, 
                                groupData.owner
                            );
                            group.x = groupData.x;
                            group.y = groupData.y;
                            group.progress = groupData.progress || 0;
                            this.unitGroups.push(group);
                        }
                    } catch (err) {
                        console.error('Erreur chargement groupe:', err);
                    }
                });
                console.log(`${this.unitGroups.length} groupes d'unités chargés`);
            }
            
            // Réinitialiser l'état local
            this.selectedBuildings = [];
            this.targetBuilding = null;
            this.gameOver = false;
            
            console.log('État de jeu chargé avec succès depuis le réseau');
        } catch (error) {
            console.error('Erreur lors du chargement de l\'état réseau:', error);
            // En cas d'erreur, initialiser avec des valeurs par défaut
            this.buildings = [];
            this.unitGroups = [];
        }
        this.gameStarted = gameState.gameStarted || true;
        
        // S'assurer que le terrain est chargé
        if (!this.terrainGenerated) {
            this.generateTerrain();
        }
        
        // IMPORTANT: Démarrer la boucle de jeu pour les clients
        if (this.gameStarted && !this.gameLoopStarted) {
            this.gameLoopStarted = true;
            console.log('Démarrage de la boucle de jeu pour le client multijoueur');
            this.gameLoop();
        }
        
        console.log('État chargé - Bâtiments:', this.buildings.length, 'Unités:', this.unitGroups.length);
    }
    
    getGameState() {
        // Sérialiser l'état actuel du jeu pour le réseau
        return {
            // Informations de la map
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            
            // État du jeu
            buildings: this.buildings.map(building => ({
                x: building.x,
                y: building.y,
                owner: building.owner,
                units: building.units,
                // PAS de synchronisation des sélections
                maxUnits: building.maxUnits,
                productionRate: building.productionRate,
                lastProduction: building.lastProduction
            })),
            unitGroups: this.unitGroups.map(group => ({
                startX: group.source ? group.source.x : group.x,
                startY: group.source ? group.source.y : group.y,
                targetX: group.target ? group.target.x : group.x,
                targetY: group.target ? group.target.y : group.y,
                x: group.x,
                y: group.y,
                units: group.units,
                owner: group.owner,
                progress: group.progress || 0,
                speed: group.speed || 30,
                lastUpdate: group.lastUpdate || Date.now()
            })),
            gameOver: this.gameOver,
            sendPercentage: this.sendPercentage,
            gameStarted: this.gameStarted
        };
    }
    
    sendMultiplayerAction(action) {
        // Envoyer une action au réseau
        if (this.isMultiplayer && this.multiplayerManager) {
            this.multiplayerManager.sendAction(action);
        }
    }
    
    canPlayerControl(building) {
        // Déterminer si le joueur local peut contrôler ce bâtiment
        const localPlayerOwner = this.getLocalPlayerOwner();
        return building.owner === localPlayerOwner;
    }
    
    getLocalPlayerOwner() {
        // Obtenir le propriétaire associé au joueur local
        if (this.isMultiplayer) {
            const owner = this.getPlayerOwner(this.localPlayerIndex);
            // Log seulement la première fois ou si l'index change
            if (!this.lastLoggedPlayerIndex || this.lastLoggedPlayerIndex !== this.localPlayerIndex) {
                console.log(`Joueur local: index ${this.localPlayerIndex} -> propriétaire "${owner}"`);
                this.lastLoggedPlayerIndex = this.localPlayerIndex;
            }
            return owner;
        } else {
            return 'player'; // Mode local classique
        }
    }
    
    getGameStateChecksum() {
        // Créer un checksum simple pour détecter les changements
        const buildings = this.buildings.length;
        const units = this.unitGroups.length;
        const totalUnits = this.buildings.reduce((sum, b) => sum + b.units, 0);
        return `${buildings}-${units}-${totalUnits}`;
    }
    
    drawCityEntryEffects() {
        if (!this.cityEntryEffects || this.cityEntryEffects.length === 0) return;
        
        const now = Date.now();
        const ctx = this.ctx;
        
        // Filtrer et dessiner les effets actifs
        this.cityEntryEffects = this.cityEntryEffects.filter(effect => {
            const elapsed = now - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1) return false; // Effet terminé
            
            // Interpoler la position
            const x = effect.x + (effect.targetX - effect.x) * progress;
            const y = effect.y + (effect.targetY - effect.y) * progress;
            
            // Opacité qui diminue
            const opacity = 1 - progress;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            
            // Dessiner un effet de flèche/traînée vers la ville
            ctx.strokeStyle = effect.owner === 'player' ? '#2196F3' : '#F44336';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            
            ctx.beginPath();
            ctx.moveTo(effect.x, effect.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Point lumineux à la position actuelle
            ctx.fillStyle = effect.owner === 'player' ? '#64B5F6' : '#EF5350';
            ctx.beginPath();
            ctx.arc(x, y, 4 + (1 - progress) * 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Texte indiquant le nombre d'unités
            if (progress < 0.5) {
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                const text = `+${effect.units}`;
                ctx.strokeText(text, x, y - 15);
                ctx.fillText(text, x, y - 15);
            }
            
            ctx.restore();
            
            return true; // Continuer à afficher
        });
    }
    
    // ===== SYSTÈME DE PROFIL =====
    
    loadProfile() {
        // Charger le profil depuis localStorage ou créer un profil par défaut
        const defaultProfile = {
            name: 'Joueur',
            avatar: '👤'
        };
        
        try {
            const savedProfile = localStorage.getItem('towerRushProfile');
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                // Valider les données
                if (profile.name && profile.avatar) {
                    return profile;
                }
            }
        } catch (error) {
            console.warn('Erreur lors du chargement du profil:', error);
        }
        
        return defaultProfile;
    }
    
    saveProfile(profile) {
        try {
            this.playerProfile = profile;
            localStorage.setItem('towerRushProfile', JSON.stringify(profile));
            this.updateProfileDisplay();
            console.log('Profil sauvegardé:', profile);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du profil:', error);
        }
    }
    
    updateProfileDisplay() {
        // Mettre à jour l'affichage du profil dans l'interface
        const profileName = document.getElementById('profileName');
        const profileAvatar = document.getElementById('profileAvatar');
        const profileCloudStatus = document.getElementById('profileCloudStatus');
        
        if (profileName) {
            profileName.textContent = this.playerProfile.name;
        }
        
        if (profileAvatar) {
            profileAvatar.textContent = this.playerProfile.avatar;
        }
        
        if (profileCloudStatus) {
            // Mettre à jour le status basé sur la connexion cloud
            if (this.neonClient && this.neonClient.isLoggedIn()) {
                profileCloudStatus.textContent = 'Cloud';
                profileCloudStatus.style.color = 'var(--success)';
            } else {
                profileCloudStatus.textContent = 'Local';
                profileCloudStatus.style.color = 'var(--primary)';
            }
        }
    }
    
    setupProfileSystem() {
        // Initialiser l'affichage du profil
        this.updateProfileDisplay();
        
        // Écouteurs d'événements pour le système de profil
        const profileCard = document.getElementById('profileCard');
        const profileEditBtn = document.getElementById('profileEditBtn');
        const profileModal = document.getElementById('profileModal');
        const profileModalClose = document.getElementById('profileModalClose');
        const profileCancelBtn = document.getElementById('profileCancelBtn');
        const profileSaveBtn = document.getElementById('profileSaveBtn');
        const profileNameInput = document.getElementById('profileNameInput');
        const avatarOptions = document.querySelectorAll('.avatar-option');
        
        let selectedAvatar = this.playerProfile.avatar;
        
        // Ouvrir le modal de profil
        const openProfileModal = () => {
            profileNameInput.value = this.playerProfile.name;
            selectedAvatar = this.playerProfile.avatar;
            
            // Mettre à jour la sélection d'avatar
            avatarOptions.forEach(option => {
                option.classList.remove('selected');
                if (option.dataset.avatar === selectedAvatar) {
                    option.classList.add('selected');
                }
            });
            
            profileModal.style.display = 'flex';
        };
        
        // Fermer le modal de profil
        const closeProfileModal = () => {
            profileModal.style.display = 'none';
        };
        
        // Sauvegarder le profil
        const saveProfile = () => {
            const newName = profileNameInput.value.trim();
            
            if (!newName) {
                alert('Veuillez entrer un nom valide');
                return;
            }
            
            if (newName.length > 20) {
                alert('Le nom ne peut pas dépasser 20 caractères');
                return;
            }
            
            const newProfile = {
                name: newName,
                avatar: selectedAvatar
            };
            
            this.saveProfile(newProfile);
            closeProfileModal();
        };
        
        // Gestionnaires d'événements
        if (profileEditBtn) {
            profileEditBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openProfileModal();
            });
        }
        
        if (profileModalClose) {
            profileModalClose.addEventListener('click', closeProfileModal);
        }
        
        if (profileCancelBtn) {
            profileCancelBtn.addEventListener('click', closeProfileModal);
        }
        
        if (profileSaveBtn) {
            profileSaveBtn.addEventListener('click', saveProfile);
        }
        
        // Fermer le modal en cliquant à l'extérieur
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) {
                    closeProfileModal();
                }
            });
        }
        
        // Sélection d'avatar
        avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                avatarOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedAvatar = option.dataset.avatar;
            });
        });
        
        // Validation du nom en temps réel
        if (profileNameInput) {
            profileNameInput.addEventListener('input', () => {
                const value = profileNameInput.value;
                if (value.length > 20) {
                    profileNameInput.value = value.substring(0, 20);
                }
            });
            
            // Sauvegarder avec Entrée
            profileNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveProfile();
                }
            });
        }
        
        // Gestionnaires pour les comptes cloud
        const createAccountBtn = document.getElementById('createAccountBtn');
        const loginAccountBtn = document.getElementById('loginAccountBtn');
        
        if (createAccountBtn) {
            createAccountBtn.addEventListener('click', () => {
                this.showCloudAccountDialog('create');
            });
        }
        
        if (loginAccountBtn) {
            loginAccountBtn.addEventListener('click', () => {
                this.showCloudAccountDialog('login');
            });
        }
    }
    
    showCloudAccountDialog(mode) {
        if (!this.neonClient) {
            alert('Service cloud non disponible');
            return;
        }
        
        const isCreate = mode === 'create';
        const title = isCreate ? 'Créer un compte' : 'Se connecter';
        const buttonText = isCreate ? 'Créer' : 'Se connecter';
        
        // Créer le modal de compte cloud
        const modal = document.createElement('div');
        modal.className = 'cloud-account-modal';
        modal.innerHTML = `
            <div class="cloud-account-content">
                <div class="cloud-account-header">
                    <h2>${title}</h2>
                    <button class="cloud-account-close">×</button>
                </div>
                
                <div class="cloud-account-body">
                    <div class="cloud-form-group">
                        <label>Email</label>
                        <input type="email" id="cloudEmail" class="cloud-input" placeholder="votre@email.com" required>
                    </div>
                    
                    <div class="cloud-form-group">
                        <label>Mot de passe</label>
                        <input type="password" id="cloudPassword" class="cloud-input" placeholder="••••••••" required>
                    </div>
                    
                    ${isCreate ? `
                        <div class="cloud-form-group">
                            <label>Confirmer le mot de passe</label>
                            <input type="password" id="cloudPasswordConfirm" class="cloud-input" placeholder="••••••••" required>
                        </div>
                    ` : ''}
                    
                    <div class="cloud-info">
                        ${isCreate ? 
                            'Créez un compte pour sauvegarder vos scores et accéder au leaderboard global.' :
                            'Connectez-vous à votre compte existant.'
                        }
                    </div>
                    
                    <div class="cloud-account-error" id="cloudAccountError" style="display: none;"></div>
                </div>
                
                <div class="cloud-account-footer">
                    <button class="btn btn-secondary" id="cloudCancelBtn">Annuler</button>
                    <button class="btn btn-primary" id="cloudSubmitBtn">${buttonText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Ajouter les styles CSS dynamiquement
        if (!document.getElementById('cloudAccountStyles')) {
            const styles = document.createElement('style');
            styles.id = 'cloudAccountStyles';
            styles.textContent = `
                .cloud-account-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 11000;
                    padding: var(--spacing-md);
                }
                
                .cloud-account-content {
                    background: var(--bg-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-width: 400px;
                    overflow: hidden;
                }
                
                .cloud-account-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-lg);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    background: var(--bg-tertiary);
                }
                
                .cloud-account-header h2 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                
                .cloud-account-close {
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-size: 1.25rem;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--transition-base);
                }
                
                .cloud-account-close:hover {
                    background: var(--accent);
                    color: white;
                }
                
                .cloud-account-body {
                    padding: var(--spacing-lg);
                }
                
                .cloud-form-group {
                    margin-bottom: var(--spacing-md);
                }
                
                .cloud-form-group label {
                    display: block;
                    margin-bottom: var(--spacing-xs);
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }
                
                .cloud-input {
                    width: 100%;
                    padding: var(--spacing-sm);
                    background: var(--bg-tertiary);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-sm);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    transition: border-color var(--transition-base);
                }
                
                .cloud-input:focus {
                    outline: none;
                    border-color: var(--primary);
                }
                
                .cloud-info {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-bottom: var(--spacing-md);
                    padding: var(--spacing-sm);
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: var(--radius-sm);
                }
                
                .cloud-account-error {
                    background: rgba(244, 67, 54, 0.1);
                    color: var(--accent);
                    padding: var(--spacing-sm);
                    border-radius: var(--radius-sm);
                    font-size: 0.875rem;
                    margin-bottom: var(--spacing-md);
                    border: 1px solid rgba(244, 67, 54, 0.3);
                }
                
                .cloud-account-footer {
                    display: flex;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-lg);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    justify-content: flex-end;
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Ajouter les événements
        const closeBtn = modal.querySelector('.cloud-account-close');
        const cancelBtn = modal.querySelector('#cloudCancelBtn');
        const submitBtn = modal.querySelector('#cloudSubmitBtn');
        const emailInput = modal.querySelector('#cloudEmail');
        const passwordInput = modal.querySelector('#cloudPassword');
        const passwordConfirmInput = modal.querySelector('#cloudPasswordConfirm');
        const errorDiv = modal.querySelector('#cloudAccountError');
        
        const closeModal = () => {
            modal.remove();
        };
        
        const showError = (message) => {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        };
        
        const hideError = () => {
            errorDiv.style.display = 'none';
        };
        
        const handleSubmit = async () => {
            hideError();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (!email || !password) {
                showError('Veuillez remplir tous les champs');
                return;
            }
            
            if (isCreate) {
                const passwordConfirm = passwordConfirmInput.value;
                if (password !== passwordConfirm) {
                    showError('Les mots de passe ne correspondent pas');
                    return;
                }
                
                if (password.length < 6) {
                    showError('Le mot de passe doit contenir au moins 6 caractères');
                    return;
                }
            }
            
            submitBtn.textContent = 'Chargement...';
            submitBtn.disabled = true;
            
            try {
                if (isCreate) {
                    const result = await this.neonClient.createAccountProfile(
                        this.playerProfile.name,
                        this.playerProfile.avatar,
                        email,
                        password
                    );
                    console.log('Compte créé:', result);
                    alert('Compte créé avec succès!');
                } else {
                    const result = await this.neonClient.loginWithEmail(email, password);
                    console.log('Connexion réussie:', result);
                    
                    // Mettre à jour le profil local
                    this.playerProfile = {
                        name: result.display_name,
                        avatar: result.avatar_emoji
                    };
                    this.updateProfileDisplay();
                    
                    alert('Connexion réussie!');
                }
                
                // Notifier le gestionnaire de leaderboard
                if (this.leaderboardManager) {
                    await this.leaderboardManager.onCloudLogin();
                }
                
                // Synchroniser avec localStorage
                this.neonClient.syncToLocalStorage();
                
                closeModal();
                
            } catch (error) {
                console.error('Erreur compte cloud:', error);
                showError(error.message || 'Erreur de connexion au service cloud');
                submitBtn.textContent = buttonText;
                submitBtn.disabled = false;
            }
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        submitBtn.addEventListener('click', handleSubmit);
        
        // Fermer en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Submit avec Entrée
        [emailInput, passwordInput, passwordConfirmInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                });
            }
        });
        
        // Focus sur le premier champ
        setTimeout(() => {
            emailInput.focus();
        }, 100);
    }
    
    getPlayerProfileForMultiplayer() {
        // Retourner les informations de profil pour le multijoueur
        return {
            name: this.playerProfile.name,
            avatar: this.playerProfile.avatar,
            id: this.multiplayerManager ? this.multiplayerManager.myPlayerId : null
        };
    }

    // ===== GESTION BASE DE DONNÉES NEON =====

    async initializeDatabase() {
        try {
            this.neonClient = new NeonClient();
            console.log('Client Neon initialisé');
            
            // Initialiser le gestionnaire de leaderboard
            this.leaderboardManager = new LeaderboardManager(this.neonClient);
            console.log('Gestionnaire de leaderboard initialisé');
            
            // Vérifier si on a des données cloud à synchroniser
            await this.checkCloudSync();
        } catch (error) {
            console.error('Erreur initialisation base de données:', error);
            // Le jeu peut continuer sans la base de données
            // Initialiser le leaderboard manager en mode local seulement
            this.leaderboardManager = new LeaderboardManager(null);
        }
    }

    async checkCloudSync() {
        if (!this.neonClient) return;

        try {
            const localProfile = this.loadFromLocalStorage();
            
            if (localProfile && localProfile.cloudToken) {
                // Tenter de se reconnecter avec le token
                try {
                    const cloudUser = await this.neonClient.loginWithToken(localProfile.cloudToken);
                    console.log('Reconnexion cloud réussie:', cloudUser.display_name);
                    this.playerProfile = {
                        name: cloudUser.display_name,
                        avatar: cloudUser.avatar_emoji
                    };
                    this.updateProfileDisplay();
                    
                    // Notifier le gestionnaire de leaderboard
                    if (this.leaderboardManager) {
                        await this.leaderboardManager.onCloudLogin();
                    }
                } catch (error) {
                    console.log('Token cloud expiré, profil local conservé');
                }
            }
        } catch (error) {
            console.error('Erreur synchronisation cloud:', error);
        }
    }

    async saveGameResult(victory, durationSeconds, buildingsCaptured = 0, buildingsLost = 0) {
        const gameData = {
            gameMode: this.isMultiplayer ? 'multiplayer' : 'solo',
            difficulty: this.aiDifficulty,
            victory: victory,
            durationSeconds: durationSeconds,
            buildingsCaptured: buildingsCaptured,
            buildingsLost: buildingsLost,
            playersCount: this.isMultiplayer ? this.getTotalPlayers() : this.getAIPlayerCount() + 1
        };

        // Enregistrer dans le leaderboard manager (local et cloud)
        if (this.leaderboardManager) {
            await this.leaderboardManager.recordGameResult(gameData);
        }

        // Enregistrer dans le cloud si connecté
        if (this.neonClient && this.neonClient.isLoggedIn()) {
            try {
                const result = await this.neonClient.saveGameScore(gameData);
                console.log('Score cloud sauvegardé:', result);
                
                // Afficher le nouveau score
                this.showScoreSaved(result);
            } catch (error) {
                console.error('Erreur sauvegarde score cloud:', error);
            }
        } else {
            console.log('Score sauvegardé localement uniquement');
        }
    }

    setupLeaderboardListeners() {
        const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');
        const backFromLeaderboardBtn = document.getElementById('backFromLeaderboardBtn');
        
        if (showLeaderboardBtn) {
            showLeaderboardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.leaderboardManager) {
                    this.leaderboardManager.showLeaderboardScreen();
                }
            });
        }
        
        if (backFromLeaderboardBtn) {
            backFromLeaderboardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.leaderboardManager) {
                    this.leaderboardManager.hideLeaderboardScreen();
                }
            });
        }
    }

    showScoreSaved(result) {
        // Afficher brièvement que le score a été sauvegardé
        const statusDiv = document.createElement('div');
        statusDiv.textContent = `Score sauvegardé: ${result.final_score}`;
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
        `;
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 3000);
    }

    getTotalPlayers() {
        if (!this.isMultiplayer) return 1;
        return this.multiplayerManager ? this.multiplayerManager.connections.size + 1 : 2;
    }

    getAIPlayerCount() {
        // Compter les joueurs IA dans la partie
        const owners = ['player', 'enemy', 'enemy2', 'enemy3'];
        const usedOwners = new Set();
        
        this.buildings.forEach(building => {
            usedOwners.add(building.owner);
        });
        
        return usedOwners.size - 1; // -1 pour exclure le joueur humain
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('towerRushProfile');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Erreur lecture localStorage:', error);
        }
        return null;
    }
}