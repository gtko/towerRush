import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Configuration pour différents types d'images
const imageConfigs = {
  // Images de grande taille (bannières, backgrounds)
  large: {
    paths: [
      'assets/ImageVitrine/*.png',
      'assets/banniere.png',
      'assets/background.png',
      'assets/logo.png',
      'public/banniere.png',
      'public/logo.png',
      'public/favicon.png'
    ],
    formats: {
      webp: { quality: 75, effort: 6, smartSubsample: true },
      avif: { quality: 65, effort: 6 },
      png: { quality: 80, compressionLevel: 9 }
    }
  },
  // Sprites de jeu (plus petits, besoin de qualité)
  sprites: {
    paths: [
      'assets/Buildings/**/*.png',
      'assets/Factions/**/*.png',
      'assets/Effects/**/*.png',
      'assets/Decorations/**/*.png',
      'assets/Terrain/**/*.png'
    ],
    formats: {
      webp: { quality: 85, effort: 4, alphaQuality: 100 },
      png: { quality: 90, compressionLevel: 9 }
    }
  }
};

async function getFilesFromPattern(pattern) {
  const { glob } = await import('glob');
  const fullPattern = path.join(projectRoot, pattern);
  return glob(fullPattern);
}

async function optimizeImage(inputPath, config) {
  const dir = path.dirname(inputPath);
  const filename = path.basename(inputPath);
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);
  
  console.log(`\n📸 Processing: ${path.relative(projectRoot, inputPath)}`);
  
  try {
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size;
    console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);
    
    const results = [];
    
    // Process each format
    for (const [format, options] of Object.entries(config.formats)) {
      if (format === 'png' && ext.toLowerCase() === '.png') {
        // Optimize PNG in place
        const tempPath = inputPath + '.tmp';
        await sharp(inputPath)
          .png(options)
          .toFile(tempPath);
        
        const tempStats = await fs.stat(tempPath);
        const tempSize = tempStats.size;
        
        if (tempSize < originalSize) {
          await fs.rename(tempPath, inputPath);
          const reduction = ((originalSize - tempSize) / originalSize * 100).toFixed(1);
          console.log(`   ✅ PNG optimized: ${(tempSize / 1024).toFixed(1)} KB (-${reduction}%)`);
          results.push({ format: 'png', size: tempSize, saved: true });
        } else {
          await fs.unlink(tempPath);
          console.log(`   ⏭️  PNG: kept original (optimization would increase size)`);
          results.push({ format: 'png', size: originalSize, saved: false });
        }
      } else if (format !== 'png') {
        // Convert to other formats
        const outputPath = path.join(dir, `${nameWithoutExt}.${format}`);
        
        await sharp(inputPath)
          [format](options)
          .toFile(outputPath);
        
        const outputStats = await fs.stat(outputPath);
        const outputSize = outputStats.size;
        
        if (outputSize < originalSize) {
          const reduction = ((originalSize - outputSize) / originalSize * 100).toFixed(1);
          console.log(`   ✅ ${format.toUpperCase()}: ${(outputSize / 1024).toFixed(1)} KB (-${reduction}%)`);
          results.push({ format, size: outputSize, saved: true });
        } else {
          await fs.unlink(outputPath);
          console.log(`   ❌ ${format.toUpperCase()}: skipped (would be larger than original)`);
          results.push({ format, size: outputSize, saved: false });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting smart image optimization...\n');
  console.log('📋 This script will:');
  console.log('   - Optimize PNG files in place');
  console.log('   - Create WebP/AVIF versions only if smaller');
  console.log('   - Skip conversions that increase file size\n');
  
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let filesProcessed = 0;
  let filesOptimized = 0;
  
  for (const [category, config] of Object.entries(imageConfigs)) {
    console.log(`\n🏷️  Processing ${category} images...`);
    console.log('━'.repeat(50));
    
    for (const pattern of config.paths) {
      const files = await getFilesFromPattern(pattern);
      
      for (const file of files) {
        const stats = await fs.stat(file);
        totalOriginalSize += stats.size;
        filesProcessed++;
        
        const results = await optimizeImage(file, config);
        
        if (results.some(r => r.saved)) {
          filesOptimized++;
          // Calculate the best saved size
          const savedResults = results.filter(r => r.saved);
          const bestSize = Math.min(...savedResults.map(r => r.size));
          totalOptimizedSize += bestSize;
        } else {
          totalOptimizedSize += stats.size;
        }
      }
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Optimization Summary:');
  console.log('═'.repeat(50));
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files optimized: ${filesOptimized}`);
  console.log(`Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Reduction: ${((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1)}%`);
  console.log('\n✨ Optimization complete!');
}

// Run the script
main().catch(console.error);