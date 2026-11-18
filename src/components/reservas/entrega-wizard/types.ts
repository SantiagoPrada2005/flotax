import type { PuntoInspeccionR2, CategoriaVehiculo } from '@/lib/flota';
import type {
  EstadoGeneralInspeccion,
  RespuestaItemChecklistInspeccion,
} from '@/db/schema/inspecciones';

export type EntregaStepId = 1 | 2 | 3 | 4 | 5;

export interface EntregaStepMeta {
  id: EntregaStepId;
  titulo: string;
  subtitulo: string;
  etiquetaCorta: string;
}

export type TipoDocumentoEntrega = 'CC' | 'CE' | 'PASAPORTE' | 'NIT';
export type CategoriaLicenciaEntrega = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type MetodoPagoEntrega = 'efectivo' | 'transferencia' | 'tarjeta';

export interface EntregaWizardData {
  // Paso 1: Comprobación del Cliente
  nombreCompleto: string;
  telefono: string;
  correo: string;
  tipoDocumento: TipoDocumentoEntrega;
  numeroDocumento: string;
  ciudadExpedicion: string;
  licenciaNumero: string;
  licenciaCategoria: CategoriaLicenciaEntrega;
  licenciaVencimiento: string;
  domicilio: string;
  autorizarSinDocumentos: boolean;
  notaAutorizacion: string;

  // Paso 2: Telemetría y Checklist de Salida
  medidorUsoEntrega: number;
  nivelEnergiaEntregaPct: number;
  respuestasChecklist: RespuestaItemChecklistInspeccion[];

  // Paso 3: Peritaje R2 de Salida
  puntosR2: PuntoInspeccionR2[];
  estadoGeneralEntrega: EstadoGeneralInspeccion;
  observacionesEntrega: string;

  // Paso 4: Caja y Depósito de Garantía
  cobrarSaldoAhora: boolean;
  montoCobroSaldo: number;
  metodoCobroSaldo: MetodoPagoEntrega;
  cuentaCobroSaldoId: string;
  referenciaCobroSaldo: string;

  recibirGarantiaAhora: boolean;
  montoGarantia: number;
  metodoGarantia: MetodoPagoEntrega;
  cuentaGarantiaId: string;
  referenciaGarantia: string;

  // Paso 5: Contrato y Firma de Entrega
  ley1581Aceptada: boolean;
  trasladoFotomultasAceptado: boolean;
  pagareBlancoFirmado: boolean;
  confirmacionFirmaArrendatario: boolean;
}

export type EntregaWizardErrors = Record<string, string>;

export function esLicenciaCompatibleConVehiculo(
  categoriaLicencia: string,
  categoriaVehiculo: CategoriaVehiculo | string
): boolean {
  const catVeh = String(categoriaVehiculo).toUpperCase();
  if (catVeh === 'PATINETA') return true;
  const catLic = categoriaLicencia.toUpperCase();
  if (catVeh === 'MOTO') {
    return catLic === 'A1' || catLic === 'A2';
  }
  return catLic === 'B1' || catLic === 'B2' || catLic === 'C1';
}

export function licenciaRecomendadaPorVehiculo(
  categoriaVehiculo: CategoriaVehiculo | string
): CategoriaLicenciaEntrega {
  const catVeh = String(categoriaVehiculo).toUpperCase();
  return catVeh === 'MOTO' ? 'A2' : 'B1';
}
