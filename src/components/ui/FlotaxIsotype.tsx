import type { SVGProps } from 'react';

export interface FlotaxIsotypeProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  fillColor?: string;
  className?: string;
}

/**
 * Trayectoria geométrica canónica del Isotipo FlotaX (270 × 200).
 * Fuente de verdad: design/logo.pen (URwpF / Uliwz)
 * Eje constructivo: +62.3° ascendente con cuña transversal de lectura X.
 */
export const FLOTAX_ISOTYPE_PATH =
  'M97.03 23.76q3.02-5.76 9.52-5.76l144.95 0q4.5 0 2.41 3.98l-19.27 36.71q-2.79 5.31-8.79 5.31l-91.95 0q-5 0-7.32 4.43l-10.03 19.09q-2.09 3.98-5.75 1.37l-30.83-21.99q-4.07-2.9-1.75-7.33z m-33.95 64.67q2.32-4.43 6.39-1.53l30.42 21.7q4.07 2.9 1.75 7.33l-31.9 60.76q-2.79 5.31-8.79 5.31l-42.45 0q-4.5 0-2.41-3.99z m73.81-1.56q2.56-4.87 8.06-4.87l92.55 0q4.5 0 2.41 3.98l-19.27 36.71q-2.79 5.31-8.79 5.31l-53.93 0q-6 0-10.88-3.48l-17.69-12.62q-4.07-2.9-1.75-7.33z';

export default function FlotaxIsotype({
  size = 24,
  fillColor = 'currentColor',
  className = '',
  ...props
}: FlotaxIsotypeProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 270 200"
      width={size}
      height={typeof size === 'number' ? Math.round((size * 200) / 270) : undefined}
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d={FLOTAX_ISOTYPE_PATH} fill={fillColor} />
    </svg>
  );
}
