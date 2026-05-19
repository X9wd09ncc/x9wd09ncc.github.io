class Pickup extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = 'pickup';
        this.pickupType = type;
        this.radius = 15;
        this.bobOffset = 0;
        this.bobSpeed = 2;
        this.glowTimer = 0;
        this.lifetime = 30;
        this.age = 0;

        this.setupByType(type);
    }

    setupByType(type) {
        switch (type) {
            case 'health':
                this.color = '#ff4444';
                this.healAmount = 30;
                this.icon = '+';
                break;

            case 'attackBoost':
                this.color = '#ff8800';
                this.attackBoost = 0.2;
                this.duration = 10;
                this.icon = '⚔';
                break;

            case 'speedBoost':
                this.color = '#4488ff';
                this.speedBoost = 0.3;
                this.duration = 8;
                this.icon = '⚡';
                break;

            case 'shield':
                this.color = '#44ff44';
                this.shieldAmount = 50;
                this.icon = '🛡';
                break;

            case 'multishot':
                this.color = '#ff44ff';
                this.duration = 15;
                this.icon = '✦';
                break;

            case 'experience':
                this.color = '#ffff00';
                this.expAmount = 10;
                this.icon = '★';
                break;

            case 'bomb':
                this.color = '#ff0000';
                this.bombRadius = 200;
                this.bombDamage = 100;
                this.icon = '💣';
                break;

            case 'freeze':
                this.color = '#00ffff';
                this.freezeDuration = 3;
                this.freezeRadius = 300;
                this.icon = '❄';
                break;

            case 'critBoost':
                this.color = '#ffaa00';
                this.critBoost = 0.2;
                this.duration = 10;
                this.icon = '💥';
                break;

            case 'vampire':
                this.color = '#8b0000';
                this.vampireAmount = 0.1;
                this.duration = 15;
                this.icon = '🦇';
                break;

            case 'rapidFire':
                this.color = '#ff00ff';
                this.fireRateBoost = 0.5;
                this.duration = 8;
                this.icon = '🔥';
                break;

            case 'invincible':
                this.color = '#ffd700';
                this.duration = 3;
                this.icon = '⭐';
                break;
        }
    }

    update(deltaTime) {
        this.bobOffset = Math.sin(Date.now() * 0.001 * this.bobSpeed) * 5;
        this.glowTimer += deltaTime;

        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.alive = false;
        }

        super.update(deltaTime);
    }

    render(renderer) {
        const alpha = Math.min(1, (this.lifetime - this.age) / 3);

        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;

        const glowSize = this.radius * (1.5 + Math.sin(this.glowTimer * 3) * 0.3);
        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha * 0.3;
        renderer.drawCircle(
            new Vector2(this.position.x, this.position.y + this.bobOffset),
            glowSize,
            this.color
        );
        renderer.ctx.restore();

        renderer.drawCircle(
            new Vector2(this.position.x, this.position.y + this.bobOffset),
            this.radius,
            this.color
        );

        const innerRadius = this.radius * 0.7;
        renderer.drawCircle(
            new Vector2(this.position.x, this.position.y + this.bobOffset),
            innerRadius,
            'rgba(255, 255, 255, 0.3)'
        );

        renderer.ctx.restore();
    }

    applyEffect(player) {
        switch (this.pickupType) {
            case 'health':
                player.heal(this.healAmount);
                break;

            case 'attackBoost':
                player.addTemporaryBoost('attack', this.attackBoost, this.duration);
                break;

            case 'speedBoost':
                player.addTemporaryBoost('speed', this.speedBoost, this.duration);
                break;

            case 'shield':
                player.addShield(this.shieldAmount);
                break;

            case 'multishot':
                player.enableMultishot(this.duration);
                break;

            case 'experience':
                player.addExperience(this.expAmount);
                break;

            case 'bomb':
                this.createBombExplosion(player);
                break;

            case 'freeze':
                this.freezeEnemies();
                break;

            case 'critBoost':
                player.addTemporaryBoost('crit', this.critBoost, this.duration);
                break;

            case 'vampire':
                player.addTemporaryBoost('vampire', this.vampireAmount, this.duration);
                break;

            case 'rapidFire':
                player.addTemporaryBoost('fireRate', this.fireRateBoost, this.duration);
                break;

            case 'invincible':
                player.invulnerableTime = this.duration;
                player.maxInvulnerableTime = this.duration;
                break;
        }

        this.alive = false;

        if (window.game) {
            if (window.game.audioManager) {
                window.game.audioManager.play('pickup');
            }
            if (window.game.particleSystem) {
                window.game.particleSystem.createPickup(this.position.x, this.position.y, this.color);
            }
            if (typeof window.game.addFloatingText === 'function') {
                const text = this.getPickupFloatingText();
                window.game.addFloatingText(text, this.color);
            }
        }
    }

    getPickupFloatingText() {
        switch (this.pickupType) {
            case 'health':
                return `+${this.healAmount} HP`;
            case 'attackBoost':
                return '攻击提升';
            case 'speedBoost':
                return '速度提升';
            case 'shield':
                return `+${this.shieldAmount} 护盾`;
            case 'multishot':
                return '多重射击';
            case 'experience':
                return `+${this.expAmount} 经验`;
            case 'bomb':
                return '爆炸';
            case 'freeze':
                return '冻结';
            case 'critBoost':
                return '暴击提升';
            case 'vampire':
                return '吸血';
            case 'rapidFire':
                return '速射';
            case 'invincible':
                return '无敌';
            default:
                return '拾取';
        }
    }

    createBombExplosion(player) {
        if (window.game) {
            // 爆炸特效
            for (let i = 0; i < 50; i++) {
                const angle = (Math.PI * 2 * i) / 50;
                window.game.particleSystem.emit(
                    this.position.x,
                    this.position.y,
                    '#ff6644',
                    {
                        velocity: Vector2.fromAngle(angle).multiply(300),
                        size: 15,
                        lifetime: 0.5
                    }
                );
            }

            // 对范围内敌人造成伤害
            window.game.enemies.forEach(enemy => {
                if (enemy.alive && this.distanceTo(enemy) < this.bombRadius) {
                    enemy.takeDamage(this.bombDamage);
                    if (!enemy.alive) {
                        player.addKill();
                    }
                }
            });

            if (window.game.audioManager) {
                window.game.audioManager.play('explosion');
            }
        }
    }

    freezeEnemies() {
        if (window.game) {
            // 冰冻特效
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.freezeRadius;
                window.game.particleSystem.emit(
                    this.position.x + Math.cos(angle) * distance,
                    this.position.y + Math.sin(angle) * distance,
                    '#00ffff',
                    {
                        velocity: new Vector2(0, -50),
                        size: 8,
                        lifetime: 1
                    }
                );
            }

            // 冻结范围内的敌人
            window.game.enemies.forEach(enemy => {
                if (enemy.alive && this.distanceTo(enemy) < this.freezeRadius) {
                    enemy.freeze(this.freezeDuration);
                }
            });
        }
    }
}

