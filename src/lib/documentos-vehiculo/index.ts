export {
  TIPOS_DOCUMENTO_LEGAL_OBLIGATORIO,
  esCategoriaExentaDocumentosLegales,
  esFechaISOValida,
  sumarDiasISODoc,
  diffDiasISO,
  formatearFechaDocumento,
  sugerirFechaVencimientoAnual,
  calcularFechaPagoDocumento,
  evaluarDocumentoLegal,
  evaluarResumenDocumentalVehiculo,
  type TipoDocumentoLegalObligatorio,
  type EstadoRecordatorioDocumento,
  type DocumentoLegalEntrada,
  type EvaluacionDocumentoLegal,
  type EstadoLicenciaTransito,
  type ResumenDocumentalVehiculo,
} from './estados';

export {
  obtenerResumenDocumentalVehiculoD1,
  listarResumenesDocumentalesFlotaD1,
  guardarDocumentoLegalD1,
  obtenerLicenciaTransitoD1,
  guardarClaveFotoLicenciaD1,
  type CaraLicenciaTransito,
  type GuardarDocumentoLegalParams,
} from './repositorio';

export {
  construirEmisionAlertaDocumento,
  ejecutarAlertasDiariasDocumentos,
  asegurarAlertasDiariasLocal,
  type AlertaDocumentoProgramada,
  type EnvAlertasDocumentos,
} from './notificaciones-diarias';
