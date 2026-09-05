import type { SNode, Slot, Cdo, RenderContext, ComponentInstance, ComponentOptions, ScoperOptions, Scoper, StyleInjection, LifecycleHooks, ParsedPart } from './index.js'
import { parseTemplate, createRenderContext, resolvePath, generateScopeId } from './index.js'
import { DebugManager, DebugManagerOptions, getDebugManager } from './debug-manager-simple.js'
import { ErrorBoundary } from './error-boundary.js'

function cloneStaticNode(node: SNode): Element {
  const element = document.createElement(node.tag) as HTMLElement
  element.dataset.yqNodeId = node.id.toString()
  
  for (const [attr, value] of Object.entries(node.staticAttrs)) {
    element.setAttribute(attr, value)
  }
  
  for (const [attr, parts] of Object.entries(node.dynAttrs)) {
    let currentValue: string = ''
    for (const part of parts) {
      if ('path' in part && Array.isArray(part.path)) {
        currentValue += '{{' + part.path.join('.') + '}}'
      } else if ('static' in part) {
        currentValue += part.static
      }
    }
    element.setAttribute(attr, currentValue)
  }
  
  element.textContent = ''
  for (const part of node.text) {
    if ('path' in part && Array.isArray(part.path)) {
      element.textContent += '{{' + part.path.join('.') + '}}'
    } else if ('static' in part) {
      element.textContent += part.static
    }
  }
  
  for (const child of node.children) {
    element.appendChild(cloneStaticNode(child))
  }
  
  return element
}

function fillTextSlot(node: Element, slot: Extract<Slot, { kind: 'text' }>, context: RenderContext): void {
  const parts = node.textContent?.split('') || []
  let currentText = ''
  
  for (let i = 0; i < parts.length; i++) {
    if (i === slot.partIndex) {
      const value = slot.path ? resolvePath(context.state, slot.path) : undefined
      currentText += String(value)
    }
    currentText += parts[i]
  }
  
  ;(node as HTMLElement).textContent = currentText
}

function fillAttrSlot(node: Element, slot: Extract<Slot, { kind: 'attr' }>, context: RenderContext): void {
  const value = slot.path ? resolvePath(context.state, slot.path) : undefined
  if (value != null) {
    node.setAttribute(slot.attr, String(value))
  }
}

function fillBoolSlot(node: Element, slot: Extract<Slot, { kind: 'bool' }>, context: RenderContext): void {
  const value = slot.path ? resolvePath(context.state, slot.path) : undefined
  if (value) {
    node.setAttribute(slot.attr, '')
  } else {
    node.removeAttribute(slot.attr)
  }
}

function createListItem(cdo: Cdo, slot: Extract<Slot, { kind: 'list' }>, item: any, index: number, context: RenderContext): Element {
  const fragment = document.createDocumentFragment()
  const itemState = { ...context.state, [slot.itemVar]: item }
  const itemContext = { ...context, state: itemState }
  
  const itemElement = cloneStaticNode(cdo.root)
  fragment.appendChild(itemElement)
  
  for (const childSlot of cdo.slots) {
    if (childSlot.kind === 'text' && childSlot.nodeId === cdo.root.id) {
      fillTextSlot(itemElement, childSlot, itemContext)
    } else if (childSlot.kind === 'attr' && childSlot.nodeId === cdo.root.id) {
      fillAttrSlot(itemElement, childSlot, itemContext)
    } else if (childSlot.kind === 'bool' && childSlot.nodeId === cdo.root.id) {
      fillBoolSlot(itemElement, childSlot, itemContext)
    }
  }
  
  return fragment.firstChild as Element
}

