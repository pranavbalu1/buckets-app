import { Component } from 'react'
import type { ReactNode } from 'react'
import { Button } from './button'
import { Card } from './card'

interface Props { children: ReactNode }
interface State { hasError: boolean }

/** Keep a failed lazy-loaded route from taking down the rest of the workspace. */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Card className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <div>
          <h2 className="font-semibold">This page could not be loaded</h2>
          <p className="mt-1 text-sm text-muted">Check your connection and reload the app to try again.</p>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>Reload app</Button>
      </Card>
    )
  }
}
