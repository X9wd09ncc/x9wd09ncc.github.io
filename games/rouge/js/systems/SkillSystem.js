class Skill {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || '⚡';
        this.type = config.type; // 'active' or 'passive'
        this.cooldown = config.cooldown || 0;
        this.currentCooldown = 0;
        this.level = 1;
        this.maxLevel = config.maxLevel || 5;
        this.rarity = config.rarity || 'common'; // common, rare, epic, legendary
        
        // 效果函数
        this.onActivate = config.onActivate || (() => {});
        this.onUpdate = config.onUpdate || (() => {});
        this.onLevelUp = config.onLevelUp || (() => {});
        
        // 被动效果
        this.passiveEffects = config.passiveEffects || {};
    }
    
    activate(player, game) {
        if (this.type === 'active' && this.currentCooldown <= 0) {
            this.onActivate(player, game, this.level);
            this.currentCooldown = this.cooldown;
            return true;
        }
        return false;
    }
    
    update(deltaTime, player, game) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= deltaTime;
        }
        this.onUpdate(deltaTime, player, game, this.level);
    }
    
    levelUp() {
        if (this.level < this.maxLevel) {
            this.level++;
            this.onLevelUp(this.level);
            return true;
        }
        return false;
    }
    
    getDescription() {
        return this.description.replace(/\{(\w+)\}/g, (match, key) => {
            if (this.passiveEffects[key]) {
                return this.passiveEffects[key] * this.level;
            }
            return match;
        });
    }
}

class SkillSystem {
    constructor() {
        this.availableSkills = new Map();
        this.playerSkills = [];
        this.maxSkills = 6;
        this.initializeSkills();
    }
    
