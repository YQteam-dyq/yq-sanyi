export const version = '0.1.0'

import { DebugPanel, DebugPanelOptions } from './debug-panel.js'
import { DebugManager, DebugManagerOptions, getDebugManager } from './debug-manager-simple.js'
import { ErrorBoundary } from './error-boundary.js'

export interface ComponentDefinition {
  readonly name: string
  readonly template: string
  readonly style: string
  readonly script: unknown
}

const BOOLEAN_ATTRS = new Set(['checked', 'disabled', 'hidden', 'selected', 'readonly', 'required', 'autofocus', 'open', 'multiple', 'muted', 'itemscope', 'noshade', 'compact'])
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

export type ParsedPart = { static: string } | { path: string[] }
export interface ListSpec { itemVar: string; itemsPath: string[]; keyProp: string | null }
export interface SNode {
  id: number
  tag: string
  staticAttrs: Record<string, string>
  dynAttrs: Record<string, ParsedPart[]>
  text: ParsedPart[]
  children: SNode[]
  list: ListSpec | null
}
export type Slot =
  | { kind: 'text'; nodeId: number; partIndex: number; path?: string[] }
  | { kind: 'attr'; nodeId: number; attr: string; path?: string[] }
  | { kind: 'bool'; nodeId: number; attr: string; path?: string[] }
  | { kind: 'list'; nodeId: number; itemVar: string; itemsPath: string[]; keyProp: string | null }
export interface Cdo {
  name: string
  root: SNode
  nodes: SNode[]
  styleText: string
  scriptFactory: (() => unknown) | null
  slots: Slot[]
  scopeId: string
}

export interface State<T> {
  value: T
  dispose(): void
}

export interface Derived<T> extends State<T> {
  dependencies: State<any>[]
}

export interface Effect {
  fn: () => void
  dependencies: State<any>[]
  cleanup?: () => void
  dirty?: boolean
}

export interface RenderContext {
  state: Record<string, any>
  slots: Slot[]
  nodeCache: Map<number, Element>
  listElements: Map<string, Element[]>
}

export interface ScoperOptions {
  scopeId: string
  useShadowDOM?: boolean
  themeVariables?: Record<string, string>
}

export interface StyleInjection {
  id: string
  cssText: string
  scopeId: string
  references: number
  element: HTMLStyleElement | null
}

export interface ScoperOptions {
  scopeId: string
  useShadowDOM?: boolean
  themeVariables?: Record<string, string>
}

export interface Scoper {
  generateScopedCSS(cssText: string, scopeId: string): string
  injectStyle(cssText: string, scopeId: string): StyleInjection
  removeStyle(injection: StyleInjection): void
  updateTheme(themeVariables: Record<string, string>): void
  getThemeVariables(): Record<string, string>
  resetTheme(): void
  createScopedElement(element: HTMLElement, scopeId: string, options?: ScoperOptions): HTMLElement
  addGlobalStyle(cssText: string, id?: string): string
  removeGlobalStyle(id: string): void
  getGlobalStyles(): Record<string, string>
  clearGlobalStyles(): void
}

export interface ComponentOptions {
  name: string
  template: string
  script?: unknown
  container?: HTMLElement
}

export interface LifecycleHooks {
  onMount?: () => void
  onUpdate?: () => void
  onUnmount?: () => void
}

export type LifecycleState = 'created' | 'mounted' | 'updated' | 'unmounted'

export interface UpdateLog {
  timestamp: number
  type: 'state' | 'derived' | 'effect'
  path?: string
  oldValue?: any
  newValue?: any
}

export interface ComponentInstance {
  name: string
  state: Record<string, any>
  derivedStates: Record<string, any>
  effects: (() => void)[]
  context: RenderContext
  cdo: Cdo
  container: HTMLElement
  root: Element
  lifecycleHooks: LifecycleHooks
  lifecycleState: LifecycleState
  children: ComponentInstance[]
  parent: ComponentInstance | null
  updateLogs: UpdateLog[]
  errorInfo: { hasError: boolean; error?: Error; timestamp?: number } | null
}

