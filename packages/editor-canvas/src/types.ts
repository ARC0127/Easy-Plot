
import { Project } from '../../ir-schema/dist/index';

export interface HitTarget {
  objectId: string;
  objectType: string;
}

export interface OverlayBox {
  objectId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
