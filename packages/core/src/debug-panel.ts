export interface DebugPanelOptions {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  theme?: 'light' | 'dark'
  autoShow?: boolean
  showOnMount?: boolean
  showOnError?: boolean
}

export interface DebugInfo {
  componentTree: any
  updateLogs: any[]
  stateSnapshot: Record<string, any>
  performanceMetrics: {
    renderTime: number
    updateCount: number
    effectCount: number
    memoryUsage: number
  }
  errors: any[]
  warnings: any[]
}

export class DebugPanel {
  private container: HTMLElement
  private panel: HTMLElement
  private isVisible: boolean = false
  private options: Required<DebugPanelOptions>
  private updateInterval: number | null = null
  private debugInfo: DebugInfo | null = null

  constructor(options: DebugPanelOptions = {}) {
    this.options = {
      position: 'top-right',
      theme: 'dark',
      autoShow: false,
      showOnMount: true,
      showOnError: true,
      ...options
    }

    this.container = document.createElement('div')
    this.container.style.cssText = this.getContainerStyles()
    document.body.appendChild(this.container)

    this.panel = this.createPanel()
    this.container.appendChild(this.panel)

    if (this.options.autoShow) {
      this.show()
    }
  }

  private getContainerStyles(): string {
    const baseStyles = `
      position: fixed;
      z-index: 999999;
      font-family: monospace;
      font-size: 12px;
    `

    const positionStyles = {
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;'
    }

    return baseStyles + positionStyles[this.options.position]
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.style.cssText = `
      width: 400px;
      max-height: 600px;
      background: ${this.options.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      border: 1px solid ${this.options.theme === 'dark' ? '#444' : '#ddd'};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
    `

    const header = this.createHeader()
    const content = this.createContent()

    panel.appendChild(header)
    panel.appendChild(content)

    return panel
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div')
    header.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      padding: 12px 16px;
      border-bottom: 1px solid ${this.options.theme === 'dark' ? '#444' : '#ddd'};
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
    `

    const title = document.createElement('div')
    title.textContent = '🔍 yq-sanyi Debug Panel'
    title.style.cssText = `
      font-weight: bold;
      color: ${this.options.theme === 'dark' ? '#fff' : '#333'};
    `

    const controls = document.createElement('div')
    controls.style.cssText = 'display: flex; gap: 8px;'

    const minimizeBtn = document.createElement('button')
    minimizeBtn.textContent = '−'
    minimizeBtn.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#444' : '#ddd'};
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      color: ${this.options.theme === 'dark' ? '#fff' : '#333'};
    `
    minimizeBtn.onclick = () => this.toggle()

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#444' : '#ddd'};
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      color: ${this.options.theme === 'dark' ? '#fff' : '#333'};
    `
    closeBtn.onclick = () => this.hide()

    controls.appendChild(minimizeBtn)
    controls.appendChild(closeBtn)

    header.appendChild(title)
    header.appendChild(controls)

    this.makeDraggable(header, this.panel)

    return header
  }

  private createContent(): HTMLElement {
    const content = document.createElement('div')
    content.style.cssText = `
      padding: 16px;
      overflow-y: auto;
      max-height: 500px;
    `

    const tabs = this.createTabs()
    const tabContent = this.createTabContent()

    content.appendChild(tabs)
    content.appendChild(tabContent)

    return content
  }

  private createTabs(): HTMLElement {
    const tabs = document.createElement('div')
    tabs.style.cssText = `
      display: flex;
      border-bottom: 1px solid ${this.options.theme === 'dark' ? '#444' : '#ddd'};
      margin-bottom: 12px;
    `

    const tabNames = ['Components', 'State', 'Logs', 'Performance', 'Errors']
    const tabContents = ['components', 'state', 'logs', 'performance', 'errors']

    tabNames.forEach((name, index) => {
      const tab = document.createElement('button')
      tab.textContent = name
      tab.style.cssText = `
        background: none;
        border: none;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        color: ${this.options.theme === 'dark' ? '#ccc' : '#666'};
        transition: all 0.2s;
      `
      
      if (index === 0) {
        tab.style.borderBottomColor = this.options.theme === 'dark' ? '#3b82f6' : '#2563eb'
        tab.style.color = this.options.theme === 'dark' ? '#fff' : '#333'
      }

      tab.onclick = () => this.switchTab(index, tabContents[index], tabNames)
      tabs.appendChild(tab)
    })

    return tabs
  }

  private createTabContent(): HTMLElement {
    const content = document.createElement('div')
    content.id = 'debug-panel-content'
    
    this.renderComponentsTab(content)
    
    return content
  }

  private switchTab(index: number, tabName: string, tabNames: string[]): void {
    const tabs = this.panel.querySelectorAll('button[style*="border-bottom"]')
    const content = document.getElementById('debug-panel-content')!
    
    tabs.forEach((tab, i) => {
      if (i === index) {
        tab.setAttribute('style', `border-bottom-color: ${this.options.theme === 'dark' ? '#3b82f6' : '#2563eb'}; color: ${this.options.theme === 'dark' ? '#fff' : '#333'};`)
      } else {
        tab.setAttribute('style', `border-bottom-color: transparent; color: ${this.options.theme === 'dark' ? '#ccc' : '#666'};`)
      }
    })

    content.innerHTML = ''
    
    switch (tabName) {
      case 'components':
        this.renderComponentsTab(content)
        break
      case 'state':
        this.renderStateTab(content)
        break
      case 'logs':
        this.renderLogsTab(content)
        break
      case 'performance':
        this.renderPerformanceTab(content)
        break
      case 'errors':
        this.renderErrorsTab(content)
        break
    }
  }

  private renderComponentsTab(content: HTMLElement): void {
    const title = document.createElement('h3')
    title.textContent = 'Component Tree'
    title.style.cssText = `color: ${this.options.theme === 'dark' ? '#fff' : '#333'}; margin-bottom: 12px;`
    content.appendChild(title)

    const treeContainer = document.createElement('div')
    treeContainer.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
    `
    treeContainer.innerHTML = this.debugInfo?.componentTree ? 
      `<pre>${JSON.stringify(this.debugInfo.componentTree, null, 2)}</pre>` : 
      '<p>No component data available</p>'
    content.appendChild(treeContainer)
  }

