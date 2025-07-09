import '../homepage-style.css';
import { convertAllImagesToPicture } from './utils/picture.js';

// Convertir toutes les images en éléments picture au chargement
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si les formats WebP/AVIF existent avant de convertir
  const checkFormats = async () => {
    try {
      // Tester si les fichiers WebP/AVIF ont été générés
      const testImage = '/assets/logo.webp';
      const response = await fetch(testImage, { method: 'HEAD' });
      
      if (response.ok) {
        // Les formats optimisés existent, convertir les images
        convertAllImagesToPicture();
        console.log('Images converties en éléments picture avec formats modernes');
      } else {
        console.log('Formats optimisés non trouvés, utilisation des images originales');
      }
    } catch (error) {
      console.log('Utilisation des images originales');
    }
  };
  
  checkFormats();
});

// Gestion du menu hamburger
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Fermer le menu quand on clique sur un lien
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }

    // Effet de scroll pour la navbar
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Animation de parallax pour le hero
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = hero.querySelector('.hero-background');
            if (parallax) {
                parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }

    // Smooth scroll pour les ancres
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Observer pour les animations au scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observer les éléments avec animation
    document.querySelectorAll('.animate-fade-in, .animate-slide-in, .animate-slide-up').forEach(el => {
        observer.observe(el);
    });
});