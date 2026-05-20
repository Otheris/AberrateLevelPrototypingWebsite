import { BoxColliderComponent } from "../components/BoxColliderComponent.js";
import { Entity } from "./Entity.js";
import { SpritesheetRendererComponent } from "../components/SpritesheetRendererComponent.js";
import { AberrateCubeComponent } from "../components/AberrateCubeComponent.js";
import { state } from "../editor.js";

export class Box extends Entity {
    static getName() {
        return 'box';
    }

    static getDisplayName() {
        return 'Cube';
    }

    static BOX_SPRITE_SHEET_PATH = 'sprites/cubes_sprite_sheet.png';

    constructor(options = {}) {
        super(options);
        this.typeName = options.typeName || 'White';
        this.addComponent(new BoxColliderComponent({ width: 40, height: 45 }));
        const renderer = new SpritesheetRendererComponent({ 
            sprite: Box.BOX_SPRITE_SHEET_PATH, 
            colorTint: '#ffffff', 
            src: { x: 0, y: 0, w: 160, h: 160 }, 
            dest: { x: 0, y: 0, w: 50, h: 50 },
            sheetColumns: 4,
        });
        this.addComponent(renderer);
        // We always use the white sprite (index 0) and tint it
        renderer.setSpriteIndex(0);

        // This component was probably expecting the old numeric IDs.
        // It might not work perfectly with new dynamic strings, but we keep it for now.
        this.addComponent(new AberrateCubeComponent({ colorId: 0 }));

        // Wait a tick for editor state to be fully loaded if this is during import
        setTimeout(() => this.updateVisuals(), 0);

        // Listen for global cube type changes
        this._updateVisualsBound = () => this.updateVisuals();
        window.addEventListener('cubeTypesChanged', this._updateVisualsBound);
    }

    destroy() {
        if (this._updateVisualsBound) {
            window.removeEventListener('cubeTypesChanged', this._updateVisualsBound);
        }
        if (super.destroy) super.destroy();
    }

    getEditableProperties() {
        const types = state.cubeTypes ? state.cubeTypes.map(t => t.name) : ['White', 'Red', 'Blue'];
        return [
            { property: 'typeName', type: 'dropdown', label: 'Cube Type', options: types }
        ];
    }

    setEditableProperty(key, value) {
        super.setEditableProperty(key, value);
        if (key === 'typeName') {
            this.updateVisuals();
        }
    }

    updateVisuals() {
        const renderer = this.getComponent(SpritesheetRendererComponent);
        if (renderer && state.cubeTypes) {
            const typeDef = state.cubeTypes.find(t => t.name === this.typeName);
            if (typeDef) {
                renderer.colorTint = typeDef.color;
            } else {
                renderer.colorTint = '#ffffff';
            }
        }
    }

    // For backwards compatibility during load where io.js uses setCubeColor
    setCubeColor(color) {
        // Map old numeric constants to default names to handle old maps gracefully
        if (color === 0) this.typeName = 'White';
        else if (color === 1) this.typeName = 'Red';
        else if (color === 2) this.typeName = 'Blue';
        // Otherwise default
        else this.typeName = 'White';
        this.updateVisuals();
    }

    getColor() {
        return this.typeName;
    }
}
