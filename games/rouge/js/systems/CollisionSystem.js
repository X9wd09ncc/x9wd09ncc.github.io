class CollisionSystem {
    constructor() {
        this.particleSystem = null;
    }
    
    setParticleSystem(particleSystem) {
        this.particleSystem = particleSystem;
    }
    
    checkCollisions(player, enemies, bullets) {
        this.checkPlayerEnemyCollisions(player, enemies);
        this.checkBulletCollisions(bullets, player, enemies);
    }
    
    checkPlayerEnemyCollisions(player, enemies) {
        if (!player.alive) return;
        
        enemies.forEach(enemy => {
            if (enemy.alive && player.isColliding(enemy)) {
                const knockback = player.position.subtract(enemy.position).normalize().multiply(200);
                player.velocity = player.velocity.add(knockback);
                
                if (player.invulnerableTime <= 0) {
                    if (this.particleSystem) {
                        this.particleSystem.createImpact(
                            player.position.x,
                            player.position.y,
                            '#ff4444'
                        );
                    }
                }
            }
        });
    }
    
    checkBulletCollisions(bullets, player, enemies) {
        bullets.forEach(bullet => {
            if (!bullet.alive) return;
            
            if (bullet.owner === 'enemy' && player.alive) {
                if (bullet.isColliding(player)) {
                    player.takeDamage(bullet.damage);
                    bullet.onHit();
                    
                    if (this.particleSystem) {
                        this.particleSystem.createImpact(
                            bullet.position.x,
                            bullet.position.y,
                            '#4444ff'
                        );
                    }
                }
            }
            
            else if (bullet.owner === 'player') {
                enemies.forEach(enemy => {
                    if (enemy.alive && bullet.isColliding(enemy)) {
                        enemy.takeDamage(bullet.damage);
                        bullet.onHit();
                        
                        const knockback = enemy.position.subtract(bullet.position).normalize().multiply(100);
                        enemy.velocity = enemy.velocity.add(knockback);
                        
                        if (this.particleSystem) {
                            this.particleSystem.createImpact(
                                bullet.position.x,
                                bullet.position.y,
                                enemy.color
                            );
                        }
                        
                        if (!enemy.alive) {
                            if (this.particleSystem) {
                                this.particleSystem.createExplosion(
                                    enemy.position.x,
                                    enemy.position.y,
                                    enemy.color
                                );
                            }
                            if (window.game && window.game.audioManager) {
                                window.game.audioManager.play('explosion');
                            }
                        } else {
                            if (window.game && window.game.audioManager) {
                                window.game.audioManager.play('hit');
                            }
                        }
                    }
                });
            }
        });
    }
    
    checkCircleCollision(obj1, obj2) {
        return obj1.isColliding(obj2);
    }
}