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
  loading?: boolean | undefined;
}

const VARIANT_MAP: Record<ButtonVariant, string> = {
  primary: 'fx-btn-primary shadow-xs',
  secondary: 'fx-btn-secondary shadow-2xs',
  outline: 'fx-btn-outline shadow-2xs',
  ghost: 'fx-btn-ghost',
};

const SIZE_MAP: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs max-sm:min-h-[44px]',
  md: 'min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold',
  lg: 'min-h-[52px] px-6 py-3 text-sm sm:text-base font-bold',
};

// Icon-only buttons keep a 44x44 touch target in every size.
const ICON_SIZE_MAP: Record<ButtonSize, string> = {
  sm: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0',
  md: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0',
  lg: 'h-13 w-13 min-h-[52px] min-w-[52px] p-0',
};

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 shrink-0 animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Botón Canónico de FlotaX (React 19).
 * Se adapta de forma automática y simétrica al Modo Claro y Modo Oscuro
 * garantizando contraste accesible WCAG AAA y ergonomía táctil (mínimo 44px en móviles).
 * El press, los colores de hover y el estado disabled los gobiernan las clases
 * canónicas `.fx-btn-*`; el foco visible lo aporta la regla global `:focus-visible`.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  href,
  children,
  className = '',
  iconOnly = false,
  loading = false,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-display select-none disabled:cursor-not-allowed';
  const variantClass = VARIANT_MAP[variant];
  const sizeClass = iconOnly ? ICON_SIZE_MAP[size] : SIZE_MAP[size];
  const fullClassName = `${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim();
  const isBlocked = disabled || loading;
  // `.fx-btn-*:disabled` does not match `<a>`; mirror the 40% disabled state explicitly.
  const anchorDisabledClasses = disabled
    ? 'pointer-events-none cursor-not-allowed opacity-40'
    : '';
  // For icon-only buttons the icon is the label: the spinner replaces it while loading.
  const content = (
    <>
      {loading && <Spinner />}
      {!(loading && iconOnly) && children}
    </>
  );

  if (href) {
    /**
     * Anchor branch: only `href`, `className`, `aria-label`, `aria-busy`,
     * `aria-disabled`, `tabIndex` and the disabled `onClick` guard are
     * forwarded. Arbitrary anchor props (`target`, `rel`, `data-*`) are not
     * forwarded today; add an explicit prop before relying on them.
     */
    return (
      <a
        href={href}
        className={`${fullClassName} ${anchorDisabledClasses}`.trim()}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        aria-disabled={isBlocked || undefined}
        tabIndex={isBlocked ? -1 : undefined}
        onClick={isBlocked ? (event) => event.preventDefault() : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...props}
      type="button"
      disabled={isBlocked}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={fullClassName}
    >
      {content}
    </button>
  );
}

export default Button;
