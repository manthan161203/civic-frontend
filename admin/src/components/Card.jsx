import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

/**
 * Reusable Card Component
 * Container with optional header and footer
 * 
 * @component
 * @example
 * <Card title="Issue Details" className="issue-card">
 *   <p>Status: Open</p>
 *   <p>Priority: High</p>
 * </Card>
 * 
 * <Card 
 *   title="Actions"
 *   footer={<Button onClick={handleSubmit}>Save</Button>}
 * >
 *   <Form {...props} />
 * </Card>
 */
const Card = ({
  title,
  subtitle,
  children,
  footer,
  header,
  padding = 'md',
  shadow = 'md',
  bordered = false,
  className = '',
  onClick,
  clickable = false,
  ...props
}) => {
  const cardClass = `card card--padding-${padding} card--shadow-${shadow} ${bordered ? 'card--bordered' : ''} ${clickable ? 'card--clickable' : ''} ${className}`;

  return (
    <div className={cardClass} onClick={onClick} {...props}>
      {header ? (
        <div className="card__header">
          {header}
        </div>
      ) : (title || subtitle) ? (
        <div className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
      ) : null}

      <div className="card__content">
        {children}
      </div>

      {footer && (
        <div className="card__footer">
          {footer}
        </div>
      )}
    </div>
  );
};

Card.propTypes = {
  /** Card title */
  title: PropTypes.string,
  /** Card subtitle */
  subtitle: PropTypes.string,
  /** Card content */
  children: PropTypes.node,
  /** Footer content */
  footer: PropTypes.node,
  /** Custom header content */
  header: PropTypes.node,
  /** Padding size */
  padding: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Shadow size */
  shadow: PropTypes.oneOf(['none', 'sm', 'md', 'lg']),
  /** Add border */
  bordered: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Click handler */
  onClick: PropTypes.func,
  /** Make card clickable */
  clickable: PropTypes.bool,
};

export default Card;
