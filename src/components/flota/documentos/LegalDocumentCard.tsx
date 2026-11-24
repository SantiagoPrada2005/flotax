import { useState, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import { Calendar, CheckCircle2, FileText, Pencil, Plus, ShieldAlert } from 'lucide-react';
import {
  calcularFechaPagoDocumento,
  esFechaISOValida,
  formatearFechaDocumento,
  sugerirFechaVencimientoAnual,
  type EstadoRecordatorioDocumento,
  type EvaluacionDocumentoLegal,
  type ResumenDocumentalVehiculo,
} from '@/lib/documentos-vehiculo';

export interface LegalDocumentCardProps {
  vehiculoId: string;
  evaluacion: EvaluacionDocumentoLegal;
  puedeGestionar: boolean;
  onResumenActualizado: (resumen: ResumenDocumentalVehiculo) => void;
}

const ESTILO_POR_ESTADO: Record<
  EstadoRecordatorioDocumento,
  { badgeClass: string; borderClass: string }
> = {
  VIGENTE: {
    badgeClass:
      'bg-[var(--fx-status-emerald-bg)] text-[var(--fx-status-emerald-text)] border-[var(--fx-status-emerald-border)]',
    borderClass: 'border-[#9CA3AF]/40 dark:border-white/10',
  },
  PROXIMO_A_VENCER: {
    badgeClass:
      'bg-[var(--fx-status-amber-bg)] text-[var(--fx-status-amber-text)] border-[var(--fx-status-amber-border)]',
    borderClass: 'border-status-warning/50',
  },
  CUENTA_REGRESIVA: {
    badgeClass:
      'bg-status-warning/20 text-[#92400E] dark:text-[#FCD34D] border-status-warning/60',
    borderClass: 'border-status-warning/70 ring-1 ring-status-warning/25',
  },
  HOY_FECHA_PAGO: {
    badgeClass:
      'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827] border-status-warning',
    borderClass: 'border-status-warning ring-1 ring-status-warning/40',
  },
  SIN_REALIZAR: {
    badgeClass:
      'bg-status-danger/15 text-status-danger border-status-danger/50',
    borderClass: 'border-status-danger/70 ring-1 ring-status-danger/25',
  },
  SIN_REGISTRAR: {
    badgeClass:
      'bg-status-danger/15 text-status-danger border-status-danger/50',
    borderClass: 'border-status-danger/70 ring-1 ring-status-danger/25',
  },
};

export default function LegalDocumentCard({
  vehiculoId,
  evaluacion,
  puedeGestionar,
  onResumenActualizado,
}: LegalDocumentCardProps) {
  const esSoat = evaluacion.tipoDocumento === 'SOAT';
  const titulo = esSoat ? 'SOAT' : 'Revisión Tecnomecánica';
  const reglaPago = esSoat
    ? 'Mismo día del vencimiento'
    : '2 días antes del vencimiento';

  const tieneRegistro = evaluacion.estado !== 'SIN_REGISTRAR';
  const estilos = ESTILO_POR_ESTADO[evaluacion.estado];

  const [formularioAbierto, setFormularioAbierto] = useState<boolean>(false);
  const [modoFormulario, setModoFormulario] = useState<'RENOVAR' | 'EDITAR'>('RENOVAR');
  const [numeroReferencia, setNumeroReferencia] = useState<string>(
    evaluacion.numeroReferencia ?? ''
  );
  const [fechaExpedicion, setFechaExpedicion] = useState<string>(
    evaluacion.fechaExpedicion ?? ''
  );
  const [fechaVencimiento, setFechaVencimiento] = useState<string>(
    evaluacion.fechaVencimiento ?? ''
  );
  const [vencimientoEditadoManualmente, setVencimientoEditadoManualmente] =
    useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);

  const abrirFormulario = (modo: 'RENOVAR' | 'EDITAR') => {
    setErrorForm(null);
    setMensajeOk(null);
    setModoFormulario(modo);
    if (modo === 'EDITAR' && tieneRegistro) {
      setNumeroReferencia(evaluacion.numeroReferencia ?? '');
      setFechaExpedicion(evaluacion.fechaExpedicion ?? '');
      setFechaVencimiento(evaluacion.fechaVencimiento ?? '');
      setVencimientoEditadoManualmente(true);
    } else {
      setNumeroReferencia('');
      setFechaExpedicion('');
      setFechaVencimiento('');
      setVencimientoEditadoManualmente(false);
    }
    setFormularioAbierto(true);
  };

  const manejarCambioExpedicion = (nuevaExp: string) => {
    setFechaExpedicion(nuevaExp);
    if (
      !vencimientoEditadoManualmente &&
      esFechaISOValida(nuevaExp)
    ) {
      setFechaVencimiento(sugerirFechaVencimientoAnual(nuevaExp));
    }
  };

  const manejarCambioVencimiento = (nuevoVenc: string) => {
    setVencimientoEditadoManualmente(true);
    setFechaVencimiento(nuevoVenc);
  };

  const fechaPagoPrevia = esFechaISOValida(fechaVencimiento)
    ? calcularFechaPagoDocumento(evaluacion.tipoDocumento, fechaVencimiento)
    : null;

  const manejarGuardar = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorForm(null);
    setMensajeOk(null);

    if (!numeroReferencia.trim()) {
      setErrorForm('Ingresa el número o referencia del documento.');
      return;
    }
    if (!esFechaISOValida(fechaExpedicion) || !esFechaISOValida(fechaVencimiento)) {
      setErrorForm('Las fechas de expedición y vencimiento son obligatorias.');
      return;
    }
    if (fechaVencimiento < fechaExpedicion) {
      setErrorForm('La fecha de vencimiento no puede ser anterior a la de expedición.');
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await actions.documentos.guardarLegal({
        vehiculoId,
        tipoDocumento: evaluacion.tipoDocumento,
        numeroReferencia: numeroReferencia.trim(),
        fechaExpedicion,
        fechaVencimiento,
        modo: modoFormulario,
      });

      if (error || !data?.ok) {
        setErrorForm(error?.message ?? 'No fue posible guardar el documento.');
        return;
      }

      onResumenActualizado(data.resumen);
      setFormularioAbierto(false);
      setMensajeOk(`${titulo} guardado y actualizado.`);
    } catch {
      setErrorForm('Error inesperado al guardar el documento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <article
      className={`rounded-[24px] border bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs space-y-4 ${estilos.borderClass}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" aria-hidden="true" />
            <h3 className="font-display text-base sm:text-lg font-bold text-[#111827] dark:text-[#EDEDED]">
              {titulo}
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
            {evaluacion.mensajeDetalle}
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap ${estilos.badgeClass}`}
        >
          {evaluacion.etiquetaEstado}
        </span>
      </header>

      {/* Datos vigentes del documento */}
      <dl className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[#EDEDED]/65 dark:bg-[#111827] border border-[#9CA3AF]/30 dark:border-white/10 p-3 text-xs">
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            Número / Referencia
          </dt>
          <dd className="mt-0.5 font-mono font-bold text-[#111827] dark:text-[#EDEDED] truncate">
            {evaluacion.numeroReferencia || '—'}
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            Fecha de pago
          </dt>
          <dd className="mt-0.5 font-bold text-[#111827] dark:text-[#EDEDED]">
            {evaluacion.fechaPago ? formatearFechaDocumento(evaluacion.fechaPago) : '—'}
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            Expedición
          </dt>
          <dd className="mt-0.5 font-medium text-[#111827] dark:text-[#EDEDED]">
            {evaluacion.fechaExpedicion ? formatearFechaDocumento(evaluacion.fechaExpedicion) : '—'}
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            Vencimiento
          </dt>
          <dd className="mt-0.5 font-medium text-[#111827] dark:text-[#EDEDED]">
            {evaluacion.fechaVencimiento ? formatearFechaDocumento(evaluacion.fechaVencimiento) : '—'}
          </dd>
        </div>
      </dl>

      <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Regla fecha de pago: {reglaPago}.</span>
      </p>

      {mensajeOk && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[var(--fx-status-emerald-border)] bg-[var(--fx-status-emerald-bg)] px-3 py-2 text-xs font-bold text-[var(--fx-status-emerald-text)]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{mensajeOk}</span>
        </div>
      )}

      {/* Botones de acción */}
      {puedeGestionar && !formularioAbierto && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => abrirFormulario('RENOVAR')}
            className="fx-press flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#111827] px-4 text-xs font-bold cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tieneRegistro ? `Registrar nuevo ${esSoat ? 'SOAT' : 'certificado'}` : `Registrar ${esSoat ? 'SOAT' : 'Tecnomecánica'}`}</span>
          </button>

          {tieneRegistro && (
            <button
              type="button"
              onClick={() => abrirFormulario('EDITAR')}
              className="fx-press min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-[#9CA3AF]/45 bg-white hover:bg-[#EDEDED] text-[#111827] dark:bg-white/10 dark:border-white/15 dark:text-[#EDEDED] dark:hover:bg-white/20 px-4 text-xs font-bold cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Editar</span>
            </button>
          )}
        </div>
      )}

      {/* Formulario manual (sin imágenes) */}
      {puedeGestionar && formularioAbierto && (
        <form
          onSubmit={manejarGuardar}
          className="rounded-2xl border border-[#9CA3AF]/40 bg-[#EDEDED]/70 dark:bg-[#111827] dark:border-white/15 p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
              {modoFormulario === 'EDITAR' ? `Editar ${titulo}` : `Registrar ${titulo}`}
            </h4>
            <button
              type="button"
              onClick={() => setFormularioAbierto(false)}
              className="min-h-[36px] rounded-full px-3 text-xs font-bold text-[#4B5563] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label
              htmlFor={`doc-ref-${evaluacion.tipoDocumento}`}
              className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1"
            >
              Número o referencia
            </label>
            <input
              id={`doc-ref-${evaluacion.tipoDocumento}`}
              type="text"
              required
              value={numeroReferencia}
              onChange={(e) => setNumeroReferencia(e.target.value)}
              placeholder={esSoat ? 'Ej. SOAT-2026-88412' : 'Ej. RTM-2026-44109'}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white dark:bg-[#1F2937] dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`doc-exp-${evaluacion.tipoDocumento}`}
                className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1"
              >
                Fecha de expedición
              </label>
              <input
                id={`doc-exp-${evaluacion.tipoDocumento}`}
                type="date"
                required
                value={fechaExpedicion}
                onChange={(e) => manejarCambioExpedicion(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white dark:bg-[#1F2937] dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
              />
            </div>

            <div>
              <label
                htmlFor={`doc-venc-${evaluacion.tipoDocumento}`}
                className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1"
              >
                Fecha de vencimiento
              </label>
              <input
                id={`doc-venc-${evaluacion.tipoDocumento}`}
                type="date"
                required
                value={fechaVencimiento}
                onChange={(e) => manejarCambioVencimiento(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white dark:bg-[#1F2937] dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
              />
            </div>
          </div>

          {fechaPagoPrevia && (
            <p className="text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]">
              Fecha de pago calculada por el sistema:{' '}
              <strong className="text-[#111827] dark:text-white">
                {formatearFechaDocumento(fechaPagoPrevia)}
              </strong>
            </p>
          )}

          {errorForm && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-xs font-semibold text-status-danger"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorForm}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#111827] px-5 text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Guardando...' : 'Guardar documento'}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
