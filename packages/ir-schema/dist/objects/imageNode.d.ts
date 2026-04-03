import type { ObjectBase } from '../base';
import type { ImageKind } from '../enums';
import type { BBox } from '../geometry';
export interface ImageNode extends ObjectBase {
    objectType: 'image_node';
    imageKind: ImageKind;
    href: string;
    crop: BBox;
}
//# sourceMappingURL=imageNode.d.ts.map