// Utilitaire pour charger les images avec fallback automatique
export async function loadImage(src, options = {}) {
  const { width, height, format = 'webp' } = options;
  
  // Si vite-imagetools est disponible, on peut utiliser les paramètres de requête
  let imageSrc = src;
  const params = new URLSearchParams();
  
  if (format) params.append('format', format);
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  
  const queryString = params.toString();
  if (queryString && import.meta.env.DEV) {
    imageSrc = `${src}?${queryString}`;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback vers le format original si le format moderne échoue
      if (queryString) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = reject;
        fallbackImg.src = src;
      } else {
        reject(new Error(`Failed to load image: ${src}`));
      }
    };
    
    img.src = imageSrc;
  });
}

// Fonction pour obtenir le srcset pour les images responsive
export function getImageSrcSet(src, sizes = [768, 1280, 1920]) {
  return sizes.map(size => `${src}?w=${size}&format=webp ${size}w`).join(', ');
}

// Fonction pour détecter le support des formats modernes
export async function detectImageFormatSupport() {
  const formats = {
    webp: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
    avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A==',
  };
  
  const support = {};
  
  for (const [format, testImage] of Object.entries(formats)) {
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = testImage;
      });
      support[format] = true;
    } catch {
      support[format] = false;
    }
  }
  
  return support;
}

// Cache pour éviter de recharger les mêmes images
const imageCache = new Map();

export function getCachedImage(src) {
  return imageCache.get(src);
}

export function cacheImage(src, img) {
  imageCache.set(src, img);
}