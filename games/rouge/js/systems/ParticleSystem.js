class Particle {
    constructor(x, y, velocity, color, size, lifetime) {
        this.position = new Vector2(x, y);
        this.velocity = velocity;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.age = 0;
        this.alive = true;
        this.type = 'default';
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.fadeIn = false;
    }

    update(deltaTime) {
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        this.velocity = this.velocity.multiply(0.98);
        this.age += deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;

        if (this.age >= this.lifetime) {
            this.alive = false;
        }
    }

    render(renderer) {
        let alpha = 1 - (this.age / this.lifetime);
        if (this.fadeIn && this.age < 0.1) {
            alpha *= this.age / 0.1;
        }

        const currentSize = this.size * (1 - this.age / this.lifetime * 0.5);

        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;

        if (this.type === 'star') {
            const screenPos = renderer.worldToScreen(this.position);
            renderer.ctx.translate(screenPos.x, screenPos.y);
            renderer.ctx.rotate(this.rotation);

            renderer.ctx.fillStyle = this.color;
            renderer.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
                const outerX = Math.cos(angle) * currentSize;
                const outerY = Math.sin(angle) * currentSize;
                const innerAngle = angle + Math.PI / 5;
                const innerX = Math.cos(innerAngle) * currentSize * 0.5;
                const innerY = Math.sin(innerAngle) * currentSize * 0.5;

                if (i === 0) {
                    renderer.ctx.moveTo(outerX, outerY);
                } else {
                    renderer.ctx.lineTo(outerX, outerY);
                }
                renderer.ctx.lineTo(innerX, innerY);
            }
            renderer.ctx.closePath();
            renderer.ctx.fill();
        } else if (this.type === 'ring') {
            renderer.ctx.strokeStyle = this.color;
            renderer.ctx.lineWidth = 2;
            const screenPos = renderer.worldToScreen(this.position);
            renderer.ctx.beginPath();
            renderer.ctx.arc(screenPos.x, screenPos.y, currentSize * renderer.camera.zoom, 0, Math.PI * 2);
            renderer.ctx.stroke();
        } else {
            renderer.drawCircle(this.position, currentSize, this.color);
        }

        renderer.ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);

            if (!particle.alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(renderer) {
        this.particles.forEach(particle => {
            particle.render(renderer);
        });
    }

    emit(x, y, color, options = {}) {
        if (this.particles.length >= this.maxParticles) return;
        const velocity = options.velocity || new Vector2(0, 0);
        const size = options.size || 4;
        const lifetime = options.lifetime || 0.6;
        const particle = new Particle(x, y, velocity, color, size, lifetime);
        if (options.type) particle.type = options.type;
        if (options.rotationSpeed !== undefined) particle.rotationSpeed = options.rotationSpeed;
        if (options.fadeIn !== undefined) particle.fadeIn = options.fadeIn;
        this.particles.push(particle);
    }

    createImpact(x, y, color) {
        const particleCount = 5;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
            const speed = 100 + Math.random() * 100;
            const velocity = Vector2.fromAngle(angle).multiply(speed);

            this.particles.push(new Particle(
                x,
                y,
                velocity,
                color,
                3 + Math.random() * 3,
                0.3 + Math.random() * 0.3
            ));
        }
    }

    createExplosion(x, y, color) {
        const particleCount = 20;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 200;
            const velocity = Vector2.fromAngle(angle).multiply(speed);

            this.particles.push(new Particle(
                x,
                y,
                velocity,
                color,
                4 + Math.random() * 4,
                0.5 + Math.random() * 0.5
            ));
        }

        for (let i = 0; i < 10; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 50;
            const velocity = Vector2.fromAngle(angle).multiply(speed);

            this.particles.push(new Particle(
                x,
                y,
                velocity,
                '#ffff00',
                6 + Math.random() * 4,
                0.8 + Math.random() * 0.4
            ));
        }
    }

    createMuzzleFlash(x, y, direction, color) {
        const particleCount = 3;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const spread = 0.3;
            const angle = direction.angle() + (Math.random() - 0.5) * spread;
            const speed = 300 + Math.random() * 200;
            const velocity = Vector2.fromAngle(angle).multiply(speed);

            this.particles.push(new Particle(
                x,
                y,
                velocity,
                color,
                2 + Math.random() * 2,
                0.1 + Math.random() * 0.1
            ));
        }
    }

    clear() {
        this.particles = [];
    }

    createLevelUp(x, y) {
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = 150;
            const velocity = Vector2.fromAngle(angle).multiply(speed);

            const particle = new Particle(
                x,
                y,
                velocity,
                '#ffff00',
                5,
                1
            );
            particle.type = 'star';
            particle.rotationSpeed = Math.random() * 5 - 2.5;
            particle.fadeIn = true;

            this.particles.push(particle);
        }

        for (let i = 0; i < 3; i++) {
            const particle = new Particle(
                x,
                y,
                Vector2.zero(),
                '#ffff00',
                20 + i * 20,
                0.8
            );
            particle.type = 'ring';
            this.particles.push(particle);
        }
    }

    createPickup(x, y, color) {
        const particleCount = 10;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = 80;
            const velocity = Vector2.fromAngle(angle).multiply(speed);

            const particle = new Particle(
                x,
                y,
                velocity,
                color,
                4,
                0.5
            );
            particle.type = 'star';
            particle.rotationSpeed = 3;

            this.particles.push(particle);
        }
    }

    createDamageNumber(x, y, damage, isCrit) {
        const velocity = new Vector2(0, -50);
        const color = isCrit ? '#ff4444' : '#ffff00';
        const size = isCrit ? 12 : 8;

        const particle = new Particle(
            x + (Math.random() - 0.5) * 20,
            y - 20,
            velocity,
            color,
            size,
            1
        );
        particle.type = 'text';
        particle.text = damage.toString();
        particle.isCrit = isCrit;

        this.particles.push(particle);
    }
}