/**
 * LeaderboardManager - Gère l'affichage et la logique du leaderboard
 * Intègre avec NeonClient pour les données cloud et localStorage pour les données locales
 */
class LeaderboardManager {
    constructor(neonClient) {
        this.neonClient = neonClient;
        this.localStats = this.loadLocalStats();
        this.leaderboardData = [];
        this.playerStats = null;
        this.isLoadingLeaderboard = false;
        this.isLoadingStats = false;
        
        // Éléments DOM
        this.leaderboardPreview = document.getElementById('leaderboardPreview');
        this.showFullLeaderboardBtn = document.getElementById('showFullLeaderboardBtn');
        this.profileStats = document.getElementById('profileStats');
        this.statGames = document.getElementById('statGames');
        this.statWins = document.getElementById('statWins');
        this.statBestScore = document.getElementById('statBestScore');
        this.profileCloudStatus = document.getElementById('profileCloudStatus');
        
        this.setupEventListeners();
        this.initializeLeaderboard();
    }
    
    setupEventListeners() {
        if (this.showFullLeaderboardBtn) {
            this.showFullLeaderboardBtn.addEventListener('click', () => {
                this.showFullLeaderboard();
            });
        }
    }
    
    async initializeLeaderboard() {
        try {
            await this.refreshLeaderboardPreview();
            await this.refreshPlayerStats();
        } catch (error) {
            console.error('Erreur initialisation leaderboard:', error);
            this.showOfflineMode();
        }
    }
    
    async refreshLeaderboardPreview() {
        if (this.isLoadingLeaderboard) return;
        
        this.isLoadingLeaderboard = true;
        this.showLoadingLeaderboard();
        
        try {
            // Essayer de charger depuis le cloud
            if (this.neonClient && this.neonClient.isInitialized) {
                const cloudLeaderboard = await this.neonClient.getLeaderboard('all', 5);
                if (cloudLeaderboard && cloudLeaderboard.length > 0) {
                    this.leaderboardData = cloudLeaderboard;
                    this.displayLeaderboardPreview(cloudLeaderboard);
                    this.updateCloudStatus('cloud');
                    return;
                }
            }
            
            // Fallback vers les données locales
            const localLeaderboard = this.generateLocalLeaderboard();
            this.leaderboardData = localLeaderboard;
            this.displayLeaderboardPreview(localLeaderboard);
            this.updateCloudStatus('local');
            
        } catch (error) {
            console.error('Erreur chargement leaderboard:', error);
            this.showErrorLeaderboard();
        } finally {
            this.isLoadingLeaderboard = false;
        }
    }
    
    async refreshPlayerStats() {
        if (this.isLoadingStats) return;
        
        this.isLoadingStats = true;
        
        try {
            // Essayer de charger depuis le cloud
            if (this.neonClient && this.neonClient.isLoggedIn()) {
                const cloudStats = await this.neonClient.getPlayerStats();
                if (cloudStats) {
                    this.playerStats = cloudStats;
                    this.displayPlayerStats(cloudStats);
                    return;
                }
            }
            
            // Fallback vers les stats locales
            const localStats = this.getLocalStats();
            this.playerStats = localStats;
            this.displayPlayerStats(localStats);
            
        } catch (error) {
            console.error('Erreur chargement stats:', error);
            this.displayPlayerStats(this.getLocalStats());
        } finally {
            this.isLoadingStats = false;
        }
    }
    
    showLoadingLeaderboard() {
        if (this.leaderboardPreview) {
            this.leaderboardPreview.innerHTML = `
                <div class="loading-leaderboard">
                    <div class="loading-spinner"></div>
                    <span>Chargement du leaderboard...</span>
                </div>
            `;
        }
    }
    
