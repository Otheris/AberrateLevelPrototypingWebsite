import { state, onPlayModeUpdate } from './editor.js';
import { draw } from './renderer.js';
import { setupInputHandlers } from './input.js';
import { history } from './history.js';
import { importLevel, importLevelBinary } from './io.js';
import { setupTabs } from './tabs.js';

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

    // Tutorial logic
    const tutorialSeen = localStorage.getItem('tutorialSeen');
    const tutorialModal = document.getElementById('tutorialModal');
    const closeTutorialBtn = document.getElementById('closeTutorialBtn');
    const helpBtn = document.getElementById('helpBtn');

    if (!tutorialSeen) {
        if (tutorialModal) tutorialModal.classList.remove('hidden');
        localStorage.setItem('tutorialSeen', 'true');
    }

    if (closeTutorialBtn) {
        closeTutorialBtn.addEventListener('click', () => {
            if (tutorialModal) tutorialModal.classList.add('hidden');
        });
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            if (tutorialModal) tutorialModal.classList.remove('hidden');
        });
    }

    // Check for level data in URL
    const params = new URLSearchParams(window.location.search);
    const compressedLevel = params.get('x');
    if (compressedLevel && window.pako && window.base64js) {
        try {
            const compressed = window.base64js.toByteArray(compressedLevel);
            const decompressed = window.pako.inflate(compressed);

            // Check magic header for binary format (0x41 0x42 0x45 0x52)
            if (decompressed.length >= 4 &&
                decompressed[0] === 0x41 &&
                decompressed[1] === 0x42 &&
                decompressed[2] === 0x45 &&
                decompressed[3] === 0x52) {
                importLevelBinary(state, decompressed);
            } else {
                // Fallback to verbose JSON mode
                const jsonString = new TextDecoder().decode(decompressed);
                importLevel(state, jsonString);
            }

            // Clean up URL so refresh doesn't trigger it again
            const url = new URL(window.location.href);
            url.searchParams.delete('x');
            window.history.replaceState({}, document.title, url.toString());
        } catch (e) {
            console.error("Failed to decompress and load level from URL:", e);
        }
    } else {
        // Setup tabs only if we aren't loading from URL. Or maybe setup tabs anyway but then the active tab gets the URL content.
        // Wait, setupTabs() calls loadCurrentLevelFromStorage(), which will overwrite the URL loaded level.
        // Let's do setupTabs first, then URL level loads ON TOP of active tab.
    }

    setupTabs();
    if (compressedLevel) {
        import('./tabs.js').then(m => m.saveCurrentLevelToStorage());
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
    const clearBtn = document.getElementById('clearBtn');
    const clearModal = document.getElementById('clearModal');
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    const confirmClearBtn = document.getElementById('confirmClearBtn');

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearModal.classList.remove('hidden');
        });
    }

    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', () => {
            clearModal.classList.add('hidden');
        });
    }

    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', () => {
            state.entities = [];
            state.rooms = [];
            state.tiles = [];
            state.nodeData = [];
            state.selectedEntites = [];
            state.selectedConnections = [];
            state.selectedNode = null;
            state.highlightedEntities = [];

            history.saveSnapshot(state);
            clearModal.classList.add('hidden');
        });
    }
