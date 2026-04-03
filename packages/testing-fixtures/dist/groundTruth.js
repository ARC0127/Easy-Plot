"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroundTruth = getGroundTruth;
exports.listGroundTruthIds = listGroundTruthIds;
const index_1 = require("../../ir-schema/dist/index");
const sampleFixtures_1 = require("./sampleFixtures");
function getGroundTruth(fixtureId) {
    const found = sampleFixtures_1.FIXTURE_GROUND_TRUTH[fixtureId];
    if (!found)
        throw new index_1.FigureEditorError('ERR_OBJECT_NOT_FOUND', `Ground truth not found: ${fixtureId}`);
    return found;
}
function listGroundTruthIds() {
    return Object.keys(sampleFixtures_1.FIXTURE_GROUND_TRUTH);
}
