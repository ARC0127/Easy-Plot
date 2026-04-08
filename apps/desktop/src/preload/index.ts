export type DesktopBridgeCommand =
  | 'window.launch'
  | 'window.close'
  | 'state.snapshot'
  | 'file.import'
  | 'file.save_project'
  | 'file.load_project'
  | 'file.export_svg'
  | 'file.export_html'
  | 'edit.select_first_text'
  | 'edit.move_selected'
  | 'edit.edit_text'
  | 'bundle.build_release';

export type DesktopBridgeHandler = (command: DesktopBridgeCommand, payload?: Record<string, unknown>) => unknown;

export interface DesktopBridge {
  readonly version: string;
  ping(): string;
  setCommandHandler(handler: DesktopBridgeHandler): void;
  invoke<T = unknown>(command: DesktopBridgeCommand, payload?: Record<string, unknown>): T;
}

export function createDesktopBridge(version = '0.0.2', initialHandler?: DesktopBridgeHandler): DesktopBridge {
  let handler = initialHandler;
  return {
    version,
    ping: () => 'easy-plot-desktop-ready',
    setCommandHandler: (nextHandler) => {
      handler = nextHandler;
    },
    invoke: <T = unknown>(command: DesktopBridgeCommand, payload?: Record<string, unknown>) => {
      if (!handler) {
        throw new Error(`Desktop bridge command handler is not set for command: ${command}`);
      }
      return handler(command, payload) as T;
    },
  };
}
