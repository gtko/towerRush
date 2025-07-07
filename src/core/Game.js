class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.buildings = [];
        this.unitGroups = [];
        this.selectedBuildings = [];
        this.targetBuilding = null;
        this.gameOver = false;
        this.sendPercentage = 50;
        this.backgroundSprites = [];
        
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
        
        // Timer pour le mode arrière-plan
        this.backgroundTimer = null;
        this.backgroundInterval = null;
        
        this.setupCanvas();
        this.loadBackground();
        this.setupEventListeners();
        this.setupMenuListeners();
        this.setupAudioControls();
        this.setupVisibilityHandlers();
        
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
        // Définir la taille du canvas en fonction de la fenêtre
        const container = this.canvas.parentElement;
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
        
        console.log(`Canvas resolution: 1920x1080, Display size: ${Math.round(canvasWidth)}x${Math.round(canvasHeight)}`);
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

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.handleClick(x, y);
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

        document.getElementById('sendBtn').addEventListener('click', () => {
            if (this.selectedBuildings.length > 0 && this.targetBuilding) {
                this.selectedBuildings.forEach(building => {
                    // Envoyer l'action au réseau si multijoueur
                    if (this.isMultiplayer) {
                        const sourceId = this.buildings.indexOf(building);
                        const targetId = this.buildings.indexOf(this.targetBuilding);
                        this.sendMultiplayerAction({
                            type: 'send_units',
                            sourceId: sourceId,
                            targetId: targetId,
                            percentage: this.sendPercentage
                        });
                    } else {
                        building.sendUnits(this.targetBuilding, this.sendPercentage, this);
                    }
                });
                
                // Réinitialiser les sélections après envoi
                this.targetBuilding = null;
                this.clearSelection();
            }
        });

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
    }

    handleClick(x, y) {
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
            if (this.selectedBuildings.length > 0 && !this.selectedBuildings.includes(clickedBuilding)) {
                // Définir la cible
                this.targetBuilding = clickedBuilding;
                this.updateUI();
            } else if (this.canPlayerControl(clickedBuilding)) {
                // Sélectionner/désélectionner un bâtiment du joueur
                // IMPORTANT: Les sélections sont LOCALES, pas partagées!
                if (clickedBuilding.selected) {
                    // Désélectionner si déjà sélectionné
                    clickedBuilding.selected = false;
                    this.selectedBuildings = this.selectedBuildings.filter(b => b !== clickedBuilding);
                } else {
                    // Ajouter à la sélection
                    clickedBuilding.selected = true;
                    this.selectedBuildings.push(clickedBuilding);
                }
                
                // PAS de synchronisation des sélections - elles restent locales
                this.updateUI();
            }
        } else {
            // Clic dans le vide = tout désélectionner
            this.clearSelection();
        }
    }

    clearSelection() {
        this.selectedBuildings.forEach(building => {
            building.selected = false;
        });
        this.selectedBuildings = [];
        this.targetBuilding = null;
        this.updateUI();
        console.log('Sélections nettoyées');
    }

    updateUI() {
        const selectedInfo = document.getElementById('selectedBuildingInfo');
        const sendBtn = document.getElementById('sendBtn');
        const percentageInfo = document.getElementById('percentageInfo');
        
        if (this.selectedBuildings.length > 0 && this.targetBuilding) {
            const totalUnits = this.selectedBuildings.reduce((sum, building) => sum + building.units, 0);
            const unitsToSend = Math.floor(totalUnits * (this.sendPercentage / 100));
            selectedInfo.textContent = `Envoyer ${unitsToSend} unités (${this.selectedBuildings.length} bâtiments)`;
            sendBtn.disabled = false;
        } else if (this.selectedBuildings.length > 0) {
            const totalUnits = this.selectedBuildings.reduce((sum, building) => sum + building.units, 0);
            selectedInfo.textContent = `${this.selectedBuildings.length} bâtiment(s) sélectionné(s): ${totalUnits} unités`;
            sendBtn.disabled = true;
        } else {
            selectedInfo.textContent = 'Cliquez sur vos bâtiments (clic = ajouter/retirer)';
            sendBtn.disabled = true;
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
        
        // En multijoueur, diffuser immédiatement le nouvel état
        if (this.isMultiplayer && this.multiplayerManager && this.multiplayerManager.isHost) {
            setTimeout(() => this.multiplayerManager.broadcastGameState(), 50);
        }
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
            if (group.toRemove) return false;
            return group.update(this);
        });
        
        // Vérifier les conditions de victoire
        this.checkGameOver();
        
        // Mettre à jour l'interface
        this.updateUI();
        
        // IA simple (désactivée en multijoueur)
        this.updateAI();
        
        // Synchronisation multijoueur pour l'hôte (limitée pour les performances)
        if (this.isMultiplayer && this.multiplayerManager && this.multiplayerManager.isHost) {
            const currentState = this.getGameStateChecksum();
            const now = Date.now();
            
            if (previousState !== currentState) {
                // L'état a changé, diffuser aux clients avec throttling
                if (!this.lastBroadcast || now - this.lastBroadcast > 100) { // Max 10 fois par seconde
                    this.multiplayerManager.broadcastGameState();
                    this.lastBroadcast = now;
                }
            }
            
            // Synchronisation forcée périodique en arrière-plan
            if (document.visibilityState !== 'visible') {
                if (!this.lastBackgroundSync || now - this.lastBackgroundSync > 1000) { // Chaque seconde en arrière-plan
                    this.multiplayerManager.broadcastGameState();
                    this.lastBackgroundSync = now;
                }
            }
        }
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
        const playerBuildings = this.buildings.filter(b => b.owner === 'player').length;
        const enemyBuildings = this.buildings.filter(b => b.owner !== 'player' && b.owner !== 'neutral').length;
        
        if (playerBuildings === 0) {
            this.endGame('Défaite!', 'Les ennemis ont conquis tous vos bâtiments.');
        } else if (enemyBuildings === 0) {
            this.endGame('Victoire!', 'Vous avez conquis tous les bâtiments ennemis!');
        }
    }

    endGame(title, message) {
        this.gameOver = true;
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        
        // Mettre à jour l'icône et la classe selon le résultat
        const gameOverContent = document.querySelector('.game-over-content');
        const gameOverIcon = document.getElementById('gameOverIcon');
        
        if (title.includes('Victoire')) {
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
        console.log(`Démarrage du jeu avec ${this.playerCount} joueurs`);
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        
        // Recalculer les dimensions du canvas après l'affichage du container
        this.handleResize();
        
        this.initBuildings();
        this.gameLoop();
    }
    
    backToMenu() {
        this.gameStarted = false;
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
    }

    gameLoop() {
        if (this.gameStarted) {
            this.update();
            this.draw();
        }
        
        // Solution plus simple et fiable sans Web Worker
        if (document.visibilityState === 'visible') {
            requestAnimationFrame(() => this.gameLoop());
        } else {
            // Mode arrière-plan : utiliser setInterval fixe pour éviter le throttling
            this.backgroundTimer = setTimeout(() => {
                if (this.gameStarted) {
                    this.update(); // Continuer la logique même en arrière-plan
                }
                this.gameLoop();
            }, 33); // ~30 FPS fixe
        }
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
        this.localPlayerIndex = playerIndex;
        this.isMultiplayer = true;
        
        if (networkGameState) {
            // Recevoir l'état initial du réseau (pour les clients)
            this.networkGameState = networkGameState;
            this.loadGameStateFromNetwork(networkGameState);
        } else {
            // Créer un nouvel état de jeu (pour l'hôte)
            // Utiliser le nombre réel de joueurs du lobby
            const playerCount = realPlayerCount || this.multiplayerManager.connections.size + 1;
            console.log(`Initialisation multijoueur avec ${playerCount} joueurs réels`);
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
        
        if (sourceBuilding && targetBuilding && 
            this.canPlayerControlBuilding(playerId, sourceBuilding)) {
            sourceBuilding.sendUnits(targetBuilding, action.percentage, this);
            
            // Diffuser le nouvel état à tous les clients
            if (this.multiplayerManager && this.multiplayerManager.isHost) {
                this.multiplayerManager.broadcastGameState();
            }
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
        // Mettre à jour l'état local avec l'état reçu du réseau
        this.networkGameState = networkGameState;
        this.loadGameStateFromNetwork(networkGameState);
    }
    
    loadGameStateFromNetwork(gameState) {
        console.log('Chargement de l\'état de jeu depuis le réseau:', gameState);
        
        // Ajuster la taille du canvas si nécessaire
        if (gameState.canvasWidth && gameState.canvasHeight) {
            this.canvas.width = gameState.canvasWidth;
            this.canvas.height = gameState.canvasHeight;
        }
        
        // Charger les bâtiments
        this.buildings = gameState.buildings.map(buildingData => {
            const building = new Building(buildingData.x, buildingData.y, buildingData.owner, buildingData.units);
            // PAS de synchronisation des sélections - elles restent locales
            building.selected = false; // Toujours false depuis le réseau
            building.maxUnits = buildingData.maxUnits;
            building.productionRate = buildingData.productionRate;
            building.lastProduction = buildingData.lastProduction;
            return building;
        });
        
        // Charger les groupes d'unités
        this.unitGroups = gameState.unitGroups.map(groupData => {
            // Créer des objets source et target temporaires
            const sourceObj = { x: groupData.startX, y: groupData.startY };
            const targetObj = { x: groupData.targetX, y: groupData.targetY };
            
            const group = new UnitGroup(sourceObj, targetObj, groupData.units, groupData.owner);
            group.x = groupData.x;
            group.y = groupData.y;
            group.progress = groupData.progress || 0;
            group.speed = groupData.speed || 30;
            group.lastUpdate = groupData.lastUpdate || Date.now();
            
            // S'assurer que le sprite est chargé
            group.loadSprite();
            
            console.log('Groupe d\'unités créé depuis le réseau:', {
                units: group.units,
                owner: group.owner,
                x: group.x,
                y: group.y,
                from: `${groupData.startX},${groupData.startY}`,
                to: `${groupData.targetX},${groupData.targetY}`
            });
            
            return group;
        });
        
        // État du jeu
        this.gameOver = gameState.gameOver;
        this.sendPercentage = gameState.sendPercentage;
        this.gameStarted = gameState.gameStarted || true;
        
        // S'assurer que le terrain est chargé
        if (!this.terrainGenerated) {
            this.generateTerrain();
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
            return this.getPlayerOwner(this.localPlayerIndex);
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
}