/**
 * Утилита для сжатия и обработки изображений на клиенте перед сохранением.
 * Поддерживает загрузку с любых устройств (телефон, планшет, ПК),
 * пережимает тяжелые фотографии из галереи или камеры (10-20 МБ)
 * в легкий, четкий JPEG (< 100 КБ).
 */
export async function processImageFile(file: File, maxDimension = 1000, quality = 0.85): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выбранный файл не является изображением');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось декодировать изображение'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Масштабируем до максимального допустимого размера с сохранением пропорций
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не удалось создать контекст рисования'));
          return;
        }

        // Чистый рендеринг изображения
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Экспортируем в сжатый JPEG DataURL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
