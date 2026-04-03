/**
 * Image Compression Utility for Worker Mobile App
 * ================================================
 * Reduces image sizes from 5-10MB to ~200KB before upload
 * Uses expo-image-manipulator to resize and compress
 * 
 * Benefits:
 * - Faster uploads (10x reduction in file size)
 * - Saves cellular data (important for field workers)
 * - Reduces server storage requirements
 * - Minimal quality loss for documentation purposes
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from './logger';

const COMPONENT_NAME = 'ImageCompression';

const COMPRESSION_CONFIG = {
  targetWidth: 800, // Resize to 800px width (maintains aspect ratio)
  quality: 0.75, // JPEG quality (0-1)
  targetSize: 250, // Target output size in KB
};

/**
 * Compress image file before upload
 * Reduces from 5-10MB to ~200KB with minimal quality loss
 * @param {string} imageUri - Local file URI from camera/gallery
 * @returns {Promise<object>} Compressed image {uri, size, originalSize, reduction}
 * @throws {Error} If compression fails
 */
export const ImageCompression = {
  /**
   * Compress a single image
   * @param {string} imageUri - Local file path or URI
   * @returns {Promise<object>} Compressed image details
   */
  compressImage: async (imageUri) => {
    try {
      logger.info(COMPONENT_NAME, `Starting compression: ${imageUri}`);

      // Get original file size
      const originalSize = await _getFileSizeKB(imageUri);
      logger.debug(COMPONENT_NAME, `Original size: ${originalSize}KB`);

      // Resize and compress
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: { width: COMPRESSION_CONFIG.targetWidth },
          },
        ],
        {
          compress: COMPRESSION_CONFIG.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Get compressed file size
      const compressedSize = await _getFileSizeKB(result.uri);
      const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      logger.info(
        COMPONENT_NAME,
        'Image compressed successfully',
        {
          original: `${originalSize}KB`,
          compressed: `${compressedSize}KB`,
          reduction: `${reduction}%`,
        }
      );

      return {
        uri: result.uri,
        size: compressedSize,
        originalSize,
        reduction,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Image compression failed', error);
      throw new Error('Failed to compress image');
    }
  },

  /**
   * Compress multiple images (batch operation)
   * @param {Array<string>} imageUris - Array of image URIs
   * @returns {Promise<Array>} Array of compressed image objects
   */
  compressImageBatch: async (imageUris) => {
    try {
      logger.info(COMPONENT_NAME, `Starting batch compression: ${imageUris.length} images`);

      const compressed = [];
      let totalOriginal = 0;
      let totalCompressed = 0;

      for (const uri of imageUris) {
        try {
          const result = await ImageCompression.compressImage(uri);
          compressed.push(result);
          totalOriginal += result.originalSize;
          totalCompressed += result.size;
        } catch (err) {
          logger.warn(COMPONENT_NAME, `Failed to compress image: ${uri}`, err);
          // Continue with next image instead of failing entire batch
        }
      }

      const totalReduction = Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100);
      logger.info(COMPONENT_NAME, `Batch compression complete: ${compressed.length}/${imageUris.length}`, {
        totalOriginal: `${totalOriginal}KB`,
        totalCompressed: `${totalCompressed}KB`,
        reduction: `${totalReduction}%`,
      });

      return compressed;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Batch compression failed', error);
      return [];
    }
  },

  /**
   * Get total size reduction for a batch
   * @param {Array} compressedImages - Array of compressed image objects
   * @returns {object} Statistics {totalSize, totalOriginal, reduction}
   */
  getBatchStats: (compressedImages) => {
    if (!Array.isArray(compressedImages) || compressedImages.length === 0) {
      return { totalSize: 0, totalOriginal: 0, reduction: 0 };
    }

    const totalSize = compressedImages.reduce((sum, img) => sum + img.size, 0);
    const totalOriginal = compressedImages.reduce((sum, img) => sum + img.originalSize, 0);
    const reduction = totalOriginal > 0 ? Math.round(((totalOriginal - totalSize) / totalOriginal) * 100) : 0;

    return {
      count: compressedImages.length,
      totalSize,
      totalOriginal,
      reduction,
    };
  },

  /**
   * Validate if image meets quality standards before compression
   * @param {string} imageUri - Image URI to validate
   * @returns {Promise<boolean>} True if image is usable
   */
  validateImage: async (imageUri) => {
    try {
      if (!imageUri || typeof imageUri !== 'string') {
        logger.warn(COMPONENT_NAME, 'Invalid image URI provided');
        return false;
      }

      // Check if file exists and is readable
      const size = await _getFileSizeKB(imageUri);
      if (size === 0) {
        logger.warn(COMPONENT_NAME, `Image file is empty: ${imageUri}`);
        return false;
      }

      if (size > 50000) {
        // Warn if over 50MB
        logger.warn(COMPONENT_NAME, `Image file very large (${size}KB)`, imageUri);
      }

      logger.debug(COMPONENT_NAME, `Image validation passed: ${size}KB`);
      return true;
    } catch (error) {
      logger.warn(COMPONENT_NAME, 'Image validation failed', error);
      return false;
    }
  },
};

/**
 * Get file size in KB
 * @private
 * @param {string} fileUri - File URI
 * @returns {Promise<number>} File size in KB
 */
const _getFileSizeKB = async (fileUri) => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return Math.round(blob.size / 1024);
  } catch {
    return 0;
  }
};
