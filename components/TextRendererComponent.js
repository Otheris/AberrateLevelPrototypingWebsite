import { Component } from "./Component.js";

/**
 * Text renderer component for drawing text on entities.
 */
export class TextRendererComponent extends Component {
    constructor({ text = '', color = '#ffffff', font = '16px Arial', offsetY = -30 } = {}) {
        super();
        this.text = text;
        this.color = color;
        this.font = font;
        this.offsetY = offsetY;
    }

    clone() {
        return super.clone();
    }

    draw(ctx, transform) {
        if (!this.text) return;
        ctx.save();
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline for visibility
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
        ctx.strokeText(this.text, transform.x, transform.y + this.offsetY);
        ctx.fillText(this.text, transform.x, transform.y + this.offsetY);
        ctx.restore();
    }
}
