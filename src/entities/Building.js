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

    update(isUnderSiege = false) {
        // Le paramètre isUnderSiege est maintenant passé depuis Game.js
        
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
        // Cette méthode sera appelée depuis Game.js avec le contexte approprié
        return false; // Par défaut, pas de siège
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
        
        // Afficher le type de bâtiment (debug) - DISABLED
        // ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        // ctx.font = '10px Arial';
        // ctx.fillText(buildingType, this.x, this.y - 60);
    }

    isPointInside(x, y) {
        const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return distance <= this.radius;
    }

    sendUnits(target, percentage, gameInstance) {
        if (this.owner === 'neutral' || this.units === 0) return;
        
        const unitsToSend = Math.floor(this.units * (percentage / 100));
        if (unitsToSend > 0) {
            this.units -= unitsToSend;
            // gameInstance sera passé depuis Game.js
            if (gameInstance && gameInstance.addUnitGroup) {
                gameInstance.addUnitGroup(this, target, unitsToSend);
            }
        }
    }
}