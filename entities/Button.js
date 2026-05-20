import { BoxColliderComponent } from "../components/BoxColliderComponent.js";
import { Entity } from "./Entity.js";
import { SpriteRendererComponent } from "../components/SpriteRendererComponent.js";
import { TransformComponent } from "../components/TransformComponent.js";
import { SignalSenderComponent } from "../components/SignalSenderComponent.js";
import { TextRendererComponent } from "../components/TextRendererComponent.js";
import { Box } from "./Box.js";
import { state } from "../editor.js";

export class Button extends Entity {
    static getName() {
        return 'button';
    }

    static getDisplayName() {
        return 'Button';
    }

    constructor(options = {}) {
        super(options);
        this.whiteOnly = options.whiteOnly || false;
        this.name = options.name || "b" + this.id;
        this.addComponent(new BoxColliderComponent({ width: 60, height: 60 }));
        this.addComponent(new SpriteRendererComponent({
            sprite: 'sprites/cubebutton.png',
            colorTint: '#ff5555',
            src: { x: 0, y: 0, w: 208, h: 208 },
            dest: { x: 0, y: 0, w: 60, h: 60 }
        }));
        this.addComponent(new SignalSenderComponent());

        const textComp = new TextRendererComponent({ text: this.name, offsetY: -40 });
        this.addComponent(textComp);

        this.addComponent({
            entity: null,
            clone: function() {
                return { entity: null, onPlayModeUpdate: this.onPlayModeUpdate };
            },
            onPlayModeUpdate: function(dt) { this.entity.checkPowered(dt); }
        });

        // Timeout to wait for Transform to be added by super class if not yet
        setTimeout(() => this.updateVisuals(), 0);
    }

    getEditableProperties() {
        return [
            { property: 'whiteOnly', type: 'checkbox', label: 'White Only' },
            { property: 'name', type: 'text', label: 'Name (ID)' }
        ];
    }

    setEditableProperty(key, value) {
        super.setEditableProperty(key, value);
        if (key === 'whiteOnly') {
            this.updateVisuals();
        } else if (key === 'name') {
            const textComp = this.getComponent(TextRendererComponent);
            if (textComp) {
                textComp.text = value;
            }
        }
    }

    updateVisuals() {
        const transform = this.getComponent(TransformComponent);
        if (transform) {
            transform.rotation = this.whiteOnly ? Math.PI / 4 : 0;
        }
    }

    checkPowered(dt) {
        const myCollider = this.getComponent(BoxColliderComponent);
        const myTransform = this.getComponent(TransformComponent);
        const sender = this.getComponent(SignalSenderComponent);
        if (!myCollider || !myTransform || !sender) return;

        let isPowered = false;

        const editorState = state || { playmodeEntities: [] };
        const playmodeEntities = editorState.playmodeEntities || editorState.entities || [];
        playmodeEntities.forEach(entity => {
            if (entity instanceof Box) {
                const boxCollider = entity.getComponent(BoxColliderComponent);
                const boxTransform = entity.getComponent(TransformComponent);
                if (boxCollider && boxTransform) {
                    // Manual AABB intersection just to be perfectly safe
                    const minX1 = myTransform.x - myCollider.width/2;
                    const maxX1 = myTransform.x + myCollider.width/2;
                    const minY1 = myTransform.y - myCollider.height/2;
                    const maxY1 = myTransform.y + myCollider.height/2;

                    const minX2 = boxTransform.x - boxCollider.width/2;
                    const maxX2 = boxTransform.x + boxCollider.width/2;
                    const minY2 = boxTransform.y - boxCollider.height/2;
                    const maxY2 = boxTransform.y + boxCollider.height/2;

                    if (minX1 < maxX2 && maxX1 > minX2 && minY1 < maxY2 && maxY1 > minY2) {
                        if (!this.whiteOnly || entity.color === Box.BOX_COLOR_WHITE) {
                            isPowered = true;
                        }
                    }
                }
            }
        });

        sender.setSignalState(isPowered ? 1 : 0);
    }
}
