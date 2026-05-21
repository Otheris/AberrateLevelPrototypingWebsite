import { Component } from "./Component.js";
import { Box } from "../entities/Box.js";
import { TransformComponent } from "../components/TransformComponent.js";

export class AberrateCubeComponent extends Component {    
  constructor() {
    super();
  }

  aberrate(state) {
    if (!state.recipes) return;

    if (this.entity.aberrationState === 'normal') {
      // Find a 1:N recipe for this cube's typeName
      const typeName = this.entity.typeName;
      const defuseRecipe = state.recipes.find(r => r.inputs.length === 1 && r.inputs[0] === typeName && r.outputs.length > 0);

      if (defuseRecipe) {
        console.log(`AberrateCubeComponent: Defusing cube ${typeName} into ${defuseRecipe.outputs.join(', ')}`);

        const parentTransform = this.entity.getComponent(TransformComponent);
        let offsetX = -50;

        this.entity.aberrationState = 'childrenActive';
        this.entity.childBoxes = [];
        this.entity.updateVisuals();

        defuseRecipe.outputs.forEach(outputType => {
          const child = new Box({ typeName: outputType, parentBox: this.entity, aberrationState: 'normal' });
          const childTransform = child.getComponent(TransformComponent);
          if (childTransform && parentTransform) {
            childTransform.x = parentTransform.x + offsetX;
            childTransform.y = parentTransform.y;
            state.addPlaymodeEntityToState(child);
            this.entity.childBoxes.push(child);
            console.log(`AberrateCubeComponent: Spawned child cube ${outputType} at offset (${offsetX}, 0)`);
          }
          offsetX += 50;
          if (offsetX === 0) offsetX += 50; // skip spawning directly on top of parent
        });
      }
    } else if (this.entity.aberrationState === 'childrenActive') {
      // If we are a parent and our children are active, toggle them off
      this.entity.aberrationState = 'parentActive';
      this.entity.updateVisuals();

      this.entity.childBoxes.forEach(child => {
        child.aberrationState = 'inactiveChild'; // Outlined, disabled
        child.updateVisuals();
      });
    } else if (this.entity.aberrationState === 'parentActive') {
      // Switch to children active
      this.entity.aberrationState = 'childrenActive'; // Outlined, disabled
      this.entity.updateVisuals();

      this.entity.childBoxes.forEach(child => {
        child.aberrationState = 'normal'; // The child itself is active
        child.updateVisuals();
      });
    }
    // 'orphaned' state does nothing
  }

  onEnterPlayMode() {
  }

  onPlayModeUpdate(dt) {
  }

  onExitPlayMode() {
  }
}
