import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom hook for validating refresh token expiry
 * Checks if the stored token is expired before using it
 * Automatically logs out user if token is expired
 */
export const useTokenExpiry = (onTokenExpired) => {
  const validateToken = useCallback(async () => {
    try {
      const tokenData = await AsyncStorage.getItem('refresh_token_data');
      if (!tokenData) return false;

      const { token, expiresAt } = JSON.parse(tokenData);
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();

      // If token expires within the next 5 minutes, consider it expired
      const bufferMs = 5 * 60 * 1000;
      if (now >= expiryTime - bufferMs) {
        // Token is expired or about to expire
        await AsyncStorage.removeItem('refresh_token_data');
        await AsyncStorage.removeItem('access_token');
        if (onTokenExpired) {
          onTokenExpired();
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating token expiry:', error);
      return false;
    }
  }, [onTokenExpired]);

  // Validate token on component mount and periodically
  useEffect(() => {
    validateToken();
    
    // Check token expiry every minute
    const interval = setInterval(validateToken, 60000);
    
    return () => clearInterval(interval);
  }, [validateToken]);

  return validateToken;
};

export default useTokenExpiry;
