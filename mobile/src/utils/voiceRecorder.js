/**
 * Multilingual Voice Reporting Utility
 * =====================================
 * Audio recording for citizen issue reports with server-side transcription.
 * Records audio using expo-av, then sends to the backend /issues/transcribe
 * endpoint for AI-powered speech-to-text in any supported Indian language.
 *
 * Usage:
 *   import { useVoiceRecorder } from '../utils/voiceRecorder';
 *   const { isRecording, recordingDuration, startRecording, stopRecording, transcribedText } = useVoiceRecorder();
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { BASE_URL } from '../api/client';
import * as SecureStore from '../utils/secureStoreShim';
import logger from './logger';

/**
 * Custom hook for audio recording + server-side transcription.
 *
 * @param {Object} options
 * @param {string} options.language - Language hint for transcription (default 'hi')
 * @param {Function} options.onTranscription - Called with transcribed text
 * @param {Function} options.onError - Called on error
 * @returns {{ isRecording, recordingDuration, startRecording, stopRecording, transcribedText, isTranscribing }}
 */
export function useVoiceRecorder({ language = 'hi', onTranscription, onError } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const { Audio } = await import('expo-av');
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for voice reporting.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      setTranscribedText('');

      // Duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);

      logger.info('VoiceRecorder', `Recording started (lang=${language})`);
    } catch (err) {
      logger.error('VoiceRecorder', 'Failed to start recording', err);
      if (onError) onError(err);
    }
  }, [language, onError]);

  const stopRecording = useCallback(async () => {
    try {
      clearInterval(timerRef.current);
      const recording = recordingRef.current;
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) {
        logger.warn('VoiceRecorder', 'No recording URI found');
        return;
      }

      logger.info('VoiceRecorder', `Recording stopped, URI: ${uri}`);

      // Send to backend for transcription
      setIsTranscribing(true);
      try {
        const token = await SecureStore.getItemAsync('access_token');
        const formData = new FormData();
        formData.append('audio', {
          uri,
          type: 'audio/m4a',
          name: 'voice_report.m4a',
        });
        formData.append('language', language);

        const response = await fetch(`${BASE_URL}/issues/transcribe`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Transcription failed: ${response.status}`);
        }

        const data = await response.json();
        const text = data.text || '';
        setTranscribedText(text);
        if (onTranscription) onTranscription(text);
        logger.info('VoiceRecorder', `Transcription complete: ${text.slice(0, 50)}...`);
      } catch (err) {
        logger.error('VoiceRecorder', 'Transcription failed', err);
        if (onError) onError(err);
      } finally {
        setIsTranscribing(false);
      }
    } catch (err) {
      logger.error('VoiceRecorder', 'Failed to stop recording', err);
      setIsRecording(false);
      if (onError) onError(err);
    }
  }, [language, onTranscription, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    transcribedText,
    startRecording,
    stopRecording,
  };
}

/**
 * Format recording duration as MM:SS.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Supported transcription languages.
 */
export const TRANSCRIBE_LANGUAGES = {
  'English': 'en',
  'Hindi': 'hi',
  'Marathi': 'mr',
  'Gujarati': 'gu',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Kannada': 'kn',
  'Bengali': 'bn',
  'Punjabi': 'pa',
  'Malayalam': 'ml',
};

export default useVoiceRecorder;