function fillListSlot(node: Element, slot: Extract<Slot, { kind: 'list' }>, context: RenderContext, cdo: Cdo): void {
  const items = resolvePath(context.state, slot.itemsPath) || []
  const fragment = document.createDocumentFragment()
  const existingElements = Array.from(node.children)
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const key = slot.keyProp ? String(item[slot.keyProp]) : String(i)
    const existingElement = existingElements.find(el => (el as HTMLElement).dataset.yqKey === String(key))
    
    if (existingElement) {
      const itemElement = existingElement.cloneNode(true) as HTMLElement
      itemElement.dataset.yqKey = String(key)
      fragment.appendChild(itemElement)
    } else {
      const itemElement = createListItem(cdo, slot, item, i, context) as HTMLElement
      itemElement.dataset.yqKey = String(key)
      fragment.appendChild(itemElement)
    }
  }
  
  node.innerHTML = ''
  node.appendChild(fragment)
}

function renderSkeleton(cdo: Cdo, container: HTMLElement): Element {
  const fragment = document.createDocumentFragment()
  const root = cloneStaticNode(cdo.root)
  
  const options: ScoperOptions = {
    scopeId: cdo.scopeId,
    useShadowDOM: false
  }
  
  const scopedRoot = scoper.createScopedElement(root as HTMLElement, cdo.scopeId, options)
  fragment.appendChild(scopedRoot)
  container.appendChild(fragment)
  
  if (cdo.styleText) {
    scoper.injectStyle(cdo.styleText, cdo.scopeId)
  }
  
  return scopedRoot
}

function populateNodeCache(cdo: Cdo, root: Element): Map<number, Element> {
  const nodeCache = new Map<number, Element>()
  
  function traverse(element: Element): void {
    const dataset = (element as HTMLElement).dataset
    if (dataset && 'yqNodeId' in dataset) {
      const nodeId = parseInt(dataset.yqNodeId || '0')
      nodeCache.set(nodeId, element)
    }
    
    for (const child of Array.from(element.children)) {
      traverse(child)
    }
  }
  
  traverse(root)
  return nodeCache
}

function fillSlots(cdo: Cdo, context: RenderContext): void {
  const cache = new Map<number, Element>()
  
  function traverse(element: Element): void {
    if ((element as HTMLElement).dataset.yqNodeId) {
      const nodeId = parseInt((element as HTMLElement).dataset.yqNodeId || '0')
      cache.set(nodeId, element)
    }
    
    for (const child of Array.from(element.children)) {
      traverse(child)
    }
  }
  
  const rootNode = context.nodeCache.get(cdo.root.id)
  
  if (!rootNode) {
    console.error('Root node not found in cache for ID:', cdo.root.id)
    console.error('Available node IDs:', Array.from(context.nodeCache.keys()))
    return
  }
  
  traverse(rootNode)
  
  for (const slot of cdo.slots) {
    const node = cache.get(slot.nodeId)
    if (!node) continue
    
    if (slot.kind === 'text') {
      fillTextSlot(node, slot, context)
    } else if (slot.kind === 'attr') {
      fillAttrSlot(node, slot, context)
    } else if (slot.kind === 'bool') {
      fillBoolSlot(node, slot, context)
    } else if (slot.kind === 'list') {
      fillListSlot(node, slot, context, cdo)
    }
  }
}

