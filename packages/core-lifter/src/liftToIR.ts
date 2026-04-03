import { OriginalSourceRef } from '../../ir-schema/dist/index';
import { AdapterHints } from '../../importer-adapters/dist/index';
import { NormalizedDocument } from '../../core-normalizer/dist/index';
import { buildProject } from './buildProject';
import { LiftResult } from './types';

export function liftToIR(normalized: NormalizedDocument, hints: AdapterHints, source: OriginalSourceRef): LiftResult {
  return buildProject(normalized, hints, source);
}
