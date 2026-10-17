import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cls } from './cls';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  /** Solo ícono: exige aria-label. */
  iconOnly?: boolean;
  loading?: boolean;
  /** Fuerza un estado visual (para documentación). */
  forceState?: 'hover' | 'focus' | 'active';
}

export function Button({
  variant = 'primary', icon, iconOnly = false, loading = false, forceState, className, children, disabled, type = 'button', ...resto
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cls('btn', `btn-${variant}`, iconOnly && 'btn-icon', loading && 'is-loading', forceState && `is-${forceState}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...resto}
    >
      {icon && <Icon name={icon} />}
      {!iconOnly && children}
      {loading && <span className="spin-orbit" aria-hidden="true" />}
    </button>
  );
}
