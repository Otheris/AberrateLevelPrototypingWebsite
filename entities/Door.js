import { BoxColliderComponent } from "../components/BoxColliderComponent.js";
import { Entity } from "./Entity.js";
import { SpriteRendererComponent } from "../components/SpriteRendererComponent.js";
import { TextRendererComponent } from "../components/TextRendererComponent.js";
import { evaluateAST } from '../utils/logicEvaluator.js';
import { state } from '../editor.js';

export class Door extends Entity {
    static getName() {
        return 'door';
    }

    static getDisplayName() {
        return 'Door';
    }

    constructor(options = {}) {
        super(options);
        this.name = options.name || "d" + this.id;
        this.logic = options.logic || null; // Will hold AST like { op: "AND", args: ["b1", "b2"] }

        this.addComponent(new BoxColliderComponent({ width: 40, height: 40 }));
        this.addComponent(new SpriteRendererComponent({
            colorTint: '#ffff00',
            dest: { x: 0, y: 0, w: 40, h: 40 }
        }));
        this.addComponent(new TextRendererComponent({ text: this.name, offsetY: -30 }));

        this.addComponent({
            entity: null,
            clone: function() {
                return { entity: null, onPlayModeUpdate: this.onPlayModeUpdate };
            },
            onPlayModeUpdate: function(dt) { this.entity.evaluateLogic(dt); }
        });
    }

    getEditableProperties() {
        return [
            { property: 'name', type: 'text', label: 'Name (ID)' },
            { property: 'logic', type: 'logic', label: 'Logic' }
        ];
    }

    evaluateLogic() {
        const powered = evaluateAST(this.logic, state);
        if (powered !== this.isPowered) {
            this.isPowered = powered;
            this.updateVisuals();
        }
    }

    updateVisuals() {
        const renderer = this.getComponent(SpriteRendererComponent);
        if (renderer) {
            if (this.isPowered) {
                renderer.colorTint = '#ffff00';
            } else {
                renderer.colorTint = 'rgba(255, 255, 0, 0.3)';
            }
        }
    }

    setEditableProperty(key, value) {
        super.setEditableProperty(key, value);
        if (key === 'name') {
            const textComp = this.getComponent(TextRendererComponent);
            if (textComp) {
                textComp.text = value;
            }
        }
    }
}
