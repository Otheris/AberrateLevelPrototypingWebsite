import { Component } from "./Component.js";

/**
 * Renders an arrow indicating direction.
 */
export class ArrowRendererComponent extends Component {
    constructor({ color = '#ffffff', length = 30 } = {}) {
        super();
        this.color = color;
        this.length = length;
    }

    clone() {
        return super.clone();
    }

    draw(ctx, transform, direction = 0) { // direction 0=right, 1=down, 2=left, 3=up
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(direction * Math.PI / 2);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Arrow pointing right
        ctx.moveTo(-this.length / 2, 0);
        ctx.lineTo(this.length / 2, 0);
        ctx.lineTo(this.length / 2 - 10, -10);
        ctx.moveTo(this.length / 2, 0);
        ctx.lineTo(this.length / 2 - 10, 10);
        ctx.stroke();

        ctx.restore();
    }
}
