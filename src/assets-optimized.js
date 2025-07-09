// Import avec vite-imagetools pour formats optimisés
// Building sprites - Format PNG uniquement car ce sont des sprites de jeu
import blueHouse1 from '../assets/Buildings/Blue Buildings/House1.png';
import blueHouse2 from '../assets/Buildings/Blue Buildings/House2.png';
import blueHouse3 from '../assets/Buildings/Blue Buildings/House3.png';
import blueTower from '../assets/Buildings/Blue Buildings/Tower.png';
import blueCastle from '../assets/Buildings/Blue Buildings/Castle.png';

import redHouse1 from '../assets/Buildings/Red Buildings/House1.png';
import redHouse2 from '../assets/Buildings/Red Buildings/House2.png';
import redHouse3 from '../assets/Buildings/Red Buildings/House3.png';
import redTower from '../assets/Buildings/Red Buildings/Tower.png';
import redCastle from '../assets/Buildings/Red Buildings/Castle.png';

import blackHouse1 from '../assets/Buildings/Black Buildings/House1.png';
import blackHouse2 from '../assets/Buildings/Black Buildings/House2.png';
import blackHouse3 from '../assets/Buildings/Black Buildings/House3.png';
import blackTower from '../assets/Buildings/Black Buildings/Tower.png';
import blackCastle from '../assets/Buildings/Black Buildings/Castle.png';

import yellowHouse1 from '../assets/Buildings/Yellow Buildings/House1.png';
import yellowHouse2 from '../assets/Buildings/Yellow Buildings/House2.png';
import yellowHouse3 from '../assets/Buildings/Yellow Buildings/House3.png';
import yellowTower from '../assets/Buildings/Yellow Buildings/Tower.png';
import yellowCastle from '../assets/Buildings/Yellow Buildings/Castle.png';

import stoneHouse1 from '../assets/Buildings/Stone Buildings/House1.png';
import stoneHouse2 from '../assets/Buildings/Stone Buildings/House2.png';
import stoneHouse3 from '../assets/Buildings/Stone Buildings/House3.png';
import stoneTower from '../assets/Buildings/Stone Buildings/Tower.png';
import stoneCastle from '../assets/Buildings/Stone Buildings/Castle.png';

// Unit sprites - PNG seulement
import warriorBlue from '../assets/Factions/Knights/Troops/Warrior/Blue/Warrior_Blue.png';
import warriorRed from '../assets/Factions/Knights/Troops/Warrior/Red/Warrior_Red.png';
import warriorPurple from '../assets/Factions/Knights/Troops/Warrior/Purple/Warrior_Purple.png';
import warriorYellow from '../assets/Factions/Knights/Troops/Warrior/Yellow/Warrior_Yellow.png';
import warriorGreen from '../assets/Factions/Knights/Troops/Warrior/Green/Warrior_Green.png';

// Combat effects - PNG seulement
import fireEffect from '../assets/Effects/Fire/Fire.png';
import explosionEffect from '../assets/Effects/Explosion/Explosions.png';

// Terrain decorations - PNG seulement
import tree from '../assets/Resources/Trees/Tree.png';
import rock from '../assets/Terrain/Water/Rocks/Rocks_01.png';
import bush from '../assets/Decorations/Bushes/Bushe1.png';

// Background
import backgroundUrl from '../assets/background.png';

// Audio
import medievalMusic from '../assets/Sounds/medieval.mp3';
import irishMusic from '../assets/Sounds/irish.mp3';

// Images pour la page d'accueil
import logoUrl from '../assets/logo.png';
import paysantouroiUrl from '../assets/ImageVitrine/paysantouroi.png';
import evolutionUrl from '../assets/ImageVitrine/evolution.png';
import attaqueUrl from '../assets/ImageVitrine/attaque.png';
import banniereVerticalUrl from '../assets/ImageVitrine/banniere_vertical.png';

export const buildingAssets = {
  'Blue Buildings': {
    house1: blueHouse1,
    house2: blueHouse2,
    house3: blueHouse3,
    tower: blueTower,
    castle: blueCastle
  },
  'Red Buildings': {
    house1: redHouse1,
    house2: redHouse2,
    house3: redHouse3,
    tower: redTower,
    castle: redCastle
  },
  'Black Buildings': {
    house1: blackHouse1,
    house2: blackHouse2,
    house3: blackHouse3,
    tower: blackTower,
    castle: blackCastle
  },
  'Yellow Buildings': {
    house1: yellowHouse1,
    house2: yellowHouse2,
    house3: yellowHouse3,
    tower: yellowTower,
    castle: yellowCastle
  },
  'Stone Buildings': {
    house1: stoneHouse1,
    house2: stoneHouse2,
    house3: stoneHouse3,
    tower: stoneTower,
    castle: stoneCastle
  }
};

export const unitAssets = {
  player: warriorBlue,
  enemy: warriorRed,
  enemy2: warriorPurple,
  enemy3: warriorYellow,
  neutral: warriorGreen
};

export const effectAssets = {
  fire: fireEffect,
  explosion: explosionEffect
};

export const decorationAssets = {
  tree: tree,
  rock: rock,
  bush: bush
};

export const otherAssets = {
  background: backgroundUrl,
  music: {
    medieval: medievalMusic,
    irish: irishMusic
  }
};

// Images optimisées pour la page d'accueil
export const optimizedImages = {
  logo: logoUrl,
  paysantouroi: paysantouroiUrl,
  evolution: evolutionUrl,
  attaque: attaqueUrl,
  banniereVertical: banniereVerticalUrl
};

// Fonction pour obtenir l'URL de fallback d'une image
export function getFallbackUrl(imageData) {
  return imageData;
}

// Fonction pour précharger toutes les images
export async function preloadAssets() {
  const allImages = [
    ...Object.values(buildingAssets).flatMap(buildings => Object.values(buildings)),
    ...Object.values(unitAssets),
    ...Object.values(effectAssets),
    ...Object.values(decorationAssets),
    getFallbackUrl(backgroundUrl)
  ];

  const loadPromises = allImages.map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  });

  try {
    await Promise.all(loadPromises);
    console.log('Tous les assets ont été préchargés avec succès');
  } catch (error) {
    console.error('Erreur lors du préchargement des assets:', error);
  }
}