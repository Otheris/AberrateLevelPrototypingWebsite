import { Component } from "./Component.js";

/**
 * Sprite renderer component for drawing entities.
 */
export class SpriteRendererComponent extends Component {
    constructor({ sprite = null, colorTint = '#ffffff', src = {x:0, y:0, w:40, h:40}, dest = {x:0, y:0, w:40, h:40}} = {}) {
        super();
        this.sprite = sprite;
        this.colorTint = colorTint;
        this.image = null;
        this.src = src;
        this.dest = dest;
    }

    clone() {
        const copy = super.clone();
        copy.image = null;
        return copy;
    }

    draw(ctx, transform) {
        this.drawSpecific(ctx, transform, this.src);
    }

    drawSpecific(ctx, transform, source = {x: 0, y: 0, w: 0, h: 0}) {
        // Center sprite on entity position
        const x = transform.x + this.dest.x - this.dest.w / 2;
        const y = transform.y + this.dest.y - this.dest.h / 2;
        const w = this.dest.w;
        const h = this.dest.h;

        ctx.save(); // Save canvas state

        // Apply transformations: translate to center, rotate, scale, translate back
        ctx.translate(transform.x, transform.y); // Move origin to entity center
        ctx.rotate(transform.rotation); // Rotate coordinate system
        ctx.scale(transform.scaleX, transform.scaleY); // Scale coordinate system
        ctx.translate(-transform.x, -transform.y); // Move origin back

        if (this.sprite) {
            // Lazy-load the image if not already loaded
            if (!this.image) {
                this.image = new Image();
                this.image.src = this.sprite;
            }
            // Draw loaded image if ready, otherwise fallback to colored rect
            if (this.image.complete && this.image.naturalWidth > 0) {
                ctx.drawImage(this.image, source.x, source.y, source.w, source.h, x, y, w, h);
            } else {
                if (this.colorTint.startsWith('rgba')) {
                    ctx.strokeStyle = this.colorTint;
                    ctx.strokeRect(x, y, w, h);
                } else {
                    ctx.fillStyle = this.colorTint;
                    ctx.fillRect(x, y, w, h);
                }
            }
        } else {
            // No sprite specified, draw colored rectangle
            if (this.colorTint.startsWith('rgba')) {
                ctx.strokeStyle = this.colorTint;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
            } else {
                ctx.fillStyle = this.colorTint;
                ctx.fillRect(x, y, w, h);
            }
        }

        ctx.restore(); // Restore canvas state
    }
}