export const DebugManagerOptions: {}
export class DebugManager {
  constructor(options?: {
    enabled?: boolean
    autoShow?: boolean
    captureUpdates?: boolean
    captureErrors?: boolean
    captureWarnings?: boolean
    performanceTracking?: boolean
    maxLogs?: number
  })
  
  registerComponent(instance: any): void
  logEvent(event: any): void
  captureError(componentName: string, error: Error): void
  captureWarning(componentName: string, message: string): void
  trackEffect(componentName: string): void
  getDebugInfo(): any
  getComponentTree(): any
  getUpdateLogs(): any[]
  getStateSnapshot(): Record<string, any>
  getPerformanceMetrics(): any
  getErrors(): any[]
  getWarnings(): any[]
  showPanel(): void
  hidePanel(): void
  togglePanel(): void
  clearLogs(): void
  exportDebugData(): string
  destroy(): void
  
  static getInstance(options?: any): DebugManager
  static destroyInstance(): void
}