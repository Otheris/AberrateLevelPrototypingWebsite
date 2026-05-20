import { BoxColliderComponent } from "../components/BoxColliderComponent.js";
import { Entity } from "./Entity.js";
import { SpriteRendererComponent } from "../components/SpriteRendererComponent.js";

export class Player extends Entity {
    static getName() {
        return 'player';
    }

    static getDisplayName() {
        return 'Player';
    }

    constructor(options = {}) {
        super(options);
        this.addComponent(new BoxColliderComponent({ width: 40, height: 40 }));
        this.addComponent(new SpriteRendererComponent({
            colorTint: '#00ff00',
            dest: { x: 0, y: 0, w: 40, h: 40 }
        }));
    }
}
