import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { actions } from 'astro:actions';
import {
  formatearMonedaCOP,
  exportarMovimientosCsv,
  exportarSesionesCajaCsv,
  exportarCarteraContratosCsv,
  exportarGarantiasCsv,
  calcularSaldoCuenta,
  resolverRangoFechasPeriodo,
  calcularIndicadoresFinancieros,
  calcularDistribucionMetodosPago,
  calcularDistribucionGastosCategorias,
  agruparFlujoPorFecha,
  type ResumenFinancieroCompleto,
  type RangoPeriodoFinanciero,
  type MovimientoCajaSelect,
  type DepositoGarantiaSelect,
  type ContratoCarteraItem,
  type TipoMovimientoCaja,
  type TipoCuentaFinanciera,
} from '@/lib/caja';
import {
  CajaBentoHeroCard,
  CajaBentoSparklineCard,
  CajaDistribucionFondosCard,
} from './CajaKpiCard';
import { CajaGraficosHorizontal } from './CajaGraficosHorizontal';
import {
  CajaMovimientosFilterBar,
  CajaCustomSelect,
} from './CajaMovimientosFilterBar';
import { CajaBarraFlujo } from './CajaBarraFlujo';
import { ModalMovimiento } from './ModalMovimiento';
import { ModalTransferencia } from './ModalTransferencia';
import { ModalArqueoCierre } from './ModalArqueoCierre';
import { ModalComprobante, type ModalComprobanteProps } from './ModalComprobante';
import { ModalGarantia } from './ModalGarantia';

export interface CajaDashboardIslandProps {
  initialData: ResumenFinancieroCompleto;
}

type TabCaja =
  | 'resumen'
  | 'movimientos'
  | 'arqueo'
  | 'cartera'
  | 'garantias'
  | 'gastos'
  | 'cuentas'
  | 'reportes';

const PERIODOS_DISPONIBLES: { id: RangoPeriodoFinanciero; label: string }[] = [
  { id: 'HOY', label: 'Hoy' },
  { id: '7_DIAS', label: '7 días' },
  { id: 'ESTE_MES', label: 'Este mes' },
  { id: 'MES_ANTERIOR', label: 'Mes anterior' },
  { id: 'PERSONALIZADO', label: 'Personalizado' },
];

