// Reads an image file and returns a smaller data URL (keeps the aspect ratio).
// PNG keeps transparency, which logos often need; photos use JPEG.
export function compressImage(file, { maxWidth = 480, maxHeight = 600, type = 'image/jpeg', quality = 0.88 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = event => {
      const img = new Image();
      img.onerror = () => reject(new Error('This file is not an image we can read.'));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(type, quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