  private renderStateTab(content: HTMLElement): void {
    const title = document.createElement('h3')
    title.textContent = 'State Information'
    title.style.cssText = `color: ${this.options.theme === 'dark' ? '#fff' : '#333'}; margin-bottom: 12px;`
    content.appendChild(title)

    const stateContainer = document.createElement('div')
    stateContainer.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
    `
    stateContainer.innerHTML = this.debugInfo?.stateSnapshot ? 
      `<pre>${JSON.stringify(this.debugInfo.stateSnapshot, null, 2)}</pre>` : 
      '<p>No state data available</p>'
    content.appendChild(stateContainer)
  }

  private renderLogsTab(content: HTMLElement): void {
    const title = document.createElement('h3')
    title.textContent = 'Update Logs'
    title.style.cssText = `color: ${this.options.theme === 'dark' ? '#fff' : '#333'}; margin-bottom: 12px;`
    content.appendChild(title)

    const logsContainer = document.createElement('div')
    logsContainer.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      max-height: 300px;
      overflow-y: auto;
    `

    if (this.debugInfo?.updateLogs && this.debugInfo.updateLogs.length > 0) {
      logsContainer.innerHTML = this.debugInfo.updateLogs
        .map((log: any) => `
          <div style="margin-bottom: 8px; padding: 4px; background: ${this.options.theme === 'dark' ? '#333' : '#eee'}; border-radius: 2px;">
            <div style="color: ${this.options.theme === 'dark' ? '#3b82f6' : '#2563eb'}; font-weight: bold;">
              ${new Date(log.timestamp).toLocaleTimeString()}
            </div>
            <div>Type: ${log.type} | Path: ${log.path}</div>
          </div>
        `).join('')
    } else {
      logsContainer.innerHTML = '<p>No update logs available</p>'
    }

    content.appendChild(logsContainer)
  }