export default function CajaDashboardIsland({ initialData }: CajaDashboardIslandProps) {
  const [data, setData] = useState<ResumenFinancieroCompleto>(initialData);
  const [activeTab, setActiveTab] = useState<TabCaja>('resumen');
  const [periodo, setPeriodo] = useState<RangoPeriodoFinanciero>(initialData.periodo);
  const [fechaInicioCustom, setFechaInicioCustom] = useState<string>('2026-10-01');
  const [fechaFinCustom, setFechaFinCustom] = useState<string>('2026-10-31');

  // Modales
  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false);
  const [tipoModalMovimiento, setTipoModalMovimiento] = useState<TipoMovimientoCaja>('INGRESO');
  const [contratoAbonoId, setContratoAbonoId] = useState<string | undefined>(undefined);
  const [modalTransferenciaAbierto, setModalTransferenciaAbierto] = useState(false);
  const [modalArqueoAbierto, setModalArqueoAbierto] = useState(false);
  const [modalComprobanteAbierto, setModalComprobanteAbierto] = useState(false);
  const [datosComprobante, setDatosComprobante] = useState<ModalComprobanteProps['datos']>(null);
  const [modalGarantiaAbierto, setModalGarantiaAbierto] = useState(false);
  const [garantiaSeleccionada, setGarantiaSeleccionada] = useState<DepositoGarantiaSelect | null>(null);
  const [accionGarantia, setAccionGarantia] = useState<'RECIBIR' | 'DEVOLVER' | 'RETENER_CARGOS'>('RECIBIR');

  // Modal para detalle de movimiento / anulación
  const [movimientoDetalle, setMovimientoDetalle] = useState<MovimientoCajaSelect | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [modalAnularAbierto, setModalAnularAbierto] = useState(false);

  // Modal para crear nueva cuenta
  const [modalNuevaCuentaAbierto, setModalNuevaCuentaAbierto] = useState(false);
  const [nombreNuevaCuenta, setNombreNuevaCuenta] = useState('');
  const [tipoNuevaCuenta, setTipoNuevaCuenta] = useState<TipoCuentaFinanciera>('BANCO');
  const [saldoInicialNuevaCuenta, setSaldoInicialNuevaCuenta] = useState('0');

  // Filtros de Movimientos
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('TODOS');
  const [filtroCuenta, setFiltroCuenta] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Progressive Disclosure: Vista de análisis financiero y filtros por pestaña
  const [vistaAnalisis, setVistaAnalisis] = useState<'DISTRIBUCION' | 'FLUJO'>('DISTRIBUCION');
  const [filtroCartera, setFiltroCartera] = useState<'TODOS' | 'PENDIENTES' | 'PAGADOS'>('TODOS');
  const [filtroGarantias, setFiltroGarantias] = useState<'TODAS' | 'CUSTODIA' | 'RESUELTAS'>('TODAS');
  const [filtroCategoriaGasto, setFiltroCategoriaGasto] = useState<string>('TODAS');

  // Filtro de Reportes y Control de Desplazamiento de Pestañas
  const [reporteSeleccionado, setReporteSeleccionado] = useState<number>(1);
  const navTabsRef = useRef<HTMLElement | null>(null);
  const tabBtnRefs = useRef<Partial<Record<TabCaja, HTMLButtonElement | null>>>({});
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

  const actualizarEstadoScrollTabs = useCallback(() => {
    const nav = navTabsRef.current;
    if (!nav) return;
    setCanScrollTabsLeft(nav.scrollLeft > 6);
    setCanScrollTabsRight(
      nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 6
    );
  }, []);

  useEffect(() => {
    actualizarEstadoScrollTabs();
    window.addEventListener('resize', actualizarEstadoScrollTabs);
    return () => window.removeEventListener('resize', actualizarEstadoScrollTabs);
  }, [actualizarEstadoScrollTabs, data.todosMovimientos.length]);

  useEffect(() => {
    const nav = navTabsRef.current;
    const activeBtn = tabBtnRefs.current[activeTab];
    if (nav && activeBtn) {
      const targetScrollLeft =
        activeBtn.offsetLeft - nav.clientWidth / 2 + activeBtn.offsetWidth / 2;
      nav.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
    const timer = window.setTimeout(actualizarEstadoScrollTabs, 220);
    return () => window.clearTimeout(timer);
  }, [activeTab, actualizarEstadoScrollTabs]);

  const desplazarTabs = (direccion: 'izq' | 'der') => {
    const nav = navTabsRef.current;
    if (!nav) return;
    const paso = Math.max(160, Math.round(nav.clientWidth * 0.65));
    nav.scrollBy({
      left: direccion === 'der' ? paso : -paso,
      behavior: 'smooth',
    });
  };

  // Toasts
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; mensaje: string } | null>(null);

  const mostrarToast = (mensaje: string, tipo: 'ok' | 'err' = 'ok') => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 4000);
  };

  // Descarga de archivo CSV en cliente
  const descargarCsv = (contenido: string, nombreArchivo: string) => {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarToast(`Reporte ${nombreArchivo} exportado exitosamente`);
  };

  // Movimientos filtrados
  const movimientosFiltrados = useMemo(() => {
    return data.todosMovimientos.filter((m) => {
      if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
      if (filtroMetodo !== 'TODOS' && m.metodoPago !== filtroMetodo) return false;
      if (filtroCuenta !== 'TODAS' && m.cuentaId !== filtroCuenta) return false;
      if (filtroEstado !== 'TODOS' && m.estado !== filtroEstado) return false;

      if (filtroBusqueda.trim()) {
        const q = filtroBusqueda.toLowerCase().trim();
        const match =
          m.concepto.toLowerCase().includes(q) ||
          (m.contratoId && m.contratoId.toLowerCase().includes(q)) ||
          (m.clienteNombre && m.clienteNombre.toLowerCase().includes(q)) ||
          (m.referencia && m.referencia.toLowerCase().includes(q)) ||
          (m.proveedor && m.proveedor.toLowerCase().includes(q)) ||
          (m.vehiculoId && m.vehiculoId.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [data.todosMovimientos, filtroTipo, filtroMetodo, filtroCuenta, filtroEstado, filtroBusqueda]);

  // Cartera filtrada (Progressive Disclosure)
  const contratosFiltrados = useMemo(() => {
    if (filtroCartera === 'PENDIENTES') return data.carteraContratos.filter((c) => c.saldoPendiente > 0);
    if (filtroCartera === 'PAGADOS') return data.carteraContratos.filter((c) => c.saldoPendiente <= 0);
    return data.carteraContratos;
  }, [data.carteraContratos, filtroCartera]);

  // Garantías filtradas (Progressive Disclosure)
  const garantiasFiltradas = useMemo(() => {
    if (filtroGarantias === 'CUSTODIA') {
      return data.depositosGarantia.filter((g) => {
        const saldo = Math.max(0, (g.montoRecibido || 0) - (g.montoDevuelto || 0) - (g.montoRetenido || 0));
        return saldo > 0 || String(g.estado).toUpperCase().includes('CUSTODIA');
      });
    }
    if (filtroGarantias === 'RESUELTAS') {
      return data.depositosGarantia.filter((g) => {
        const saldo = Math.max(0, (g.montoRecibido || 0) - (g.montoDevuelto || 0) - (g.montoRetenido || 0));
        return saldo === 0 && !String(g.estado).toUpperCase().includes('CUSTODIA');
      });
    }
    return data.depositosGarantia;
  }, [data.depositosGarantia, filtroGarantias]);

  // Gastos filtrados por categoría (Progressive Disclosure)
  const gastosFiltrados = useMemo(() => {
    const todosGastos = data.todosMovimientos.filter((m) => m.tipo === 'EGRESO');
    if (filtroCategoriaGasto === 'TODAS') return todosGastos;
    return todosGastos.filter((m) => m.categoria === filtroCategoriaGasto);
  }, [data.todosMovimientos, filtroCategoriaGasto]);

  // Cálculo dinámico del período activo y recomputación en tiempo real (Nivel 1 & Nivel 2)
  const estadoPeriodo = useMemo(() => {
    // Tomar la fecha más reciente de movimientos como ancla para HOY y 7_DIAS si estamos en entorno demo
    const timestamps = data.todosMovimientos.map((m) => new Date(m.fechaMovimiento).getTime());
    const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const fechaReferencia = new Date(maxTimestamp);

    const { inicio, fin } = resolverRangoFechasPeriodo(
      periodo,
      fechaInicioCustom,
      fechaFinCustom,
      fechaReferencia
    );

    const movimientosPeriodo = data.todosMovimientos.filter((m) => {
      const f = new Date(m.fechaMovimiento);
      return f >= inicio && f <= fin;
    });

    const indicadores = calcularIndicadoresFinancieros({
      cuentas: data.cuentas,
      movimientosTodos: data.todosMovimientos,
      movimientosPeriodo,
      depositosGarantia: data.depositosGarantia,
      carteraContratos: data.carteraContratos,
    });

    const graficoFlujo = agruparFlujoPorFecha(movimientosPeriodo, 7);
    const graficoMetodosPago = calcularDistribucionMetodosPago(movimientosPeriodo);
    const graficoGastosCategorias = calcularDistribucionGastosCategorias(movimientosPeriodo);

    // Variaciones porcentuales vs período anterior equivalente
    const duracionMs = Math.max(86400000, fin.getTime() - inicio.getTime());
    const inicioPrev = new Date(inicio.getTime() - duracionMs);
    const finPrev = new Date(fin.getTime() - duracionMs);

    const movsPrev = data.todosMovimientos.filter((m) => {
      const f = new Date(m.fechaMovimiento);
      return f >= inicioPrev && f <= finPrev && m.estado === 'CONFIRMADO';
    });

    const ingPrev = movsPrev
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((acc, m) => acc + m.monto, 0);

    const egrPrev = movsPrev
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((acc, m) => acc + m.monto, 0);

    const varIngresos = ingPrev > 0
      ? Math.round(((indicadores.ingresosPeriodo - ingPrev) / ingPrev) * 100)
      : 8.4;

    const varEgresos = egrPrev > 0
      ? Math.round(((indicadores.egresosPeriodo - egrPrev) / egrPrev) * 100)
      : -3.2;

    const periodoLabels: Record<RangoPeriodoFinanciero, string> = {
      HOY: 'Jornada Operativa Hoy',
      '7_DIAS': 'Últimos 7 Días',
      ESTE_MES: 'Mes en Curso (Octubre 2026)',
      MES_ANTERIOR: 'Mes Anterior (Septiembre 2026)',
      PERSONALIZADO: `${fechaInicioCustom} al ${fechaFinCustom}`,
    };

    return {
      inicio,
      fin,
      movimientosPeriodo,
      indicadores,
      graficoFlujo,
      graficoMetodosPago,
      graficoGastosCategorias,
      varIngresos,
      varEgresos,
      label: periodoLabels[periodo] ?? 'Período Seleccionado',
    };
  }, [
    data.todosMovimientos,
    data.cuentas,
    data.depositosGarantia,
    data.carteraContratos,
    periodo,
    fechaInicioCustom,
    fechaFinCustom,
  ]);

  // Manejo de Registro de Movimiento
  const handleRegistrarMovimiento = async (datos: any) => {
    const { data: res, error } = await actions.caja.registrarMovimiento(datos);
    if (error || !res?.ok) {
      throw new Error(error?.message || 'Error al registrar movimiento');
    }

    // Actualizar estado local inmediatamente
    const nuevoMov = res.movimiento;
    const nuevosTodos = [nuevoMov, ...data.todosMovimientos];
    const nuevosRecientes = [nuevoMov, ...data.movimientosRecientes.slice(0, 14)];

    // Recalcular saldo si estaba vinculado a un contrato
    const nuevaCartera: ContratoCarteraItem[] =
      datos.contratoId && datos.tipo === 'INGRESO'
        ? data.carteraContratos.map((c): ContratoCarteraItem => {
          if (c.codigoContrato === datos.contratoId) {
            const abono = c.totalAbonado + datos.monto;
            const pendiente = Math.max(0, c.totalAlquiler - abono);
            return {
              ...c,
              totalAbonado: abono,
              saldoPendiente: pendiente,
              estadoPago: pendiente === 0 ? 'PAGADO' : 'PARCIAL',
            };
          }
          return c;
        })
        : data.carteraContratos;

    setData((prev) => ({
      ...prev,
      todosMovimientos: nuevosTodos,
      movimientosRecientes: nuevosRecientes,
      carteraContratos: nuevaCartera,
    }));

    mostrarToast(res.mensaje);
  };

  // Manejo de Anulación
  const handleConfirmarAnulacion = async () => {
    if (!movimientoDetalle || !motivoAnulacion.trim()) return;

    const { data: res, error } = await actions.caja.anularMovimiento({
      movimientoId: movimientoDetalle.id,
      motivo: motivoAnulacion.trim(),
    });

    if (error || !res?.ok) {
      mostrarToast(error?.message || 'Error al anular movimiento', 'err');
      return;
    }

    setData((prev) => ({
      ...prev,
      todosMovimientos: prev.todosMovimientos.map((m) =>
        m.id === movimientoDetalle.id ? res.movimiento : m
      ),
      movimientosRecientes: prev.movimientosRecientes.map((m) =>
        m.id === movimientoDetalle.id ? res.movimiento : m
      ),
    }));

    setModalAnularAbierto(false);
    setMovimientoDetalle(null);
    setMotivoAnulacion('');
    mostrarToast(res.mensaje);
  };

  // Manejo de Transferencia Interna
  const handleTransferencia = async (datos: any) => {
    const { data: res, error } = await actions.caja.registrarTransferencia(datos);
    if (error || !res?.ok) {
      throw new Error(error?.message || 'Error al procesar transferencia');
    }

    const nuevoMov = res.movimiento;
    setData((prev) => ({
      ...prev,
      todosMovimientos: [nuevoMov, ...prev.todosMovimientos],
      movimientosRecientes: [nuevoMov, ...prev.movimientosRecientes.slice(0, 14)],
    }));

    mostrarToast(res.mensaje);
  };

  // Manejo de Apertura de Caja
  const handleAperturaCaja = async (cuentaId: string, saldoInicial: number, notas?: string) => {
    const { data: res, error } = await actions.caja.aperturaCaja({
      cuentaId,
      saldoInicialContado: saldoInicial,
      observaciones: notas,
    });

    if (error || !res?.ok) {
      throw new Error(error?.message || 'Error al abrir caja');
    }

    setData((prev) => ({
      ...prev,
      sesionCajaActiva: res.sesion,
      historialSesionesCaja: [res.sesion, ...prev.historialSesionesCaja],
    }));

    mostrarToast(res.mensaje);
  };

  // Manejo de Cierre de Caja
  const handleCierreCaja = async (
    sesionId: string,
    saldoContado: number,
    motivoDiff?: string,
    notas?: string
  ) => {
    const { data: res, error } = await actions.caja.cierreCaja({
      sesionId,
      saldoRealContado: saldoContado,
      motivoDiferencia: motivoDiff,
      observaciones: notas,
    });

    if (error || !res?.ok) {
      throw new Error(error?.message || 'Error al cerrar caja');
    }

    setData((prev) => ({
      ...prev,
      sesionCajaActiva: null,
      historialSesionesCaja: prev.historialSesionesCaja.map((s) =>
        s.id === sesionId ? res.sesion : s
      ),
    }));

    mostrarToast(res.mensaje);
  };

  // Manejo de Gestión de Garantía
  const handleGestionarGarantia = async (datos: any) => {
    const { data: res, error } = await actions.caja.gestionarGarantia(datos);
    if (error || !res?.ok) {
      throw new Error(error?.message || 'Error al gestionar garantía');
    }

    setData((prev) => ({
      ...prev,
      depositosGarantia: prev.depositosGarantia.map((g) =>
        g.id === datos.garantiaId ? res.garantia : g
      ),
    }));

    mostrarToast(res.mensaje);
  };

  // Manejo de Creación de Nueva Cuenta
  const handleCrearCuenta = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!nombreNuevaCuenta.trim()) return;

    const saldoNum = parseFloat(saldoInicialNuevaCuenta.replace(/[^\d.-]/g, '')) || 0;
    const { data: res, error } = await actions.caja.crearCuenta({
      nombre: nombreNuevaCuenta.trim(),
      tipo: tipoNuevaCuenta,
      saldoInicial: Math.round(saldoNum),
    });

    if (error || !res?.ok) {
      mostrarToast(error?.message || 'Error al crear cuenta', 'err');
      return;
    }

    setData((prev) => ({
      ...prev,
      cuentas: [...prev.cuentas, res.cuenta],
    }));

    setModalNuevaCuentaAbierto(false);
    setNombreNuevaCuenta('');
    setSaldoInicialNuevaCuenta('0');
    mostrarToast(res.mensaje);
  };

  // Abrir Comprobante de Contrato
  const abrirComprobanteContrato = (contrato: ContratoCarteraItem) => {
    setDatosComprobante({
      numeroRecibo: `REC-${contrato.codigoContrato}-${Date.now().toString().slice(-4)}`,
      fechaISO: new Date().toISOString(),
      contratoCodigo: contrato.codigoContrato,
      clienteNombre: contrato.clienteNombre,
      clienteDocumento: contrato.clienteDocumento,
      vehiculoNombre: contrato.vehiculoNombre,
      vehiculoPlaca: contrato.vehiculoPlaca,
      concepto: `Liquidación de alquiler (${contrato.fechaInicio} al ${contrato.fechaFin})`,
      monto: contrato.totalAbonado,
      metodoPago: 'Transferencia / Efectivo verificado',
      referencia: `WAYBILL-${contrato.codigoContrato}`,
      saldoRestante: contrato.saldoPendiente,
    });
    setModalComprobanteAbierto(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 space-y-6">
      {/* Toast Notificación */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-xl ${toast.tipo === 'ok' ? 'bg-[#111827] border border-emerald-500' : 'bg-rose-700'
            }`}
        >
          <span>{toast.tipo === 'ok' ? '✓' : '⚠'}</span>
          <span>{toast.mensaje}</span>
        </div>
      )}

      {/* Cabecera Principal con Progressive Disclosure (Sin Sobrecarga Visual) */}
      <header className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between border-b border-[#9CA3AF]/20 dark:border-white/10 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                data.sesionCajaActiva
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-[#9CA3AF]'
              }`}
            />
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] truncate">
              Patio Central · {data.sesionCajaActiva ? 'Turno Activo' : 'Turno Cerrado'}
            </p>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-[#111827] dark:text-white sm:text-3xl">
            Finanzas y Pagos
          </h1>
        </div>

        {/* Barra de Acciones Financieras en Fila Única Horizontal con Scroll Silencioso */}
        <div className="w-full lg:w-auto overflow-x-auto no-scrollbar scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x py-1 -my-1">
          <div className="flex flex-row flex-nowrap items-center gap-2 min-w-max">
            <button
              type="button"
              onClick={() => {
                setTipoModalMovimiento('INGRESO');
                setContratoAbonoId(undefined);
                setModalMovimientoAbierto(true);
              }}
              className="fx-press inline-flex h-11 min-h-[44px] shrink-0 whitespace-nowrap items-center gap-2 rounded-full bg-[#111827] dark:bg-[#2D6BFF] hover:bg-[#1F2937] dark:hover:bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs cursor-pointer border border-transparent transition-colors"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-emerald-400 dark:text-emerald-300 font-black text-sm">
                +
              </span>
              <span>Registrar Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoModalMovimiento('EGRESO');
                setContratoAbonoId(undefined);
                setModalMovimientoAbierto(true);
              }}
              className="fx-press inline-flex h-11 min-h-[44px] shrink-0 whitespace-nowrap items-center gap-2 rounded-full border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#1F2937] hover:bg-[#EDEDED] dark:hover:bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] shadow-xs cursor-pointer transition-colors"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black text-sm">
                −
              </span>
              <span>Registrar Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTransferenciaAbierto(true)}
              className="fx-press inline-flex h-11 min-h-[44px] shrink-0 whitespace-nowrap items-center gap-2 rounded-full border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#1F2937] hover:bg-[#EDEDED] dark:hover:bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] shadow-xs cursor-pointer transition-colors"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2D6BFF] font-mono text-sm">
                ↔
              </span>
              <span>Mover Dinero</span>
            </button>

            <button
              type="button"
              onClick={() => setModalArqueoAbierto(true)}
              className={`fx-press inline-flex h-11 min-h-[44px] shrink-0 whitespace-nowrap items-center gap-2 rounded-full border px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors ${
                data.sesionCajaActiva
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  data.sesionCajaActiva ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span>{data.sesionCajaActiva ? 'Cierre de Turno' : 'Abrir Turno'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Pestañas de Navegación del Módulo con Auto-Centrado y Controles de Desplazamiento */}
      <div className="relative flex items-center gap-1 rounded-2xl bg-[#EDEDED] dark:bg-[#111827] p-1.5 border border-[#9CA3AF]/20 dark:border-white/10">
        {canScrollTabsLeft && (
          <button
            type="button"
            onClick={() => desplazarTabs('izq')}
            aria-label="Ver pestañas anteriores"
            className="fx-press flex h-10 w-8 shrink-0 items-center justify-center rounded-xl border border-[#9CA3AF]/35 dark:border-white/10 bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] shadow-xs hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer z-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}

        <nav
          ref={navTabsRef}
          onScroll={actualizarEstadoScrollTabs}
          aria-label="Secciones de Finanzas y Pagos"
          className="flex flex-1 min-w-0 overflow-x-auto no-scrollbar gap-1 scroll-smooth text-xs font-bold text-[#4B5563] dark:text-[#D1D5DB]"
        >
          {(
            [
              { id: 'resumen', label: 'Resumen' },
              { id: 'movimientos', label: `Movimientos (${data.todosMovimientos.length})` },
              { id: 'arqueo', label: 'Cierre de Turno' },
              { id: 'cartera', label: `Cuentas por Cobrar (${data.carteraContratos.length})` },
              { id: 'garantias', label: `Garantías (${data.depositosGarantia.length})` },
              { id: 'gastos', label: 'Gastos' },
              { id: 'cuentas', label: `Cuentas & Cajas (${data.cuentas.length})` },
              { id: 'reportes', label: 'Reportes' },
            ] satisfies readonly { readonly id: TabCaja; readonly label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabBtnRefs.current[tab.id] = el;
              }}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`fx-press min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-[#111827] shadow-xs dark:bg-[#1F2937] dark:text-white dark:border dark:border-white/10'
                  : 'hover:text-[#111827] hover:bg-white/50 dark:text-[#D1D5DB] dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {canScrollTabsRight && (
          <button
            type="button"
            onClick={() => desplazarTabs('der')}
            aria-label="Ver más pestañas"
            className="fx-press flex h-10 w-8 shrink-0 items-center justify-center rounded-xl border border-[#9CA3AF]/35 dark:border-white/10 bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] shadow-xs hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer z-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Selector de Período Compacto e Integrado */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 dark:bg-[#1F2937]/70 border border-[#9CA3AF]/25 dark:border-white/10 px-2.5 py-1 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-[#EDEDED] dark:bg-[#111827] p-0.5 border border-[#9CA3AF]/20 dark:border-white/10">
            {PERIODOS_DISPONIBLES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriodo(id)}
                className={`fx-press rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                  periodo === id
                    ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                    : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {periodo === 'PERSONALIZADO' && (
            <div className="inline-flex items-center gap-1 text-xs">
              <input
                type="date"
                value={fechaInicioCustom}
                onChange={(e) => setFechaInicioCustom(e.target.value)}
                className="rounded-lg border border-[#9CA3AF]/40 dark:border-white/15 px-2 py-0.5 text-base sm:text-xs text-[#111827] dark:text-[#EDEDED] bg-white dark:bg-[#111827]"
              />
              <span className="text-[#9CA3AF] text-xs">a</span>
              <input
                type="date"
                value={fechaFinCustom}
                onChange={(e) => setFechaFinCustom(e.target.value)}
                className="rounded-lg border border-[#9CA3AF]/40 dark:border-white/15 px-2 py-0.5 text-base sm:text-xs text-[#111827] dark:text-[#EDEDED] bg-white dark:bg-[#111827]"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] pr-1">
          <span className="hidden sm:inline">Período:</span>
          <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
            {estadoPeriodo.label}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: VISIÓN GENERAL (PROGRESSIVE DISCLOSURE NIVELES 1, 2 Y 3) */}
      {/* ============================================================== */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* ========================================================== */}
          {/* NIVEL 1: RESUMEN DE OPERACIÓN Y TESORERÍA (BENTO GRID) */}
          {/* ========================================================== */}
          <section aria-label="Información esencial">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#9CA3AF]/15 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                  Resumen de Tesorería & Balance
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                {estadoPeriodo.label}
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Hero Card Saldo Disponible Real */}
              <CajaBentoHeroCard
                montoDisponible={estadoPeriodo.indicadores.saldoDisponibleTotal}
                depositosRetenidos={estadoPeriodo.indicadores.depositosPorDevolver}
                yardName="Patio Principal FlotaX"
                dateLabel="Tesorería en Tiempo Real"
                onClick={() => setActiveTab('cuentas')}
              />

              {/* Card de Distribución de Fondos (Independiente abajo de Tesorería) */}
              <CajaDistribucionFondosCard
                saldoEfectivo={estadoPeriodo.indicadores.saldoEfectivo}
                saldoBancos={estadoPeriodo.indicadores.saldoBancosYTransferencias}
                totalCuentas={estadoPeriodo.indicadores.saldoDisponibleTotal}
                onClick={() => setActiveTab('cuentas')}
              />

              {/* Grid de Indicadores Operativos (Nivel 1): Ingresos y Gastos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                {/* Ingresos Recaudados */}
                <CajaBentoSparklineCard
                  tipo="INGRESO"
                  titulo="Ingresos Recaudados"
                  monto={estadoPeriodo.indicadores.ingresosPeriodo}
                  subtitulo="Cobros y liquidaciones del período"
                  trendBadge={`${estadoPeriodo.varIngresos >= 0 ? '+' : ''}${estadoPeriodo.varIngresos}%`}
                  onClick={() => setActiveTab('movimientos')}
                />

                {/* Gastos Operativos */}
                <CajaBentoSparklineCard
                  tipo="EGRESO"
                  titulo="Gastos Operativos"
                  monto={estadoPeriodo.indicadores.egresosPeriodo}
                  subtitulo="Mantenimientos, insumos y compras"
                  trendBadge={`${estadoPeriodo.varEgresos >= 0 ? '+' : ''}${estadoPeriodo.varEgresos}%`}
                  onClick={() => setActiveTab('gastos')}
                />
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* NIVEL 2: ANÁLISIS VISUAL DE PROPORCIONES & CURVAS (PROGRESSIVE DISCLOSURE) */}
          {/* ========================================================== */}
          <section aria-label="Análisis visual" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#9CA3AF]/15 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                  Análisis Financiero & Distribución
                </h2>
              </div>

              {/* Selector de Vista Progresiva de Análisis (Sin 'Ver ambos') */}
              <div className="inline-flex items-center gap-1 rounded-xl bg-[#EDEDED] dark:bg-[#111827] p-0.5 border border-[#9CA3AF]/20 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setVistaAnalisis('DISTRIBUCION')}
                  className={`fx-press rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer transition-all ${
                    vistaAnalisis === 'DISTRIBUCION'
                      ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  Distribución de Gastos
                </button>
                <button
                  type="button"
                  onClick={() => setVistaAnalisis('FLUJO')}
                  className={`fx-press rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer transition-all ${
                    vistaAnalisis === 'FLUJO'
                      ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  Flujo & Margen
                </button>
              </div>
            </div>

            {/* 1. Tarjeta horizontal de distribución financiera o 2. Barra Proporcional de Flujos */}
            {vistaAnalisis === 'DISTRIBUCION' ? (
              <CajaGraficosHorizontal
                distribucionMetodos={estadoPeriodo.graficoMetodosPago}
                distribucionGastos={estadoPeriodo.graficoGastosCategorias}
                ingresosPeriodo={estadoPeriodo.indicadores.ingresosPeriodo}
                egresosPeriodo={estadoPeriodo.indicadores.egresosPeriodo}
              />
            ) : (
              <CajaBarraFlujo
                ingresos={estadoPeriodo.indicadores.ingresosPeriodo}
                egresos={estadoPeriodo.indicadores.egresosPeriodo}
                flujoNeto={estadoPeriodo.indicadores.flujoNetoCajaPeriodo}
                puntosHistoricos={estadoPeriodo.graficoFlujo}
                distribucionGastos={estadoPeriodo.graficoGastosCategorias}
                distribucionMetodos={estadoPeriodo.graficoMetodosPago}
                periodoLabel={estadoPeriodo.label}
                onExportarReporte={() =>
                  descargarCsv(
                    exportarMovimientosCsv(data.todosMovimientos),
                    `reporte_flujo_caja_${periodo.toLowerCase()}.csv`
                  )
                }
                onExplorarDetalle={(tipo) => {
                  if (tipo === 'EGRESOS') setActiveTab('gastos');
                  else if (tipo === 'BALANCE') setActiveTab('reportes');
                  else setActiveTab('movimientos');
                }}
              />
            )}
          </section>

          {/* ========================================================== */}
          {/* NIVEL 3: ALERTAS FINANCIERAS (SI EXISTEN) */}
          {/* ========================================================== */}
          {data.alertas.length > 0 && (
            <section aria-label="Novedades y alertas" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#9CA3AF]/15 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                    Novedades & Alertas
                  </h2>
                </div>
                <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                  {data.alertas.length} {data.alertas.length === 1 ? 'pendiente' : 'pendientes'}
                </span>
              </div>

              <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                      Novedades y Alertas ({data.alertas.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                    Prioridad
                  </span>
                </div>

                <div className="mt-2 divide-y divide-[#9CA3AF]/15 dark:divide-white/10">
                  {data.alertas.map((alt) => (
                    <div
                      key={alt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            alt.nivel === 'URGENTE'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                              : alt.nivel === 'ALERTA'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'bg-[#EDEDED] text-[#4B5563] dark:bg-white/10 dark:text-[#EDEDED]'
                          }`}
                        >
                          !
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">{alt.titulo}</h4>
                          <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">{alt.descripcion}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (alt.accionTab) setActiveTab(alt.accionTab as TabCaja);
                        }}
                        className="inline-flex min-h-[32px] shrink-0 items-center justify-center rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED]/50 dark:bg-white/10 px-3 text-xs font-bold text-[#111827] dark:text-[#EDEDED] transition-colors hover:bg-[#EDEDED] dark:hover:bg-white/20 cursor-pointer"
                      >
                        {alt.accionTexto} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LIBRO COMPLETO DE MOVIMIENTOS */}
      {/* ============================================================== */}
      {activeTab === 'movimientos' && (
        <div className="space-y-4">
          {/* Barra de Filtros con Segmented Control + Dropdowns Personalizados + Progressive Disclosure */}
          <CajaMovimientosFilterBar
            filtroBusqueda={filtroBusqueda}
            onChangeBusqueda={setFiltroBusqueda}
            filtroTipo={filtroTipo}
            onChangeTipo={setFiltroTipo}
            filtroMetodo={filtroMetodo}
            onChangeMetodo={setFiltroMetodo}
            filtroCuenta={filtroCuenta}
            onChangeCuenta={setFiltroCuenta}
            filtroEstado={filtroEstado}
            onChangeEstado={setFiltroEstado}
            cuentas={data.cuentas}
            totalFiltrados={movimientosFiltrados.length}
            totalMovimientos={data.todosMovimientos.length}
            onDescargarCsv={() =>
              descargarCsv(
                exportarMovimientosCsv(movimientosFiltrados),
                'movimientos_flotax_filtrados.csv'
              )
            }
          />

          {/* Lista Adaptativa de Movimientos (Mobile friendly cards + Desktop clean rows) */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white overflow-hidden shadow-xs">
            {movimientosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4B5563]">
                No se encontraron movimientos con los filtros seleccionados.
              </div>
            ) : (
              <div className="divide-y divide-[#9CA3AF]/20">
                {movimientosFiltrados.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 hover:bg-[#EDEDED]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${m.estado === 'ANULADO'
                            ? 'bg-neutral-200 text-neutral-400 line-through'
                            : m.tipo === 'INGRESO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.tipo === 'EGRESO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {m.tipo === 'INGRESO' ? '+' : m.tipo === 'EGRESO' ? '-' : '↔'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold text-[#111827] ${m.estado === 'ANULADO' ? 'line-through text-neutral-400' : ''}`}>
                            {m.concepto}
                          </h4>
                          {m.estado === 'ANULADO' && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                              ANULADO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4B5563] mt-0.5">
                          {new Date(m.fechaMovimiento).toLocaleString('es-CO')} · {m.metodoPago}
                          {m.clienteNombre ? ` · Cliente: ${m.clienteNombre}` : ''}
                          {m.contratoId ? ` · Contrato #${m.contratoId}` : ''}
                          {m.proveedor ? ` · Proveedor: ${m.proveedor}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-[#9CA3AF]/10">
                      <div className="text-left sm:text-right">
                        <span
                          className={`font-mono text-sm font-black ${m.estado === 'ANULADO'
                              ? 'text-neutral-400 line-through'
                              : m.tipo === 'INGRESO'
                                ? 'text-emerald-700'
                                : m.tipo === 'EGRESO'
                                  ? 'text-rose-700'
                                  : 'text-[#111827]'
                            }`}
                        >
                          {m.tipo === 'INGRESO' ? '+ ' : m.tipo === 'EGRESO' ? '- ' : ''}
                          {formatearMonedaCOP(m.monto)}
                        </span>
                        <p className="text-[10px] text-[#9CA3AF] font-mono">ID: {m.id}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMovimientoDetalle(m)}
                          className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-[#9CA3AF]/40 px-3 text-xs font-semibold text-[#111827] hover:bg-[#EDEDED]"
                        >
                          Detalle
                        </button>
                        {m.estado === 'CONFIRMADO' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMovimientoDetalle(m);
                              setModalAnularAbierto(true);
                            }}
                            className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            title="Anular movimiento con motivo obligatorio"
                          >
                            Anular
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ARQUEO Y CIERRE DIARIO */}
      {/* ============================================================== */}
      {activeTab === 'arqueo' && (
        <div className="space-y-6">
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#9CA3AF]/20">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Punto de Operación en Patio
                </span>
                <h3 className="font-display text-lg font-black text-[#111827]">
                  Caja Física Central (Efectivo)
                </h3>
              </div>
              <div>
                {data.sesionCajaActiva ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    Turno Abierto en Operación
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] px-3 py-1 text-xs font-bold text-[#4B5563]">
                    Turno Cerrado
                  </span>
                )}
              </div>
            </div>

            {data.sesionCajaActiva ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[#9CA3AF]/20 bg-[#EDEDED]/30 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                      Saldo Inicial Contado
                    </span>
                    <p className="font-mono text-lg font-black text-[#111827] mt-1">
                      {formatearMonedaCOP(data.sesionCajaActiva.saldoInicialContado)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#9CA3AF]/20 bg-[#EDEDED]/30 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                      Hora de Apertura
                    </span>
                    <p className="font-mono text-lg font-black text-[#111827] mt-1">
                      {new Date(data.sesionCajaActiva.fechaApertura).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#9CA3AF]/20 bg-[#EDEDED]/30 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                      Responsable de Turno
                    </span>
                    <p className="text-sm font-bold text-[#111827] mt-1">
                      Operador Patio Central
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <p className="text-xs text-[#4B5563]">
                    Al finalizar el turno, realiza el conteo del dinero físico en gaveta y genera el acta de cierre.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => setModalArqueoAbierto(true)}
                      className="fx-press min-h-[44px] rounded-full bg-[#111827] px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1F2937] cursor-pointer"
                    >
                      Realizar Cierre de Caja
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 p-4 rounded-xl bg-[#EDEDED]/40">
                <p className="text-xs text-[#4B5563]">
                  No hay una sesión de caja activa en este momento. Abre el turno para asentar recaudos en efectivo.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setModalArqueoAbierto(true)}
                    className="fx-press min-h-[44px] shrink-0 rounded-full bg-emerald-700 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 cursor-pointer"
                  >
                    Abrir Turno de Caja
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Cierres Anteriores */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20 dark:border-white/10">
              <h3 className="font-display text-sm font-bold text-[#111827] dark:text-white">
                Historial de Arqueos y Cierres ({data.historialSesionesCaja.length})
              </h3>
              <button
                type="button"
                onClick={() => descargarCsv(exportarSesionesCajaCsv(data.historialSesionesCaja), 'historial_arqueos_caja.csv')}
                className="fx-press text-xs font-bold text-[#2D6BFF] hover:underline cursor-pointer"
              >
                ⬇ Exportar Historial CSV
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#9CA3AF]/15 dark:divide-white/10">
              {data.historialSesionesCaja.map((s) => (
                <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#111827] dark:text-white">
                        Sesión #{s.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.estado === 'ABIERTA'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-[#EDEDED] text-[#4B5563] dark:bg-white/10 dark:text-[#9CA3AF]'
                          }`}
                      >
                        {s.estado}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                      Apertura: {new Date(s.fechaApertura).toLocaleString('es-CO')}
                      {s.fechaCierre ? ` · Cierre: ${new Date(s.fechaCierre).toLocaleString('es-CO')}` : ''}
                    </p>
                    {s.motivoDiferencia && (
                      <p className="text-[10px] text-rose-700 dark:text-rose-400 font-medium mt-0.5">
                        Nota de diferencia: {s.motivoDiferencia}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right text-xs">
                    <p className="font-mono font-bold text-[#111827] dark:text-white">
                      Base Inicial: {formatearMonedaCOP(s.saldoInicialContado)}
                    </p>
                    {s.saldoRealContado !== null && s.saldoRealContado !== undefined && (
                      <p className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                        Contado: {formatearMonedaCOP(s.saldoRealContado)}{' '}
                        {s.diferencia !== null && s.diferencia !== 0 && (
                          <span className={s.diferencia > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}>
                            (Diff: {formatearMonedaCOP(s.diferencia)})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CARTERA Y CUENTAS POR COBRAR */}
      {/* ============================================================== */}
      {activeTab === 'cartera' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-white">
                  Cartera de Alquileres y Saldos Pendientes
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                Total pendiente por cobrar en cartera activa:{' '}
                <b className="text-rose-700 dark:text-rose-400 font-mono">{formatearMonedaCOP(data.indicadores.cuentasPorCobrar)}</b>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Segmented Control Progressive Disclosure */}
              <div className="inline-flex items-center gap-0.5 rounded-xl bg-[#EDEDED] dark:bg-[#111827] p-1 border border-[#9CA3AF]/20 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setFiltroCartera('TODOS')}
                  className={`fx-press rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                    filtroCartera === 'TODOS'
                      ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  Todos ({data.carteraContratos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCartera('PENDIENTES')}
                  className={`fx-press rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                    filtroCartera === 'PENDIENTES'
                      ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  Por Cobrar ({data.carteraContratos.filter((c) => c.saldoPendiente > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCartera('PAGADOS')}
                  className={`fx-press rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                    filtroCartera === 'PAGADOS'
                      ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  Al Día ({data.carteraContratos.filter((c) => c.saldoPendiente <= 0).length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => descargarCsv(exportarCarteraContratosCsv(contratosFiltrados), 'cartera_flotax_alquileres.csv')}
                className="fx-press inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#9CA3AF]/40 dark:border-white/10 px-3 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-white/10"
                title="Exportar cartera a CSV"
              >
                ⬇ CSV
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] overflow-hidden shadow-xs divide-y divide-[#9CA3AF]/20 dark:divide-white/10">
            {contratosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                No hay contratos en este estado de cartera.
              </div>
            ) : (
              contratosFiltrados.map((c) => (
                <div
                  key={c.codigoContrato}
                  className="p-4 hover:bg-[#EDEDED]/40 dark:hover:bg-white/5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#111827] dark:text-white">
                        #{c.codigoContrato}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${c.estadoPago === 'PAGADO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : c.estadoPago === 'PARCIAL'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : c.estadoPago === 'VENCIDO'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-neutral-100 text-[#4B5563] dark:bg-white/10 dark:text-[#9CA3AF]'
                          }`}
                      >
                        {c.estadoPago}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111827] dark:text-white mt-0.5">
                      {c.clienteNombre}{' '}
                      {c.clienteDocumento && (
                        <span className="text-xs font-normal text-[#4B5563] dark:text-[#9CA3AF]">({c.clienteDocumento})</span>
                      )}
                    </h4>
                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                      Unidad: <b>{c.vehiculoNombre}</b> · Placa: <span className="font-mono font-bold text-[#111827] dark:text-white">{c.vehiculoPlaca}</span> · Rango: {c.fechaInicio} al {c.fechaFin}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-0 border-[#9CA3AF]/10 dark:border-white/10">
                    <div className="text-left sm:text-right text-xs">
                      <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                        Total: <span className="font-mono font-bold text-[#111827] dark:text-white">{formatearMonedaCOP(c.totalAlquiler)}</span>
                      </p>
                      <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                        Abonado: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatearMonedaCOP(c.totalAbonado)}</span>
                      </p>
                      <p className="font-bold text-sm text-[#111827] dark:text-white">
                        Saldo:{' '}
                        <span className={`font-mono ${c.saldoPendiente > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {formatearMonedaCOP(c.saldoPendiente)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.saldoPendiente > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTipoModalMovimiento('INGRESO');
                            setContratoAbonoId(c.codigoContrato);
                            setModalMovimientoAbierto(true);
                          }}
                          className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg bg-[#111827] dark:bg-[#2D6BFF] px-3 text-xs font-bold text-white hover:bg-[#1F2937] dark:hover:bg-blue-600"
                        >
                          Registrar Abono
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirComprobanteContrato(c)}
                        className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-[#9CA3AF]/40 dark:border-white/10 px-3 text-xs font-semibold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-white/10"
                      >
                        Comprobante
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: DEPÓSITOS DE GARANTÍA */}
      {/* ============================================================== */}
      {activeTab === 'garantias' && (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#9CA3AF]/20 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                  <h3 className="font-display text-sm font-bold text-[#111827] dark:text-white">
                    Control de Depósitos de Garantía (Fianzas en Custodia)
                  </h3>
                </div>
                <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                  El dinero en garantía es una fianza de seguridad en custodia y <b>no</b> forma parte de los ingresos operativos del negocio.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-0.5 rounded-xl bg-[#EDEDED] dark:bg-[#111827] p-1 border border-[#9CA3AF]/20 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setFiltroGarantias('TODAS')}
                    className={`fx-press rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                      filtroGarantias === 'TODAS'
                        ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                    }`}
                  >
                    Todas ({data.depositosGarantia.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroGarantias('CUSTODIA')}
                    className={`fx-press rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                      filtroGarantias === 'CUSTODIA'
                        ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                    }`}
                  >
                    En Custodia ({data.depositosGarantia.filter((g) => Math.max(0, (g.montoRecibido || 0) - (g.montoDevuelto || 0) - (g.montoRetenido || 0)) > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroGarantias('RESUELTAS')}
                    className={`fx-press rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                      filtroGarantias === 'RESUELTAS'
                        ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                    }`}
                  >
                    Cerradas ({data.depositosGarantia.filter((g) => Math.max(0, (g.montoRecibido || 0) - (g.montoDevuelto || 0) - (g.montoRetenido || 0)) === 0).length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => descargarCsv(exportarGarantiasCsv(garantiasFiltradas), 'depositos_garantia_flotax.csv')}
                  className="fx-press inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#9CA3AF]/40 dark:border-white/10 px-3 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-white/10"
                  title="Exportar garantías a CSV"
                >
                  ⬇ CSV
                </button>
              </div>
            </div>

            <div className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
              Compromiso total por devolver a clientes:{' '}
              <b className="text-amber-800 dark:text-amber-400 font-mono text-sm">
                {formatearMonedaCOP(data.indicadores.depositosPorDevolver)}
              </b>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] overflow-hidden shadow-xs divide-y divide-[#9CA3AF]/20 dark:divide-white/10">
            {garantiasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                No hay garantías registradas con este filtro.
              </div>
            ) : (
              garantiasFiltradas.map((g) => {
                const saldoComp = Math.max(
                  0,
                  (g.montoRecibido || 0) - (g.montoDevuelto || 0) - (g.montoRetenido || 0)
                );

                return (
                  <div
                    key={g.id}
                    className="p-4 hover:bg-[#EDEDED]/40 dark:hover:bg-white/5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#111827] dark:text-white">
                          Contrato #{g.contratoId}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold border border-transparent ${
                            String(g.estado).toUpperCase().includes('CUSTODIA')
                              ? 'bg-neutral-200 text-[#111827] dark:!bg-emerald-500/20 dark:!text-emerald-300 dark:!border-emerald-500/30'
                              : 'bg-neutral-200 text-[#111827] dark:!bg-white/10 dark:!text-[#EDEDED] dark:!border-white/10'
                          }`}
                        >
                          {g.estado}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#111827] dark:text-white mt-0.5">
                        {g.clienteNombre}
                      </h4>
                      <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                        Garantía requerida: {formatearMonedaCOP(g.montoEsperado)} · Recibido: {formatearMonedaCOP(g.montoRecibido)}
                      </p>
                      {g.observaciones && (
                        <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] italic mt-0.5">{g.observaciones}</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-0 border-[#9CA3AF]/10 dark:border-white/10">
                      <div className="text-left sm:text-right text-xs">
                        <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                          Saldo en Custodia: <span className="font-mono font-bold text-[#111827] dark:text-white">{formatearMonedaCOP(saldoComp)}</span>
                        </p>
                        {g.montoDevuelto > 0 && (
                          <p className="text-emerald-700 dark:text-emerald-400">Devuelto: {formatearMonedaCOP(g.montoDevuelto)}</p>
                        )}
                        {g.montoRetenido > 0 && (
                          <p className="text-rose-700 dark:text-rose-400">Retenido por Daños: {formatearMonedaCOP(g.montoRetenido)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {saldoComp === 0 && g.estado === 'PENDIENTE_RECIBIR' && (
                          <button
                            type="button"
                            onClick={() => {
                              setGarantiaSeleccionada(g);
                              setAccionGarantia('RECIBIR');
                              setModalGarantiaAbierto(true);
                            }}
                            className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg bg-[#111827] dark:bg-[#2D6BFF] px-3 text-xs font-bold text-white hover:bg-[#1F2937] dark:hover:bg-blue-600"
                          >
                            Recibir Fianza
                          </button>
                        )}

                        {saldoComp > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setGarantiaSeleccionada(g);
                                setAccionGarantia('DEVOLVER');
                                setModalGarantiaAbierto(true);
                              }}
                              className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg bg-emerald-700 dark:bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-800 dark:hover:bg-emerald-700"
                            >
                              Devolver a Cliente
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGarantiaSeleccionada(g);
                                setAccionGarantia('RETENER_CARGOS');
                                setModalGarantiaAbierto(true);
                              }}
                              className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-rose-300 dark:border-rose-800 px-3 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              Retener Daño
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: GASTOS Y PROVEEDORES */}
      {/* ============================================================== */}
      {activeTab === 'gastos' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-600" />
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-white">
                  Gastos Operativos y Control de Proveedores
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                Total de egresos registrados en el período:{' '}
                <b className="text-rose-700 dark:text-rose-400 font-mono">{formatearMonedaCOP(data.indicadores.egresosPeriodo)}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTipoModalMovimiento('EGRESO');
                setContratoAbonoId(undefined);
                setModalMovimientoAbierto(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-rose-700 dark:bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 dark:hover:bg-rose-700 cursor-pointer shadow-xs self-start md:self-auto"
            >
              + Registrar Gasto
            </button>
          </div>

          {/* Filtro por Categoría de Gastos (Progressive Disclosure) */}
          {estadoPeriodo.graficoGastosCategorias.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-bold text-[#4B5563] dark:text-[#9CA3AF] shrink-0 px-1">
                Categoría:
              </span>
              <button
                type="button"
                onClick={() => setFiltroCategoriaGasto('TODAS')}
                className={`fx-press shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                  filtroCategoriaGasto === 'TODAS'
                    ? 'bg-[#111827] text-white shadow-xs dark:bg-[#2D6BFF]'
                    : 'bg-[#EDEDED] dark:bg-[#111827] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                Todas ({data.todosMovimientos.filter((m) => m.tipo === 'EGRESO').length})
              </button>
              {estadoPeriodo.graficoGastosCategorias.map((cat) => (
                <button
                  key={cat.categoria}
                  type="button"
                  onClick={() => setFiltroCategoriaGasto(cat.categoria)}
                  className={`fx-press shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                    filtroCategoriaGasto === cat.categoria
                      ? 'bg-[#111827] text-white shadow-xs dark:bg-[#2D6BFF]'
                      : 'bg-[#EDEDED] dark:bg-[#111827] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  {cat.etiqueta} ({cat.porcentaje}%)
                </button>
              ))}
            </div>
          )}

          {/* Listado de egresos filtrados */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] overflow-hidden shadow-xs divide-y divide-[#9CA3AF]/20 dark:divide-white/10">
            {gastosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                No hay egresos registrados en esta categoría.
              </div>
            ) : (
              gastosFiltrados.map((g) => (
                <div key={g.id} className="p-4 hover:bg-[#EDEDED]/40 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#111827] dark:text-white">{g.concepto}</h4>
                    <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                      Categoría: {g.categoria} · Proveedor: {g.proveedor || 'No especificado'} · Fecha: {new Date(g.fechaMovimiento).toLocaleDateString('es-CO')}
                      {g.vehiculoId ? ` · Vehículo: ${g.vehiculoId}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-rose-700 dark:text-rose-400">
                      - {formatearMonedaCOP(g.monto)}
                    </span>
                    <p className="text-[10px] text-[#9CA3AF]">{g.metodoPago}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: CUENTAS Y MÉTODOS DE PAGO */}
      {/* ============================================================== */}
      {activeTab === 'cuentas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-4 shadow-xs">
            <div>
              <h3 className="font-display text-sm font-bold text-[#111827] dark:text-white">
                Catálogo de Cajas y Cuentas Bancarias
              </h3>
              <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                Total de fondos consolidados en cuentas:{' '}
                <b className="text-[#111827] dark:text-white">{formatearMonedaCOP(data.indicadores.totalEnCuentas)}</b>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalTransferenciaAbierto(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#111827] px-3.5 py-1.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer"
              >
                ↔ Transferencia
              </button>
              <button
                type="button"
                onClick={() => setModalNuevaCuentaAbierto(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#111827] dark:bg-[#2D6BFF] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1F2937] dark:hover:bg-blue-600 cursor-pointer"
              >
                + Crear Cuenta
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.cuentas.map((c) => {
              const saldoCalculado = calcularSaldoCuenta(c, data.todosMovimientos);

              return (
                <div
                  key={c.id}
                  className="rounded-[26px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-5 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDEDED] dark:bg-white/10 text-[#111827] dark:text-white">
                        {c.tipo === 'CAJA_EFECTIVO' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <rect width="20" height="12" x="2" y="6" rx="2" />
                            <circle cx="12" cy="12" r="2" />
                            <path d="M6 12h.01M18 12h.01" />
                          </svg>
                        ) : c.tipo === 'BANCO' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                            <rect width="14" height="20" x="5" y="2" rx="2" />
                            <line x1="12" x2="12.01" y1="18" y2="18" />
                          </svg>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-[#EDEDED] dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                          {c.tipo}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                          Activa
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display text-base font-bold text-[#111827] dark:text-white mt-3.5">
                      {c.nombre}
                    </h4>
                    <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                      Base inicial: {formatearMonedaCOP(c.saldoInicial)}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-[#9CA3AF]/15 dark:border-white/10 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                      Saldo Disponible Calculado
                    </span>
                    <p className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white mt-0.5">
                      {formatearMonedaCOP(saldoCalculado)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 8: REPORTES FINANCIEROS Y AUDITORÍA */}
      {/* ============================================================== */}
      {activeTab === 'reportes' && (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-5 shadow-xs space-y-3">
            <h3 className="font-display text-sm font-bold text-[#111827] dark:text-white">
              Módulo de Reportes Contables y Auditoría Operativa
            </h3>
            <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
              Genera reportes instantáneos basados en los registros auditables del sistema. Los resultados representan indicadores financieros operativos de patio.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              {[
                { id: 1, titulo: '1. Ingresos y Egresos del Período', desc: 'Resumen consolidado de entradas y salidas' },
                { id: 2, titulo: '2. Flujo Neto de Caja', desc: 'Consolidado de ingresos vs egresos de tesorería' },
                { id: 3, titulo: '3. Saldos por Caja y Cuenta', desc: 'Conciliación por cuenta financiera' },
                { id: 4, titulo: '4. Cuentas por Cobrar & Vencimientos', desc: 'Saldos de alquileres pendientes' },
                { id: 5, titulo: '5. Garantías en Custodia', desc: 'Pasivos comprometidos por devolver' },
                { id: 6, titulo: '6. Gastos por Categoría', desc: 'Mantenimiento, combustible, seguros' },
                { id: 7, titulo: '7. Gastos por Factura y Proveedor', desc: 'Comprobantes y egresos imputados a proveedores' },
                { id: 8, titulo: '8. Pagos por Método Recaudado', desc: 'Efectivo, transferencias y tarjetas' },
                { id: 9, titulo: '9. Cierres de Caja y Arqueos', desc: 'Diferencias y faltantes de turno' },
              ].map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setReporteSeleccionado(rep.id)}
                  aria-pressed={reporteSeleccionado === rep.id}
                  className={`fx-pressable w-full cursor-pointer text-left rounded-2xl border p-4 transition-all ${reporteSeleccionado === rep.id
                      ? 'border-[#2D6BFF] bg-blue-50/30 dark:bg-blue-950/40 shadow-xs'
                      : 'border-[#9CA3AF]/20 dark:border-white/10 hover:border-[#9CA3AF]/60 dark:hover:border-white/30'
                    }`}
                >
                  <h4 className="text-xs font-bold text-[#111827] dark:text-white">{rep.titulo}</h4>
                  <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">{rep.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#9CA3AF]/20 dark:border-white/10">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[40px] rounded-lg border border-[#9CA3AF]/40 dark:border-white/10 px-4 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer"
              >
                🖨 Vista Imprimible
              </button>
              <button
                type="button"
                onClick={() => descargarCsv(exportarMovimientosCsv(data.todosMovimientos), `reporte_${reporteSeleccionado}_flotax.csv`)}
                className="min-h-[40px] rounded-lg bg-[#111827] dark:bg-[#2D6BFF] px-4 text-xs font-bold text-white hover:bg-[#1F2937] dark:hover:bg-blue-600 cursor-pointer"
              >
                ⬇ Exportar Reporte a CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALES INTERACTIVOS */}
      {/* ============================================================== */}
      <ModalMovimiento
        key={`${modalMovimientoAbierto ? 'open' : 'closed'}-${contratoAbonoId ?? 'general'}`}
        isOpen={modalMovimientoAbierto}
        onClose={() => {
          setModalMovimientoAbierto(false);
          setContratoAbonoId(undefined);
        }}
        tipoInicial={tipoModalMovimiento}
        bloquearTipo={Boolean(contratoAbonoId)}
        contratoInicialId={contratoAbonoId}
        cuentas={data.cuentas}
        contratos={data.carteraContratos}
        onSubmit={handleRegistrarMovimiento}
      />

      <ModalTransferencia
        isOpen={modalTransferenciaAbierto}
        onClose={() => setModalTransferenciaAbierto(false)}
        cuentas={data.cuentas}
        onSubmit={handleTransferencia}
      />

      <ModalArqueoCierre
        isOpen={modalArqueoAbierto}
        onClose={() => setModalArqueoAbierto(false)}
        sesionActiva={data.sesionCajaActiva}
        cuentas={data.cuentas}
        movimientos={data.todosMovimientos}
        onApertura={handleAperturaCaja}
        onCierre={handleCierreCaja}
      />

      <ModalComprobante
        isOpen={modalComprobanteAbierto}
        onClose={() => setModalComprobanteAbierto(false)}
        datos={datosComprobante}
      />

      <ModalGarantia
        isOpen={modalGarantiaAbierto}
        onClose={() => setModalGarantiaAbierto(false)}
        garantia={garantiaSeleccionada}
        accionInicial={accionGarantia}
        cuentas={data.cuentas}
        onSubmit={handleGestionarGarantia}
      />

      {/* Modal Detalle de Movimiento */}
      {movimientoDetalle && !modalAnularAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-5 sm:p-6 shadow-2xl text-[#111827] dark:text-[#EDEDED]">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20 dark:border-white/10">
              <span className="font-mono text-xs font-bold text-[#4B5563] dark:text-[#9CA3AF]">
                Movimiento #{movimientoDetalle.id}
              </span>
              <button
                type="button"
                onClick={() => setMovimientoDetalle(null)}
                className="fx-press flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] dark:bg-white/10 text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#9CA3AF]/30 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Tipo:</span>
                <span className="font-bold text-[#111827] dark:text-white">{movimientoDetalle.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Categoría:</span>
                <span className="font-medium text-[#111827] dark:text-white">{movimientoDetalle.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Concepto:</span>
                <span className="font-semibold text-[#111827] dark:text-white text-right max-w-[220px]">{movimientoDetalle.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Monto:</span>
                <span className="font-mono font-black text-sm text-[#111827] dark:text-white">
                  {formatearMonedaCOP(movimientoDetalle.monto)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Método de Pago:</span>
                <span className="uppercase text-[#111827] dark:text-white">{movimientoDetalle.metodoPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Fecha:</span>
                <span className="text-[#111827] dark:text-white">
                  {new Date(movimientoDetalle.fechaMovimiento).toLocaleString('es-CO')}
                </span>
              </div>
              {movimientoDetalle.referencia && (
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Referencia:</span>
                  <span className="font-mono text-[#111827] dark:text-white">{movimientoDetalle.referencia}</span>
                </div>
              )}
              {movimientoDetalle.clienteNombre && (
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Cliente:</span>
                  <span className="text-[#111827] dark:text-white">{movimientoDetalle.clienteNombre}</span>
                </div>
              )}
              {movimientoDetalle.proveedor && (
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Proveedor:</span>
                  <span className="text-[#111827] dark:text-white">{movimientoDetalle.proveedor}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#4B5563] dark:text-[#9CA3AF]">Estado:</span>
                <span className="font-bold text-[#111827] dark:text-white">{movimientoDetalle.estado}</span>
              </div>
              {movimientoDetalle.motivoAnulacion && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 p-2 text-rose-800 dark:text-rose-300">
                  <b>Motivo de anulación:</b> {movimientoDetalle.motivoAnulacion}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#9CA3AF]/20 dark:border-white/10">
              <button
                type="button"
                onClick={() => setMovimientoDetalle(null)}
                className="fx-press min-h-[40px] rounded-full border border-[#9CA3AF]/40 dark:border-white/10 px-4 text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer"
              >
                Cerrar
              </button>
              {movimientoDetalle.estado === 'CONFIRMADO' && (
                <button
                  type="button"
                  onClick={() => setModalAnularAbierto(true)}
                  className="fx-press min-h-[40px] rounded-full bg-rose-700 dark:bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-800 dark:hover:bg-rose-700 cursor-pointer"
                >
                  Anular Movimiento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Anulación */}
      {modalAnularAbierto && movimientoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#1F2937] p-5 sm:p-6 shadow-2xl text-[#111827] dark:text-[#EDEDED]">
            <h3 className="font-display text-base font-black text-rose-800 dark:text-rose-300">
              ¿Confirmar Anulación de Movimiento?
            </h3>
            <p className="mt-2 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
              Esta operación es irreversible y quedará registrada en la auditoría inmutable del sistema. Se corregirán automáticamente los saldos contables y de cartera correspondientes.
            </p>

            <div className="mt-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-1">
                Motivo Obligatorio de Anulación *
              </label>
              <textarea
                rows={3}
                placeholder="Explica la causa por la cual se revierte este movimiento..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                className="w-full rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#111827] px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                required
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalAnularAbierto(false)}
                className="fx-press min-h-[40px] rounded-full border border-[#9CA3AF]/40 dark:border-white/10 px-4 text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnulacion}
                disabled={!motivoAnulacion.trim() || motivoAnulacion.trim().length < 5}
                className="fx-press min-h-[40px] rounded-full bg-rose-700 dark:bg-rose-600 px-5 text-xs font-bold text-white hover:bg-rose-800 dark:hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Nueva Cuenta */}
      {modalNuevaCuentaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-5 sm:p-6 shadow-2xl text-[#111827] dark:text-[#EDEDED]">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20 dark:border-white/10">
              <h3 className="font-display text-base font-black text-[#111827] dark:text-white">
                Crear Nueva Cuenta o Caja
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevaCuentaAbierto(false)}
                className="fx-press flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] dark:bg-white/10 text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#9CA3AF]/30 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCuenta} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                  Nombre de la Cuenta *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Davivienda Cuenta Corriente"
                  value={nombreNuevaCuenta}
                  onChange={(e) => setNombreNuevaCuenta(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#111827] px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                  required
                />
              </div>

              <CajaCustomSelect<TipoCuentaFinanciera>
                label="Tipo de Cuenta *"
                ariaLabel="Seleccionar tipo de cuenta financiera"
                value={tipoNuevaCuenta}
                options={[
                  { value: 'BANCO', label: 'Cuenta Bancaria' },
                  { value: 'CAJA_EFECTIVO', label: 'Caja Física de Efectivo' },
                  {
                    value: 'BILLETERA_DIGITAL',
                    label: 'Billetera Digital (Nequi/Daviplata)',
                  },
                ]}
                onChange={setTipoNuevaCuenta}
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                  Saldo Inicial en COP *
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  value={saldoInicialNuevaCuenta}
                  onChange={(e) => setSaldoInicialNuevaCuenta(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#111827] px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#9CA3AF]/20 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModalNuevaCuentaAbierto(false)}
                  className="min-h-[40px] rounded-full border border-[#9CA3AF]/40 dark:border-white/10 px-4 text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#EDEDED] dark:hover:bg-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-full bg-[#111827] dark:bg-[#2D6BFF] px-5 text-xs font-bold text-white hover:bg-[#1F2937] dark:hover:bg-blue-600 cursor-pointer"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
