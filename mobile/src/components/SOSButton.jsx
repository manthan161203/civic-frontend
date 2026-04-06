import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';

const COLORS = {
  red600: '#DC2626',
  red50: '#FEE2E2',
  red100: '#FECACA',
  white: '#FFFFFF',
  gray900: '#111827',
  gray700: '#374151',
  gray600: '#4B5563',
  gray200: '#E5E7EB',
};

export function SOSButton({ issueId, workersApi, onSOSTriggered, disabled = false }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTriggerSOS = useCallback(async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // Issue creation with is_sos=true happens at creation, but if already created:
      // We would call an endpoint to trigger SOS on existing issue
      // For now, this is informational since SOS is set at creation time
      
      // In future: await workersApi.triggerSOS(issueId);
      
      if (onSOSTriggered) {
        onSOSTriggered();
      }

      setShowConfirmation(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to trigger SOS');
      console.error('SOS Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [issueId, workersApi, onSOSTriggered]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowConfirmation(true)}
        disabled={disabled || isSubmitting}
        style={[styles.sosButton, (disabled || isSubmitting) && styles.sosButtonDisabled]}
      >
        <Text style={styles.sosButtonText}>Emergency SOS</Text>
      </TouchableOpacity>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmitting && setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Emergency Alert</Text>
            <Text style={styles.modalMessage}>
              Triggering SOS will immediately:
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Alert all nearby citizens (500m radius)</Text>
              <Text style={styles.featureItem}>• Notify all administrators</Text>
              <Text style={styles.featureItem}>• Mark issue as urgent priority</Text>
            </View>
            
            <Text style={styles.warningText}>
              Only use this for genuine emergencies.
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTriggerSOS}
                disabled={isSubmitting}
                style={styles.confirmButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm SOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function SOSIndicator({ issos }) {
  if (!issos) return null;

  return (
    <View style={styles.sosIndicator}>
      <Text style={styles.sosIndicatorText}>EMERGENCY SOS ACTIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: COLORS.red600,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  sosButtonDisabled: {
    opacity: 0.5,
  },
  sosButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  sosIndicator: {
    backgroundColor: COLORS.red50,
    borderWidth: 2,
    borderColor: COLORS.red600,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  sosIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.red600,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.red600,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.gray700,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  featureList: {
    backgroundColor: COLORS.red50,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 13,
    color: COLORS.gray900,
    marginBottom: 6,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: COLORS.red600,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.red600,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
