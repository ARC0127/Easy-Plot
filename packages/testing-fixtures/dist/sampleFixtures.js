"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIXTURE_GROUND_TRUTH = exports.FIXTURE_REGISTRY = void 0;
const FAMILY_CONFIGS = [
    { family: 'matplotlib', prefix: 'mpl', count: 10, kind: 'svg', notes: 'generated_matplotlib_fixture' },
    { family: 'chart_family', prefix: 'chart', count: 8, kind: 'svg', notes: 'generated_chart_fixture' },
    { family: 'illustration_like', prefix: 'illus', count: 8, kind: 'svg', notes: 'generated_illustration_fixture' },
    { family: 'llm_svg', prefix: 'llm', count: 10, kind: 'svg', notes: 'generated_llm_fixture' },
    { family: 'static_html_inline_svg', prefix: 'html', count: 8, kind: 'html', notes: 'generated_static_html_fixture' },
    { family: 'degraded_svg', prefix: 'deg', count: 8, kind: 'svg', notes: 'generated_degraded_fixture' },
];
const GROUND_TRUTH_TEMPLATES = {
    matplotlib: {
        hasLegend: true,
        panelIds: ['axes_1', 'axes_2'],
        editableRawTextIds: ['text_title', 'text_legend'],
        atomicRasterIds: [],
        expectedCapabilities: {
            axes_1: ['select', 'drag', 'resize', 'delete', 'reparent'],
            axes_2: ['select', 'drag', 'resize', 'delete', 'reparent'],
            text_title: ['text_edit'],
        },
    },
    chart_family: {
        hasLegend: true,
        panelIds: ['chart_root'],
        editableRawTextIds: ['chart_title'],
        atomicRasterIds: [],
        expectedCapabilities: {
            chart_root: ['select', 'drag', 'resize', 'delete', 'reparent'],
            chart_title: ['text_edit'],
        },
    },
    illustration_like: {
        hasLegend: false,
        panelIds: ['artboard_1'],
        editableRawTextIds: ['label_1'],
        atomicRasterIds: [],
        expectedCapabilities: {
            artboard_1: ['select', 'drag', 'resize', 'delete', 'reparent'],
            label_1: ['text_edit'],
        },
    },
    llm_svg: {
        hasLegend: true,
        panelIds: ['panel_a', 'panel_b'],
        editableRawTextIds: ['llm_title'],
        atomicRasterIds: ['embedded_plot_1'],
        expectedCapabilities: {
            embedded_plot_1: ['crop_only', 'replace_image'],
            llm_title: ['text_edit'],
        },
    },
    static_html_inline_svg: {
        hasLegend: true,
        panelIds: ['panel_left', 'panel_right'],
        editableRawTextIds: ['caption_1'],
        atomicRasterIds: [],
        expectedCapabilities: {
            caption_1: ['text_edit'],
            panel_left: ['select', 'drag', 'resize', 'delete', 'reparent'],
        },
    },
    degraded_svg: {
        hasLegend: false,
        panelIds: ['panel_degraded'],
        editableRawTextIds: [],
        atomicRasterIds: ['raster_panel_1', 'raster_label_1'],
        expectedCapabilities: {
            raster_panel_1: ['crop_only', 'replace_image'],
            raster_label_1: ['group_only'],
        },
    },
};
function makeFixtureId(prefix, index) {
    return `${prefix}_${String(index).padStart(3, '0')}`;
}
exports.FIXTURE_REGISTRY = FAMILY_CONFIGS.flatMap((config) => {
    const ext = config.kind === 'html' ? 'html' : 'svg';
    return Array.from({ length: config.count }, (_, offset) => {
        const fixtureId = makeFixtureId(config.prefix, offset + 1);
        return {
            fixtureId,
            family: config.family,
            kind: config.kind,
            path: `fixtures/${config.family}/${fixtureId}.${ext}`,
            groundTruthPath: `fixtures/${config.family}/${fixtureId}.ground_truth.json`,
            notes: config.notes,
        };
    });
});
exports.FIXTURE_GROUND_TRUTH = Object.fromEntries(exports.FIXTURE_REGISTRY.map((record) => {
    const family = record.family;
    const template = GROUND_TRUTH_TEMPLATES[family];
    if (!template) {
        throw new Error(`No ground truth template for family: ${record.family}`);
    }
    const groundTruth = {
        fixtureId: record.fixtureId,
        family,
        hasLegend: template.hasLegend,
        panelIds: [...template.panelIds],
        editableRawTextIds: [...template.editableRawTextIds],
        atomicRasterIds: [...template.atomicRasterIds],
        expectedCapabilities: Object.fromEntries(Object.entries(template.expectedCapabilities).map(([objectId, capabilities]) => [objectId, [...capabilities]])),
    };
    return [record.fixtureId, groundTruth];
}));
