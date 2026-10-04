import { useMemo } from 'react'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import type { SankeyExtraProperties, SankeyLink, SankeyNode } from 'd3-sankey'
import { effectiveDate, computeBalances } from '../domain/balances'
import { formatCents } from '../domain/money'
import type { Bucket, BucketGroup } from '../domain/models'
import type { LedgerEvent } from '../domain/types'

interface FlowNode extends SankeyExtraProperties { id: string; label: string; color: string }
interface FlowLink extends SankeyExtraProperties { source: string; target: string; value: number }
type LayoutNode = SankeyNode<FlowNode, FlowLink>
type LayoutLink = SankeyLink<FlowNode, FlowLink>

const PALETTE = ['#e6ff4b', '#00bdf9', '#03d791', '#f59e0b', '#a855f7', '#f43f5e', '#14b8a6']

export default function MoneyFlowSankey({ events, buckets, groups, startDate, endDate }: {
  events: LedgerEvent[]
  buckets: Bucket[]
  groups: BucketGroup[]
  startDate: string
  endDate: string
}) {
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
      if (amount <= 0 && !periodEvents.some((event) => event.type === 'expense' && event.bucketId === bucket.id)) continue
      const groupId = bucket.groupId ?? 'ungrouped'
      const label = groupId === 'ungrouped' ? 'Ungrouped buckets' : groupById.get(groupId)?.name ?? 'Other group'
      const groupNode = ensure(`group:${groupId}`, label, PALETTE[2])
      if (openingAmount > 0) addLink(ensure('starting-buckets', 'Starting bucket balances', '#64748b'), groupNode, openingAmount)
      const bucketNode = ensure(`bucket:${bucket.id}`, bucket.name, bucket.color ?? PALETTE[3])
      addLink(groupNode, bucketNode, amount)

      const payees = new Map<string, number>()
      for (const event of periodEvents) {
        if (event.type !== 'expense' || event.bucketId !== bucket.id) continue
        const payee = event.payee?.trim() || event.description.trim() || 'Other spending'
        payees.set(payee, (payees.get(payee) ?? 0) + event.amountCents)
      }
      for (const [payee, spent] of payees) {
        const payeeNode = ensure(`payee:${bucket.id}:${payee}`, payee, '#f59e0b')
        addLink(bucketNode, payeeNode, spent)
      }
      const closingBalance = endBalances.buckets[bucket.id] ?? 0
      addLink(bucketNode, ensure('unspent', 'Unspent balance', '#03d791'), Math.max(0, closingBalance))
      addLink(bucketNode, ensure('overspent', 'Overspent bucket balance', '#f43f5e'), Math.max(0, -closingBalance))
    }

    addLink(available, ensure('unallocated', 'Unallocated', '#00bdf9'), Math.max(0, endBalances.unallocated))
    addLink(ensure('available-shortfall', 'Available money shortfall', '#f43f5e'), ensure('unallocated-shortfall', 'Unallocated shortfall', '#fb7185'), Math.max(0, -endBalances.unallocated))
    const valid = [...links.reduce((set, link) => set.add(link.source).add(link.target), new Set<string>())]
    const graphNodes = [...nodes.values()].filter((node) => valid.includes(node.id))
    if (!graphNodes.length || !links.length) return null

    return sankey<FlowNode, FlowLink>()
      .nodeId((node) => node.id)
      .nodeWidth(14)
      .nodePadding(15)
      .extent([[12, 14], [928, 348]])({ nodes: graphNodes, links })
  }, [events, buckets, groups, startDate, endDate])

  if (!graph) return <div className="grid h-52 place-items-center text-sm text-muted">No money flows to show for this period.</div>
  const path = sankeyLinkHorizontal<FlowNode, FlowLink>()

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 960 390" role="img" aria-label="Sankey diagram of income, bucket funding, spending, and unspent money" className="h-auto min-w-[760px] w-full">
        <g fill="none">
          {graph.links.map((link, index) => {
            const typed = link as LayoutLink
            const source = typed.source as LayoutNode
            return <path key={`${source.id}-${index}`} d={path(typed) ?? ''} stroke={source.color} strokeOpacity={0.3} strokeWidth={Math.max(1, typed.width ?? 1)}>
              <title>{`${source.label} → ${(typed.target as LayoutNode).label}: ${formatCents(typed.value)}`}</title>
            </path>
          })}
        </g>
        <g>
          {graph.nodes.map((node) => {
            const typed = node as LayoutNode
            const x = typed.x0 ?? 0
            const y = typed.y0 ?? 0
            const rightSide = x > 700
            return (
              <g key={typed.id}>
                <rect x={x} y={y} width={(typed.x1 ?? x + 14) - x} height={Math.max(1, (typed.y1 ?? y + 1) - y)} fill={typed.color} rx="3" />
                <text x={rightSide ? x - 7 : (typed.x1 ?? x + 14) + 7} y={(typed.y0 ?? 0) + ((typed.y1 ?? 0) - (typed.y0 ?? 0)) / 2} textAnchor={rightSide ? 'end' : 'start'} dominantBaseline="middle" fill="currentColor" fontSize="10">
                  {typed.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <p className="px-2 text-xs text-muted">Opening balances and current activity are shown as period flows. Bucket moves stay internal to your plan.</p>
    </div>
  )
}
