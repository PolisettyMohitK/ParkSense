import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorState from './ErrorState'

interface Props {
  children: ReactNode
  /** Changing this value (e.g. the route) clears a previous error. */
  resetKey?: unknown
}

interface State {
  error: Error | null
}

/** Keeps one broken page from blanking the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page hit a problem"
          subtitle="Something unexpected happened while showing this page. Try again, or go back to the previous page."
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