function updateSlots(cdo: Cdo, context: RenderContext): void {
  const cache = new Map<number, Element>()
  
  function traverse(element: Element): void {
    if ((element as HTMLElement).dataset.yqNodeId) {
      const nodeId = parseInt((element as HTMLElement).dataset.yqNodeId || '0')
      cache.set(nodeId, element)
    }
    
    for (const child of Array.from(element.children)) {
      traverse(child)
    }
  }
  
  const rootEl = context.nodeCache.get(cdo.root.id)
  if (rootEl) {
    traverse(rootEl)
  }
  
  for (const slot of cdo.slots) {
    const node = cache.get(slot.nodeId)
    if (!node) continue
    
    if (slot.kind === 'text') {
      const parts = node.textContent?.split('') || []
      let currentText = ''
      let needsUpdate = false
      
      for (let i = 0; i < parts.length; i++) {
        if (i === slot.partIndex) {
          const value = slot.path ? resolvePath(context.state, slot.path) : undefined
          const newValue = String(value)
          if (currentText.length > 0 || parts[i] !== newValue) {
            needsUpdate = true
          }
          currentText += newValue
        } else {
          currentText += parts[i]
        }
      }
      
      if (needsUpdate) {
        ;(node as HTMLElement).textContent = currentText
      }
    } else if (slot.kind === 'attr') {
      const value = slot.path ? resolvePath(context.state, slot.path) : undefined
      const newValue = value != null ? String(value) : null
      const currentValue = node.getAttribute(slot.attr)
      if (currentValue !== newValue) {
        if (newValue != null) {
          node.setAttribute(slot.attr, newValue)
        } else {
          node.removeAttribute(slot.attr)
        }
      }
    } else if (slot.kind === 'bool') {
      const value = slot.path ? resolvePath(context.state, slot.path) : undefined
      const hasAttr = node.hasAttribute(slot.attr)
      if (value && !hasAttr) {
        node.setAttribute(slot.attr, '')
      } else if (!value && hasAttr) {
        node.removeAttribute(slot.attr)
      }
    } else if (slot.kind === 'list') {
      const items = resolvePath(context.state, slot.itemsPath) || []
      const fragment = document.createDocumentFragment()
      const existingElements = Array.from(node.children)
      const remaining: Element[] = []
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const key = slot.keyProp ? String(item[slot.keyProp]) : String(i)
        const existingIndex = existingElements.findIndex(el => (el as HTMLElement).dataset.yqKey === String(key))
        
        if (existingIndex !== -1) {
          fragment.appendChild(existingElements[existingIndex])
          existingElements.splice(existingIndex, 1)
        } else {
          const itemElement = createListItem(cdo, slot, item, i, context) as HTMLElement
          itemElement.dataset.yqKey = String(key)
          fragment.appendChild(itemElement)
        }
      }
      
      for (const el of existingElements) {
        el.remove()
      }
      
      node.appendChild(fragment)
    }
  }
}

const styleInjections = new Map<string, StyleInjection>()
const themeVariables = new Map<string, string>()
const globalStyles = new Map<string, string>()

function generateScopedCSS(cssText: string, scopeId: string): string {
  if (!cssText.trim()) return ''
  
  const scopeAttr = `data-yq-scope="${scopeId}"`
  
  const scopedCSS = cssText
    .replace(/([^{}]+)(?=[,{])/g, (selector) => {
      if (selector.trim().startsWith('*')) {
        return selector
      }
      
      if (selector.includes(':') || selector.includes('::')) {
        return selector
      }
      
      const trimmedSelector = selector.trim()
      if (trimmedSelector) {
        return `${trimmedSelector}[${scopeAttr}]`
      }
      return selector
    })
    .replace(/([{}])/g, (match) => match)
  
  return scopedCSS
}

function injectStyle(cssText: string, scopeId: string): StyleInjection {
  const id = `${scopeId}-${cssText.length}-${Date.now()}`
  
  const existing = styleInjections.get(id)
  if (existing) {
    existing.references++
    return existing
  }
  
  const scopedCSS = generateScopedCSS(cssText, scopeId)
  
  const styleElement = document.createElement('style')
  styleElement.textContent = scopedCSS
  styleElement.setAttribute('data-yq-scope-id', scopeId)
  styleElement.setAttribute('data-yq-style-id', id)
  
  document.head.appendChild(styleElement)
  
  const injection: StyleInjection = {
    id,
    cssText: scopedCSS,
    scopeId,
    references: 1,
    element: styleElement
  }
  
  styleInjections.set(id, injection)
  return injection
}

function removeStyle(injection: StyleInjection): void {
  injection.references--
  
  if (injection.references <= 0) {
    if (injection.element) {
      injection.element.remove()
    }
    styleInjections.delete(injection.id)
  }
}

function updateTheme(themeVars: Record<string, string>): void {
  for (const [key, value] of Object.entries(themeVars)) {
    themeVariables.set(key, value)
  }
  
  for (const [key, value] of Object.entries(themeVars)) {
    document.documentElement.style.setProperty(`--yq-${key}`, value)
  }
}

function getThemeVariables(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of themeVariables) {
    result[key] = value
  }
  return result
}

