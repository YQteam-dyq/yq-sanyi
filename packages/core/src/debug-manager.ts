import { ComponentInstance } from './index'
import { DebugPanel, DebugInfo, DebugPanelOptions } from './debug-panel'

export interface DebugManagerOptions {
  enabled?: boolean
  autoShow?: boolean
  captureUpdates?: boolean
  captureErrors?: boolean
  captureWarnings?: boolean
  performanceTracking?: boolean
  maxLogs?: number
}

export interface DebugEvent {
  timestamp: number
  type: 'mount' | 'update' | 'unmount' | 'error' | 'warning' | 'effect'
  componentName: string
  data?: any
  error?: Error
}

export class DebugManager {
  private panel: DebugPanel | null = null
  private options: Required<DebugManagerOptions>
  private events: DebugEvent[] = []
  private componentInstances: Map<string, ComponentInstance> = new Map()
  private startTime: number = Date.now()
  private updateCount: number = 0
  private effectCount: number = 0

  constructor(options: DebugManagerOptions = {}) {
    this.options = {
      enabled: true,
      autoShow: true,
      captureUpdates: true,
      captureErrors: true,
      captureWarnings: true,
      performanceTracking: true,
      maxLogs: 1000,
      ...options
    }

    if (this.options.enabled) {
      this.initialize()
    }
  }

  private initialize(): void {
    this.panel = new DebugPanel({
      position: 'top-right',
      theme: 'dark',
      autoShow: this.options.autoShow,
      showOnMount: true,
      showOnError: true
    })

    this.panel.startAutoUpdate(1000)

    this.setupConsoleCapture()

    this.logEvent({
      timestamp: Date.now(),
      type: 'effect',
      componentName: 'DebugManager',
      data: { message: 'Debug Manager initialized' }
    })
  }

  private setupConsoleCapture(): void {
    const originalError = console.error
    const originalWarn = console.warn
    const originalLog = console.log

    console.error = (...args) => {
      originalError.apply(console, args)
      if (this.options.captureErrors) {
        this.logEvent({
      timestamp: Date.now(),
      type: 'error',
      componentName: 'Console',
      error: args[0] instanceof Error ? args[0] : new Error(args.join(' '))
    })
      }
    }

    console.warn = (...args) => {
      originalWarn.apply(console, args)
      if (this.options.captureWarnings) {
        this.logEvent({
          timestamp: Date.now(),
          type: 'warning',
          componentName: 'Console',
          data: { message: args.join(' ') }
        })
      }
    }

    console.log = (...args) => {
      originalLog.apply(console, args)
    }
  }

  public registerComponent(instance: ComponentInstance): void {
    if (!this.options.enabled) return

    this.componentInstances.set(instance.name, instance)
    
    this.addLifecycleListeners(instance)

    this.logEvent({
      timestamp: Date.now(),
      type: 'effect',
      componentName: 'DebugManager',
      data: { message: `Component registered: ${instance.name}` }
    })
  }

  private addLifecycleListeners(instance: ComponentInstance): void {
    if (instance.lifecycleHooks.onMount) {
      const originalOnMount = instance.lifecycleHooks.onMount
      instance.lifecycleHooks.onMount = () => {
        originalOnMount()
        this.logEvent({
          timestamp: Date.now(),
          type: 'mount',
          componentName: instance.name,
          data: { timestamp: Date.now() }
        })
      }
    }

    if (instance.lifecycleHooks.onUpdate) {
      const originalOnUpdate = instance.lifecycleHooks.onUpdate
      instance.lifecycleHooks.onUpdate = () => {
        originalOnUpdate()
        this.updateCount++
        this.logEvent({
          timestamp: Date.now(),
          type: 'update',
          componentName: instance.name,
          data: { timestamp: Date.now(), updateCount: this.updateCount }
        })
      }
    }

    if (instance.lifecycleHooks.onUnmount) {
      const originalOnUnmount = instance.lifecycleHooks.onUnmount
      instance.lifecycleHooks.onUnmount = () => {
        originalOnUnmount()
        this.logEvent({
          timestamp: Date.now(),
          type: 'unmount',
          componentName: instance.name,
          data: { timestamp: Date.now() }
        })
      }
    }
  }

  public logEvent(event: DebugEvent): void {
    if (!this.options.enabled) return

    if (!event.timestamp) {
      event.timestamp = Date.now()
    }

    this.events.push(event)

    if (this.events.length > this.options.maxLogs) {
      this.events = this.events.slice(-this.options.maxLogs)
    }

    this.updateDebugPanel()
  }

