/**
 * Gestionnaire WebRTC pour Tower Rush
 * Utilise PeerJS pour simplifier les connexions P2P
 */

class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connections = new Map(); // playerId -> connection
        this.isHost = false;
        this.myPlayerId = null;
        this.roomCode = null;
        this.playerCount = 2;
        this.connectedPlayers = [];
        this.lobbyMessages = [];
        this.inLobby = false;
        
        this.initializePeer();
        this.setupEventListeners();
        this.setupLobbyEventListeners();
    }
    
    initializePeer() {
        // Vérifier que PeerJS est chargé
        if (typeof Peer === 'undefined') {
            console.error('PeerJS not loaded! Make sure peerjs is included before this script.');
            return;
        }
        
        // Créer un peer avec configuration améliorée
        this.peer = new Peer({
            debug: 2,
            config: {
                'iceServers': [
                    { 'urls': 'stun:stun.l.google.com:19302' },
                    { 'urls': 'stun:stun1.l.google.com:19302' },
                    { 'urls': 'stun:stun2.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            console.log('Peer initialisé avec ID:', id);
            this.myPlayerId = id;
            this.updateConnectionStatus('Prêt à se connecter');
            
            // Si on est en mode hôte et qu'on attend l'ID
            if (this.isHost && !this.roomCode) {
                this.roomCode = id;
                this.displayHostCode();
                // Afficher le lobby automatiquement pour l'hôte
                setTimeout(() => this.showLobby(), 1000);
            }
        });
        
        this.peer.on('connection', (conn) => {
            console.log('Connexion entrante de:', conn.peer);
            this.handleIncomingConnection(conn);
        });
        
        this.peer.on('error', (err) => {
            console.error('Erreur Peer:', err);
            
            // Messages d'erreur plus détaillés
            if (err.type === 'peer-unavailable') {
                this.updateConnectionStatus('Joueur introuvable');
            } else if (err.type === 'network') {
                this.updateConnectionStatus('Problème réseau');
            } else if (err.type === 'server-error') {
                this.updateConnectionStatus('Erreur serveur');
            } else {
                this.updateConnectionStatus('Erreur de connexion');
            }
        });
        
        this.peer.on('disconnected', () => {
            console.log('Peer déconnecté, tentative de reconnexion...');
            this.peer.reconnect();
        });
    }
    
    setupEventListeners() {
        // Les event listeners pour le menu sont maintenant gérés dans Game.js
        // Cette méthode reste vide pour l'instant
    }
    
    setupHostMode() {
        this.isHost = true;
        
        // Attendre que le peer soit prêt avant d'afficher le code
        if (this.peer && this.peer.id) {
            this.roomCode = this.peer.id;
            this.displayHostCode();
        } else {
            // Attendre que le peer soit connecté
            this.peer.on('open', (id) => {
                this.roomCode = id;
                this.displayHostCode();
            });
        }
    }
    
    displayHostCode() {
        const roomCodeInput = document.getElementById('roomCode');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (roomCodeInput) {
            // Afficher l'ID complet pour éviter les problèmes
            roomCodeInput.value = this.roomCode;
            roomCodeInput.readOnly = true;
        }
        
        // Copier automatiquement dans le presse-papier
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.roomCode).then(() => {
                console.log('Code copié dans le presse-papier');
                if (connectionStatus) {
                    connectionStatus.innerHTML = `<span style="color: var(--success)">✓ Code copié: ${this.roomCode}</span>`;
                    setTimeout(() => {
                        this.updateConnectionStatus('En attente de joueurs...');
                    }, 3000);
                }
            }).catch(err => {
                console.error('Erreur lors de la copie:', err);
                this.updateConnectionStatus(`Code: ${this.roomCode}`);
            });
        } else {
            this.updateConnectionStatus(`Code: ${this.roomCode}`);
        }
        
        console.log('Mode hôte activé avec le code:', this.roomCode);
    }
    
    setupJoinMode() {
        this.isHost = false;
        
        const roomCodeInput = document.getElementById('roomCode');
        
        if (roomCodeInput) {
            roomCodeInput.value = '';
            roomCodeInput.readOnly = false;
            roomCodeInput.placeholder = 'Entrez le code...';
        }
        
        this.updateConnectionStatus('Entrez le code de la partie');
    }
    
    generateRoomCode() {
        // Générer un code de 6 caractères (fonction de secours)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    connectToHost(roomCode) {
        if (!roomCode || roomCode.length < 3) {
            this.updateConnectionStatus('Code invalide');
            return false;
        }
        
        if (!this.peer || !this.peer.id) {
            this.updateConnectionStatus('En attente de l\'initialisation...');
            // Réessayer après l'initialisation
            setTimeout(() => this.connectToHost(roomCode), 1000);
            return true;
        }
        
        this.roomCode = roomCode;
        // Utiliser l'ID complet tel quel
        const hostId = roomCode.trim();
        
        this.updateConnectionStatus('Tentative de connexion...');
        console.log('Tentative de connexion au peer:', hostId);
        
        // Vérifier que l'hôte existe avant de se connecter
        this.checkPeerExists(hostId, (exists) => {
            if (!exists) {
                this.updateConnectionStatus('Partie introuvable - Vérifiez le code');
                return;
            }
            
            const conn = this.peer.connect(hostId, {
                metadata: { type: 'player_join' },
                reliable: true
            });
            
            // Timeout de connexion
            const connectionTimeout = setTimeout(() => {
                this.updateConnectionStatus('Timeout - Réessayez');
                conn.close();
            }, 10000);
            
            conn.on('open', () => {
                clearTimeout(connectionTimeout);
                this.connections.set('host', conn);
                this.setupConnectionEvents(conn, 'host');
                this.updateConnectionStatus('Connecté! Accès au lobby...');
                
                // Envoyer les informations du joueur
                this.sendMessage(conn, {
                    type: 'player_info',
                    playerId: this.myPlayerId,
                    playerName: `Joueur ${Date.now().toString().slice(-4)}`
                });
                
                // Afficher le lobby
                setTimeout(() => this.showLobby(), 500);
            });
            
            conn.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error('Erreur de connexion:', err);
                this.updateConnectionStatus('Connexion échouée - Réessayez');
            });
        });
        
        return true;
    }
    
    checkPeerExists(peerId, callback) {
        // Méthode simple : essayer une connexion de test
        console.log('Vérification de l\'existence du peer:', peerId);
        
        // Pour PeerJS, on ne peut pas vraiment vérifier l'existence
        // On fait confiance et on laisse la connexion échouer si nécessaire
        callback(true);
    }
    
    handleIncomingConnection(conn) {
        if (!this.isHost) return;
        
        console.log('Nouvelle connexion:', conn.peer);
        
        // Vérifier la limite de joueurs (4 max = hôte + 3 autres)
        if (this.connections.size >= 3) {
            console.log('Lobby plein, refus de la connexion');
            this.sendMessage(conn, {
                type: 'connection_refused',
                reason: 'Lobby plein (4 joueurs maximum)'
            });
            conn.close();
            return;
        }
        
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.setupConnectionEvents(conn, conn.peer);
            
            this.updatePlayerCount();
            this.updateConnectionStatus(`${this.connections.size} joueur(s) connecté(s)`);
            
            // Si on est en lobby, mettre à jour
            if (this.inLobby) {
                this.updatePlayersList();
                this.addSystemMessage('Un joueur a rejoint le lobby!');
            }
        });
    }
    
    setupConnectionEvents(conn, playerId) {
        conn.on('data', (data) => {
            this.handleMessage(data, playerId);
        });
        
        conn.on('close', () => {
            console.log('Connexion fermée:', playerId);
            this.connections.delete(playerId);
            this.updatePlayerCount();
            
            if (this.isHost) {
                this.updateConnectionStatus(`${this.connections.size} joueur(s) connecté(s)`);
                
                // Mettre à jour la liste des joueurs connectés
                this.connectedPlayers = this.connectedPlayers.filter(p => p.id !== playerId);
                
                // Si on est en lobby, mettre à jour
                if (this.inLobby) {
                    this.updatePlayersList();
                    this.addSystemMessage('Un joueur a quitté le lobby.');
                    
                    // Diffuser la liste mise à jour
                    this.broadcastToLobby({
                        type: 'player_list_update',
                        players: this.connectedPlayers
                    });
                }
            }
        });
        
        conn.on('error', (err) => {
            console.error('Erreur de connexion:', err);
        });
    }
    
    handleMessage(data, senderId) {
        console.log('Message reçu:', data, 'de:', senderId);
        
        switch (data.type) {
            case 'player_info':
                this.handlePlayerInfo(data, senderId);
                break;
                
            case 'game_start':
                this.handleGameStart(data);
                break;
                
            case 'game_action':
                this.handleGameAction(data, senderId);
                break;
                
            case 'game_state':
                this.handleGameState(data);
                break;
                
            case 'chat_message':
                this.handleChatMessage(data);
                break;
                
            case 'player_list_update':
                this.handlePlayerListUpdate(data);
                break;
                
            case 'lobby_start_game':
                this.handleLobbyStartGame(data);
                break;
                
            case 'connection_refused':
                this.handleConnectionRefused(data);
                break;
                
            default:
                console.log('Type de message inconnu:', data.type);
        }
    }
    
    handlePlayerInfo(data, senderId) {
        if (this.isHost) {
            this.connectedPlayers.push({
                id: senderId,
                name: data.playerName,
                playerId: data.playerId
            });
            
            console.log('Joueur ajouté:', data.playerName);
            
            // Diffuser la liste mise à jour
            this.broadcastToLobby({
                type: 'player_list_update',
                players: this.connectedPlayers
            });
            
            // Afficher le lobby si pas encore fait
            if (!this.inLobby) {
                this.showLobby();
            } else {
                this.updatePlayersList();
                this.addSystemMessage(`${data.playerName} a rejoint le lobby!`);
            }
        }
    }
    
    handleGameStart(data) {
        if (!this.isHost) {
            // Recevoir l'état initial du jeu
            console.log('Réception du démarrage de jeu - Index:', data.myPlayerIndex, 'Total:', data.totalPlayers);
            this.game.initializeMultiplayerGame(data.gameState, data.myPlayerIndex, data.totalPlayers);
        }
    }
    
    handleGameAction(data, senderId) {
        if (this.isHost) {
            // L'hôte traite l'action et diffuse le nouvel état
            this.game.processMultiplayerAction(data.action, senderId);
            this.broadcastGameState();
        }
    }
    
    handleGameState(data) {
        if (!this.isHost) {
            // Mettre à jour l'état local avec l'état du serveur
            this.game.updateFromNetworkState(data.gameState);
        }
    }
    
    startMultiplayerGame() {
        if (!this.isHost) {
            this.updateConnectionStatus('Seul l\'hôte peut démarrer');
            return false;
        }
        
        if (this.connections.size === 0) {
            this.updateConnectionStatus('Aucun joueur connecté');
            return false;
        }
        
        const playerCount = Math.min(this.connections.size + 1, 4); // +1 pour l'hôte
        
        // Initialiser le jeu
        this.game.initializeMultiplayerGame(null, 0); // L'hôte est toujours le joueur 0
        
        // Envoyer l'état initial à tous les joueurs
        let playerIndex = 1;
        this.connections.forEach((conn, playerId) => {
            this.sendMessage(conn, {
                type: 'game_start',
                gameState: this.game.getGameState(),
                myPlayerIndex: playerIndex
            });
            playerIndex++;
        });
        
        this.updateConnectionStatus('Partie en cours...');
        return true;
    }
    
    sendAction(action) {
        if (this.isHost) {
            // L'hôte traite directement ses actions
            this.game.processMultiplayerAction(action, 'host');
            this.broadcastGameState();
        } else {
            // Envoyer l'action à l'hôte
            const hostConn = this.connections.get('host');
            if (hostConn) {
                this.sendMessage(hostConn, {
                    type: 'game_action',
                    action: action
                });
            }
        }
    }
    
    broadcastGameState() {
        if (!this.isHost) return;
        
        const gameState = this.game.getGameState();
        this.connections.forEach((conn) => {
            this.sendMessage(conn, {
                type: 'game_state',
                gameState: gameState
            });
        });
    }
    
    sendMessage(conn, message) {
        try {
            conn.send(message);
        } catch (err) {
            console.error('Erreur envoi message:', err);
        }
    }
    
    updateConnectionStatus(status) {
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.textContent = status;
        }
        console.log('Connection status:', status);
    }
    
    updatePlayerCount() {
        const count = this.isHost ? this.connections.size + 1 : this.connections.size;
        console.log(`Nombre de joueurs: ${count}`);
    }
    
    disconnect() {
        this.connections.forEach((conn) => {
            conn.close();
        });
        this.connections.clear();
        
        if (this.peer) {
            this.peer.destroy();
        }
    }
    
    isConnected() {
        return this.connections.size > 0;
    }
    
    getGameMode() {
        const gameMode = document.getElementById('gameMode').value;
        return gameMode;
    }
    
    findFullPeerId(shortCode) {
        // Pour l'instant, retourner le code tel quel
        // Dans une version plus avancée, on pourrait maintenir
        // une liste des peers actifs
        return shortCode;
    }
    
    handleConnectionRefused(data) {
        // Le serveur refuse la connexion
        this.updateConnectionStatus(data.reason || 'Connexion refusée');
        
        // Retourner au menu après un délai
        setTimeout(() => {
            if (document.getElementById('lobbyScreen').style.display !== 'none') {
                this.leaveLobby();
            }
        }, 3000);
    }
    
    // === GESTION DU LOBBY ===
    
    setupLobbyEventListeners() {
        // Bouton quitter le lobby
        const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
        if (leaveLobbyBtn) {
            leaveLobbyBtn.addEventListener('click', () => {
                this.leaveLobby();
            });
        }
        
        // Code de salle cliquable pour copier
        const roomCodeBadge = document.querySelector('.room-code-badge');
        if (roomCodeBadge) {
            roomCodeBadge.addEventListener('click', () => {
                this.copyRoomCode();
            });
        }
        
        // Chat
        const chatInput = document.getElementById('chatInput');
        const sendChatBtn = document.getElementById('sendChatBtn');
        
        if (chatInput && sendChatBtn) {
            sendChatBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
        
        // Bouton démarrer (hôte seulement)
        const startGameLobbyBtn = document.getElementById('startGameLobbyBtn');
        if (startGameLobbyBtn) {
            startGameLobbyBtn.addEventListener('click', () => {
                this.startGameFromLobby();
            });
        }
    }
    
    showLobby() {
        this.inLobby = true;
        
        // Masquer le menu et afficher le lobby
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'flex';
        
        // Afficher le code de la partie
        document.getElementById('lobbyRoomCode').textContent = this.roomCode;
        
        // Configurer les contrôles selon le rôle
        if (this.isHost) {
            document.getElementById('startGameLobbyBtn').style.display = 'block';
            document.getElementById('waitingMessage').style.display = 'none';
        } else {
            document.getElementById('startGameLobbyBtn').style.display = 'none';
            document.getElementById('waitingMessage').style.display = 'block';
        }
        
        // Ajouter un message de bienvenue
        this.addSystemMessage('Bienvenue dans le lobby!');
        
        // Mettre à jour la liste des joueurs
        this.updatePlayersList();
    }
    
    copyRoomCode() {
        const roomCodeBadge = document.querySelector('.room-code-badge');
        
        if (navigator.clipboard && this.roomCode) {
            navigator.clipboard.writeText(this.roomCode).then(() => {
                // Feedback visuel
                roomCodeBadge.classList.add('copied');
                
                // Retirer la classe après 2 secondes
                setTimeout(() => {
                    roomCodeBadge.classList.remove('copied');
                }, 2000);
                
                // Message dans le chat
                this.addSystemMessage('Code de la salle copié !');
            }).catch(err => {
                console.error('Échec de la copie :', err);
                this.addSystemMessage('Échec de la copie du code');
            });
        } else {
            // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
            const textArea = document.createElement('textarea');
            textArea.value = this.roomCode;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                roomCodeBadge.classList.add('copied');
                setTimeout(() => {
                    roomCodeBadge.classList.remove('copied');
                }, 2000);
                this.addSystemMessage('Code de la salle copié !');
            } catch (err) {
                console.error('Échec de la copie :', err);
                this.addSystemMessage('Échec de la copie du code');
            }
            
            document.body.removeChild(textArea);
        }
    }
    
    leaveLobby() {
        this.inLobby = false;
        
        // Fermer toutes les connexions
        this.disconnect();
        
        // Retourner au menu
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('menuScreen').style.display = 'flex';
        
        // Réinitialiser
        this.connectedPlayers = [];
        this.lobbyMessages = [];
        this.clearChat();
    }
    
    sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        const chatData = {
            type: 'chat_message',
            sender: this.isHost ? 'Hôte' : 'Joueur',
            message: message,
            timestamp: Date.now()
        };
        
        // Afficher le message localement
        this.displayChatMessage(chatData);
        
        // Envoyer aux autres joueurs
        this.broadcastToLobby(chatData);
        
        // Vider le champ
        chatInput.value = '';
    }
    
    handleChatMessage(data) {
        this.displayChatMessage(data);
    }
    
    displayChatMessage(data) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="sender">${data.sender}:</span>
            ${data.message}
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    addSystemMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message system';
        messageDiv.textContent = message;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }
    
    updatePlayersList() {
        const playersList = document.getElementById('playersList');
        if (!playersList) return;
        
        playersList.innerHTML = '';
        
        // Ajouter l'hôte
        if (this.isHost) {
            this.addPlayerToList('Hôte (Vous)', 'player', true, true);
        } else {
            this.addPlayerToList('Hôte', 'player', true, false);
        }
        
        // Ajouter les autres joueurs
        this.connectedPlayers.forEach((player, index) => {
            const ownerType = this.game.getPlayerOwner(index + 1);
            const isYou = !this.isHost && player.id === this.myPlayerId;
            this.addPlayerToList(
                player.name + (isYou ? ' (Vous)' : ''), 
                ownerType, 
                false, 
                isYou
            );
        });
    }
    
    addPlayerToList(name, ownerType, isHost, isYou) {
        const playersList = document.getElementById('playersList');
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        
        const colors = {
            'player': '#4FC3F7',    // Bleu
            'enemy': '#F44336',     // Rouge
            'enemy2': '#424242',    // Noir
            'enemy3': '#FFD700'     // Jaune
        };
        
        playerDiv.innerHTML = `
            <div class="player-color" style="background-color: ${colors[ownerType] || '#888'}"></div>
            <span class="player-name">${name}</span>
            ${isHost ? '<span class="host-badge">Hôte</span>' : ''}
            <span class="player-status">Connecté</span>
        `;
        
        playersList.appendChild(playerDiv);
    }
    
    handlePlayerListUpdate(data) {
        this.connectedPlayers = data.players;
        this.updatePlayersList();
    }
    
    broadcastToLobby(message) {
        this.connections.forEach((conn) => {
            if (conn.open) {
                this.sendMessage(conn, message);
            }
        });
    }
    
    broadcastGameState() {
        if (!this.isHost) return;
        
        const gameState = this.game.getGameState();
        const message = {
            type: 'game_state',
            gameState: gameState
        };
        
        this.connections.forEach((conn) => {
            if (conn.open) {
                this.sendMessage(conn, message);
            }
        });
    }
    
    startGameFromLobby() {
        if (!this.isHost) return;
        
        const minPlayers = 2;
        const maxPlayers = 4;
        
        if (this.connections.size < minPlayers - 1) {
            alert(`Il faut au moins ${minPlayers} joueurs pour commencer`);
            return;
        }
        
        if (this.connections.size > maxPlayers - 1) {
            alert(`Maximum ${maxPlayers} joueurs autorisés`);
            return;
        }
        
        // Notifier tous les joueurs
        this.broadcastToLobby({
            type: 'lobby_start_game'
        });
        
        // Démarrer le jeu localement
        this.launchGameFromLobby();
    }
    
    handleLobbyStartGame(data) {
        // Le serveur nous dit de démarrer
        this.launchGameFromLobby();
    }
    
    launchGameFromLobby() {
        this.inLobby = false;
        
        // Masquer le lobby et afficher le jeu
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        
        // Démarrer la musique
        setTimeout(() => this.game.startBackgroundMusic(), 500);
        
        // Démarrer le jeu multijoueur
        if (this.isHost) {
            // L'hôte crée le jeu basé sur les joueurs du lobby
            const realPlayerCount = this.connections.size + 1; // +1 pour l'hôte
            console.log(`Démarrage avec ${realPlayerCount} joueurs réels`);
            
            this.game.initializeMultiplayerGame(null, 0, realPlayerCount);
            
            // Envoyer l'état initial à tous les clients
            setTimeout(() => {
                const gameState = this.game.getGameState();
                let playerIndex = 1;
                
                this.connections.forEach((conn, playerId) => {
                    this.sendMessage(conn, {
                        type: 'game_start',
                        gameState: gameState,
                        myPlayerIndex: playerIndex,
                        totalPlayers: realPlayerCount
                    });
                    playerIndex++;
                });
                
                console.log(`État initial envoyé à ${this.connections.size} clients`);
            }, 100);
        }
        
        this.addSystemMessage('La partie commence!');
    }
}

// Rendre la classe disponible globalement
if (typeof window !== 'undefined') {
    window.MultiplayerManager = MultiplayerManager;
    console.log('MultiplayerManager class registered globally');
}