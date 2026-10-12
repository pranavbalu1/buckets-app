import { ArrowLeft, Download, MonitorDown } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '../components'
import BrandMark from '../app/components/BrandMark'

const windowsInstallerUrl = 'https://github.com/pranavbalu1/buckets-app/releases/latest/download/Buckets-Setup.exe'
const releasesUrl = 'https://github.com/pranavbalu1/buckets-app/releases'

export default function DownloadDesktop() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-ink sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-left hover:bg-sunken">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink"><BrandMark className="size-5" /></span>
            <span className="text-base font-semibold tracking-tight">Buckets</span>
          </Link>
          <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm text-muted hover:bg-sunken hover:text-ink">
            <ArrowLeft className="size-4" /> Back to app
          </Link>
        </header>

        <section className="mt-10 space-y-6 sm:mt-16">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">Buckets for desktop</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your budget, on your desktop.</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Use Buckets in a dedicated desktop window, with local receipt scanning and the same account you use on the web.
            </p>
          </div>

          <Card className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div className="flex min-w-0 gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><MonitorDown className="size-6" /></span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Windows desktop app</h2>
                <p className="mt-1 text-sm text-muted">Installer for 64-bit Windows computers.</p>
                <p className="mt-3 text-xs leading-5 text-muted">Windows may show a security prompt because this installer is not code-signed. Only install it if you trust this project.</p>
              </div>
            </div>
            <a href={windowsInstallerUrl} className="btn btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold">
              <Download className="size-4" /> Download for Windows
            </a>
          </Card>

          <p className="text-sm text-muted">
            Looking for release notes or another desktop build? <a href={releasesUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">View all releases</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
