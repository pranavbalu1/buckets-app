import { useMemo, useState } from 'react'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import type { SankeyExtraProperties, SankeyLink, SankeyNode } from 'd3-sankey'
import { effectiveDate, computeBalances } from '../../domain/balances'
import { formatCents } from '../../domain/money'
import type { Bucket, BucketGroup } from '../../domain/models'
import type { LedgerEvent } from '../../domain/types'
import { Select } from './select'
import { GraphHoverTooltip } from './charts'

interface FlowNode extends SankeyExtraProperties { id: string; label: string; color: string }
interface FlowLink extends SankeyExtraProperties { source: string; target: string; value: number }
type LayoutNode = SankeyNode<FlowNode, FlowLink>
type LayoutLink = SankeyLink<FlowNode, FlowLink>

const PALETTE = ['#e6ff4b', '#00bdf9', '#03d791', '#f59e0b', '#a855f7', '#f43f5e', '#14b8a6']

export default function SankeyChart({ events, buckets, groups, startDate, endDate }: {
  events: LedgerEvent[]
  buckets: Bucket[]
  groups: BucketGroup[]
  startDate: string
  endDate: string
}) {
  const [hovered, setHovered] = useState<{ label: string; value: number; color: string } | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState('all')
  const [showMerchants, setShowMerchants] = useState(false)
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
    const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]))
    const groupById = new Map(groups.map((group) => [group.id, group]))
    const nodes = new Map<string, FlowNode>()
    const links: FlowLink[] = []
    const ensure = (id: string, label: string, color: string) => {
      if (!nodes.has(id)) nodes.set(id, { id, label, color })
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
      const focusedBuckets = buckets.filter((bucket) => activeGroupId === 'ungrouped'
        ? !bucket.groupId
        : bucket.groupId === activeGroupId)
      const focusedEvents = periodEvents.filter((event) => event.type === 'expense' && focusedBuckets.some((bucket) => bucket.id === event.bucketId))
      const payeeTotals = new Map<string, number>()
      for (const event of focusedEvents) {
        const name = event.payee?.trim() || event.description.trim() || 'Other spending'
        payeeTotals.set(name, (payeeTotals.get(name) ?? 0) + event.amountCents)
      }
      const topPayees = new Set([...payeeTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name))
      const merchantTotals = new Map<string, number>()
      let otherMerchantTotal = 0
      const groupActivity = ensure('group-activity', `${groupLabel} activity`, groupColor)
      const spentNode = ensure('period-spending', 'Spending', '#f59e0b')
      const unspentNode = ensure('unspent', 'Unspent balance', '#03d791')

      for (const bucket of focusedBuckets) {
        const bucketEvents = focusedEvents.filter((event) => event.bucketId === bucket.id)
        const spent = bucketEvents.reduce((total, event) => total + event.amountCents, 0)
        const closingBalance = endBalances.buckets[bucket.id] ?? 0
        const unspent = Math.max(0, closingBalance)
        const resource = spent + unspent
        if (resource <= 0) continue

        const bucketNode = ensure(`bucket:${bucket.id}`, bucket.name, bucket.color ?? PALETTE[3])
        addLink(groupActivity, bucketNode, resource)
        addLink(bucketNode, unspentNode, unspent)

        if (!showMerchants) {
          addLink(bucketNode, spentNode, spent)
          continue
        }

        const bucketPayees = new Map<string, number>()
        for (const event of bucketEvents) {
          const name = event.payee?.trim() || event.description.trim() || 'Other spending'
          bucketPayees.set(name, (bucketPayees.get(name) ?? 0) + event.amountCents)
        }
        for (const [name, amount] of bucketPayees) {
          if (topPayees.has(name)) {
            addLink(bucketNode, ensure(`payee:${name}`, name, PALETTE[merchantTotals.size % PALETTE.length]), amount)
            merchantTotals.set(name, (merchantTotals.get(name) ?? 0) + amount)
          } else {
            addLink(bucketNode, ensure('other-payees', 'Other payees', '#64748b'), amount)
            otherMerchantTotal += amount
          }
        }
      }

      for (const [name, amount] of merchantTotals) addLink(ensure(`payee:${name}`, name, PALETTE[0]), spentNode, amount)
      if (otherMerchantTotal > 0) addLink(ensure('other-payees', 'Other payees', '#64748b'), spentNode, otherMerchantTotal)

      const valid = [...links.reduce((set, link) => set.add(link.source).add(link.target), new Set<string>())]
      const graphNodes = [...nodes.values()].filter((node) => valid.includes(node.id))
      if (!graphNodes.length || !links.length) return null
      const layoutHeight = Math.max(320, graphNodes.length * 30)
      const layout = sankey<FlowNode, FlowLink>()
        .nodeId((node) => node.id)
        .nodeWidth(14)
        .nodePadding(18)
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
    const adjustmentOut = periodEvents
      .filter((event) => event.type === 'adjustment' && event.direction === 'out')
      .reduce((total, event) => total + event.amountCents, 0)
    if (adjustmentIn > 0) addLink(ensure('adjustments-in', 'Account adjustments', '#64748b'), available, adjustmentIn)
    if (adjustmentOut > 0) addLink(available, ensure('adjustments-out', 'Account adjustments', '#64748b'), adjustmentOut)
    addLink(ensure('opening-rain', 'Starting available', '#64748b'), available, Math.max(0, opening.unallocated))

    const allocatedByBucket = new Map<string, number>()
    for (const event of periodEvents) {
      if (event.type !== 'allocation' || !event.bucketId) continue
      allocatedByBucket.set(event.bucketId, (allocatedByBucket.get(event.bucketId) ?? 0) + (event.direction === 'out' ? -event.amountCents : event.amountCents))
    }
    const allocatedByGroup = new Map<string, number>()
    for (const [bucketId, amount] of allocatedByBucket) {
      if (amount <= 0) continue
      const bucket = bucketById.get(bucketId)
      const groupId = bucket?.groupId ?? 'ungrouped'
      allocatedByGroup.set(groupId, (allocatedByGroup.get(groupId) ?? 0) + amount)
    }
    for (const [groupId, amount] of allocatedByGroup) {
      const label = groupId === 'ungrouped' ? 'Ungrouped buckets' : groupById.get(groupId)?.name ?? 'Other group'
      const groupNode = ensure(`group:${groupId}`, label, PALETTE[2])
      addLink(available, groupNode, amount)
    }

    for (const bucket of buckets) {
      const netAllocated = Math.max(0, allocatedByBucket.get(bucket.id) ?? 0)
      const openingAmount = Math.max(0, opening.buckets[bucket.id] ?? 0)
      const amount = netAllocated + openingAmount
      const bucketExpenses = periodEvents
        .filter((event) => event.type === 'expense' && event.bucketId === bucket.id)
        .reduce((total, event) => total + event.amountCents, 0)
      if (amount <= 0 && bucketExpenses <= 0) continue
      const groupId = bucket.groupId ?? 'ungrouped'
      const label = groupId === 'ungrouped' ? 'Ungrouped buckets' : groupById.get(groupId)?.name ?? 'Other group'
      const groupNode = ensure(`group:${groupId}`, label, PALETTE[2])
      if (openingAmount > 0) addLink(ensure('starting-buckets', 'Starting bucket balances', '#64748b'), groupNode, openingAmount)
      const bucketNode = ensure(`bucket:${bucket.id}`, bucket.name, bucket.color ?? PALETTE[3])
      addLink(groupNode, bucketNode, amount)
      if (bucketExpenses > 0) addLink(bucketNode, ensure('period-spending', 'Spending', '#f59e0b'), bucketExpenses)
      const closingBalance = endBalances.buckets[bucket.id] ?? 0
      addLink(bucketNode, ensure('unspent', 'Unspent balance', '#03d791'), Math.max(0, closingBalance))
    }

    addLink(available, ensure('unallocated', 'Unallocated', '#00bdf9'), Math.max(0, endBalances.unallocated))
    addLink(ensure('available-shortfall', 'Available money shortfall', '#f43f5e'), ensure('unallocated-shortfall', 'Unallocated shortfall', '#fb7185'), Math.max(0, -endBalances.unallocated))

    // Balance only flow-through nodes. Sources and destinations are real endpoints,
    // so giving each one a placeholder edge creates duplicate, misleading labels.
    const incoming = new Map<string, number>()
    const outgoing = new Map<string, number>()
    for (const link of links) {
      outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value)
      incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value)
    }
    for (const node of [...nodes.values()]) {
      const isFlowNode = node.id === 'available' || node.id.startsWith('group:') || node.id.startsWith('bucket:')
      if (!isFlowNode) continue
      const inValue = incoming.get(node.id) ?? 0
      const outValue = outgoing.get(node.id) ?? 0
      const difference = Math.abs(inValue - outValue)
      if (difference < 1) continue
      const kind = node.id === 'available' ? 'available' : node.id.startsWith('group:') ? 'group' : 'bucket'
      if (outValue > inValue) {
        const sources = {
          available: ['reconcile-in-available', 'Other available funds', '#64748b'],
          group: ['reconcile-in-group', 'Other group funding', '#64748b'],
          bucket: ['reconcile-in-bucket', 'Unfunded bucket activity', '#f43f5e'],
        } as const
        const [id, label, color] = sources[kind]
        addLink(ensure(id, label, color), node.id, difference)
      } else {
        const destinations = {
          available: ['reconcile-out-available', 'Other uses of available money'],
          group: ['reconcile-out-group', 'Returns and internal moves'],
          bucket: ['reconcile-out-bucket', 'Returns and transfers'],
        } as const
        const [id, label] = destinations[kind]
        addLink(node.id, ensure(id, label, '#64748b'), difference)
      }
    }

    const valid = [...links.reduce((set, link) => set.add(link.source).add(link.target), new Set<string>())]
    const graphNodes = [...nodes.values()].filter((node) => valid.includes(node.id))
    if (!graphNodes.length || !links.length) return null

    const layoutHeight = Math.max(320, graphNodes.length * 28)
    const layout = sankey<FlowNode, FlowLink>()
      .nodeId((node) => node.id)
      .nodeWidth(14)
      .nodePadding(18)
      .extent([[12, 14], [928, layoutHeight]])({ nodes: graphNodes, links })
    return { layout, layoutHeight }
  }, [events, buckets, groups, startDate, endDate, activeGroupId, showMerchants])

  if (!graph) return <div className="grid h-52 place-items-center text-sm text-muted">No money flows to show for this period.</div>
  const path = sankeyLinkHorizontal<FlowNode, FlowLink>()
  const { layout, layoutHeight } = graph

  return (
    <div className="relative">
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
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      }}
      onMouseLeave={() => { setHovered(null); setCursorPos(null) }}
    >
      <svg viewBox={`0 0 960 ${layoutHeight + 42}`} role="img" aria-label="Sankey diagram of income, bucket funding, spending, and unspent money" className="h-auto min-w-[760px] w-full">
        <g fill="none">
          {layout.links.map((link, index) => {
            const typed = link as LayoutLink
            const source = typed.source as LayoutNode
            const target = typed.target as LayoutNode
            return <path key={`${source.id}-${index}`} d={path(typed) ?? ''} stroke={source.color} strokeOpacity={0.3} strokeWidth={Math.max(1, typed.width ?? 1)} className="cursor-pointer transition-[stroke-opacity] hover:stroke-opacity-80" onMouseEnter={() => setHovered({ label: `${source.label} → ${target.label}`, value: typed.value, color: source.color })}>
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
            return (
              <g key={typed.id}>
                <rect x={x} y={y} width={(typed.x1 ?? x + 14) - x} height={Math.max(1, (typed.y1 ?? y + 1) - y)} fill={typed.color} rx="3" className="cursor-pointer" onMouseEnter={() => setHovered({ label: typed.label, value: typed.value ?? 0, color: typed.color })} />
                <text x={rightSide ? x - 7 : (typed.x1 ?? x + 14) + 7} y={(typed.y0 ?? 0) + ((typed.y1 ?? 0) - (typed.y0 ?? 0)) / 2} textAnchor={rightSide ? 'end' : 'start'} dominantBaseline="middle" fill="currentColor" fontSize="11">
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
            ? 'Overview shows period income and starting balances through groups into bucket spending and closing balances. Choose a group to focus on its buckets.'
            : showMerchants
              ? 'Group detail shows the five largest payees; remaining payees are combined. Flows summarize bucket activity and do not trace individual income dollars.'
              : 'Group detail summarizes each bucket’s spending and closing balance. Flows do not trace individual income dollars.'}
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
