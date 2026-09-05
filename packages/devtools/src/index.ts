export interface DevtoolsHandle {
  readonly attached: boolean;
}

export function attachDevtools(root: object): DevtoolsHandle {
  return { attached: false };
}
