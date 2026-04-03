"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFixtureRegistry = loadFixtureRegistry;
exports.getFixturesByFamily = getFixturesByFamily;
exports.getFixtureRecord = getFixtureRecord;
const index_1 = require("../../ir-schema/dist/index");
const sampleFixtures_1 = require("./sampleFixtures");
function loadFixtureRegistry() {
    return [...sampleFixtures_1.FIXTURE_REGISTRY];
}
function getFixturesByFamily(family) {
    return sampleFixtures_1.FIXTURE_REGISTRY.filter(f => f.family === family);
}
function getFixtureRecord(fixtureId) {
    const found = sampleFixtures_1.FIXTURE_REGISTRY.find(f => f.fixtureId === fixtureId);
    if (!found)
        throw new index_1.FigureEditorError('ERR_OBJECT_NOT_FOUND', `Fixture not found: ${fixtureId}`);
    return found;
}