class PickupManager {
    constructor() {
        this.pickups = [];
        this.spawnTimer = 0;
        this.spawnInterval = 10;

        this.pickupTypes = [
            { type: 'health', weight: 0.25 },
            { type: 'attackBoost', weight: 0.15 },
            { type: 'speedBoost', weight: 0.15 },
            { type: 'shield', weight: 0.1 },
            { type: 'multishot', weight: 0.08 },
            { type: 'experience', weight: 0.2 },
            { type: 'bomb', weight: 0.05 },
            { type: 'freeze', weight: 0.05 },
            { type: 'critBoost', weight: 0.08 },
            { type: 'vampire', weight: 0.05 },
            { type: 'rapidFire', weight: 0.08 },
            { type: 'invincible', weight: 0.03 }
        ];
    }

    update(deltaTime, player, levelManager) {
        this.spawnTimer += deltaTime;

        const adjustedInterval = this.spawnInterval / (1 + levelManager.level * 0.05);

        if (this.spawnTimer >= adjustedInterval) {
            this.spawnPickup(player.position);
            this.spawnTimer = 0;
        }

        this.pickups = this.pickups.filter(pickup => pickup.alive);
        this.pickups.forEach(pickup => {
            pickup.update(deltaTime);

            if (pickup.distanceTo(player) < pickup.radius + player.radius) {
                pickup.applyEffect(player);
            }
        });
    }

    spawnPickup(playerPos) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = playerPos.x + Math.cos(angle) * distance;
        const y = playerPos.y + Math.sin(angle) * distance;

        const type = this.getRandomPickupType();
        this.pickups.push(new Pickup(x, y, type));
    }

    spawnPickupAt(x, y, type = null) {
        if (!type) {
            type = this.getRandomPickupType();
        }
        this.pickups.push(new Pickup(x, y, type));
    }

    getRandomPickupType() {
        const totalWeight = this.pickupTypes.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;

        for (const pickupType of this.pickupTypes) {
            random -= pickupType.weight;
            if (random <= 0) {
                return pickupType.type;
            }
        }

        return this.pickupTypes[0].type;
    }

    render(renderer) {
        this.pickups.forEach(pickup => {
            pickup.render(renderer);
        });
    }
}