    initializeSkills() {
        // 主动技能
        this.registerSkill(new Skill({
            id: 'dash',
            name: '闪避冲刺',
            description: '快速向前冲刺，期间无敌',
            type: 'active',
            cooldown: 3,
            rarity: 'common',
            onActivate: (player, game, level) => {
                const dashDistance = 200 + level * 50;
                const dashDuration = 0.2;
                const direction = Vector2.fromAngle(player.rotation);
                
                player.invulnerableTime = dashDuration;
                player.velocity = direction.multiply(dashDistance / dashDuration);
                
                // 冲刺特效
                for (let i = 0; i < 10; i++) {
                    game.particleSystem.emit(
                        player.position.x,
                        player.position.y,
                        '#4444ff',
                        {
                            velocity: direction.multiply(-100 - Math.random() * 100),
                            size: 5 + Math.random() * 5,
                            lifetime: 0.5
                        }
                    );
                }
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'explosion',
            name: '爆炸冲击',
            description: '在周围产生爆炸，造成{damage}点伤害',
            type: 'active',
            cooldown: 5,
            rarity: 'rare',
            passiveEffects: { damage: 100 },
            onActivate: (player, game, level) => {
                const damage = 100 * level;
                const radius = 150 + level * 20;
                
                // 爆炸效果
                for (let i = 0; i < 30; i++) {
                    const angle = (Math.PI * 2 * i) / 30;
                    game.particleSystem.emit(
                        player.position.x,
                        player.position.y,
                        '#ff6644',
                        {
                            velocity: Vector2.fromAngle(angle).multiply(200),
                            size: 10,
                            lifetime: 0.5
                        }
                    );
                }
                
                // 对周围敌人造成伤害
                game.enemies.forEach(enemy => {
                    if (enemy.alive && player.distanceTo(enemy) < radius) {
                        enemy.takeDamage(damage);
                        if (!enemy.alive) {
                            player.addKill();
                        }
                    }
                });
                
                if (game.audioManager) {
                    game.audioManager.play('explosion');
                }
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'heal',
            name: '治疗术',
            description: '恢复{heal}%最大生命值',
            type: 'active',
            cooldown: 10,
            rarity: 'common',
            passiveEffects: { heal: 30 },
            onActivate: (player, game, level) => {
                const healAmount = player.maxHealth * (0.3 + level * 0.1);
                player.heal(healAmount);
                
                // 治疗特效
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    game.particleSystem.emit(
                        player.position.x,
                        player.position.y,
                        '#44ff44',
                        {
                            velocity: Vector2.fromAngle(angle).multiply(50),
                            size: 8,
                            lifetime: 1
                        }
                    );
                }
            }
        }));
        
        // 被动技能
        this.registerSkill(new Skill({
            id: 'attackBoost',
            name: '攻击强化',
            description: '增加{attack}%攻击力',
            type: 'passive',
            rarity: 'common',
            passiveEffects: { attack: 20 },
            onLevelUp: function(level) {
                this.passiveEffects.attack = 20 * level;
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'speedBoost',
            name: '疾风步',
            description: '增加{speed}%移动速度',
            type: 'passive',
            rarity: 'common',
            passiveEffects: { speed: 15 },
            onLevelUp: function(level) {
                this.passiveEffects.speed = 15 * level;
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'vampirism',
            name: '吸血',
            description: '击杀敌人恢复{lifesteal}%最大生命值',
            type: 'passive',
            rarity: 'rare',
            passiveEffects: { lifesteal: 5 },
            onLevelUp: function(level) {
                this.passiveEffects.lifesteal = 5 * level;
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'critMaster',
            name: '暴击大师',
            description: '增加{crit}%暴击率和{critDamage}%暴击伤害',
            type: 'passive',
            rarity: 'epic',
            passiveEffects: { crit: 10, critDamage: 50 },
            onLevelUp: function(level) {
                this.passiveEffects.crit = 10 * level;
                this.passiveEffects.critDamage = 50 * level;
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'shield',
            name: '能量护盾',
            description: '每隔10秒获得{shield}点护盾',
            type: 'passive',
            rarity: 'rare',
            passiveEffects: { shield: 20 },
            onUpdate: (deltaTime, player, game, level) => {
                if (!this.shieldTimer) this.shieldTimer = 0;
                this.shieldTimer += deltaTime;
                
                if (this.shieldTimer >= 10) {
                    player.addShield(20 * level);
                    this.shieldTimer = 0;
                }
            },
            onLevelUp: function(level) {
                this.passiveEffects.shield = 20 * level;
            }
        }));
        
        this.registerSkill(new Skill({
            id: 'multishot',
            name: '多重射击',
            description: '每{interval}秒激活3秒的多重射击',
            type: 'passive',
            rarity: 'epic',
            passiveEffects: { interval: 15 },
            onUpdate: (deltaTime, player, game, level) => {
                if (!this.multishotTimer) this.multishotTimer = 0;
                this.multishotTimer += deltaTime;
                
                const interval = 15 - level * 2;
                if (this.multishotTimer >= interval) {
                    player.enableMultishot(3);
                    this.multishotTimer = 0;
                }
            },
            onLevelUp: function(level) {
                this.passiveEffects.interval = 15 - level * 2;
            }
        }));
    }
    
    registerSkill(skill) {
        this.availableSkills.set(skill.id, skill);
    }
    
    addSkillToPlayer(skillId) {
        if (this.playerSkills.length >= this.maxSkills) {
            return false;
        }
        
        const skill = this.availableSkills.get(skillId);
        if (skill) {
            // 检查是否已经拥有该技能
            const existingSkill = this.playerSkills.find(s => s.id === skillId);
            if (existingSkill) {
                // 升级技能
                return existingSkill.levelUp();
            } else {
                // 添加新技能
                const newSkill = new Skill({
                    ...skill,
                    onActivate: skill.onActivate,
                    onUpdate: skill.onUpdate,
                    onLevelUp: skill.onLevelUp
                });
                this.playerSkills.push(newSkill);
                return true;
            }
        }
        return false;
    }
    
    updateSkills(deltaTime, player, game) {
        this.playerSkills.forEach(skill => {
            skill.update(deltaTime, player, game);
        });
    }
    
    activateSkill(index, player, game) {
        if (index >= 0 && index < this.playerSkills.length) {
            const skill = this.playerSkills[index];
            return skill.activate(player, game);
        }
        return false;
    }
    
    getRandomSkillOptions(count = 3, excludeMaxLevel = true) {
        const availableOptions = [];
        
        // 获取所有可用技能
        this.availableSkills.forEach((skill, id) => {
            const playerSkill = this.playerSkills.find(s => s.id === id);
            
            // 如果玩家没有这个技能，或者技能还能升级
            if (!playerSkill || (playerSkill && playerSkill.level < playerSkill.maxLevel)) {
                availableOptions.push({
                    id: id,
                    skill: skill,
                    isUpgrade: !!playerSkill,
                    currentLevel: playerSkill ? playerSkill.level : 0
                });
            }
        });
        
        // 随机选择技能
        const selected = [];
        while (selected.length < count && availableOptions.length > 0) {
            const index = Math.floor(Math.random() * availableOptions.length);
            selected.push(availableOptions[index]);
            availableOptions.splice(index, 1);
        }
        
        return selected;
    }
    
    getPlayerSkillStats(player) {
        const stats = {
            attackMultiplier: 1,
            speedMultiplier: 1,
            critChanceBonus: 0,
            critDamageBonus: 0,
            lifeStealBonus: 0
        };
        
        this.playerSkills.forEach(skill => {
            if (skill.type === 'passive') {
                switch (skill.id) {
                    case 'attackBoost':
                        stats.attackMultiplier += skill.passiveEffects.attack / 100;
                        break;
                    case 'speedBoost':
                        stats.speedMultiplier += skill.passiveEffects.speed / 100;
                        break;
                    case 'vampirism':
                        stats.lifeStealBonus += skill.passiveEffects.lifesteal / 100;
                        break;
                    case 'critMaster':
                        stats.critChanceBonus += skill.passiveEffects.crit / 100;
                        stats.critDamageBonus += skill.passiveEffects.critDamage / 100;
                        break;
                }
            }
        });
        
        return stats;
    }
}