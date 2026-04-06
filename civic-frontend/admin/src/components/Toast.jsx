import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useUiStore } from '@/store/uiStore';
import './Toast.css';

/**
 * Toast Notification Component
 * Displays temporary notifications (integrated with uiStore)
 * 
 * @component
 * @example
 * // Used automatically by useErrorNotification/useSuccessNotification hooks
 * const notify = useErrorNotification();
 * notify('Error message');  // Shows toast automatically
 * 
 * // For direct usage:
 * <Toast type="success" message="Saved!" />
 */
const Toast = ({
  id,
  type = 'info',
  message,
  duration = 5000,
}) => {
  const { removeToast } = useUiStore();

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, removeToast]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className={`toast toast--${type}`} role="status">
      <span className="toast__icon">{icons[type]}</span>
      <p className="toast__message">{message}</p>
      <button
        className="toast__close"
        onClick={() => removeToast(id)}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
};

Toast.propTypes = {
  /** Toast ID (required for removal) */
  id: PropTypes.string.isRequired,
  /** Toast type */
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  /** Toast message */
  message: PropTypes.string.isRequired,
  /** Auto-dismiss duration (ms) */
  duration: PropTypes.number,
};

/**
 * Toast Container
 * Renders all toasts from uiStore
 */
export const ToastContainer = () => {
  const toasts = useUiStore((state) => state.toasts);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration || 5000}
        />
      ))}
    </div>
  );
};

export default Toast;
