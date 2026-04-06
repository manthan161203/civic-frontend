import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compresses an image by resizing it and lowering quality.
 * @param {string} uri - The original image URI.
 * @param {number} width - Target width (default 800).
 * @param {number} compress - Quality 0-1 (default 0.7).
 * @returns {Promise<string>} The compressed image URI.
 */
export const compressImage = async (uri, width = 800, compress = 0.7) => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Image compression failed:', error);
    }
    return uri; // Fallback to original if compression fails
  }
};