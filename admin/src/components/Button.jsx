import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

/**
 * Reusable Button Component
 * Provides multiple variants and states (primary, secondary, danger, loading, disabled)
 * 
 * @component
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>Submit</Button>
 * 
 * // Loading state
 * <Button variant="primary" isLoading>Submitting...</Button>
 * 
 * // Secondary button
 * <Button variant="secondary">Cancel</Button>
 * 
 * // Danger button
 * <Button variant="danger">Delete</Button>
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const buttonClass = `button button--${variant} button--${size}`;
  const combinedClass = `${buttonClass} ${className} ${isLoading ? 'button--loading' : ''} ${disabled ? 'button--disabled' : ''}`;

  return (
    <button
      className={combinedClass}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="button__spinner"></span>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
};

Button.propTypes = {
  /** Button content */
  children: PropTypes.node.isRequired,
  /** Button style variant */
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  /** Button size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Disable button */
  disabled: PropTypes.bool,
  /** Show loading state */
  isLoading: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Click handler */
  onClick: PropTypes.func,
  /** Button type */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default Button;
