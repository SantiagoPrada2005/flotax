import type { EntregaStepId, EntregaWizardData, EntregaWizardErrors } from './types';
import type { ReservaClienteItem } from '@/lib/flota';

export interface Step5ContratoYConfirmacionProps {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  errors: EntregaWizardErrors;
  onEditPaso: (paso: EntregaStepId) => void;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function Step5ContratoYConfirmacion({
  reserva,
  data,
  errors,
  onEditPaso,
  onChange,
}: Step5ContratoYConfirmacionProps) {
  const novedadesR2 = data.puntosR2.filter((p) => p.estado === 'NOVEDAD').length;
  const itemsOk = data.respuestasChecklist.filter(
    (i) => i.estado === 'BIEN'
  ).length;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 05 · Contrato y Salida a Alquiler
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Todo listo. Confirma el acta y entrega
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[54ch]">
          Revisa los datos verificados de la entrega para activar el contrato{' '}
          <strong className="text-[#111827]">VIGENTE</strong> y pasar la unidad a{' '}
          <strong className="text-[#111827]">En alquiler</strong>.
        </p>
      </div>

      {/* Bento Grid de Resumen Final (4 tarjetas editables) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tarjeta 1: Cliente */}
        <div className="rounded-[24px] border border-[#9CA3AF]/40 bg-white p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              01 · Arrendatario Verificado
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(1)}
              className="min-h-[44px] px-2 font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>
          <p className="font-display text-base font-bold text-[#111827]">
            {data.nombreCompleto}
          </p>
          <p className="text-xs text-[#4B5563]">
            {data.tipoDocumento} {data.numeroDocumento || 'Sin documento'} · Lic.{' '}
            {data.licenciaCategoria}
            {data.ciudadExpedicion ? ` · ${data.ciudadExpedicion}` : ''}
          </p>
          <p className="text-xs text-[#4B5563]">
            Tel: {data.telefono}
            {data.domicilio ? ` · ${data.domicilio}` : ''}
          </p>
        </div>

        {/* Tarjeta 2: Telemetría */}
        <div className="rounded-[24px] border border-[#9CA3AF]/40 bg-white p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              02 · Telemetría e Inventario
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(2)}
              className="min-h-[44px] px-2 font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>
          <p className="font-mono text-lg font-bold text-[#111827]">
            {data.medidorUsoEntrega.toLocaleString('es-CO')} km ·{' '}
            {data.nivelEnergiaEntregaPct}% Energía
          </p>
          <p className="text-xs text-[#4B5563]">
            Checklist físico: {itemsOk} de {data.respuestasChecklist.length} ítems
            conformes
          </p>
        </div>

        {/* Tarjeta 3: Peritaje R2 */}
        <div className="rounded-[24px] border border-[#9CA3AF]/40 bg-white p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              03 · Peritaje R2 de Salida
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(3)}
              className="min-h-[44px] px-2 font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>
          <p className="font-display text-sm font-bold text-[#111827]">
            Estado general: {data.estadoGeneralEntrega}
          </p>
          <p className="text-xs text-[#4B5563]">
            {data.puntosR2.length} zonas verificadas · {novedadesR2}{' '}
            {novedadesR2 === 1 ? 'novedad previa' : 'novedades previas'}
          </p>
        </div>

        {/* Tarjeta 4: Caja y Garantía */}
        <div className="rounded-[24px] border border-[#9CA3AF]/40 bg-white p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              04 · Caja y Garantía
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(4)}
              className="min-h-[44px] px-2 font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>
          <p className="text-xs text-[#111827] font-semibold">
            {data.cobrarSaldoAhora && data.montoCobroSaldo > 0
              ? `Cobro en entrega: ${formatCop(data.montoCobroSaldo)} (${data.metodoCobroSaldo})`
              : `Abono registrado: ${formatCop(reserva.montoReportado)}`}
          </p>
          <p className="text-xs text-[#4B5563]">
            {data.recibirGarantiaAhora && data.montoGarantia > 0
              ? `Garantía recibida ahora: ${formatCop(data.montoGarantia)} (${data.metodoGarantia})`
              : reserva.estadoGarantia === 'CUSTODIA_ACTIVA'
                ? 'Garantía en custodia activa'
                : 'Garantía pendiente por recibir'}
          </p>
        </div>
      </div>

      {/* Consentimientos legales de entrega */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] block">
          Cláusulas y confirmación de entrega material
        </span>

        <label className="flex items-start gap-3 rounded-2xl bg-[#EDEDED]/60 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={data.trasladoFotomultasAceptado}
            onChange={(e) =>
              onChange({ trasladoFotomultasAceptado: e.target.checked })
            }
            className="h-5 w-5 mt-0.5 rounded border-[#9CA3AF] shrink-0 cursor-pointer"
          />
          <span className="text-xs text-[#111827] leading-relaxed">
            <strong>Guarda material y fotomultas (Cláusulas 4 y 6):</strong> El arrendatario asume la guarda material del vehículo y autoriza el traslado de comparendos o fotomultas durante la vigencia del contrato.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl bg-[#EDEDED]/60 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={data.ley1581Aceptada}
            onChange={(e) => onChange({ ley1581Aceptada: e.target.checked })}
            className="h-5 w-5 mt-0.5 rounded border-[#9CA3AF] shrink-0 cursor-pointer"
          />
          <span className="text-xs text-[#111827] leading-relaxed">
            <strong>Tratamiento de datos (Ley 1581):</strong> El cliente autoriza el tratamiento de sus datos personales y el registro probatorio de inspección pericial R2.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl bg-[#EDEDED]/60 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={data.pagareBlancoFirmado}
            onChange={(e) => onChange({ pagareBlancoFirmado: e.target.checked })}
            className="h-5 w-5 mt-0.5 rounded border-[#9CA3AF] shrink-0 cursor-pointer"
          />
          <span className="text-xs text-[#111827] leading-relaxed">
            <strong>Pagaré / respaldo de garantía:</strong> Constancia de respaldo o pagaré con carta de instrucciones suscrito en mostrador (opcional según política del local).
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl bg-[#111827] text-white p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={data.confirmacionFirmaArrendatario}
            onChange={(e) =>
              onChange({ confirmacionFirmaArrendatario: e.target.checked })
            }
            className="h-5 w-5 mt-0.5 rounded border-[#9CA3AF] shrink-0 cursor-pointer"
          />
          <span className="text-xs leading-relaxed">
            <strong className="block text-[#EDEDED]">
              Firma de conformidad y entrega física de llaves *
            </strong>
            <span className="text-[#9CA3AF]">
              Confirmo que el arrendatario verificó la unidad, firmó el acta de salida y recibe las llaves del vehículo {reserva.vehiculo.placa}.
            </span>
          </span>
        </label>

        {errors.confirmacionFirmaArrendatario && (
          <p className="text-xs font-bold text-[#111827]">
            {errors.confirmacionFirmaArrendatario}
          </p>
        )}
      </div>
    </div>
  );
}
