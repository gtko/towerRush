class Building {
    constructor(x, y, owner = 'neutral', units = null) {
        this.x = x;
        this.y = y;
        this.owner = owner;
        
        // Si un nombre d'unités spécifique est fourni, l'utiliser
        if (units !== null) {
            this.units = units;
        } else if (owner !== 'neutral') {
            // Bâtiments joueur/ennemi : 5 soldats par défaut
            this.units = 5;
        } else {
            // Bâtiments neutres : valeur par défaut
            this.units = 20;
        }
        
        this.maxUnits = 80;
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


    getBuildingFolder() {
        switch(this.owner) {
            case 'player': return 'Blue Buildings';
            case 'enemy': return 'Red Buildings';
            case 'enemy2': return 'Black Buildings';
            case 'enemy3': return 'Yellow Buildings';
            case 'neutral': return 'Stone Buildings';
            default: return 'Stone Buildings';
        }
    }
    
    loadSprite() {
        const newType = this.getBuildingType();
        
        // Ne recharger que si le type a changé
        if (newType !== this.currentBuildingType) {
            this.currentBuildingType = newType;
            this.sprite = new Image();
            this.spriteLoaded = false;
            
            let path = '';
            
            const buildingFolder = this.getBuildingFolder();
            
            switch(newType) {
                case 'house1': path = `./assets/Buildings/${buildingFolder}/House1.png`; break;
                case 'house2': path = `./assets/Buildings/${buildingFolder}/House2.png`; break;
                case 'house3': path = `./assets/Buildings/${buildingFolder}/House3.png`; break;
                case 'tower': path = `./assets/Buildings/${buildingFolder}/Tower.png`; break;
                case 'castle': path = `./assets/Buildings/${buildingFolder}/Castle.png`; break;
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
        // Vérifier si le bâtiment est en état de siège
        const isUnderSiege = this.checkIfUnderSiege();
        
        if (this.owner !== 'neutral' && this.units < this.maxUnits && !isUnderSiege) {
            const now = Date.now();
            const productionRate = this.getBuildingType() === 'castle' ? 2 : 1;
            
            if (now - this.lastProduction > (1000 / productionRate)) {
                this.units++;
                this.lastProduction = now;
                this.loadSprite(); // Vérifier si le bâtiment doit évoluer
            }
        }
    }
    
    checkIfUnderSiege() {
        // Un bâtiment est en siège s'il y a un combat en cours contre lui
        return game.unitGroups.some(group => 
            group.isFighting && 
            group.target === this && 
            group.owner !== this.owner
        );
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
        
        // Indicateur de siège
        if (this.checkIfUnderSiege()) {
            ctx.save();
            
            // Icône de siège (cadenas ou bouclier barré)
            ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🚫', this.x + 25, this.y - 25);
            
            // Texte "SIÈGE"
            ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.font = 'bold 12px Arial';
            ctx.strokeText('SIÈGE', this.x, this.y - 45);
            ctx.fillText('SIÈGE', this.x, this.y - 45);
            
            // Effet de pulsation sur le bâtiment
            const pulseAlpha = (Math.sin(Date.now() / 300) + 1) / 4 + 0.2;
            ctx.strokeStyle = `rgba(255, 50, 50, ${pulseAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Afficher le type de bâtiment (debug)
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.font = '10px Arial';
        ctx.fillText(buildingType, this.x, this.y - 60);
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
        this.speed = 34.5; // +15% de vitesse (30 * 1.15)
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
        
        // État de combat
        this.isFighting = false;
        this.waitingForCombat = false;
        this.fightStartTime = null;
        this.fightDuration = null; // Durée dynamique selon le nombre de combattants
        this.hasReachedTarget = false;
        this.reinforcements = 0;
        this.toRemove = false;
        this.lastExplosionTime = Date.now();
        this.explosionInterval = 1500;
        this.combatPanelMinimized = true; // État du panneau de combat - réduit par défaut
        
        // Effets de combat
        this.combatEffects = {
            fires: [],
            explosions: []
        };
        this.effectSprites = {
            fire: null,
            explosion: null
        };
        this.loadEffectSprites();
        
        // Formation des soldats
        this.soldiers = [];
        this.createSoldierFormation();
        
        
        this.loadSprite();
    }
    
    loadEffectSprites() {
        // Charger les sprites d'effets
        this.effectSprites.fire = new Image();
        this.effectSprites.fire.src = './assets/Effects/Fire/Fire.png';
        
        this.effectSprites.explosion = new Image();
        this.effectSprites.explosion.src = './assets/Effects/Explosion/Explosions.png';
    }
    
    getUnitFolder() {
        switch(this.owner) {
            case 'player': return 'Blue';
            case 'enemy': return 'Red';
            case 'enemy2': return 'Purple';
            case 'enemy3': return 'Yellow';
            case 'neutral': return 'Stone';
            default: return 'Stone';
        }
    }

    loadSprite() {
        this.sprite = new Image();
        this.spriteLoaded = false;
        let path = '';
        
        const unitFolder = this.getUnitFolder();
        if (unitFolder === 'Stone') {
            path = `./assets/Factions/Knights/Troops/Warrior/${unitFolder}/Warrior_${unitFolder}.png`;
        } else {
            path = `./assets/Factions/Knights/Troops/Warrior/${unitFolder}/Warrior_${unitFolder}.png`;
        }
        
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            // Calculer les dimensions exactes du sprite sheet
            this.frameWidth = this.sprite.naturalWidth / 6; // 6 colonnes
            this.frameHeight = this.sprite.naturalHeight / 8; // 8 lignes
            
            // Définir les lignes d'animation disponibles
            this.animationTypes = {
                idle: 0,           // Ligne 0: Position au repos
                walk: 1,           // Ligne 1: Animation de marche
                attack1: 2,        // Ligne 2: Première attaque (coup d'épée)
                attack2: 3,        // Ligne 3: Deuxième attaque (effet slash)
                attack3: 4,        // Ligne 4: Troisième attaque 
                guard: 5,          // Ligne 5: Position défensive
                special1: 6,       // Ligne 6: Attaque spéciale 1
                special2: 7        // Ligne 7: Attaque spéciale 2
            };
            
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
            // Créer une formation plus espacée
            let offsetX, offsetY;
            
            if (maxSoldiers <= 3) {
                // Formation en ligne pour 1-3 soldats avec encore plus d'espacement
                offsetX = (i - (maxSoldiers - 1) / 2) * 20;
                offsetY = 0;
            } else if (maxSoldiers <= 6) {
                // Formation en double ligne pour 4-6 soldats
                const row = Math.floor(i / 3);
                const col = i % 3;
                offsetX = (col - 1) * 20;
                offsetY = row * 18;
            } else {
                // Formation en triangle élargi pour 7+ soldats
                const row = Math.floor(Math.sqrt(i));
                const posInRow = i - row * row;
                const rowWidth = row * 2 + 1;
                
                offsetX = (posInRow - row) * 16; // Encore plus d'espacement horizontal
                offsetY = row * 18; // Encore plus d'espacement vertical
            }
            
            this.soldiers.push({
                offsetX: offsetX,
                offsetY: offsetY,
                animOffset: Math.random() * this.frameCount, // Variation d'animation
                combatStyle: Math.floor(Math.random() * 4), // Style de combat individuel (0-3)
                combatTiming: Math.random() * 0.5 + 0.75 // Timing individuel (75%-125%)
            });
        }
    }
    
    calculateDirection() {
        if (this.isFighting) {
            // En combat, utiliser différentes animations d'attaque
            const now = Date.now();
            const combatTime = now - this.fightStartTime;
            
            // Séquence d'animations de combat variées
            if (combatTime < 1000) {
                // Première seconde: attaque rapide
                return this.animationTypes?.attack1 || 2;
            } else if (combatTime < 2000) {
                // Deuxième seconde: attaque avec effets
                return this.animationTypes?.attack2 || 3;
            } else if (combatTime < 3000) {
                // Troisième seconde: attaque puissante
                return this.animationTypes?.attack3 || 4;
            } else {
                // Dernière seconde: attaque spéciale finale
                return this.animationTypes?.special1 || 6;
            }
        } else {
            // En déplacement, calculer la direction du mouvement pour orienter les sprites
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            
            // Déterminer si on va vers la gauche ou la droite
            this.facingLeft = dx < 0;
            
            // Utiliser l'animation de marche
            return this.animationTypes?.walk || 1;
        }
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

        if (distance < 5 && !this.hasReachedTarget) {
            // Arrivé à destination
            this.hasReachedTarget = true;
            this.progress = 1;
            
            // Vérifier s'il y a déjà un combat en cours sur ce bâtiment
            const existingCombat = game.unitGroups.find(group => 
                group !== this && 
                group.isFighting && 
                group.target === this.target
            );
            
            // Si c'est un renfort allié qui arrive
            if (this.target.owner === this.owner) {
                if (existingCombat && existingCombat.owner !== this.owner) {
                    // Il y a un combat en cours contre un ennemi
                    // Les renforts rentrent dans la ville pour défendre
                    this.enterCityAsReinforcement();
                    return false; // Supprimer ce groupe
                } else {
                    // Pas de combat, renforcement normal
                    this.target.units += this.units;
                    if (this.target.units > this.target.maxUnits) {
                        this.target.units = this.target.maxUnits;
                    }
                    return false; // Supprimer ce groupe
                }
            } else if (existingCombat && existingCombat.owner === this.owner) {
                // Rejoindre le combat existant comme renfort attaquant
                this.joinExistingCombat(existingCombat);
                return false; // Supprimer ce groupe car il fusionne
            } else if (existingCombat && existingCombat.owner !== this.owner) {
                // Combat multi-joueurs: attendre ou participer
                if (this.target.owner !== this.owner && this.target.owner !== 'neutral') {
                    // Rejoindre le combat contre l'ennemi commun
                    this.startMultiPlayerCombat(existingCombat);
                } else {
                    // Attendre que le combat en cours se termine
                    this.waitingForCombat = true;
                    this.x = this.target.x + (Math.random() - 0.5) * 100;
                    this.y = this.target.y + (Math.random() - 0.5) * 100;
                }
            } else {
                // Commencer un nouveau combat
                this.isFighting = true;
                this.fightStartTime = now;
                this.positionAroundBuilding();
            }
        }
        
        // Gérer l'attente d'un combat
        if (this.waitingForCombat) {
            const existingCombat = game.unitGroups.find(group => 
                group !== this && 
                group.isFighting && 
                group.target === this.target
            );
            
            if (!existingCombat) {
                // Le combat est terminé, on peut commencer le nôtre
                this.waitingForCombat = false;
                this.isFighting = true;
                this.fightStartTime = now;
                this.positionAroundBuilding();
            } else if (existingCombat.owner === this.owner) {
                // C'est un allié, on peut rejoindre
                this.joinExistingCombat(existingCombat);
                return false;
            }
            // Sinon on continue d'attendre
            return true;
        }
        
        // Gérer la phase de combat
        if (this.isFighting) {
            const fightElapsed = now - this.fightStartTime;
            
            // Gérer les renforts qui arrivent pendant le combat
            this.checkForReinforcements();
            
            // Vérifier si le combat est terminé par KO ou par temps
            if (this.combatResult || fightElapsed >= this.fightDuration) {
                // Combat terminé
                this.isFighting = false; // Arrêter les effets visuels
                this.attack();
                
                // Déclencher les combats en attente
                this.triggerWaitingCombats();
                
                return false; // Supprimer ce groupe
            } else {
                // Continuer le combat
                this.updateCombatAnimation();
                return true; // Rester en combat
            }
        }

        // Déplacer vers la cible
        this.x += (dx / distance) * this.speed * deltaTime;
        this.y += (dy / distance) * this.speed * deltaTime;
        
        // Mettre à jour la progression (pour synchronisation)
        if (this.totalDistance > 0) {
            const distanceFromSource = Math.sqrt(
                (this.x - this.source.x) ** 2 + (this.y - this.source.y) ** 2
            );
            this.progress = Math.min(1, distanceFromSource / this.totalDistance);
        }
        
        // Mettre à jour l'animation
        this.animationRow = this.calculateDirection();
        this.updateAnimation();
        
        // Recréer la formation si le nombre d'unités a changé
        if (this.soldiers.length !== Math.min(this.units, 10)) {
            this.createSoldierFormation();
        }
        
        return true; // Continuer à exister
    }
    
    positionAroundBuilding() {
        // Repositionner les soldats en cercle autour du bâtiment pour le combat
        const centerX = this.target.x;
        const centerY = this.target.y;
        const radius = 60; // Distance autour du bâtiment
        
        this.soldiers.forEach((soldier, index) => {
            const angle = (index / this.soldiers.length) * Math.PI * 2;
            const offsetRadius = radius + Math.random() * 20; // Variation de distance
            
            soldier.offsetX = Math.cos(angle) * offsetRadius;
            soldier.offsetY = Math.sin(angle) * offsetRadius;
        });
        
        // Positionner le centre du groupe près du bâtiment
        this.x = centerX + (Math.random() - 0.5) * 40;
        this.y = centerY + (Math.random() - 0.5) * 40;
        
        // Créer les effets de combat sur le bâtiment
        this.createCombatEffects();
        
        // Créer les défenseurs qui sortent du bâtiment
        this.createDefenders();
        
        // Initialiser le système de dés de combat
        this.initializeCombatDice();
        
        // Calculer la durée totale du combat
        const totalCombatants = this.units + this.target.units;
        this.fightDuration = totalCombatants * 500; // 500ms par combattant
    }
    
    createCombatEffects() {
        const buildingSize = this.getBuildingSize();
        const effectScale = buildingSize / 80; // Proportionnel à la taille du bâtiment
        
        // Créer seulement 2 feux SUR le bâtiment pour plus de lisibilité
        const fireCount = 2; // Fixé à 2 feux maximum
        for (let i = 0; i < fireCount; i++) {
            // Positions aléatoires sur le bâtiment
            const offsetX = (Math.random() - 0.5) * buildingSize * 0.6;
            const offsetY = (Math.random() - 0.5) * buildingSize * 0.6;
            
            this.combatEffects.fires.push({
                x: this.target.x + offsetX,
                y: this.target.y + offsetY,
                size: (16 + Math.random() * 8) * effectScale,
                currentFrame: Math.floor(Math.random() * 7),
                frameCount: 7,
                animationSpeed: 150 + Math.random() * 100,
                lastFrameTime: Date.now()
            });
        }
        
        // Initialiser le timing des explosions - moins fréquentes
        this.lastExplosionTime = Date.now();
        this.explosionInterval = 2000; // Une explosion toutes les 2 secondes minimum
    }
    
    createExplosionEffect() {
        const buildingSize = this.getBuildingSize();
        const effectScale = buildingSize / 80;
        
        // Explosion sur le bâtiment
        this.combatEffects.explosions.push({
            x: this.target.x + (Math.random() - 0.5) * buildingSize,
            y: this.target.y + (Math.random() - 0.5) * buildingSize,
            size: (20 + Math.random() * 15) * effectScale,
            currentFrame: 0,
            frameCount: 8,
            animationSpeed: 80,
            lastFrameTime: Date.now(),
            isActive: true
        });
    }
    
    getBuildingSize() {
        // Estimer la taille du bâtiment selon son type
        const buildingType = this.target.getBuildingType ? this.target.getBuildingType() : 'house1';
        switch(buildingType) {
            case 'house1': return 50;
            case 'house2': return 60;
            case 'house3': return 70;
            case 'tower': return 80;
            case 'castle': return 100;
            default: return 60;
        }
    }
    
    enterCityAsReinforcement() {
        // Les unités rentrent dans la ville pour défendre
        this.target.units += this.units;
        if (this.target.units > this.target.maxUnits) {
            this.target.units = this.target.maxUnits;
        }
        
        // Créer un effet visuel d'entrée dans la ville
        this.createCityEntryEffect();
        
        // Notifier le combat en cours que des renforts sont arrivés
        const existingCombat = game.unitGroups.find(group => 
            group.isFighting && 
            group.target === this.target
        );
        
        if (existingCombat) {
            // Augmenter le nombre de dés du défenseur si nécessaire
            existingCombat.defenderReinforced = true;
            existingCombat.reinforcementArrived = Date.now();
            
            // Effet visuel pour montrer l'arrivée des renforts
            if (!existingCombat.cityReinforcementEffects) {
                existingCombat.cityReinforcementEffects = [];
            }
            existingCombat.cityReinforcementEffects.push({
                startTime: Date.now(),
                duration: 1500,
                units: this.units
            });
        }
    }
    
    createCityEntryEffect() {
        // Effet visuel des unités qui rentrent dans la ville
        if (!game.cityEntryEffects) {
            game.cityEntryEffects = [];
        }
        
        game.cityEntryEffects.push({
            x: this.x,
            y: this.y,
            targetX: this.target.x,
            targetY: this.target.y,
            startTime: Date.now(),
            duration: 800,
            units: this.units,
            owner: this.owner
        });
    }
    
    joinExistingCombat(existingCombat) {
        // Transférer les unités au groupe en combat
        existingCombat.units += this.units;
        existingCombat.reinforcements = (existingCombat.reinforcements || 0) + this.units;
        
        // Recalculer le résultat du combat avec les renforts
        if (existingCombat.combatResult) {
            existingCombat.recalculateCombatWithReinforcements();
        }
        
        // Effet visuel de renfort
        this.createReinforcementEffect(existingCombat);
    }
    
    startMultiPlayerCombat(existingCombat) {
        // Combat à 3+ joueurs - chacun s'attaque
        this.isFighting = true;
        this.fightStartTime = Date.now();
        this.multiPlayerCombat = true;
        
        // Se positionner autour du bâtiment du côté opposé
        const angle = Math.atan2(
            existingCombat.y - this.target.y,
            existingCombat.x - this.target.x
        );
        const oppositeAngle = angle + Math.PI;
        const radius = 80;
        
        this.x = this.target.x + Math.cos(oppositeAngle) * radius;
        this.y = this.target.y + Math.sin(oppositeAngle) * radius;
        
        this.positionAroundBuilding();
    }
    
    checkForReinforcements() {
        const now = Date.now();
        if (!this.lastReinforcementCheck || now - this.lastReinforcementCheck > 100) {
            this.lastReinforcementCheck = now;
            
            // Chercher des alliés qui attendent pour rejoindre le combat
            const waitingAllies = game.unitGroups.filter(group => 
                group !== this && 
                group.waitingForCombat && 
                group.target === this.target &&
                group.owner === this.owner
            );
            
            waitingAllies.forEach(ally => {
                ally.joinExistingCombat(this);
                // Marquer pour suppression
                ally.toRemove = true;
            });
        }
    }
    
    triggerWaitingCombats() {
        // Déclencher le prochain combat en attente
        const nextCombat = game.unitGroups.find(group => 
            group.waitingForCombat && 
            group.target === this.target
        );
        
        if (nextCombat) {
            nextCombat.waitingForCombat = false;
            nextCombat.isFighting = true;
            nextCombat.fightStartTime = Date.now();
            nextCombat.positionAroundBuilding();
        }
    }
    
    createReinforcementEffect(targetGroup) {
        // Créer un effet visuel simple pour montrer l'arrivée de renforts
        if (!targetGroup.reinforcementEffects) {
            targetGroup.reinforcementEffects = [];
        }
        
        targetGroup.reinforcementEffects.push({
            x: this.x,
            y: this.y,
            targetX: targetGroup.x,
            targetY: targetGroup.y,
            startTime: Date.now(),
            duration: 500
        });
    }
    
    recalculateCombatWithReinforcements() {
        // Recalculer le résultat du combat avec les unités supplémentaires
        const now = Date.now();
        const elapsedRatio = (now - this.fightStartTime) / this.fightDuration;
        
        // Ajuster le nombre d'unités restantes en fonction du temps écoulé
        const unitsToRestore = Math.floor(this.reinforcements * (1 - elapsedRatio));
        this.units += unitsToRestore;
        
        // Ajuster la durée du combat
        const additionalDuration = this.reinforcements * 300; // 300ms par unité de renfort
        this.fightDuration += additionalDuration;
        
        // Réinitialiser les pertes pour tenir compte des renforts
        if (this.combatDice) {
            this.combatDice.reinforcementsApplied = true;
        }
    }
    
    createDefenders() {
        // Créer des défenseurs qui sortent du bâtiment
        this.defenders = [];
        const defenderCount = Math.min(this.target.units, 10); // Max 10 défenseurs visibles
        const buildingSize = this.getBuildingSize();
        
        for (let i = 0; i < defenderCount; i++) {
            const angle = (i / defenderCount) * Math.PI * 2 + Math.PI; // Opposé aux attaquants
            const offsetRadius = buildingSize * 0.8 + Math.random() * 20;
            
            this.defenders.push({
                x: this.target.x + Math.cos(angle) * offsetRadius,
                y: this.target.y + Math.sin(angle) * offsetRadius,
                animOffset: Math.random() * 6,
                combatStyle: Math.floor(Math.random() * 4),
                targetSoldier: i < this.soldiers.length ? i : 0, // Cible un soldat attaquant
                isAlive: true
            });
        }
        
        // Charger le sprite des défenseurs
        this.defenderSprite = new Image();
        const defenderFolder = this.getDefenderFolder();
        this.defenderSprite.src = `./assets/Factions/Knights/Troops/Warrior/${defenderFolder}/Warrior_${defenderFolder}.png`;
    }
    
    getDefenderFolder() {
        switch(this.target.owner) {
            case 'player': return 'Blue';
            case 'enemy': return 'Red';
            case 'enemy2': return 'Purple';
            case 'enemy3': return 'Yellow';
            case 'neutral': return 'Stone';
            default: return 'Stone';
        }
    }
    
    initializeCombatDice() {
        // Système de dés de combat
        this.combatDice = {
            attackerRolls: [],
            defenderRolls: [],
            lastRollTime: Date.now(),
            rollInterval: 500, // Lancer de dés toutes les 500ms
            currentRound: 0
        };
        
        // Résultat final du combat
        this.combatResult = null;
    }
    
    updateCombatDice() {
        const now = Date.now();
        if (now - this.combatDice.lastRollTime > this.combatDice.rollInterval) {
            // Calculer le rapport de forces pour les bonus/malus
            const forceRatio = this.units / this.target.units;
            const defenderDiceCount = this.calculateDefenderDice(forceRatio);
            
            // Lancer les dés pour ce round
            const attackerRoll = Math.floor(Math.random() * 6) + 1; // 1-6
            
            // Les défenseurs lancent plusieurs dés selon leur situation
            let bestDefenderRoll = 0;
            const defenderRolls = [];
            for (let i = 0; i < defenderDiceCount; i++) {
                const roll = Math.floor(Math.random() * 6) + 1;
                defenderRolls.push(roll);
                bestDefenderRoll = Math.max(bestDefenderRoll, roll);
            }
            
            this.combatDice.attackerRolls.push(attackerRoll);
            this.combatDice.defenderRolls.push(bestDefenderRoll);
            
            // Stocker le nombre de dés pour l'affichage
            this.combatDice.currentDefenderDiceCount = defenderDiceCount;
            
            // Vérifier qui gagne ce round
            if (attackerRoll > bestDefenderRoll) {
                // L'attaquant gagne, un défenseur meurt
                if (this.target.units > 0) {
                    this.target.units--;
                    this.killRandomDefender();
                }
            } else {
                // Le défenseur gagne, un attaquant meurt
                if (this.units > 0) {
                    this.units--;
                    this.killRandomAttacker();
                }
            }
            
            this.combatDice.lastRollTime = now;
            this.combatDice.currentRound++;
            
            // Vérifier si le combat est terminé
            if (this.units === 0 || this.target.units === 0) {
                this.combatResult = {
                    winner: this.units > 0 ? 'attacker' : 'defender',
                    remainingUnits: Math.max(this.units, this.target.units)
                };
            }
        }
    }
    
    killRandomDefender() {
        const aliveDefenders = this.defenders.filter(d => d.isAlive);
        if (aliveDefenders.length > 0) {
            const victim = aliveDefenders[Math.floor(Math.random() * aliveDefenders.length)];
            victim.isAlive = false;
        }
    }
    
    killRandomAttacker() {
        // Réduire visuellement le nombre de soldats
        if (this.soldiers.length > 0) {
            this.soldiers.pop();
        }
    }
    
    calculateDefenderDice(forceRatio) {
        // Système réaliste de bonus/malus selon le rapport de forces
        // forceRatio = attaquants / défenseurs
        
        if (forceRatio >= 3.0) {
            // Défenseurs très en infériorité (3:1 ou plus) - Position désespérée
            return 1; // Seulement 1 dé (moral brisé, encerclés)
        } else if (forceRatio >= 2.0) {
            // Défenseurs en infériorité (2:1 à 3:1) - Difficile mais tenable
            return 2; // 2 dés (position difficile)
        } else if (forceRatio >= 1.5) {
            // Légère infériorité (1.5:1 à 2:1) - Combat standard
            return 3; // 3 dés (défense normale)
        } else if (forceRatio >= 0.75) {
            // Forces équilibrées (0.75:1 à 1.5:1) - Position forte
            return 4; // 4 dés (bonne position défensive)
        } else if (forceRatio >= 0.5) {
            // Défenseurs en supériorité (0.5:1 à 0.75:1) - Avantage tactique
            return 5; // 5 dés (excellent moral, position dominante)
        } else {
            // Défenseurs en grande supériorité (moins de 0.5:1) - Forteresse imprenable
            return 6; // 6 dés maximum (moral au plus haut, tactiques parfaites)
        }
    }
    
    updateCombatAnimation() {
        const now = Date.now();
        const combatTime = now - this.fightStartTime;
        
        // Vitesse d'animation variable selon la phase de combat
        if (combatTime < 1000) {
            this.animationSpeed = 100; // Très rapide au début
        } else if (combatTime < 3000) {
            this.animationSpeed = 80;  // Encore plus rapide au milieu
        } else {
            this.animationSpeed = 120; // Plus lent pour la finition
        }
        
        // Faire bouger les soldats avec plus d'intensité selon la phase
        const intensity = combatTime < 2000 ? 4 : 2; // Plus intense au début
        
        this.soldiers.forEach((soldier, index) => {
            // Mouvement d'attaque plus prononcé
            const attackOffset = Math.sin((now + index * 300) / 100) * intensity;
            const retreatOffset = Math.cos((now + index * 200) / 120) * (intensity * 0.5);
            
            soldier.combatOffsetX = attackOffset;
            soldier.combatOffsetY = retreatOffset;
            
            // Variation individuelle pour chaque soldat
            soldier.animOffset = (soldier.animOffset + Math.random() * 0.1) % this.frameCount;
        });
        
        // Mettre à jour les effets de feu
        this.combatEffects.fires.forEach(fire => {
            if (now - fire.lastFrameTime > fire.animationSpeed) {
                fire.currentFrame = (fire.currentFrame + 1) % fire.frameCount;
                fire.lastFrameTime = now;
            }
        });
        
        // Mettre à jour le système de dés
        this.updateCombatDice();
        
        // Mettre à jour les explosions
        this.combatEffects.explosions = this.combatEffects.explosions.filter(explosion => {
            if (now - explosion.lastFrameTime > explosion.animationSpeed) {
                explosion.currentFrame++;
                explosion.lastFrameTime = now;
                
                if (explosion.currentFrame >= explosion.frameCount) {
                    return false; // Supprimer l'explosion terminée
                }
            }
            return true;
        });
        
        // Créer de nouvelles explosions très rarement
        if (Math.random() < 0.005 && this.combatEffects.explosions.length < 2) { // 0.5% de chance et max 2 explosions
            this.createExplosionEffect();
        }
    }

    attack() {
        if (this.target.owner === this.owner) {
            // Renforcer un bâtiment allié
            this.target.units += this.units;
            if (this.target.units > this.target.maxUnits) {
                this.target.units = this.target.maxUnits;
            }
        } else {
            // Combat par dés - résultat déjà calculé pendant l'animation
            if (this.combatResult) {
                if (this.combatResult.winner === 'attacker') {
                    if (this.target.units === 0) {
                        // Conquérir le bâtiment
                        this.target.owner = this.owner;
                        this.target.units = this.units;
                    }
                }
                // Les pertes ont déjà été appliquées pendant le combat
            }
        }
    }

    draw(ctx) {
        // Dessiner plusieurs soldats selon le nombre d'unités
        if (this.spriteLoaded && this.sprite && this.sprite.complete) {
            // Taille adaptative : plus gros en déplacement, plus petit en combat
            const drawSize = this.isFighting ? 34 : 67; // Grand en déplacement, petit en combat
            
            // Dessiner chaque soldat dans la formation
            this.soldiers.forEach((soldier, index) => {
                // Frame d'animation avec variation pour chaque soldat
                let frame = (this.currentFrame + Math.floor(soldier.animOffset)) % this.frameCount;
                let animRow = this.animationRow;
                
                // En combat, varier les animations selon le style individuel
                if (this.isFighting && soldier.combatStyle !== undefined) {
                    // Chaque soldat utilise un style d'attaque différent
                    switch (soldier.combatStyle) {
                        case 0: animRow = this.animationTypes?.attack1 || 2; break;
                        case 1: animRow = this.animationTypes?.attack2 || 3; break;
                        case 2: animRow = this.animationTypes?.attack3 || 4; break;
                        case 3: animRow = this.animationTypes?.special1 || 6; break;
                    }
                    
                    // Animation complète d'épée pour chaque soldat
                    if (soldier.combatTiming) {
                        // Calculer le frame selon le temps écoulé depuis le début du combat
                        const combatElapsed = Date.now() - this.fightStartTime;
                        const cycleTime = 1000; // 1 seconde par cycle d'animation complète
                        const progress = (combatElapsed / cycleTime) % 1;
                        frame = Math.floor(progress * this.frameCount);
                    }
                }
                
                const srcX = frame * this.frameWidth;
                const srcY = animRow * this.frameHeight;
                
                // Position du soldat avec offset de combat si applicable
                const combatOffsetX = soldier.combatOffsetX || 0;
                const combatOffsetY = soldier.combatOffsetY || 0;
                const soldierX = this.x + soldier.offsetX + combatOffsetX;
                const soldierY = this.y + soldier.offsetY + combatOffsetY;
                
                // Sauvegarder le contexte pour la transformation
                ctx.save();
                
                // Si on va vers la gauche, retourner le sprite horizontalement
                if (this.facingLeft) {
                    ctx.translate(soldierX, soldierY);
                    ctx.scale(-1, 1); // Miroir horizontal
                    ctx.translate(-soldierX, -soldierY);
                }
                
                // Dessiner le soldat
                ctx.drawImage(
                    this.sprite,
                    srcX, srcY, this.frameWidth, this.frameHeight, // Source
                    soldierX - drawSize/2, soldierY - drawSize/2, drawSize, drawSize // Destination
                );
                
                // Restaurer le contexte
                ctx.restore();
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
        
        // Indicateur de combat ou d'attente
        if (this.isFighting) {
            const now = Date.now();
            
            // Barre de progression du combat sur le panneau principal uniquement
            const totalDuration = this.fightDuration || 4000;
            const combatProgress = Math.min(1, (now - this.fightStartTime) / totalDuration);
            
            // Barre de progression simplifiée au-dessus du groupe
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(this.x - 30, this.y - 50, 60, 8);
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(this.x - 30, this.y - 50, 60, 8);
            
            ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
            ctx.fillRect(this.x - 30, this.y - 50, 60 * (1 - combatProgress), 8);
            
            // Bordure de la barre
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - 30, this.y - 50, 60, 8);
        } else if (this.waitingForCombat) {
            // Indicateur d'attente de combat
            ctx.save();
            ctx.fillStyle = 'rgba(255, 165, 0, 0.9)'; // Orange pour l'attente
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('EN ATTENTE', this.x, this.y - 45);
            
            // Animation de points d'attente
            const dots = Math.floor(Date.now() / 500) % 4;
            let dotsText = '';
            for (let i = 0; i < dots; i++) {
                dotsText += '•';
            }
            ctx.font = 'bold 20px Arial';
            ctx.fillText(dotsText, this.x, this.y - 25);
            ctx.restore();
        }
        
        // Dessiner les effets de combat
        this.drawCombatEffects(ctx);
        
        // Dessiner les défenseurs en combat
        this.drawDefenders(ctx);
        
        // Dessiner les dés de combat
        this.drawCombatDice(ctx);
        
        // Dessiner les effets de renfort
        this.drawReinforcementEffects(ctx);
        
        // Dessiner les effets de renforts de ville
        this.drawCityReinforcementEffects(ctx);
    }
    
    drawCombatEffects(ctx) {
        if (!this.isFighting) return;
        
        // Dessiner les dégâts sur le bâtiment (petits points)
        this.drawBuildingDamage(ctx);
        
        // Dessiner les feux
        if (this.effectSprites.fire && this.effectSprites.fire.complete) {
            const fireFrameWidth = this.effectSprites.fire.naturalWidth / 7; // 7 frames
            const fireFrameHeight = this.effectSprites.fire.naturalHeight;
            
            this.combatEffects.fires.forEach(fire => {
                const srcX = fire.currentFrame * fireFrameWidth;
                const srcY = 0;
                
                ctx.drawImage(
                    this.effectSprites.fire,
                    srcX, srcY, fireFrameWidth, fireFrameHeight,
                    fire.x - fire.size/2, fire.y - fire.size/2,
                    fire.size, fire.size
                );
            });
        }
        
        // Dessiner les explosions
        if (this.effectSprites.explosion && this.effectSprites.explosion.complete) {
            const explosionFrameWidth = this.effectSprites.explosion.naturalWidth / 8; // 8 frames
            const explosionFrameHeight = this.effectSprites.explosion.naturalHeight;
            
            this.combatEffects.explosions.forEach(explosion => {
                if (explosion.isActive) {
                    const srcX = explosion.currentFrame * explosionFrameWidth;
                    const srcY = 0;
                    
                    ctx.drawImage(
                        this.effectSprites.explosion,
                        srcX, srcY, explosionFrameWidth, explosionFrameHeight,
                        explosion.x - explosion.size/2, explosion.y - explosion.size/2,
                        explosion.size, explosion.size
                    );
                }
            });
        }
        
        // Fallback si les sprites ne sont pas chargés
        if (!this.effectSprites.fire || !this.effectSprites.fire.complete) {
            this.combatEffects.fires.forEach(fire => {
                // Feu de fallback
                ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, 0.8)`;
                ctx.beginPath();
                ctx.arc(fire.x, fire.y, fire.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        if (!this.effectSprites.explosion || !this.effectSprites.explosion.complete) {
            this.combatEffects.explosions.forEach(explosion => {
                // Explosion de fallback
                const alpha = 1 - (explosion.currentFrame / explosion.frameCount);
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, explosion.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
    
    drawDefenders(ctx) {
        if (!this.isFighting || !this.defenders) return;
        
        const drawSize = 34; // Même taille que les attaquants en combat
        
        // Dessiner chaque défenseur vivant
        this.defenders.forEach((defender, index) => {
            if (!defender.isAlive) return;
            
            // Utiliser le sprite du défenseur s'il est chargé
            if (this.defenderSprite && this.defenderSprite.complete) {
                // Animation de combat pour les défenseurs
                const frame = Math.floor((Date.now() / 100 + index) % 6);
                const animRow = this.animationTypes?.attack1 || 2; // Animation d'attaque
                
                const srcX = frame * (this.defenderSprite.naturalWidth / 6);
                const srcY = animRow * (this.defenderSprite.naturalHeight / 8);
                const frameWidth = this.defenderSprite.naturalWidth / 6;
                const frameHeight = this.defenderSprite.naturalHeight / 8;
                
                ctx.save();
                
                // Faire face aux attaquants
                const dx = this.x - defender.x;
                if (dx < 0) {
                    ctx.translate(defender.x, defender.y);
                    ctx.scale(-1, 1);
                    ctx.translate(-defender.x, -defender.y);
                }
                
                ctx.drawImage(
                    this.defenderSprite,
                    srcX, srcY, frameWidth, frameHeight,
                    defender.x - drawSize/2, defender.y - drawSize/2,
                    drawSize, drawSize
                );
                
                ctx.restore();
            } else {
                // Fallback pour les défenseurs
                ctx.beginPath();
                ctx.arc(defender.x, defender.y, drawSize/3, 0, Math.PI * 2);
                ctx.fillStyle = this.getDefenderColor();
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    getDefenderColor() {
        switch(this.target.owner) {
            case 'player': return '#2196F3';
            case 'enemy': return '#F44336';
            case 'enemy2': return '#9C27B0';
            case 'enemy3': return '#FFC107';
            case 'neutral': return '#9E9E9E';
            default: return '#9E9E9E';
        }
    }
    
    drawBuildingDamage(ctx) {
        // Pas de points de dégâts, seulement les feux et explosions pour plus de lisibilité
        // Cette méthode est conservée mais vide pour ne pas casser l'interface
    }
    
    drawCombatDice(ctx) {
        if (!this.isFighting || !this.combatDice) return;
        
        // Mode minimal si le panneau est réduit
        if (this.combatPanelMinimized) {
            this.drawMinimalCombatInfo(ctx);
            return;
        }
        
        // Panneau d'information centralisé au-dessus du bâtiment
        let panelY = this.combatPanelY || (this.target.y - 140);
        const panelX = this.target.x;
        const panelWidth = 300;
        const panelHeight = 110;
        
        // Vérifier si le panneau dépasse du haut de la map
        if (panelY - panelHeight/2 < 10) {
            // Placer en dessous du bâtiment
            panelY = this.target.y + 140;
        }
        
        // Fond du panneau avec effet de flou
        ctx.save();
        
        // Effet de flou simulé avec plusieurs couches transparentes
        for (let i = 3; i > 0; i--) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.2 / i})`;
            const offset = i * 3;
            ctx.fillRect(
                panelX - panelWidth/2 - offset, 
                panelY - panelHeight/2 - offset, 
                panelWidth + offset * 2, 
                panelHeight + offset * 2
            );
        }
        
        // Créer un chemin avec bordures arrondies
        const borderRadius = 20;
        const panelLeft = panelX - panelWidth/2;
        const panelTop = panelY - panelHeight/2;
        
        ctx.beginPath();
        ctx.moveTo(panelLeft + borderRadius, panelTop);
        ctx.lineTo(panelLeft + panelWidth - borderRadius, panelTop);
        ctx.quadraticCurveTo(panelLeft + panelWidth, panelTop, panelLeft + panelWidth, panelTop + borderRadius);
        ctx.lineTo(panelLeft + panelWidth, panelTop + panelHeight - borderRadius);
        ctx.quadraticCurveTo(panelLeft + panelWidth, panelTop + panelHeight, panelLeft + panelWidth - borderRadius, panelTop + panelHeight);
        ctx.lineTo(panelLeft + borderRadius, panelTop + panelHeight);
        ctx.quadraticCurveTo(panelLeft, panelTop + panelHeight, panelLeft, panelTop + panelHeight - borderRadius);
        ctx.lineTo(panelLeft, panelTop + borderRadius);
        ctx.quadraticCurveTo(panelLeft, panelTop, panelLeft + borderRadius, panelTop);
        ctx.closePath();
        
        // Fond principal semi-transparent
        ctx.fillStyle = 'rgba(20, 20, 30, 0.6)';
        ctx.fill();
        
        // Bordure avec lueur
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Bouton de réduction (X) dans le coin supérieur droit
        const closeX = panelX + panelWidth/2 - 15;
        const closeY = panelY - panelHeight/2 + 15;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(closeX, closeY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(closeX - 4, closeY - 4);
        ctx.lineTo(closeX + 4, closeY + 4);
        ctx.moveTo(closeX + 4, closeY - 4);
        ctx.lineTo(closeX - 4, closeY + 4);
        ctx.stroke();
        
        // Stocker la position du bouton pour la détection de clic
        this.closeButtonBounds = {
            x: closeX - 8,
            y: closeY - 8,
            width: 16,
            height: 16
        };
        
        // Titre du combat avec phrase dynamique
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        const battlePhrase = this.getBattlePhrase();
        ctx.fillStyle = '#FFD700';
        ctx.fillText(battlePhrase, panelX, panelY - 40);
        
        if (this.combatDice.attackerRolls.length > 0) {
            const lastAttackerRoll = this.combatDice.attackerRolls[this.combatDice.attackerRolls.length - 1];
            const lastDefenderRoll = this.combatDice.defenderRolls[this.combatDice.defenderRolls.length - 1];
            const diceCount = this.combatDice.currentDefenderDiceCount || 3;
            
            // Section Attaquant (gauche)
            const attackerX = panelX - 110;
            ctx.textAlign = 'center';
            
            // Type et nombre d'unités
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = this.getOwnerColor(this.owner);
            ctx.fillText(this.getOwnerName(this.owner), attackerX, panelY - 18);
            
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(`${this.units} unités`, attackerX, panelY + 2);
            
            // Dé de l'attaquant
            const diceSize = 32;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(attackerX - diceSize/2, panelY + 15, diceSize, diceSize);
            ctx.strokeStyle = lastAttackerRoll > lastDefenderRoll ? '#4CAF50' : '#F44336';
            ctx.lineWidth = 3;
            ctx.strokeRect(attackerX - diceSize/2, panelY + 15, diceSize, diceSize);
            
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(lastAttackerRoll.toString(), attackerX, panelY + 35);
            
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText('1D6', attackerX, panelY + 13);
            
            // VS au centre
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('VS', panelX, panelY + 30);
            
            // Section Défenseur (droite)
            const defenderX = panelX + 110;
            
            // Type et nombre d'unités
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = this.getOwnerColor(this.target.owner);
            ctx.fillText(this.getOwnerName(this.target.owner), defenderX, panelY - 18);
            
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(`${this.target.units} unités`, defenderX, panelY + 2);
            
            // Dé du défenseur
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(defenderX - diceSize/2, panelY + 15, diceSize, diceSize);
            ctx.strokeStyle = lastDefenderRoll >= lastAttackerRoll ? '#4CAF50' : '#F44336';
            ctx.lineWidth = 3;
            ctx.strokeRect(defenderX - diceSize/2, panelY + 15, diceSize, diceSize);
            
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(lastDefenderRoll.toString(), defenderX, panelY + 35);
            
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`${diceCount}D6`, defenderX, panelY + 13);
            
            // Informations supplémentaires en bas
            ctx.font = 'bold 12px Arial';
            const forceRatio = (this.units / this.target.units).toFixed(1);
            ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
            ctx.fillText(`Rapport de force: ${forceRatio}:1`, panelX, panelY + 55);
            
            // Renforts si présents
            if (this.reinforcements > 0) {
                ctx.fillStyle = '#4CAF50';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(`+${this.reinforcements} renforts arrivés!`, panelX, panelY + 70);
            }
        }
        
        ctx.restore();
    }
    
    getBattlePhrase() {
        const phrases = [
            "BATAILLE ACHARNÉE!",
            "COMBAT INTENSE!",
            "AFFRONTEMENT ÉPIQUE!",
            "LUTTE SANS MERCI!",
            "DUEL DÉCISIF!"
        ];
        
        // Phrases spéciales selon la situation
        const diceCount = this.combatDice?.currentDefenderDiceCount || 3;
        const forceRatio = this.units / this.target.units;
        
        if (diceCount <= 2) {
            return "SIÈGE DÉSESPÉRÉ!";
        } else if (diceCount >= 5) {
            return "DÉFENSE HÉROÏQUE!";
        } else if (forceRatio > 3) {
            return "ASSAUT ÉCRASANT!";
        } else if (forceRatio < 0.3) {
            return "COURAGE INSENSÉ!";
        } else if (this.reinforcements > 0) {
            return "RENFORTS AU COMBAT!";
        }
        
        // Phrase aléatoire par défaut
        const index = Math.floor((Date.now() / 2000) % phrases.length);
        return phrases[index];
    }
    
    getOwnerColor(owner) {
        switch(owner) {
            case 'player': return '#2196F3';
            case 'enemy': return '#F44336';
            case 'enemy2': return '#9C27B0';
            case 'enemy3': return '#FF9800';
            case 'neutral': return '#9E9E9E';
            default: return '#FFFFFF';
        }
    }
    
    getOwnerName(owner) {
        switch(owner) {
            case 'player': return 'JOUEUR';
            case 'enemy': return 'ENNEMI ROUGE';
            case 'enemy2': return 'ENNEMI VIOLET';
            case 'enemy3': return 'ENNEMI ORANGE';
            case 'neutral': return 'NEUTRE';
            default: return 'INCONNU';
        }
    }
    
    drawMinimalCombatInfo(ctx) {
        // Mode minimal : juste les dés et les unités
        let panelY = this.combatPanelY || (this.target.y - 100);
        const panelX = this.target.x;
        const panelWidth = 140;
        const panelHeight = 40;
        
        // Vérifier si le panneau dépasse du haut de la map
        if (panelY - panelHeight/2 < 10) {
            // Placer en dessous du bâtiment
            panelY = this.target.y + 100;
        }
        
        if (!this.combatDice.attackerRolls.length) return;
        
        const lastAttackerRoll = this.combatDice.attackerRolls[this.combatDice.attackerRolls.length - 1];
        const lastDefenderRoll = this.combatDice.defenderRolls[this.combatDice.defenderRolls.length - 1];
        
        // Fond minimal semi-transparent avec bordures arrondies
        ctx.save();
        
        // Créer un chemin avec bordures arrondies
        const borderRadius = 15;
        const panelLeft = panelX - panelWidth/2;
        const panelTop = panelY - panelHeight/2;
        
        ctx.beginPath();
        ctx.moveTo(panelLeft + borderRadius, panelTop);
        ctx.lineTo(panelLeft + panelWidth - borderRadius, panelTop);
        ctx.quadraticCurveTo(panelLeft + panelWidth, panelTop, panelLeft + panelWidth, panelTop + borderRadius);
        ctx.lineTo(panelLeft + panelWidth, panelTop + panelHeight - borderRadius);
        ctx.quadraticCurveTo(panelLeft + panelWidth, panelTop + panelHeight, panelLeft + panelWidth - borderRadius, panelTop + panelHeight);
        ctx.lineTo(panelLeft + borderRadius, panelTop + panelHeight);
        ctx.quadraticCurveTo(panelLeft, panelTop + panelHeight, panelLeft, panelTop + panelHeight - borderRadius);
        ctx.lineTo(panelLeft, panelTop + borderRadius);
        ctx.quadraticCurveTo(panelLeft, panelTop, panelLeft + borderRadius, panelTop);
        ctx.closePath();
        
        // Remplir avec transparence
        ctx.fillStyle = 'rgba(20, 20, 30, 0.5)';
        ctx.fill();
        
        // Bordure subtile
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Bouton pour ré-ouvrir
        const expandX = panelX + panelWidth/2 - 12;
        const expandY = panelY;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(expandX, expandY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(expandX - 3, expandY);
        ctx.lineTo(expandX + 3, expandY);
        ctx.moveTo(expandX, expandY - 3);
        ctx.lineTo(expandX, expandY + 3);
        ctx.stroke();
        
        // Stocker la position du bouton d'expansion
        this.expandButtonBounds = {
            x: panelX + panelWidth/2 - 18,
            y: panelY - 6,
            width: 12,
            height: 12
        };
        
        // Dés minimalistes avec police plus grande
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px Arial';
        
        // Attaquant
        ctx.fillStyle = lastAttackerRoll > lastDefenderRoll ? '#4CAF50' : '#F44336';
        ctx.fillText(lastAttackerRoll, panelX - 40, panelY + 6);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${this.units}`, panelX - 40, panelY - 10);
        
        // VS
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('vs', panelX, panelY + 4);
        
        // Défenseur
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = lastDefenderRoll >= lastAttackerRoll ? '#4CAF50' : '#F44336';
        ctx.fillText(lastDefenderRoll, panelX + 40, panelY + 6);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${this.target.units}`, panelX + 40, panelY - 10);
        
        ctx.restore();
    }
    
    drawReinforcementEffects(ctx) {
        if (!this.reinforcementEffects || this.reinforcementEffects.length === 0) return;
        
        const now = Date.now();
        
        // Filtrer et dessiner les effets actifs
        this.reinforcementEffects = this.reinforcementEffects.filter(effect => {
            const elapsed = now - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1) return false; // Effet terminé
            
            // Interpoler la position
            const x = effect.x + (effect.targetX - effect.x) * progress;
            const y = effect.y + (effect.targetY - effect.y) * progress;
            const opacity = 1 - progress;
            
            // Dessiner l'effet
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#4CAF50';
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 2;
            
            // Flèche indiquant l'arrivée de renforts
            ctx.beginPath();
            ctx.moveTo(x - 10, y);
            ctx.lineTo(x + 10, y);
            ctx.lineTo(x + 5, y - 5);
            ctx.moveTo(x + 10, y);
            ctx.lineTo(x + 5, y + 5);
            ctx.stroke();
            
            ctx.font = 'bold 14px Arial';
            ctx.fillText('+', x - 15, y + 5);
            
            ctx.restore();
            
            return true; // Continuer à afficher
        });
    }
    
    drawCityReinforcementEffects(ctx) {
        if (!this.cityReinforcementEffects || this.cityReinforcementEffects.length === 0) return;
        
        const now = Date.now();
        
        // Filtrer et dessiner les effets actifs
        this.cityReinforcementEffects = this.cityReinforcementEffects.filter(effect => {
            const elapsed = now - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1) return false; // Effet terminé
            
            // Effet visuel de renfort arrivé dans la ville
            ctx.save();
            ctx.globalAlpha = 1 - progress * 0.5;
            
            // Texte indiquant l'arrivée de renforts
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#4CAF50';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            
            const textY = this.target.y - 80 - (progress * 30);
            const text = `+${effect.units} RENFORTS!`;
            
            ctx.strokeText(text, this.target.x, textY);
            ctx.fillText(text, this.target.x, textY);
            
            // Effet de cercle qui s'agrandit
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3 - (progress * 2);
            ctx.beginPath();
            ctx.arc(this.target.x, this.target.y, 40 + (progress * 40), 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
            
            return true; // Continuer à afficher
        });
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
        this.initializeMultiplayer();
    }
    
    getPlayerOwner(index) {
        const owners = ['player', 'enemy', 'enemy2', 'enemy3'];
        return owners[index] || 'enemy';
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
        
        // Minimum 1600x1000 pour plus d'espace
        canvasWidth = Math.max(canvasWidth, 1600);
        canvasHeight = Math.max(canvasHeight, 1000);
        
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
                        building.sendUnits(this.targetBuilding, this.sendPercentage);
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
        this.buildings.forEach(building => building.update());
        
        // Mettre à jour les groupes d'unités
        this.unitGroups = this.unitGroups.filter(group => {
            // Supprimer les groupes marqués pour suppression
            if (group.toRemove) return false;
            return group.update();
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
        const targetDefense = target.units + (target.owner !== 'neutral' ? Math.floor(target.units * 0.2) : 0); // Bonus défensif
        
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
            source.sendUnits(target, this.aiSettings.attackPercentage);
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
                building.sendUnits(mainTarget, this.aiSettings.attackPercentage);
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
        this.initBuildings();
        this.gameLoop();
    }
    
    backToMenu() {
        this.gameStarted = false;
        this.gameOver = false;
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
        this.buildings = [];
        this.unitGroups = [];
        this.selectedBuildings = [];
        this.targetBuilding = null;
    }
    
    setupMenuListeners() {
        const startBtn = document.getElementById('startGameBtn');
        const menuScreen = document.getElementById('menuScreen');
        const gameContainer = document.getElementById('gameContainer');
        const playerCountSelect = document.getElementById('playerCount');
        const difficultySelect = document.getElementById('aiDifficulty');
        const gameModeSelect = document.getElementById('gameMode');
        const roomCodeInput = document.getElementById('roomCode');
        
        startBtn.addEventListener('click', () => {
            const gameMode = gameModeSelect.value;
            const playerCount = parseInt(playerCountSelect.value);
            this.aiDifficulty = difficultySelect.value;
            this.aiSettings = this.getAISettings();
            
            if (gameMode === 'local') {
                // Mode local classique
                this.isMultiplayer = false;
                
                // Masquer le menu et afficher le jeu
                menuScreen.style.display = 'none';
                gameContainer.style.display = 'flex';
                
                // Démarrer le jeu avec le nombre de joueurs sélectionné
                this.startGame(playerCount);
                
                // Démarrer la musique de fond
                setTimeout(() => this.startBackgroundMusic(), 500);
                
            } else if (gameMode === 'host') {
                // Créer une partie multijoueur - aller d'abord au lobby
                this.isMultiplayer = true;
                this.multiplayerManager.isHost = true;
                this.multiplayerManager.setupHostMode();
                
                // Le lobby sera affiché automatiquement après l'initialisation
                
            } else if (gameMode === 'join') {
                // Rejoindre une partie multijoueur - aller au lobby
                const roomCode = roomCodeInput.value.trim();
                if (roomCode) {
                    this.isMultiplayer = true;
                    
                    if (this.multiplayerManager.connectToHost(roomCode)) {
                        // La connexion et le lobby seront gérés automatiquement
                        console.log('Tentative de connexion...');
                    }
                } else {
                    alert('Veuillez entrer un code de partie valide');
                }
            }
        });
        
        const backBtn = document.getElementById('backToMenuBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.backToMenu();
            });
        }
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
        // Créer l'élément audio pour la musique de fond
        this.backgroundMusic = new Audio('./assets/main.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3; // Volume modéré
        
        // Gérer les erreurs de chargement
        this.backgroundMusic.onerror = () => {
            console.log('Impossible de charger la musique de fond');
        };
        
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
            musicBtn.textContent = this.musicEnabled ? '🔊' : '🔇';
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
        this.multiplayerManager = new MultiplayerManager(this);
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
            sourceBuilding.sendUnits(targetBuilding, action.percentage);
            
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
        console.log('Chargement de l\'\u00e9tat de jeu depuis le r\u00e9seau:', gameState);
        
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
        
        console.log('\u00c9tat charg\u00e9 - B\u00e2timents:', this.buildings.length, 'Unit\u00e9s:', this.unitGroups.length);
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

// Démarrer le jeu
let game;
window.addEventListener('load', () => {
    game = new Game();
    game.gameLoop();
});