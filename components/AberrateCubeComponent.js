import { Component } from "./Component.js";
import { Box } from "../entities/Box.js";
import { TransformComponent } from "../components/TransformComponent.js";

export class AberrateCubeComponent extends Component {    
  constructor() {
    super();
  }

  aberrate(state) {
    if (!state.recipes) return;

    // Find a 1:N recipe for this cube's typeName
    const typeName = this.entity.typeName;
    const defuseRecipe = state.recipes.find(r => r.inputs.length === 1 && r.inputs[0] === typeName && r.outputs.length > 0);
    
    if (defuseRecipe) {
      console.log(`AberrateCubeComponent: Defusing cube ${typeName} into ${defuseRecipe.outputs.join(', ')}`);

      const parentTransform = this.entity.getComponent(TransformComponent);
      let offsetX = -50;

      defuseRecipe.outputs.forEach(outputType => {
        const child = new Box({ typeName: outputType });
        const childTransform = child.getComponent(TransformComponent);
        if (childTransform && parentTransform) {
          childTransform.x = parentTransform.x + offsetX;
          childTransform.y = parentTransform.y;
          state.addPlaymodeEntityToState(child);
          console.log(`AberrateCubeComponent: Spawned child cube ${outputType} at offset (${offsetX}, 0)`);
        }
        offsetX += 50;
        if (offsetX === 0) offsetX += 50; // skip spawning directly on top of parent
      });

      state.removePlaymodeEntityFromState(this.entity);
    }
  }

  onEnterPlayMode() {
  }

  onPlayModeUpdate(dt) {
  }

  onExitPlayMode() {
  }
}
