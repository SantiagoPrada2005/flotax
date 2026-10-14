import { useState, useMemo } from 'react';
import { actions } from 'astro:actions';
import {
  formatearMonedaCOP,
  exportarMovimientosCsv,
  exportarSesionesCajaCsv,
  exportarCarteraContratosCsv,
  exportarGarantiasCsv,
  calcularSaldoCuenta,
  type ResumenFinancieroCompleto,
  type RangoPeriodoFinanciero,
  type MovimientoCajaSelect,
  type DepositoGarantiaSelect,
  type ContratoCarteraItem,
  type TipoMovimientoCaja,
} from '@/lib/caja';
import {
  CajaBentoHeroCard,
  CajaBentoSparklineCard,
  CajaBentoPillCard,
} from './CajaKpiCard';
import { CajaGraficos } from './CajaGraficos';
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
  const [tipoNuevaCuenta, setTipoNuevaCuenta] = useState<'CAJA_EFECTIVO' | 'BANCO' | 'BILLETERA_DIGITAL'>('BANCO');
  const [saldoInicialNuevaCuenta, setSaldoInicialNuevaCuenta] = useState('0');

  // Filtros de Movimientos
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('TODOS');
  const [filtroCuenta, setFiltroCuenta] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Filtro de Reportes
  const [reporteSeleccionado, setReporteSeleccionado] = useState<number>(1);

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
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-xl transition-all ${
            toast.tipo === 'ok' ? 'bg-[#111827] border border-emerald-500' : 'bg-rose-700'
          }`}
        >
          <span>{toast.tipo === 'ok' ? '✓' : '⚠'}</span>
          <span>{toast.mensaje}</span>
        </div>
      )}

      {/* Cabecera Principal y Barra de Acciones Operativas */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#9CA3AF]/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
              Sistema Operativo Financiero · Patio Central
            </p>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
            Caja y Finanzas
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Liquidaciones de alquiler, control de garantías, egresos de flota y flujo de caja en tiempo real.
          </p>
        </div>

        {/* Acciones Rápidas (Thumb-friendly & Mobile First) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTipoModalMovimiento('INGRESO');
              setModalMovimientoAbierto(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1F2937] active:scale-95"
          >
            <span className="text-emerald-400 font-black">+</span>
            Registrar Ingreso
          </button>

          <button
            type="button"
            onClick={() => {
              setTipoModalMovimiento('EGRESO');
              setModalMovimientoAbierto(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#9CA3AF]/40 bg-white px-4 py-2 text-xs font-bold text-[#111827] shadow-xs transition hover:bg-[#EDEDED] active:scale-95"
          >
            <span className="text-rose-600 font-black">-</span>
            Registrar Egreso
          </button>

          <button
            type="button"
            onClick={() => setModalTransferenciaAbierto(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#9CA3AF]/40 bg-white px-3.5 py-2 text-xs font-bold text-[#4B5563] transition hover:bg-[#EDEDED] active:scale-95"
          >
            ↔ Transferir
          </button>

          <button
            type="button"
            onClick={() => setModalArqueoAbierto(true)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
              data.sesionCajaActiva
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
            }`}
          >
            {data.sesionCajaActiva ? 'Arqueo de Turno (Abierto)' : 'Abrir Turno Caja'}
          </button>
        </div>
      </header>

      {/* Pestañas de Navegación del Módulo */}
      <nav className="flex overflow-x-auto no-scrollbar gap-1 rounded-2xl bg-[#EDEDED] p-1.5 text-xs font-bold text-[#4B5563]">
        {[
          { id: 'resumen', label: 'Visión General' },
          { id: 'movimientos', label: `Movimientos (${data.todosMovimientos.length})` },
          { id: 'arqueo', label: 'Arqueo & Cierre' },
          { id: 'cartera', label: `Cuentas por Cobrar (${data.carteraContratos.length})` },
          { id: 'garantias', label: `Depósitos Garantía (${data.depositosGarantia.length})` },
          { id: 'gastos', label: 'Gastos & Proveedores' },
          { id: 'cuentas', label: `Cuentas (${data.cuentas.length})` },
          { id: 'reportes', label: 'Reportes & Auditoría' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabCaja)}
            className={`min-h-[40px] shrink-0 rounded-xl px-3.5 py-2 transition ${
              activeTab === tab.id
                ? 'bg-white text-[#111827] shadow-xs'
                : 'hover:text-[#111827] hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Selector de Período Global Compacto */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl sm:rounded-2xl border border-[#9CA3AF]/30 bg-white p-2 sm:p-2.5">
        <div className="flex flex-wrap items-center gap-1">
          {PERIODOS_DISPONIBLES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriodo(id)}
              className={`ios-press-bounce rounded-lg px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                periodo === id
                  ? 'bg-[#111827] text-white shadow-2xs'
                  : 'bg-[#EDEDED] text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {periodo === 'PERSONALIZADO' && (
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={fechaInicioCustom}
              onChange={(e) => setFechaInicioCustom(e.target.value)}
              className="rounded-lg border border-[#9CA3AF]/50 px-2 py-0.5 text-base text-[#111827]"
            />
            <span className="text-[#4B5563] text-xs">hasta</span>
            <input
              type="date"
              value={fechaFinCustom}
              onChange={(e) => setFechaFinCustom(e.target.value)}
              className="rounded-lg border border-[#9CA3AF]/50 px-2 py-0.5 text-base text-[#111827]"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => descargarCsv(exportarMovimientosCsv(movimientosFiltrados), `flotax_movimientos_${periodo}.csv`)}
          className="ios-press-bounce inline-flex items-center gap-1 rounded-lg border border-[#9CA3AF]/30 bg-[#EDEDED]/50 px-2.5 py-1 text-[11px] font-bold text-[#111827] transition hover:bg-[#EDEDED] cursor-pointer"
        >
          ⬇ Exportar CSV
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: VISIÓN GENERAL (DASHBOARD) */}
      {/* ============================================================== */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Bento Grid Financiero Canónico Mobile-First (2 cards por fila en celular) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Bento Nivel 1: Hero Card Saldo Disponible Real (Ocupa ambas columnas) */}
            <CajaBentoHeroCard
              montoDisponible={data.indicadores.saldoDisponibleTotal}
              saldoEfectivo={data.indicadores.saldoEfectivo}
              saldoBancos={data.indicadores.saldoBancosYTransferencias}
              depositosRetenidos={data.indicadores.depositosPorDevolver}
              yardName="Patio Principal FlotaX"
              dateLabel="Tesorería en Tiempo Real"
              puntosHistoricos={data.graficoFlujo}
              onRegistrarPago={() => {
                setTipoModalMovimiento('INGRESO');
                setModalMovimientoAbierto(true);
              }}
              onTransferir={() => setModalTransferenciaAbierto(true)}
              onClick={() => setActiveTab('cuentas')}
            />

            {/* Bento Nivel 2: Grilla Dividida 2 Columnas (Ingresos vs Egresos con Curvas Reales) */}
            <CajaBentoSparklineCard
              tipo="INGRESO"
              titulo="Ingresos Recaudados"
              monto={data.indicadores.ingresosPeriodo}
              subtitulo="Cobros y liquidaciones confirmadas"
              trendBadge="+Recaudos hoy"
              puntosHistoricos={data.graficoFlujo}
              onClick={() => setActiveTab('movimientos')}
            />

            <CajaBentoSparklineCard
              tipo="EGRESO"
              titulo="Egresos de Operación"
              monto={data.indicadores.egresosPeriodo}
              subtitulo="Mantenimientos, combustible e insumos"
              trendBadge="-Salidas de caja"
              puntosHistoricos={data.graficoFlujo}
              onClick={() => setActiveTab('gastos')}
            />

            {/* Bento Nivel 3: 4 Tarjetas de Telemetría (2 por fila en móvil, 4 en desktop) */}
            <CajaBentoPillCard
              variante="CARTERA"
              titulo="Cartera por Cobrar"
              monto={data.indicadores.cuentasPorCobrar}
              subtitulo="Contratos activos"
              indicadorExtra={`${data.indicadores.totalContratosActivos} contratos`}
              porcentajeBarra={Math.min(
                100,
                Math.round(
                  (data.indicadores.ingresosPeriodo /
                    Math.max(
                      1,
                      data.indicadores.ingresosPeriodo + data.indicadores.cuentasPorCobrar
                    )) *
                    100
                )
              )}
              onClick={() => setActiveTab('cartera')}
            />

            <CajaBentoPillCard
              variante="GARANTIA"
              titulo="Garantías en Custodia"
              monto={data.indicadores.depositosPorDevolver}
              subtitulo="Fondos no operativos a devolver"
              etiquetaBadge="En Custodia"
              onClick={() => setActiveTab('garantias')}
            />

            <CajaBentoPillCard
              variante="BALANCE"
              titulo="Resultado Operativo"
              monto={data.indicadores.resultadoOperativoPeriodo}
              subtitulo="Margen de operación"
              etiquetaBadge={
                data.indicadores.resultadoOperativoPeriodo >= 0 ? 'Superávit' : 'Déficit'
              }
              onClick={() => setActiveTab('reportes')}
            />

            <CajaBentoPillCard
              variante="FLUJO_NETO"
              titulo="Flujo Neto de Caja"
              monto={data.indicadores.flujoNetoCajaPeriodo}
              subtitulo="Balance de efectivo neto"
              onClick={() => setActiveTab('movimientos')}
            />
          </div>

          {/* Sección de Alertas Financieras Accionables */}
          {data.alertas.length > 0 && (
            <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                  <h3 className="font-display text-sm font-bold text-[#111827]">
                    Alertas Financieras y Novedades Accionables ({data.alertas.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Prioridad Operativa
                </span>
              </div>

              <div className="mt-3 divide-y divide-[#9CA3AF]/15">
                {data.alertas.map((alt) => (
                  <div
                    key={alt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          alt.nivel === 'URGENTE'
                            ? 'bg-rose-100 text-rose-800'
                            : alt.nivel === 'ALERTA'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-[#EDEDED] text-[#4B5563]'
                        }`}
                      >
                        !
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#111827]">{alt.titulo}</h4>
                        <p className="text-[11px] text-[#4B5563] mt-0.5">{alt.descripcion}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (alt.accionTab) setActiveTab(alt.accionTab as TabCaja);
                      }}
                      className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border border-[#9CA3AF]/40 bg-[#EDEDED]/50 px-3.5 text-xs font-bold text-[#111827] transition hover:bg-[#EDEDED]"
                    >
                      {alt.accionTexto} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gráficos Interactivos de Flujo y Distribución */}
          <CajaGraficos
            puntosFlujo={data.graficoFlujo}
            distribucionMetodos={data.graficoMetodosPago}
            distribucionGastos={data.graficoGastosCategorias}
          />

          {/* Movimientos Recientes con acceso rápido */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
              <h3 className="font-display text-sm font-bold text-[#111827]">
                Últimos Movimientos de Caja Asentados
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('movimientos')}
                className="text-xs font-bold text-[#111827] hover:underline"
              >
                Ver todos ({data.todosMovimientos.length}) →
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#9CA3AF]/15">
              {data.movimientosRecientes.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMovimientoDetalle(m)}
                  className="flex items-center justify-between py-2.5 hover:bg-[#EDEDED]/30 rounded-lg px-2 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        m.tipo === 'INGRESO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.tipo === 'EGRESO'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {m.tipo === 'INGRESO' ? '+' : m.tipo === 'EGRESO' ? '-' : '↔'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#111827] truncate max-w-[220px] sm:max-w-md">
                        {m.concepto}
                      </p>
                      <p className="text-[10px] text-[#4B5563]">
                        {new Date(m.fechaMovimiento).toLocaleDateString('es-CO')} · {m.metodoPago}
                        {m.contratoId ? ` · Contrato #${m.contratoId}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono text-xs font-bold ${
                        m.tipo === 'INGRESO'
                          ? 'text-emerald-700'
                          : m.tipo === 'EGRESO'
                            ? 'text-rose-700'
                            : 'text-[#111827]'
                      }`}
                    >
                      {m.tipo === 'INGRESO' ? '+ ' : m.tipo === 'EGRESO' ? '- ' : ''}
                      {formatearMonedaCOP(m.monto)}
                    </span>
                    <p className="text-[10px] text-[#9CA3AF]">{m.estado}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LIBRO COMPLETO DE MOVIMIENTOS */}
      {/* ============================================================== */}
      {activeTab === 'movimientos' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Buscador */}
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder="Buscar por concepto, cliente, contrato, referencia..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                />
              </div>

              {/* Filtro Tipo */}
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              >
                <option value="TODOS">Todos los Tipos</option>
                <option value="INGRESO">Solo Ingresos (+)</option>
                <option value="EGRESO">Solo Egresos (-)</option>
                <option value="TRANSFERENCIA">Solo Transferencias (↔)</option>
              </select>

              {/* Filtro Método */}
              <select
                value={filtroMetodo}
                onChange={(e) => setFiltroMetodo(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              >
                <option value="TODOS">Todos los Métodos</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="especie">En Especie</option>
              </select>

              {/* Filtro Cuenta */}
              <select
                value={filtroCuenta}
                onChange={(e) => setFiltroCuenta(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              >
                <option value="TODAS">Todas las Cuentas</option>
                {data.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              {/* Filtro Estado */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="CONFIRMADO">Confirmados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="ANULADO">Anulados</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-[#4B5563] pt-2 border-t border-[#9CA3AF]/15">
              <span>
                Mostrando <b>{movimientosFiltrados.length}</b> de <b>{data.todosMovimientos.length}</b> movimientos
              </span>
              <button
                type="button"
                onClick={() => descargarCsv(exportarMovimientosCsv(movimientosFiltrados), 'movimientos_flotax_filtrados.csv')}
                className="font-bold text-[#111827] hover:underline"
              >
                ⬇ Descargar CSV filtrado
              </button>
            </div>
          </div>

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
                    className="p-4 hover:bg-[#EDEDED]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          m.estado === 'ANULADO'
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
                          className={`font-mono text-sm font-black ${
                            m.estado === 'ANULADO'
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
                          className="min-h-[38px] rounded-lg border border-[#9CA3AF]/40 px-3 text-xs font-semibold text-[#111827] hover:bg-[#EDEDED]"
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
                            className="min-h-[38px] rounded-lg border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
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
                      className="min-h-[44px] rounded-full bg-[#111827] px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1F2937] active:scale-95 cursor-pointer"
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
                    className="min-h-[44px] shrink-0 rounded-full bg-emerald-700 px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95 cursor-pointer"
                  >
                    Abrir Turno de Caja
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Historial de Cierres Anteriores */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
              <h3 className="font-display text-sm font-bold text-[#111827]">
                Historial de Arqueos y Cierres ({data.historialSesionesCaja.length})
              </h3>
              <button
                type="button"
                onClick={() => descargarCsv(exportarSesionesCajaCsv(data.historialSesionesCaja), 'historial_arqueos_caja.csv')}
                className="text-xs font-bold text-[#111827] hover:underline"
              >
                ⬇ Exportar Historial CSV
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#9CA3AF]/15">
              {data.historialSesionesCaja.map((s) => (
                <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#111827]">
                        Sesión #{s.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          s.estado === 'ABIERTA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#EDEDED] text-[#4B5563]'
                        }`}
                      >
                        {s.estado}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      Apertura: {new Date(s.fechaApertura).toLocaleString('es-CO')}
                      {s.fechaCierre ? ` · Cierre: ${new Date(s.fechaCierre).toLocaleString('es-CO')}` : ''}
                    </p>
                    {s.motivoDiferencia && (
                      <p className="text-[10px] text-rose-700 font-medium mt-0.5">
                        Nota de diferencia: {s.motivoDiferencia}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right text-xs">
                    <p className="font-mono font-bold text-[#111827]">
                      Base Inicial: {formatearMonedaCOP(s.saldoInicialContado)}
                    </p>
                    {s.saldoRealContado !== null && s.saldoRealContado !== undefined && (
                      <p className="font-mono text-[11px] text-[#4B5563]">
                        Contado: {formatearMonedaCOP(s.saldoRealContado)}{' '}
                        {s.diferencia !== null && s.diferencia !== 0 && (
                          <span className={s.diferencia > 0 ? 'text-amber-700' : 'text-rose-700'}>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] border border-[#9CA3AF]/30 bg-white p-4 shadow-xs">
            <div>
              <h3 className="font-display text-sm font-bold text-[#111827]">
                Cartera de Alquileres y Saldos Pendientes
              </h3>
              <p className="text-xs text-[#4B5563]">
                Total pendiente por cobrar en cartera activa:{' '}
                <b className="text-[#111827]">{formatearMonedaCOP(data.indicadores.cuentasPorCobrar)}</b>
              </p>
            </div>
            <button
              type="button"
              onClick={() => descargarCsv(exportarCarteraContratosCsv(data.carteraContratos), 'cartera_flotax_alquileres.csv')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#9CA3AF]/40 px-3 text-xs font-bold text-[#111827] hover:bg-[#EDEDED]"
            >
              ⬇ Exportar Cartera CSV
            </button>
          </div>

          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white overflow-hidden shadow-xs divide-y divide-[#9CA3AF]/20">
            {data.carteraContratos.map((c) => (
              <div
                key={c.codigoContrato}
                className="p-4 hover:bg-[#EDEDED]/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#111827]">
                      #{c.codigoContrato}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        c.estadoPago === 'PAGADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.estadoPago === 'PARCIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : c.estadoPago === 'VENCIDO'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-neutral-100 text-[#4B5563]'
                      }`}
                    >
                      {c.estadoPago}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#111827] mt-0.5">
                    {c.clienteNombre}{' '}
                    {c.clienteDocumento && (
                      <span className="text-xs font-normal text-[#4B5563]">({c.clienteDocumento})</span>
                    )}
                  </h4>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    Unidad: <b>{c.vehiculoNombre}</b> · Placa: <span className="font-mono font-bold">{c.vehiculoPlaca}</span> · Rango: {c.fechaInicio} al {c.fechaFin}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-0 border-[#9CA3AF]/10">
                  <div className="text-left sm:text-right text-xs">
                    <p className="text-[#4B5563]">
                      Total: <span className="font-mono font-bold text-[#111827]">{formatearMonedaCOP(c.totalAlquiler)}</span>
                    </p>
                    <p className="text-[#4B5563]">
                      Abonado: <span className="font-mono font-bold text-emerald-700">{formatearMonedaCOP(c.totalAbonado)}</span>
                    </p>
                    <p className="font-bold text-sm text-[#111827]">
                      Saldo:{' '}
                      <span className={`font-mono ${c.saldoPendiente > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
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
                          setModalMovimientoAbierto(true);
                        }}
                        className="min-h-[38px] rounded-lg bg-[#111827] px-3 text-xs font-bold text-white hover:bg-[#1F2937] transition"
                      >
                        Registrar Abono
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirComprobanteContrato(c)}
                      className="min-h-[38px] rounded-lg border border-[#9CA3AF]/40 px-3 text-xs font-semibold text-[#111827] hover:bg-[#EDEDED] transition"
                    >
                      Comprobante
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: DEPÓSITOS DE GARANTÍA */}
      {/* ============================================================== */}
      {activeTab === 'garantias' && (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-5 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#9CA3AF]/20">
              <div>
                <h3 className="font-display text-sm font-bold text-[#111827]">
                  Control de Depósitos de Garantía (Fianzas en Custodia)
                </h3>
                <p className="text-xs text-[#4B5563]">
                  El dinero recibido como depósito de garantía es una custodia de seguridad y <b>no</b> se contabiliza como ingreso operativo del negocio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => descargarCsv(exportarGarantiasCsv(data.depositosGarantia), 'depositos_garantia_flotax.csv')}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#9CA3AF]/40 px-3 text-xs font-bold text-[#111827] hover:bg-[#EDEDED]"
              >
                ⬇ Exportar Garantías CSV
              </button>
            </div>
            <div className="pt-2 text-xs text-[#4B5563]">
              Compromiso total por devolver a clientes:{' '}
              <b className="text-amber-800 font-mono text-sm">
                {formatearMonedaCOP(data.indicadores.depositosPorDevolver)}
              </b>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white overflow-hidden shadow-xs divide-y divide-[#9CA3AF]/20">
            {data.depositosGarantia.map((g) => {
              const saldoComp = Math.max(
                0,
                (g.montoRecibido || 0) - (g.montoDevuelto || 0) - (g.montoRetenido || 0)
              );

              return (
                <div
                  key={g.id}
                  className="p-4 hover:bg-[#EDEDED]/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#111827]">
                        Contrato #{g.contratoId}
                      </span>
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[9px] font-bold text-[#111827]">
                        {g.estado}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111827] mt-0.5">
                      {g.clienteNombre}
                    </h4>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Garantía requerida: {formatearMonedaCOP(g.montoEsperado)} · Recibido: {formatearMonedaCOP(g.montoRecibido)}
                    </p>
                    {g.observaciones && (
                      <p className="text-[11px] text-[#4B5563] italic mt-0.5">{g.observaciones}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-0 border-[#9CA3AF]/10">
                    <div className="text-left sm:text-right text-xs">
                      <p className="text-[#4B5563]">
                        Saldo en Custodia: <span className="font-mono font-bold text-[#111827]">{formatearMonedaCOP(saldoComp)}</span>
                      </p>
                      {g.montoDevuelto > 0 && (
                        <p className="text-emerald-700">Devuelto: {formatearMonedaCOP(g.montoDevuelto)}</p>
                      )}
                      {g.montoRetenido > 0 && (
                        <p className="text-rose-700">Retenido por Daños: {formatearMonedaCOP(g.montoRetenido)}</p>
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
                          className="min-h-[38px] rounded-lg bg-[#111827] px-3 text-xs font-bold text-white hover:bg-[#1F2937]"
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
                            className="min-h-[38px] rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
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
                            className="min-h-[38px] rounded-lg border border-rose-300 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50"
                          >
                            Retener Daño
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: GASTOS Y PROVEEDORES */}
      {/* ============================================================== */}
      {activeTab === 'gastos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] border border-[#9CA3AF]/30 bg-white p-4 shadow-xs">
            <div>
              <h3 className="font-display text-sm font-bold text-[#111827]">
                Gastos Operativos y Control de Proveedores
              </h3>
              <p className="text-xs text-[#4B5563]">
                Total de egresos registrados en el período:{' '}
                <b className="text-rose-700">{formatearMonedaCOP(data.indicadores.egresosPeriodo)}</b>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTipoModalMovimiento('EGRESO');
                setModalMovimientoAbierto(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
            >
              + Registrar Gasto
            </button>
          </div>

          {/* Listado de egresos */}
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white overflow-hidden shadow-xs divide-y divide-[#9CA3AF]/20">
            {data.todosMovimientos
              .filter((m) => m.tipo === 'EGRESO')
              .map((g) => (
                <div key={g.id} className="p-4 hover:bg-[#EDEDED]/40 transition flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">{g.concepto}</h4>
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      Categoría: {g.categoria} · Proveedor: {g.proveedor || 'No especificado'} · Fecha: {new Date(g.fechaMovimiento).toLocaleDateString('es-CO')}
                      {g.vehiculoId ? ` · Vehículo: ${g.vehiculoId}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-rose-700">
                      - {formatearMonedaCOP(g.monto)}
                    </span>
                    <p className="text-[10px] text-[#9CA3AF]">{g.metodoPago}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: CUENTAS Y MÉTODOS DE PAGO */}
      {/* ============================================================== */}
      {activeTab === 'cuentas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] border border-[#9CA3AF]/30 bg-white p-4 shadow-xs">
            <div>
              <h3 className="font-display text-sm font-bold text-[#111827]">
                Catálogo de Cajas y Cuentas Bancarias
              </h3>
              <p className="text-xs text-[#4B5563]">
                Total de fondos consolidados en cuentas:{' '}
                <b className="text-[#111827]">{formatearMonedaCOP(data.indicadores.totalEnCuentas)}</b>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalTransferenciaAbierto(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#9CA3AF]/40 bg-white px-3.5 py-1.5 text-xs font-bold text-[#111827] hover:bg-[#EDEDED]"
              >
                ↔ Transferencia
              </button>
              <button
                type="button"
                onClick={() => setModalNuevaCuentaAbierto(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#111827] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1F2937]"
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
                  className="ios-press-bounce rounded-[26px] border border-[#9CA3AF]/30 bg-white p-5 shadow-md transition-all duration-200 hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDEDED] text-[#111827]">
                        {c.tipo === 'EFECTIVO' ? (
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
                        <span className="rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#111827]">
                          {c.tipo}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Activa
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display text-base font-bold text-[#111827] mt-3.5">
                      {c.nombre}
                    </h4>
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      Base inicial: {formatearMonedaCOP(c.saldoInicial)}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-[#9CA3AF]/15 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                      Saldo Disponible Calculado
                    </span>
                    <p className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] mt-0.5">
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
          <div className="rounded-[24px] border border-[#9CA3AF]/30 bg-white p-5 shadow-xs space-y-3">
            <h3 className="font-display text-sm font-bold text-[#111827]">
              Módulo de Reportes Contables y Auditoría Operativa
            </h3>
            <p className="text-xs text-[#4B5563]">
              Genera reportes instantáneos basados en los registros auditables del sistema. Los resultados representan indicadores financieros operativos de patio.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              {[
                { id: 1, titulo: '1. Ingresos y Egresos del Período', desc: 'Resumen consolidado de entradas y salidas' },
                { id: 2, titulo: '2. Flujo Neto de Caja', desc: 'Evolución diaria de recaudos vs pagos' },
                { id: 3, titulo: '3. Saldos por Caja y Cuenta', desc: 'Conciliación por cuenta financiera' },
                { id: 4, titulo: '4. Cuentas por Cobrar & Vencimientos', desc: 'Saldos de alquileres pendientes' },
                { id: 5, titulo: '5. Garantías en Custodia', desc: 'Pasivos comprometidos por devolver' },
                { id: 6, titulo: '6. Gastos por Categoría', desc: 'Mantenimiento, combustible, seguros' },
                { id: 7, titulo: '7. Costos por Vehículo de Flota', desc: 'Gastos imputados a cada unidad' },
                { id: 8, titulo: '8. Pagos por Método Recaudado', desc: 'Efectivo, transferencias y tarjetas' },
                { id: 9, titulo: '9. Cierres de Caja y Arqueos', desc: 'Diferencias y faltantes de turno' },
              ].map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setReporteSeleccionado(rep.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    reporteSeleccionado === rep.id
                      ? 'border-[#111827] bg-[#EDEDED]/40 shadow-xs'
                      : 'border-[#9CA3AF]/20 hover:border-[#9CA3AF]/60'
                  }`}
                >
                  <h4 className="text-xs font-bold text-[#111827]">{rep.titulo}</h4>
                  <p className="text-[11px] text-[#4B5563] mt-1">{rep.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#9CA3AF]/20">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[40px] rounded-lg border border-[#9CA3AF]/40 px-4 text-xs font-bold text-[#111827] hover:bg-[#EDEDED]"
              >
                🖨 Vista Imprimible
              </button>
              <button
                type="button"
                onClick={() => descargarCsv(exportarMovimientosCsv(data.todosMovimientos), `reporte_${reporteSeleccionado}_flotax.csv`)}
                className="min-h-[40px] rounded-lg bg-[#111827] px-4 text-xs font-bold text-white hover:bg-[#1F2937]"
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
        isOpen={modalMovimientoAbierto}
        onClose={() => setModalMovimientoAbierto(false)}
        tipoInicial={tipoModalMovimiento}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
              <span className="font-mono text-xs font-bold text-[#4B5563]">
                Movimiento #{movimientoDetalle.id}
              </span>
              <button
                type="button"
                onClick={() => setMovimientoDetalle(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] hover:bg-[#9CA3AF]/30"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Tipo:</span>
                <span className="font-bold text-[#111827]">{movimientoDetalle.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Categoría:</span>
                <span className="font-medium text-[#111827]">{movimientoDetalle.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Concepto:</span>
                <span className="font-semibold text-[#111827] text-right max-w-[220px]">{movimientoDetalle.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Monto:</span>
                <span className="font-mono font-black text-sm text-[#111827]">
                  {formatearMonedaCOP(movimientoDetalle.monto)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Método de Pago:</span>
                <span className="uppercase text-[#111827]">{movimientoDetalle.metodoPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Fecha:</span>
                <span className="text-[#111827]">
                  {new Date(movimientoDetalle.fechaMovimiento).toLocaleString('es-CO')}
                </span>
              </div>
              {movimientoDetalle.referencia && (
                <div className="flex justify-between">
                  <span className="text-[#4B5563]">Referencia:</span>
                  <span className="font-mono text-[#111827]">{movimientoDetalle.referencia}</span>
                </div>
              )}
              {movimientoDetalle.clienteNombre && (
                <div className="flex justify-between">
                  <span className="text-[#4B5563]">Cliente:</span>
                  <span className="text-[#111827]">{movimientoDetalle.clienteNombre}</span>
                </div>
              )}
              {movimientoDetalle.proveedor && (
                <div className="flex justify-between">
                  <span className="text-[#4B5563]">Proveedor:</span>
                  <span className="text-[#111827]">{movimientoDetalle.proveedor}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Estado:</span>
                <span className="font-bold text-[#111827]">{movimientoDetalle.estado}</span>
              </div>
              {movimientoDetalle.motivoAnulacion && (
                <div className="rounded-lg bg-rose-50 p-2 text-rose-800">
                  <b>Motivo de anulación:</b> {movimientoDetalle.motivoAnulacion}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#9CA3AF]/20">
              <button
                type="button"
                onClick={() => setMovimientoDetalle(null)}
                className="min-h-[40px] rounded-full border border-[#9CA3AF]/40 px-4 text-xs font-semibold text-[#4B5563]"
              >
                Cerrar
              </button>
              {movimientoDetalle.estado === 'CONFIRMADO' && (
                <button
                  type="button"
                  onClick={() => setModalAnularAbierto(true)}
                  className="min-h-[40px] rounded-full bg-rose-700 px-4 text-xs font-bold text-white hover:bg-rose-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-rose-300 bg-white p-5 sm:p-6 shadow-2xl">
            <h3 className="font-display text-base font-black text-rose-800">
              ¿Confirmar Anulación de Movimiento?
            </h3>
            <p className="mt-2 text-xs text-[#4B5563]">
              Esta operación es irreversible y quedará registrada en la auditoría inmutable del sistema. Se corregirán automáticamente los saldos contables y de cartera correspondientes.
            </p>

            <div className="mt-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                Motivo Obligatorio de Anulación *
              </label>
              <textarea
                rows={3}
                placeholder="Explica la causa por la cual se revierte este movimiento..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-base text-[#111827] focus:outline-hidden"
                required
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalAnularAbierto(false)}
                className="min-h-[40px] rounded-full border border-[#9CA3AF]/40 px-4 text-xs font-semibold text-[#4B5563]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnulacion}
                disabled={!motivoAnulacion.trim() || motivoAnulacion.trim().length < 5}
                className="min-h-[40px] rounded-full bg-rose-700 px-5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Nueva Cuenta */}
      {modalNuevaCuentaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
              <h3 className="font-display text-base font-black text-[#111827]">
                Crear Nueva Cuenta o Caja
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevaCuentaAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCuenta} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                  Nombre de la Cuenta *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Davivienda Cuenta Corriente"
                  value={nombreNuevaCuenta}
                  onChange={(e) => setNombreNuevaCuenta(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                  Tipo de Cuenta *
                </label>
                <select
                  value={tipoNuevaCuenta}
                  onChange={(e) => setTipoNuevaCuenta(e.target.value as any)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827]"
                >
                  <option value="BANCO">Cuenta Bancaria</option>
                  <option value="CAJA_EFECTIVO">Caja Física de Efectivo</option>
                  <option value="BILLETERA_DIGITAL">Billetera Digital (Nequi/Daviplata)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                  Saldo Inicial en COP *
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  value={saldoInicialNuevaCuenta}
                  onChange={(e) => setSaldoInicialNuevaCuenta(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#9CA3AF]/20">
                <button
                  type="button"
                  onClick={() => setModalNuevaCuentaAbierto(false)}
                  className="min-h-[40px] rounded-full border border-[#9CA3AF]/40 px-4 text-xs font-semibold text-[#4B5563]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-full bg-[#111827] px-5 text-xs font-bold text-white hover:bg-[#1F2937]"
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
