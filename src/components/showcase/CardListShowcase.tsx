import * as React from 'react';
import { CardDeck, type CardItem } from '@/components/ui/card-deck';
import {
  Sparkles,
  Wallet,
  CreditCard,
  Layers,
  Plus,
  ShieldCheck,
} from 'lucide-react';

/* ==========================================================================
   SAMPLE DATASETS WITH STATIC LOGO IMAGES
   ========================================================================== */
const primaryWalletCards: CardItem[] = [
  {
    id: 'card-1',
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
    id: 'card-2',
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
    id: 'card-3',
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
    id: 'card-4',
    title: 'Travel Rewards',
    amount: '$2,100.00',
    last4: '6500',
    expiry: '04/30',
    vendorLogo: (
      <img
        src="/logos/amex.svg"
        alt="Amex"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-amber-600/40 via-orange-950/20 to-black',
    accentColor: '#f59e0b',
  },
  {
    id: 'card-5',
    title: 'Corporate Metal',
    amount: '$34,500.00',
    last4: '1109',
    expiry: '12/29',
    vendorLogo: (
      <img
        src="/logos/visa.svg"
        alt="Visa"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-rose-600/40 via-zinc-950/20 to-black',
    accentColor: '#f43f5e',
  },
];

const corporateCards: CardItem[] = [
  {
    id: 'corp-1',
    title: 'Marketing Dept',
    amount: '$18,400.00',
    last4: '7721',
    expiry: '08/28',
    vendorLogo: (
      <img
        src="/logos/mastercard.svg"
        alt="Mastercard"
        className="h-5 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-blue-600/40 via-indigo-950/30 to-black',
    accentColor: '#3b82f6',
  },
  {
    id: 'corp-2',
    title: 'Engineering AWS',
    amount: '$6,250.00',
    last4: '4088',
    expiry: '10/27',
    vendorLogo: (
      <img
        src="/logos/visa.svg"
        alt="Visa"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-cyan-600/40 via-teal-950/30 to-black',
    accentColor: '#06b6d4',
  },
];

const cryptoVaultCards: CardItem[] = [
  {
    id: 'crypto-1',
    title: 'Ethereum Vault',
    amount: '$24,150.80',
    last4: '0x8F',
    expiry: '2028',
    vendorLogo: (
      <img
        src="/logos/ethereum.svg"
        alt="Ethereum"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-violet-600/50 via-fuchsia-950/30 to-black',
    accentColor: '#8b5cf6',
  },
  {
    id: 'crypto-2',
    title: 'Bitcoin Hold',
    amount: '$68,400.00',
    last4: '0x3A',
    expiry: '2030',
    vendorLogo: (
      <img
        src="/logos/bitcoin.svg"
        alt="Bitcoin"
        className="h-4 w-auto object-contain"
      />
    ),
    gradientStyle: 'from-orange-600/40 via-amber-950/20 to-black',
    accentColor: '#f97316',
  },
];

export function CardListShowcase() {
  const [selectedMainCard, setSelectedMainCard] = React.useState<CardItem>(
    primaryWalletCards[0],
  );
  const [dynamicDeck, setDynamicDeck] =
    React.useState<CardItem[]>(primaryWalletCards);

  const handleAddDynamicCard = () => {
    const cardTypes = [
      {
        name: 'Emergency Fund',
        style: 'from-emerald-600/40 via-teal-950/20 to-black',
        color: '#10b981',
        logo: (
          <img
            src="/logos/visa.svg"
            alt="Visa"
            className="h-4 w-auto object-contain"
          />
        ),
      },
      {
        name: 'SaaS Subscriptions',
        style: 'from-purple-600/40 via-indigo-950/20 to-black',
        color: '#8b5cf6',
        logo: (
          <img
            src="/logos/mastercard.svg"
            alt="Mastercard"
            className="h-5 w-auto object-contain"
          />
        ),
      },
      {
        name: 'Ad Spend',
        style: 'from-pink-600/40 via-rose-950/20 to-black',
        color: '#ec4899',
        logo: (
          <img
            src="/logos/amex.svg"
            alt="Amex"
            className="h-4 w-auto object-contain"
          />
        ),
      },
    ];
    const randomType = cardTypes[Math.floor(Math.random() * cardTypes.length)];

    const newCard: CardItem = {
      id: `card-${Date.now()}`,
      title: randomType.name,
      amount: `$${(Math.random() * 8000 + 500).toFixed(2)}`,
      last4: `${Math.floor(1000 + Math.random() * 9000)}`,
      expiry: '12/31',
      vendorLogo: randomType.logo,
      gradientStyle: randomType.style,
      accentColor: randomType.color,
    };
    setDynamicDeck((prev) => [...prev, newCard]);
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-16 select-none">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#e6ff4b]">
          <Wallet className="size-4" />
          <span>Interactive Component Showcase</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Card Deck & Wallet Systems
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          High-fidelity credit card stack components featuring clamped offset
          scaling, edge tab identification, and quick-switcher drawer controls.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="size-5 text-cyan-400" />
              Dynamic Stack & Auto-Clamping (5+ Cards)
            </h2>
            <p className="text-xs text-zinc-400">
              Stack automatically compresses horizontal spacing to stay within
              parent container limits as new cards are added.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddDynamicCard}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#e6ff4b] hover:bg-[#d8f533] text-black transition-transform active:scale-95 shadow-md"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Add Card To Stack</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 flex flex-col items-center justify-center min-h-[340px] shadow-inner relative overflow-hidden">
            <CardDeck
              cards={dynamicDeck}
              onAddCard={handleAddDynamicCard}
              onCardSelect={(card) => setSelectedMainCard(card)}
            />
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Selected Card
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <ShieldCheck className="size-3.5" /> Active
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  {selectedMainCard.accentColor && (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: selectedMainCard.accentColor }}
                    />
                  )}
                  <h3 className="text-2xl font-bold text-white">
                    {selectedMainCard.title}
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs mt-1">
                  Configured as primary default payment card.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Available Balance</span>
                  <span className="text-white font-bold">
                    {selectedMainCard.amount}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Card Number</span>
                  <span className="text-zinc-300 font-mono">
                    •••• •••• •••• {selectedMainCard.last4}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Expiration</span>
                  <span className="text-zinc-300 font-mono">
                    {selectedMainCard.expiry}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-2">
              <button
                type="button"
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors"
              >
                View Transaction History
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="size-5 text-[#e6ff4b]" />
            Multi-Category Deck Layouts
          </h2>
          <p className="text-xs text-zinc-400">
            Modular instances embedded inside structured grid layouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Corporate Accounts
                </h3>
                <p className="text-[11px] text-zinc-500">
                  2 active virtual cards
                </p>
              </div>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                Business
              </span>
            </div>

            <div className="flex items-center justify-center py-4">
              <CardDeck cards={corporateCards} />
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Crypto & Multi-Asset Vaults
                </h3>
                <p className="text-[11px] text-zinc-500">
                  2 decentralized cold storage cards
                </p>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Sparkles className="size-3" /> Web3
              </span>
            </div>

            <div className="flex items-center justify-center py-4">
              <CardDeck cards={cryptoVaultCards} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
