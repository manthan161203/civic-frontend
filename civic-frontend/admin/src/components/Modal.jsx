import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useModal } from '@/store/uiStore';
import './Modal.css';

/**
 * Reusable Modal Component
 * Dialog wrapper with customizable header, footer, and content
 * 
 * @component
 * @example
 * // Use with uiStore hook
 * const { isOpen, open, close } = useModal('editIssue');
 * 
 * <Modal
 *   isOpen={isOpen}
 *   title="Edit Issue"
 *   onClose={close}
 *   onConfirm={handleSave}
 *   confirmText="Save"
 * >
 *   <IssueForm />
 * </Modal>
 */
const Modal = ({
  isOpen = false,
  title = '',
  children,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  size = 'md',
  closeOnBackdropClick = true,
  showFooter = true,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal modal--${size}`}>
        {title && (
          <div className="modal__header">
            <h2 className="modal__title">{title}</h2>
            <button
              className="modal__close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        <div className="modal__content">
          {children}
        </div>

        {showFooter && (
          <div className="modal__footer">
            <button
              className="modal__button modal__button--secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
            {onConfirm && (
              <button
                className={`modal__button modal__button--primary ${isDangerous ? 'modal__button--danger' : ''}`}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  /** Whether modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Modal title */
  title: PropTypes.string,
  /** Modal content */
  children: PropTypes.node,
  /** Called when modal should close */
  onClose: PropTypes.func.isRequired,
  /** Called when confirm button clicked */
  onConfirm: PropTypes.func,
  /** Confirm button text */
  confirmText: PropTypes.string,
  /** Cancel button text */
  cancelText: PropTypes.string,
  /** Show danger styling on confirm button */
  isDangerous: PropTypes.bool,
  /** Modal size */
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  /** Close when backdrop clicked */
  closeOnBackdropClick: PropTypes.bool,
  /** Show footer buttons */
  showFooter: PropTypes.bool,
};

export default Modal;
