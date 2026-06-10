import { computeNodes, getPointNode } from './utils/nodeUtils.js';
import { entityTypes } from './editor.js';

export function exportToSolver(state) {
    const nodesData = computeNodes(state);

    let solverNodes = nodesData.map(n => n.id);
    let solverEdges = [];
    let solverButtons = [];
    let solverDoors = [];
    let solverStairs = [];
    let solverGates = [];
    let solverInitialState = {
        player_node: null,
        cubes: [],
        active_cubes: []
    };

    let exitDoorId = null;
    let exitNode = null;

    // First pass: entities
    state.entities.forEach(entity => {
        const typeKey = Object.keys(entityTypes).find(key => entity instanceof entityTypes[key]) || entity.constructor.name.toLowerCase();
        let type = typeKey;
        // In case they named constructor Name diff
        if (type === 'box') type = 'box';

        const transform = entity.getComponent('TransformComponent');
        if (!transform) return;

        const node = getPointNode(nodesData, transform.x, transform.y);
        const nodeId = node ? node.id : null;

        if (type === 'player') {
            solverInitialState.player_node = nodeId;
        } else if (type === 'door') {
            exitDoorId = entity.name || `d${entity.id}`;
            exitNode = nodeId;

            let logic = entity.logic;
            if (logic === "BUTTON_ID") logic = "TRUE";
            if (!logic) logic = "TRUE";

            solverDoors.push({
                id: exitDoorId,
                logic: logic
            });
        } else if (type === 'button') {
            const btnId = entity.name || `b${entity.id}`;
            solverButtons.push({
                id: btnId,
                node: nodeId,
                req_weight: entity.requiredWeight !== undefined ? entity.requiredWeight : 1
            });
        } else if (type === 'box') {
            const boxId = `c${entity.id}`;
            // Capitalize first letter of type as required
            let capitalizedType = entity.typeName ? entity.typeName.charAt(0).toUpperCase() + entity.typeName.slice(1) : "White";

            solverInitialState.cubes.push({
                id: boxId,
                type: capitalizedType,
                position: nodeId
            });
            solverInitialState.active_cubes.push(boxId);
        } else if (type === 'phase_gate') {
            const gateId = entity.name || `g${entity.id}`;
            let logic = entity.logic;
            if (logic === "BUTTON_ID") logic = "TRUE";
            if (!logic) logic = "TRUE";

            const unpoweredWhitelist = (entity.unpoweredWhitelist || []).map(t => t.charAt(0).toUpperCase() + t.slice(1));
            const poweredWhitelist = (entity.poweredWhitelist || []).map(t => t.charAt(0).toUpperCase() + t.slice(1));

            solverGates.push({
                id: gateId,
                logic: logic,
                unpowered_whitelist: unpoweredWhitelist,
                powered_whitelist: poweredWhitelist
            });

            // Determine nodes on either side
            let dx = 0, dy = 0;
            if (entity.direction === 0) { // Horizontal gate, sample Top/Bottom
                dy = 20;
            } else { // Vertical gate, sample Left/Right
                dx = 20;
            }

            const node1 = getPointNode(nodesData, transform.x + dx, transform.y + dy);
            const node2 = getPointNode(nodesData, transform.x - dx, transform.y - dy);

            if (node1 && node2 && node1.id !== node2.id) {
                solverEdges.push({
                    id: `e_${gateId}`,
                    from: node1.id,
                    to: node2.id,
                    type: "phase_gate",
                    gate_id: gateId
                });
                // Since phase gates divide regions they are bidirectional, add both ways
                solverEdges.push({
                    id: `e_${gateId}_rev`,
                    from: node2.id,
                    to: node1.id,
                    type: "phase_gate",
                    gate_id: gateId
                });
            }

        } else if (type === 'stairs') {
            const stairId = `s${entity.id}`;
            // 0: Right (+x), 1: Down (+y), 2: Left (-x), 3: Up (-y)
            let dx = 0, dy = 0;
            if (entity.direction === 0) dx = 10;
            else if (entity.direction === 1) dy = 10;
            else if (entity.direction === 2) dx = -10;
            else if (entity.direction === 3) dy = -10;

            const fromNode = getPointNode(nodesData, transform.x, transform.y);
            let toNode = null;

            // Raycast starting from the center of the stairs
            let rayX = transform.x;
            let rayY = transform.y;
            // Maximum distance to search (e.g. 500 pixels) to avoid infinite loops
            for (let i = 0; i < 50; i++) {
                rayX += dx;
                rayY += dy;
                let candidateNode = getPointNode(nodesData, rayX, rayY);
                if (candidateNode && fromNode && candidateNode.z !== fromNode.z) {
                    toNode = candidateNode;
                    break;
                }
            }

            let logic = entity.logic;
            if (logic === "BUTTON_ID") logic = "TRUE";
            if (!logic) logic = "TRUE";

            solverStairs.push({
                id: stairId,
                logic: logic
            });

            if (fromNode && toNode) {
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

    const solverCubeTypes = {};
    if (state.cubeTypes) {
        state.cubeTypes.forEach(t => {
            let capName = t.name.charAt(0).toUpperCase() + t.name.slice(1);
            solverCubeTypes[capName] = t.weight;
        });
    } else {
        solverCubeTypes["White"] = 2;
        solverCubeTypes["Red"] = 1;
        solverCubeTypes["Blue"] = 1;
    }

    const solverOutput = {
        nodes: solverNodes,
        edges: solverEdges,
        buttons: solverButtons,
        doors: solverDoors,
        stairs: solverStairs,
        gates: solverGates,
        recipes: state.recipes || [],
        cube_types: solverCubeTypes,
        exit_door_id: exitDoorId,
        exit_node: exitNode,
        initial_state: solverInitialState
    };

    const jsonString = JSON.stringify(solverOutput, null, 2);
    return jsonString;
}
