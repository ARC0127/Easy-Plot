"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeStabilityProfile = makeStabilityProfile;
function makeStabilityProfile(kind, eq = 'EQ-L2') {
    const reimportExpectation = kind === 'semantic' ? 'semantic' : kind === 'group_only' ? 'group_only' : 'atomic';
    return {
        exportStabilityClass: kind === 'atomic' ? 'fragile' : 'stable',
        requiresSnapshotRendering: false,
        reimportExpectation,
        equivalenceTarget: eq,
    };
}
