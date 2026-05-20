import { computeNodes, getPointNode } from './utils/nodeUtils.js';
import { entityTypes } from './editor.js';

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
            // Capitalize first letter of type as required
            let capitalizedType = entity.typeName ? entity.typeName.charAt(0).toUpperCase() + entity.typeName.slice(1) : "White";

            solverInitialState.cubes.push({
                id: boxId,
                type: capitalizedType,
                position: `btn:${nodeId}` // Adjusting position format based on example if needed? The user's example showed "position": "btn:b1" but we only have nodeId. We will keep nodeId for now or try to attach to button if overlapping, but the instructions only said type mapping. Wait, I will just export nodeId and assume the example was specific. Actually, I will revert to just nodeId for position, but wait, the example had "btn:b1". Let me just use nodeId as before since that was what it was doing.
            });

            // Wait, the original code had 'weight' in initial_state.cubes? No, the user instructions said "exports the string type name and the weight alongside it" but then the example JSON has:
            // "cubes": [ {"id": "c1", "type": "White", "position": "btn:b1"} ]
            // The cube_types array has the weight. I'll stick to the example JSON and remove weight from the cubes array.

            // Re-evaluating. I will just do what the example JSON does:

            // Re-evaluating again. The user said: "for 5, dont forget, it exports the string type name and the weight alongside it. the colour is just for visuals in the editor."
            // Ah, they meant in the cube_types dictionary! Ok.
            // But wait, the original code DID export weight inside the cubes array.
            // Let me keep it just in case, but also add the cube_types dict.
            // Let me look at the user prompt again:
            // "the export now requires a "cube types" array, which contains the captitalised names of all possible cubes in this scenario (currently White, Red, Blue). these cube types have a weight, which is 2 for white, and 1 each for red and blue. example JSON:" -> the example JSON has "cube_types": { "White": 1, ... } (dict not array).
            // I'll make sure it matches the prompt exactly.

            solverInitialState.cubes.push({
                id: boxId,
                type: capitalizedType,
                position: nodeId
            });
            solverInitialState.active_cubes.push(boxId);
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

            solverStairs.push({
                id: stairId,
                logic: entity.logic || "TRUE"
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
        recipes: [
            {"id": "r1", "inputs": ["Red", "Blue"], "outputs": ["White"]},
            {"id": "r2", "inputs": ["White"], "outputs": ["Red", "Blue"]}
        ],
        cube_types: solverCubeTypes,
        exit_door_id: exitDoorId,
        exit_node: exitNode,
        initial_state: solverInitialState
    };

    const jsonString = JSON.stringify(solverOutput, null, 2);
    return jsonString;
}
