class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const aspectRatio = 16 / 9;
        const windowRatio = window.innerWidth / window.innerHeight;

        if (windowRatio > aspectRatio) {
            this.height = window.innerHeight * 0.9;
            this.width = this.height * aspectRatio;
        } else {
            this.width = window.innerWidth * 0.9;
            this.height = this.width / aspectRatio;
        }

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    worldToScreen(worldPos) {
        return {
            x: (worldPos.x - this.camera.x) * this.camera.zoom + this.width / 2,
            y: (worldPos.y - this.camera.y) * this.camera.zoom + this.height / 2
        };
    }

    screenToWorld(screenPos) {
        return {
            x: (screenPos.x - this.width / 2) / this.camera.zoom + this.camera.x,
            y: (screenPos.y - this.height / 2) / this.camera.zoom + this.camera.y
        };
    }

    drawCircle(position, radius, color) {
        const screenPos = this.worldToScreen(position);
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawRect(position, width, height, color, rotation = 0) {
        const screenPos = this.worldToScreen(position);
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(rotation);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            -width * this.camera.zoom / 2,
            -height * this.camera.zoom / 2,
            width * this.camera.zoom,
            height * this.camera.zoom
        );
        this.ctx.restore();
    }

    drawLine(start, end, color, width = 1) {
        const startScreen = this.worldToScreen(start);
        const endScreen = this.worldToScreen(end);

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width * this.camera.zoom;
        this.ctx.beginPath();
        this.ctx.moveTo(startScreen.x, startScreen.y);
        this.ctx.lineTo(endScreen.x, endScreen.y);
        this.ctx.stroke();
    }

    drawSprite(position, sprite, width, height, rotation = 0) {
        const screenPos = this.worldToScreen(position);
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(rotation);

        if (sprite instanceof Image && sprite.complete) {
            this.ctx.drawImage(
                sprite,
                -width * this.camera.zoom / 2,
                -height * this.camera.zoom / 2,
                width * this.camera.zoom,
                height * this.camera.zoom
            );
        }

        this.ctx.restore();
    }

    drawText(text, position, size, color, align = 'center') {
        const screenPos = this.worldToScreen(position);
        this.ctx.fillStyle = color;
        this.ctx.font = `${size * this.camera.zoom}px Arial`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, screenPos.x, screenPos.y);
    }

    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }

    setCameraZoom(zoom) {
        this.camera.zoom = Math.max(0.5, Math.min(2, zoom));
    }

    drawRectWorld(position, width, height, color) {
        const screenPos = this.worldToScreen(position);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            screenPos.x,
            screenPos.y,
            width * this.camera.zoom,
            height * this.camera.zoom
        );
    }

    drawCircleWorld(position, radius, color) {
        this.drawCircle(position, radius, color);
    }

    drawLineWorld(start, end, color, width = 1) {
        this.drawLine(start, end, color, width);
    }
}