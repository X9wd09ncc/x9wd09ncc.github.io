class Entity {
    constructor(x = 0, y = 0) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2();
        this.rotation = 0;
        this.radius = 10;
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.type = 'entity';
    }
    
    update(deltaTime) {
        this.position = this.position.add(this.velocity.multiply(deltaTime));
    }
    
    render(renderer) {
        renderer.drawCircle(this.position, this.radius, '#ffffff');
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }
    
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    
    getHealthPercentage() {
        return this.health / this.maxHealth;
    }
    
    distanceTo(other) {
        return Vector2.distance(this.position, other.position);
    }
    
    isColliding(other) {
        const distance = this.distanceTo(other);
        return distance < this.radius + other.radius;
    }
}