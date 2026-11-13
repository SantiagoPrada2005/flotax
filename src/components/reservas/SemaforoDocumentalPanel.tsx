import { useState, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import type { ReservaClienteItem } from '@/lib/flota';
import type { EstadoDocumentalVehiculo } from '@/lib/flota/disponibilidad';

export interface SemaforoDocumentalPanelProps {
  reserva: ReservaClienteItem;
  estadoDocVehiculo?: EstadoDocumentalVehiculo | undefined;
  autorizarSinDocumentos: boolean;
  onToggleAutorizarSinDocs: (val: boolean) => void;
  onDocumentosActualizados?: () => void;
  puedeModificar?: boolean | undefined;
}

export default function SemaforoDocumentalPanel({
  reserva,
  estadoDocVehiculo,
  autorizarSinDocumentos,
  onToggleAutorizarSinDocs,
  onDocumentosActualizados,
  puedeModificar = true,
}: SemaforoDocumentalPanelProps) {
  const [mostrarFormularioRapido, setMostrarFormularioRapido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Campos formulario rápido
  const [tipoDocumento, setTipoDocumento] = useState<'CC' | 'CE' | 'PASAPORTE' | 'NIT'>(
    (reserva.conductor.tipoDocumento as 'CC' | 'CE' | 'PASAPORTE' | 'NIT') || 'CC'
  );
  const [numeroDocumento, setNumeroDocumento] = useState(
    reserva.conductor.numeroDocumento || ''
  );
  const [licenciaNumero, setLicenciaNumero] = useState(
    reserva.conductor.numeroDocumento || ''
  );
  const [licenciaCategoria, setLicenciaCategoria] = useState(
    reserva.conductor.categoriaLicencia || (reserva.vehiculo.categoria === 'MOTO' ? 'A2' : 'B1')
  );
  const [aprobarInmediato, setAprobarInmediato] = useState(true);

  // Diagnóstico cliente
  const faltaTipoDoc = !reserva.conductor.tipoDocumento;
  const faltaNumDoc = !reserva.conductor.numeroDocumento?.trim();
  const faltaLicencia = !reserva.conductor.categoriaLicencia;
  const faltaDocCliente = faltaTipoDoc || faltaNumDoc || faltaLicencia;

  // Diagnóstico vehículo
  const tieneDocsVehiculoVencidos = Boolean(estadoDocVehiculo?.tieneVencidos);
  const docsVehiculoVencidos = estadoDocVehiculo?.vencidos ?? [];
  const docsVehiculoSinCarga = estadoDocVehiculo?.faltantesSinCarga ?? [];

  const hayAlertas =
    faltaDocCliente ||
    tieneDocsVehiculoVencidos ||
    docsVehiculoSinCarga.length > 0;

  const manejarGuardarRapido = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensajeError(null);
    setMensajeExito(null);

    if (!reserva.clienteId) {
      setMensajeError(
        'Esta reserva fue radicada en modo invitado/presencial sin cuenta vinculada. Puedes autorizar la operación marcando el check de responsabilidad del local.'
      );
      return;
    }

    if (!numeroDocumento.trim()) {
      setMensajeError('El número de documento es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      const res = await actions.reservas.registrarOActualizarDocumentosRapido({
        usuarioId: reserva.clienteId,
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        licenciaNumero: licenciaNumero.trim() || undefined,
        licenciaCategoria: licenciaCategoria || undefined,
        aprobarInmediato,
      });

      if (res.error || !res.data?.ok) {
        setMensajeError(res.error?.message || 'Error al guardar los documentos.');
        return;
      }

      setMensajeExito('Documentos del cliente registrados y verificados en D1.');
      setMostrarFormularioRapido(false);
      if (onDocumentosActualizados) {
        onDocumentosActualizados();
      }
    } catch (err) {
      setMensajeError(
        err instanceof Error ? err.message : 'Error inesperado al guardar documentos.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      aria-label="Semáforo documental de cliente y vehículo"
      className="rounded-[24px] bg-white border border-[#9CA3AF]/40 p-4 sm:p-5 space-y-4 shadow-xs"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full shrink-0 ${
              tieneDocsVehiculoVencidos
                ? 'bg-[#111827]'
                : faltaDocCliente || docsVehiculoSinCarga.length > 0
                  ? 'bg-[#4B5563]'
                  : 'bg-[#9CA3AF]'
            }`}
          />
          <h3 className="font-display text-sm font-black text-[#111827] uppercase tracking-wider">
            Semáforo Documental
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            tieneDocsVehiculoVencidos
              ? 'bg-[#111827] text-white'
              : faltaDocCliente
                ? 'bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/50'
                : 'bg-[#EDEDED] text-[#4B5563]'
          }`}
        >
          {tieneDocsVehiculoVencidos
            ? 'Doc. Vehicular Vencido'
            : faltaDocCliente
              ? 'KYC / Licencia Incompleta'
              : 'Verificación al día'}
        </span>
      </div>

      {/* Alertas de Documentación del Cliente */}
      <div className="rounded-[18px] bg-[#EDEDED]/70 border border-[#9CA3AF]/30 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#111827]">
            Conductor: {reserva.conductor.nombreCompleto}
          </span>
          <span className="text-[11px] font-semibold text-[#4B5563]">
            {reserva.conductor.telefono}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-[12px] bg-white p-2 border border-[#9CA3AF]/30">
            <span className="text-[#4B5563]">Documento</span>
            <span
              className={`font-semibold ${
                faltaNumDoc ? 'text-[#111827] underline decoration-[#4B5563]' : 'text-[#111827]'
              }`}
            >
              {faltaNumDoc
                ? 'Sin registrar'
                : `${reserva.conductor.tipoDocumento || 'CC'} ${reserva.conductor.numeroDocumento}`}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-[12px] bg-white p-2 border border-[#9CA3AF]/30">
            <span className="text-[#4B5563]">Licencia de conducción</span>
            <span
              className={`font-semibold ${
                faltaLicencia ? 'text-[#111827] underline decoration-[#4B5563]' : 'text-[#111827]'
              }`}
            >
              {faltaLicencia
                ? 'Sin registrar'
                : `Categoría ${reserva.conductor.categoriaLicencia}`}
            </span>
          </div>
        </div>

        {puedeModificar && reserva.clienteId && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setMostrarFormularioRapido((prev) => !prev)}
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white hover:bg-[#1F2937] cursor-pointer"
            >
              {mostrarFormularioRapido
                ? 'Ocultar formulario'
                : 'Registrar / Aprobar datos rápidos de cliente'}
            </button>
          </div>
        )}
      </div>

      {/* Alertas de Documentación del Vehículo */}
      <div className="rounded-[18px] bg-[#EDEDED]/70 border border-[#9CA3AF]/30 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#111827]">
            Unidad: {reserva.vehiculo.marca} {reserva.vehiculo.modelo} ({reserva.vehiculo.placa})
          </span>
          <span className="text-[11px] font-semibold text-[#4B5563]">
            {reserva.vehiculo.categoria}
          </span>
        </div>

        {tieneDocsVehiculoVencidos && (
          <div className="rounded-[12px] bg-[#111827] text-white p-2.5 text-xs space-y-1">
            <p className="font-bold">Alerta: Documento legal vencido en flota</p>
            {docsVehiculoVencidos.map((d) => (
              <p key={d.tipo} className="text-[11px] text-[#EDEDED]/90">
                · {d.tipo}: Vencido ({d.fechaVencimiento || 'Sin fecha'})
              </p>
            ))}
          </div>
        )}

        {docsVehiculoSinCarga.length > 0 && !tieneDocsVehiculoVencidos && (
          <div className="rounded-[12px] bg-white p-2.5 text-xs text-[#4B5563] border border-[#9CA3AF]/30">
            <span className="font-semibold text-[#111827]">Docs sin registro en D1: </span>
            {docsVehiculoSinCarga.join(', ')}. No bloquea la operación si el local cuenta con comprobante físico.
          </div>
        )}

        {!tieneDocsVehiculoVencidos && docsVehiculoSinCarga.length === 0 && (
          <div className="rounded-[12px] bg-white p-2 text-xs text-[#111827] font-medium border border-[#9CA3AF]/30 flex items-center justify-between">
            <span>SOAT y Tecnicomecánica</span>
            <span className="font-bold text-emerald-700">Vigentes</span>
          </div>
        )}
      </div>

      {/* Formulario Rápido de Documentos de Cliente */}
      {mostrarFormularioRapido && puedeModificar && (
        <form
          onSubmit={manejarGuardarRapido}
          className="rounded-[20px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
              Ingreso rápido de documentos de cliente
            </h4>
            <button
              type="button"
              onClick={() => setMostrarFormularioRapido(false)}
              className="text-xs text-[#4B5563] hover:text-[#111827] font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="semaforo-tipo-doc"
                className="block text-[11px] font-semibold text-[#4B5563] mb-1"
              >
                Tipo doc.
              </label>
              <select
                id="semaforo-tipo-doc"
                value={tipoDocumento}
                onChange={(e) =>
                  setTipoDocumento(
                    e.target.value as 'CC' | 'CE' | 'PASAPORTE' | 'NIT'
                  )
                }
                className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
              >
                <option value="CC">CC - Cédula</option>
                <option value="CE">CE - Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="NIT">NIT</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="semaforo-num-doc"
                className="block text-[11px] font-semibold text-[#4B5563] mb-1"
              >
                Número de documento
              </label>
              <input
                id="semaforo-num-doc"
                type="text"
                required
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="1037645890"
                className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="semaforo-lic-num"
                className="block text-[11px] font-semibold text-[#4B5563] mb-1"
              >
                Número de licencia
              </label>
              <input
                id="semaforo-lic-num"
                type="text"
                value={licenciaNumero}
                onChange={(e) => setLicenciaNumero(e.target.value)}
                placeholder="Opcional si coincide con documento"
                className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
              />
            </div>

            <div>
              <label
                htmlFor="semaforo-lic-cat"
                className="block text-[11px] font-semibold text-[#4B5563] mb-1"
              >
                Categoría de licencia
              </label>
              <select
                id="semaforo-lic-cat"
                value={licenciaCategoria}
                onChange={(e) => setLicenciaCategoria(e.target.value)}
                className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
              >
                <option value="B1">B1 (Automóvil / Camioneta)</option>
                <option value="B2">B2 / C1 (Servicio Público)</option>
                <option value="A2">A2 (Motocicleta)</option>
                <option value="A1">A1 (Motocicleta liviana)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#111827] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={aprobarInmediato}
              onChange={(e) => setAprobarInmediato(e.target.checked)}
              className="h-4 w-4 rounded border-[#9CA3AF] text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
            />
            <span>Aprobar verificación KYC inmediatamente con documentos físicos</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMostrarFormularioRapido(false)}
              className="min-h-[44px] rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-4 py-2 text-xs font-bold text-[#111827] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] rounded-full bg-[#111827] px-5 py-2 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Guardando...' : 'Guardar y verificar en D1'}
            </button>
          </div>
        </form>
      )}

      {mensajeExito && (
        <div className="rounded-[14px] bg-emerald-100 border border-emerald-300 p-3 text-xs font-semibold text-emerald-900">
          {mensajeExito}
        </div>
      )}

      {mensajeError && (
        <div
          role="alert"
          className="rounded-[14px] bg-[#111827] text-white p-3 text-xs font-semibold"
        >
          {mensajeError}
        </div>
      )}

      {/* Checkbox de Autorización Explícita del Local */}
      {hayAlertas && puedeModificar && (
        <label className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[#111827] text-white cursor-pointer select-none border border-[#4B5563]/40">
          <input
            type="checkbox"
            checked={autorizarSinDocumentos}
            onChange={(e) => onToggleAutorizarSinDocs(e.target.checked)}
            className="h-5 w-5 mt-0.5 rounded border-[#9CA3AF] text-[#111827] focus-visible:ring-2 focus-visible:ring-white shrink-0 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold block text-[#EDEDED]">
              Autorizar operación bajo responsabilidad del local
            </span>
            <span className="text-[#9CA3AF] block mt-0.5 leading-relaxed">
              Permite confirmar la reserva o realizar la entrega registrando auditoría en Cloudflare D1 del operador que autoriza el despacho con documentos pendientes.
            </span>
          </div>
        </label>
      )}
    </section>
  );
}
