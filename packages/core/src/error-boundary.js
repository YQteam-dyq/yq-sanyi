export class ErrorBoundary {
  constructor(props = {}) {
    this.props = {
      fallback: null,
      children: null,
      onError: null,
      resetKeys: [],
      resetTimeout: 5000,
      showStack: true,
      ...props
    }
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    }
    
    this.unmounted = false
    this.retryTimeout = null
    this.retryCallbacks = new Set()
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorCount: 1,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error, errorInfo) {
    if (this.unmounted) return

    this.setState({
      hasError: true,
      error,
      errorInfo: {
        ...errorInfo,
        hasError: true,
        timestamp: Date.now()
      },
      errorCount: this.state.errorCount + 1,
      lastErrorTime: Date.now()
    })

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    console.error('[ErrorBoundary] Component error:', error)
    console.error('[ErrorBoundary] Error info:', errorInfo)

    this.scheduleRetry()
  }

  scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    const { resetTimeout = 5000 } = this.props
    
    this.retryTimeout = setTimeout(() => {
      if (this.props.resetKeys && this.props.resetKeys.length > 0) {
        this.reset()
      } else {
        this.retry()
      }
    }, resetTimeout)
  }

  retry() {
    if (this.unmounted) return

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    })

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    this.retryCallbacks.forEach(callback => callback())
    this.retryCallbacks.clear()
  }

  setState(newState) {
    this.state = { ...this.state, ...newState }
  }

  reset() {
    this.retry()
  }

  addRetryCallback(callback) {
    this.retryCallbacks.add(callback)
  }

  removeRetryCallback(callback) {
    this.retryCallbacks.delete(callback)
  }

  getErrorInfo() {
    return this.state.errorInfo
  }

  hasError() {
    return this.state.hasError
  }

  getErrorCount() {
    return this.state.errorCount
  }

  getLastErrorTime() {
    return this.state.lastErrorTime
  }

  destroy() {
    this.unmounted = true
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    
    this.retryCallbacks.clear()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo)
      }

      return this.renderDefaultFallback()
    }

    return this.props.children
  }

  renderDefaultFallback() {
    const { error, errorInfo } = this.state
    const { showStack = true } = this.props

    return `
      <div style="
        padding: 20px;
        border: 1px solid #ff4757;
        border-radius: 4px;
        background-color: #fff5f5;
        color: #842029;
        font-family: monospace;
        font-size: 14px;
      ">
        <h3 style="
          margin: 0 0 10px 0;
          color: #842029;
        ">
          ⚠️ Something went wrong
        </h3>
        
        <div style="
          margin-bottom: 10px;
          padding: 10px;
          background-color: #fed7d7;
          border-radius: 2px;
        ">
          <strong>Error:</strong> ${error?.message || 'Unknown error'}
        </div>

        ${showStack && errorInfo?.componentStack ? `
          <details style="
            margin-top: 10px;
            cursor: pointer;
          ">
            <summary style="font-weight: bold;">Error Details</summary>
            <pre style="
              margin-top: 10px;
              padding: 10px;
              background-color: #f1f2f6;
              border-radius: 2px;
              font-size: 12px;
              white-space: pre-wrap;
              word-break: break-word;
            ">
              ${error.stack}
            </pre>
          </details>
        ` : ''}

        <div style="
          margin-top: 15px;
          display: flex;
          gap: 10px;
          align-items: center;
        ">
          <button
            onclick="this.closest('.error-boundary').reset()"
            style="
              padding: 6px 12px;
              background-color: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            "
          >
            Retry
          </button>
          
          <button
            onclick="
              this.closest('.error-boundary').reset();
              if (this.closest('.error-boundary').props.onError) {
                this.closest('.error-boundary').props.onError(new Error('User reset error'), {
                  componentStack: '',
                  hasError: false,
                  timestamp: Date.now(),
                  error: null
                });
              }
            "
            style="
              padding: 6px 12px;
              background-color: #6b7280;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            "
          >
            Reset
          </button>
        </div>

        <div style="
          margin-top: 10px;
          font-size: 12px;
          color: #6b7280;
        ">
          Error occurred at: ${new Date(this.state.lastErrorTime).toLocaleString()}
        </div>
      </div>
    `
  }
}

export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  return function ErrorBoundaryWrapper(props) {
    const errorBoundary = new ErrorBoundary({
      children: Component(props),
      ...errorBoundaryProps
    })
    
    const container = document.createElement('div')
    container.className = 'error-boundary'
    container.innerHTML = errorBoundary.render()
    
    container.reset = () => errorBoundary.reset()
    
    return container
  }
}

export function useErrorBoundary() {
  const [error, setError] = React.useState(null)
  const [errorInfo, setErrorInfo] = React.useState(null)
  const [hasError, setHasError] = React.useState(false)

  const resetError = () => {
    setError(null)
    setErrorInfo(null)
    setHasError(false)
  }

  const captureError = (error, errorInfo = {}) => {
    setError(error)
    setErrorInfo({
      componentStack: '',
      hasError: true,
      timestamp: Date.now(),
      error,
      ...errorInfo
    })
    setHasError(true)
  }

  return {
    error,
    errorInfo,
    hasError,
    resetError,
    captureError
  }
}