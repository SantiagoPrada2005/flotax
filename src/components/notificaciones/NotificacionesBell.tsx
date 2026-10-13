import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useContadorNotificaciones } from './useNotificaciones';
import PanelNotificaciones from './PanelNotificaciones';

interface NotificacionesBellProps {
  /** Solo usuarios con sesión ven la campana. */
  autenticado: boolean;
  clavePublicaVapid?: string | undefined;
  /** Clases de la píldora flotante de la TopBar (borde/sombra según scroll). */
  pillClass: string;
  fadeClass: string;
  onHaptic: () => void;
}

function etiquetaContador(total: number): string {
  return total > 9 ? '9+' : String(total);
}

/** Campana de la TopBar: badge con conteo real y panel de notificaciones. */
export default function NotificacionesBell({
  autenticado,
  clavePublicaVapid,
  pillClass,
  fadeClass,
  onHaptic,
}: NotificacionesBellProps) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const boton = useRef<HTMLButtonElement | null>(null);
  const { contador, setContador, refrescar } = useContadorNotificaciones(autenticado);

  useEffect(() => setMontado(true), []);

  // Devuelve el foco a la campana al cerrar el panel (accesibilidad de diálogo).
  const estabaAbierto = useRef(false);
  useEffect(() => {
    if (estabaAbierto.current && !abierto) boton.current?.focus();
    estabaAbierto.current = abierto;
  }, [abierto]);

  if (!autenticado) return null;

  const etiqueta =
    contador > 0 ? `Notificaciones, ${contador} sin leer` : 'Notificaciones, sin avisos pendientes';

  return (
    <MotionConfig reducedMotion="user">
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onPointerDown={onHaptic}
        onClick={() => setAbierto((previo) => !previo)}
        className={`ios-press-bounce relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-[#4B5563] transition-all duration-200 hover:text-[#111827] ${pillClass} ${fadeClass}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {contador > 0 && (
          <motion.span
            key={contador}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#111827] px-1 text-[10px] font-bold leading-none text-[#EDEDED] ring-2 ring-[#EDEDED]"
          >
            {etiquetaContador(contador)}
          </motion.span>
        )}
      </button>

      {montado &&
        createPortal(
          <AnimatePresence>
            {abierto && (
              <PanelNotificaciones
                contador={contador}
                setContador={setContador}
                refrescarContador={refrescar}
                clavePublicaVapid={clavePublicaVapid}
                onCerrar={() => setAbierto(false)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </MotionConfig>
  );
}
