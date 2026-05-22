import { entityTypes } from './editor.js';
import { Entity } from './entities/Entity.js';

export function serializeLevel(state) {
    const levelNameInput = document.getElementById('levelName');
    const levelName = levelNameInput ? levelNameInput.value : 'Untitled';

    const data = {
        levelName,
        gridSize: state.gridSize,
        camera: state.camera,
        tiles: state.tiles,
        rooms: state.rooms,
        nodeData: state.nodeData || [],
        cubeTypes: state.cubeTypes,
        recipes: state.recipes,
        entities: []
    };

    state.entities.forEach(entity => {
        const typeKey = Object.keys(entityTypes).find(key => entity instanceof entityTypes[key]) || entity.constructor.name.toLowerCase();

        const entityData = {
            id: entity.id,
            type: typeKey,
            color: entity.color,
            components: {},
            options: {}
        };

        const editableProps = entity.getEditableProperties();
        editableProps.forEach(prop => {
            entityData.options[prop.property] = cloneValue(entity[prop.property]);
        });

        entity.components.forEach(component => {
            const componentName = component.constructor.name;
            const componentData = {};

            for (const key of Object.keys(component)) {
                if (key === 'entity' || key === 'image' || key === 'tintedCanvas' || key === 'lastTint' || key === 'lastSourceStr') continue;

                if (componentName === 'SignalSenderComponent' && key === 'receiverComponents') {
                    componentData[key] = component[key].map(c => c.entity.id);
                } else {
                    componentData[key] = cloneValue(component[key]);
                }
            }

            entityData.components[componentName] = componentData;
        });

        data.entities.push(entityData);
    });

    return JSON.stringify(data, null, 2);
}