  private renderPerformanceTab(content: HTMLElement): void {
    const title = document.createElement('h3')
    title.textContent = 'Performance Metrics'
    title.style.cssText = `color: ${this.options.theme === 'dark' ? '#fff' : '#333'}; margin-bottom: 12px;`
    content.appendChild(title)

    const perfContainer = document.createElement('div')
    perfContainer.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
    `

    if (this.debugInfo?.performanceMetrics) {
      const metrics = this.debugInfo.performanceMetrics
      perfContainer.innerHTML = `
        <div style="margin-bottom: 8px;">
          <strong>Render Time:</strong> ${metrics.renderTime}ms
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Update Count:</strong> ${metrics.updateCount}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Effect Count:</strong> ${metrics.effectCount}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Memory Usage:</strong> ${metrics.memoryUsage}MB
        </div>
      `
    } else {
      perfContainer.innerHTML = '<p>No performance data available</p>'
    }

    content.appendChild(perfContainer)
  }

  private renderErrorsTab(content: HTMLElement): void {
    const title = document.createElement('h3')
    title.textContent = 'Errors & Warnings'
    title.style.cssText = `color: ${this.options.theme === 'dark' ? '#fff' : '#333'}; margin-bottom: 12px;`
    content.appendChild(title)

    const errorsContainer = document.createElement('div')
    errorsContainer.style.cssText = `
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      max-height: 300px;
      overflow-y: auto;
    `

    if (this.debugInfo?.errors && this.debugInfo.errors.length > 0) {
      errorsContainer.innerHTML = this.debugInfo.errors
        .map((error: any) => `
          <div style="margin-bottom: 8px; padding: 8px; background: ${this.options.theme === 'dark' ? '#8b0000' : '#ffebee'}; border-radius: 4px; border-left: 4px solid #dc3545;">
            <div style="color: #dc3545; font-weight: bold;">ERROR</div>
            <div>${error.message}</div>
            <div style="color: ${this.options.theme === 'dark' ? '#999' : '#666'}; font-size: 10px;">
              ${new Date(error.timestamp).toLocaleTimeString()}
            </div>
          </div>
        `).join('')
    } else if (this.debugInfo?.warnings && this.debugInfo.warnings.length > 0) {
      errorsContainer.innerHTML = this.debugInfo.warnings
        .map((warning: any) => `
          <div style="margin-bottom: 8px; padding: 8px; background: ${this.options.theme === 'dark' ? '#b8860b' : '#fff3cd'}; border-radius: 4px; border-left: 4px solid #ffc107;">
            <div style="color: #856404; font-weight: bold;">WARNING</div>
            <div>${warning.message}</div>
            <div style="color: ${this.options.theme === 'dark' ? '#999' : '#666'}; font-size: 10px;">
              ${new Date(warning.timestamp).toLocaleTimeString()}
            </div>
          </div>
        `).join('')
    } else {
      errorsContainer.innerHTML = '<p>No errors or warnings</p>'
    }

    content.appendChild(errorsContainer)
  }

  private makeDraggable(header: HTMLElement, panel: HTMLElement): void {
    let isDragging = false
    let startX: number, startY: number
    let startLeft: number, startTop: number

    header.addEventListener('mousedown', (e) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      startLeft = parseInt(window.getComputedStyle(panel).left, 10)
      startTop = parseInt(window.getComputedStyle(panel).top, 10)
      header.style.cursor = 'grabbing'
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      panel.style.left = `${startLeft + deltaX}px`
      panel.style.top = `${startTop + deltaY}px`
    })

    document.addEventListener('mouseup', () => {
      isDragging = false
      header.style.cursor = 'move'
    })
  }

  public show(): void {
    this.panel.style.display = 'flex'
    this.isVisible = true
  }

  public hide(): void {
    this.panel.style.display = 'none'
    this.isVisible = false
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  public updateDebugInfo(debugInfo: DebugInfo): void {
    this.debugInfo = debugInfo
    const activeTab = this.panel.querySelector('button[style*="border-bottom-color: rgb(59, 130, 246)"], button[style*="border-bottom-color: #3b82f6"]')
    if (activeTab) {
      const tabName = activeTab.textContent?.toLowerCase() || 'components'
      const content = document.getElementById('debug-panel-content')!
      content.innerHTML = ''
      
      switch (tabName) {
        case 'components':
          this.renderComponentsTab(content)
          break
        case 'state':
          this.renderStateTab(content)
          break
        case 'logs':
          this.renderLogsTab(content)
          break
        case 'performance':
          this.renderPerformanceTab(content)
          break
        case 'errors':
          this.renderErrorsTab(content)
          break
      }
    }
  }

  public startAutoUpdate(intervalMs: number = 1000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    this.updateInterval = window.setInterval(() => {
      if (this.isVisible && this.debugInfo) {
        this.updateDebugInfo(this.debugInfo)
      }
    }, intervalMs)
  }

  public stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  public destroy(): void {
    this.stopAutoUpdate()
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }
}