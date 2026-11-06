import { useState, type SyntheticEvent } from 'react';
import { navigate } from 'astro:transitions/client';
import { MapPin, Calendar, Clock, Search } from 'lucide-react';

interface CategoryOption {
  id: 'todos' | 'carros' | 'motos';
  label: string;
  count: number;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'todos', label: 'Todos', count: 120 },
  { id: 'carros', label: 'Carros', count: 84 },
  { id: 'motos', label: 'Motos', count: 36 },
];

const HORAS_DISPONIBLES = [
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatearFechaHumana(isoStr?: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];
  if (!p0 || !p1 || !p2) return isoStr;
  const y = p0;
  const m = parseInt(p1, 10) - 1;
  const d = parseInt(p2, 10);
  const mes = MESES_ABR[m] || p1;
  return `${d} ${mes} ${y}`;
}

export function LandingBookingIsland() {
  const [selectedCat, setSelectedCat] = useState<'todos' | 'carros' | 'motos'>('todos');
  const [sede, setSede] = useState('centro');

  // Format default dates in YYYY-MM-DD
  const today = new Date();
  const returnDate = new Date();
  returnDate.setDate(today.getDate() + 3);

  const formatDateVal = (d: Date) => d.toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(formatDateVal(today));
  const [horaInicio, setHoraInicio] = useState('10:00 AM');
  const [fechaFin, setFechaFin] = useState(formatDateVal(returnDate));
  const [horaFin, setHoraFin] = useState('10:00 AM');

  const handleSearchSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCat !== 'todos') {
      params.set('cat', selectedCat);
    }
    if (sede) {
      params.set('sede', sede);
    }
    if (fechaInicio) {
      params.set('desde', fechaInicio);
    }
    if (horaInicio) {
      params.set('hora_desde', horaInicio);
    }
    if (fechaFin) {
      params.set('hasta', fechaFin);
    }
    if (horaFin) {
      params.set('hora_hasta', horaFin);
    }
    const query = params.toString();
    navigate(query ? `/catalogo?${query}` : '/catalogo');
  };

  return (
    <div
      id="reservar"
      data-pencil-name="BookingSection"
      className="w-full"
    >
      {/* Canonical Flat Pure White Card: rounded-[42px], p-5 sm:p-6, no borders, no shadows */}
      <div className="w-full bg-white dark:bg-[#1F2937] dark:border dark:border-white/10 rounded-[42px] p-5 sm:p-6 flex flex-col gap-5 transition-colors">
        
        <form
          action="/catalogo"
          method="GET"
          onSubmit={handleSearchSubmit}
          className="w-full flex flex-col gap-4 sm:gap-5"
        >
          {/* Hidden Category Filter */}
          {selectedCat !== 'todos' && (
            <input type="hidden" name="cat" value={selectedCat} />
          )}

          {/* Row 1: The 3 Primary Input Fields (Border-free, Shadow-free, Subtle Matte Fill) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            
            {/* Field 1: Punto de Entrega */}
            <div className="flex flex-col">
              <label htmlFor="sede-select" className="block text-sm font-bold text-[#111827] dark:text-[#EDEDED] mb-2">
                Punto de entrega
              </label>
              <div className="h-12 px-4 rounded-full bg-[#F9FAFB] dark:bg-[#111827] dark:border dark:border-white/10 hover:bg-[#F3F4F6] dark:hover:bg-[#111827]/80 focus-within:bg-[#EEF2F6] dark:focus-within:bg-[#111827] transition-colors flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                <select
                  id="sede-select"
                  name="sede"
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="w-full min-h-[44px] bg-transparent text-sm font-semibold text-[#1F2937] dark:text-[#EDEDED] font-[Manrope,system-ui,sans-serif] cursor-pointer truncate"
                >
                  <option value="centro" className="bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED]">Patio Central · Aeropuerto</option>
                  <option value="norte" className="bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED]">Patio Norte · Zona Financiera</option>
                  <option value="sur" className="bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED]">Patio Sur · Terminal Terrestre</option>
                </select>
              </div>
            </div>

            {/* Field 2: Fecha y Hora de Recogida */}
            <div className="flex flex-col">
              <label htmlFor="fecha-recogida" className="block text-sm font-bold text-[#111827] dark:text-[#EDEDED] mb-2">
                Recogida
              </label>
              <div className="h-12 px-4 rounded-full bg-[#F9FAFB] dark:bg-[#111827] dark:border dark:border-white/10 hover:bg-[#F3F4F6] dark:hover:bg-[#111827]/80 focus-within:bg-[#EEF2F6] dark:focus-within:bg-[#111827] focus-within:ring-2 focus-within:ring-[#111827] focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-[#EDEDED] dark:focus-within:ring-offset-[#1F2937] transition-colors flex items-center justify-between gap-2.5">
                {/* Date Button with Hidden Native Picker */}
                <div className="relative flex h-full items-center gap-2 min-w-0 flex-1 cursor-pointer">
                  <Calendar className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                  <span className="text-sm font-semibold text-[#1F2937] dark:text-[#EDEDED] truncate font-[Manrope,system-ui,sans-serif]">
                    {formatearFechaHumana(fechaInicio)}
                  </span>
                  <input
                    id="fecha-recogida"
                    type="date"
                    name="desde"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    aria-label="Seleccionar fecha de recogida"
                  />
                </div>

                {/* Vertical Divider Line with partial height */}
                <div className="h-4.5 w-px bg-[#D1D5DB] dark:bg-white/15 shrink-0" aria-hidden="true" />

                {/* Time Selector */}
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                  <select
                    name="hora_desde"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="min-h-[44px] bg-transparent text-xs sm:text-[13px] font-semibold text-[#1F2937] dark:text-[#EDEDED] cursor-pointer"
                    aria-label="Seleccionar hora de recogida"
                  >
                    {HORAS_DISPONIBLES.map((h) => (
                      <option key={h} value={h} className="bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED]">{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Field 3: Fecha y Hora de Devolución */}
            <div className="flex flex-col">
              <label htmlFor="fecha-devolucion" className="block text-sm font-bold text-[#111827] dark:text-[#EDEDED] mb-2">
                Devolución
              </label>
              <div className="h-12 px-4 rounded-full bg-[#F9FAFB] dark:bg-[#111827] dark:border dark:border-white/10 hover:bg-[#F3F4F6] dark:hover:bg-[#111827]/80 focus-within:bg-[#EEF2F6] dark:focus-within:bg-[#111827] focus-within:ring-2 focus-within:ring-[#111827] focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-[#EDEDED] dark:focus-within:ring-offset-[#1F2937] transition-colors flex items-center justify-between gap-2.5">
                {/* Date Button with Hidden Native Picker */}
                <div className="relative flex h-full items-center gap-2 min-w-0 flex-1 cursor-pointer">
                  <Calendar className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                  <span className="text-sm font-semibold text-[#1F2937] dark:text-[#EDEDED] truncate font-[Manrope,system-ui,sans-serif]">
                    {formatearFechaHumana(fechaFin)}
                  </span>
                  <input
                    id="fecha-devolucion"
                    type="date"
                    name="hasta"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    aria-label="Seleccionar fecha de devolución"
                  />
                </div>

                {/* Vertical Divider Line with partial height */}
                <div className="h-4.5 w-px bg-[#D1D5DB] dark:bg-white/15 shrink-0" aria-hidden="true" />

                {/* Time Selector */}
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                  <select
                    name="hora_hasta"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="min-h-[44px] bg-transparent text-xs sm:text-[13px] font-semibold text-[#1F2937] dark:text-[#EDEDED] cursor-pointer"
                    aria-label="Seleccionar hora de devolución"
                  >
                    {HORAS_DISPONIBLES.map((h) => (
                      <option key={h} value={h} className="bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED]">{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Bottom Action Bar (Chips on Left, CTA on Right) */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-1">
            {/* Category Filter Pills on Left (Borders Intact) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCat(cat.id)}
                    className={`min-h-[44px] px-4 flex items-center gap-2 rounded-full text-xs sm:text-sm font-semibold fx-press cursor-pointer ${
                      isActive
                        ? 'bg-[#111827] text-white border border-[#111827] dark:bg-white dark:text-[#111827] dark:border-white'
                        : 'bg-[#F5F5F5] text-[#111827] border border-[#E5E5E5] hover:border-[#A3A3A3] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/10 dark:hover:border-white/30'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-[#111827]/20 dark:text-[#111827]'
                          : 'bg-[#111827]/5 text-[#6B7280] dark:bg-white/10 dark:text-[#9CA3AF]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search CTA on Right (Shadow Free) */}
            <button
              type="submit"
              className="h-11 sm:h-12 px-6 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#111827] dark:hover:bg-[#EDEDED] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 fx-press cursor-pointer shrink-0 self-stretch sm:self-auto"
            >
              <Search className="w-4 h-4 text-white dark:text-[#111827]" strokeWidth={2} />
              <span>Buscar Unidades</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
