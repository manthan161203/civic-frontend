import { useState, useCallback } from 'react';

/**
 * Hook for managing form validation and detecting data changes (React Native)
 * Disables submit button until form is valid AND data has changed
 */
export const useFormValidation = (initialData, validate) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form has changed from initial data
  const hasChanged = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // Check if form is valid
  const isValid = useCallback(() => {
    if (!validate) return true;
    const validationErrors = validate(formData);
    return Object.keys(validationErrors).length === 0;
  }, [formData, validate]);

  // Update form field
  const updateField = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Validate this field if touched
    if (touched[fieldName] && validate) {
      const validationErrors = validate({ ...formData, [fieldName]: value });
      setErrors(prev => ({
        ...prev,
        [fieldName]: validationErrors[fieldName],
      }));
    }
  }, [formData, touched, validate]);

  // Mark field as touched
  const touchField = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    if (validate) {
      const validationErrors = validate(formData);
      setErrors(prev => ({
        ...prev,
        [fieldName]: validationErrors[fieldName],
      }));
    }
  }, [formData, validate]);

  // Reset to initial data
  const reset = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  // Validate entire form
  const validateForm = useCallback(() => {
    if (!validate) return true;
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    const allFields = Object.keys(formData);
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    return Object.keys(validationErrors).length === 0;
  }, [formData, validate]);

  // Check if button should be disabled
  // Disabled if: form is invalid OR data hasn't changed OR currently submitting
  const isSubmitDisabled = !isValid() || !hasChanged() || isSubmitting;

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    updateField,
    touchField,
    reset,
    validateForm,
    isSubmitDisabled,
    isValid: isValid(),
    hasChanged: hasChanged(),
  };
};

export default useFormValidation;
