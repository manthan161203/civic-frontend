import React from 'react';
import PropTypes from 'prop-types';
import './FormInput.css';

/**
 * Reusable Form Input Component
 * Supports text, email, password, select, checkbox, radio, and textarea inputs
 * 
 * @component
 * @example
 * // Text input
 * <FormInput
 *   label="Issue Description"
 *   value={value}
 *   onChange={handleChange}
 *   error={errors.description}
 *   placeholder="Describe the issue..."
 * />
 * 
 * // Select input
 * <FormInput
 *   type="select"
 *   label="Status"
 *   value={status}
 *   onChange={handleChange}
 *   options={[
 *     { value: 'open', label: 'Open' },
 *     { value: 'closed', label: 'Closed' }
 *   ]}
 * />
 * 
 * // Checkbox
 * <FormInput
 *   type="checkbox"
 *   label="I agree to terms"
 *   checked={agreed}
 *   onChange={handleChange}
 * />
 */
const FormInput = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  rows = 4,
  pattern,
  min,
  max,
  step,
  name,
  className = '',
  helpText,
  ...props
}) => {
  const hasError = !!error;
  const inputClass = `form-input ${hasError ? 'form-input--error' : ''} ${disabled ? 'form-input--disabled' : ''}`;

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            className={`form-input__select ${className}`}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            name={name}
            {...props}
          >
            <option value="">Select {label?.toLowerCase() || 'an option'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            className={`form-input__textarea ${className}`}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            name={name}
            {...props}
          />
        );

      case 'checkbox':
        return (
          <div className="form-input__checkbox-wrapper">
            <input
              type="checkbox"
              className={`form-input__checkbox ${className}`}
              checked={value}
              onChange={onChange}
              disabled={disabled}
              name={name}
              {...props}
            />
            {label && <label className="form-input__label-inline">{label}</label>}
          </div>
        );

      case 'radio':
        return (
          <div className="form-input__radio-wrapper">
            {options.map((option) => (
              <div key={option.value} className="form-input__radio-group">
                <input
                  type="radio"
                  className="form-input__radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={onChange}
                  disabled={disabled}
                  name={name}
                  {...props}
                />
                <label className="form-input__label-inline">{option.label}</label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={type}
            className={`form-input__input ${className}`}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={placeholder}
            pattern={pattern}
            min={min}
            max={max}
            step={step}
            name={name}
            {...props}
          />
        );
    }
  };

  if (type === 'checkbox' || type === 'radio') {
    return (
      <div className={inputClass}>
        {renderInput()}
        {error && <p className="form-input__error">{error}</p>}
        {helpText && <p className="form-input__help">{helpText}</p>}
      </div>
    );
  }

  return (
    <div className={inputClass}>
      {label && (
        <label className="form-input__label">
          {label}
          {required && <span className="form-input__required">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <p className="form-input__error">{error}</p>}
      {helpText && <p className="form-input__help">{helpText}</p>}
    </div>
  );
};

FormInput.propTypes = {
  /** Input label */
  label: PropTypes.string,
  /** Input type */
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'tel', 'select', 'textarea', 'checkbox', 'radio', 'date', 'time']),
  /** Input value */
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  /** Change handler */
  onChange: PropTypes.func.isRequired,
  /** Blur handler */
  onBlur: PropTypes.func,
  /** Error message */
  error: PropTypes.string,
  /** Mark as required */
  required: PropTypes.bool,
  /** Disable input */
  disabled: PropTypes.bool,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Select/radio options */
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.string.isRequired,
  })),
  /** Textarea rows */
  rows: PropTypes.number,
  /** Input pattern for validation */
  pattern: PropTypes.string,
  /** Min value */
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Max value */
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Step for number inputs */
  step: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Input name attribute */
  name: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Help text below input */
  helpText: PropTypes.string,
};

export default FormInput;
