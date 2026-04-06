/**
 * Safely parse and format ISO date strings
 * Handles various formats and invalid inputs gracefully
 */

export const formatDate = (dateString, locale = 'en-IN') => {
  if (!dateString) return 'N/A';
  
  try {
    // Parse ISO string - handle both with and without timezone
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString(locale, { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format date with time
 */
export const formatDateTime = (dateString, locale = 'en-IN') => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString(locale, { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};
