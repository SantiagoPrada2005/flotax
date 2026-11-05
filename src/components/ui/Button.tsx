import type React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  href?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
  iconOnly?: boolean | undefined;
}

const VARIANT_MAP: Record<ButtonVariant, string> = {
  primary: 'fx-btn-primary shadow-xs',
  secondary: 'fx-btn-secondary shadow-2xs',
  outline: 'fx-btn-outline shadow-2xs',
  ghost: 'fx-btn-ghost',
};

const SIZE_MAP: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold',
  lg: 'min-h-[52px] px-6 py-3 text-sm sm:text-base font-bold',
};

const ICON_SIZE_MAP: Record<ButtonSize, string> = {
  sm: 'h-9 w-9 p-0',
  md: 'h-11 w-11 p-0',
  lg: 'h-13 w-13 p-0',
};

/**
 * Botón Canónico de FlotaX (React 19).
 * Se adapta de forma automática y simétrica al Modo Claro y Modo Oscuro
 * garantizando contraste accesible WCAG AAA, ergonomía táctil (mínimo 44px en móviles)
 * y respuesta micro-háptica con iOS press bounce.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  href,
  children,
  className = '',
  iconOnly = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = `ios-press-bounce inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-display transition select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue`;
  const variantClass = VARIANT_MAP[variant];
  const sizeClass = iconOnly ? ICON_SIZE_MAP[size] : SIZE_MAP[size];
  const fullClassName = `${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={fullClassName} role="button">
        {children}
      </a>
    );
  }

  return (
    <button type="button" disabled={disabled} className={fullClassName} {...props}>
      {children}
    </button>
  );
}

export default Button;

