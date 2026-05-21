import { BoxColliderComponent } from "../components/BoxColliderComponent.js";
import { Entity } from "./Entity.js";
import { SpriteRendererComponent } from "../components/SpriteRendererComponent.js";
import { TransformComponent } from "../components/TransformComponent.js";
import { SignalReceiverComponent } from "../components/SignalReceiverComponent.js";
import { ArrowRendererComponent } from "../components/ArrowRendererComponent.js";
import { evaluateAST } from '../utils/logicEvaluator.js';
import { state } from '../editor.js';

export class Stairs extends Entity {
    static getName() {
        return 'stairs';
    }

    static getDisplayName() {
        return 'Stairs';
    }

    constructor(options = {}) {
        super(options);
        this.inverted = options.inverted || false;
        this.isPowered = false;
        this.direction = options.direction || 0; // 0: Right, 1: Down, 2: Left, 3: Up
        this.addComponent(new BoxColliderComponent({ width: 120, height: 80 }));
        // Intentionally ommiting the `sprite` so `SpriteRendererComponent` falls back to rect drawing
        this.addComponent(new SpriteRendererComponent({ 
            colorTint: '#55ccff',
            dest: { x: 0, y: 0, w: 120, h: 80 }
        }));
        this.logic = options.logic || "TRUE";
        this.addComponent(new SignalReceiverComponent());
        this.addComponent(new ArrowRendererComponent({ color: '#ffffff' }));

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
        return [
            { property: 'inverted', type: 'checkbox', label: 'Inverted' },
            { property: 'direction', type: 'text', label: 'Direction (0=R, 1=D, 2=L, 3=U)' },
            { property: 'logic', type: 'logic', label: 'Logic' }
        ];
    }

    setEditableProperty(key, value) {
        if (key === 'direction') {
            value = parseInt(value);
            if (isNaN(value)) value = 0;
            value = value % 4;
        }
        super.setEditableProperty(key, value);
        if (key === 'inverted' || key === 'direction') {
            this.updateVisuals();
        }
    }

    updateVisuals() {
        const transform = this.getComponent(TransformComponent);
        if (transform) {
            transform.rotation = this.direction * Math.PI / 2;
        }

        const collider = this.getComponent(BoxColliderComponent);
        if (collider) {
            // Swap width and height if rotated 90 or 270 degrees
            if (this.direction === 1 || this.direction === 3) {
                collider.width = 80;
                collider.height = 120;
            } else {
                collider.width = 120;
                collider.height = 80;
            }
        }

        const renderer = this.getComponent(SpriteRendererComponent);
        if (renderer) {
            const isUp = this.inverted ? !this.isPowered : this.isPowered;
            if (isUp) {
                renderer.colorTint = '#55ccff';
                renderer.isOutline = false;
            } else {
                renderer.colorTint = '#55ccff';
                renderer.isOutline = true;
            }
        }
    }

    evaluateLogic() {
        const powered = evaluateAST(this.logic, state);
        if (powered !== this.isPowered) {
            this.isPowered = powered;
            this.updateVisuals();
        }
    }

    onReceiverReqsMet() {
        // Obsolete with new logic system, but kept for old levels maybe
        this.isPowered = true;
        this.updateVisuals();
    }

    onReceiverReqsUnmet() {
        // Obsolete
        this.isPowered = false;
        this.updateVisuals();
    }
}
