import * as React from "react"
import { motion, type PanInfo } from "framer-motion"
import { cn } from "@/lib/utils"

export interface RequirementItem {
  id: number
  name: string
  description: string
  step: string
  icon: "id" | "license" | "age" | "card" | "lock" | "sign"
}

export const REQUIREMENTS_DATA: RequirementItem[] = [
  {
    id: 1,
    step: "01",
    name: "Identificación Oficial",
    description: "INE, pasaporte o documento nacional vigente.",
    icon: "id",
  },
  {
    id: 2,
    step: "02",
    name: "Licencia de Conducir",
    description: "Acreditación vigente para la categoría elegida.",
    icon: "license",
  },
  {
    id: 3,
    step: "03",
    name: "Edad Mínima",
    description: "Mayor de 21 años para automóviles, 18 para motos.",
    icon: "age",
  },
  {
    id: 4,
    step: "04",
    name: "Método de Pago",
    description: "Tarjeta de crédito, débito o transferencia verificada.",
    icon: "card",
  },
  {
    id: 5,
    step: "05",
    name: "Depósito de Garantía",
    description: "Retención preventiva reembolsable al check-out.",
    icon: "lock",
  },
  {
    id: 6,
    step: "06",
    name: "Firma Electrónica",
    description: "Validación digital de contrato en segundos.",
    icon: "sign",
  },
]

function RequirementIcon({ icon }: { icon: RequirementItem["icon"] }) {
  switch (icon) {
    case "id":
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      )
    case "license":
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    case "age":
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case "card":
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    case "lock":
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    case "sign":
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
  }
}

export interface RequirementsCarouselProps
  extends React.HTMLAttributes<HTMLDivElement> {
  showArrows?: boolean
  showDots?: boolean
}

export function RequirementsCarousel({
  className = "",
  showArrows = true,
  showDots = true,
  ...props
}: RequirementsCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [exitX, setExitX] = React.useState<number>(0)

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (Math.abs(info.offset.x) > 100) {
      setExitX(info.offset.x)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % REQUIREMENTS_DATA.length)
        setExitX(0)
      }, 200)
    }
  }

  const nextCard = () => {
    setExitX(-200)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % REQUIREMENTS_DATA.length)
      setExitX(0)
    }, 200)
  }

  const prevCard = () => {
    setExitX(200)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + REQUIREMENTS_DATA.length) % REQUIREMENTS_DATA.length)
      setExitX(0)
    }, 200)
  }

  return (
    <div
      className={cn(
        "h-80 w-full flex items-center justify-center select-none py-4",
        className,
      )}
      {...props}
    >
      <div className="relative w-80 sm:w-96 h-64 sm:h-72">
        {REQUIREMENTS_DATA.map((item, index) => {
          const isCurrentCard = index === currentIndex
          const isPrevCard =
            index === (currentIndex + 1) % REQUIREMENTS_DATA.length
          const isNextCard =
            index === (currentIndex + 2) % REQUIREMENTS_DATA.length

          if (!isCurrentCard && !isPrevCard && !isNextCard) return null

          return (
            <motion.div
              key={item.id}
              className={cn(
                "absolute w-full h-full rounded-2xl cursor-grab active:cursor-grabbing",
                "bg-white shadow-xl border border-[#E8ECF3] p-6 flex flex-col items-center justify-between",
                "dark:bg-card dark:shadow-[2px_2px_4px_rgba(0,0,0,0.4),-1px_-1px_3px_rgba(255,255,255,0.1)]",
              )}
              style={{
                zIndex: isCurrentCard ? 3 : isPrevCard ? 2 : 1,
              }}
              drag={isCurrentCard ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              {...(isCurrentCard ? { onDragEnd: handleDragEnd } : {})}
              initial={{
                scale: 0.95,
                opacity: 0,
                y: isCurrentCard ? 0 : isPrevCard ? 8 : 16,
                rotate: isCurrentCard ? 0 : isPrevCard ? -2 : -4,
              }}
              animate={{
                scale: isCurrentCard ? 1 : 0.95,
                opacity: isCurrentCard ? 1 : isPrevCard ? 0.6 : 0.3,
                x: isCurrentCard ? exitX : 0,
                y: isCurrentCard ? 0 : isPrevCard ? 8 : 16,
                rotate: isCurrentCard ? exitX / 20 : isPrevCard ? -2 : -4,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              {showArrows && isCurrentCard && (
                <div className="absolute inset-x-0 top-3 flex justify-between px-4 z-10 pointer-events-auto">
                  <span
                    onClick={prevCard}
                    className="text-2xl select-none cursor-pointer text-gray-300 hover:text-gray-500 dark:text-muted-foreground dark:hover:text-primary transition-colors"
                    role="button"
                    aria-label="Requisito anterior"
                  >
                    &larr;
                  </span>
                  <span
                    onClick={nextCard}
                    className="text-2xl select-none cursor-pointer text-gray-300 hover:text-gray-500 dark:text-muted-foreground dark:hover:text-primary transition-colors"
                    role="button"
                    aria-label="Siguiente requisito"
                  >
                    &rarr;
                  </span>
                </div>
              )}

              <div className="p-2 flex flex-col items-center gap-3 text-center pointer-events-none mt-1">
                <div className="w-16 h-16 rounded-full bg-[#EEF2F6] text-[#2E4E8F] flex items-center justify-center shadow-xs">
                  <RequirementIcon icon={item.icon} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-foreground font-[Manrope,system-ui,sans-serif]">
                  {item.name}
                </h3>
                <p className="text-center text-sm text-gray-600 dark:text-muted-foreground leading-relaxed px-2">
                  {item.description}
                </p>
              </div>

              <div className="w-full flex items-center justify-center pt-2 border-t border-[#F0F3F8] text-[11px] text-[#9AA3B2] font-mono uppercase tracking-wider pointer-events-none">
                <span>Paso {item.step} de 06</span>
              </div>
            </motion.div>
          )
        })}

        {showDots && (
          <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
            {REQUIREMENTS_DATA.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ir a requisito ${index + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors cursor-pointer",
                  index === currentIndex
                    ? "bg-blue-500 dark:bg-primary"
                    : "bg-gray-300 dark:bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
