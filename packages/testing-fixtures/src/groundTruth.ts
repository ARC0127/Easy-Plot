import { FigureEditorError } from '../../ir-schema/dist/index';
import { FIXTURE_GROUND_TRUTH } from './sampleFixtures';
import { FixtureGroundTruth } from './types';

export function getGroundTruth(fixtureId: string): FixtureGroundTruth {
  const found = FIXTURE_GROUND_TRUTH[fixtureId];
  if (!found) throw new FigureEditorError('ERR_OBJECT_NOT_FOUND', `Ground truth not found: ${fixtureId}`);
  return found;
}

export function listGroundTruthIds(): string[] {
  return Object.keys(FIXTURE_GROUND_TRUTH);
}
