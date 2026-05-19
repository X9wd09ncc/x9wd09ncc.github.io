class Bullet extends Entity {
    constructor(x, y, velocity, damage, owner) {
        super(x, y);
        this.type = 'bullet';
        this.velocity = velocity;
        this.damage = damage;
        this.owner = owner;
        this.radius = 4;
        this.lifetime = 3;
        this.age = 0;
        this.trail = [];
        this.maxTrailLength = 10;
        this.isCrit = false;
    }
    
    update(deltaTime) {
        this.trail.push(this.position.clone());
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        super.update(deltaTime);
        
        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.alive = false;
        }
        
        const worldBounds = 2500;
        if (Math.abs(this.position.x) > worldBounds || 
            Math.abs(this.position.y) > worldBounds) {
            this.alive = false;
        }
    }
    
    render(renderer) {
        let color = this.owner === 'player' ? '#ffff00' : '#ff00ff';
        if (this.isCrit && this.owner === 'player') {
            color = '#ff4444';
        }
        
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.5;
            const trailRadius = this.radius * (i / this.trail.length);
            
            renderer.ctx.save();
            renderer.ctx.globalAlpha = alpha;
            renderer.drawCircle(this.trail[i], trailRadius, color);
            renderer.ctx.restore();
        }
        
        const bulletRadius = this.isCrit ? this.radius * 1.5 : this.radius;
        renderer.drawCircle(this.position, bulletRadius, color);
        
        const glowRadius = bulletRadius * 2;
        renderer.ctx.save();
        renderer.ctx.globalAlpha = this.isCrit ? 0.5 : 0.3;
        renderer.drawCircle(this.position, glowRadius, color);
        renderer.ctx.restore();
    }
    
    onHit() {
        this.alive = false;
    }
}

class BulletManager {
    constructor() {
        this.bulletPool = new ObjectPool(
            () => new Bullet(0, 0, Vector2.zero(), 0, ''),
            (bullet) => bullet,
            50
        );
        this.activeBullets = [];
    }
    
    spawn(x, y, velocity, damage, owner, isCrit = false) {
        const bullet = this.bulletPool.get();
        bullet.position = new Vector2(x, y);
        bullet.velocity = velocity;
        bullet.damage = damage;
        bullet.owner = owner;
        bullet.alive = true;
        bullet.age = 0;
        bullet.trail = [];
        bullet.isCrit = isCrit;
        
        this.activeBullets.push(bullet);
        return bullet;
    }
    
    update(deltaTime) {
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const bullet = this.activeBullets[i];
            bullet.update(deltaTime);
            
            if (!bullet.alive) {
                this.activeBullets.splice(i, 1);
                this.bulletPool.release(bullet);
            }
        }
    }
    
    render(renderer) {
        this.activeBullets.forEach(bullet => {
            bullet.render(renderer);
        });
    }
    
    clear() {
        this.activeBullets.forEach(bullet => {
            this.bulletPool.release(bullet);
        });
        this.activeBullets = [];
    }
}