export function serializeLevelBinary(state) {
    const levelNameInput = document.getElementById('levelName');
    const levelName = levelNameInput ? levelNameInput.value : 'Untitled';

    const data = {
        levelName,
        gridSize: state.gridSize,
        camera: state.camera,
        tiles: state.tiles,
        rooms: state.rooms,
        nodeData: state.nodeData || [],
        cubeTypes: state.cubeTypes,
        recipes: state.recipes,
        entities: []
    };

    state.entities.forEach(entity => {
        const typeKey = Object.keys(entityTypes).find(key => entity instanceof entityTypes[key]) || entity.constructor.name.toLowerCase();

        const entityData = {
            id: entity.id,
            type: typeKey,
            color: entity.color,
            components: {},
            options: {}
        };

        const defaultEntity = new entity.constructor({ skipDefaults: true });

        // Populate default components so we can diff them
        // Actually it's easier to just call the constructor normally to get default components
        let defaultEnt = null;
        try {
            defaultEnt = new entity.constructor();
        } catch (e) {
            defaultEnt = new entity.constructor({ skipDefaults: true }); // fallback
        }

        const editableProps = entity.getEditableProperties();
        editableProps.forEach(prop => {
            const val = cloneValue(entity[prop.property]);
            if (defaultEnt && JSON.stringify(val) !== JSON.stringify(defaultEnt[prop.property])) {
                entityData.options[prop.property] = val;
            } else if (!defaultEnt) {
                 entityData.options[prop.property] = val;
            }
        });

        entity.components.forEach(component => {
            const componentName = component.constructor.name;
            const componentData = {};

            const defaultComp = defaultEnt ? defaultEnt.components.find(c => c.constructor.name === componentName) : null;

            let hasChanges = false;
            for (const key of Object.keys(component)) {
                if (key === 'entity' || key === 'image' || key === 'tintedCanvas' || key === 'lastTint' || key === 'lastSourceStr') continue;

                let val;
                if (componentName === 'SignalSenderComponent' && key === 'receiverComponents') {
                    val = component[key].map(c => c.entity.id);
                    if (val.length > 0) {
                        componentData[key] = val;
                        hasChanges = true;
                    }
                } else {
                    val = cloneValue(component[key]);

                    // Truncate floats for positions
                    if (typeof val === 'number') {
                         if (key === 'x' || key === 'y' || key === 'width' || key === 'height' || key === 'rotation') {
                             val = Math.round(val);
                         }
                    }

                    if (!defaultComp || JSON.stringify(val) !== JSON.stringify(defaultComp[key])) {
                        componentData[key] = val;
                        hasChanges = true;
                    }
                }
            }

            if (hasChanges) {
                entityData.components[componentName] = componentData;
            }
        });

        data.entities.push(entityData);
    });

    // We can just use msgpack or a minified json representation then text encoder,
    // but the user requested binary string table approach.
    // Actually, writing a full binary protocol from scratch is quite error prone and large.
    // Given the constraints and what we're trying to optimize, a highly aggressive JSON minifier
    // into a text encoder will be equivalent if we map keys to a string table.
    // Let's do the string table approach, but output it as a packed JSON array to be converted to Uint8Array via TextEncoder.
    // Wait, the user explicitly approved "custom binary format (ArrayBuffer/DataView)".
    // I must stick to the binary format.

    const strings = [];
    function getStringId(str) {
        if (typeof str !== 'string') return -1;
        let idx = strings.indexOf(str);
        if (idx === -1) {
            idx = strings.length;
            strings.push(str);
        }
        return idx;
    }

    const finalData = {
        levelName: data.levelName,
        gridSize: data.gridSize,
        camera: { x: Math.round(data.camera.x), y: Math.round(data.camera.y), zoom: data.camera.zoom },
        tiles: data.tiles,
        rooms: data.rooms,
        nodeData: data.nodeData,
        cubeTypes: data.cubeTypes,
        recipes: data.recipes,
        entities: data.entities
    };

    // Pass 1: gather all strings (non-recursive to avoid stack overflow)
    const gatherStrings = (rootObj) => {
        const stack = [rootObj];
        while (stack.length > 0) {
            const obj = stack.pop();
            if (typeof obj === 'string') {
                getStringId(obj);
            } else if (Array.isArray(obj)) {
                for (let i = obj.length - 1; i >= 0; i--) {
                    stack.push(obj[i]);
                }
            } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
                const keys = Object.keys(obj);
                for (let i = keys.length - 1; i >= 0; i--) {
                    const k = keys[i];
                    getStringId(k);
                    stack.push(obj[k]);
                }
            }
        }
    };
    gatherStrings(finalData);

    // BSON-like or custom packed format
    // Buffer builder
    let buffer = new ArrayBuffer(1024 * 1024); // 1MB max initially
    let view = new DataView(buffer);
    let offset = 0;

    function writeUint8(val) { view.setUint8(offset, val); offset += 1; }
    function writeUint16(val) { view.setUint16(offset, val); offset += 2; }
    function writeInt16(val) { view.setInt16(offset, val); offset += 2; }
    function writeInt32(val) { view.setInt32(offset, val); offset += 4; }
    function writeFloat32(val) { view.setFloat32(offset, val); offset += 4; }
    function writeStringRef(str) { writeUint16(getStringId(str)); }

    // Magic header
    writeUint8(0x41); writeUint8(0x42); writeUint8(0x45); writeUint8(0x52);

    // Write string table
    writeUint16(strings.length);
    const encoder = new TextEncoder();
    strings.forEach(str => {
        const bytes = encoder.encode(str);
        writeUint16(bytes.length);
        for(let i=0; i<bytes.length; i++) writeUint8(bytes[i]);
    });

    const TYPE_NULL = 0;
    const TYPE_BOOL_T = 1;
    const TYPE_BOOL_F = 2;
    const TYPE_INT16 = 3;
    const TYPE_FLOAT32 = 4;
    const TYPE_STRING = 5;
    const TYPE_ARRAY = 6;
    const TYPE_OBJECT = 7;

    function writeValue(val) {
        if (val === null || val === undefined) {
            writeUint8(TYPE_NULL);
        } else if (typeof val === 'boolean') {
            writeUint8(val ? TYPE_BOOL_T : TYPE_BOOL_F);
        } else if (typeof val === 'number') {
            if (Number.isInteger(val) && val >= -32768 && val <= 32767) {
                writeUint8(TYPE_INT16);
                writeInt16(val);
            } else {
                writeUint8(TYPE_FLOAT32);
                writeFloat32(val);
            }
        } else if (typeof val === 'string') {
            writeUint8(TYPE_STRING);
            writeStringRef(val);
        } else if (Array.isArray(val)) {
            writeUint8(TYPE_ARRAY);
            writeUint16(val.length);
            val.forEach(writeValue);
        } else if (typeof val === 'object' && val.constructor === Object) {
            writeUint8(TYPE_OBJECT);
            const keys = Object.keys(val);
            writeUint16(keys.length);
            keys.forEach(k => {
                writeStringRef(k);
                writeValue(val[k]);
            });
        } else {
            // Unhandled object types (like Image, Context, etc.) are treated as null
            writeUint8(TYPE_NULL);
        }
    }

    writeValue(finalData);

    return new Uint8Array(buffer, 0, offset);
}

