import { BoxColliderComponent } from "../components/BoxColliderComponent.js";
import { Entity } from "./Entity.js";
import { SpriteRendererComponent } from "../components/SpriteRendererComponent.js";
import { TransformComponent } from "../components/TransformComponent.js";
import { SignalReceiverComponent } from "../components/SignalReceiverComponent.js";
import { evaluateAST } from '../utils/logicEvaluator.js';
import { state } from '../editor.js';

export class PhaseGate extends Entity {
    static getName() {
        return 'phase_gate';
    }

    static getDisplayName() {
        return 'Phase Gate';
    }

    constructor(options = {}) {
        super(options);
        this.name = options.name || "g" + this.id;
        this.direction = options.direction || 0; // 0: Horizontal, 1: Vertical
        this.length = options.length || 1;
        this.poweredWhitelist = options.poweredWhitelist ? [...options.poweredWhitelist] : [];
        this.unpoweredWhitelist = options.unpoweredWhitelist ? [...options.unpoweredWhitelist] : [];
        this.logic = options.logic || "FALSE";
        this.isPowered = false;

        this.addComponent(new BoxColliderComponent({ width: 40, height: 10 }));
        this.addComponent(new SpriteRendererComponent({
            colorTint: '#ffffff',
            dest: { x: 0, y: 0, w: 40, h: 10 }
        }));
        this.addComponent(new SignalReceiverComponent());

        this.addComponent({
            entity: null,
            clone: function() {
                return { entity: null, onPlayModeUpdate: this.onPlayModeUpdate };
            },
            onPlayModeUpdate: function(dt) { this.entity.evaluateLogic(dt); }
        });

        setTimeout(() => this.updateVisuals(), 0);
    }

    getEditableProperties() {
        const types = state.cubeTypes ? state.cubeTypes.map(t => t.name) : ['White', 'Red', 'Blue'];
        return [
            { property: 'name', type: 'text', label: 'Name (ID)' },
            { property: 'direction', type: 'text', label: 'Direction (0=Horiz, 1=Vert)' },
            { property: 'length', type: 'number', label: 'Length' },
            { property: 'unpoweredWhitelist', type: 'list', label: 'Unpowered Whitelist', options: types },
            { property: 'poweredWhitelist', type: 'list', label: 'Powered Whitelist', options: types },
            { property: 'logic', type: 'logic', label: 'Logic' }
        ];
    }

    setEditableProperty(key, value) {
        if (key === 'length') {
            value = Math.max(1, parseInt(value) || 1);
        } else if (key === 'direction') {
            value = parseInt(value);
            if (isNaN(value)) value = 0;
            value = value % 2;
        }
        super.setEditableProperty(key, value);
        if (['length', 'direction', 'poweredWhitelist', 'unpoweredWhitelist'].includes(key)) {
            this.updateVisuals();
        }
    }

    evaluateLogic() {
        const powered = evaluateAST(this.logic, state);
        if (powered !== this.isPowered) {
            this.isPowered = powered;
            this.updateVisuals();
        }
    }

    updateVisuals() {
        const transform = this.getComponent(TransformComponent);
        const collider = this.getComponent(BoxColliderComponent);
        const renderer = this.getComponent(SpriteRendererComponent);

        const gridSize = state.gridSize || 40;
        const thickness = 10;
        const gateLength = this.length * gridSize;

        if (transform) {
            transform.rotation = 0;
        }

        if (collider) {
            if (this.direction === 0) { // Horizontal
                collider.width = gateLength;
                collider.height = thickness;
            } else {
                collider.width = thickness;
                collider.height = gateLength;
            }
        }

        if (renderer) {
            if (this.direction === 0) {
                renderer.dest.w = gateLength;
                renderer.dest.h = thickness;
            } else {
                renderer.dest.w = thickness;
                renderer.dest.h = gateLength;
            }

            // Determine state color
            const currentList = this.isPowered ? this.poweredWhitelist : this.unpoweredWhitelist;

            if (!currentList || currentList.length === 0) {
                // Off state
                renderer.colorTint = '#888888';
                renderer.isOutline = true;
            } else {
                // On state, take color of first allowed type
                const firstType = currentList[0];
                let color = '#ffffff';
                if (state.cubeTypes) {
                    const typeDef = state.cubeTypes.find(t => t.name === firstType);
                    if (typeDef) color = typeDef.color;
                }
                renderer.colorTint = color;
                renderer.isOutline = false;
            }
        }
    }
}
