class Enemy extends Entity {
    constructor(x, y, type = 'basic') {
        super(x, y);
        this.type = 'enemy';
        this.enemyType = type;
        
        this.setupByType(type);
        
        this.target = null;
        this.attackCooldown = 0;
        this.state = 'idle';
        this.stateTimer = 0;
        this.gameTime = 0;
    }
    
    setupByType(type) {
        switch(type) {
            case 'basic':
                this.radius = 15;
                this.speed = 80;
                this.baseSpeed = 80;
                this.maxHealth = 40;
                this.health = this.maxHealth;
                this.damage = 10;
                this.attackRange = 30;
                this.attackSpeed = 1;
                this.scoreValue = 5;
                this.color = '#ff4444';
                break;
                
            case 'fast':
                this.radius = 12;
                this.speed = 150;
                this.baseSpeed = 150;
                this.maxHealth = 20;
                this.health = this.maxHealth;
                this.damage = 5;
                this.attackRange = 25;
                this.attackSpeed = 0.5;
                this.scoreValue = 8;
                this.color = '#ff8844';
                break;
                
            case 'tank':
                this.radius = 25;
                this.speed = 40;
                this.baseSpeed = 40;
                this.maxHealth = 100;
                this.health = this.maxHealth;
                this.damage = 20;
                this.attackRange = 40;
                this.attackSpeed = 2;
                this.scoreValue = 15;
                this.color = '#ff4488';
                break;
                
            case 'ranged':
                this.radius = 18;
                this.speed = 60;
                this.baseSpeed = 60;
                this.maxHealth = 30;
                this.health = this.maxHealth;
                this.damage = 15;
                this.attackRange = 200;
                this.attackSpeed = 1.5;
                this.scoreValue = 12;
                this.color = '#ff44ff';
                this.bulletSpeed = 300;
                break;
        }
        
        // 冰冻效果
        this.isFrozen = false;
        this.freezeTimer = 0;
    }
    
    update(deltaTime, player, enemies, bulletManager) {
        if (!this.alive) return;
        
        this.gameTime += deltaTime;
        
        // 更新冰冻状态
        if (this.freezeTimer > 0) {
            this.freezeTimer -= deltaTime;
            this.isFrozen = this.freezeTimer > 0;
        }
        
        this.target = player;
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        
        if (this.target && this.target.alive) {
            const direction = this.target.position.subtract(this.position);
            const distance = direction.magnitude();
            
            // 增强AI: 预测玩家移动
            let targetPos = this.target.position;
            if (this.enemyType === 'ranged' && this.target.velocity.magnitude() > 10) {
                // 远程敌人预测玩家位置
                const bulletTime = distance / this.bulletSpeed;
                targetPos = this.target.position.add(this.target.velocity.multiply(bulletTime * 0.5));
            }
            
            const smartDirection = targetPos.subtract(this.position);
            
            if (distance > this.attackRange) {
                this.state = 'chase';
                
                // 智能移动: 包围策略
                let moveDir = smartDirection.normalize();
                
                // 快速敌人尝试从侧面接近
                if (this.enemyType === 'fast') {
                    const perpendicular = new Vector2(-moveDir.y, moveDir.x);
                    const sideOffset = Math.sin(this.gameTime * 3) * 0.5;
                    moveDir = moveDir.add(perpendicular.multiply(sideOffset)).normalize();
                }
                
                // 坦克敌人直线冲锋
                if (this.enemyType === 'tank' && distance < 200) {
                    this.speed = this.baseSpeed * 1.5; // 冲锋加速
                } else if (this.enemyType === 'tank') {
                    this.speed = this.baseSpeed;
                }
                
                const avoidance = this.calculateAvoidance(enemies);
                const finalDir = moveDir.add(avoidance).normalize();
                
                // 如果被冰冻，速度降低90%
                const speedMultiplier = this.isFrozen ? 0.1 : 1;
                this.velocity = finalDir.multiply(this.speed * speedMultiplier);
                this.rotation = smartDirection.angle();
                
                // 远程敌人保持距离
                if (this.enemyType === 'ranged' && distance < this.attackRange * 0.7) {
                    this.velocity = this.velocity.multiply(-0.5); // 后退
                }
            } else {
                this.state = 'attack';
                
                // 近战敌人环绕攻击
                if (this.enemyType !== 'ranged') {
                    const perpendicular = new Vector2(-direction.y, direction.x);
                    const circleSpeed = this.enemyType === 'fast' ? 50 : 20;
                    this.velocity = perpendicular.normalize().multiply(circleSpeed);
                } else {
                    this.velocity = Vector2.zero();
                }
                
                if (this.attackCooldown <= 0) {
                    this.attack(bulletManager);
                    this.attackCooldown = this.attackSpeed;
                }
            }
        } else {
            this.state = 'idle';
            this.velocity = Vector2.zero();
        }
        
        // 记录游戏时间用于AI行为
        this.gameTime = (this.gameTime || 0) + deltaTime;
        
        super.update(deltaTime);
    }
    
    calculateAvoidance(enemies) {
        const avoidanceForce = new Vector2();
        const avoidanceRadius = this.radius * 3;
        
        enemies.forEach(other => {
            if (other !== this && other.alive) {
                const distance = this.distanceTo(other);
                if (distance < avoidanceRadius && distance > 0) {
                    const pushAway = this.position.subtract(other.position).normalize();
                    const strength = 1 - (distance / avoidanceRadius);
                    avoidanceForce.x += pushAway.x * strength;
                    avoidanceForce.y += pushAway.y * strength;
                }
            }
        });
        
        return avoidanceForce.multiply(50);
    }
    
