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
    let entityAtMouse = this.findEntityAtMouse(state, state.playmodeEntities.filter(e => {
        if (e instanceof Box) {
            // Cannot pick up outlined/inactive cubes
            if (e.aberrationState === 'childrenActive' || e.aberrationState === 'inactiveChild') return false;
            return true;
        }
        return false;
    }));
    if (entityAtMouse) {
      state.playmodeDraggingEntity = entityAtMouse;
      state.highlightedEntities = [entityAtMouse];
      console.log('Started dragging entity in playmode:', entityAtMouse.getName());

      // Update buttons when a cube is picked up
      state.playmodeEntities.forEach(e => {
        if (typeof e.checkPowered === 'function') e.checkPowered();
      });
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

      // Update buttons when a cube is dropped
      state.playmodeEntities.forEach(e => {
        if (typeof e.checkPowered === 'function') e.checkPowered();
      });
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

        // Handle parent relationships
        let parentBoxes = allInvolvedBoxes.map(b => b.parentBox).filter(p => p !== null);
        // Unique parents
        parentBoxes = [...new Set(parentBoxes)];

        let parentDataToInherit = null;

        if (parentBoxes.length > 1) {
            // Components have different parents: delete all parents, siblings become orphaned
            parentBoxes.forEach(parent => {
                state.removePlaymodeEntityFromState(parent);
                parent.childBoxes.forEach(sibling => {
                    if (!allInvolvedBoxes.includes(sibling)) {
                        sibling.aberrationState = 'orphaned';
                        sibling.parentBox = null;
                        sibling.updateVisuals();
                    }
                });
            });
        } else if (parentBoxes.length === 1) {
            const parent = parentBoxes[0];
            const siblings = parent.childBoxes;
            const otherSiblings = siblings.filter(s => !allInvolvedBoxes.includes(s));

            if (otherSiblings.length === 0) {
                // Components all have same parent, NO other siblings
                // delete old parent, new fused cube gets original parent's parent data
                parentDataToInherit = parent.parentBox;
                state.removePlaymodeEntityFromState(parent);
            } else {
                // Components all have same parent, HAS other siblings
                // delete old parent, create new parent cube, old siblings become orphans
                state.removePlaymodeEntityFromState(parent);
                otherSiblings.forEach(sibling => {
                    sibling.aberrationState = 'orphaned';
                    sibling.parentBox = null;
                    sibling.updateVisuals();
                });

                // Spawn new parent cube
                const draggedTransform = draggedBox.getComponent(TransformComponent);
                const spawnX = draggedTransform ? draggedTransform.x : 0;
                const spawnY = draggedTransform ? draggedTransform.y : 0;

                const newParentType = recipe.outputs[0]; // Assuming first output is the new parent type
                const newParent = new Box({
                    typeName: newParentType,
                    parentBox: parent.parentBox,
                    aberrationState: 'parentActive'
                });
                const pTransform = newParent.getComponent(TransformComponent);
                if (pTransform) {
                    pTransform.x = spawnX;
                    pTransform.y = spawnY;
                }
                state.addPlaymodeEntityToState(newParent);
            }
        }

        // Remove all involved boxes
        allInvolvedBoxes.forEach(b => {
          state.removePlaymodeEntityFromState(b);
        });

        // Spawn the output boxes at the dragged box's position
        const transform = draggedBox.getComponent(TransformComponent);
        const spawnX = transform ? transform.x : 0;
        const spawnY = transform ? transform.y : 0;

        // Skip spawning standard outputs if we just spawned a new parent cube
        // because the new parent cube ALREADY represents the recipe outputs.
        const didSpawnNewParent = parentBoxes.length === 1 && parentBoxes[0].childBoxes.filter(s => !allInvolvedBoxes.includes(s)).length > 0;

        if (!didSpawnNewParent) {
            let offsetX = 0;
            recipe.outputs.forEach(outputType => {
                const newBox = new Box({
                    typeName: outputType,
                    parentBox: parentDataToInherit,
                    aberrationState: 'normal'
                });
                const newTransform = newBox.getComponent(TransformComponent);
                if (newTransform) {
                    newTransform.x = spawnX + offsetX;
                    newTransform.y = spawnY;
                }
                state.addPlaymodeEntityToState(newBox);

                // If the new box inherited a parent, we need to register it as a child
                if (parentDataToInherit) {
                    parentDataToInherit.childBoxes.push(newBox);
                }

                offsetX += 50;
            });
        }

        // Clear references since the dragged entity is destroyed
        state.playmodeDraggingEntity = null;
        state.highlightedEntities = [];
      }
    }
  }

  onKeyDown(state, key) {
    if (key === 'r') {
      // Only aberrate boxes that are not inactive children (since they are driven by the parent)
      state.playmodeEntities.forEach(e => {
          if (e instanceof Box && e.aberrationState !== 'inactiveChild') {
              if (typeof e.aberrate === 'function') e.aberrate(state);
              else {
                  // Fallback for components
                  const comp = e.getComponent(AberrateCubeComponent);
                  if (comp) comp.aberrate(state);
              }
          }
      });
    }
  }

  onKeyUp(state, key) {
  }
}
