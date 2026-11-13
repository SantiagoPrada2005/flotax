import { PERMISOS } from './permisos';
import { tienePermiso, type RolSistema, type SujetoAutorizacion } from './rbac';

export interface CapacidadesOperacionAlquiler {
  readonly puedeConfirmarRechazar: boolean;
  readonly puedeEntregar: boolean;
  readonly puedeGuardarInspeccionR2: boolean;
  readonly puedePausar: boolean;
  readonly puedeProrrogarEstandar: boolean;
  readonly puedeAjustarTarifasYCargos: boolean;
  readonly puedeReembolsarYAnularCaja: boolean;
  readonly puedeAnularContrato: boolean;
  readonly puedeGestionarGarantias: boolean;
  readonly puedeGestionarTaller: boolean;
}

export function calcularCapacidadesOperacionAlquiler(
  sujeto: SujetoAutorizacion | RolSistema | null | undefined
): CapacidadesOperacionAlquiler {
  if (!sujeto) {
    return {
      puedeConfirmarRechazar: false,
      puedeEntregar: false,
      puedeGuardarInspeccionR2: false,
      puedePausar: false,
      puedeProrrogarEstandar: false,
      puedeAjustarTarifasYCargos: false,
      puedeReembolsarYAnularCaja: false,
      puedeAnularContrato: false,
      puedeGestionarGarantias: false,
      puedeGestionarTaller: false,
    };
  }

  return {
    puedeConfirmarRechazar: tienePermiso(sujeto, PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR),
    puedeEntregar: tienePermiso(sujeto, PERMISOS.CONTRATOS_CREAR),
    puedeGuardarInspeccionR2: tienePermiso(sujeto, PERMISOS.INSPECCIONES_REGISTRAR),
    puedePausar: tienePermiso(sujeto, PERMISOS.CONTRATOS_PAUSAR),
    puedeProrrogarEstandar: tienePermiso(sujeto, PERMISOS.CONTRATOS_CREAR),
    puedeAjustarTarifasYCargos:
      tienePermiso(sujeto, PERMISOS.CONTRATOS_MODIFICAR_TARIFA) ||
      tienePermiso(sujeto, PERMISOS.NOVEDADES_CARGOS_APROBAR),
    puedeReembolsarYAnularCaja: tienePermiso(sujeto, PERMISOS.CAJA_GASTOS_REGISTRAR),
    puedeAnularContrato: tienePermiso(sujeto, PERMISOS.CONTRATOS_ANULAR),
    puedeGestionarGarantias:
      tienePermiso(sujeto, PERMISOS.CAJA_ABONOS_REGISTRAR) ||
      tienePermiso(sujeto, PERMISOS.CAJA_GASTOS_REGISTRAR),
    puedeGestionarTaller: tienePermiso(sujeto, PERMISOS.FLOTA_MANTENIMIENTOS_GESTIONAR),
  };
}
