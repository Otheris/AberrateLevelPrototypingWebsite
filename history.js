import { serializeLevel, importLevel } from './io.js';

class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.isReverting = false;
    }

    init(state) {
        this.undoStack.push(serializeLevel(state));
    }

    saveSnapshot(state) {
        if (this.isReverting) return;
        this.undoStack.push(serializeLevel(state));
        this.redoStack = []; // Clear redo stack on new action
        console.log('Snapshot saved. Undo stack size:', this.undoStack.length);
    }

    undo(state) {
        if (this.undoStack.length <= 1) return; // Cannot undo past the initial state
        this.isReverting = true;
        const currentSnapshot = this.undoStack.pop();
        this.redoStack.push(currentSnapshot);
        const previousSnapshot = this.undoStack[this.undoStack.length - 1];
        importLevel(state, previousSnapshot);
        this.isReverting = false;
        console.log('Undo performed.');
    }

    redo(state) {
        if (this.redoStack.length === 0) return;
        this.isReverting = true;
        const nextSnapshot = this.redoStack.pop();
        this.undoStack.push(nextSnapshot);
        importLevel(state, nextSnapshot);
        this.isReverting = false;
        console.log('Redo performed.');
    }
}

export const history = new HistoryManager();
