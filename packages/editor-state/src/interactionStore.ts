
import { EditorSessionState, InteractionState } from './types';

export function setInteractionMode(state: EditorSessionState, interaction: Partial<InteractionState>): EditorSessionState {
  return { ...state, interaction: { ...state.interaction, ...interaction } };
}
