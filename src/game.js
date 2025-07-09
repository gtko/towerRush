import './modern-style.css';
import { Game } from './core/Game.js';
import { preloadAssets } from './assets.js';

let game;
window.addEventListener('load', async () => {
    // Précharger tous les assets avant de démarrer le jeu
    console.log('Préchargement des assets...');
    await preloadAssets();
    
    // Créer l'instance du jeu
    game = new Game();
    window.game = game;
});