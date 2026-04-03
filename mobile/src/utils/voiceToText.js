/**
 * Voice-to-Text Utility
 * =====================
 * Provides speech-to-text capability for worker field notes
 * using react-native-voice with lazy-loading to avoid bundling issues.
 *
 * Usage:
 *   import { useVoiceToText } from '../utils/voiceToText';
 *   const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceToText();
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import logger from './logger';

/**
 * Custom hook for voice-to-text recording/transcription.
 *
 * Uses react-native-voice when available.
 *
 * @param {Object} options
 * @param {string} options.language - BCP-47 locale (default 'en-IN')
 * @param {Function} options.onResult - Called with final transcript text
 * @param {Function} options.onError - Called on recognition error
 * @returns {{ isListening, transcript, startListening, stopListening, resetTranscript }}
 */
export function useVoiceToText({ language = 'en-IN', onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const voiceRef = useRef(null);
  const listenerRef = useRef([]);

  // Lazy-load react-native-voice if available
  const getVoice = useCallback(async () => {
    if (voiceRef.current) return voiceRef.current;
    try {
      const Voice = (await import('@react-native-voice/voice')).default;
      voiceRef.current = Voice;
      return Voice;
    } catch {
      logger.warn('VoiceToText', '@react-native-voice/voice not installed');
      return null;
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      const Voice = await getVoice();
      if (!Voice) {
        Alert.alert(
          'Speech Recognition Unavailable',
          'Install @react-native-voice/voice to enable voice input.',
        );
        return;
      }

      setTranscript('');
      setIsListening(true);

      // Setup event listeners
      const handleResults = (e) => {
        const text = e.value?.[0] || '';
        setTranscript(text);
        if (onResult) onResult(text);
      };

      const handleError = (e) => {
        logger.error('VoiceToText', 'Error:', e.error);
        setIsListening(false);
        if (onError) onError(e.error);
      };

      const handleEnd = () => {
        setIsListening(false);
      };

      Voice.onSpeechResults = handleResults;
      Voice.onSpeechError = handleError;
      Voice.onSpeechEnd = handleEnd;

      listenerRef.current = [
        Voice.onSpeechResults,
        Voice.onSpeechError,
        Voice.onSpeechEnd,
      ];

      await Voice.start(language);
      logger.info('VoiceToText', `Listening started (${language})`);
    } catch (err) {
      logger.error('VoiceToText', 'Failed to start listening:', err);
      setIsListening(false);
      if (onError) onError(err);
    }
  }, [getVoice, language, onResult, onError]);

  const stopListening = useCallback(async () => {
    try {
      const Voice = await getVoice();
      if (Voice) {
        await Voice.stop();
      }
      setIsListening(false);
      logger.info('VoiceToText', 'Listening stopped');
    } catch (err) {
      logger.error('VoiceToText', 'Failed to stop listening:', err);
      setIsListening(false);
    }
  }, [getVoice]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (isListening) {
          await stopListening();
        }
      };
      cleanup();
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  };
}

/**
 * Supported languages for voice input.
 * Maps display labels to BCP-47 codes.
 */
export const VOICE_LANGUAGES = {
  'English': 'en-IN',
  'Hindi': 'hi-IN',
  'Marathi': 'mr-IN',
  'Gujarati': 'gu-IN',
  'Tamil': 'ta-IN',
  'Telugu': 'te-IN',
  'Kannada': 'kn-IN',
  'Bengali': 'bn-IN',
  'Punjabi': 'pa-IN',
  'Malayalam': 'ml-IN',
};

export default useVoiceToText;
