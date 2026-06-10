/**
 * Helper functions to compute contiguous nodes from the state's flat list of room rectangles.
 */

export function rectsTouchOrOverlap(r1, r2) {
    // Two rectangles touch or overlap if their bounds overlap
    return !(r2.x > r1.x + r1.w ||
             r2.x + r2.w < r1.x ||
             r2.y > r1.y + r1.h ||
             r2.y + r2.h < r1.y);
}

/**
 * Helper to check if two rects intersect
 */
export function rectsIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.w ||
             r2.x + r2.w <= r1.x ||
             r2.y >= r1.y + r1.h ||
             r2.y + r2.h <= r1.y);
}

/**
 * Subtracts r2 from r1, returning an array of new non-overlapping rectangles
 * that make up the remaining area of r1.
 */
export function subtractRect(r1, r2) {
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
export function intersectRect(r1, r2) {
    if (!rectsIntersect(r1, r2)) return null;
    let x = Math.max(r1.x, r2.x);
    let y = Math.max(r1.y, r2.y);
    let w = Math.min(r1.x + r1.w, r2.x + r2.w) - x;
    let h = Math.min(r1.y + r1.h, r2.y + r2.h) - y;
    return { x, y, w, h };
}

export function computeNodes(state) {
    let rooms = state.rooms ? JSON.parse(JSON.stringify(state.rooms)) : [];
    const nodeDataList = state.nodeData || [];
    if (!rooms || rooms.length === 0) return [];

    // Extract phase gates to subtract from rooms
    if (state.entities) {
        state.entities.forEach(entity => {
            if (entity.constructor.name === 'PhaseGate' || (entity.getName && entity.getName() === 'phase_gate')) {
                const transform = entity.components.find(c => c.constructor.name === 'TransformComponent');
                const collider = entity.components.find(c => c.constructor.name === 'BoxColliderComponent');
                if (transform && collider) {
                    const gateRect = {
                        x: transform.x - collider.width / 2,
                        y: transform.y - collider.height / 2,
                        w: collider.width,
                        h: collider.height
                    };

                    let newRooms = [];
                    for (const room of rooms) {
                        if (rectsTouchOrOverlap(room, gateRect)) {
                            // Subtract gate from room
                            const pieces = subtractRect(room, gateRect);
                            newRooms.push(...pieces);
                        } else {
                            newRooms.push(room);
                        }
                    }
                    rooms = newRooms.filter(r => r.w > 0 && r.h > 0);
                }
            }
        });
    }

    let nodes = [];
    let visited = new Set();

    for (let i = 0; i < rooms.length; i++) {
        if (visited.has(i)) continue;

        let nodeRects = [rooms[i]];
        let z = rooms[i].z;
        visited.add(i);

        let queue = [rooms[i]];

        while (queue.length > 0) {
            let current = queue.shift();

            for (let j = 0; j < rooms.length; j++) {
                if (visited.has(j)) continue;
                if (rooms[j].z !== z) continue;

                if (rectsTouchOrOverlap(current, rooms[j])) {
                    visited.add(j);
                    nodeRects.push(rooms[j]);
                    queue.push(rooms[j]);
                }
            }
        }

        // Generate a deterministic ID
        let minX = Math.min(...nodeRects.map(r => r.x));
        let minY = Math.min(...nodeRects.map(r => r.y));
        let defaultId = `Node_Z${z}_X${minX}_Y${minY}`;

        let nodeName = defaultId;

        // Find if any saved nodeData point falls inside this node
        for (const data of nodeDataList) {
            let inside = false;
            for (const rect of nodeRects) {
                if (data.x >= rect.x && data.x <= rect.x + rect.w && data.y >= rect.y && data.y <= rect.y + rect.h) {
                    inside = true;
                    break;
                }
            }
            if (inside) {
                nodeName = data.name;
                break;
            }
        }

        nodes.push({
            id: nodeName, // Use user name if available, else default ID
            defaultId: defaultId,
            z: z,
            rects: nodeRects
        });
    }

    return nodes;
}

export function getPointNode(nodes, x, y) {
    for (const node of nodes) {
        for (const rect of node.rects) {
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                return node;
            }
        }
    }
    return null;
}