const definitions = new Map<string, ComponentDefinition>()

function parsePath(path: string): string[] {
  const parts = path.split('.')
  if (parts.length === 0 || parts.some(p => p.length === 0)) {
    throw new Error(`invalid path: ${path}`)
  }
  return parts
}

function decodeEntities(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

function parseTextParts(text: string, slots: Slot[], nodeId: number): ParsedPart[] {
  const parts: ParsedPart[] = []
  const segments = text.split('{{')
  if (segments.length === 1) {
    const trimmed = segments[0].trim()
    if (trimmed.length > 0) {
      parts.push({ static: decodeEntities(trimmed) })
    }
    return parts
  }
  parts.push({ static: decodeEntities(segments[0]) })
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i]
    const closing = segment.indexOf('}}')
    if (closing === -1) {
      throw new Error('unclosed {{ expression')
    }
    const path = segment.substring(0, closing).trim()
    if (path.length === 0) {
      throw new Error('empty expression in {{ }}')
    }
    const pathSegments = parsePath(path)
    slots.push({ kind: 'text', nodeId, partIndex: parts.length })
    parts.push({ path: pathSegments })
    const rest = segment.substring(closing + 2)
    if (rest.length > 0) {
      parts.push({ static: decodeEntities(rest) })
    }
  }
  return parts
}

function parseAttributeValue(value: string, attr: string, slots: Slot[], nodeId: number): ParsedPart[] {
  if (value.includes('{{') && value.includes('}}')) {
    const trimmed = value.trim()
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      const inner = trimmed.substring(2, trimmed.length - 2).trim()
      if (inner.includes('{{') || inner.includes('}}')) {
        throw new Error(`attribute binding only supports whole value form: ${attr}="${value}"`)
      }
      const pathSegments = parsePath(inner)
      if (BOOLEAN_ATTRS.has(attr)) {
        slots.push({ kind: 'bool', nodeId, attr })
      } else {
        slots.push({ kind: 'attr', nodeId, attr })
      }
      return [{ path: pathSegments }]
    } else {
      throw new Error(`attribute binding only supports whole value form: ${attr}="${value}"`)
    }
  }
  return [{ static: decodeEntities(value) }]
}

function parseListSpec(value: string, keyAttr: string | null): ListSpec {
  let itemVar = 'item'
  let itemsPath: string[] = []
  if (value.includes(' in ')) {
    const parts = value.split(' in ')
    if (parts.length !== 2) {
      throw new Error(`invalid yq-for format: ${value}`)
    }
    itemVar = parts[0].trim()
    itemsPath = parsePath(parts[1].trim())
  } else {
    itemsPath = parsePath(value.trim())
  }
  return { itemVar, itemsPath, keyProp: keyAttr }
}

