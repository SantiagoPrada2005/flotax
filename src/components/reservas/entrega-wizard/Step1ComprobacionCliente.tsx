import { useState } from 'react';
import {
  esLicenciaCompatibleConVehiculo,
  licenciaRecomendadaPorVehiculo,
  type CategoriaLicenciaEntrega,
  type EntregaWizardData,
  type EntregaWizardErrors,
  type TipoDocumentoEntrega,
} from './types';
import type { ReservaClienteItem } from '@/lib/flota';

export interface Step1ComprobacionClienteProps {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  errors: EntregaWizardErrors;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

const TIPOS_DOC: ReadonlyArray<{ id: TipoDocumentoEntrega; label: string }> = [
  { id: 'CC', label: 'CC' },
  { id: 'CE', label: 'CE' },
  { id: 'PASAPORTE', label: 'PAS' },
  { id: 'NIT', label: 'NIT' },
];

const CATEGORIAS_LICENCIA: ReadonlyArray<{
  id: CategoriaLicenciaEntrega;
  etiqueta: string;
}> = [
  { id: 'B1', etiqueta: 'B1 · Auto' },
  { id: 'B2', etiqueta: 'B2 · Camión' },
  { id: 'C1', etiqueta: 'C1 · Público' },
  { id: 'A2', etiqueta: 'A2 · Moto' },
  { id: 'A1', etiqueta: 'A1 · Moto <125' },
];

export default function Step1ComprobacionCliente({
  reserva,
  data,
  errors,
  onChange,
}: Step1ComprobacionClienteProps) {
  const [mostrarDetallesExtra, setMostrarDetallesExtra] = useState(false);
  const esPatineta = reserva.vehiculo.categoria === 'PATINETA';
  const licenciaCompatible = esLicenciaCompatibleConVehiculo(
    data.licenciaCategoria,
    reserva.vehiculo.categoria
  );
  const licenciaSugerida = licenciaRecomendadaPorVehiculo(
    reserva.vehiculo.categoria
  );

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 01 · Comprobación del Arrendatario
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          ¿A quién le entregamos la unidad hoy?
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[54ch]">
          Verifica el documento y la licencia del cliente antes de entregar el vehículo{' '}
          <strong className="text-[#111827]">
            {reserva.vehiculo.marca} {reserva.vehiculo.modelo} ({reserva.vehiculo.placa})
          </strong>
          .
        </p>
      </div>

      {/* Tarjeta única de identidad y licencia con Progressive Disclosure */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-7 shadow-xs space-y-4">
        {/* Nombre y contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label
              htmlFor="entrega-nombre"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Nombre completo del conductor *
            </label>
            <input
              id="entrega-nombre"
              type="text"
              value={data.nombreCompleto}
              onChange={(e) => onChange({ nombreCompleto: e.target.value })}
              placeholder="Nombre y apellidos"
              className={`w-full min-h-[48px] rounded-2xl bg-[#EDEDED]/60 px-4 py-2.5 text-base font-semibold text-[#111827] border transition-colors focus:bg-white focus:outline-none ${
                errors.nombreCompleto
                  ? 'border-[#111827] ring-2 ring-[#111827]'
                  : 'border-[#9CA3AF]/40 focus:border-[#111827]'
              }`}
            />
            {errors.nombreCompleto && (
              <p className="text-xs font-bold text-[#111827]">{errors.nombreCompleto}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="entrega-telefono"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Teléfono / WhatsApp *
            </label>
            <input
              id="entrega-telefono"
              type="tel"
              value={data.telefono}
              onChange={(e) => onChange({ telefono: e.target.value })}
              placeholder="300 000 0000"
              className={`w-full min-h-[48px] rounded-2xl bg-[#EDEDED]/60 px-4 py-2.5 text-base font-semibold text-[#111827] border transition-colors focus:bg-white focus:outline-none ${
                errors.telefono
                  ? 'border-[#111827] ring-2 ring-[#111827]'
                  : 'border-[#9CA3AF]/40 focus:border-[#111827]'
              }`}
            />
            {errors.telefono && (
              <p className="text-xs font-bold text-[#111827]">{errors.telefono}</p>
            )}
          </div>
        </div>

        {/* Documento de identidad */}
        <div className="space-y-2 border-t border-[#EDEDED] pt-3.5">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] block">
            Documento de Identidad *
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5 grid grid-cols-4 gap-1.5 rounded-2xl bg-[#EDEDED] p-1">
              {TIPOS_DOC.map((td) => {
                const activo = data.tipoDocumento === td.id;
                return (
                  <button
                    key={td.id}
                    type="button"
                    onClick={() => onChange({ tipoDocumento: td.id })}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      activo
                        ? 'bg-[#111827] text-white'
                        : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    {td.label}
                  </button>
                );
              })}
            </div>

            <div className="sm:col-span-7">
              <input
                id="entrega-num-doc"
                type="text"
                inputMode="numeric"
                value={data.numeroDocumento}
                onChange={(e) =>
                  onChange({
                    numeroDocumento: e.target.value,
                    licenciaNumero:
                      !data.licenciaNumero || data.licenciaNumero === data.numeroDocumento
                        ? e.target.value
                        : data.licenciaNumero,
                  })
                }
                placeholder="Número de documento"
                aria-label="Número de documento"
                className={`w-full min-h-[48px] rounded-2xl bg-[#EDEDED]/60 px-4 py-2.5 font-mono text-base font-bold text-[#111827] border transition-colors focus:bg-white focus:outline-none ${
                  errors.numeroDocumento
                    ? 'border-[#111827] ring-2 ring-[#111827]'
                    : 'border-[#9CA3AF]/40 focus:border-[#111827]'
                }`}
              />
            </div>
          </div>
          {errors.numeroDocumento && (
            <p className="text-xs font-bold text-[#111827]">{errors.numeroDocumento}</p>
          )}
        </div>

        {/* Categoría de Licencia de Conducción */}
        {!esPatineta && (
          <div className="space-y-2.5 border-t border-[#EDEDED] pt-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
                Categoría de Licencia *
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  licenciaCompatible
                    ? 'bg-[#EDEDED] text-[#111827]'
                    : 'bg-[#111827] text-white'
                }`}
              >
                {licenciaCompatible
                  ? `Compatible con ${reserva.vehiculo.categoria}`
                  : `Requiere categoría ${licenciaSugerida} o acorde`}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_LICENCIA.map((cat) => {
                const activa = data.licenciaCategoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onChange({ licenciaCategoria: cat.id })}
                    className={`min-h-[44px] rounded-full px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer border ${
                      activa
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-[#EDEDED]/70 text-[#4B5563] border-[#9CA3AF]/40 hover:text-[#111827]'
                    }`}
                  >
                    {cat.etiqueta}
                  </button>
                );
              })}
            </div>

            {errors.licenciaCategoria && (
              <p className="text-xs font-bold text-[#111827]">{errors.licenciaCategoria}</p>
            )}
          </div>
        )}

        {/* Acordeón de Progressive Disclosure para campos secundarios */}
        <div className="border-t border-[#EDEDED] pt-3.5">
          <button
            type="button"
            onClick={() => setMostrarDetallesExtra((prev) => !prev)}
            className="w-full min-h-[44px] flex items-center justify-between rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/40 px-4 py-2.5 text-xs font-bold text-[#111827] cursor-pointer hover:bg-[#EDEDED]"
          >
            <span>
              {mostrarDetallesExtra
                ? '− Ocultar detalles opcionales del contrato'
                : '+ Agregar expedición, vigencia, domicilio o correo'}
            </span>
            <span className="text-[11px] font-medium text-[#4B5563]">Opcional</span>
          </button>

          {mostrarDetallesExtra && (
            <div className="mt-3 space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="entrega-ciudad-exp"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Ciudad de expedición
                  </label>
                  <input
                    id="entrega-ciudad-exp"
                    type="text"
                    value={data.ciudadExpedicion}
                    onChange={(e) => onChange({ ciudadExpedicion: e.target.value })}
                    placeholder="Ej. Medellín"
                    className="w-full min-h-[46px] rounded-2xl bg-[#EDEDED]/60 px-3.5 py-2.5 text-base font-medium text-[#111827] border border-[#9CA3AF]/40 focus:border-[#111827] focus:bg-white focus:outline-none"
                  />
                </div>

                {!esPatineta && (
                  <>
                    <div className="space-y-1">
                      <label
                        htmlFor="entrega-lic-num"
                        className="text-[11px] font-semibold text-[#4B5563]"
                      >
                        Número de licencia
                      </label>
                      <input
                        id="entrega-lic-num"
                        type="text"
                        value={data.licenciaNumero}
                        onChange={(e) => onChange({ licenciaNumero: e.target.value })}
                        placeholder="Igual a cédula"
                        className="w-full min-h-[46px] rounded-2xl bg-[#EDEDED]/60 px-3.5 py-2.5 font-mono text-base font-semibold text-[#111827] border border-[#9CA3AF]/40 focus:border-[#111827] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="entrega-lic-venc"
                        className="text-[11px] font-semibold text-[#4B5563]"
                      >
                        Vigencia / Vencimiento
                      </label>
                      <input
                        id="entrega-lic-venc"
                        type="date"
                        value={data.licenciaVencimiento}
                        onChange={(e) => onChange({ licenciaVencimiento: e.target.value })}
                        className="w-full min-h-[46px] rounded-2xl bg-[#EDEDED]/60 px-3.5 py-2.5 text-base font-medium text-[#111827] border border-[#9CA3AF]/40 focus:border-[#111827] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="entrega-domicilio"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Domicilio / Dirección de residencia
                  </label>
                  <input
                    id="entrega-domicilio"
                    type="text"
                    value={data.domicilio}
                    onChange={(e) => onChange({ domicilio: e.target.value })}
                    placeholder="Ej. Cra 43A # 1-50, Medellín"
                    className="w-full min-h-[46px] rounded-2xl bg-[#EDEDED]/60 px-3.5 py-2.5 text-base font-medium text-[#111827] border border-[#9CA3AF]/40 focus:border-[#111827] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="entrega-correo"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Correo electrónico (envío de acta)
                  </label>
                  <input
                    id="entrega-correo"
                    type="email"
                    value={data.correo}
                    onChange={(e) => onChange({ correo: e.target.value })}
                    placeholder="conductor@correo.com"
                    className="w-full min-h-[46px] rounded-2xl bg-[#EDEDED]/60 px-3.5 py-2.5 text-base font-medium text-[#111827] border border-[#9CA3AF]/40 focus:border-[#111827] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Autorización excepcional del local */}
        {(!licenciaCompatible || !data.numeroDocumento.trim() || data.autorizarSinDocumentos) && (
          <div className="rounded-[20px] bg-[#111827] text-white p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.autorizarSinDocumentos}
                onChange={(e) =>
                  onChange({ autorizarSinDocumentos: e.target.checked })
                }
                className="h-5 w-5 mt-0.5 rounded border-[#9CA3AF] shrink-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold block text-[#EDEDED]">
                  Autorizar entrega bajo responsabilidad del local
                </span>
                <span className="text-[#9CA3AF] block mt-0.5">
                  Registra auditoría explícita si falta algún documento digital o requiere excepción en patio.
                </span>
              </div>
            </label>

            {data.autorizarSinDocumentos && (
              <input
                type="text"
                value={data.notaAutorizacion}
                onChange={(e) => onChange({ notaAutorizacion: e.target.value })}
                placeholder="Motivo de autorización excepcional en patio..."
                className="w-full min-h-[44px] rounded-xl bg-[#1F2937] border border-[#4B5563] px-3.5 py-2 text-base text-white placeholder-[#9CA3AF] focus:outline-none focus:border-white"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
