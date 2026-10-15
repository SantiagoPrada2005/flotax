/**
 * Opciones de compresión y normalización de imágenes para el flujo pericial KYC.
 */
export interface CompressionOptions {
  /**
   * Ancho máximo en píxeles (por defecto 1600px, óptimo para OCR y lectura nítida).
   */
  maxWidth?: number;
  /**
   * Alto máximo en píxeles (por defecto 1600px).
   */
  maxHeight?: number;
  /**
   * Calidad de compresión JPEG entre 0.1 y 1.0 (por defecto 0.85).
   */
  quality?: number;
  /**
   * Recorte opcional normalizado [0, 1] dentro del encuadre del visor.
   */
  cropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CompressionResult {
  base64: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Comprime y normaliza cualquier origen de imagen (File, Blob, VideoFrame o Base64)
 * a un formato JPEG de alta eficiencia y peso ligero (<350 KB) en el cliente.
 * 
 * Elimina la sobrecarga de fotos pesadas de cámaras de 48+ MP y previene fallos por payload.
 */
export async function comprimirYNormalizarImagen(
  source: File | Blob | HTMLVideoElement | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85, cropRect } = options;

  let imgSource: CanvasImageSource;
  let sourceWidth = 0;
  let sourceHeight = 0;

  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    sourceWidth = source.videoWidth;
    sourceHeight = source.videoHeight;
    imgSource = source;
  } else if (typeof source === 'string') {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo decodificar el archivo de imagen.'));
      img.src = source;
    });
    sourceWidth = img.naturalWidth || img.width;
    sourceHeight = img.naturalHeight || img.height;
    imgSource = img;
  } else if (source instanceof Blob) {
    const img = new Image();
    const url = URL.createObjectURL(source);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo decodificar el archivo de imagen.'));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    sourceWidth = img.naturalWidth || img.width;
    sourceHeight = img.naturalHeight || img.height;
    imgSource = img;
  } else {
    throw new Error('Origen de imagen no soportado.');
  }

  if (sourceWidth === 0 || sourceHeight === 0) {
    throw new Error('Dimensiones de imagen inválidas para compresión.');
  }

  // 1. Determinar coordenadas de origen (recorte si se especificó cropRect)
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (cropRect) {
    sx = Math.max(0, Math.floor(cropRect.x * sourceWidth));
    sy = Math.max(0, Math.floor(cropRect.y * sourceHeight));
    sw = Math.min(sourceWidth - sx, Math.floor(cropRect.width * sourceWidth));
    sh = Math.min(sourceHeight - sy, Math.floor(cropRect.height * sourceHeight));
  }

  // 2. Calcular dimensiones de destino proporcionales
  let targetWidth = sw;
  let targetHeight = sh;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  // 3. Renderizar en Canvas Offscreen
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('No fue posible inicializar el contexto 2D para compresión.');
  }

  // Fondo neutro blanco para evitar artefactos en imágenes con transparencia
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Calidad máxima de interpolación bicúbica
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(imgSource, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  // 4. Exportar como Blob y Data URL en JPEG ligero
  return new Promise<CompressionResult>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Fallo al exportar el canvas a JPEG.'));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve({
            base64,
            blob,
            width: targetWidth,
            height: targetHeight,
            sizeBytes: blob.size,
          });
        };
        reader.onerror = () => reject(new Error('Fallo al serializar la imagen a Base64.'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      quality
    );
  });
}
