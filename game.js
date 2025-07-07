class Building {
    constructor(x, y, owner = 'neutral') {
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.units = owner === 'neutral' ? 0 : 5;
        this.maxUnits = 200;
        this.productionRate = 1;
        this.radius = 30;
        this.selected = false;
        this.lastProduction = Date.now();
        this.sprite = null;
        this.currentBuildingType = 'house1';
        this.loadSprite();
    }

    getBuildingType() {
        if (this.units < 10) {
            // Progression house1 -> house2 -> house3 de 0 à 9 soldats
            if (this.units < 3) return 'house1';
            if (this.units < 6) return 'house2';
            return 'house3';
        }
        if (this.units < 20) return 'tower';
        return 'castle';
    }


    loadSprite() {
        const newType = this.getBuildingType();
        
        // Ne recharger que si le type a changé
        if (newType !== this.currentBuildingType) {
            this.currentBuildingType = newType;
            this.sprite = new Image();
            this.spriteLoaded = false;
            
            let path = '';
            
            switch(this.owner) {
                case 'player':
                    switch(newType) {
                        case 'house1': path = './assets/Buildings/Blue Buildings/House1.png'; break;
                        case 'house2': path = './assets/Buildings/Blue Buildings/House2.png'; break;
                        case 'house3': path = './assets/Buildings/Blue Buildings/House3.png'; break;
                        case 'tower': path = './assets/Buildings/Blue Buildings/Tower.png'; break;
                        case 'castle': path = './assets/Buildings/Blue Buildings/Castle.png'; break;
                    }
                    break;
                case 'enemy':
                    switch(newType) {
                        case 'house1': path = './assets/Buildings/Red Buildings/House1.png'; break;
                        case 'house2': path = './assets/Buildings/Red Buildings/House2.png'; break;
                        case 'house3': path = './assets/Buildings/Red Buildings/House3.png'; break;
                        case 'tower': path = './assets/Buildings/Red Buildings/Tower.png'; break;
                        case 'castle': path = './assets/Buildings/Red Buildings/Castle.png'; break;
                    }
                    break;
                default:
                    switch(newType) {
                        case 'house1': path = './assets/Buildings/Yellow Buildings/House1.png'; break;
                        case 'house2': path = './assets/Buildings/Yellow Buildings/House2.png'; break;
                        case 'house3': path = './assets/Buildings/Yellow Buildings/House3.png'; break;
                        case 'tower': path = './assets/Buildings/Yellow Buildings/Tower.png'; break;
                        case 'castle': path = './assets/Buildings/Yellow Buildings/Castle.png'; break;
                    }
            }
            
            this.sprite.onload = () => {
                this.spriteLoaded = true;
            };
            this.sprite.onerror = () => {
                console.log(`Failed to load building sprite: ${path}`);
                this.spriteLoaded = false;
            };
            
            this.sprite.src = path;
        }
    }

    update() {
        if (this.owner !== 'neutral' && this.units < this.maxUnits) {
            const now = Date.now();
            const productionRate = this.getBuildingType() === 'castle' ? 2 : 1;
            
            if (now - this.lastProduction > (1000 / productionRate)) {
                this.units++;
                this.lastProduction = now;
                this.loadSprite(); // Vérifier si le bâtiment doit évoluer
            }
        }
    }

    draw(ctx) {
        const buildingType = this.getBuildingType();
        
        // Dessiner le bâtiment principal avec ratio préservé
        if (this.spriteLoaded && this.sprite && this.sprite.complete) {
            // Calculer la taille en préservant le ratio d'aspect
            let targetSize;
            switch(buildingType) {
                case 'house1': targetSize = 58; break; // 45 * 1.3
                case 'house2': targetSize = 65; break; // 50 * 1.3
                case 'house3': targetSize = 72; break; // 55 * 1.3
                case 'tower': targetSize = 85; break;  // 65 * 1.3
                case 'castle': targetSize = 104; break; // 80 * 1.3
                default: targetSize = 65;
            }
            
            // Préserver le ratio d'aspect du sprite
            const aspectRatio = this.sprite.naturalWidth / this.sprite.naturalHeight;
            let width, height;
            
            if (aspectRatio > 1) {
                // Image plus large que haute
                width = targetSize;
                height = targetSize / aspectRatio;
            } else {
                // Image plus haute que large
                height = targetSize;
                width = targetSize * aspectRatio;
            }
            
            ctx.drawImage(this.sprite, this.x - width/2, this.y - height/2, width, height);
        } else {
            // Fallback si le sprite n'est pas chargé
            let size = buildingType === 'castle' ? 52 : buildingType === 'tower' ? 42 : 33; // +30%
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            
            if (this.owner === 'player') {
                ctx.fillStyle = this.selected ? '#4CAF50' : '#66BB6A';
            } else if (this.owner === 'enemy') {
                ctx.fillStyle = '#F44336';
            } else {
                ctx.fillStyle = '#9E9E9E';
            }
            
            ctx.fill();
        }
        
        // Bordure si sélectionné
        if (this.selected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            let size;
            switch(buildingType) {
                case 'castle': size = 52; break; // 40 * 1.3
                case 'tower': size = 42; break;  // 32 * 1.3
                default: size = 33;             // 25 * 1.3
            }
            ctx.strokeRect(this.x - size, this.y - size, size * 2, size * 2);
        }
        
        // Afficher le nombre d'unités avec fond
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x - 18, this.y + 35, 36, 22);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.units.toString(), this.x, this.y + 48);
        
        // Afficher le type de bâtiment (debug)
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.font = '10px Arial';
        ctx.fillText(buildingType, this.x, this.y - 40);
    }

    isPointInside(x, y) {
        const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return distance <= this.radius;
    }

    sendUnits(target, percentage) {
        if (this.owner === 'neutral' || this.units === 0) return;
        
        const unitsToSend = Math.floor(this.units * (percentage / 100));
        if (unitsToSend > 0) {
            this.units -= unitsToSend;
            game.addUnitGroup(this, target, unitsToSend);
        }
    }
}

