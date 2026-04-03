import { FamilyClass, FigureEditorError } from '../../ir-schema/dist/index';
import { FIXTURE_REGISTRY } from './sampleFixtures';
import { FixtureRecord } from './types';

export function loadFixtureRegistry(): FixtureRecord[] {
  return [...FIXTURE_REGISTRY];
}

export function getFixturesByFamily(family: FamilyClass): FixtureRecord[] {
  return FIXTURE_REGISTRY.filter(f => f.family === family);
}

export function getFixtureRecord(fixtureId: string): FixtureRecord {
  const found = FIXTURE_REGISTRY.find(f => f.fixtureId === fixtureId);
  if (!found) throw new FigureEditorError('ERR_OBJECT_NOT_FOUND', `Fixture not found: ${fixtureId}`);
  return found;
}
