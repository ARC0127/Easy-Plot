"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopBridge = createDesktopBridge;
function createDesktopBridge(version = '0.01', initialHandler) {
    let handler = initialHandler;
    return {
        version,
        ping: () => 'easy-plot-desktop-ready',
        setCommandHandler: (nextHandler) => {
            handler = nextHandler;
        },
        invoke: (command, payload) => {
            if (!handler) {
                throw new Error(`Desktop bridge command handler is not set for command: ${command}`);
            }
            return handler(command, payload);
        },
    };
}
