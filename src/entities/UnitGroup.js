import { unitAssets, effectAssets } from '../assets-optimized.js';

export class UnitGroup {
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
        this.effectSprites.fire.src = effectAssets.fire;
        
        this.effectSprites.explosion = new Image();
        this.effectSprites.explosion.src = effectAssets.explosion;
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
        
        const assetUrl = unitAssets[this.owner];
        
        if (!assetUrl) {
            console.error(`No asset found for owner: ${this.owner}`);
            return;
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
            console.log(`Failed to load unit sprite: ${assetUrl}`);
            this.spriteLoaded = false;
        };
        
        this.sprite.src = assetUrl;
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

    update(gameInstance) {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Vérifications de sécurité
        if (this.units <= 0 && !this.isFighting) {
            console.log(`Groupe ${this.owner} avec 0 unités marqué pour suppression`);
            this.toRemove = true;
            return false;
        }
        
        if (!this.target || !gameInstance.buildings.includes(this.target)) {
            console.log(`Cible invalide pour le groupe ${this.owner}, suppression`);
            this.toRemove = true;
            return false;
        }

        // Calculer la direction vers la cible
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5 && !this.hasReachedTarget) {
            // Arrivé à destination
            this.hasReachedTarget = true;
            this.progress = 1;
            
            // Vérifier s'il y a déjà un combat en cours sur ce bâtiment
            const existingCombat = gameInstance.unitGroups.find(group => 
                group !== this && 
                group.isFighting && 
                group.target === this.target
            );
            
            // Si c'est un renfort allié qui arrive
            if (this.target.owner === this.owner) {
                if (existingCombat && existingCombat.owner !== this.owner) {
                    // Il y a un combat en cours contre un ennemi
                    // Les renforts rentrent dans la ville pour défendre
                    this.enterCityAsReinforcement(gameInstance);
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
            const existingCombat = gameInstance.unitGroups.find(group => 
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
            this.checkForReinforcements(gameInstance);
            
            // Vérifier si le combat est terminé par KO ou par temps
            // Ajouter une vérification de sécurité pour la durée de combat
            const safeDuration = this.fightDuration && this.fightDuration > 0 ? this.fightDuration : 5000;
            if (this.combatResult || fightElapsed >= safeDuration) {
                // Combat terminé
                this.isFighting = false; // Arrêter les effets visuels
                this.attack();
                
                // Déclencher les combats en attente
                this.triggerWaitingCombats(gameInstance);
                
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
        this.fightDuration = Math.max(totalCombatants * 500, 2000); // Minimum 2 secondes, 500ms par combattant
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
    
    enterCityAsReinforcement(gameInstance) {
        // Les unités rentrent dans la ville pour défendre
        this.target.units += this.units;
        if (this.target.units > this.target.maxUnits) {
            this.target.units = this.target.maxUnits;
        }
        
        // Créer un effet visuel d'entrée dans la ville
        this.createCityEntryEffect(gameInstance);
        
        // Notifier le combat en cours que des renforts sont arrivés
        const existingCombat = gameInstance.unitGroups.find(group => 
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
    
    createCityEntryEffect(gameInstance) {
        // Effet visuel des unités qui rentrent dans la ville
        if (!gameInstance.cityEntryEffects) {
            gameInstance.cityEntryEffects = [];
        }
        
        gameInstance.cityEntryEffects.push({
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
    
    checkForReinforcements(gameInstance) {
        const now = Date.now();
        if (!this.lastReinforcementCheck || now - this.lastReinforcementCheck > 100) {
            this.lastReinforcementCheck = now;
            
            // Chercher des alliés qui attendent pour rejoindre le combat
            const waitingAllies = gameInstance.unitGroups.filter(group => 
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
    
    triggerWaitingCombats(gameInstance) {
        // Déclencher le prochain combat en attente
        const nextCombat = gameInstance.unitGroups.find(group => 
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
        this.fightDuration = Math.max((this.fightDuration || 0) + additionalDuration, 2000);
        
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
            // Les attaquants lancent toujours 2 dés et prennent le meilleur
            const attackerRoll1 = Math.floor(Math.random() * 6) + 1;
            const attackerRoll2 = Math.floor(Math.random() * 6) + 1;
            const bestAttackerRoll = Math.max(attackerRoll1, attackerRoll2);
            
            // Calculer le nombre de dés pour les défenseurs (1-3 selon le nombre de défenseurs)
            const defenderDiceCount = this.calculateDefenderDice();
            
            // Les défenseurs lancent leur(s) dé(s) et prennent le meilleur
            let bestDefenderRoll = 0;
            const defenderRolls = [];
            for (let i = 0; i < defenderDiceCount; i++) {
                const roll = Math.floor(Math.random() * 6) + 1;
                defenderRolls.push(roll);
                bestDefenderRoll = Math.max(bestDefenderRoll, roll);
            }
            
            this.combatDice.attackerRolls.push(bestAttackerRoll);
            this.combatDice.defenderRolls.push(bestDefenderRoll);
            
            // Stocker le nombre de dés pour l'affichage
            this.combatDice.currentAttackerDiceCount = 2;
            this.combatDice.currentDefenderDiceCount = defenderDiceCount;
            
            // Vérifier qui gagne ce round
            if (bestAttackerRoll > bestDefenderRoll) {
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
    
    calculateDefenderDice() {
        // Système simplifié : les défenseurs ont toujours 1 dé de base
        // +1 dé s'ils ont un avantage numérique significatif
        const defenderCount = this.target.units;
        const attackerCount = this.units;
        const ratio = defenderCount / attackerCount;
        
        if (ratio >= 2.0) {
            // Défenseurs en grande supériorité numérique (2:1 ou plus)
            return 3; // Maximum 3 dés
        } else if (ratio >= 1.0) {
            // Forces équivalentes ou légère supériorité défensive
            return 2; // 2 dés
        } else {
            // Défenseurs en infériorité numérique
            return 1; // 1 seul dé
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
                        // IMPORTANT: Recharger le sprite pour la nouvelle couleur
                        this.target.loadSprite();
                        console.log(`Bâtiment conquis! Nouveau propriétaire: ${this.target.owner}`);
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
            ctx.fillText('2D6', attackerX, panelY + 13);
            
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