class UnitGroup {
    constructor(source, target, units, owner) {
        this.source = source;
        this.target = target;
        this.units = units;
        this.owner = owner;
        this.x = source.x;
        this.y = source.y;
        this.speed = 30;
        this.lastUpdate = Date.now();
        this.sprite = null;
        this.spriteLoaded = false;
        
        // Animation properties
        this.frameWidth = 32;
        this.frameHeight = 32;
        this.currentFrame = 0;
        this.frameCount = 6; // 6 frames par animation
        this.animationSpeed = 200; // ms entre chaque frame
        this.lastFrameTime = Date.now();
        this.animationRow = 1; // Utiliser la ligne 1 pour la marche (2ème ligne)
        
        // Formation des soldats
        this.soldiers = [];
        this.createSoldierFormation();
        
        
        this.loadSprite();
    }

    loadSprite() {
        this.sprite = new Image();
        this.spriteLoaded = false;
        let path = '';
        
        switch(this.owner) {
            case 'player':
                path = './assets/Factions/Knights/Troops/Warrior/Blue/Warrior_Blue.png';
                break;
            case 'enemy':
                path = './assets/Factions/Knights/Troops/Warrior/Red/Warrior_Red.png';
                break;
            default:
                path = './assets/Factions/Knights/Troops/Warrior/Yellow/Warrior_Yellow.png';
        }
        
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            // Calculer les dimensions exactes du sprite sheet
            this.frameWidth = this.sprite.naturalWidth / 6; // 6 colonnes
            this.frameHeight = this.sprite.naturalHeight / 8; // 8 lignes
            console.log(`Sprite loaded: ${this.sprite.naturalWidth}x${this.sprite.naturalHeight}, frame: ${this.frameWidth}x${this.frameHeight}`);
        };
        this.sprite.onerror = () => {
            console.log(`Failed to load unit sprite: ${path}`);
            this.spriteLoaded = false;
        };
        