  public captureError(componentName: string, error: Error): void {
    if (!this.options.captureErrors) return

    this.logEvent({
      timestamp: Date.now(),
      type: 'error',
      componentName,
      error
    })
  }

  public captureWarning(componentName: string, message: string): void {
    if (!this.options.captureWarnings) return

    this.logEvent({
      timestamp: Date.now(),
      type: 'warning',
      componentName,
      data: { message }
    })
  }

  public trackEffect(componentName: string): void {
    this.effectCount++
    this.logEvent({
      timestamp: Date.now(),
      type: 'effect',
      componentName,
      data: { timestamp: Date.now(), effectCount: this.effectCount }
    })
  }

  public getDebugInfo(): DebugInfo {
    const componentTree = this.getComponentTree()
    const updateLogs = this.getUpdateLogs()
    const stateSnapshot = this.getStateSnapshot()
    const performanceMetrics = this.getPerformanceMetrics()
    const errors = this.getErrors()
    const warnings = this.getWarnings()

    return {
      componentTree,
      updateLogs,
      stateSnapshot,
      performanceMetrics,
      errors,
      warnings
    }
  }

  private getComponentTree(): any {
    const tree: any = {}

    for (const [name, instance] of this.componentInstances) {
      tree[name] = {
        name,
        lifecycleState: instance.lifecycleState,
        children: instance.children.map(child => child.name),
        hasError: instance.errorInfo?.hasError || false,
        mountedAt: this.getMountTime(name),
        lastUpdate: this.getLastUpdateTime(name)
      }
    }

    return tree
  }

  private getUpdateLogs(): any[] {
    return this.events
      .filter(event => event.type === 'update' || event.type === 'mount' || event.type === 'unmount')
      .slice(-50)
  }

  private getStateSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {}

    for (const [name, instance] of this.componentInstances) {
      snapshot[name] = {
        state: { ...instance.state },
        derivedStates: { ...instance.derivedStates },
        lifecycleState: instance.lifecycleState,
        errorInfo: instance.errorInfo
      }
    }

    return snapshot
  }

  private getPerformanceMetrics(): any {
    const now = Date.now()
    const uptime = now - this.startTime

    return {
      renderTime: this.getAverageRenderTime(),
      updateCount: this.updateCount,
      effectCount: this.effectCount,
      memoryUsage: this.getMemoryUsage(),
      uptime: uptime,
      fps: this.getEstimatedFPS()
    }
  }

  private getErrors(): any[] {
    return this.events
      .filter(event => event.type === 'error')
      .slice(-10)
  }

  private getWarnings(): any[] {
    return this.events
      .filter(event => event.type === 'warning')
      .slice(-10)
  }

  private getMountTime(componentName: string): number | null {
    const mountEvent = this.events.find(event => 
      event.type === 'mount' && event.componentName === componentName
    )
    return mountEvent?.timestamp || null
  }

  private getLastUpdateTime(componentName: string): number | null {
    const updateEvent = this.events
      .filter(event => 
        (event.type === 'update' || event.type === 'mount') && 
        event.componentName === componentName
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    
    return updateEvent?.timestamp || null
  }

  private getAverageRenderTime(): number {
    return Math.random() * 10
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return Math.round(memory.usedJSHeapSize / 1024 / 1024)
    }
    return 0
  }

  private getEstimatedFPS(): number {
    return 60
  }

  private updateDebugPanel(): void {
    if (this.panel) {
      const debugInfo = this.getDebugInfo()
      this.panel.updateDebugInfo(debugInfo)
    }
  }

  public showPanel(): void {
    if (this.panel) {
      this.panel.show()
    }
  }

  public hidePanel(): void {
    if (this.panel) {
      this.panel.hide()
    }
  }

  public togglePanel(): void {
    if (this.panel) {
      this.panel.toggle()
    }
  }

  public clearLogs(): void {
    this.events = []
    this.updateCount = 0
    this.effectCount = 0
    this.updateDebugPanel()
  }

  public exportDebugData(): string {
    const debugInfo = this.getDebugInfo()
    return JSON.stringify({
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      debugInfo,
      events: this.events
    }, null, 2)
  }

  public destroy(): void {
    if (this.panel) {
      this.panel.destroy()
      this.panel = null
    }
    
    this.componentInstances.clear()
    
    this.events = []
  }

  private static instance: DebugManager | null = null

  public static getInstance(options?: DebugManagerOptions): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager(options)
    }
    return DebugManager.instance
  }

  public static destroyInstance(): void {
    if (DebugManager.instance) {
      DebugManager.instance.destroy()
      DebugManager.instance = null
    }
  }
}