function parseTemplate(name: string, template: string): { root: SNode; nodes: SNode[]; slots: Slot[] } {
  const slots: Slot[] = []
  const nodes: SNode[] = []
  let inList = false
  let nodeId = 0

  function error(message: string): never {
    throw new Error(`[yq:parse] ${name}: ${message}`)
  }

  function parseNode(html: string): { node: SNode; remaining: string } {
    const node: SNode = {
      id: nodeId++,
      tag: '',
      staticAttrs: {},
      dynAttrs: {},
      text: [],
      children: [],
      list: null
    }
    nodes.push(node)

    let i = 0
    if (html.startsWith('<!--')) {
      const commentEnd = html.indexOf('-->')
      if (commentEnd === -1) error('unclosed comment')
      return { node, remaining: html.substring(commentEnd + 3) }
    }
    if (html.startsWith('<!DOCTYPE')) {
      const doctypeEnd = html.indexOf('>')
      if (doctypeEnd === -1) error('unclosed DOCTYPE')
      return { node, remaining: html.substring(doctypeEnd + 1) }
    }
    if (html[i] !== '<') error('expected < at start of tag')
    i++
    const tagNameStart = i
    while (i < html.length && !/[ \t\n\r>\/]/.test(html[i])) i++
    node.tag = html.substring(tagNameStart, i)
    if (node.tag.length === 0) error('empty tag name')

    let inSelfClosing = false
    let currentAttr = ''
    let currentAttrValue: string[] = []
    let inQuote = null

    while (i < html.length) {
      const char = html[i]
      if (inQuote) {
        if (char === inQuote) {
          inQuote = null
          const value = currentAttrValue.join('')
          if (currentAttr === 'yq-for') {
            if (inList) error('nested yq-for not allowed')
            inList = true
            node.list = parseListSpec(value, node.staticAttrs['yq-key'] || null)
            delete node.staticAttrs['yq-key']
          } else if (currentAttr === 'yq-key') {
            if (!node.list) error('yq-key without yq-for')
            node.list.keyProp = value
          } else {
            const dynValue = parseAttributeValue(value, currentAttr, slots, node.id)
            if (dynValue.length === 1 && 'static' in dynValue[0] && dynValue[0].static === value) {
              node.staticAttrs[currentAttr] = value
            } else {
              node.dynAttrs[currentAttr] = dynValue
            }
          }
          currentAttr = ''
          currentAttrValue = []
        } else {
          currentAttrValue.push(char)
        }
        i++
      } else if (char === '=') {
        if (currentAttr.length > 0) {
          i++
          while (i < html.length && /[ \t\n\r]/.test(html[i])) i++
          if (i < html.length && (html[i] === '"' || html[i] === "'")) {
            inQuote = html[i]
            currentAttrValue = []
            i++
          }
        } else {
          i++
        }
      } else if (char === '"' || char === "'") {
        inQuote = char
        currentAttrValue = []
        i++
      } else if (char === '>') {
        i++
        break
      } else if (char === '/') {
        inSelfClosing = true
        i++
        if (i < html.length && html[i] === '>') {
          i++
          break
        }
      } else if (/[ \t\n\r]/.test(char)) {
        if (currentAttr.length > 0) {
          const value = currentAttrValue.join('')
          if (currentAttr === 'yq-for') {
            if (inList) error('nested yq-for not allowed')
            inList = true
            node.list = parseListSpec(value, node.staticAttrs['yq-key'] || null)
            delete node.staticAttrs['yq-key']
          } else if (currentAttr === 'yq-key') {
            if (!node.list) error('yq-key without yq-for')
            node.list.keyProp = value
          } else {
            const dynValue = parseAttributeValue(value, currentAttr, slots, node.id)
            if (dynValue.length === 1 && 'static' in dynValue[0] && dynValue[0].static === value) {
              node.staticAttrs[currentAttr] = value
            } else {
              node.dynAttrs[currentAttr] = dynValue
            }
          }
          currentAttr = ''
          currentAttrValue = []
        }
        i++
      } else {
        if (currentAttr.length === 0) {
          currentAttr = char
        } else {
          currentAttr += char
        }
        i++
      }
    }

    if (inQuote) error('unclosed attribute quote')
    if (currentAttr.length > 0) {
      const value = currentAttrValue.join('')
      if (currentAttr === 'yq-for') {
        if (inList) error('nested yq-for not allowed')
        inList = true
        node.list = parseListSpec(value, node.staticAttrs['yq-key'] || null)
        delete node.staticAttrs['yq-key']
      } else if (currentAttr === 'yq-key') {
        if (!node.list) error('yq-key without yq-for')
        node.list.keyProp = value
      } else {
        const dynValue = parseAttributeValue(value, currentAttr, slots, node.id)
        if (dynValue.length === 1 && 'static' in dynValue[0] && dynValue[0].static === value) {
          node.staticAttrs[currentAttr] = value
        } else {
          node.dynAttrs[currentAttr] = dynValue
        }
      }
    }

    if (VOID_TAGS.has(node.tag) || inSelfClosing) {
      return { node, remaining: html.substring(i) }
    }

    const contentEnd = html.indexOf('</' + node.tag + '>')
    if (contentEnd === -1) error(`unclosed tag: ${node.tag}`)
    const content = html.substring(i, contentEnd)
    const afterClose = contentEnd + node.tag.length + 3

    let childContent = content
    while (childContent.length > 0) {
      const trimmed = childContent.trim()
      if (trimmed.length === 0) break
      
      if (childContent[0] !== '<') {
        const tagStart = childContent.indexOf('<')
        const textPart = tagStart === -1 ? childContent : childContent.substring(0, tagStart)
        const textParts = parseTextParts(textPart, slots, node.id)
        if (node.text.length === 0) {
          node.text = textParts
        } else {
          node.text.push(...textParts)
        }
        childContent = tagStart === -1 ? '' : childContent.substring(tagStart)
      } else {
        const childResult = parseNode(childContent)
        node.children.push(childResult.node)
        childContent = childResult.remaining
      }
    }

    return { node, remaining: html.substring(afterClose) }
  }

  const trimmed = template.trim()
  if (trimmed.length === 0) error('empty template')

  let remaining = trimmed
  let rootResult: { node: SNode; remaining: string } | null = null

  while (remaining.length > 0) {
    if (remaining[0] !== '<') {
      const textNode: SNode = {
        id: nodeId++,
        tag: '',
        staticAttrs: {},
        dynAttrs: {},
        text: parseTextParts(remaining, slots, nodeId - 1),
        children: [],
        list: null
      }
      nodes.push(textNode)
      rootResult = { node: textNode, remaining: '' }
      break
    }
    const result = parseNode(remaining)
    if (!rootResult) rootResult = result
    remaining = result.remaining
    if (remaining.trim().length === 0) break
  }

  if (!rootResult) error('no root element found')
  if (rootResult.remaining.length > 0) error('extra content after root element')

  const root = rootResult.node

  return { root, nodes, slots }
}

