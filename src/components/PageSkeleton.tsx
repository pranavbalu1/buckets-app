import type { Tab } from '../nav'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

export type SkeletonPage = Exclude<Tab, 'Budget'> | 'DevTools' | 'Login'

export function PageSkeleton({ page, fullPage = false }: { page: SkeletonPage; fullPage?: boolean }) {
  const body = page === 'Dashboard' ? <DashboardSkeleton />
    : page === 'Transactions' ? <TransactionsSkeleton />
      : page === 'Accounts' ? <AccountsSkeleton />
        : page === 'Analytics' ? <AnalyticsSkeleton />
          : page === 'Login' ? <LoginSkeleton />
            : <SettingsSkeleton developer={page === 'DevTools'} />

  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${page} page`} className={fullPage ? undefined : 'space-y-5 md:space-y-6'}>
      <span className="sr-only">Loading {page} page…</span>
      <div aria-hidden="true">{body}</div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6">
      <Card className="grid gap-6 overflow-hidden p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
        <div className="flex min-h-64 flex-col items-start justify-center gap-4">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-9 w-4/5 max-w-lg" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
          <div className="mt-2 flex gap-2"><Skeleton className="h-10 w-32 rounded-lg" /><Skeleton className="h-10 w-28 rounded-lg" /></div>
        </div>
        <div className="flex min-h-56 flex-col justify-between rounded-2xl border border-line p-4 sm:p-5">
          <div className="flex justify-between"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-32" /></div><Skeleton className="size-9 rounded-xl" /></div>
          <Skeleton className="mt-5 h-24 w-full rounded-xl" />
          <div className="mt-4 grid grid-cols-3 gap-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 rounded-lg" />)}</div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <MetricSkeleton key={item} />)}</div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="space-y-5 p-5 md:p-6">
          <div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-6 w-36" /></div><Skeleton className="h-8 w-24 rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-sunken/50 p-4 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="space-y-2"><Skeleton className="h-3 w-14" /><Skeleton className="h-4 w-20" /></div>)}</div>
          <div className="space-y-3"><div className="flex justify-between"><Skeleton className="h-3 w-36" /><Skeleton className="h-3 w-10" /></div><Skeleton className="h-2 w-full rounded-full" /></div>
        </Card>
        <Card className="space-y-4 p-5 md:p-6">
          <div className="flex items-center gap-3"><Skeleton className="size-9 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-36" /></div></div>
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full rounded-xl" />)}
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-8 w-28 rounded-lg" /></div>
        <ActivityRows count={5} />
      </Card>
    </div>
  )
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-3.5 md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row"><Skeleton className="h-10 min-w-56 flex-1 rounded-lg" /><div className="flex flex-wrap gap-1.5">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-9 w-20 rounded-lg" />)}</div></div>
        <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-14 rounded-lg" />)}</div>
        <div className="flex flex-wrap gap-4 border-t border-line pt-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-4 w-40" />)}</div>
      </Card>
      <div className="space-y-2.5">
        <div className="flex justify-between px-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-16" /></div>
        <Card className="overflow-hidden divide-y divide-line"><ActivityRows count={6} /></Card>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between px-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-16" /></div>
        <Card className="overflow-hidden divide-y divide-line"><ActivityRows count={3} /></Card>
      </div>
    </div>
  )
}

function AccountsSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="flex min-h-48 flex-col justify-between p-5 sm:p-6">
          <div className="flex justify-between"><div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-44" /></div><Skeleton className="size-10 rounded-xl" /></div>
          <div className="mt-6 flex justify-between border-t border-line pt-4"><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-20" /></div><Skeleton className="h-9 w-36 rounded-lg" /></div>
        </Card>
        <Card className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-56" /></div>
          <div className="grid gap-3 sm:grid-cols-[1.25fr_.8fr_.8fr_auto]">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-10 rounded-lg" />)}</div>
        </Card>
      </div>
      <div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-9 w-28 rounded-lg" /></div>
      <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <AccountRowSkeleton key={item} />)}</div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52" /></div></div><Skeleton className="h-9 w-56 rounded-lg" /></Card>
      <Skeleton className="h-9 w-64 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <MetricSkeleton key={item} />)}</div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]"><ChartSkeleton className="min-h-80" /><ChartSkeleton className="min-h-80" /></div>
      <ChartSkeleton className="min-h-72" />
      <Card className="space-y-4 p-4 sm:p-5"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52" /></div><Skeleton className="h-8 w-36 rounded-lg" /></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <ChartSkeleton key={item} className="min-h-52" />)}</div></Card>
      <div className="grid gap-4 xl:grid-cols-2"><TableSkeleton /><TableSkeleton /></div>
      <ChartSkeleton className="min-h-72" />
    </div>
  )
}

function SettingsSkeleton({ developer = false }: { developer?: boolean }) {
  return (
    <div className="space-y-4 md:space-y-5">
      {developer && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <MetricSkeleton key={item} />)}</div>}
      <Card className="flex items-center justify-between gap-4 p-5"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-64" /></div><Skeleton className="h-9 w-28 rounded-lg" /></Card>
      <Card className="space-y-4 p-5 sm:p-6"><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-full max-w-2xl" /></div><div className="flex flex-wrap gap-2"><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-32 rounded-lg" /></div></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => <Card key={item} className="space-y-4 p-5 sm:p-6"><div className="flex gap-3"><Skeleton className="size-9 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-56" /></div></div><div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" /></div><Skeleton className="h-10 w-36 rounded-lg" /><div className="space-y-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div></Card>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><Card className="space-y-4 p-5"><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-full" /></div><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 w-32 rounded-lg" /></Card><TableSkeleton /></div>
      {developer && <Card className="space-y-3 p-5"><Skeleton className="h-5 w-40" />{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 rounded-lg" />)}</Card>}
    </div>
  )
}

function LoginSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4 sm:p-6 lg:p-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-xl lg:min-h-[650px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="flex min-h-96 flex-col justify-between gap-10 bg-sunken p-6 sm:p-9 lg:p-12"><Skeleton className="h-11 w-40 rounded-xl" /><div className="space-y-4"><Skeleton className="h-7 w-44 rounded-full" /><Skeleton className="h-10 w-full max-w-md" /><Skeleton className="h-10 w-4/5 max-w-sm" /><Skeleton className="h-4 w-full max-w-md" /></div><Card className="space-y-4 border-line/70 bg-surface/50 p-5">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-3 w-full rounded-full" />)}</Card></section>
        <section className="flex items-center justify-center p-5 sm:p-10 lg:p-12"><div className="w-full max-w-sm space-y-5"><Skeleton className="size-11 rounded-xl" /><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-56" /><Skeleton className="mt-8 h-14 rounded-lg" /><Skeleton className="h-14 rounded-lg" /><Skeleton className="h-11 rounded-lg" /></div></section>
      </div>
    </main>
  )
}

function MetricSkeleton() {
  return <Card className="space-y-3 p-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-32" /><Skeleton className="h-3 w-28" /></Card>
}

function AccountRowSkeleton() {
  return <Card className="flex items-center gap-3 p-4 sm:gap-4"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-3 w-24" /></div><div className="space-y-2 text-right"><Skeleton className="ml-auto h-4 w-24" /><Skeleton className="ml-auto h-3 w-20" /></div><Skeleton className="h-8 w-20 rounded-lg" /></Card>
}

function ActivityRows({ count }: { count: number }) {
  return <div className="divide-y divide-line">{Array.from({ length: count }, (_, item) => <div key={item} className="flex items-center gap-3 px-3 py-3 sm:px-4"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3.5 w-40 max-w-full" /><Skeleton className="h-2.5 w-56 max-w-full" /></div><div className="space-y-2"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-2.5 w-12" /></div></div>)}</div>
}

function ChartSkeleton({ className = '' }: { className?: string }) {
  return <Card className={`flex flex-col justify-between gap-5 p-4 sm:p-5 ${className}`}><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52" /></div><Skeleton className="min-h-40 w-full flex-1 rounded-xl" /><div className="flex gap-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-2.5 w-16" />)}</div></Card>
}

function TableSkeleton() {
  return <Card className="space-y-4 p-4 sm:p-5"><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52" /></div><div className="space-y-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="flex justify-between gap-3 border-b border-line pb-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-20" /></div>)}</div></Card>
}
