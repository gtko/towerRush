/**
 * Crée un élément <picture> avec support WebP/AVIF et fallback
 * @param {Object} options - Options de configuration
 * @param {string} options.src - Chemin de base de l'image (sans extension)
 * @param {string} options.alt - Texte alternatif
 * @param {string} options.className - Classes CSS optionnelles
 * @param {boolean} options.lazy - Chargement lazy (true par défaut)
 * @returns {HTMLPictureElement}
 */
export function createPicture({ src, alt = '', className = '', lazy = true }) {
  const picture = document.createElement('picture');
  
  // Extraire le nom de fichier sans extension
  const basePath = src.substring(0, src.lastIndexOf('.')) || src;
  
  // AVIF source
  const avifSource = document.createElement('source');
  avifSource.srcset = `${basePath}.avif`;
  avifSource.type = 'image/avif';
  
  // WebP source
  const webpSource = document.createElement('source');
  webpSource.srcset = `${basePath}.webp`;
  webpSource.type = 'image/webp';
  
  // Fallback image (PNG/JPG)
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  if (className) img.className = className;
  if (lazy) img.loading = 'lazy';
  
  // Ajouter les sources dans l'ordre de préférence
  picture.appendChild(avifSource);
  picture.appendChild(webpSource);
  picture.appendChild(img);
  
  return picture;
}

/**
 * Remplace une balise img par un élément picture avec formats modernes
 * @param {HTMLImageElement} img - L'élément img à remplacer
 */
export function replaceImgWithPicture(img) {
  const picture = createPicture({
    src: img.src,
    alt: img.alt,
    className: img.className,
    lazy: img.loading === 'lazy'
  });
  
  // Copier tous les autres attributs
  Array.from(img.attributes).forEach(attr => {
    if (!['src', 'alt', 'class', 'loading'].includes(attr.name)) {
      picture.querySelector('img').setAttribute(attr.name, attr.value);
    }
  });
  
  img.replaceWith(picture);
}

/**
 * Convertit toutes les images d'un conteneur en éléments picture
 * @param {HTMLElement} container - Le conteneur dans lequel chercher les images
 */
export function convertAllImagesToPicture(container = document) {
  const images = container.querySelectorAll('img[src$=".png"], img[src$=".jpg"], img[src$=".jpeg"]');
  images.forEach(img => {
    // Vérifier si l'image n'est pas déjà dans un picture
    if (img.parentElement.tagName !== 'PICTURE') {
      replaceImgWithPicture(img);
    }
  });
}