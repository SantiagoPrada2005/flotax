import type React from 'react';

export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type IconButtonSize = 'md' | 'lg';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible name. Mandatory: the icon alone has no readable text. */
  'aria-label': string;
  variant?: IconButtonVariant | undefined;
  size?: IconButtonSize | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

const VARIANT_MAP: Record<IconButtonVariant, string> = {
  primary: 'fx-btn-primary shadow-xs',
  secondary: 'fx-btn-secondary shadow-2xs',
  outline: 'fx-btn-outline shadow-2xs',
  ghost: 'fx-btn-ghost',
};

const SIZE_MAP: Record<IconButtonSize, string> = {
  md: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0',
  lg: 'h-13 w-13 min-h-[52px] min-w-[52px] p-0',
};

/**
 * Icon Button Canónico de FlotaX (React 19).
 * Botón nativo solo-icono con `aria-label` obligatorio, touch target mínimo de
 * 44x44 px y el mismo contrato de press, disabled y foco que `Button`.
 */
export function IconButton({
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  const baseClasses =
    'inline-flex cursor-pointer items-center justify-center rounded-full font-display select-none disabled:cursor-not-allowed';
  const fullClassName = `${baseClasses} ${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`.trim();

  return (
    <button
      {...props}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={fullClassName}
    >
      {children}
    </button>
  );
}

export default IconButton;
