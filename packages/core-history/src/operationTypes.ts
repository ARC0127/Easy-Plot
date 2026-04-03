
export type MoveObjectOperation = {
  type: 'MOVE_OBJECT';
  payload: { objectId: string; delta: { x: number; y: number } };
};

export type ResizeObjectOperation = {
  type: 'RESIZE_OBJECT';
  payload: { objectId: string; bbox: { x: number; y: number; w: number; h: number } };
};

export type DeleteObjectOperation = {
  type: 'DELETE_OBJECT';
  payload: { objectId: string };
};

export type EditTextContentOperation = {
  type: 'EDIT_TEXT_CONTENT';
  payload: { objectId: string; content: string };
};

export type SetAnchorOperation = {
  type: 'SET_ANCHOR';
  payload: { objectId: string; anchor: Record<string, unknown>; offset: [number, number] };
};

export type PromoteSelectionOperation = {
  type: 'PROMOTE_SELECTION';
  payload: { objectIds: string[]; role: 'panel' | 'legend' | 'annotation_block' | 'group_node'; reason: string };
};

export type OverrideRoleOperation = {
  type: 'OVERRIDE_ROLE';
  payload: { objectId: string; role: 'panel' | 'legend' | 'annotation_block' | 'group_node'; reason: string };
};

export type GroupObjectsOperation = {
  type: 'GROUP_OBJECTS';
  payload: { objectIds: string[] };
};

export type UngroupObjectOperation = {
  type: 'UNGROUP_OBJECT';
  payload: { groupId: string };
};

export type Operation =
  | MoveObjectOperation
  | ResizeObjectOperation
  | DeleteObjectOperation
  | EditTextContentOperation
  | SetAnchorOperation
  | PromoteSelectionOperation
  | OverrideRoleOperation
  | GroupObjectsOperation
  | UngroupObjectOperation;
