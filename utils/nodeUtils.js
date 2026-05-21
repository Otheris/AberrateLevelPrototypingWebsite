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

export function computeNodes(state) {
    const rooms = state.rooms || [];
    const nodeDataList = state.nodeData || [];
    if (!rooms || rooms.length === 0) return [];

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
