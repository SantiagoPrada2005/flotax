import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();

const IMAGES_TO_CONVERT = [
  // Landing
  { input: 'public/images/landing/category-carros.jpg', output: 'public/images/landing/category-carros.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/landing/category-motos.jpg', output: 'public/images/landing/category-motos.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/landing/feat-honda-cb650r.jpg', output: 'public/images/landing/feat-honda-cb650r.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/landing/feat-kia-sportage.jpg', output: 'public/images/landing/feat-kia-sportage.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/landing/feat-toyota-corolla.jpg', output: 'public/images/landing/feat-toyota-corolla.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/landing/hero-vehicle.jpg', output: 'public/images/landing/hero-vehicle.webp', maxWidth: 1200, quality: 82 },

  // Vehiculos
  { input: 'public/images/vehiculos/white-suv.jpg', output: 'public/images/vehiculos/white-suv.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/vehiculos/dark-coupe.jpg', output: 'public/images/vehiculos/dark-coupe.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/vehiculos/mazda-cx30.png', output: 'public/images/vehiculos/mazda-cx30.webp', maxWidth: 1200, quality: 85, transparent: true },
  { input: 'public/images/vehiculos/sedan-premier.png', output: 'public/images/vehiculos/sedan-premier.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/vehiculos/yamaha-mt03.png', output: 'public/images/vehiculos/yamaha-mt03.webp', maxWidth: 1200, quality: 82 },
  { input: 'public/images/vehiculos/scooter-pro.png', output: 'public/images/vehiculos/scooter-pro.webp', maxWidth: 1200, quality: 82 },

  // Instructions
  { input: 'public/instructions/ios-step-1-poster.jpg', output: 'public/instructions/ios-step-1-poster.webp', maxWidth: 800, quality: 80 },
  { input: 'public/instructions/ios-step-2-poster.jpg', output: 'public/instructions/ios-step-2-poster.webp', maxWidth: 800, quality: 80 },
  { input: 'public/instructions/ios-step-3-poster.jpg', output: 'public/instructions/ios-step-3-poster.webp', maxWidth: 800, quality: 80 },
];

async function main() {
  console.log('--- Iniciando Optimización de Imágenes con Sharp ---');
  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const item of IMAGES_TO_CONVERT) {
    const inputPath = path.join(ROOT_DIR, item.input);
    const outputPath = path.join(ROOT_DIR, item.output);

    try {
      const inStat = await fs.stat(inputPath);
      totalOriginal += inStat.size;

      let pipeline = sharp(inputPath);
      const metadata = await pipeline.metadata();

      if (metadata.width && metadata.width > item.maxWidth) {
        pipeline = pipeline.resize({
          width: item.maxWidth,
          withoutEnlargement: true,
          fit: 'inside',
        });
      }

      pipeline = pipeline.webp({
        quality: item.quality,
        effort: 6,
        alphaQuality: 90,
      });

      await pipeline.toFile(outputPath);

      const outStat = await fs.stat(outputPath);
      totalOptimized += outStat.size;

      const savingPercent = ((1 - outStat.size / inStat.size) * 100).toFixed(1);
      console.log(`✓ ${path.basename(item.input)} (${(inStat.size / 1024).toFixed(1)} KB) -> ${path.basename(item.output)} (${(outStat.size / 1024).toFixed(1)} KB) [-${savingPercent}%]`);
    } catch (err) {
      console.error(`Error procesando ${item.input}:`, err);
    }
  }

  const overallSaving = ((1 - totalOptimized / totalOriginal) * 100).toFixed(1);
  console.log('----------------------------------------------------');
  console.log(`Total Original: ${(totalOriginal / 1024).toFixed(1)} KB`);
  console.log(`Total Optimizado: ${(totalOptimized / 1024).toFixed(1)} KB`);
  console.log(`Ahorro Global: -${overallSaving}% de payload transferido!`);
}

main();
