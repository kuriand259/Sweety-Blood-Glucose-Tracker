import { Link } from 'react-router-dom';

/**
 * Icon-only pill whose label slides out to the right on hover / keyboard focus.
 * Renders a router <Link> when `to` is given, otherwise a <button>.
 * Styles: .sw-expand-btn in index.css.
 */
export function ExpandButton({
  icon: Icon,
  label,
  trailingIcon: TrailingIcon,
  to,
  state,
  onClick,
  type = 'button',
  className = '',
}) {
  const content = (
    <>
      <Icon size={18} className="sw-expand-btn-icon" />
      <span className="sw-expand-btn-label">
        {label}
        {TrailingIcon ? <TrailingIcon size={16} /> : null}
      </span>
    </>
  );

  const classes = `sw-expand-btn${className ? ` ${className}` : ''}`;

  if (to) {
    return (
      <Link to={to} state={state} onClick={onClick} className={classes} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} aria-label={label}>
      {content}
    </button>
  );
}