export async function exportLevel(state, webhookUrl = '') {
    const jsonString = serializeLevel(state);
    const levelNameInput = document.getElementById('levelName');
    const levelName = levelNameInput ? levelNameInput.value : 'Untitled';
    console.log("=== EXPORTED LEVEL JSON ===");
    console.log(jsonString);
    console.log("===========================");

    // Discord webhook integration
    try {
        if (webhookUrl && webhookUrl.startsWith('http')) {
            let contentMessage = "";

            try {
                if (window.pako && window.base64js) {
                        const dataToCompress = serializeLevelBinary(state);
                        const compressed = window.pako.deflate(dataToCompress);
                        const b64 = window.base64js.fromByteArray(compressed);
                        const url = new URL(window.location.origin + window.location.pathname);
                        url.searchParams.set('x', b64);

                        const linkStr = url.toString();
                        const markdownMsg = `# [Test level: ${levelName}](${linkStr})`;
                        if (markdownMsg.length <= 2000) {
                            contentMessage = markdownMsg;
                        } else {
                            contentMessage = "level too large for url export";
                        }
                    }
                } catch (err) {
                    console.error("Compression for URL failed:", err);
                    const notification = document.getElementById('notification');
                    if (notification) {
                        notification.textContent = 'Failed to generate link for webhook!';
                        notification.style.backgroundColor = '#f44336'; // Red for error
                        notification.className = '';
                        setTimeout(() => notification.className = 'hidden', 3000);
                    }
                    return jsonString; // Abort export to webhook
                }

                const blob = new Blob([jsonString], { type: 'application/json' });
                const formData = new FormData();
                formData.append('file', blob, `${levelName.replace(/[^a-zA-Z0-9]/g, '_') || 'level'}.json`);
                if (contentMessage) {
                    formData.append('payload_json', JSON.stringify({
                        content: contentMessage,
                        flags: 4 // suppress embeds
                    }));
                }

                // Also get an image from the canvas
                const canvas = document.getElementById('editor');
                if (canvas) {
                    try {
                        const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                        if (imageBlob) {
                            formData.append('file1', imageBlob, `${levelName.replace(/[^a-zA-Z0-9]/g, '_') || 'level'}.png`);
                        }
                    } catch (err) {
                        console.error('Failed to capture canvas screenshot:', err);
                    }
                }

                if (contentMessage) {
                    formData.append('payload_json', JSON.stringify({
                        content: contentMessage,
                        flags: 4 // suppress embeds
                    }));
                }

                const webhookResponse = await fetch(webhookUrl, {
                    method: 'POST',
                    body: formData
                });

                if (webhookResponse.ok) {
                    console.log('Successfully sent level to Discord webhook.');
                } else {
                    console.error('Failed to send level to Discord webhook:', webhookResponse.statusText);
                }
            }
    } catch (e) {
        console.error('Failed to send to Discord:', e);
    }

    return jsonString;
}

