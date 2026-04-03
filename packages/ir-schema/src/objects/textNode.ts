import type { ObjectBase } from '../base';
import type { TextKind } from '../enums';

export interface TextNode extends ObjectBase {
  objectType: 'text_node';
  textKind: TextKind;
  content: string;
  position: [number, number];
  font: {
    family: string;
    size: number;
    weight: string;
    style: string;
  };
  fill: string;
}
