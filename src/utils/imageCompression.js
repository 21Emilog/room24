/**
 * Compress and resize image file for optimal upload and storage
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeKB = 500
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try compression at specified quality
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // If still too large, reduce quality further
        let currentQuality = quality;
        while (compressedDataUrl.length / 1024 > maxSizeKB && currentQuality > 0.1) {
          currentQuality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        }

        resolve(compressedDataUrl);
      };

      img.onerror = (error) => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = (error) => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Get file size in KB from base64 string
 */
export function getBase64SizeKB(base64String) {
  const stringLength = base64String.length - 'data:image/jpeg;base64,'.length;
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
  return sizeInBytes / 1024;
}