export function importLevelBinary(state, buffer) {
    try {
        let view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        let offset = 0;

        function readUint8() { const val = view.getUint8(offset); offset += 1; return val; }
        function readUint16() { const val = view.getUint16(offset); offset += 2; return val; }
        function readInt16() { const val = view.getInt16(offset); offset += 2; return val; }
        function readFloat32() { const val = view.getFloat32(offset); offset += 4; return val; }

        // Magic header
        const m1 = readUint8();
        const m2 = readUint8();
        const m3 = readUint8();
        const m4 = readUint8();
        if (m1 !== 0x41 || m2 !== 0x42 || m3 !== 0x45 || m4 !== 0x52) {
            throw new Error("Invalid binary magic header");
        }

        // Read string table
        const numStrings = readUint16();
        const strings = [];
        const decoder = new TextDecoder();
        for (let i = 0; i < numStrings; i++) {
            const len = readUint16();
            const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset + offset, len);
            offset += len;
            strings.push(decoder.decode(bytes));
        }

        function readStringRef() {
            return strings[readUint16()];
        }

        const TYPE_NULL = 0;
        const TYPE_BOOL_T = 1;
        const TYPE_BOOL_F = 2;
        const TYPE_INT16 = 3;
        const TYPE_FLOAT32 = 4;
        const TYPE_STRING = 5;
        const TYPE_ARRAY = 6;
        const TYPE_OBJECT = 7;

        function readValue() {
            const type = readUint8();
            if (type === TYPE_NULL) return null;
            if (type === TYPE_BOOL_T) return true;
            if (type === TYPE_BOOL_F) return false;
            if (type === TYPE_INT16) return readInt16();
            if (type === TYPE_FLOAT32) return readFloat32();
            if (type === TYPE_STRING) return readStringRef();
            if (type === TYPE_ARRAY) {
                const len = readUint16();
                const arr = [];
                for (let i = 0; i < len; i++) {
                    arr.push(readValue());
                }
                return arr;
            }
            if (type === TYPE_OBJECT) {
                const len = readUint16();
                const obj = {};
                for (let i = 0; i < len; i++) {
                    const k = readStringRef();
                    obj[k] = readValue();
                }
                return obj;
            }
            throw new Error("Unknown value type in binary stream: " + type);
        }

        const data = readValue();
        if (!data || !Array.isArray(data.entities)) {
            throw new Error("Invalid level data in binary");
        }

        // Restore properties into state
        if (data.levelName) {
            const levelNameInput = document.getElementById('levelName');
            if (levelNameInput) levelNameInput.value = data.levelName;
        }

        if (data.gridSize !== undefined) state.gridSize = data.gridSize;
        if (data.camera) state.camera = { ...data.camera };
        if (data.tiles) state.tiles = cloneValue(data.tiles);
        if (data.rooms) state.rooms = cloneValue(data.rooms);
        if (data.nodeData) state.nodeData = cloneValue(data.nodeData);
        if (data.cubeTypes) state.cubeTypes = cloneValue(data.cubeTypes);
        if (data.recipes) {
            state.recipes = cloneValue(data.recipes);
        } else {
            state.recipes = [
                { id: 'r1', inputs: ['Red', 'Blue'], outputs: ['White'] },
                { id: 'r2', inputs: ['White'], outputs: ['Red', 'Blue'] }
            ];
        }

        state.selectedEntites = [];
        state.highlightedEntities = [];
        state.dragMoving = false;
        state.dragSelecting = false;

        state.entities = [];
        let maxId = -1;

        data.entities.forEach(entityData => {
            const EntityClass = entityTypes[entityData.type];
            if (!EntityClass) {
                console.warn(`Unknown entity type: ${entityData.type}`);
                return;
            }

            const entity = new EntityClass({ color: entityData.color });
            if (entityData.id !== undefined) entity.id = entityData.id;
            if (entity.id > maxId) maxId = entity.id;

            // Since it's optimized, it only contains diffs from the default components
            // But the constructor already initialized defaults, so we just override with what's present
            if (entityData.components) {
                for (const [componentName, componentData] of Object.entries(entityData.components)) {
                    const component = entity.components.find(c => c.constructor.name === componentName);
                    if (component) {
                        for (const key of Object.keys(componentData)) {
                            if (componentName === 'SignalSenderComponent' && key === 'receiverComponents') {
                                continue;
                            }
                            component[key] = cloneValue(componentData[key]);
                        }
                        if (componentName === 'SpriteRendererComponent' || componentName === 'SpritesheetRendererComponent') {
                            component.image = null;
                            component.tintedCanvas = null;
                            component.lastTint = null;
                            component.lastSourceStr = null;
                        }
                    }
                }
            }

            if (entityData.options) {
                for (const [key, value] of Object.entries(entityData.options)) {
                    entity.setEditableProperty(key, value);
                }
            }

            if (entity.setCubeColor && entityData.color !== undefined) {
                if (typeof entityData.color === 'number') {
                     entity.setCubeColor(entityData.color);
                }
            }

            state.entities.push(entity);
        });

        // Second pass: reconnect signals
        data.entities.forEach(entityData => {
            if (!entityData.components) return;
            const senderData = entityData.components['SignalSenderComponent'];
            if (senderData && senderData.receiverComponents) {
                const senderEntity = state.entities.find(e => e.id === entityData.id);
                if (senderEntity) {
                    const senderComponent = senderEntity.components.find(c => c.constructor.name === 'SignalSenderComponent');
                    if (senderComponent) {
                        senderComponent.receiverComponents = [];
                        senderData.receiverComponents.forEach(receiverEntityId => {
                            const receiverEntity = state.entities.find(e => e.id === receiverEntityId);
                            if (receiverEntity) {
                                const receiverComponent = receiverEntity.components.find(c => c.constructor.name === 'SignalReceiverComponent');
                                if (receiverComponent) {
                                    senderComponent.receiverComponents.push(receiverComponent);
                                }
                            }
                        });
                    }
                }
            }
        });

        Entity.nextEntityID = maxId + 1;

    } catch (e) {
        console.error("Failed to import binary level:", e);
    }
}

