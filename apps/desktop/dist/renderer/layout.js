"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultRendererLayout = createDefaultRendererLayout;
function createDefaultRendererLayout() {
    return {
        left: [{ key: 'object_tree', label: 'Object Tree', minWidth: 240, minHeight: 400 }],
        center: [{ key: 'canvas', label: 'Canvas', minWidth: 640, minHeight: 480 }],
        right: [{ key: 'properties', label: 'Properties', minWidth: 300, minHeight: 400 }],
        bottom: [{ key: 'import_report', label: 'Import Report', minWidth: 640, minHeight: 180 }],
    };
}
