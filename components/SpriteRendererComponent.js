import { Component } from "./Component.js";

/**
 * Sprite renderer component for drawing entities.
 */
export class SpriteRendererComponent extends Component {
    constructor({ sprite = null, colorTint = '#ffffff', src = {x:0, y:0, w:40, h:40}, dest = {x:0, y:0, w:40, h:40}} = {}) {
        super();
        this.sprite = sprite;
        this.colorTint = colorTint;
        this.isOutline = false;
        this.image = null;
        this.tintedCanvas = null;
        this.lastTint = null;
        this.lastSourceStr = null;
        this.src = src;
        this.dest = dest;
    }

    clone() {
        const copy = super.clone();
        copy.image = null;
        copy.tintedCanvas = null;
        copy.lastTint = null;
        copy.lastSourceStr = null;
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
                if (this.isOutline && !this.isDotted) {
                    ctx.strokeStyle = this.colorTint;
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x, y, w, h);
                } else {
                    const sourceStr = `${source.x},${source.y},${source.w},${source.h}`;
                    if (!this.tintedCanvas || this.lastTint !== this.colorTint || this.lastSourceStr !== sourceStr) {
                        // Create a temporary canvas to apply the tint (cache it)
                        this.tintedCanvas = document.createElement('canvas');
                        this.tintedCanvas.width = source.w;
                        this.tintedCanvas.height = source.h;
                        const offscreenCtx = this.tintedCanvas.getContext('2d');

                        // Draw the original sprite onto the temporary canvas
                        offscreenCtx.drawImage(this.image, source.x, source.y, source.w, source.h, 0, 0, source.w, source.h);

                        // Apply the tint using composite operation
                        offscreenCtx.globalCompositeOperation = 'multiply';
                        offscreenCtx.fillStyle = this.colorTint;
                        offscreenCtx.fillRect(0, 0, source.w, source.h);

                        // Restore alpha channel using destination-in so transparent parts remain transparent
                        offscreenCtx.globalCompositeOperation = 'destination-in';
                        offscreenCtx.drawImage(this.image, source.x, source.y, source.w, source.h, 0, 0, source.w, source.h);

                        this.lastTint = this.colorTint;
                        this.lastSourceStr = sourceStr;
                    }

                    // Draw the tinted image back to the main canvas
                    ctx.drawImage(this.tintedCanvas, 0, 0, source.w, source.h, x, y, w, h);

                    if (this.isDotted) {
                        ctx.strokeStyle = this.colorTint;
                        ctx.lineWidth = 4;
                        ctx.setLineDash([8, 8]);
                        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
                        ctx.setLineDash([]);
                    }
                }
            } else {
                if (this.isOutline && !this.isDotted) {
                    ctx.strokeStyle = this.colorTint;
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x, y, w, h);
                } else if (this.colorTint.startsWith('rgba')) {
                    ctx.strokeStyle = this.colorTint;
                    ctx.strokeRect(x, y, w, h);
                } else {
                    ctx.fillStyle = this.colorTint;
                    ctx.fillRect(x, y, w, h);
                    if (this.isDotted) {
                        ctx.strokeStyle = this.colorTint;
                        ctx.lineWidth = 4;
                        ctx.setLineDash([8, 8]);
                        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
                        ctx.setLineDash([]);
                    }
                }
            }
        } else {
            // No sprite specified, draw colored rectangle or outline
            if (this.isOutline && !this.isDotted) {
                ctx.strokeStyle = this.colorTint;
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, w, h);
            } else if (this.colorTint.startsWith('rgba')) {
                ctx.strokeStyle = this.colorTint;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
            } else {
                ctx.fillStyle = this.colorTint;
                ctx.fillRect(x, y, w, h);
                if (this.isDotted) {
                    ctx.strokeStyle = this.colorTint;
                    ctx.lineWidth = 4;
                    ctx.setLineDash([8, 8]);
                    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
                    ctx.setLineDash([]);
                }
            }
        }

            // Draw indicators if any
            if (this.indicators && this.indicators.length > 0) {
                // To draw indicators around the center, we need to translate to the entity's center
                ctx.save();
                ctx.translate(transform.x, transform.y);
                const numIndicators = this.indicators.length;
                const radius = Math.min(w, h) / 2 + 6;
                ctx.lineWidth = 4;

                for (let i = 0; i < numIndicators; i++) {
                    const angle1 = (i / numIndicators) * Math.PI * 2 - Math.PI / 2;
                    const angle2 = ((i + 1) / numIndicators) * Math.PI * 2 - Math.PI / 2;
                    const gap = 0.2; // Small gap between indicators

                    ctx.beginPath();
                    ctx.arc(0, 0, radius, angle1 + gap / 2, angle2 - gap / 2);
                    ctx.strokeStyle = this.indicators[i];
                    ctx.stroke();
                }
                ctx.restore();
            }

        ctx.restore(); // Restore canvas state
    }
}