export function importLevel(state, jsonString) {
    try {
        const data = JSON.parse(jsonString);

        // Validate it looks like a level export before mutating state
        if (!data || !Array.isArray(data.entities)) {
            throw new Error("Invalid level data");
        }

        if (data.levelName) {
            const levelNameInput = document.getElementById('levelName');
            if (levelNameInput) levelNameInput.value = data.levelName;
        }

        if (data.gridSize !== undefined) state.gridSize = data.gridSize;
        if (data.camera) state.camera = { ...data.camera };
        if (data.tiles) state.tiles = cloneValue(data.tiles);
        if (data.rooms) state.rooms = cloneValue(data.rooms);
        if (data.nodeData) state.nodeData = cloneValue(data.nodeData);
        if (data.cubeTypes) state.cubeTypes = cloneValue(data.cubeTypes);
        if (data.recipes) {
            state.recipes = cloneValue(data.recipes);
        } else {
            // Default recipes if not present in save
            state.recipes = [
                { id: 'r1', inputs: ['Red', 'Blue'], outputs: ['White'] },
                { id: 'r2', inputs: ['White'], outputs: ['Red', 'Blue'] }
            ];
        }

        // Clear ephemeral UI selection state to avoid stale references
        state.selectedEntites = [];
        state.highlightedEntities = [];
        state.dragMoving = false;
        state.dragSelecting = false;

        state.entities = [];
        let maxId = -1;

        // First pass: recreate entities and their components (except connections)
        data.entities.forEach(entityData => {
            const EntityClass = entityTypes[entityData.type];
            if (!EntityClass) {
                console.warn(`Unknown entity type: ${entityData.type}`);
                return;
            }

            // Create entity and pass color if present
            const entity = new EntityClass({ color: entityData.color });
            entity.id = entityData.id;
            if (entity.id > maxId) maxId = entity.id;

            // Re-apply component data
            for (const [componentName, componentData] of Object.entries(entityData.components)) {
                // Find matching component on newly created entity
                const component = entity.components.find(c => c.constructor.name === componentName);
                if (component) {
                    for (const key of Object.keys(componentData)) {
                        if (componentName === 'SignalSenderComponent' && key === 'receiverComponents') {
                            // Handled in second pass
                            continue;
                        }
                        component[key] = cloneValue(componentData[key]);
                    }
                    if (componentName === 'SpriteRendererComponent' || componentName === 'SpritesheetRendererComponent') {
                        component.image = null; // force reload image
                        component.tintedCanvas = null;
                        component.lastTint = null;
                        component.lastSourceStr = null;
                    }
                }
            }

            // Apply entity options
            if (entityData.options) {
                for (const [key, value] of Object.entries(entityData.options)) {
                    entity.setEditableProperty(key, value);
                }
            }

            // if Box has specific color handling, make sure it applies
            if (entity.setCubeColor && entityData.color !== undefined) {
                // If it's an old save, map it. If it's a new save, the `options` dict
                // will have populated `typeName` already and setCubeColor won't override it incorrectly
                // if we check that color is a number.
                if (typeof entityData.color === 'number') {
                     entity.setCubeColor(entityData.color);
                }
            }

            state.entities.push(entity);
        });

        // Second pass: reconnect signals
        data.entities.forEach(entityData => {
            const senderData = entityData.components['SignalSenderComponent'];
            if (senderData && senderData.receiverComponents) {
                const senderEntity = state.entities.find(e => e.id === entityData.id);
                if (senderEntity) {
                    const senderComponent = senderEntity.components.find(c => c.constructor.name === 'SignalSenderComponent');
                    if (senderComponent) {
                        senderComponent.receiverComponents = [];
                        senderData.receiverComponents.forEach(receiverEntityId => {
                            const receiverEntity = state.entities.find(e => e.id === receiverEntityId);
                            if (receiverEntity) {
                                const receiverComponent = receiverEntity.components.find(c => c.constructor.name === 'SignalReceiverComponent');
                                if (receiverComponent) {
                                    senderComponent.receiverComponents.push(receiverComponent);
                                }
                            }
                        });
                    }
                }
            }
        });

        Entity.nextEntityID = maxId + 1;

    } catch (e) {
        console.error("Failed to import level:", e);
    }
}

function cloneValue(value) {
    if (Array.isArray(value)) {
        return value.map(cloneValue);
    }
    if (value && typeof value === 'object' && value.constructor === Object) {
        const copy = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                copy[key] = cloneValue(value[key]);
            }
        }
        return copy;
    }
    return value;
}