function createScriptFactory(script: unknown): (() => unknown) | null {
  if (typeof script === 'function') {
    return () => script
  }
  if (typeof script === 'string') {
    try {
      const fn = new Function('return ' + script)
      return () => fn()
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw e
      }
      throw new Error('invalid script string: ' + (e as Error).message)
    }
  }
  return null
}

function createRenderContext(state: Record<string, any>, slots: Slot[]): RenderContext {
  return {
    state,
    slots,
    nodeCache: new Map(),
    listElements: new Map()
  }
}

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

function resolvePath(state: Record<string, any>, path?: string[]): any {
  if (!path || path.length === 0) return undefined
  let current = state
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment]
    } else {
      return undefined
    }
  }
  return current
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
  
  (node as HTMLElement).textContent = currentText
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
  
  traverse(context.nodeCache.get(cdo.root.id) || cdo.root.tag === document.body.tagName ? document.body : context.nodeCache.get(0)!)
  
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
        (node as HTMLElement).textContent = currentText
      }
    } else if (slot.kind === 'attr') {
      const value = slot.path ? resolvePath(context.state, slot.path) : undefined
      if (value != null) {
        node.setAttribute(slot.attr, String(value))
      } else {
        node.removeAttribute(slot.attr)
      }
    } else if (slot.kind === 'bool') {
      const value = slot.path ? resolvePath(context.state, slot.path) : undefined
      if (value) {
        node.setAttribute(slot.attr, '')
      } else {
        node.removeAttribute(slot.attr)
      }
    } else if (slot.kind === 'list') {
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
      
      if (node.children.length !== items.length) {
        node.innerHTML = ''
        node.appendChild(fragment)
      }
    }
  }
}

let effectStack: Effect[] = []
let batchDepth = 0
let batchQueue: Array<() => void> = []
let isFlushing = false

