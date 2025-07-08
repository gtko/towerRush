/**
 * Client Neon PostgreSQL avec serverless driver
 * Gère les profils, scores et authentification
 */

class NeonClient {
    constructor() {
        this.sql = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.connectionString = 'postgresql://neondb_owner:npg_p3rMxQX4YDqO@ep-small-violet-a93iwuzt-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require';
        this.initializeClient();
    }

    async initializeClient() {
        try {
            // Dynamically import Neon driver
            const { neon } = await import('https://cdn.skypack.dev/@neondatabase/serverless');
            this.sql = neon(this.connectionString);
            this.isInitialized = true;
            console.log('Neon client initialisé avec succès');
        } catch (error) {
            console.error('Erreur initialisation Neon:', error);
            throw new Error('Impossible de se connecter à la base de données');
        }
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initializeClient();
        }
    }

    // ===== GESTION DES PROFILS =====

    async createAnonymousProfile(displayName, avatarEmoji) {
        await this.ensureInitialized();
        try {
            const anonymousToken = this.generateAnonymousToken();
            
            const result = await this.sql`
                INSERT INTO profiles (display_name, avatar_emoji, anonymous_token)
                VALUES (${displayName}, ${avatarEmoji}, ${anonymousToken})
                RETURNING id, display_name, avatar_emoji, anonymous_token, created_at
            `;

            if (result.length > 0) {
                this.currentUser = result[0];
                return result[0];
            }
            throw new Error('Échec création du profil');
        } catch (error) {
            console.error('Erreur création profil anonyme:', error);
            throw error;
        }
    }

    async createAccountProfile(displayName, avatarEmoji, email, password) {
        await this.ensureInitialized();
        try {
            const passwordHash = await this.hashPassword(password);
            
            const result = await this.sql`
                INSERT INTO profiles (display_name, avatar_emoji, user_email, password_hash)
                VALUES (${displayName}, ${avatarEmoji}, ${email}, ${passwordHash})
                RETURNING id, display_name, avatar_emoji, user_email, created_at
            `;

            if (result.length > 0) {
                this.currentUser = result[0];
                return result[0];
            }
            throw new Error('Échec création du compte');
        } catch (error) {
            if (error.message.includes('duplicate key')) {
                throw new Error('Un compte avec cet email existe déjà');
            }
            console.error('Erreur création compte:', error);
            throw error;
        }
    }

    async loginWithEmail(email, password) {
        await this.ensureInitialized();
        try {
            const result = await this.sql`
                SELECT id, display_name, avatar_emoji, user_email, password_hash, 
                       total_games, total_wins, best_score, created_at
                FROM profiles 
                WHERE user_email = ${email}
            `;

            if (result.length === 0) {
                throw new Error('Aucun compte trouvé avec cet email');
            }

            const user = result[0];
            const isValid = await this.verifyPassword(password, user.password_hash);
            
            if (!isValid) {
                throw new Error('Mot de passe incorrect');
            }

            this.currentUser = user;
            return {
                id: user.id,
                display_name: user.display_name,
                avatar_emoji: user.avatar_emoji,
                user_email: user.user_email,
                total_games: user.total_games,
                total_wins: user.total_wins,
                best_score: user.best_score,
                created_at: user.created_at
            };
        } catch (error) {
            console.error('Erreur connexion:', error);
            throw error;
        }
    }

    async loginWithToken(anonymousToken) {
        await this.ensureInitialized();
        try {
            const result = await this.sql`
                SELECT id, display_name, avatar_emoji, anonymous_token,
                       total_games, total_wins, best_score, created_at
                FROM profiles 
                WHERE anonymous_token = ${anonymousToken}
            `;

            if (result.length === 0) {
                throw new Error('Profil anonyme introuvable');
            }

            this.currentUser = result[0];
            return result[0];
        } catch (error) {
            console.error('Erreur connexion anonyme:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        await this.ensureInitialized();
        if (!this.currentUser) {
            throw new Error('Aucun utilisateur connecté');
        }

        try {
            const result = await this.sql`
                UPDATE profiles 
                SET display_name = ${profileData.displayName},
                    avatar_emoji = ${profileData.avatarEmoji},
                    updated_at = NOW()
                WHERE id = ${this.currentUser.id}
                RETURNING id, display_name, avatar_emoji, updated_at
            `;

            if (result.length > 0) {
                this.currentUser = { ...this.currentUser, ...result[0] };
                return result[0];
            }
            throw new Error('Échec mise à jour du profil');
        } catch (error) {
            console.error('Erreur mise à jour profil:', error);
            throw error;
        }
    }

    // ===== GESTION DES SCORES =====

    async saveGameScore(gameData) {
        await this.ensureInitialized();
        if (!this.currentUser) {
            throw new Error('Aucun utilisateur connecté');
        }

        try {
            const result = await this.sql`
                INSERT INTO scores (
                    profile_id, game_mode, difficulty, victory, 
                    duration_seconds, buildings_captured, buildings_lost, players_count
                )
                VALUES (
                    ${this.currentUser.id}, ${gameData.gameMode}, ${gameData.difficulty}, 
                    ${gameData.victory}, ${gameData.durationSeconds}, 
                    ${gameData.buildingsCaptured}, ${gameData.buildingsLost}, ${gameData.playersCount}
                )
                RETURNING id, final_score, created_at
            `;

            // Mettre à jour les statistiques du profil
            await this.updateProfileStats();

            return result[0];
        } catch (error) {
            console.error('Erreur sauvegarde score:', error);
            throw error;
        }
    }

    async updateProfileStats() {
        if (!this.currentUser) return;

        try {
            await this.sql`
                UPDATE profiles 
                SET 
                    total_games = (
                        SELECT COUNT(*) FROM scores WHERE profile_id = ${this.currentUser.id}
                    ),
                    total_wins = (
                        SELECT COUNT(*) FROM scores 
                        WHERE profile_id = ${this.currentUser.id} AND victory = true
                    ),
                    best_score = (
                        SELECT COALESCE(MAX(final_score), 0) FROM scores 
                        WHERE profile_id = ${this.currentUser.id}
                    ),
                    updated_at = NOW()
                WHERE id = ${this.currentUser.id}
            `;
        } catch (error) {
            console.error('Erreur mise à jour stats:', error);
        }
    }

    async getPlayerStats() {
        await this.ensureInitialized();
        if (!this.currentUser) {
            return null;
        }

        try {
            const result = await this.sql`
                SELECT 
                    total_games, total_wins, best_score,
                    CASE 
                        WHEN total_games > 0 THEN ROUND((total_wins::float / total_games::float * 100), 1)
                        ELSE 0 
                    END as win_rate
                FROM profiles 
                WHERE id = ${this.currentUser.id}
            `;

            return result[0] || { total_games: 0, total_wins: 0, best_score: 0, win_rate: 0 };
        } catch (error) {
            console.error('Erreur récupération stats:', error);
            return { total_games: 0, total_wins: 0, best_score: 0, win_rate: 0 };
        }
    }

    // ===== LEADERBOARD =====

    async getLeaderboard(gameMode = 'all', limit = 100) {
        await this.ensureInitialized();
        try {
            let query;
            
            if (gameMode === 'all') {
                query = this.sql`
                    SELECT 
                        p.display_name, p.avatar_emoji,
                        p.total_games, p.total_wins, p.best_score,
                        CASE 
                            WHEN p.total_games > 0 THEN ROUND((p.total_wins::float / p.total_games::float * 100), 1)
                            ELSE 0 
                        END as win_rate,
                        ROW_NUMBER() OVER (ORDER BY p.best_score DESC, p.total_wins DESC) as rank
                    FROM profiles p 
                    WHERE p.total_games > 0
                    ORDER BY p.best_score DESC, p.total_wins DESC
                    LIMIT ${limit}
                `;
            } else {
                query = this.sql`
                    SELECT 
                        p.display_name, p.avatar_emoji,
                        COUNT(s.id) as games_played,
                        COUNT(CASE WHEN s.victory THEN 1 END) as wins,
                        MAX(s.final_score) as best_score,
                        CASE 
                            WHEN COUNT(s.id) > 0 THEN ROUND((COUNT(CASE WHEN s.victory THEN 1 END)::float / COUNT(s.id)::float * 100), 1)
                            ELSE 0 
                        END as win_rate,
                        ROW_NUMBER() OVER (ORDER BY MAX(s.final_score) DESC, COUNT(CASE WHEN s.victory THEN 1 END) DESC) as rank
                    FROM profiles p 
                    LEFT JOIN scores s ON p.id = s.profile_id AND s.game_mode = ${gameMode}
                    WHERE s.id IS NOT NULL
                    GROUP BY p.id, p.display_name, p.avatar_emoji
                    ORDER BY MAX(s.final_score) DESC, COUNT(CASE WHEN s.victory THEN 1 END) DESC
                    LIMIT ${limit}
                `;
            }

            const result = await query;
            return result || [];
        } catch (error) {
            console.error('Erreur récupération leaderboard:', error);
            return [];
        }
    }

    async getPlayerRank(gameMode = 'all') {
        if (!this.currentUser) return null;

        try {
            const leaderboard = await this.getLeaderboard(gameMode, 1000);
            const playerRank = leaderboard.findIndex(player => 
                player.display_name === this.currentUser.display_name
            );
            
            return playerRank >= 0 ? playerRank + 1 : null;
        } catch (error) {
            console.error('Erreur récupération rang:', error);
            return null;
        }
    }

    // ===== UTILITAIRES =====

    generateAnonymousToken() {
        return 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async hashPassword(password) {
        // Simple hash pour démo - en production utiliser bcrypt
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'tower_rush_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(password, hash) {
        const newHash = await this.hashPassword(password);
        return newHash === hash;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    // ===== SYNCHRONISATION AVEC LOCALSTORAGE =====

    syncToLocalStorage() {
        if (this.currentUser) {
            const profileData = {
                name: this.currentUser.display_name,
                avatar: this.currentUser.avatar_emoji,
                cloudId: this.currentUser.id,
                cloudToken: this.currentUser.anonymous_token,
                isCloudSync: true
            };
            localStorage.setItem('towerRushProfile', JSON.stringify(profileData));
        }
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

// Rendre la classe disponible globalement
if (typeof window !== 'undefined') {
    window.NeonClient = NeonClient;
    console.log('NeonClient class registered globally');
}