import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  primary: '#006AFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
  red600: '#DC2626',
};

export function CommentPhotoPicker({ maxPhotos = 5, onPhotosSelected }) {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultiple: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.slice(0, maxPhotos - selectedPhotos.length);
      const combined = [...selectedPhotos, ...newPhotos];
      setSelectedPhotos(combined);
      onPhotosSelected(combined);
    }
  }, [selectedPhotos, maxPhotos, onPhotosSelected]);

  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      const newPhotos = [result.assets[0]];
      const combined = [...selectedPhotos, ...newPhotos];
      setSelectedPhotos(combined);
      onPhotosSelected(combined);
    }
  }, [selectedPhotos, onPhotosSelected]);

  const removePhoto = (index) => {
    const updated = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(updated);
    onPhotosSelected(updated);
  };

  return (
    <>
      {/* Photo Grid */}
      {selectedPhotos.length > 0 && (
        <View style={styles.photoGrid}>
          {selectedPhotos.map((photo, idx) => (
            <View key={idx} style={styles.photoItem}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoImage}
              />
              <TouchableOpacity
                onPress={() => removePhoto(idx)}
                style={styles.photoRemoveButton}
              >
                <Text style={styles.photoRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Button */}
      {selectedPhotos.length < maxPhotos && (
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={styles.addPhotoButton}
        >
          <Text style={styles.addPhotoButtonText}>
            Add Photo ({selectedPhotos.length}/{maxPhotos})
          </Text>
        </TouchableOpacity>
      )}

      {/* Photo Source Picker */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Add Photo</Text>
            
            <TouchableOpacity
              onPress={() => {
                setShowPicker(false);
                takePhoto();
              }}
              style={styles.pickerOption}
            >
              <Text style={styles.pickerOptionIcon}>[Camera]</Text>
              <Text style={styles.pickerOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowPicker(false);
                pickImage();
              }}
              style={styles.pickerOption}
            >
              <Text style={styles.pickerOptionIcon}>[Gallery]</Text>
              <Text style={styles.pickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPicker(false)}
              style={styles.pickerCancelButton}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function CommentThread({ comments, onAddComment, isLoading = false }) {
  const [replyTo, setReplyTo] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!commentText.trim() && photos.length === 0) return;

    setSubmitting(true);
    try {
      const photoUris = photos.map((p) => p.uri);
      await onAddComment({
        text: commentText || '(Photo only)',
        photos: photoUris,
        replyToId: replyTo,
      });
      setCommentText('');
      setPhotos([]);
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  }, [commentText, photos, replyTo, onAddComment]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Comments List */}
      <View style={styles.commentsList}>
        {comments && comments.map((comment, idx) => (
          <View key={idx} style={styles.commentItem}>
            <View style={styles.commentHeader}>
              <View>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentTime}>
                  {new Date(comment.timestamp).toLocaleDateString()}
                </Text>
              </View>
              {comment.isInternal && (
                <View style={styles.internalBadge}>
                  <Text style={styles.internalBadgeText}>Internal</Text>
                </View>
              )}
            </View>

            <Text style={styles.commentBody}>{comment.body}</Text>

            {comment.photos && comment.photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.commentPhotosScroll}
              >
                {comment.photos.map((photo, pidx) => (
                  <Image
                    key={pidx}
                    source={{ uri: photo }}
                    style={styles.commentPhoto}
                  />
                ))}
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setReplyTo(comment.id)}>
              <Text style={styles.replyButton}>↩️ Reply</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Reply Indicator */}
      {replyTo && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>Replying to comment</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyBannerClose}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.gray600}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={1000}
          editable={!submitting}
        />

        <CommentPhotoPicker
          maxPhotos={5}
          onPhotosSelected={setPhotos}
        />

        <View style={styles.inputFooter}>
          <Text style={styles.charCount}>
            {commentText.length}/1000
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={(!commentText.trim() && photos.length === 0) || submitting}
            style={[styles.submitButton, ((!commentText.trim() && photos.length === 0) || submitting) && styles.submitButtonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  commentsList: {
    padding: 12,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  commentTime: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 2,
  },
  internalBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  internalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.gray700,
    marginBottom: 8,
  },
  commentPhotosScroll: {
    marginBottom: 8,
  },
  commentPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  replyButton: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  replyBanner: {
    backgroundColor: COLORS.gray50,
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  replyBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  replyBannerClose: {
    fontSize: 16,
    color: COLORS.gray600,
  },
  inputArea: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: COLORS.gray900,
    maxHeight: 100,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  photoItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
  },
  addPhotoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.gray600,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.gray50,
    marginBottom: 10,
  },
  pickerOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  pickerCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  pickerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
  },
});
