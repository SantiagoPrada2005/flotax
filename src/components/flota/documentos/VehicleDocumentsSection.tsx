import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type {
  CaraLicenciaTransito,
  EstadoLicenciaTransito,
  ResumenDocumentalVehiculo,
} from '@/lib/documentos-vehiculo';
import DocumentPhotoViewerModal from './DocumentPhotoViewerModal';
import LegalDocumentCard from './LegalDocumentCard';
import TransitLicenseCard from './TransitLicenseCard';

export interface VehicleDocumentsSectionProps {
  vehiculoId: string;
  placa: string;
  resumenInicial: ResumenDocumentalVehiculo;
  puedeLeer: boolean;
  puedeGestionar: boolean;
}

export default function VehicleDocumentsSection({
  vehiculoId,
  placa,
  resumenInicial,
  puedeLeer,
  puedeGestionar,
}: VehicleDocumentsSectionProps) {
  const [resumen, setResumen] = useState<ResumenDocumentalVehiculo>(resumenInicial);
  const tsInicial = resumenInicial.licenciaTransito.actualizadoEnMs ?? 1;
  const [versiones, setVersiones] = useState<Record<CaraLicenciaTransito, number>>({
    frente: tsInicial,
    reverso: tsInicial,
  });
  const [visorAbierto, setVisorAbierto] = useState<boolean>(false);
  const [caraVisor, setCaraVisor] = useState<CaraLicenciaTransito>('frente');

  if (!puedeLeer) {
    return (
      <section
        id="documentos"
        aria-label="Documentos del vehículo"
        className="rounded-[24px] border border-[#9CA3AF]/40 bg-white dark:bg-[#1F2937] p-5 text-xs font-medium text-[#4B5563] dark:text-[#D1D5DB]"
      >
        No tienes permisos asignados para consultar los documentos legales de la flota.
      </section>
    );
  }

  const manejarFotoActualizada = (
    cara: CaraLicenciaTransito,
    tieneFoto: boolean,
    version: number
  ) => {
    setVersiones((prev) => ({ ...prev, [cara]: version }));
    setResumen((prev) => {
      const siguienteLicencia: EstadoLicenciaTransito = {
        ...prev.licenciaTransito,
        tieneFrente: cara === 'frente' ? tieneFoto : prev.licenciaTransito.tieneFrente,
        tieneReverso: cara === 'reverso' ? tieneFoto : prev.licenciaTransito.tieneReverso,
        completa:
          (cara === 'frente' ? tieneFoto : prev.licenciaTransito.tieneFrente) &&
          (cara === 'reverso' ? tieneFoto : prev.licenciaTransito.tieneReverso),
        actualizadoEnMs: version,
      };
      return { ...prev, licenciaTransito: siguienteLicencia };
    });
  };

  const abrirVisor = (cara: CaraLicenciaTransito) => {
    setCaraVisor(cara);
    setVisorAbierto(true);
  };

  return (
    <section
      id="documentos"
      aria-label="Documentos del vehículo"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#111827] dark:text-[#EDEDED]">
            Documentos del vehículo
          </h2>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
            Control normativo, vigencia de pólizas y archivo privado de Licencia de tránsito.
          </p>
        </div>
      </div>

      {resumen.exentoPorLey2486 ? (
        <div className="rounded-[24px] border border-[var(--fx-status-emerald-border)] bg-[var(--fx-status-emerald-bg)] p-4 sm:p-5 flex items-start gap-3">
          <ShieldCheck
            className="h-5 w-5 text-[var(--fx-status-emerald-text)] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs">
            <h3 className="font-display text-sm font-bold text-[var(--fx-status-emerald-text)]">
              Unidad exenta de SOAT, Tecnomecánica y Licencia de tránsito
            </h3>
            <p className="text-[var(--fx-status-emerald-text)]/90 leading-relaxed">
              Las patinetas eléctricas livianas que cumplen los límites de la Ley 2486 de 2025 no requieren SOAT ni revisión técnico-mecánica para operar y reservarse en FlotaX.
            </p>
          </div>
        </div>
      ) : (
        <>
          {resumen.bloqueadoPorDocumentos && (
            <div
              role="alert"
              className="rounded-[24px] border border-status-danger/60 bg-status-danger/10 p-4 sm:p-5 flex items-start gap-3"
            >
              <AlertTriangle
                className="h-5 w-5 text-status-danger shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1 text-xs">
                <h3 className="font-display text-sm font-bold text-status-danger">
                  Vehículo bloqueado para reservas y entregas
                </h3>
                <p className="text-[#111827] dark:text-[#EDEDED] leading-relaxed">
                  {resumen.alertasBloqueo.join(' · ')}. Regulariza los documentos pendientes para habilitar esta unidad en catálogo y patio.
                </p>
              </div>
            </div>
          )}

          {resumen.soat && resumen.tecnomecanica && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LegalDocumentCard
                vehiculoId={vehiculoId}
                evaluacion={resumen.soat}
                puedeGestionar={puedeGestionar}
                onResumenActualizado={setResumen}
              />

              <LegalDocumentCard
                vehiculoId={vehiculoId}
                evaluacion={resumen.tecnomecanica}
                puedeGestionar={puedeGestionar}
                onResumenActualizado={setResumen}
              />
            </div>
          )}

          <TransitLicenseCard
            vehiculoId={vehiculoId}
            placa={placa}
            estado={resumen.licenciaTransito}
            puedeGestionar={puedeGestionar}
            versiones={versiones}
            onFotoActualizada={manejarFotoActualizada}
            onAbrirVisor={abrirVisor}
          />

          <DocumentPhotoViewerModal
            isOpen={visorAbierto}
            caraInicial={caraVisor}
            tieneFrente={resumen.licenciaTransito.tieneFrente}
            tieneReverso={resumen.licenciaTransito.tieneReverso}
            urlFrente={`/api/admin/flota/${encodeURIComponent(vehiculoId)}/documentos/licencia/frente?v=${versiones.frente}`}
            urlReverso={`/api/admin/flota/${encodeURIComponent(vehiculoId)}/documentos/licencia/reverso?v=${versiones.reverso}`}
            placa={placa}
            onClose={() => setVisorAbierto(false)}
          />
        </>
      )}
    </section>
  );
}
