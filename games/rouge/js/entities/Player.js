class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.type = 'player';
        this.radius = 20;
        this.baseSpeed = 200;
        this.speed = this.baseSpeed;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        
        this.attributes = {
            attack: 1,
            defense: 0,
            critChance: 0.1,
            critDamage: 2,
            lifeSteal: 0,
            speedBonus: 0,
            healthRegen: 0.1
        };
        
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = 70;
        
        this.baseFireRate = 0.15;
        this.fireRate = this.baseFireRate;
        this.fireTimer = 0;
        this.bulletSpeed = 600;
        this.baseBulletDamage = 20;
        this.bulletDamage = this.baseBulletDamage;
        
        this.guns = [
            { offset: new Vector2(15, -5), angle: 0 },
            { offset: new Vector2(15, 5), angle: 0 }
        ];
        
        this.invulnerableTime = 0;
        this.maxInvulnerableTime = 1;
        
        this.score = 0;
        this.kills = 0;
        this.regenTimer = 0;
        this.speedMultiplier = 1;
        
        this.shield = 0;
        this.maxShield = 50;
        this.temporaryBoosts = [];
        this.multishotEnabled = false;
        this.multishotTimer = 0;
        
        // 技能系统相关
        this.skillStats = null;
    }
    
    update(deltaTime, inputManager, joystick, enemies, bulletManager) {
        let movement = inputManager.getMovementVector();
        
        if (joystick && joystick.active) {
            movement = joystick.getDirection();
        }
        
        const speedBoost = this.getTemporaryBoost('speed');
        let totalSpeedMultiplier = 1 + this.attributes.speedBonus + speedBoost;
        
        // 应用急速射击效果到射速
        const fireRateBoost = this.getTemporaryBoost('fireRate');
        this.fireRate = this.baseFireRate * (1 - fireRateBoost);
        // 应用技能系统的速度加成
        if (this.skillStats && this.skillStats.speedMultiplier) {
            totalSpeedMultiplier *= this.skillStats.speedMultiplier;
        }
        this.speed = this.baseSpeed * totalSpeedMultiplier * this.speedMultiplier;
        this.velocity = movement.multiply(this.speed);
        super.update(deltaTime);
        
        if (this.regenTimer >= 1) {
            this.heal(this.attributes.healthRegen);
            this.regenTimer = 0;
        } else {
            this.regenTimer += deltaTime;
        }
        
        const mousePos = inputManager.getMousePosition();
        const renderer = window.game?.renderer;
        if (renderer) {
            const worldMouse = renderer.screenToWorld(mousePos);
            const direction = new Vector2(
                worldMouse.x - this.position.x,
                worldMouse.y - this.position.y
            );
            this.rotation = direction.angle();
        }
        
        if (enemies.length > 0 && !inputManager.isMousePressed()) {
            const nearest = this.findNearestEnemy(enemies);
            if (nearest) {
                const direction = nearest.position.subtract(this.position);
                this.rotation = direction.angle();
            }
        }
        
        if (inputManager.isMousePressed() || enemies.length > 0) {
            this.fireTimer -= deltaTime;
            if (this.fireTimer <= 0) {
                this.shoot(bulletManager);
                this.fireTimer = this.fireRate;
                if (window.game && window.game.audioManager) {
                    window.game.audioManager.play('shoot');
                }
            }
        }
        
        if (this.invulnerableTime > 0) {
            this.invulnerableTime -= deltaTime;
        }
        
        this.updateTemporaryBoosts(deltaTime);
        
        if (this.multishotTimer > 0) {
            this.multishotTimer -= deltaTime;
            if (this.multishotTimer <= 0) {
                this.multishotEnabled = false;
            }
        }
        
        const worldBounds = 2000;
        this.position.x = Math.max(-worldBounds, Math.min(worldBounds, this.position.x));
        this.position.y = Math.max(-worldBounds, Math.min(worldBounds, this.position.y));
    }
    
    shoot(bulletManager) {
        const direction = Vector2.fromAngle(this.rotation);
        
        this.guns.forEach(gun => {
            const offset = gun.offset.rotate(this.rotation);
            const bulletPos = this.position.add(offset);
            
            let critChance = this.attributes.critChance;
            // 应用技能系统的暴击率加成
            if (this.skillStats && this.skillStats.critChanceBonus) {
                critChance += this.skillStats.critChanceBonus;
            }
            // 应用临时暴击加成
            const critBoost = this.getTemporaryBoost('crit');
            critChance += critBoost;
            const isCrit = Math.random() < critChance;
            const damage = this.calculateDamage(isCrit);
            
            if (this.multishotEnabled) {
                for (let i = -1; i <= 1; i++) {
                    const spreadAngle = i * 0.1;
                    const spreadDir = Vector2.fromAngle(this.rotation + spreadAngle);
                    
                    bulletManager.spawn(
                        bulletPos.x,
                        bulletPos.y,
                        spreadDir.multiply(this.bulletSpeed),
                        damage,
                        'player',
                        isCrit
                    );
                }
            } else {
                bulletManager.spawn(
                    bulletPos.x,
                    bulletPos.y,
                    direction.multiply(this.bulletSpeed),
                    damage,
                    'player',
                    isCrit
                );
            }
        });
    }
    
    findNearestEnemy(enemies) {
        let nearest = null;
        let minDistance = Infinity;
        
        enemies.forEach(enemy => {
            if (enemy.alive) {
                const distance = this.distanceTo(enemy);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = enemy;
                }
            }
        });
        
        return nearest;
    }
    
    takeDamage(amount) {
        if (this.invulnerableTime <= 0) {
            const reducedDamage = Math.max(1, amount * (1 - this.attributes.defense));
            
            if (this.shield > 0) {
                const shieldDamage = Math.min(this.shield, reducedDamage);
                this.shield -= shieldDamage;
                const remainingDamage = reducedDamage - shieldDamage;
                if (remainingDamage > 0) {
                    super.takeDamage(remainingDamage);
                }
            } else {
                super.takeDamage(reducedDamage);
            }
            
            this.invulnerableTime = this.maxInvulnerableTime;
            
            if (window.game && window.game.audioManager) {
                window.game.audioManager.play('hurt');
            }
        }
    }
    
    calculateDamage(isCrit) {
        let attackMultiplier = this.attributes.attack;
        
        const attackBoost = this.getTemporaryBoost('attack');
        attackMultiplier += attackBoost;
        
        // 应用技能系统的攻击加成
        if (this.skillStats) {
            attackMultiplier *= this.skillStats.attackMultiplier;
        }
        
        let damage = this.baseBulletDamage * attackMultiplier;
        if (isCrit) {
            damage *= this.attributes.critDamage;
            // 应用技能系统的暴击伤害加成
            if (this.skillStats && this.skillStats.critDamageBonus) {
                damage *= (1 + this.skillStats.critDamageBonus);
            }
        }
        return Math.floor(damage);
    }
    
    render(renderer) {
        const alpha = this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 10) % 2 === 0 ? 0.5 : 1;
        
        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;
        
        // 玩家发光效果
        renderer.ctx.shadowBlur = 20;
        renderer.ctx.shadowColor = '#4444ff';
        
        // 玩家主体渐变
        const gradient = renderer.ctx.createRadialGradient(
            this.position.x, this.position.y, 0,
            this.position.x, this.position.y, this.radius
        );
        gradient.addColorStop(0, '#6666ff');
        gradient.addColorStop(0.7, '#4444ff');
        gradient.addColorStop(1, '#2222aa');
        
        renderer.drawCircle(this.position, this.radius, gradient);
        
        // 内部高光
        renderer.ctx.shadowBlur = 0;
        const innerGradient = renderer.ctx.createRadialGradient(
            this.position.x - this.radius * 0.3, this.position.y - this.radius * 0.3, 0,
            this.position.x, this.position.y, this.radius * 0.8
        );
        innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        renderer.drawCircle(this.position, this.radius * 0.8, innerGradient);
        
        const healthBarWidth = 40;
        const healthBarHeight = 4;
        const healthBarY = this.position.y - this.radius - 10;
        
        renderer.drawRect(
            new Vector2(this.position.x, healthBarY),
            healthBarWidth,
            healthBarHeight,
            '#333333'
        );
        
        renderer.drawRect(
            new Vector2(this.position.x - (healthBarWidth * (1 - this.getHealthPercentage()) / 2), healthBarY),
            healthBarWidth * this.getHealthPercentage(),
            healthBarHeight,
            '#44ff44'
        );
        
        if (this.shield > 0) {
            renderer.ctx.save();
            
            // 护盾光环效果
            const shieldAlpha = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
            renderer.ctx.globalAlpha = shieldAlpha;
            
            // 护盾渐变
            const shieldGradient = renderer.ctx.createRadialGradient(
                this.position.x, this.position.y, this.radius,
                this.position.x, this.position.y, this.radius + 8
            );
            shieldGradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            shieldGradient.addColorStop(0.5, 'rgba(0, 200, 255, 0.4)');
            shieldGradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
            
            renderer.ctx.fillStyle = shieldGradient;
            renderer.ctx.beginPath();
            renderer.ctx.arc(this.position.x, this.position.y, this.radius + 8, 0, Math.PI * 2);
            renderer.ctx.fill();
            
            const shieldBarWidth = 40;
            const shieldBarHeight = 3;
            const shieldBarY = this.position.y - this.radius - 15;
            
            renderer.drawRect(
                new Vector2(this.position.x, shieldBarY),
                shieldBarWidth,
                shieldBarHeight,
                '#00ffff'
            );
            
            renderer.drawRect(
                new Vector2(this.position.x - (shieldBarWidth * (1 - this.shield / this.maxShield) / 2), shieldBarY),
                shieldBarWidth * (this.shield / this.maxShield),
                shieldBarHeight,
                '#00ffff'
            );
            
            renderer.ctx.restore();
        }
        
        this.guns.forEach(gun => {
            const offset = gun.offset.rotate(this.rotation);
            const gunPos = this.position.add(offset);
            const gunEnd = gunPos.add(Vector2.fromAngle(this.rotation).multiply(15));
            
            // 枪管发光
            renderer.ctx.shadowBlur = 10;
            renderer.ctx.shadowColor = '#ffff00';
            renderer.drawLine(gunPos, gunEnd, '#ffff00', 3);
            
            // 枪口光点
            renderer.ctx.shadowBlur = 15;
            renderer.ctx.fillStyle = '#ffffff';
            renderer.ctx.beginPath();
            renderer.ctx.arc(gunEnd.x, gunEnd.y, 2, 0, Math.PI * 2);
            renderer.ctx.fill();
        });
        
        renderer.ctx.restore();
    }
    
    addScore(points) {
        this.score += points;
        this.addExperience(Math.floor(points * 0.3));
    }
    
    addExperience(exp) {
        this.experience += exp;
        while (this.experience >= this.experienceToNext) {
            this.experience -= this.experienceToNext;
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.experienceToNext = Math.floor(50 + this.level * 20 + Math.pow(this.level, 2) * 5);
        
        this.maxHealth += 10;
        this.health = this.maxHealth;
        
        this.attributes.attack += 0.1;
        this.attributes.defense = Math.min(0.5, this.attributes.defense + 0.02);
        this.attributes.critChance = Math.min(0.5, this.attributes.critChance + 0.02);
        this.attributes.speedBonus += 0.05;
        this.attributes.healthRegen += 0.1;
        
        this.baseFireRate = Math.max(0.05, this.baseFireRate - 0.005);
        this.fireRate = this.baseFireRate;
    }
    
    addKill() {
        this.kills++;
        
        let totalLifeSteal = this.attributes.lifeSteal;
        // 应用技能系统的吸血加成
        if (this.skillStats && this.skillStats.lifeStealBonus) {
            totalLifeSteal += this.skillStats.lifeStealBonus;
        }
        // 应用临时吸血加成
        const vampireBoost = this.getTemporaryBoost('vampire');
        totalLifeSteal += vampireBoost;
        
        if (totalLifeSteal > 0) {
            this.heal(this.maxHealth * totalLifeSteal);
        }
    }
    
    addShield(amount) {
        this.shield = Math.min(this.maxShield, this.shield + amount);
    }
    
    addTemporaryBoost(type, amount, duration) {
        this.temporaryBoosts.push({
            type: type,
            amount: amount,
            duration: duration,
            timer: duration
        });
    }
    
    updateTemporaryBoosts(deltaTime) {
        this.temporaryBoosts = this.temporaryBoosts.filter(boost => {
            boost.timer -= deltaTime;
            return boost.timer > 0;
        });
    }
    
    getTemporaryBoost(type) {
        return this.temporaryBoosts
            .filter(boost => boost.type === type)
            .reduce((sum, boost) => sum + boost.amount, 0);
    }
    
    enableMultishot(duration) {
        this.multishotEnabled = true;
        this.multishotTimer = duration;
    }
}