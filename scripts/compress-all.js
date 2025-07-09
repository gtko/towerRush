import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const MAX_SIZE_KB = 200;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

// Configuration de compression progressive
const configs = [
  { quality: 40, effort: 6 }, // Premier essai
  { quality: 30, effort: 6 }, // Plus agressif
  { quality: 25, effort: 6 }, // Très agressif
  { quality: 20, effort: 6 }, // Maximum compression
];

async function getFileSize(filePath) {
  const stats = await stat(filePath);
  return stats.size;
}

async function compressImage(inputPath, format, config) {
  const sharpInstance = sharp(inputPath);
  
  switch (format) {
    case 'avif':
      return sharpInstance.avif({
        quality: config.quality,
        effort: config.effort,
      });
    case 'webp':
      return sharpInstance.webp({
        quality: config.quality,
        effort: config.effort,
        alphaQuality: Math.min(config.quality + 10, 100),
      });
    case 'png':
      return sharpInstance.png({
        quality: config.quality,
        compressionLevel: 9,
      });
    case 'jpeg':
    case 'jpg':
      return sharpInstance.jpeg({
        quality: config.quality,
        progressive: true,
      });
    default:
      throw new Error(`Format non supporté: ${format}`);
  }
}

async function processImage(filePath) {
  const originalSize = await getFileSize(filePath);
  
  if (originalSize <= MAX_SIZE_BYTES) {
    console.log(`✓ ${filePath.split('/').pop()}: ${Math.round(originalSize / 1024)}KB (OK)`);
    return;
  }

  const ext = extname(filePath).toLowerCase().slice(1);
  const fileName = filePath.split('/').pop();
  const tempPath = filePath + '.tmp';
  
  console.log(`🔄 Compression de ${fileName} (${Math.round(originalSize / 1024)}KB)`);
  
  for (const config of configs) {
    try {
      const compressed = await compressImage(filePath, ext, config);
      const buffer = await compressed.toBuffer();
      
      if (buffer.length <= MAX_SIZE_BYTES) {
        await compressed.toFile(tempPath);
        
        // Remplacer le fichier original
        const { rename } = await import('fs/promises');
        await rename(tempPath, filePath);
        
        const newSize = await getFileSize(filePath);
        const reduction = Math.round((1 - newSize / originalSize) * 100);
        console.log(`✅ ${fileName}: ${Math.round(originalSize / 1024)}KB → ${Math.round(newSize / 1024)}KB (-${reduction}%)`);
        return;
      }
    } catch (error) {
      console.log(`❌ Erreur avec ${fileName} qualité ${config.quality}:`, error.message);
      // Nettoyer le fichier temporaire s'il existe
      try {
        const { unlink } = await import('fs/promises');
        await unlink(tempPath);
      } catch {}
    }
  }
  
  console.log(`⚠️  ${fileName}: Impossible de réduire sous ${MAX_SIZE_KB}KB`);
}

async function processDirectory(dirPath) {
  try {
    const items = await readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dirPath, item.name);
      
      if (item.isDirectory()) {
        await processDirectory(fullPath);
      } else if (item.isFile()) {
        const ext = extname(item.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) {
          await processImage(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Erreur lors du traitement du dossier ${dirPath}:`, error.message);
  }
}

async function main() {
  console.log(`🎯 Compression de toutes les images > ${MAX_SIZE_KB}KB dans dist/\n`);
  
  await processDirectory('./dist');
  
  console.log('\n✨ Compression terminée!');
}

main().catch(console.error);