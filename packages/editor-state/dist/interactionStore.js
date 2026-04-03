"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setInteractionMode = setInteractionMode;
function setInteractionMode(state, interaction) {
    return { ...state, interaction: { ...state.interaction, ...interaction } };
}