function resetTheme(): void {
  const defaultTheme = {
    'primary-color': '#3b82f6',
    'secondary-color': '#6b7280',
    'background-color': '#ffffff',
    'text-color': '#1f2937',
    'border-color': '#e5e7eb',
    'shadow-color': 'rgba(0, 0, 0, 0.1)'
  }
  
  themeVariables.clear()
  updateTheme(defaultTheme)
}

function addGlobalStyle(cssText: string, id?: string): string {
  const styleId = id || `global-${Date.now()}`
  globalStyles.set(styleId, cssText)
  
  const styleElement = document.createElement('style')
  styleElement.textContent = cssText
  styleElement.setAttribute('data-yq-global-style', styleId)
  document.head.appendChild(styleElement)
  
  return styleId
}

function removeGlobalStyle(id: string): void {
  const cssText = globalStyles.get(id)
  if (cssText) {
    globalStyles.delete(id)
    const styleElements = document.querySelectorAll(`style[data-yq-global-style="${id}"]`)
    styleElements.forEach(element => element.remove())
  }
}

function getGlobalStyles(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [id, cssText] of globalStyles) {
    result[id] = cssText
  }
  return result
}

function clearGlobalStyles(): void {
  globalStyles.clear()
  const styleElements = document.querySelectorAll('style[data-yq-global-style]')
  styleElements.forEach(element => element.remove())
}

function createScopedElement(element: HTMLElement, scopeId: string, options?: ScoperOptions): HTMLElement {
  if (options?.useShadowDOM) {
    const shadowRoot = element.attachShadow({ mode: 'open' })
    const scopedElement = element.cloneNode(true) as HTMLElement
    shadowRoot.appendChild(scopedElement)
    
    const allElements = shadowRoot.querySelectorAll('*')
    allElements.forEach(el => {
      if (el && typeof el.setAttribute === 'function') {
        el.setAttribute('data-yq-scope', scopeId)
      }
    })
    
    return element
  } else {
    const scopedElement = element.cloneNode(true) as HTMLElement
    if (element.dataset.yqNodeId) {
      scopedElement.dataset.yqNodeId = element.dataset.yqNodeId
    }
    scopedElement.setAttribute('data-yq-scope', scopeId)
    return scopedElement
  }
}

function createComponent(options: ComponentOptions): ComponentInstance {
  const { name, template, script, container = document.body } = options
  const parsed = parseTemplate(name, template)
  const scopeId = generateScopeId()
  const cdo: Cdo = {
    name,
    root: parsed.root,
    nodes: parsed.nodes,
    styleText: '',
    scriptFactory: script ? (() => script) : null,
    slots: parsed.slots,
    scopeId
  }
  const state: Record<string, any> = {}
  const derivedStates: Record<string, any> = {}
  const effects: (() => void)[] = []
  const context = createRenderContext(state, cdo.slots)
  const root = renderSkeleton(cdo, container)
  
  context.nodeCache = populateNodeCache(cdo, root)
  
  const debugManager = getDebugManager()
  const instance: ComponentInstance = { 
    name, 
    state, 
    derivedStates, 
    effects, 
    context, 
    cdo, 
    container, 
    root,
    lifecycleHooks: {},
    lifecycleState: 'created',
    children: [],
    parent: null,
    updateLogs: [],
    errorInfo: null,
    errorBoundary: null,
    hasError: false,
    errorCount: 0,
    lastErrorTime: null
  }
  
  debugManager.trackComponent(instance)
  
  return instance
}