        this.sprite.src = path;
    }
    

    createSoldierFormation() {
        this.soldiers = [];
        const maxSoldiers = Math.min(this.units, 10); // Maximum 10 soldats visibles
        
        for (let i = 0; i < maxSoldiers; i++) {
            // Créer une formation en triangle ou en ligne
            let offsetX, offsetY;
            
            if (maxSoldiers <= 3) {
                // Formation en ligne pour 1-3 soldats
                offsetX = (i - (maxSoldiers - 1) / 2) * 8;
                offsetY = 0;
            } else {
                // Formation en triangle pour 4+ soldats
                const row = Math.floor(Math.sqrt(i));
                const posInRow = i - row * row;
                const rowWidth = row * 2 + 1;
                
                offsetX = (posInRow - row) * 6;
                offsetY = row * 8;
            }
            
            this.soldiers.push({
                offsetX: offsetX,
                offsetY: offsetY,
                animOffset: Math.random() * this.frameCount // Variation d'animation
            });
        }
    }
    
    calculateDirection() {
        // Pour l'instant, utilisons juste une animation de marche simple
        // On peut ajouter les directions plus tard
        return 1; // Ligne 1 (2ème ligne) pour l'animation de marche
    }
    
    updateAnimation() {
        const now = Date.now();
        if (now - this.lastFrameTime > this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.lastFrameTime = now;
        }
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Calculer la direction vers la cible
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            // Arrivé à destination
            this.attack();
            return false; // Supprimer ce groupe
        }

        // Déplacer vers la cible
        this.x += (dx / distance) * this.speed * deltaTime;
        this.y += (dy / distance) * this.speed * deltaTime;
        
        // Mettre à jour l'animation
        this.animationRow = this.calculateDirection();
        this.updateAnimation();
        
        
        // Recréer la formation si le nombre d'unités a changé
        if (this.soldiers.length !== Math.min(this.units, 10)) {
            this.createSoldierFormation();
        }
        
        return true; // Continuer à exister
    }
    

    attack() {
        if (this.target.owner === this.owner) {
            // Renforcer un bâtiment allié
            this.target.units += this.units;
            if (this.target.units > this.target.maxUnits) {
                this.target.units = this.target.maxUnits;
            }
        } else {
            // Attaquer un bâtiment ennemi
            // Les défenseurs sont 20% plus forts (bonus défensif)
            const defenseBonus = 1.2;
            const effectiveDefenders = Math.floor(this.target.units * defenseBonus);
            const attackers = this.units;
            
            if (attackers > effectiveDefenders) {
                // Attaque réussie - conquérir le bâtiment
                this.target.owner = this.owner;
                this.target.units = attackers - effectiveDefenders;
            } else {
                // Attaque échouée - réduire les défenseurs
                const defendersLost = Math.floor(attackers / defenseBonus);
                this.target.units = Math.max(0, this.target.units - defendersLost);
            }
        }
    }

    draw(ctx) {
        // Dessiner plusieurs soldats selon le nombre d'unités
        if (this.spriteLoaded && this.sprite && this.sprite.complete) {
            const drawSize = 56; // Taille encore plus grande (42 * 1.33)
            
            // Dessiner chaque soldat dans la formation
            this.soldiers.forEach((soldier, index) => {
                // Frame d'animation avec variation pour chaque soldat
                const frame = (this.currentFrame + Math.floor(soldier.animOffset)) % this.frameCount;
                const srcX = frame * this.frameWidth;
                const srcY = this.animationRow * this.frameHeight;
                
                // Position du soldat
                const soldierX = this.x + soldier.offsetX;
                const soldierY = this.y + soldier.offsetY;
                
                // Dessiner le soldat
                ctx.drawImage(
                    this.sprite,
                    srcX, srcY, this.frameWidth, this.frameHeight, // Source
                    soldierX - drawSize/2, soldierY - drawSize/2, drawSize, drawSize // Destination
                );
            });
            
            
            // Debug: afficher info (optionnel)
            if (this.units > 10) {
                ctx.fillStyle = 'yellow';
                ctx.font = '8px Arial';
                ctx.fillText(`+${this.units - 10}`, this.x + 15, this.y - 20);
            }
        } else {
            // Fallback animé - groupe de cercles
            const maxVisible = Math.min(this.units, 10);
            for (let i = 0; i < maxVisible; i++) {
                const offsetX = (i % 3 - 1) * 8;
                const offsetY = Math.floor(i / 3) * 8;
                
                ctx.beginPath();
                const radius = 8 + Math.sin((Date.now() + i * 100) / 200) * 1; // +30%
                ctx.arc(this.x + offsetX, this.y + offsetY, radius, 0, Math.PI * 2);
                ctx.fillStyle = this.owner === 'player' ? '#2196F3' : '#F44336';
                ctx.fill();
                
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        
        // Afficher le nombre total d'unités
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(this.x - 15, this.y - 35, 30, 16);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.units.toString(), this.x, this.y - 22);
    }
}

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
        
        this.setupCanvas();
        this.loadBackground();
        this.initBuildings();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    setupCanvas() {
        // Définir la taille du canvas en fonction de la fenêtre
        const containerWidth = this.canvas.parentElement.clientWidth - 20; // -20 pour le padding
        const containerHeight = this.canvas.parentElement.clientHeight - 20;
        
        // Ratio 16:9 ou selon l'écran
        const aspectRatio = 16 / 10;
        let canvasWidth = containerWidth;
        let canvasHeight = canvasWidth / aspectRatio;
        
        // Ajuster si la hauteur dépasse
        if (canvasHeight > containerHeight) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }
        
        // Minimum 1200x750 pour la jouabilité
        canvasWidth = Math.max(canvasWidth, 1200);
        canvasHeight = Math.max(canvasHeight, 750);
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        console.log(`Canvas size: ${canvasWidth}x${canvasHeight}`);
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
        
        // Recharger le background avec nouvelles positions
        this.loadBackground();
    }
    
    
    drawTerrain(ctx) {
        // Remplir tout le terrain avec une couleur verte simple
        ctx.fillStyle = '#4a7c59'; // Vert naturel
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }


    loadBackground() {
        // Terrain simple en couleur verte - pas besoin de sprites
        this.terrainLoaded = true;
        
        // Décorations positionnées relativement au canvas
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        this.decorations = [
            // Arbres répartis sur le terrain avec animation frame par frame
            { x: canvasWidth * 0.15, y: canvasHeight * 0.2, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 300, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.25, y: canvasHeight * 0.8, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 400, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.35, y: canvasHeight * 0.15, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 350, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.45, y: canvasHeight * 0.75, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 3, frameCount: 6, animationSpeed: 450, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.55, y: canvasHeight * 0.25, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 4, frameCount: 6, animationSpeed: 380, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.65, y: canvasHeight * 0.85, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 5, frameCount: 6, animationSpeed: 420, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.75, y: canvasHeight * 0.12, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 0, frameCount: 6, animationSpeed: 360, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.85, y: canvasHeight * 0.65, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 1, frameCount: 6, animationSpeed: 410, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.12, y: canvasHeight * 0.55, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 2, frameCount: 6, animationSpeed: 390, lastFrameTime: Date.now() },
            { x: canvasWidth * 0.88, y: canvasHeight * 0.35, sprite: new Image(), type: 'tree', loaded: false, currentFrame: 3, frameCount: 6, animationSpeed: 340, lastFrameTime: Date.now() },
            
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
        // Positions relatives au canvas pour s'adapter à toutes les tailles
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Bâtiments du joueur (côté gauche)
        this.buildings.push(new Building(canvasWidth * 0.1, canvasHeight * 0.2, 'player'));
        this.buildings.push(new Building(canvasWidth * 0.1, canvasHeight * 0.5, 'player'));
        this.buildings.push(new Building(canvasWidth * 0.1, canvasHeight * 0.8, 'player'));
        
        // Bâtiments ennemis (côté droit)
        this.buildings.push(new Building(canvasWidth * 0.9, canvasHeight * 0.2, 'enemy'));
        this.buildings.push(new Building(canvasWidth * 0.9, canvasHeight * 0.5, 'enemy'));
        this.buildings.push(new Building(canvasWidth * 0.9, canvasHeight * 0.8, 'enemy'));
        
        // Bâtiments neutres (centre)
        this.buildings.push(new Building(canvasWidth * 0.5, canvasHeight * 0.2, 'neutral'));
        this.buildings.push(new Building(canvasWidth * 0.5, canvasHeight * 0.5, 'neutral'));
        this.buildings.push(new Building(canvasWidth * 0.5, canvasHeight * 0.8, 'neutral'));
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
                    building.sendUnits(this.targetBuilding, this.sendPercentage);
                });
                this.targetBuilding = null;
                this.updateUI();
            }
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });

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
        
        const clickedBuilding = this.buildings.find(building => building.isPointInside(adjustedX, adjustedY));
        
        if (clickedBuilding) {
            if (this.selectedBuildings.length > 0 && !this.selectedBuildings.includes(clickedBuilding)) {
                // Définir la cible
                this.targetBuilding = clickedBuilding;
                this.updateUI();
            } else if (clickedBuilding.owner === 'player') {
                // Sélectionner/désélectionner un bâtiment du joueur
                if (clickedBuilding.selected) {
                    // Désélectionner si déjà sélectionné
                    clickedBuilding.selected = false;
                    this.selectedBuildings = this.selectedBuildings.filter(b => b !== clickedBuilding);
                } else {
                    // Ajouter à la sélection
                    clickedBuilding.selected = true;
                    this.selectedBuildings.push(clickedBuilding);
                }
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
        const playerBuildings = this.buildings.filter(b => b.owner === 'player').length;
        const enemyBuildings = this.buildings.filter(b => b.owner === 'enemy').length;
        document.getElementById('playerBuildings').textContent = playerBuildings;
        document.getElementById('enemyBuildings').textContent = enemyBuildings;
    }

    addUnitGroup(source, target, units) {
        this.unitGroups.push(new UnitGroup(source, target, units, source.owner));
    }

    update() {
        if (this.gameOver) return;
        
        // Mettre à jour les bâtiments
        this.buildings.forEach(building => building.update());
        
        // Mettre à jour les groupes d'unités
        this.unitGroups = this.unitGroups.filter(group => group.update());
        
        // Vérifier les conditions de victoire
        this.checkGameOver();
        
        // Mettre à jour l'interface
        this.updateUI();
        
        // IA simple
        this.updateAI();
    }

    updateAI() {
        // IA basique : attaquer aléatoirement
        if (Math.random() < 0.01) { // 1% de chance par frame
            const enemyBuildings = this.buildings.filter(b => b.owner === 'enemy' && b.units > 10);
            const targets = this.buildings.filter(b => b.owner !== 'enemy');
            
            if (enemyBuildings.length > 0 && targets.length > 0) {
                const source = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
                const target = targets[Math.floor(Math.random() * targets.length)];
                source.sendUnits(target, 50);
            }
        }
    }

    checkGameOver() {
        const playerBuildings = this.buildings.filter(b => b.owner === 'player').length;
        const enemyBuildings = this.buildings.filter(b => b.owner === 'enemy').length;
        
        if (playerBuildings === 0) {
            this.endGame('Défaite!', 'L\'ennemi a conquis tous vos bâtiments.');
        } else if (enemyBuildings === 0) {
            this.endGame('Victoire!', 'Vous avez conquis tous les bâtiments ennemis!');
        }
    }

    endGame(title, message) {
        this.gameOver = true;
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
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
                    
                    const size = 100; // Taille d'affichage
                    
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
        
        // Dessiner les groupes d'unités
        this.unitGroups.forEach(group => group.draw(this.ctx));
        
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
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Démarrer le jeu
let game;
window.addEventListener('load', () => {
    game = new Game();
});