    displayLeaderboardPreview(leaderboard) {
        if (!this.leaderboardPreview) return;
        
        if (!leaderboard || leaderboard.length === 0) {
            this.leaderboardPreview.innerHTML = `
                <div class="empty-leaderboard">
                    <div class="empty-icon">🏆</div>
                    <p>Aucun score disponible</p>
                    <p class="empty-hint">Jouez votre première partie pour apparaître ici!</p>
                </div>
            `;
            return;
        }
        
        const leaderboardHTML = leaderboard.map((player, index) => {
            const position = index + 1;
            const positionIcon = this.getPositionIcon(position);
            const winRate = player.win_rate || player.winRate || 0;
            const totalGames = player.total_games || player.games_played || 0;
            const totalWins = player.total_wins || player.wins || 0;
            const bestScore = player.best_score || 0;
            
            return `
                <div class="leaderboard-item ${position <= 3 ? 'top-' + position : ''}">
                    <div class="leaderboard-rank">
                        <span class="rank-number">${positionIcon}</span>
                    </div>
                    <div class="leaderboard-avatar">${player.avatar_emoji || '👤'}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${player.display_name || player.name}</div>
                        <div class="leaderboard-stats">
                            <span class="stat-item">🎮 ${totalGames}</span>
                            <span class="stat-item">🏆 ${totalWins}</span>
                            <span class="stat-item">⭐ ${bestScore}</span>
                        </div>
                    </div>
                    <div class="leaderboard-score">
                        <div class="score-value">${bestScore}</div>
                        <div class="win-rate">${winRate.toFixed(1)}%</div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.leaderboardPreview.innerHTML = leaderboardHTML;
    }
    
    displayPlayerStats(stats) {
        if (!stats) return;
        
        const totalGames = stats.total_games || 0;
        const totalWins = stats.total_wins || 0;
        const bestScore = stats.best_score || 0;
        
        if (this.statGames) this.statGames.textContent = totalGames;
        if (this.statWins) this.statWins.textContent = totalWins;
        if (this.statBestScore) this.statBestScore.textContent = bestScore;
        
        // Afficher les stats si elles existent
        if (this.profileStats && totalGames > 0) {
            this.profileStats.style.display = 'block';
        }
    }
    
    showErrorLeaderboard() {
        if (this.leaderboardPreview) {
            this.leaderboardPreview.innerHTML = `
                <div class="error-leaderboard">
                    <div class="error-icon">⚠️</div>
                    <p>Erreur de chargement</p>
                    <button class="retry-btn" onclick="window.game.leaderboardManager.refreshLeaderboardPreview()">
                        Réessayer
                    </button>
                </div>
            `;
        }
    }
    
    showOfflineMode() {
        this.updateCloudStatus('offline');
        const localLeaderboard = this.generateLocalLeaderboard();
        this.displayLeaderboardPreview(localLeaderboard);
        this.displayPlayerStats(this.getLocalStats());
    }
    
    updateCloudStatus(status) {
        if (!this.profileCloudStatus) return;
        
        const cloudIcon = this.profileCloudStatus.querySelector('.cloud-icon');
        const cloudText = this.profileCloudStatus.querySelector('.cloud-text');
        
        if (cloudIcon && cloudText) {
            switch (status) {
                case 'cloud':
                    cloudIcon.textContent = '☁️';
                    cloudText.textContent = 'Cloud';
                    this.profileCloudStatus.className = 'profile-cloud-status cloud-connected';
                    break;
                case 'local':
                    cloudIcon.textContent = '💾';
                    cloudText.textContent = 'Local';
                    this.profileCloudStatus.className = 'profile-cloud-status cloud-local';
                    break;
                case 'offline':
                    cloudIcon.textContent = '📴';
                    cloudText.textContent = 'Hors ligne';
                    this.profileCloudStatus.className = 'profile-cloud-status cloud-offline';
                    break;
            }
        }
    }
    
    generateLocalLeaderboard() {
        // Générer un leaderboard basé sur les données locales
        const localStats = this.getLocalStats();
        
        // Créer des données de démonstration si pas de stats locales
        if (localStats.total_games === 0) {
            return [
                { display_name: 'Conquérant', avatar_emoji: '👑', best_score: 1250, total_games: 15, total_wins: 12, win_rate: 80.0 },
                { display_name: 'Stratège', avatar_emoji: '🧙‍♂️', best_score: 1100, total_games: 22, total_wins: 14, win_rate: 63.6 },
                { display_name: 'Chevalier', avatar_emoji: '⚔️', best_score: 950, total_games: 18, total_wins: 9, win_rate: 50.0 },
                { display_name: 'Défenseur', avatar_emoji: '🛡️', best_score: 800, total_games: 12, total_wins: 7, win_rate: 58.3 },
                { display_name: 'Guerrier', avatar_emoji: '🏹', best_score: 720, total_games: 9, total_wins: 4, win_rate: 44.4 }
            ];
        }
        
        // Inclure les stats du joueur local
        return [
            {
                display_name: 'Vous',
                avatar_emoji: '👤',
                best_score: localStats.best_score,
                total_games: localStats.total_games,
                total_wins: localStats.total_wins,
                win_rate: localStats.total_games > 0 ? (localStats.total_wins / localStats.total_games * 100) : 0
            }
        ];
    }
    
    getPositionIcon(position) {
        switch (position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return position;
        }
    }
    
    // ===== LEADERBOARD COMPLET =====
    
    async showFullLeaderboard() {
        // Créer le modal du leaderboard complet
        this.createFullLeaderboardModal();
        
        // Charger toutes les données
        await this.loadFullLeaderboardData();
    }
    
    createFullLeaderboardModal() {
        // Supprimer le modal existant s'il existe
        const existingModal = document.getElementById('fullLeaderboardModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'fullLeaderboardModal';
        modal.className = 'leaderboard-modal';
        modal.innerHTML = `
            <div class="leaderboard-modal-content">
                <div class="leaderboard-modal-header">
                    <h2>🏆 Leaderboard Complet</h2>
                    <button class="leaderboard-modal-close" id="closeFullLeaderboard">×</button>
                </div>
                
                <div class="leaderboard-filters">
                    <div class="filter-group">
                        <label>Mode de jeu:</label>
                        <select id="leaderboardModeFilter">
                            <option value="all">Tous les modes</option>
                            <option value="solo">Solo</option>
                            <option value="multiplayer">Multijoueur</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Période:</label>
                        <select id="leaderboardPeriodFilter">
                            <option value="all">Tout temps</option>
                            <option value="week">Cette semaine</option>
                            <option value="month">Ce mois</option>
                        </select>
                    </div>
                    <button id="refreshLeaderboardBtn" class="btn btn-outline btn-sm">
                        <span class="btn-icon">🔄</span>
                        Actualiser
                    </button>
                </div>
                
                <div class="leaderboard-content" id="fullLeaderboardContent">
                    <div class="loading-full-leaderboard">
                        <div class="loading-spinner"></div>
                        <span>Chargement du leaderboard complet...</span>
                    </div>
                </div>
                
                <div class="leaderboard-pagination" id="leaderboardPagination" style="display: none;">
                    <button id="prevPageBtn" class="btn btn-outline btn-sm">‹ Précédent</button>
                    <span id="pageInfo">Page 1 sur 1</span>
                    <button id="nextPageBtn" class="btn btn-outline btn-sm">Suivant ›</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Ajouter les événements
        this.setupFullLeaderboardEvents();
        
        // Afficher le modal
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    setupFullLeaderboardEvents() {
        const modal = document.getElementById('fullLeaderboardModal');
        const closeBtn = document.getElementById('closeFullLeaderboard');
        const modeFilter = document.getElementById('leaderboardModeFilter');
        const periodFilter = document.getElementById('leaderboardPeriodFilter');
        const refreshBtn = document.getElementById('refreshLeaderboardBtn');
        
        // Fermer le modal
        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
        
        // Fermer en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
        
        // Filtres
        modeFilter?.addEventListener('change', () => this.loadFullLeaderboardData());
        periodFilter?.addEventListener('change', () => this.loadFullLeaderboardData());
        refreshBtn?.addEventListener('click', () => this.loadFullLeaderboardData());
    }
    
    async loadFullLeaderboardData() {
        const contentDiv = document.getElementById('fullLeaderboardContent');
        if (!contentDiv) return;
        
        contentDiv.innerHTML = `
            <div class="loading-full-leaderboard">
                <div class="loading-spinner"></div>
                <span>Chargement...</span>
            </div>
        `;
        
        try {
            const modeFilter = document.getElementById('leaderboardModeFilter')?.value || 'all';
            let leaderboardData = [];
            
            if (this.neonClient && this.neonClient.isInitialized) {
                leaderboardData = await this.neonClient.getLeaderboard(modeFilter, 100);
            }
            
            if (leaderboardData.length === 0) {
                leaderboardData = this.generateExtendedLocalLeaderboard();
            }
            
            this.displayFullLeaderboard(leaderboardData);
            
        } catch (error) {
            console.error('Erreur chargement leaderboard complet:', error);
            contentDiv.innerHTML = `
                <div class="error-leaderboard">
                    <div class="error-icon">⚠️</div>
                    <p>Erreur de chargement du leaderboard</p>
                    <button class="retry-btn" onclick="window.game.leaderboardManager.loadFullLeaderboardData()">
                        Réessayer
                    </button>
                </div>
            `;
        }
    }
    
    displayFullLeaderboard(leaderboard) {
        const contentDiv = document.getElementById('fullLeaderboardContent');
        if (!contentDiv) return;
        
        if (leaderboard.length === 0) {
            contentDiv.innerHTML = `
                <div class="empty-leaderboard">
                    <div class="empty-icon">🏆</div>
                    <p>Aucun score disponible</p>
                </div>
            `;
            return;
        }
        
        const leaderboardHTML = `
            <div class="leaderboard-table">
                <div class="leaderboard-header">
                    <div class="col-rank">Rang</div>
                    <div class="col-player">Joueur</div>
                    <div class="col-games">Parties</div>
                    <div class="col-wins">Victoires</div>
                    <div class="col-score">Meilleur Score</div>
                    <div class="col-winrate">Taux de Victoire</div>
                </div>
                <div class="leaderboard-body">
                    ${leaderboard.map((player, index) => {
                        const position = index + 1;
                        const positionIcon = this.getPositionIcon(position);
                        const winRate = player.win_rate || player.winRate || 0;
                        const totalGames = player.total_games || player.games_played || 0;
                        const totalWins = player.total_wins || player.wins || 0;
                        const bestScore = player.best_score || 0;
                        
                        return `
                            <div class="leaderboard-row ${position <= 3 ? 'top-' + position : ''}">
                                <div class="col-rank">
                                    <span class="rank-icon">${positionIcon}</span>
                                </div>
                                <div class="col-player">
                                    <div class="player-info">
                                        <span class="player-avatar">${player.avatar_emoji || '👤'}</span>
                                        <span class="player-name">${player.display_name || player.name}</span>
                                    </div>
                                </div>
                                <div class="col-games">${totalGames}</div>
                                <div class="col-wins">${totalWins}</div>
                                <div class="col-score">${bestScore}</div>
                                <div class="col-winrate">${winRate.toFixed(1)}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        contentDiv.innerHTML = leaderboardHTML;
    }
    
    generateExtendedLocalLeaderboard() {
        const localStats = this.getLocalStats();
        
        // Générer des données de démonstration étendues
        const demoPlayers = [
            { display_name: 'Conquérant Légendaire', avatar_emoji: '👑', best_score: 1850, total_games: 45, total_wins: 38, win_rate: 84.4 },
            { display_name: 'Maître Stratège', avatar_emoji: '🧙‍♂️', best_score: 1720, total_games: 52, total_wins: 39, win_rate: 75.0 },
            { display_name: 'Chevalier Noir', avatar_emoji: '⚔️', best_score: 1650, total_games: 38, total_wins: 26, win_rate: 68.4 },
            { display_name: 'Défenseur Ultime', avatar_emoji: '🛡️', best_score: 1580, total_games: 41, total_wins: 25, win_rate: 61.0 },
            { display_name: 'Archer Royal', avatar_emoji: '🏹', best_score: 1520, total_games: 35, total_wins: 20, win_rate: 57.1 },
            { display_name: 'Seigneur de Guerre', avatar_emoji: '🗡️', best_score: 1450, total_games: 33, total_wins: 17, win_rate: 51.5 },
            { display_name: 'Gardien des Tours', avatar_emoji: '🏰', best_score: 1380, total_games: 29, total_wins: 14, win_rate: 48.3 },
            { display_name: 'Mercenaire', avatar_emoji: '🪓', best_score: 1320, total_games: 25, total_wins: 11, win_rate: 44.0 },
            { display_name: 'Flamme Éternelle', avatar_emoji: '🔥', best_score: 1250, total_games: 22, total_wins: 9, win_rate: 40.9 },
            { display_name: 'Étoile Brillante', avatar_emoji: '⭐', best_score: 1180, total_games: 19, total_wins: 7, win_rate: 36.8 }
        ];
        
        // Ajouter le joueur local s'il a des stats
        if (localStats.total_games > 0) {
            demoPlayers.push({
                display_name: 'Vous',
                avatar_emoji: '👤',
                best_score: localStats.best_score,
                total_games: localStats.total_games,
                total_wins: localStats.total_wins,
                win_rate: localStats.total_games > 0 ? (localStats.total_wins / localStats.total_games * 100) : 0
            });
        }
        
        // Trier par meilleur score
        return demoPlayers.sort((a, b) => b.best_score - a.best_score);
    }
    
    // ===== GESTION DES STATS LOCALES =====
    
    loadLocalStats() {
        try {
            const saved = localStorage.getItem('towerRushStats');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Erreur chargement stats locales:', error);
        }
        
        return {
            total_games: 0,
            total_wins: 0,
            best_score: 0,
            games_history: []
        };
    }
    
    saveLocalStats() {
        try {
            localStorage.setItem('towerRushStats', JSON.stringify(this.localStats));
        } catch (error) {
            console.error('Erreur sauvegarde stats locales:', error);
        }
    }
    
    getLocalStats() {
        return this.localStats;
    }
    
    updateLocalStats(gameResult) {
        this.localStats.total_games++;
        if (gameResult.victory) {
            this.localStats.total_wins++;
        }
        
        const score = this.calculateScore(gameResult);
        if (score > this.localStats.best_score) {
            this.localStats.best_score = score;
        }
        
        // Garder un historique des dernières parties
        this.localStats.games_history.push({
            date: new Date().toISOString(),
            victory: gameResult.victory,
            score: score,
            duration: gameResult.durationSeconds,
            mode: gameResult.gameMode || 'solo'
        });
        
        // Limiter l'historique à 50 parties
        if (this.localStats.games_history.length > 50) {
            this.localStats.games_history.shift();
        }
        
        this.saveLocalStats();
    }
    
    calculateScore(gameResult) {
        // Calculer le score basé sur les métriques du jeu
        let score = 0;
        
        // Points de base pour la victoire
        if (gameResult.victory) {
            score += 1000;
        }
        
        // Points pour les bâtiments capturés
        score += (gameResult.buildingsCaptured || 0) * 100;
        
        // Bonus pour la vitesse (plus c'est rapide, plus c'est de points)
        if (gameResult.durationSeconds) {
            const timeBonus = Math.max(0, 600 - gameResult.durationSeconds) * 2;
            score += timeBonus;
        }
        
        // Bonus de difficulté
        if (gameResult.difficulty) {
            const difficultyMultiplier = {
                easy: 1.0,
                medium: 1.2,
                hard: 1.5
            };
            score = Math.floor(score * (difficultyMultiplier[gameResult.difficulty] || 1.0));
        }
        
        return Math.max(0, score);
    }
    
    // ===== MÉTHODES PUBLIQUES =====
    
    async recordGameResult(gameResult) {
        // Enregistrer dans les stats locales
        this.updateLocalStats(gameResult);
        
        // Mettre à jour l'affichage
        await this.refreshPlayerStats();
        await this.refreshLeaderboardPreview();
        
        // Le score cloud sera géré par la classe Game via neonClient
    }
    
    async onCloudLogin() {
        // Appelé quand l'utilisateur se connecte au cloud
        await this.refreshLeaderboardPreview();
        await this.refreshPlayerStats();
    }
    
    async onCloudLogout() {
        // Appelé quand l'utilisateur se déconnecte du cloud
        this.showOfflineMode();
    }
}

// Rendre la classe disponible globalement
if (typeof window !== 'undefined') {
    window.LeaderboardManager = LeaderboardManager;
}