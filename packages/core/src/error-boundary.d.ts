export class ErrorBoundary {
  constructor(props: {
    fallback?: (error: Error, errorInfo: any) => any
    children?: any
    onError?: (error: Error, errorInfo: any) => void
    resetKeys?: string[]
    resetTimeout?: number
    showStack?: boolean
  })
  
  componentDidCatch(error: Error, errorInfo: any): void
  reset(): void
  destroy(): void
  hasError(): boolean
  getErrorCount(): number
  getLastErrorTime(): number | null
  render(): any
}

export function withErrorBoundary(componentName: string, fallback?: (error: Error, errorInfo: any) => any): (instance: any) => any
export function getErrorBoundaryInfo(instance: any): any
export function resetErrorBoundary(instance: any): void