import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'

interface TileOrderContextValue {
  userId: string
  moveMode: boolean
  orders: Record<string, string[]>
  saveOrder: (page: string, order: string[]) => void
}

interface TileProps {
  id: string
  label: string
  className?: string
  children: ReactNode
}

const TileOrderContext = createContext<TileOrderContextValue | null>(null)
const storagePrefix = 'buckets:tile-layout:v1:'
let activeTileDrag: { userId: string; page: string; tileId: string } | null = null

function readOrders(userId: string): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(storagePrefix + userId) ?? '{}')
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).flatMap(([page, order]) => {
      if (!Array.isArray(order) || !order.every((id) => typeof id === 'string')) return []
      return [[page, [...new Set(order)]]]
    }))
  } catch {
    return {}
  }
}

export function TileLayoutProvider({ userId, moveMode, children }: {
  userId: string
  moveMode: boolean
  children: ReactNode
}) {
  const [orders, setOrders] = useState(() => readOrders(userId))

  useEffect(() => {
    try {
      window.localStorage.setItem(storagePrefix + userId, JSON.stringify(orders))
    } catch {
      // Layout preferences are optional when browser storage is unavailable.
    }
  }, [orders, userId])

  const saveOrder = useCallback((page: string, order: string[]) => {
    setOrders((current) => ({
      ...current,
      [page]: [...order, ...(current[page] ?? []).filter((id) => !order.includes(id))],
    }))
  }, [])

  const value = useMemo(() => ({ userId, moveMode, orders, saveOrder }), [userId, moveMode, orders, saveOrder])
  return <TileOrderContext.Provider value={value}>{children}</TileOrderContext.Provider>
}

/** Marker component. TileBoard reads its props and renders each tile in saved order. */
export function Tile({ children }: TileProps) {
  return <>{children}</>
}

export function TileBoard({ page, className, children }: {
  page: string
  className: string
  children: ReactNode
}) {
  const context = useContext(TileOrderContext)
  if (!context) throw new Error('TileBoard must be rendered inside TileLayoutProvider')
  const tileContext = context
  const tiles = Children.toArray(children).flatMap((child) =>
    isValidElement<TileProps>(child) && child.type === Tile ? [child.props] : [],
  )
  const byId = new Map(tiles.map((tile) => [tile.id, tile]))
  const savedOrder = tileContext.orders[page] ?? []
  const orderedIds = [
    ...savedOrder.filter((id) => byId.has(id)),
    ...tiles.map((tile) => tile.id).filter((id) => !savedOrder.includes(id)),
  ]
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const next = [...orderedIds]
    const from = next.indexOf(fromId)
    const to = next.indexOf(toId)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, fromId)
    tileContext.saveOrder(page, next)
  }

  return (
    <div className={className}>
      {orderedIds.map((id, index) => {
        const tile = byId.get(id)
        if (!tile) return null
        return (
          <div
            key={id}
            className={`min-w-0 ${tile.className ?? ''} ${tileContext.moveMode ? `rounded-xl border border-dashed p-1 transition-colors ${dropTargetId === id ? 'border-accent bg-accent/10' : 'border-accent/45 bg-accent/5'}` : ''}`}
            onDragOver={(event) => {
              if (tileContext.moveMode && activeTileDrag?.userId === tileContext.userId && activeTileDrag.page === page) {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }
            }}
            onDragEnter={() => {
              if (tileContext.moveMode && activeTileDrag?.userId === tileContext.userId && activeTileDrag.page === page) setDropTargetId(id)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTargetId(null)
            }}
            onDrop={(event) => {
              if (!tileContext.moveMode || activeTileDrag?.userId !== tileContext.userId || activeTileDrag.page !== page) return
              event.preventDefault()
              reorder(activeTileDrag.tileId, id)
              activeTileDrag = null
              setDraggedId(null)
              setDropTargetId(null)
            }}
          >
            {tileContext.moveMode && (
              <div className="mb-1 flex min-h-8 items-center justify-between gap-2 rounded-lg bg-accent/10 px-1.5 py-0.5 text-accent">
                <button
                  type="button"
                  draggable
                  aria-label={`Drag ${tile.label} to move it`}
                  title={`Drag to move ${tile.label}`}
                  className={`flex min-w-0 cursor-grab items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium active:cursor-grabbing ${draggedId === id ? 'opacity-50' : ''}`}
                  onDragStart={(event) => {
                    activeTileDrag = { userId: tileContext.userId, page, tileId: id }
                    setDraggedId(id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', `${page}:${id}`)
                  }}
                  onDragEnd={() => {
                    activeTileDrag = null
                    setDraggedId(null)
                    setDropTargetId(null)
                  }}
                >
                  <GripVertical className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{tile.label}</span>
                </button>
                <span className="flex shrink-0 items-center gap-1">
                  <button type="button" className="grid size-7 place-items-center rounded-md hover:bg-accent/15 disabled:opacity-35" aria-label={`Move ${tile.label} up`} disabled={index === 0} onClick={() => reorder(id, orderedIds[index - 1])}>
                    <ArrowUp className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" className="grid size-7 place-items-center rounded-md hover:bg-accent/15 disabled:opacity-35" aria-label={`Move ${tile.label} down`} disabled={index === orderedIds.length - 1} onClick={() => reorder(id, orderedIds[index + 1])}>
                    <ArrowDown className="size-3.5" aria-hidden />
                  </button>
                </span>
              </div>
            )}
            <div className="min-w-0">{tile.children}</div>
          </div>
        )
      })}
    </div>
  )
}
