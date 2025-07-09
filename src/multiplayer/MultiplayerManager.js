/**
 * Gestionnaire WebRTC pour Tower Rush
 * Utilise PeerJS pour simplifier les connexions P2P
 */

export class MultiplayerManager {
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
        this.pendingLobbyTimeout = null;
        
        // Optimisations performance réseau
        this.lastGameStateBroadcast = null;
        this.pendingGameStateBroadcast = null;
        
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
        
        // Configuration PeerJS simplifiée
        this.peer = new Peer({
            debug: 3,
            config: {
                'iceServers': [
                    { 'urls': 'stun:stun.l.google.com:19302' },
                    { 'urls': 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            console.log('✅ Peer initialisé avec ID:', id);
            this.myPlayerId = id;
            this.updateConnectionStatus('✅ Prêt à se connecter');
            
            // Si on est en mode hôte et qu'on attend l'ID
            if (this.isHost && !this.roomCode) {
                this.roomCode = id;
                this.displayHostCode();
                // Afficher le lobby immédiatement pour l'hôte
                this.showLobby();
            }
        });
        
        this.peer.on('connection', (conn) => {
            console.log('Connexion entrante de:', conn.peer);
            
            // Handler simplifié pour la connexion
            conn.on('open', () => {
                console.log('Connexion ouverte avec:', conn.peer);
                this.handleIncomingConnection(conn);
            });
            
            // Les événements data, close et error sont gérés dans setupConnectionEvents
            // pour éviter la duplication
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
            // Afficher le lobby immédiatement si on a déjà l'ID
            this.showLobby();
        } else {
            // Attendre que le peer soit connecté (sera géré dans le handler on('open'))
            console.log('En attente de l\'ID du peer...');
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
        const hostId = roomCode.trim();
        
        this.updateConnectionStatus('Connexion en cours...');
        console.log('Tentative de connexion au peer:', hostId);
        
        // NOUVEAU: Connexion directe sans vérification préalable
        try {
            const conn = this.peer.connect(hostId, {
                label: 'game',
                serialization: 'json',
                reliable: true,
                metadata: { type: 'player_join' }
            });
            
            // Gestion des événements de connexion
            let connectionEstablished = false;
            
            conn.on('open', () => {
                console.log('Connexion établie avec l\'hôte!');
                
                this.connections.set('host', conn);
                this.setupConnectionEvents(conn, 'host');
                this.updateConnectionStatus('Connecté! Envoi des informations...');
                
                // Envoyer les informations du joueur
                setTimeout(() => {
                    const playerProfile = this.game.getPlayerProfileForMultiplayer();
                    this.sendMessage(conn, {
                        type: 'player_info',
                        playerId: this.myPlayerId,
                        playerName: playerProfile.name,
                        playerAvatar: playerProfile.avatar
                    });
                }, 500);
            });
            
            conn.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error('Erreur de connexion:', err);
                
                if (err.type === 'peer-unavailable') {
                    this.updateConnectionStatus('Code invalide ou hôte hors ligne');
                } else {
                    this.updateConnectionStatus('Erreur de connexion - Réessayez');
                }
            });
            
            conn.on('close', () => {
                if (connectionEstablished) {
                    console.log('Connexion fermée par l\'hôte');
                    this.updateConnectionStatus('Déconnecté de l\'hôte');
                }
            });
            
        } catch (error) {
            console.error('Erreur lors de la tentative de connexion:', error);
            this.updateConnectionStatus('Erreur - Vérifiez le code');
        }
        
        return true;
    }
    
    
    handleIncomingConnection(conn) {
        if (!this.isHost) {
            console.log('Connexion entrante ignorée - pas hôte');
            return;
        }
        
        console.log('Gestion de la connexion entrante:', conn.peer);
        console.log('État actuel - isHost:', this.isHost, 'inLobby:', this.inLobby);
        
        // Vérifier la limite de joueurs (4 max = hôte + 3 autres)
        if (this.connections.size >= 3) {
            console.log('Lobby plein, refus de la connexion');
            this.sendMessage(conn, {
                type: 'connection_refused',
                reason: 'Lobby plein (4 joueurs maximum)'
            });
            setTimeout(() => conn.close(), 100);
            return;
        }
        
        // La connexion est déjà ouverte quand on arrive ici
        this.connections.set(conn.peer, conn);
        this.setupConnectionEvents(conn, conn.peer);
        
        console.log('Connexion ajoutée. Total connexions:', this.connections.size);
        
        this.updatePlayerCount();
        this.updateConnectionStatus(`${this.connections.size} joueur(s) connecté(s)`);
        
        // Si on est en lobby, mettre à jour
        if (this.inLobby) {
            this.updatePlayersList();
            this.addSystemMessage('Un joueur a rejoint le lobby!');
        }
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
                
            case 'player_action':
                this.handlePlayerAction(data, senderId);
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
                
            case 'lobby_access_granted':
                this.handleLobbyAccessGranted(data);
                break;
                
            default:
                console.log('Type de message inconnu:', data.type);
        }
    }
    
    handlePlayerInfo(data, senderId) {
        console.log('handlePlayerInfo appelé - isHost:', this.isHost, 'senderId:', senderId);
        
        if (this.isHost) {
            // Vérifier si le joueur n'est pas déjà dans la liste
            const existingPlayer = this.connectedPlayers.find(p => p.id === senderId);
            if (existingPlayer) {
                console.log('Joueur déjà dans la liste:', senderId);
                return;
            }
            
            this.connectedPlayers.push({
                id: senderId,
                name: data.playerName || 'Joueur',
                avatar: data.playerAvatar || '👤',
                playerId: data.playerId
            });
            
            console.log('Joueur ajouté:', data.playerName, '- Total joueurs:', this.connectedPlayers.length);
            
            // Envoyer une confirmation au joueur qui vient de se connecter
            const conn = this.connections.get(senderId);
            if (conn && conn.open) {
                console.log('Envoi de lobby_access_granted à', senderId);
                this.sendMessage(conn, {
                    type: 'lobby_access_granted',
                    players: this.connectedPlayers
                });
            } else {
                console.error('Connexion non trouvée ou fermée pour', senderId);
            }
            
            // Diffuser la liste mise à jour à tous les autres
            this.broadcastToLobby({
                type: 'player_list_update',
                players: this.connectedPlayers
            });
            
            // Afficher le lobby si pas encore fait
            if (!this.inLobby) {
                console.log('Affichage du lobby pour l\'hôte');
                this.showLobby();
            } else {
                this.updatePlayersList();
                this.addSystemMessage(`${data.playerName} a rejoint le lobby!`);
            }
        } else {
            console.log('handlePlayerInfo ignoré - pas hôte');
        }
    }
    
    handleGameStart(data) {
        if (!this.isHost) {
            // Recevoir l'état initial du jeu
            console.log('Réception du démarrage de jeu - Index:', data.myPlayerIndex, 'Total:', data.totalPlayers);
            
            // NOUVEAU: Stocker les données pour après l'initialisation
            this.pendingGameData = data;
            
            // Afficher l'interface de jeu
            this.launchGameFromLobby();
            
            // L'initialisation du jeu se fera dans launchGameFromLobby une fois le canvas prêt
        }
    }
    
    handleGameAction(data, senderId) {
        if (this.isHost) {
            // L'hôte traite l'action et diffuse le nouvel état
            this.game.processMultiplayerAction(data.action, senderId);
            this.broadcastGameState();
        }
    }
    
    handlePlayerAction(data, senderId) {
        // NOUVEAU: Système d'actions simplifié et robuste
        const action = data.action;
        
        if (this.isHost) {
            // L'hôte redistribue l'action à tous les autres joueurs
            console.log(`Hôte: Redistribution de l'action ${action.type} de ${data.fromPlayer}`);
            
            this.connections.forEach((conn) => {
                // Envoyer à tous sauf l'expéditeur original
                if (conn.peer !== senderId) {
                    this.sendMessage(conn, {
                        type: 'player_action',
                        action: action,
                        fromPlayer: data.fromPlayer
                    });
                }
            });
        }
        
        // Appliquer l'action seulement si elle vient d'un autre joueur
        const isMyAction = (this.isHost && data.fromPlayer === 'host') || 
                          (!this.isHost && data.fromPlayer === this.myPlayerId);
        
        if (!isMyAction) {
            console.log(`Application de l'action ${action.type} de ${data.fromPlayer}`);
            this.applyPlayerAction(action);
        }
    }
    
    applyPlayerAction(action) {
        // NOUVEAU: Application robuste des actions avec vérifications
        try {
            if (action.type === 'send_units') {
                const sourceBuilding = this.game.buildings[action.sourceId];
                const targetBuilding = this.game.buildings[action.targetId];
                
                if (sourceBuilding && targetBuilding) {
                    console.log(`Action appliquée: ${sourceBuilding.owner} envoie ${action.percentage}% de ${sourceBuilding.units} unités`);
                    sourceBuilding.sendUnits(targetBuilding, action.percentage, this.game);
                } else {
                    console.error(`Bâtiments invalides: source=${action.sourceId}, target=${action.targetId}`);
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'application de l\'action:', error);
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
        // NOUVEAU: Système simple - tout le monde diffuse ses actions
        if (this.isHost) {
            // L'hôte diffuse l'action à tous les clients
            this.connections.forEach((conn) => {
                this.sendMessage(conn, {
                    type: 'player_action',
                    action: action,
                    fromPlayer: 'host'
                });
            });
        } else {
            // Le client envoie l'action à l'hôte qui la redistribue
            const hostConn = this.connections.get('host');
            if (hostConn) {
                this.sendMessage(hostConn, {
                    type: 'player_action',
                    action: action,
                    fromPlayer: this.myPlayerId
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
            if (!conn) {
                console.error('Connexion null');
                return;
            }
            
            // Vérifier plusieurs façons d'envoyer le message
            if (conn.send && typeof conn.send === 'function') {
                console.log('Envoi message:', message.type, 'à', conn.peer, '- open:', conn.open);
                conn.send(message);
            } else if (conn.dataChannel && conn.dataChannel.send && conn.dataChannel.readyState === 'open') {
                console.log('Envoi via dataChannel:', message.type);
                conn.dataChannel.send(JSON.stringify(message));
            } else {
                console.error('Impossible d\'envoyer - conn.open:', conn.open, 'dataChannel:', conn.dataChannel?.readyState);
                
                // Essayer de forcer l'envoi après un délai
                if (!conn._sendRetryTimeout) {
                    conn._sendRetryTimeout = setTimeout(() => {
                        delete conn._sendRetryTimeout;
                        console.log('Retry envoi message');
                        this.sendMessage(conn, message);
                    }, 500);
                }
            }
        } catch (err) {
            console.error('Erreur envoi message:', err);
            console.error('État de la connexion:', conn?.open ? 'ouverte' : 'fermée');
            console.error('Connexion:', conn);
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
    
    handleLobbyAccessGranted(data) {
        // L'hôte nous autorise l'accès au lobby
        console.log('Accès au lobby accordé!');
        
        // Annuler le timeout si on reçoit la confirmation
        if (this.pendingLobbyTimeout) {
            clearTimeout(this.pendingLobbyTimeout);
            this.pendingLobbyTimeout = null;
        }
        
        this.connectedPlayers = data.players || [];
        this.updateConnectionStatus('Connecté au lobby!');
        
        // Afficher le lobby maintenant
        this.showLobby();
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
        
        // Récupérer le profil du joueur pour avoir son nom
        const playerProfile = this.game.getPlayerProfileForMultiplayer();
        const playerName = playerProfile.name || (this.isHost ? 'Hôte' : 'Joueur');
        
        const chatData = {
            type: 'chat_message',
            sender: playerName,
            senderId: this.myPlayerId, // Ajouter l'ID pour éviter les doublons
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
        // Éviter d'afficher nos propres messages deux fois
        if (data.senderId !== this.myPlayerId) {
            this.displayChatMessage(data);
        }
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
        
        // Ajouter l'hôte avec son profil
        const hostProfile = this.game.getPlayerProfileForMultiplayer();
        if (this.isHost) {
            this.addPlayerToList(
                hostProfile.name + ' (Vous)', 
                hostProfile.avatar,
                'player', 
                true, 
                true
            );
        } else {
            this.addPlayerToList(
                'Hôte', 
                '👑', // Avatar par défaut pour l'hôte distant
                'player', 
                true, 
                false
            );
        }
        
        // Ajouter les autres joueurs
        this.connectedPlayers.forEach((player, index) => {
            const ownerType = this.game.getPlayerOwner(index + 1);
            const isYou = !this.isHost && player.id === this.myPlayerId;
            this.addPlayerToList(
                player.name + (isYou ? ' (Vous)' : ''), 
                player.avatar || '👤',
                ownerType, 
                false, 
                isYou
            );
        });
    }
    
    addPlayerToList(name, avatar, ownerType, isHost, isYou) {
        const playersList = document.getElementById('playersList');
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        
        const colors = {
            'player': 'blue',    // Bleu
            'enemy': 'red',      // Rouge
            'enemy2': 'purple',  // Violet
            'enemy3': 'yellow'   // Jaune
        };
        
        const colorClass = colors[ownerType] || 'blue';
        
        playerDiv.innerHTML = `
            <div class="player-avatar-lobby ${colorClass}">${avatar}</div>
            <div class="player-details">
                <div class="player-name-lobby">${name}</div>
                <div class="player-status-lobby">Connecté</div>
            </div>
            <div class="player-badges">
                ${isHost ? '<span class="host-badge">Hôte</span>' : ''}
            </div>
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
        // NOUVEAU: Plus de synchronisation d'état constant
        // Cette méthode n'est plus utilisée activement
        console.log('broadcastGameState appelé mais ignoré - utilisation des actions uniquement');
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
        
        // Masquer le lobby et afficher le jeu (pour tous les joueurs)
        document.getElementById('lobbyScreen').style.display = 'none';
        
        // Vérifier que le gameContainer existe
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.style.display = 'flex';
            console.log('gameContainer affiché pour le joueur');
        } else {
            console.error('gameContainer introuvable! Vérifiez que vous êtes sur game.html');
        }
        
        // Vérifier que le canvas existe et initialiser si nécessaire
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) {
            console.log('gameCanvas trouvé');
            
            // Diagnostic CSS du canvas
            const canvasStyle = window.getComputedStyle(gameCanvas);
            console.log('Canvas display:', canvasStyle.display);
            console.log('Canvas visibility:', canvasStyle.visibility);
            console.log('Canvas dimensions:', canvasStyle.width, 'x', canvasStyle.height);
            console.log('Canvas position:', canvasStyle.position);
            
            // Forcer l'affichage du canvas
            gameCanvas.style.display = 'block';
            gameCanvas.style.visibility = 'visible';
            
            // Initialiser le canvas pour les joueurs distants
            if (this.game && this.game.initializeCanvas) {
                this.game.initializeCanvas();
            }
            
            // Forcer un redimensionnement pour déclencher l'affichage
            setTimeout(() => {
                if (this.game && this.game.setupCanvas) {
                    this.game.setupCanvas();
                }
                // Déclencher un événement resize pour forcer le redimensionnement
                window.dispatchEvent(new Event('resize'));
                
                // Forcer le démarrage du jeu si le canvas est maintenant disponible
                if (this.game && this.game.canvas && this.game.ctx && !this.game.gameStarted) {
                    console.log('Forcer le démarrage du jeu pour le joueur distant');
                    this.game.gameStarted = true;
                    if (!this.game.gameLoopStarted) {
                        this.game.gameLoopStarted = true;
                        this.game.gameLoop();
                    }
                }
            }, 100);
        } else {
            console.error('gameCanvas introuvable! Le canvas ne peut pas être affiché');
        }
        
        // Démarrer la musique (pour tous les joueurs)
        setTimeout(() => {
            if (this.game && this.game.startBackgroundMusic) {
                this.game.startBackgroundMusic();
            }
        }, 500);
        
        // NOUVEAU: Initialisation simplifiée
        if (this.isHost) {
            // L'hôte crée le jeu basé sur les joueurs du lobby
            const realPlayerCount = this.connections.size + 1; // +1 pour l'hôte
            console.log(`Démarrage avec ${realPlayerCount} joueurs réels`);
            
            // Attendre que le canvas soit vraiment prêt
            const initializeHostGame = () => {
                if (this.game && this.game.canvas && this.game.ctx) {
                    this.game.initializeMultiplayerGame(null, 0, realPlayerCount);
                    
                    // Envoyer l'état initial après un délai pour garantir l'initialisation
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
                    }, 500); // Délai plus long pour garantir l'initialisation
                } else {
                    // Réessayer après un court délai
                    setTimeout(initializeHostGame, 100);
                }
            };
            
            // Démarrer l'initialisation
            setTimeout(initializeHostGame, 200);
            this.addSystemMessage('La partie commence!');
            
        } else {
            // Client: Initialiser avec les données en attente si disponibles
            console.log('Client: Interface de jeu affichée');
            
            if (this.pendingGameData) {
                // Attendre que le canvas soit prêt
                const initializeClientGame = () => {
                    if (this.game && this.game.canvas && this.game.ctx) {
                        const data = this.pendingGameData;
                        this.pendingGameData = null;
                        
                        console.log('Client: Initialisation avec les données reçues');
                        this.game.initializeMultiplayerGame(
                            data.gameState, 
                            data.myPlayerIndex, 
                            data.totalPlayers
                        );
                    } else {
                        // Réessayer
                        setTimeout(initializeClientGame, 100);
                    }
                };
                
                // Démarrer après un délai pour laisser le canvas s'initialiser
                setTimeout(initializeClientGame, 300);
            }
        }
    }
}

// Rendre la classe disponible globalement
if (typeof window !== 'undefined') {
    window.MultiplayerManager = MultiplayerManager;
    console.log('MultiplayerManager class registered globally');
}