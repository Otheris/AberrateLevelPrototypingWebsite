import { AberrateCubeComponent } from '../components/AberrateCubeComponent.js';
import { BoxColliderComponent } from '../components/BoxColliderComponent.js';
import { TransformComponent } from '../components/TransformComponent.js';
import { callMethodOnEntities } from '../editor.js';
import { Tool } from './Tool.js';
import { Box } from '../entities/Box.js';


export class PlaymodeTool extends Tool {
  getName() {
    return 'playmode';
  }

  onEnter(state) {
    console.log('Playmode tool activated');
  }

  onExit(state) {
    console.log('Playmode tool deactivated');
  }

  onMouseDown(state, button) {
    let entityAtMouse = this.findEntityAtMouse(state, state.playmodeEntities.filter(e => e instanceof Box));
    if (entityAtMouse) {
      state.playmodeDraggingEntity = entityAtMouse;
      state.highlightedEntities = [entityAtMouse];
      console.log('Started dragging entity in playmode:', entityAtMouse.getName());
    }
  }

  onMouseMove(state) {
    if (state.playmodeDraggingEntity) {
      const transform = state.playmodeDraggingEntity.getComponent(TransformComponent);
      if (transform) {
        transform.x += state.mouse.deltaX / state.camera.zoom;
        transform.y += state.mouse.deltaY / state.camera.zoom;
      }

      // check for overlap entities with held entity
      state.highlightedEntities = [state.playmodeDraggingEntity];
      state.playmodeDraggingOverlaps = [];
      const collider = state.playmodeDraggingEntity.getComponent(BoxColliderComponent);
      if (collider) {
        state.playmodeEntities.forEach(other => {
          if (other === state.playmodeDraggingEntity) {
            return;
          }
          const otherCollider = other.getComponent(BoxColliderComponent);
          if (otherCollider) {
            if (collider.intersects(otherCollider)) {
              state.highlightedEntities.push(other);
              state.playmodeDraggingOverlaps.push(other);
            }
          }
        });
      }
    }
  }

  onMouseUp(state, button) {
    if (state.playmodeDraggingEntity) {

      console.log("onmmouseup: " + state.playmodeDraggingOverlaps.length + " overlaps");
      // if going to drop held entity onto any other entities
      if (state.playmodeDraggingOverlaps.length > 0) {
        this.dropHeldEntity(state);
      }

      console.log('Stopped dragging entity in playmode:', state.playmodeDraggingEntity?.getName());
      state.playmodeDraggingEntity = null;
      state.highlightedEntities = [];
    }
  }

  dropHeldEntity(state) {
    if (!state.recipes) return;

    if (state.playmodeDraggingEntity instanceof Box) {
      const draggedBox = state.playmodeDraggingEntity;
      const overlaps = state.playmodeDraggingOverlaps.filter(e => e instanceof Box);

      if (overlaps.length === 0) return;

      const allInvolvedBoxes = [draggedBox, ...overlaps];
      const involvedTypes = allInvolvedBoxes.map(b => b.typeName);

      // Sort for comparison
      const involvedSorted = [...involvedTypes].sort();

      // Find a recipe that matches these exact inputs
      const recipe = state.recipes.find(r => {
        if (r.inputs.length !== involvedSorted.length) return false;
        const recipeInputsSorted = [...r.inputs].sort();
        return involvedSorted.every((val, index) => val === recipeInputsSorted[index]);
      });

      if (recipe && recipe.outputs.length > 0) {
        console.log(`Fusing ${involvedTypes.join(', ')} into ${recipe.outputs.join(', ')}`);

        // Remove all involved boxes
        allInvolvedBoxes.forEach(b => {
          state.removePlaymodeEntityFromState(b);
        });

        // Spawn the output boxes at the dragged box's position
        const transform = draggedBox.getComponent(TransformComponent);
        const spawnX = transform ? transform.x : 0;
        const spawnY = transform ? transform.y : 0;

        let offsetX = 0;
        recipe.outputs.forEach(outputType => {
            const newBox = new Box({ typeName: outputType });
            const newTransform = newBox.getComponent(TransformComponent);
            if (newTransform) {
                newTransform.x = spawnX + offsetX;
                newTransform.y = spawnY;
            }
            state.addPlaymodeEntityToState(newBox);
            offsetX += 50;
        });

        // Clear references since the dragged entity is destroyed
        state.playmodeDraggingEntity = null;
        state.highlightedEntities = [];
      }
    }
  }

  onKeyDown(state, key) {
    if (key === 'r') {
      callMethodOnEntities('aberrate', state);
    }
  }

  onKeyUp(state, key) {
  }
}
