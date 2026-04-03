import type { ObjectBase } from '../base';
import type { ShapeKind } from '../enums';

export interface ShapeNode extends ObjectBase {
  objectType: 'shape_node';
  shapeKind: ShapeKind;
  geometry: Record<string, unknown>;
  stroke: {
    color: string;
    width: number;
    dasharray: string | null;
  };
  fill: {
    color: string | null;
    opacity: number;
  };
}
