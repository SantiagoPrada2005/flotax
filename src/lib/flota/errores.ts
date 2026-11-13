export type ErrorCicloAlquilerCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

export class ErrorCicloAlquiler extends Error {
  readonly code: ErrorCicloAlquilerCode;
  readonly detalle?: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCicloAlquilerCode,
    mensaje: string,
    detalle?: Record<string, unknown>
  ) {
    super(mensaje);
    this.name = 'ErrorCicloAlquiler';
    this.code = code;
    this.detalle = detalle;
  }
}
