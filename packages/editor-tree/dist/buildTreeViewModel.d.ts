import { Project } from '../../ir-schema/dist/index';
export interface TreeNodeViewModel {
    id: string;
    label: string;
    objectType: string;
    visible: boolean;
    locked: boolean;
    capabilities: string[];
    children: TreeNodeViewModel[];
}
export declare function buildTreeViewModel(project: Project): TreeNodeViewModel[];
//# sourceMappingURL=buildTreeViewModel.d.ts.map