    attack(bulletManager) {
        if (this.enemyType === 'ranged' && bulletManager) {
            const direction = this.target.position.subtract(this.position).normalize();
            bulletManager.spawn(
                this.position.x,
                this.position.y,
                direction.multiply(this.bulletSpeed),
                this.damage,
                'enemy'
            );
        } else if (this.target && this.distanceTo(this.target) <= this.attackRange) {
            this.target.takeDamage(this.damage);
        }
    }
    
    render(renderer) {
        const healthPercentage = this.getHealthPercentage();
        const opacity = this.state === 'attack' ? 1 : 0.8;
        
        renderer.ctx.save();
        renderer.ctx.globalAlpha = opacity;
        
        // 敌人发光效果
        renderer.ctx.shadowBlur = 15;
        renderer.ctx.shadowColor = this.color;
        
        // 敌人主体渐变
        const x = isFinite(this.position.x) ? this.position.x : 0;
        const y = isFinite(this.position.y) ? this.position.y : 0;
        const radius = isFinite(this.radius) ? this.radius : 10;
        
        const gradient = renderer.ctx.createRadialGradient(
            x, y, 0,
            x, y, radius
        );
        
        // 根据敌人类型设置渐变
        switch(this.enemyType) {
            case 'basic':
                gradient.addColorStop(0, '#ff6666');
                gradient.addColorStop(0.7, '#ff4444');
                gradient.addColorStop(1, '#aa2222');
                break;
            case 'fast':
                gradient.addColorStop(0, '#ffaa66');
                gradient.addColorStop(0.7, '#ff8844');
                gradient.addColorStop(1, '#aa4422');
                break;
            case 'tank':
                gradient.addColorStop(0, '#ff66aa');
                gradient.addColorStop(0.7, '#ff4488');
                gradient.addColorStop(1, '#aa2244');
                break;
            case 'ranged':
                gradient.addColorStop(0, '#ff66ff');
                gradient.addColorStop(0.7, '#ff44ff');
                gradient.addColorStop(1, '#aa22aa');
                break;
        }
        
        renderer.drawCircle(this.position, this.radius, gradient);
        
        // 冰冻效果
        if (this.isFrozen) {
            renderer.ctx.shadowBlur = 20;
            renderer.ctx.shadowColor = '#00ffff';
            
            const iceGradient = renderer.ctx.createRadialGradient(
                this.position.x, this.position.y, 0,
                this.position.x, this.position.y, this.radius * 1.2
            );
            iceGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
            iceGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
            iceGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
            
            renderer.drawCircle(this.position, this.radius * 1.2, iceGradient);
        }
        
        // 内部纹理
        renderer.ctx.shadowBlur = 0;
        const innerPattern = renderer.ctx.createRadialGradient(
            this.position.x - this.radius * 0.3, this.position.y - this.radius * 0.3, 0,
            this.position.x, this.position.y, this.radius * 0.6
        );
        innerPattern.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        innerPattern.addColorStop(1, 'rgba(0, 0, 0, 0)');
        renderer.drawCircle(this.position, this.radius * 0.8, innerPattern);
        
        if (this.state === 'attack') {
            // 攻击状态光环
            renderer.ctx.shadowBlur = 20;
            renderer.ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
            renderer.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            renderer.ctx.lineWidth = 2;
            renderer.ctx.beginPath();
            renderer.ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2);
            renderer.ctx.stroke();
        }
        
        const healthBarWidth = 30;
        const healthBarHeight = 3;
        const healthBarY = this.position.y - this.radius - 8;
        
        if (healthPercentage < 1) {
            renderer.drawRect(
                new Vector2(this.position.x, healthBarY),
                healthBarWidth,
                healthBarHeight,
                '#333333'
            );
            
            renderer.drawRect(
                new Vector2(this.position.x - (healthBarWidth * (1 - healthPercentage) / 2), healthBarY),
                healthBarWidth * healthPercentage,
                healthBarHeight,
                '#44ff44'
            );
        }
        
        if (this.enemyType === 'ranged') {
            const gunLength = 15;
            const gunEnd = this.position.add(Vector2.fromAngle(this.rotation).multiply(gunLength));
            renderer.drawLine(this.position, gunEnd, '#ff00ff', 2);
        }
        
        renderer.ctx.restore();
    }
    
    takeDamage(amount) {
        super.takeDamage(amount);
        
        if (!this.alive && this.target && this.target.type === 'player') {
            this.target.addScore(this.scoreValue);
            this.target.addKill();
            
            if (Math.random() < 0.2) {
                const game = window.game;
                if (game && game.pickupManager) {
                    game.pickupManager.spawnPickupAt(this.position.x, this.position.y);
                }
            }
        }
    }
    
    applyLevelMultipliers(multipliers) {
        this.maxHealth *= multipliers.health;
        this.health = this.maxHealth;
        this.speed *= multipliers.speed;
        this.damage *= multipliers.damage;
        this.scoreValue = Math.floor(this.scoreValue * (1 + (multipliers.health - 1) * 0.5));
    }
    
    freeze(duration) {
        this.isFrozen = true;
        this.freezeTimer = duration;
    }
}