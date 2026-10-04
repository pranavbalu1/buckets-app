import * as React from 'react';
import { Plus, ChevronLeft, ChevronRight, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ==========================================================================
   TYPES & DEFAULT DATA
   ========================================================================== */

export interface CardItem {
  id: string;
  title: string;
  amount: string;
  last4: string;
  expiry: string;
  vendorLogo?: React.ReactNode; // Custom image element
  gradientStyle?: string;
  accentColor?: string;
}

export interface CardDeckProps extends React.HTMLAttributes<HTMLDivElement> {
  cards?: CardItem[];
  onAddCard?: () => void;
  onCardSelect?: (card: CardItem) => void;
  showControls?: boolean;
}

const defaultCards: CardItem[] = [
  {
    id: '1',
    title: 'Credit',
    amount: '$4,568.00',
    last4: '8967',
    expiry: '05/27',
    vendorLogo: (
      <img
        src="/logos/visa.svg"
        alt="Visa"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-teal-600/40 via-cyan-900/20 to-black',
    accentColor: '#00bdf9',
  },
  {
    id: '2',
    title: 'Universal',
    amount: '$567.90',
    last4: '3021',
    expiry: '11/28',
    vendorLogo: (
      <img
        src="/logos/mastercard.svg"
        alt="Mastercard"
        className="h-5 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-indigo-600/40 via-purple-900/20 to-black',
    accentColor: '#a855f7',
  },
  {
    id: '3',
    title: 'Savings',
    amount: '$12,890.50',
    last4: '4412',
    expiry: '09/29',
    vendorLogo: (
      <img
        src="/logos/visa.svg"
        alt="Visa"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-emerald-600/40 via-zinc-900/20 to-black',
    accentColor: '#03d791',
  },
  {
    id: '4',
    title: 'Business',
    amount: '$8,320.10',
    last4: '9041',
    expiry: '01/30',
    vendorLogo: (
      <img
        src="/logos/amex.svg"
        alt="Amex"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-rose-600/40 via-pink-950/20 to-black',
    accentColor: '#f43f5e',
  },
];

/* ==========================================================================
   MAIN CARD DECK COMPONENT
   ========================================================================== */

export function CardDeck({
  className,
  cards = defaultCards,
  onAddCard,
  onCardSelect,
  showControls = true,
  ...props
}: CardDeckProps) {
  const [activeIndex, setActiveIndex] = React.useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [isListOpen, setIsListOpen] = React.useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNext = () => {
    if (cards.length === 0) return;
    const nextIdx = (activeIndex + 1) % cards.length;
    setActiveIndex(nextIdx);
    onCardSelect?.(cards[nextIdx]);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    const prevIdx = (activeIndex - 1 + cards.length) % cards.length;
    setActiveIndex(prevIdx);
    onCardSelect?.(cards[prevIdx]);
  };

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
    onCardSelect?.(cards[index]);
    setIsListOpen(false);
  };

  const totalCards = cards.length;
  const stepOffset = Math.min(26, Math.max(12, 100 / Math.max(totalCards, 1)));

  return (
    <div
      className={cn(
        'relative w-full max-w-xl flex flex-col items-center justify-center p-4 select-none gap-6 overflow-hidden',
        className,
      )}
      {...props}
    >
      <div className="relative w-[340px] h-[210px] flex items-center justify-center">
        {cards.map((card, index) => {
          const positionOffset = index - activeIndex;
          const isTopCard = index === activeIndex;
          const isHovered = hoveredIndex === index;

          const xOffset = positionOffset * stepOffset;
          const scale = isTopCard
            ? 1
            : isHovered
              ? 0.98
              : 1 - Math.abs(positionOffset) * 0.04;
          const yLift = isHovered && !isTopCard ? -8 : 0;
          const zIndex = isTopCard
            ? 40
            : isHovered
              ? 35
              : 30 - Math.abs(positionOffset);
          const opacity = Math.max(0.5, 1 - Math.abs(positionOffset) * 0.15);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                transform: `translateX(${xOffset}px) translateY(${yLift}px) scale(${scale})`,
                zIndex,
                opacity,
              }}
              className={cn(
                'absolute inset-0 rounded-[28px] border border-white/10 p-6 shadow-2xl transition-all duration-300 ease-out cursor-pointer group bg-zinc-950/90 backdrop-blur-xl flex flex-col justify-between overflow-hidden',
                !isTopCard && 'hover:border-white/30',
              )}
            >
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-tr pointer-events-none opacity-80 transition-opacity duration-300',
                  card.gradientStyle || 'from-teal-600/40 via-black to-black',
                )}
              />

              <div className="relative z-10 flex items-center justify-between">
                {isTopCard && (
                  <span className="text-zinc-300 font-medium text-base tracking-wide flex items-center gap-2">
                    {card.accentColor && (
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: card.accentColor }}
                      />
                    )}
                    {card.title}
                  </span>
                )}

                {isTopCard && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCard?.();
                    }}
                    className="size-10 rounded-full bg-[#e6ff4b] hover:bg-[#d8f533] text-black flex items-center justify-center transition-transform active:scale-95 shadow-lg ml-auto"
                  >
                    <Plus className="size-5 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {isTopCard && (
                <div className="relative z-10 my-auto">
                  <div className="flex items-baseline text-white">
                    <span className="text-4xl font-semibold tracking-tight">
                      {card.amount.split('.')[0]}
                    </span>
                    {card.amount.includes('.') && (
                      <span className="text-2xl font-light text-zinc-400">
                        .{card.amount.split('.')[1]}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!isTopCard && card.accentColor && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span
                    className="block w-1.5 h-12 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: card.accentColor }}
                  />
                </div>
              )}

              {isTopCard && (
                <div className="relative z-10 flex items-end justify-between text-zinc-300 font-mono text-xs tracking-wider">
                  <div className="flex items-center gap-4">
                    <span>*{card.last4}</span>
                    <span>{card.expiry}</span>
                  </div>

                  <div className="shrink-0">
                    {card.vendorLogo ? (
                      card.vendorLogo
                    ) : (
                      <img
                        src="/logos/visa.svg"
                        alt="Visa"
                        className="h-4 w-auto object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showControls && cards.length > 1 && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrev}
            className="size-9 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition-transform active:scale-90"
            aria-label="Previous Card"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsListOpen(!isListOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors"
            >
              <Layers className="size-3.5 text-[#e6ff4b]" />
              <span>
                {activeIndex + 1} / {cards.length}
              </span>
            </button>

            {isListOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-12 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80 mb-1">
                  Select Card
                </div>
                {cards.map((c, i) => {
                  const isSelected = i === activeIndex;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCardClick(i)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors',
                        isSelected
                          ? 'bg-zinc-800 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {c.accentColor && (
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: c.accentColor }}
                          />
                        )}
                        <span>{c.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-zinc-500">
                          *{c.last4}
                        </span>
                        {isSelected && (
                          <Check className="size-3.5 text-[#e6ff4b]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="size-9 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition-transform active:scale-90"
            aria-label="Next Card"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
