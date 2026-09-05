import { DebugPanel, type DebugPanelOptions, type DebugInfo } from '../../core/src/debug-panel.js'
import { DebugManager, type DebugManagerOptions, type DebugEvent } from '../../core/src/debug-manager.js'
import { getDebugManager } from '../../core/src/debug-manager-simple.js'

export interface DevtoolsHandle {
  readonly attached: boolean
}

export function attachDevtools(root: object, options?: DebugManagerOptions): DevtoolsHandle {
  const mgr = DebugManager.getInstance(options)
  mgr.showPanel()
  return { attached: true }
}

export { DebugPanel }
export type { DebugPanelOptions, DebugInfo, DebugManagerOptions, DebugEvent }
export { DebugManager, getDebugManager }