function mountComponent(instance: ComponentInstance): void {
  if (instance.lifecycleState !== 'created') {
    console.warn(`[yq:lifecycle] Component ${instance.name} is already mounted`)
    return
  }
  
  try {
    fillSlots(instance.cdo, instance.context)
    
    if (instance.cdo.scriptFactory) {
      const scriptFn = instance.cdo.scriptFactory()
      if (typeof scriptFn === 'function') {
        scriptFn()
      }
    }
    
    instance.lifecycleState = 'mounted'
    
    if (instance.lifecycleHooks.onMount) {
      instance.lifecycleHooks.onMount()
    }
    
    instance.updateLogs.push({
      timestamp: Date.now(),
      type: 'effect',
      path: 'mount'
    })
    
    const debugManager = getDebugManager()
    debugManager.logEvent({
      timestamp: Date.now(),
      type: 'mount',
      componentName: instance.name,
      data: { timestamp: Date.now() }
    })
  } catch (error) {
    instance.hasError = true
    instance.errorCount++
    instance.lastErrorTime = Date.now()
    
    instance.errorInfo = {
      hasError: true,
      error: error as Error,
      timestamp: Date.now()
    }
    
    console.error(`[yq:lifecycle] Component ${instance.name} mount failed:`, error)
    
    const debugManager = getDebugManager()
    debugManager.trackError(instance, error as Error, (error as Error).stack)
    
    if (instance.errorBoundary) {
      instance.errorBoundary.componentDidCatch(error as Error, {
        componentStack: `Component: ${instance.name}`,
        hasError: true,
        timestamp: Date.now(),
        error: error as Error
      })
    }
  }
}

function updateComponent(instance: ComponentInstance): void {
  if (instance.lifecycleState === 'unmounted') {
    console.warn(`[yq:lifecycle] Component ${instance.name} is already unmounted`)
    return
  }
  
  try {
    if (instance.context.nodeCache.size === 0) {
      instance.context.nodeCache = populateNodeCache(instance.cdo, instance.root)
    }
    
    updateSlots(instance.cdo, instance.context)
    
    instance.lifecycleState = 'updated'
    
    if (instance.lifecycleHooks.onUpdate) {
      instance.lifecycleHooks.onUpdate()
    }
    
    instance.updateLogs.push({
      timestamp: Date.now(),
      type: 'effect',
      path: 'update'
    })
    
    const debugManager = getDebugManager()
    debugManager.logEvent({
      timestamp: Date.now(),
      type: 'update',
      componentName: instance.name,
      data: { timestamp: Date.now() }
    })
  } catch (error) {
    instance.hasError = true
    instance.errorCount++
    instance.lastErrorTime = Date.now()
    
    instance.errorInfo = {
      hasError: true,
      error: error as Error,
      timestamp: Date.now()
    }
    console.error(`[yq:lifecycle] Component ${instance.name} update failed:`, error)
    
    const debugManager = getDebugManager()
    debugManager.trackError(instance, error as Error, (error as Error).stack)
    
    if (instance.errorBoundary) {
      instance.errorBoundary.componentDidCatch(error as Error, {
        componentStack: `Component: ${instance.name}`,
        hasError: true,
        timestamp: Date.now(),
        error: error as Error
      })
    }
  }
}

