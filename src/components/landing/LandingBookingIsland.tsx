import { useState } from 'react';

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

export function LandingBookingIsland() {
  const [selectedCat, setSelectedCat] = useState<'todos' | 'carros' | 'motos'>('todos');
  const [sede, setSede] = useState('centro');

  // Format default dates in YYYY-MM-DD
  const today = new Date();
  const returnDate = new Date();
  returnDate.setDate(today.getDate() + 3);

  const formatDateVal = (d: Date) => d.toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(formatDateVal(today));
  const [fechaFin, setFechaFin] = useState(formatDateVal(returnDate));

  return (
    <section
      id="reservar"
      data-pencil-name="BookingSection"
      className="relative z-20 w-full px-4 sm:px-6 lg:px-8 -mt-2 sm:-mt-6 md:-mt-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Outer Shell Double-Bezel Architecture */}
        <div className="p-2 sm:p-3 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-white/90 to-[#F4F6FA]/90 border border-white/80 shadow-[0_24px_50px_-12px_rgba(12,17,32,0.14)] backdrop-blur-xl animate-fade-up delay-200">
          {/* Inner Core Container */}
          <div className="w-full bg-white rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 md:p-7 border border-[#E8ECF3] flex flex-col gap-5 sm:gap-6">
            
            {/* Category Selector Filter Pills & Status */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F4F6FA]">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[#9AA3B2] font-semibold mr-1 shrink-0">
                  Categoría:
                </span>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCat(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-[#0C1120] text-white shadow-xs'
                          : 'bg-[#F4F6FA] hover:bg-[#EEF2F6] text-[#3E4756] font-semibold'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'text-[#9AA3B2]'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Reserva en 3 pasos con confirmación inmediata</span>
              </div>
            </div>

            {/* Integrated Horizontal Search Command Bar */}
            <form action="/catalogo" method="GET" className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              {/* Hidden Category Filter if specific */}
              {selectedCat !== 'todos' && (
                <input type="hidden" name="cat" value={selectedCat} />
              )}

              {/* Field 1: Patio de Recogida (4 cols on Desktop) */}
              <div className="md:col-span-4 flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E8ECF3] hover:border-[#2E4E8F]/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#2E4E8F]/10 flex items-center justify-center shrink-0 text-[#2E4E8F]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <label htmlFor="sede-select" className="text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] font-bold">
                    Punto de Entrega
                  </label>
                  <select
                    id="sede-select"
                    name="sede"
                    value={sede}
                    onChange={(e) => setSede(e.target.value)}
                    className="w-full bg-transparent text-base font-bold text-[#0C1120] font-[Manrope,system-ui,sans-serif] focus:outline-none cursor-pointer truncate"
                  >
                    <option value="centro">Patio Central · Aeropuerto</option>
                    <option value="norte">Patio Norte · Zona Financiera</option>
                    <option value="sur">Patio Sur · Terminal Terrestre</option>
                  </select>
                </div>
              </div>

              {/* Field 2: Recogida (3 cols on Desktop) */}
              <div className="md:col-span-3 flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E8ECF3] hover:border-[#2E4E8F]/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#2E4E8F]/10 flex items-center justify-center shrink-0 text-[#2E4E8F]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <label htmlFor="fecha-recogida" className="text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] font-bold">
                    Fecha Recogida
                  </label>
                  <input
                    id="fecha-recogida"
                    type="date"
                    name="desde"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-transparent text-base font-bold text-[#0C1120] font-[Manrope,system-ui,sans-serif] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Field 3: Devolución (2 cols on Desktop) */}
              <div className="md:col-span-2 flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E8ECF3] hover:border-[#2E4E8F]/40 transition-colors">
                <div className="flex flex-col min-w-0 flex-1 pl-1">
                  <label htmlFor="fecha-devolucion" className="text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] font-bold">
                    Devolución
                  </label>
                  <input
                    id="fecha-devolucion"
                    type="date"
                    name="hasta"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full bg-transparent text-base font-bold text-[#0C1120] font-[Manrope,system-ui,sans-serif] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Button: Search (3 cols on Desktop) */}
              <div className="md:col-span-3 flex items-center">
                <button
                  type="submit"
                  className="shiny-cta w-full h-full min-h-[52px] sm:min-h-[58px] text-sm sm:text-base cursor-pointer group"
                >
                  <span>
                    <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar Unidades
                  </span>
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </section>
  );
}
