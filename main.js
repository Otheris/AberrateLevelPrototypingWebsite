import { state, onPlayModeUpdate } from './editor.js';
import { draw } from './renderer.js';
import { setupInputHandlers } from './input.js';
import { history } from './history.js';

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