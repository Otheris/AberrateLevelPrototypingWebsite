import { Component } from "./Component.js";
import { TransformComponent } from "./TransformComponent.js";

/**
 * Box collider component for point and AABB intersection.
 */
export class BoxColliderComponent extends Component {
    constructor({ offsetX = 0, offsetY = 0, width = 40, height = 40 } = {}) {
        super();
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.width = width;
        this.height = height;
    }

    getBounds() {
        const transform = this.entity?.getComponent(TransformComponent);
        if (!transform) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        // Return degenerate bounds if the entity is an inactive box
        if (this.entity && (this.entity.aberrationState === 'childrenActive' || this.entity.aberrationState === 'inactiveChild')) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        const x = transform.x + this.offsetX - this.width / 2;
        const y = transform.y + this.offsetY - this.height / 2;
        return {
            minX: x,
            minY: y,
            maxX: x + this.width,
            maxY: y + this.height,
        };
    }

    pointIntersect(px, py) {
        const b = this.getBounds();
        return px >= b.minX && px <= b.maxX && py >= b.minY && py <= b.maxY;
    }

    intersects(otherBoxCollider) {
        if (!(otherBoxCollider instanceof BoxColliderComponent)) {
            return false;
        }
        const b = otherBoxCollider.getBounds();
        return this.aabbIntersect(b.minX, b.maxX, b.minY, b.maxY);
    }

    aabbIntersectCorners(x1, x2, y1, y2) {
        let minX = Math.min(x1, x2);
        let maxX = Math.max(x1, x2);
        let minY = Math.min(y1, y2);
        let maxY = Math.max(y1, y2);
        return this.aabbIntersect(minX, maxX, minY, maxY);
    }

    aabbIntersect(minX, maxX, minY, maxY) {
        const other = this.getBounds();
        return minX < other.maxX && maxX > other.minX && minY < other.maxY && maxY > other.minY;
    }
}
