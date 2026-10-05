import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import type { SankeyExtraProperties, SankeyLink, SankeyNode } from 'd3-sankey'
import { effectiveDate, computeBalances } from '../../domain/balances'
import { formatCents } from '../../domain/money'
import type { Bucket, BucketGroup } from '../../domain/models'
import type { LedgerEvent } from '../../domain/types'
import { GraphHoverTooltip, Select } from '../../components'

interface FlowNode extends SankeyExtraProperties { id: string; label: string; color: string; sortOrder: number }
interface FlowLink extends SankeyExtraProperties { source: string; target: string; value: number }
type LayoutNode = SankeyNode<FlowNode, FlowLink>
type LayoutLink = SankeyLink<FlowNode, FlowLink>
type HoverTarget = { kind: 'node'; nodeId: string } | { kind: 'link'; index: number }

const PALETTE = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)', 'var(--color-chart-7)',
]

export default function SankeyChart({ events, buckets, groups, startDate, endDate }: {
  events: LedgerEvent[]
  buckets: Bucket[]
  groups: BucketGroup[]
  startDate: string
  endDate: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorFrame = useRef<number | null>(null)
  const pendingCursor = useRef<{ x: number; y: number } | null>(null)
  const [hovered, setHovered] = useState<{ label: string; value: number; color: string } | null>(null)
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState('all')
  const [showMerchants, setShowMerchants] = useState(false)
  const [highlightPaths, setHighlightPaths] = useState(true)
  useEffect(() => () => {
    if (cursorFrame.current !== null) window.cancelAnimationFrame(cursorFrame.current)
  }, [])

  function updateCursor(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    pendingCursor.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    if (cursorFrame.current !== null) return
    cursorFrame.current = window.requestAnimationFrame(() => {
      cursorFrame.current = null
      if (pendingCursor.current) setCursorPos(pendingCursor.current)
    })
  }

  function clearCursor() {
    if (cursorFrame.current !== null) window.cancelAnimationFrame(cursorFrame.current)
    cursorFrame.current = null
    pendingCursor.current = null
    setHovered(null)
    setHoverTarget(null)
    setCursorPos(null)
  }
  const groupOptions = [
    { value: 'all', label: 'All groups · overview' },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
    ...(buckets.some((bucket) => !bucket.groupId) ? [{ value: 'ungrouped', label: 'Ungrouped buckets' }] : []),
  ]
  const activeGroupId = groupOptions.some((option) => option.value === selectedGroupId) ? selectedGroupId : 'all'
  const overspentTotal = useMemo(() => {
    const balances = computeBalances(events, endDate).buckets
    const visibleBuckets = activeGroupId === 'all'
      ? buckets
      : buckets.filter((bucket) => activeGroupId === 'ungrouped' ? !bucket.groupId : bucket.groupId === activeGroupId)
    return visibleBuckets.reduce((total, bucket) => total + Math.max(0, -(balances[bucket.id] ?? 0)), 0)
  }, [events, buckets, endDate, activeGroupId])
  const graph = useMemo(() => {
    const periodEvents = events.filter((event) => {
      const date = effectiveDate(event)
      return date >= startDate && date <= endDate
    })
    const beforeEvents = events.filter((event) => effectiveDate(event) < startDate)
    const endBalances = computeBalances(events, endDate)
    const opening = computeBalances(beforeEvents)
    const groupById = new Map(groups.map((group) => [group.id, group]))
    const orderedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    const groupOrder = new Map(orderedGroups.map((group, index) => [group.id, index]))
    const orderedBuckets = [...buckets].sort((a, b) => {
      const aGroup = a.groupId ? groupOrder.get(a.groupId) ?? orderedGroups.length : orderedGroups.length
      const bGroup = b.groupId ? groupOrder.get(b.groupId) ?? orderedGroups.length : orderedGroups.length
      return aGroup - bGroup || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    })
    const bucketOrder = new Map(orderedBuckets.map((bucket, index) => [bucket.id, index]))
    const nodes = new Map<string, FlowNode>()
    const links: FlowLink[] = []
    const ensure = (id: string, label: string, color: string, sortOrder = nodes.size) => {
      if (!nodes.has(id)) nodes.set(id, { id, label, color, sortOrder })
      return id
    }
    const addLink = (source: string, target: string, value: number) => {
      if (value > 0) links.push({ source, target, value })
    }
    const available = ensure('available', 'Available money', PALETTE[0])

    if (activeGroupId !== 'all') {
      const selectedGroup = activeGroupId === 'ungrouped' ? null : groupById.get(activeGroupId)
      const groupLabel = selectedGroup?.name ?? 'Ungrouped buckets'
      const groupColor = selectedGroup?.color ?? PALETTE[2]
      const focusedBuckets = orderedBuckets.filter((bucket) => activeGroupId === 'ungrouped'
        ? !bucket.groupId
        : bucket.groupId === activeGroupId)
      const focusedEvents = periodEvents.filter((event) => event.type === 'expense' && focusedBuckets.some((bucket) => bucket.id === event.bucketId))
      const payeeTotals = new Map<string, number>()
      for (const event of focusedEvents) {
        const name = event.payee?.trim() || event.description.trim() || 'Other spending'
        payeeTotals.set(name, (payeeTotals.get(name) ?? 0) + event.amountCents)
      }
      const topPayeeNames = [...payeeTotals.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([name]) => name)
      const topPayees = new Set(topPayeeNames)
      const merchantColors = new Map(topPayeeNames.map((name, index) => [name, PALETTE[index % PALETTE.length]]))
      const groupActivity = ensure('group-activity', `${groupLabel} activity`, groupColor, 0)
      if (showMerchants) {
        topPayeeNames.forEach((name, index) => ensure(`payee:${name}`, name, merchantColors.get(name)!, index))
        ensure('other-payees', 'Other payees', '#64748b', topPayeeNames.length)
      }

      focusedBuckets.forEach((bucket, bucketIndex) => {
        const bucketEvents = focusedEvents.filter((event) => event.bucketId === bucket.id)
        const spent = bucketEvents.reduce((total, event) => total + event.amountCents, 0)
        const closingBalance = endBalances.buckets[bucket.id] ?? 0
        const unspent = Math.max(0, closingBalance)
        const resource = spent + unspent
        if (resource <= 0) return

        const bucketNode = ensure(`bucket:${bucket.id}`, bucket.name, bucket.color ?? PALETTE[3], bucketIndex)
        addLink(groupActivity, bucketNode, resource)

        if (!showMerchants) {
          return
        }

        const bucketPayees = new Map<string, number>()
        for (const event of bucketEvents) {
          const name = event.payee?.trim() || event.description.trim() || 'Other spending'
          bucketPayees.set(name, (bucketPayees.get(name) ?? 0) + event.amountCents)
        }
        for (const [name, amount] of bucketPayees) {
          if (topPayees.has(name)) {
            addLink(bucketNode, ensure(`payee:${name}`, name, merchantColors.get(name)!), amount)
          } else {
            addLink(bucketNode, ensure('other-payees', 'Other payees', '#64748b'), amount)
          }
        }
      })

      const valid = [...links.reduce((set, link) => set.add(link.source).add(link.target), new Set<string>())]
      const graphNodes = [...nodes.values()].filter((node) => valid.includes(node.id))
      if (!graphNodes.length || !links.length) return null
      const layoutHeight = Math.max(320, graphNodes.length * 30)
      const layout = sankey<FlowNode, FlowLink>()
        .nodeId((node) => node.id)
        .nodeSort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .nodeWidth(14)
        .nodePadding(18)
        .iterations(32)
        .extent([[12, 14], [928, layoutHeight]])({ nodes: graphNodes, links })
      return { layout, layoutHeight }
    }

    const incomes = new Map<string, number>()
    for (const event of periodEvents) {
      if (event.type !== 'income') continue
      const source = event.payee?.trim() || event.description.trim() || 'Income'
      incomes.set(source, (incomes.get(source) ?? 0) + event.amountCents)
    }
    let colorIndex = 1
    for (const [source, amount] of incomes) {
      const id = ensure(`income:${source}`, source, PALETTE[colorIndex++ % PALETTE.length])
      addLink(id, available, amount)
    }
    const adjustmentIn = periodEvents
      .filter((event) => event.type === 'adjustment' && event.direction === 'in')
      .reduce((total, event) => total + event.amountCents, 0)
    if (adjustmentIn > 0) addLink(ensure('adjustments-in', 'Account adjustments', '#64748b'), available, adjustmentIn)
    addLink(ensure('opening-rain', 'Starting available', '#64748b'), available, Math.max(0, opening.unallocated))

    const allocatedByBucket = new Map<string, number>()
    for (const event of periodEvents) {
      if (event.type !== 'allocation' || !event.bucketId) continue
      allocatedByBucket.set(event.bucketId, (allocatedByBucket.get(event.bucketId) ?? 0) + (event.direction === 'out' ? -event.amountCents : event.amountCents))
    }
    const bucketFlows = new Map<string, number>()
    const groupFlows = new Map<string, number>()
    let startingBucketBalances = 0
    let unfundedBucketActivity = 0

    for (const bucket of orderedBuckets) {
      const allocated = Math.max(0, allocatedByBucket.get(bucket.id) ?? 0)
      const openingBalance = Math.max(0, opening.buckets[bucket.id] ?? 0)
      const knownFunding = allocated + openingBalance
      const expenses = periodEvents
        .filter((event) => event.type === 'expense' && event.bucketId === bucket.id)
        .reduce((total, event) => total + event.amountCents, 0)
      const closingBalance = endBalances.buckets[bucket.id] ?? 0
      const observedActivity = expenses + Math.max(0, closingBalance)
      const flow = Math.max(knownFunding, observedActivity)
      if (flow <= 0) continue

      const groupId = bucket.groupId ?? 'ungrouped'
      bucketFlows.set(bucket.id, flow)
      groupFlows.set(groupId, (groupFlows.get(groupId) ?? 0) + flow)
      startingBucketBalances += openingBalance
      unfundedBucketActivity += Math.max(0, flow - knownFunding)
    }

    if (startingBucketBalances > 0) {
      addLink(ensure('starting-buckets', 'Starting bucket balances', '#64748b'), available, startingBucketBalances)
    }
    if (unfundedBucketActivity > 0) {
      addLink(ensure('reconcile-in-bucket', 'Other bucket activity', '#f43f5e'), available, unfundedBucketActivity)
    }

    for (const [groupId, amount] of groupFlows) {
      const label = groupId === 'ungrouped' ? 'Ungrouped buckets' : groupById.get(groupId)?.name ?? 'Other group'
      const groupNode = ensure(`group:${groupId}`, label, PALETTE[2], groupOrder.get(groupId) ?? orderedGroups.length)
      addLink(available, groupNode, amount)
    }

    for (const bucket of orderedBuckets) {
      const amount = bucketFlows.get(bucket.id) ?? 0
      if (amount <= 0) continue
      const groupId = bucket.groupId ?? 'ungrouped'
      const label = groupId === 'ungrouped' ? 'Ungrouped buckets' : groupById.get(groupId)?.name ?? 'Other group'
      const groupNode = ensure(`group:${groupId}`, label, PALETTE[2], groupOrder.get(groupId) ?? orderedGroups.length)
      const bucketNode = ensure(`bucket:${bucket.id}`, bucket.name, bucket.color ?? PALETTE[3], bucketOrder.get(bucket.id) ?? orderedBuckets.length)
      addLink(groupNode, bucketNode, amount)
    }

    const closingAvailableBalance = endBalances.unallocated
    if (closingAvailableBalance > 0) {
      addLink(available, ensure('available-balance', 'Available balance', PALETTE[1]), closingAvailableBalance)
    }

    const availableInflow = links
      .filter((link) => link.target === available)
      .reduce((total, link) => total + link.value, 0)
    const availableOutflow = links
      .filter((link) => link.source === available)
      .reduce((total, link) => total + link.value, 0)
    const availableDeficit = Math.max(0, -closingAvailableBalance, availableOutflow - availableInflow)
    if (availableDeficit > 0) {
      addLink(ensure('available-deficit', 'Deficit', '#f43f5e'), available, availableDeficit)
    }

    const valid = [...links.reduce((set, link) => set.add(link.source).add(link.target), new Set<string>())]
    const graphNodes = [...nodes.values()].filter((node) => valid.includes(node.id))
    if (!graphNodes.length || !links.length) return null

    const layoutHeight = Math.max(320, graphNodes.length * 28)
    const layout = sankey<FlowNode, FlowLink>()
      .nodeId((node) => node.id)
      .nodeSort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .nodeWidth(14)
      .nodePadding(18)
      .iterations(32)
      .extent([[12, 14], [928, layoutHeight]])({ nodes: graphNodes, links })
    return { layout, layoutHeight }
  }, [events, buckets, groups, startDate, endDate, activeGroupId, showMerchants])

  const layout = graph?.layout ?? null
  const layoutHeight = graph?.layoutHeight ?? 320
  const highlighted = useMemo(() => {
    if (!layout || !hoverTarget || !highlightPaths) return null

    const incomingLinks = new Map<string, number[]>()
    const outgoingLinks = new Map<string, number[]>()
    const indexLink = (map: Map<string, number[]>, nodeId: string, index: number) => {
      const indexes = map.get(nodeId)
      if (indexes) indexes.push(index)
      else map.set(nodeId, [index])
    }
    layout.links.forEach((link, index) => {
      const typed = link as LayoutLink
      const source = typed.source as LayoutNode
      const target = typed.target as LayoutNode
      indexLink(incomingLinks, target.id, index)
      indexLink(outgoingLinks, source.id, index)
    })

    const linkIndexes = new Set<number>()
    const nodeIds = new Set<string>()
    const trace = (startId: string, adjacent: Map<string, number[]>, nextNodeId: (link: LayoutLink) => string) => {
      const visited = new Set([startId])
      const pending = [startId]
      nodeIds.add(startId)
      while (pending.length) {
        const currentId = pending.pop()!
        for (const index of adjacent.get(currentId) ?? []) {
          const link = layout.links[index] as LayoutLink
          linkIndexes.add(index)
          const nextId = nextNodeId(link)
          nodeIds.add(nextId)
          if (!visited.has(nextId)) {
            visited.add(nextId)
            pending.push(nextId)
          }
        }
      }
    }
    const sourceId = (link: LayoutLink) => (link.source as LayoutNode).id
    const targetId = (link: LayoutLink) => (link.target as LayoutNode).id

    if (hoverTarget.kind === 'node') {
      trace(hoverTarget.nodeId, incomingLinks, sourceId)
      trace(hoverTarget.nodeId, outgoingLinks, targetId)
    } else {
      const selectedLink = layout.links[hoverTarget.index] as LayoutLink | undefined
      if (!selectedLink) return null
      const source = sourceId(selectedLink)
      const target = targetId(selectedLink)
      linkIndexes.add(hoverTarget.index)
      nodeIds.add(source)
      nodeIds.add(target)
      trace(source, incomingLinks, sourceId)
      trace(target, outgoingLinks, targetId)
    }

    return { linkIndexes, nodeIds }
  }, [layout, hoverTarget, highlightPaths])
  const linkEntries = layout?.links.map((link, index) => {
    const typed = link as LayoutLink
    return { typed, index, source: typed.source as LayoutNode, target: typed.target as LayoutNode }
  }).sort((a, b) => Number(highlighted?.linkIndexes.has(a.index) ?? false) - Number(highlighted?.linkIndexes.has(b.index) ?? false)) ?? []

  if (!graph || !layout) return <div className="grid h-52 place-items-center text-sm text-muted">No money flows to show for this period.</div>
  const path = sankeyLinkHorizontal<FlowNode, FlowLink>()

  return (
    <div ref={containerRef} className="relative">
      {hovered && cursorPos && <GraphHoverTooltip
        left={cursorPos.x}
        top={cursorPos.y}
        label={hovered.label}
        value={formatCents(hovered.value)}
        color={hovered.color}
      />}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <label className="grid w-full max-w-xs gap-1 text-xs font-medium text-muted-foreground">
          Group detail
          <Select
            aria-label="Sankey group detail"
            value={activeGroupId}
            onChange={(event) => { setSelectedGroupId(event.target.value); setShowMerchants(false) }}
            options={groupOptions}
            className="h-9"
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={highlightPaths}
            onChange={(event) => {
              setHighlightPaths(event.target.checked)
              if (!event.target.checked) setHoverTarget(null)
            }}
          />
          Highlight related paths
        </label>
        {activeGroupId !== 'all' && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="accent-primary"
              checked={showMerchants}
              onChange={(event) => setShowMerchants(event.target.checked)}
            />
            Show top 5 payees
          </label>
        )}
      </div>
      <div
        className="overflow-x-auto"
        onMouseMove={updateCursor}
        onMouseLeave={clearCursor}
      >
        <svg viewBox={`0 0 960 ${layoutHeight + 42}`} role="img" aria-label="Sankey diagram of income and starting balances flowing through available money and groups into buckets" className="h-auto min-w-[760px] w-full">
          <g fill="none">
            {linkEntries.map(({ typed, index, source, target }) => {
              const isHighlighted = highlighted?.linkIndexes.has(index) ?? false
              return <path key={`${source.id}-${target.id}-${index}`} d={path(typed) ?? ''} stroke={source.color} strokeOpacity={highlighted ? isHighlighted ? 0.9 : 0.035 : 0.3} strokeWidth={Math.max(1, typed.width ?? 1) + (highlighted && isHighlighted ? 1.5 : 0)} className="cursor-pointer transition-[stroke-opacity,stroke-width] duration-150" onMouseEnter={() => {
                setHoverTarget({ kind: 'link', index })
                setHovered({ label: `${source.label} → ${target.label}`, value: typed.value, color: source.color })
              }}>
                <title>{`${source.label} → ${target.label}: ${formatCents(typed.value)}`}</title>
              </path>
            })}
          </g>
          <g>
            {layout.nodes.map((node) => {
              const typed = node as LayoutNode
              const x = typed.x0 ?? 0
              const y = typed.y0 ?? 0
              const rightSide = x > 700
              const isHighlighted = highlighted?.nodeIds.has(typed.id) ?? false
              const isHoveredNode = hoverTarget?.kind === 'node' && hoverTarget.nodeId === typed.id
              return (
                <g key={typed.id} className="cursor-pointer" opacity={highlighted && !isHighlighted ? 0.28 : 1} onMouseEnter={() => {
                  setHoverTarget({ kind: 'node', nodeId: typed.id })
                  setHovered({ label: typed.label, value: typed.value ?? 0, color: typed.color })
                }}>
                  <rect x={x} y={y} width={(typed.x1 ?? x + 14) - x} height={Math.max(1, (typed.y1 ?? y + 1) - y)} fill={typed.color} rx="3" stroke={isHoveredNode ? 'var(--color-ink)' : 'none'} strokeWidth={isHoveredNode ? 2 : 0} />
                  <text x={rightSide ? x - 7 : (typed.x1 ?? x + 14) + 7} y={(typed.y0 ?? 0) + ((typed.y1 ?? 0) - (typed.y0 ?? 0)) / 2} textAnchor={rightSide ? 'end' : 'start'} dominantBaseline="middle" fill="currentColor" fontSize="11" fontWeight={isHoveredNode ? 700 : 400}>
                    {typed.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2">
          <p className="max-w-3xl text-xs leading-5 text-muted">
            {activeGroupId === 'all'
              ? 'Income and starting balances pool in Available money, then flow through groups into buckets. Any remaining balance or deficit is shown at the pool.'
              : showMerchants
                ? 'Group detail traces each bucket’s spending to its five largest payees; remaining payees are combined.'
                : 'Group detail shows how much money reaches each bucket in the selected group.'}
          </p>
          {overspentTotal > 0 && (
            <p className="rounded-full bg-bad-soft px-2.5 py-1 text-xs font-medium text-bad" role="status">
              Overdrawn buckets <span className="ml-1 tabular-nums">{formatCents(-overspentTotal)}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
