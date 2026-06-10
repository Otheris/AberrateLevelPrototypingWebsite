import { Tool } from './Tool.js';
import { history } from '../history.js';
import { rectsIntersect, subtractRect, intersectRect } from '../utils/nodeUtils.js';

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
