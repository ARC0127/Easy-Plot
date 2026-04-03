import { createDefaultRendererLayout, RendererLayout } from './layout';
export * from './workbench';
export * from './shellDocument';

export interface RendererBootstrap {
  appTitle: string;
  layout: RendererLayout;
}

export function createRendererBootstrap(): RendererBootstrap {
  return {
    appTitle: 'Easy Plot',
    layout: createDefaultRendererLayout(),
  };
}