function flushBatchQueue(): void {
  if (isFlushing) return
  isFlushing = true
  
  try {
    while (batchQueue.length > 0) {
      const job = batchQueue.shift()
      job?.()
    }
  } finally {
    isFlushing = false
    batchDepth = 0
  }
}

function scheduleFlush(): void {
  if (!isFlushing && batchQueue.length > 0) {
    Promise.resolve().then(flushBatchQueue)
  }
}

function trackState<T>(state: State<T>): void {
  if (effectStack.length > 0) {
    const currentEffect = effectStack[effectStack.length - 1]
    if (!currentEffect.dependencies.includes(state)) {
      currentEffect.dependencies.push(state)
    }
  }
}

function triggerState(state: State<any>): void {
  if (batchDepth > 0) {
    batchQueue.push(() => {
      const dependents = new Set<Effect>()
      
      function collectDependents(effect: Effect): void {
        for (const dep of effect.dependencies) {
          if (dep === state) {
            dependents.add(effect)
          }
        }
      }
      
      for (const effect of effectStack) {
        collectDependents(effect)
      }
      
      for (const effect of dependents) {
        if (effect.dirty !== true) {
          effect.dirty = true
          effectStack.push(effect)
          try {
            effect.fn()
          } finally {
            effectStack.pop()
            effect.dirty = false
          }
        }
      }
    })
  } else {
    const dependents = new Set<Effect>()
    
    function collectDependents(effect: Effect): void {
      for (const dep of effect.dependencies) {
        if (dep === state) {
          dependents.add(effect)
        }
      }
    }
    
    for (const effect of effectStack) {
      collectDependents(effect)
    }
    
    for (const effect of dependents) {
      if (effect.dirty !== true) {
        effect.dirty = true
        effectStack.push(effect)
        try {
          effect.fn()
        } finally {
          effectStack.pop()
          effect.dirty = false
        }
      }
    }
  }
  
  if (batchDepth === 0) {
    scheduleFlush()
  }
}

function state<T>(initialValue: T, componentName?: string): State<T> {
  let value = initialValue
  const dependents: Effect[] = []
  
  const stateObj: State<T> = {
    get value(): T {
      trackState(stateObj)
      return value
    },
    set value(newValue: T) {
      if (value !== newValue) {
        value = newValue
        triggerState(stateObj)
        
        if (componentName) {
          const debugManager = getDebugManager()
          debugManager.logEvent({
            timestamp: Date.now(),
            type: 'effect',
            componentName,
            data: { 
              property: 'state', 
              oldValue: value, 
              newValue: newValue,
              timestamp: Date.now()
            }
          })
        }
      }
    },
    dispose(): void {
      dependents.length = 0
    }
  }
  
  return stateObj
}

function derived<T>(computeFn: () => T): Derived<T> {
  let cachedValue: T | undefined
  let dirty = true
  const dependencies: State<any>[] = []
  
  const derivedObj: Derived<T> = {
    get value(): T {
      if (dirty) {
        effectStack.push({ fn: () => {}, dependencies: [] })
        try {
          cachedValue = computeFn()
          dirty = false
        } finally {
          const currentEffect = effectStack.pop()
          if (currentEffect) {
            dependencies.length = 0
            dependencies.push(...currentEffect.dependencies)
          }
        }
      }
      
      trackState(derivedObj)
      return cachedValue!
    },
    dispose(): void {
      dependencies.length = 0
    },
    dependencies
  }
  
  return derivedObj
}

function effect(fn: () => void | (() => void), componentName?: string): () => void {
  const dependencies: State<any>[] = []
  let cleanup: (() => void) | null = null
  
  function wrappedFn(): void {
    effectStack.push({ fn: wrappedFn, dependencies, dirty: false })
    try {
      const result = fn()
      if (typeof result === 'function') {
        cleanup = result
      }
    } finally {
      effectStack.pop()
    }
  }
  
  wrappedFn()
  
  if (componentName) {
    const debugManager = getDebugManager()
    debugManager.trackEffect(componentName)
  }
  
  return () => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  }
}

