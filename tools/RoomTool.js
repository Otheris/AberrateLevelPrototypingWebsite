import { Tool } from './Tool.js';
import { history } from '../history.js';

/**
 * Helper to check if two rects intersect
 */
function rectsIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.w ||
             r2.x + r2.w <= r1.x ||
             r2.y >= r1.y + r1.h ||
             r2.y + r2.h <= r1.y);
}

/**
 * Subtracts r2 from r1, returning an array of new non-overlapping rectangles
 * that make up the remaining area of r1.
 */
function subtractRect(r1, r2) {
    if (!rectsIntersect(r1, r2)) return [r1];

    let result = [];

    // Top piece
    if (r2.y > r1.y) {
        result.push({ x: r1.x, y: r1.y, w: r1.w, h: r2.y - r1.y, z: r1.z });
    }

    // Bottom piece
    if (r2.y + r2.h < r1.y + r1.h) {
        result.push({ x: r1.x, y: r2.y + r2.h, w: r1.w, h: (r1.y + r1.h) - (r2.y + r2.h), z: r1.z });
    }

    // Left piece
    let middleY = Math.max(r1.y, r2.y);
    let middleH = Math.min(r1.y + r1.h, r2.y + r2.h) - middleY;

    if (r2.x > r1.x) {
        result.push({ x: r1.x, y: middleY, w: r2.x - r1.x, h: middleH, z: r1.z });
    }

    // Right piece
    if (r2.x + r2.w < r1.x + r1.w) {
        result.push({ x: r2.x + r2.w, y: middleY, w: (r1.x + r1.w) - (r2.x + r2.w), h: middleH, z: r1.z });
    }

    return result;
}

/**
 * Returns the intersection rectangle of r1 and r2, or null if none
 */
function intersectRect(r1, r2) {
    if (!rectsIntersect(r1, r2)) return null;
    let x = Math.max(r1.x, r2.x);
    let y = Math.max(r1.y, r2.y);
    let w = Math.min(r1.x + r1.w, r2.x + r2.w) - x;
    let h = Math.min(r1.y + r1.h, r2.y + r2.h) - y;
    return { x, y, w, h };
}

/**
 * Room tool for placing and editing rooms/tiles
 */
export class RoomTool extends Tool {
  getName() {
      return 'room';
  }

  onEnter(state) {
    console.log('Room tool activated');
    state.creatingRoom = false;
  }

  onExit(state) {
    console.log('Room tool deactivated');
    state.creatingRoom = false;
  }

  onMouseDown(state, button) {
    if (button === 0) {
        state.creatingRoom = true;
    }
  }

  onMouseMove(state) {
  }

  onMouseUp(state, button) {
    if (button === 0 && state.creatingRoom) {
      state.creatingRoom = false;
      this.finalizeRoom(state);
    }
  }

  finalizeRoom(state) {
    const { gridSize, mouse } = state;
    const ax = mouse.mouseDownGridX * gridSize;
    const ay = mouse.mouseDownGridY * gridSize;
    const bx = mouse.gridX * gridSize;
    const by = mouse.gridY * gridSize;

    const x = Math.min(ax, bx);
    const y = Math.min(ay, by);
    const w = Math.abs(bx - ax) + gridSize;
    const h = Math.abs(by - ay) + gridSize;

    const drawnRect = { x, y, w, h };
    const isShiftDown = state.input.isShiftDown;
    const zDelta = isShiftDown ? -1 : 1;

    let newRegions = [];
    let overlappingAny = false;

    // We'll rebuild the state.rooms list
    let updatedRooms = [];

    for (let rect of state.rooms || []) {
        if (rectsIntersect(rect, drawnRect)) {
            overlappingAny = true;
            // Split the existing rect
            let pieces = subtractRect(rect, drawnRect);
            updatedRooms.push(...pieces);

            // Calculate the intersection and modify its Z
            let intersection = intersectRect(rect, drawnRect);
            intersection.z = rect.z + zDelta;

            // Only keep it if z >= 0
            if (intersection.z >= 0) {
                newRegions.push(intersection);
            }
        } else {
            updatedRooms.push(rect);
        }
    }

    if (!overlappingAny && !isShiftDown) {
        // Drawing into an empty area
        updatedRooms.push({ x, y, w, h, z: 0 });
    }

    // For any area of drawnRect that didn't overlap existing rooms,
    // if we are adding, it should be created at z=0.
    if (!isShiftDown && overlappingAny) {
        // We need to find the empty space inside drawnRect and fill it with z=0.
        // We can do this by subtracting all existing rooms from drawnRect.
        let remainingDrawnRects = [drawnRect];
        for (let rect of state.rooms || []) {
            let nextRemaining = [];
            for (let rem of remainingDrawnRects) {
                nextRemaining.push(...subtractRect(rem, rect));
            }
            remainingDrawnRects = nextRemaining;
        }
        for (let emptyRect of remainingDrawnRects) {
            emptyRect.z = 0;
            updatedRooms.push(emptyRect);
        }
    }

    updatedRooms.push(...newRegions);

    // Filter out invalid/empty rects just in case
    state.rooms = updatedRooms.filter(r => r.w > 0 && r.h > 0);
    history.saveSnapshot(state);
  }

  onKeyDown(state, key) {
  }

  onKeyUp(state, key) {
  }
}