function unmountComponent(instance: ComponentInstance): void {
  if (instance.lifecycleState === 'unmounted') {
    console.warn(`[yq:lifecycle] Component ${instance.name} is already unmounted`)
    return
  }
  
  try {
    for (const child of instance.children) {
      unmountComponent(child)
    }
    instance.children.length = 0
    
    instance.container.innerHTML = ''
    
    const styleElements = document.querySelectorAll(`style[data-yq-scope-id="${instance.cdo.scopeId}"]`)
    styleElements.forEach(element => {
      const injectionId = element.getAttribute('data-yq-style-id')
      if (injectionId) {
        const injection = styleInjections.get(injectionId)
        if (injection) {
          scoper.removeStyle(injection)
        }
      }
    })
    
    for (const effect of instance.effects) {
      effect()
    }
    instance.effects.length = 0
    
    instance.lifecycleState = 'unmounted'
    
    if (instance.lifecycleHooks.onUnmount) {
      instance.lifecycleHooks.onUnmount()
    }
    
    if (instance.parent) {
      const index = instance.parent.children.indexOf(instance)
      if (index > -1) {
        instance.parent.children.splice(index, 1)
      }
    }
    
    instance.updateLogs.push({
      timestamp: Date.now(),
      type: 'effect',
      path: 'unmount'
    })
    
    const debugManager = getDebugManager()
    debugManager.logEvent({
      timestamp: Date.now(),
      type: 'unmount',
      componentName: instance.name,
      data: { timestamp: Date.now() }
    })
    
    if (instance.errorBoundary) {
      instance.errorBoundary.destroy()
      instance.errorBoundary = null
    }
    
    instance.errorInfo = null
    instance.hasError = false
    instance.errorCount = 0
    instance.lastErrorTime = null
  } catch (error) {
    console.error(`[yq:lifecycle] Component ${instance.name} unmount failed:`, error)
    
    const debugManager = getDebugManager()
    debugManager.trackError(instance, error as Error, (error as Error).stack)
  }
}

function withErrorBoundary(componentName: string, fallback?: (error: Error, errorInfo: any) => any): (instance: ComponentInstance) => ComponentInstance {
  return (instance: ComponentInstance): ComponentInstance => {
    const errorBoundary = new ErrorBoundary({
      fallback: fallback || ((error: Error, errorInfo: any) => {
        return `<div style="padding: 20px; border: 1px solid #ff4757; border-radius: 4px; background-color: #fff5f5; color: #842029;">
          <h3>⚠️ Component Error</h3>
          <p><strong>Component:</strong> ${componentName}</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <button onclick="this.closest('.error-boundary').reset()">Retry</button>
        </div>`
      }),
      onError: (error: Error, errorInfo: any) => {
        console.error(`[ErrorBoundary] ${componentName}:`, error)
      }
    })
    
    instance.errorBoundary = errorBoundary
    return instance
  }
}

function getErrorBoundaryInfo(instance: ComponentInstance): any {
  if (!instance.errorBoundary) {
    return null
  }
  
  return {
    hasError: instance.hasError,
    errorCount: instance.errorCount,
    lastErrorTime: instance.lastErrorTime,
    errorInfo: instance.errorInfo
  }
}

function resetErrorBoundary(instance: ComponentInstance): void {
  if (instance.errorBoundary) {
    instance.errorBoundary.reset()
    instance.hasError = false
    instance.errorCount = 0
    instance.lastErrorTime = null
    instance.errorInfo = null
  }
}

const scoper: Scoper = {
  generateScopedCSS,
  injectStyle,
  removeStyle,
  updateTheme,
  getThemeVariables,
  resetTheme,
  createScopedElement,
  addGlobalStyle,
  removeGlobalStyle,
  getGlobalStyles,
  clearGlobalStyles
}

export {
  renderSkeleton,
  populateNodeCache,
  fillSlots,
  updateSlots,
  createComponent,
  mountComponent,
  updateComponent,
  unmountComponent,
  scoper,
  withErrorBoundary,
  getErrorBoundaryInfo,
  resetErrorBoundary,
  generateScopedCSS,
  injectStyle,
  removeStyle,
  updateTheme,
  getThemeVariables,
  resetTheme,
  addGlobalStyle,
  removeGlobalStyle,
  getGlobalStyles,
  clearGlobalStyles,
  createScopedElement,
  cloneStaticNode,
  fillTextSlot,
  fillAttrSlot,
  fillBoolSlot,
  createListItem,
  fillListSlot
}