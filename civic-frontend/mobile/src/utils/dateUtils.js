export const formatDate = (dateString, locale = 'en-IN', options = {}) => {
  if (!dateString) return 'Invalid Date';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const defaultOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    };

    return date.toLocaleDateString(locale, defaultOptions);
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateTime = (dateString, locale = 'en-IN', options = {}) => {
  if (!dateString) return 'Invalid Date';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const defaultOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    return date.toLocaleString(locale, defaultOptions);
  } catch {
    return 'Invalid Date';
  }
};
