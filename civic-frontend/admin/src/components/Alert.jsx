import React from 'react';
import PropTypes from 'prop-types';
import './Alert.css';

/**
 * Reusable Alert Component
 * Displays informational, success, warning, or error messages
 * 
 * @component
 * @example
 * <Alert type="success" title="Success">
 *   Your changes have been saved.
 * </Alert>
 * 
 * <Alert type="error" onClose={handleClose}>
 *   An error occurred. Please try again.
 * </Alert>
 */
const Alert = ({
  type = 'info',
  title,
  children,
  onClose,
  closeable = true,
  icon = true,
  className = '',
  ...props
}) => {
  const alertClass = `alert alert--${type} ${className}`;

  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  };

  return (
    <div className={alertClass} role="alert" {...props}>
      <div className="alert__content">
        {icon && <span className="alert__icon">{icons[type]}</span>}
        <div className="alert__message">
          {title && <h4 className="alert__title">{title}</h4>}
          {children && <p className="alert__text">{children}</p>}
        </div>
      </div>
      {closeable && onClose && (
        <button
          className="alert__close"
          onClick={onClose}
          aria-label="Close alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};

Alert.propTypes = {
  /** Alert type */
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  /** Alert title */
  title: PropTypes.string,
  /** Alert message */
  children: PropTypes.node,
  /** Close handler */
  onClose: PropTypes.func,
  /** Show close button */
  closeable: PropTypes.bool,
  /** Show icon */
  icon: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default Alert;
