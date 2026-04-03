import type { ObjectBase } from '../base';
export interface HtmlBlock extends ObjectBase {
    objectType: 'html_block';
    tagName: 'div' | 'span' | 'p' | 'img' | 'figure' | 'figcaption' | 'section';
    layoutMode: 'absolute' | 'relative' | 'flex_item' | 'grid_item';
    textContent: string | null;
    childObjectIds: string[];
}
//# sourceMappingURL=htmlBlock.d.ts.map