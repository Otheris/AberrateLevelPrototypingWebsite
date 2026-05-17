import { AberrateCubeComponent } from '../components/AberrateCubeComponent.js';
import { BoxColliderComponent } from '../components/BoxColliderComponent.js';
import { TransformComponent } from '../components/TransformComponent.js';
import { callMethodOnEntities, onEntityHotkeyPressed } from '../editor.js';
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
      const aberrateComponent = e.getComponent(AberrateCubeComponent);
      if (aberrateComponent) {
        return aberrateComponent.aberrated === false;
      }
      return false;
    }));
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

  onMouseUp(state, button) {
    if (state.playmodeDraggingEntity) {

      console.log("onmmouseup: " + state.playmodeDraggingOverlaps.length + " overlaps");
      // if going to drop held entity onto any other entities
      if (state.playmodeDraggingOverlaps.length > 0) {
        this.dropHeldEntity(state);
      }

      console.log('Stopped dragging entity in playmode:', state.playmodeDraggingEntity.getName());
      state.playmodeDraggingEntity = null;
      state.highlightedEntities = [];

      // Update buttons state
      state.playmodeEntities.forEach(entity => {
          if (entity.getName() === 'button' && typeof entity.checkPowered === 'function') {
              entity.checkPowered(0);
          }
      });
    }
  }

  dropHeldEntity(state) {
    if (state.playmodeDraggingEntity instanceof Box) {
      const box = state.playmodeDraggingEntity.getComponent?.(AberrateCubeComponent);
      const otherBoxComponents = [];
      console.log('dropheld: ' + state.playmodeDraggingOverlaps);
      state.playmodeDraggingOverlaps.forEach(entity => {
        if (entity instanceof Box) {
          const aberrateComponent = entity.getComponent?.(AberrateCubeComponent);
          if (aberrateComponent) {
            if (aberrateComponent.aberrated) return; // don't allow fusing with aberrated cubes
            otherBoxComponents.push(aberrateComponent);
          }
        }
      });

      // attempt to fuse held box with boxes being dropped on
      if (otherBoxComponents.length > 0) {
        otherBoxComponents.forEach(b => {
          // will propagate fusion to all connected boxes, so only need to call on one of them
          console.log(`Attempting to fuse box with color ${box.color} with box with color ${b.colorId}`);
          box.tryFuseWith(state, b);
        })
      }
    }
  }

  onKeyDown(state, key) {
    if (key === 'r') {
      callMethodOnEntities('aberrate', state);
    }
  }

  onKeyUp(state, key) {
    // TODO: Implement keyboard shortcuts for select tool
  }
}
