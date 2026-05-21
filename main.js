import { state, onPlayModeUpdate } from './editor.js';
import { draw } from './renderer.js';
import { setupInputHandlers } from './input.js';
import { history } from './history.js';
import { importLevel } from './io.js';

let canvas = document.getElementById('editor');
let ctx = canvas.getContext('2d');
let container = document.getElementById('canvasContainer');
let lastTime = Date.now();

// Resize canvas to fit container.
// preserveCenter=false is used for standard browser resize events.
// preserveCenter=true is used when playmode UI changes visibility.
function resizeCanvas(preserveCenter = false) {
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    // If preserving center, adjust camera position to keep view centered on same world point
    if (preserveCenter && oldWidth && oldHeight) {
        const widthDelta = newWidth - oldWidth;
        const heightDelta = newHeight - oldHeight;
        if (widthDelta || heightDelta) {
            state.camera.x += widthDelta / (2 * state.camera.zoom);
            state.camera.y += heightDelta / (2 * state.camera.zoom);
        }
    }

    // Resize canvas to new dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;
}

// Normal browser resize should only resize the canvas.
window.addEventListener('resize', () => resizeCanvas(false));
window.addEventListener('editorResize', () => resizeCanvas(true));

// Setup input handlers
setupInputHandlers(canvas, state);

// on content loaded
document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();

    // Check for level data in URL
    const params = new URLSearchParams(window.location.search);
    const compressedLevel = params.get('x');
    if (compressedLevel && window.pako && window.base64js) {
        try {
            const compressed = window.base64js.toByteArray(compressedLevel);
            const decompressed = window.pako.inflate(compressed);
            const jsonString = new TextDecoder().decode(decompressed);
            importLevel(state, jsonString);

            // Clean up URL so refresh doesn't trigger it again
            const url = new URL(window.location.href);
            url.searchParams.delete('x');
            window.history.replaceState({}, document.title, url.toString());
        } catch (e) {
            console.error("Failed to decompress and load level from URL:", e);
        }
    }

    history.init(state);
    // Initial render
    draw(ctx, state);   
    canvas.oncontextmenu = function (e) { 
        console.log('Right click detected, preventing context menu');
        e.preventDefault();
        e.stopPropagation();
        return false; 
    };
});

// Main game loop
function loop() {

    let dt = Date.now() - lastTime;
    lastTime = Date.now();

    onPlayModeUpdate(dt);

    // Render
    draw(ctx, state);

    requestAnimationFrame(loop);
}

loop();