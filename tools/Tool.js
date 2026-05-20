import { TransformComponent } from '../components/TransformComponent.js';
import { BoxColliderComponent } from '../components/BoxColliderComponent.js';
import { computeNodes, getPointNode } from '../utils/nodeUtils.js';

/**
 * Base Tool class for the strategy pattern
 * Defines the interface for tool behavior
 */
export class Tool {
  /**
   * Called when a mouse button is pressed
   * @param {Object} state - The editor state
   * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
   */
  onMouseDown(state, button) {}

  /**
   * Called when the mouse moves
   * @param {Object} state - The editor state
   */
  onMouseMove(state) {}

  /**
   * Called when a mouse button is released
   * @param {Object} state - The editor state
   * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
   */
  onMouseUp(state, button) {}

  /**
   * Called when a key is pressed
   * @param {Object} state - The editor state
   * @param {string} key - The key that was pressed
   */
  onKeyDown(state, key) {}

  /**
   * Called when a key is released
   * @param {Object} state - The editor state
   * @param {string} key - The key that was released
   */
  onKeyUp(state, key) {}

  /**
   * Find the first entity under the mouse cursor.
   * @param {Object} state - The editor state
   * @returns {Object|null} The entity under the mouse, or null.
   */
  findEntityAtMouse(state, list = state.entities) {
    for (const entity of list) {
      const transform = entity.getComponent(TransformComponent);
      const collider = entity.getComponent(BoxColliderComponent);
      if (transform && collider && collider.pointIntersect(state.mouse.worldX, state.mouse.worldY)) {
        return entity;
      }
    }
    return null;
  }

  findRoomNodeAtMouse(state) {
    const nodes = computeNodes(state);
    return getPointNode(nodes, state.mouse.worldX, state.mouse.worldY);
  }

  /**
   * Called when this tool becomes active
   * @param {Object} state - The editor state
   */
  onEnter(state) {}

  /**
   * Called when this tool becomes inactive
   * @param {Object} state - The editor state
   */
  onExit(state) {}

  /**
   * Get the name of this tool (for debugging/UI purposes)
   * @return {string} The name of the tool
   */
  getName() {}
}