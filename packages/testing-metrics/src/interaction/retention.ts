import { Project } from '../../../ir-schema/dist/index';
import { InteractionRetentionReport } from '../reports/types';

function highValueCapabilities(obj: Project['project']['objects'][string]): string[] {
  const actionable = ['text_edit', 'drag', 'delete', 'resize'];

  if (obj.objectType === 'panel' || obj.objectType === 'legend' || obj.objectType === 'annotation_block') {
    return obj.capabilities.filter((cap) => actionable.includes(cap));
  }

  if (obj.objectType === 'text_node') {
    return obj.capabilities.filter((cap) => ['text_edit', 'drag', 'delete'].includes(cap));
  }

  if (obj.objectType === 'html_block') {
    const hasText = Boolean(obj.textContent && obj.textContent.trim().length > 0);
    return obj.capabilities.filter((cap) => (hasText ? ['text_edit', 'drag', 'delete'] : ['drag', 'delete']).includes(cap));
  }

  if (obj.objectType === 'image_node') {
    return obj.capabilities.filter((cap) => ['drag', 'delete', 'resize'].includes(cap));
  }

  return [];
}

function findBestMatch(beforeObj: Project['project']['objects'][string], after: Project): Project['project']['objects'][string] | undefined {
  const objects = Object.values(after.project.objects);
  const exact =
    objects.find((candidate) => candidate.id === beforeObj.id) ??
    objects.find((candidate) => candidate.provenance.originSelectorOrPath === `#${beforeObj.id}`) ??
    objects.find((candidate) => candidate.provenance.originNodeIds.includes(beforeObj.id)) ??
    objects.find((candidate) => candidate.name === beforeObj.name);
  if (exact) return exact;

  const sameType = objects.filter((candidate) => candidate.objectType === beforeObj.objectType);
  if (sameType.length === 0) return undefined;

  const beforeCenter = {
    x: beforeObj.bbox.x + beforeObj.bbox.w / 2,
    y: beforeObj.bbox.y + beforeObj.bbox.h / 2,
  };

  const textAware = sameType.filter((candidate) => {
    if (beforeObj.objectType === 'text_node' && candidate.objectType === 'text_node') {
      return candidate.content === beforeObj.content;
    }
    if (beforeObj.objectType === 'html_block' && candidate.objectType === 'html_block') {
      return (candidate.textContent ?? '').trim() === (beforeObj.textContent ?? '').trim();
    }
    return true;
  });
  const pool = textAware.length > 0 ? textAware : sameType;

  return pool
    .slice()
    .sort((a, b) => {
      const aCenter = { x: a.bbox.x + a.bbox.w / 2, y: a.bbox.y + a.bbox.h / 2 };
      const bCenter = { x: b.bbox.x + b.bbox.w / 2, y: b.bbox.y + b.bbox.h / 2 };
      const da = Math.hypot(aCenter.x - beforeCenter.x, aCenter.y - beforeCenter.y);
      const db = Math.hypot(bCenter.x - beforeCenter.x, bCenter.y - beforeCenter.y);
      return da - db;
    })[0];
}

export function computeInteractionRetention(before: Project, afterReimport: Project): InteractionRetentionReport {
  const failures: InteractionRetentionReport['failures'] = [];
  let originalCount = 0;
  let retainedCount = 0;

  for (const obj of Object.values(before.project.objects)) {
    const expected = highValueCapabilities(obj);
    if (expected.length === 0) continue;
    originalCount += 1;
    const match = findBestMatch(obj, afterReimport);
    const actual = match ? highValueCapabilities(match) : [];
    const ok = expected.every(cap => actual.includes(cap) || (cap === 'text_edit' && match?.objectType === 'text_node'));
    if (ok) retainedCount += 1;
    else failures.push({ objectId: obj.id, expected, actual });
  }

  const retentionRate = originalCount === 0 ? 1 : retainedCount / originalCount;
  return { pass: retentionRate >= 0.75, retainedCount, originalCount, retentionRate, failures };
}
