class Joystick {
    constructor(container) {
        this.container = container;
        this.active = false;
        this.direction = new Vector2();
        this.touchId = null;
        
        this.baseElement = null;
        this.handleElement = null;
        
        this.radius = 75;
        this.handleRadius = 30;
        this.deadZone = 0.1;
        
        this.init();
    }
    
    init() {
        this.baseElement = document.createElement('div');
        this.baseElement.className = 'joystick-base';
        
        this.handleElement = document.createElement('div');
        this.handleElement.className = 'joystick-handle';
        
        this.container.appendChild(this.baseElement);
        this.container.appendChild(this.handleElement);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const handleStart = (x, y, id) => {
            const rect = this.container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );
            
            if (distance <= this.radius) {
                this.active = true;
                this.touchId = id;
                this.updateHandle(x - centerX, y - centerY);
            }
        };
        
        const handleMove = (x, y, id) => {
            if (this.active && this.touchId === id) {
                const rect = this.container.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                this.updateHandle(x - centerX, y - centerY);
            }
        };
        
        const handleEnd = (id) => {
            if (this.touchId === id) {
                this.active = false;
                this.touchId = null;
                this.direction = new Vector2();
                this.resetHandle();
            }
        };
        
        this.container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleStart(e.clientX, e.clientY, 'mouse');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.active && this.touchId === 'mouse') {
                handleMove(e.clientX, e.clientY, 'mouse');
            }
        });
        
        document.addEventListener('mouseup', () => {
            handleEnd('mouse');
        });
        
        this.container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY, touch.identifier);
        });
        
        document.addEventListener('touchmove', (e) => {
            for (const touch of e.touches) {
                handleMove(touch.clientX, touch.clientY, touch.identifier);
            }
        });
        
        document.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                handleEnd(touch.identifier);
            }
        });
    }
    
    updateHandle(offsetX, offsetY) {
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        
        if (distance > this.radius) {
            offsetX = (offsetX / distance) * this.radius;
            offsetY = (offsetY / distance) * this.radius;
        }
        
        this.handleElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        const normalizedX = offsetX / this.radius;
        const normalizedY = offsetY / this.radius;
        
        if (Math.abs(normalizedX) > this.deadZone || Math.abs(normalizedY) > this.deadZone) {
            this.direction = new Vector2(normalizedX, normalizedY);
        } else {
            this.direction = new Vector2();
        }
    }
    
    resetHandle() {
        this.handleElement.style.transform = 'translate(0, 0)';
    }
    
    getDirection() {
        return this.direction.clone();
    }
    
    getMagnitude() {
        return this.direction.magnitude();
    }
}