function dumpReactiveState(): { states: any[]; effects: any[] } {
  const states: any[] = []
  const effects: any[] = []
  
  function collectStates(): void {
    for (const effect of effectStack) {
      for (const state of effect.dependencies) {
        if (!states.includes(state)) {
          states.push(state)
        }
      }
    }
  }
  
  collectStates()
  
  return { states, effects }
}

function define(name: string, definition: ComponentDefinition): ComponentDefinition {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('component name must be a non-empty string')
  }
  if (typeof definition !== 'object' || definition === null) {
    throw new TypeError('component definition must be an object')
  }
  if (!definition.template || typeof definition.template !== 'string') {
    throw new TypeError('component definition must include template string')
  }
  if (typeof definition.style !== 'string') {
    throw new TypeError('component definition must include style string')
  }
  if (typeof definition.script !== 'function' && typeof definition.script !== 'string' && definition.script !== null) {
    throw new TypeError('script must be function, string, or null')
  }
  if (definitions.has(name)) {
    throw new Error('duplicate component definition: ' + name)
  }
  definitions.set(name, definition)
  return definition
}

interface CachedComponentDefinition extends ComponentDefinition {
  cdo?: Cdo
}

function lookup(name: string): { name: string; cdo: Cdo } | undefined {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('component name must be a non-empty string')
  }
  const definition = definitions.get(name) as CachedComponentDefinition | undefined
  if (!definition) return undefined
  
  if (!definition.cdo) {
    const { root, nodes, slots } = parseTemplate(name, definition.template)
    definition.cdo = {
      name,
      root,
      nodes,
      styleText: definition.style,
      scriptFactory: createScriptFactory(definition.script),
      slots,
      scopeId: generateScopeId()
    }
  }
  
  return { name, cdo: definition.cdo! }
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

const styleInjections = new Map<string, StyleInjection>()
const themeVariables = new Map<string, string>()
const globalStyles = new Map<string, string>()

function generateScopeId(): string {
  return `yq-scope-${Math.random().toString(36).substr(2, 9)}`
}

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
    .replace(/([{}])/g, (match) => {
      return match
    })
  
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

function setLifecycleHooks(instance: ComponentInstance, hooks: LifecycleHooks): void {
  instance.lifecycleHooks = { ...instance.lifecycleHooks, ...hooks }
}

function addChildComponent(parent: ComponentInstance, child: ComponentInstance): void {
  child.parent = parent
  if (!parent.children.includes(child)) {
    parent.children.push(child)
  }
}

function getComponentTree(instance: ComponentInstance): any {
  return {
    name: instance.name,
    lifecycleState: instance.lifecycleState,
    children: instance.children.map(child => getComponentTree(child)),
    hasError: instance.errorInfo?.hasError || false
  }
}

function getUpdateLogs(instance: ComponentInstance): UpdateLog[] {
  return instance.updateLogs.slice()
}

function getStateSnapshot(instance: ComponentInstance): Record<string, any> {
  return {
    state: { ...instance.state },
    derivedStates: { ...instance.derivedStates },
    lifecycleState: instance.lifecycleState
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

export { 
  define, 
  lookup, 
  parseTemplate, 
  createScriptFactory, 
  createRenderContext, 
  renderSkeleton, 
  fillSlots, 
  updateSlots, 
  state, 
  derived, 
  effect, 
  dumpReactiveState, 
  createComponent, 
  mountComponent, 
  updateComponent, 
  unmountComponent, 
  setLifecycleHooks,
  addChildComponent,
  getComponentTree,
  getUpdateLogs,
  getStateSnapshot,
  scoper,
  DebugPanel,
  type DebugPanelOptions,
  DebugManager,
  type DebugManagerOptions,
  ErrorBoundary,
  withErrorBoundary,
  getErrorBoundaryInfo,
  resetErrorBoundary 
}