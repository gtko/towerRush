/**
 * Web Worker pour maintenir la logique du jeu en arrière-plan
 * Utilisé quand l'onglet devient inactif pour éviter le throttling
 */

let gameState = null;
let isRunning = false;
let intervalId = null;
let lastUpdate = Date.now();

// Messages du thread principal
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            console.log('Worker initialisé');
            break;
            
        case 'start':
            console.log('Démarrage du worker de jeu');
            gameState = data.gameState;
            isRunning = true;
            startGameLoop();
            break;
            
        case 'stop':
            console.log('Arrêt du worker de jeu');
            isRunning = false;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            break;
            
        case 'update_state':
            // Recevoir les mises à jour d'état du thread principal
            gameState = data.gameState;
            break;
            
        case 'ping':
            // Test de connexion
            self.postMessage({ type: 'pong' });
            break;
            
        default:
            console.log('Message worker inconnu:', type);
    }
};

function startGameLoop() {
    if (intervalId) clearInterval(intervalId);
    
    // Boucle de jeu à 20 FPS (suffisant pour la logique en arrière-plan)
    intervalId = setInterval(() => {
        if (!isRunning || !gameState) return;
        
        const now = Date.now();
        const deltaTime = (now - lastUpdate) / 1000;
        lastUpdate = now;
        
        // Simuler les mises à jour de base
        updateGameLogic(deltaTime);
        
        // Envoyer les changements au thread principal
        self.postMessage({
            type: 'game_update',
            data: {
                timestamp: now,
                deltaTime: deltaTime,
                gameState: gameState
            }
        });
        
    }, 1000 / 20); // 20 FPS
}

function updateGameLogic(deltaTime) {
    if (!gameState) return;
    
    // Simuler la production d'unités
    if (gameState.buildings) {
        gameState.buildings.forEach(building => {
            if (building.owner !== 'neutral' && building.units < building.maxUnits) {
                const now = Date.now();
                const productionRate = building.buildingType === 'castle' ? 2 : 1;
                
                if (now - building.lastProduction > (1000 / productionRate)) {
                    building.units++;
                    building.lastProduction = now;
                }
            }
        });
    }
    
    // Simuler le mouvement des unités
    if (gameState.unitGroups) {
        gameState.unitGroups = gameState.unitGroups.filter(group => {
            if (!group.target) return false;
            
            const dx = group.target.x - group.x;
            const dy = group.target.y - group.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
                // Arrivé à destination - simuler l'attaque
                return false; // Supprimer le groupe
            }
            
            // Continuer le mouvement
            const speed = 30; // pixels par seconde
            group.x += (dx / distance) * speed * deltaTime;
            group.y += (dy / distance) * speed * deltaTime;
            
            return true;
        });
    }
}

console.log('Game Worker chargé et prêt');