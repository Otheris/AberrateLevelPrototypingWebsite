import { computeNodes, getPointNode } from './utils/nodeUtils.js';

export function exportToSolver(state) {
    const nodesData = computeNodes(state);

    let solverNodes = nodesData.map(n => n.id);
    let solverEdges = [];
    let solverButtons = [];
    let solverDoors = [];
    let solverStairs = [];
    let solverInitialState = {
        player_node: null,
        cubes: [],
        active_cubes: []
    };

    let exitDoorId = null;
    let exitNode = null;

    // First pass: entities
    state.entities.forEach(entity => {
        const type = entity.constructor.getName();
        const transform = entity.getComponent('transform');
        if (!transform) return;

        const node = getPointNode(nodesData, transform.x, transform.y);
        const nodeId = node ? node.id : null;

        if (type === 'player') {
            solverInitialState.player_node = nodeId;
        } else if (type === 'door') {
            exitDoorId = entity.name || `d${entity.id}`;
            exitNode = nodeId;
            solverDoors.push({
                id: exitDoorId,
                logic: entity.logic || "TRUE"
            });
        } else if (type === 'button') {
            const btnId = entity.name || `b${entity.id}`;
            solverButtons.push({
                id: btnId,
                node: nodeId,
                req_weight: entity.whiteOnly ? 2 : 1
            });
        } else if (type === 'box') {
            const boxId = `c${entity.id}`;
            const isWhite = entity.color === 0; // Box.BOX_COLOR_WHITE
            const weight = isWhite ? 2 : 1;
            solverInitialState.cubes.push({
                id: boxId,
                type: isWhite ? "White" : (entity.color === 1 ? "Red" : "Blue"),
                weight: weight,
                position: nodeId
            });
            solverInitialState.active_cubes.push(boxId);
        } else if (type === 'stairs') {
            const stairId = `s${entity.id}`;
            // 0: Right (+x), 1: Down (+y), 2: Left (-x), 3: Up (-y)
            let dx = 0, dy = 0;
            const dist = 50; // offset to check adjacent nodes
            if (entity.direction === 0) dx = dist;
            else if (entity.direction === 1) dy = dist;
            else if (entity.direction === 2) dx = -dist;
            else if (entity.direction === 3) dy = -dist;

            const fromNode = getPointNode(nodesData, transform.x, transform.y);
            const toNode = getPointNode(nodesData, transform.x + dx, transform.y + dy);

            solverStairs.push({
                id: stairId,
                logic: entity.logic || "TRUE"
            });

            if (fromNode && toNode && fromNode.id !== toNode.id) {
                solverEdges.push({
                    id: `e_${stairId}`,
                    from: fromNode.id,
                    to: toNode.id,
                    type: "stairs",
                    stairs_id: stairId
                });
            }
        }
    });

    // Compute platform drop-downs (edges from higher Z to lower Z bordering nodes)
    for (let i = 0; i < nodesData.length; i++) {
        for (let j = 0; j < nodesData.length; j++) {
            if (i === j) continue;
            const nodeA = nodesData[i];
            const nodeB = nodesData[j];

            if (nodeA.z > nodeB.z) {
                // Check if they border each other
                let border = false;
                for (const rA of nodeA.rects) {
                    for (const rB of nodeB.rects) {
                        // Touch if they intersect when one is expanded by 1 pixel
                        if (!(rB.x > rA.x + rA.w + 1 ||
                              rB.x + rB.w < rA.x - 1 ||
                              rB.y > rA.y + rA.h + 1 ||
                              rB.y + rB.h < rA.y - 1)) {
                            border = true;
                            break;
                        }
                    }
                    if (border) break;
                }

                if (border) {
                    solverEdges.push({
                        id: `e_plat_${nodeA.id}_to_${nodeB.id}`,
                        from: nodeA.id,
                        to: nodeB.id,
                        type: "platform"
                    });
                }
            }
        }
    }

    const solverOutput = {
        nodes: solverNodes,
        edges: solverEdges,
        buttons: solverButtons,
        doors: solverDoors,
        stairs: solverStairs,
        recipes: [
            {"id": "r1", "inputs": ["Red", "Blue"], "outputs": ["White"]},
            {"id": "r2", "inputs": ["White"], "outputs": ["Red", "Blue"]}
        ],
        exit_door_id: exitDoorId,
        exit_node: exitNode,
        initial_state: solverInitialState
    };

    const jsonString = JSON.stringify(solverOutput, null, 2);
    return jsonString;
}
