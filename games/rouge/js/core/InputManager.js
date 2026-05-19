class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
            button: -1
        };
        this.touches = new Map();
        this.onKeyPress = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // 瑙﹀彂鎸夐敭鍥炶皟
            if (this.onKeyPress && !e.repeat) {
                this.onKeyPress(e.key);
            }

            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            e.preventDefault();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.pressed = true;
            this.mouse.button = e.button;
            this.updateMousePosition(e);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.pressed = false;
            this.mouse.button = -1;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                this.touches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    startX: touch.clientX,
                    startY: touch.clientY
                });
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (this.touches.has(touch.identifier)) {
                    const touchData = this.touches.get(touch.identifier);
                    touchData.x = touch.clientX;
                    touchData.y = touch.clientY;
                }
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                this.touches.delete(touch.identifier);
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }

    isMousePressed(button = 0) {
        return this.mouse.pressed && this.mouse.button === button;
    }

    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    getTouches() {
        return Array.from(this.touches.values());
    }

    getMovementVector() {
        const vector = new Vector2();

        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) vector.y -= 1;
        if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) vector.y += 1;
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) vector.x -= 1;
        if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) vector.x += 1;

        return vector.normalize();
    }
}