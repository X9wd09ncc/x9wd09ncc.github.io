class LevelManager {
    constructor() {
        this.level = 1;
        this.enemiesKilledInLevel = 0;
        this.enemiesRequiredForLevel = 30;
        this.levelProgress = 0;
        
        this.levelData = {
            enemyCount: 15,
            enemyHealth: 1,
            enemySpeed: 1,
            enemyDamage: 1,
            spawnRate: 2,
            enemyTypeWeights: {
                basic: 0.6,
                fast: 0.2,
                tank: 0.1,
                ranged: 0.1
            }
        };
        
        this.onLevelUp = null;
    }
    
    update(kills) {
        const newKills = kills - this.enemiesKilledInLevel;
        if (newKills > 0) {
            this.enemiesKilledInLevel = kills;
            this.updateProgress();
        }
    }
    
    updateProgress() {
        const killsInCurrentLevel = this.enemiesKilledInLevel % this.enemiesRequiredForLevel;
        this.levelProgress = killsInCurrentLevel / this.enemiesRequiredForLevel;
        
        if (killsInCurrentLevel === 0 && this.enemiesKilledInLevel > 0) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        
        // 敌人数量随关卡大幅增加
        this.levelData.enemyCount = Math.floor(15 + this.level * 5 + Math.pow(this.level, 1.5));
        
        // 敌人属性增长
        this.levelData.enemyHealth = 1 + (this.level - 1) * 0.2;
        this.levelData.enemySpeed = 1 + (this.level - 1) * 0.12;
        this.levelData.enemyDamage = 1 + (this.level - 1) * 0.15;
        
        // 生成速度随关卡增加
        this.levelData.spawnRate = Math.min(5, 2 + (this.level - 1) * 0.25);
        
        const levelFactor = Math.min(this.level / 10, 1);
        this.levelData.enemyTypeWeights = {
            basic: Math.max(0.3, 0.6 - levelFactor * 0.3),
            fast: Math.min(0.3, 0.2 + levelFactor * 0.1),
            tank: Math.min(0.25, 0.1 + levelFactor * 0.15),
            ranged: Math.min(0.25, 0.1 + levelFactor * 0.15)
        };
        
        this.enemiesRequiredForLevel = Math.floor(30 + this.level * 10 + Math.pow(this.level, 1.3) * 5);
        
        if (this.onLevelUp) {
            this.onLevelUp(this.level);
        }
    }
    
    getEnemyTypeWeights() {
        const weights = this.levelData.enemyTypeWeights;
        return [
            weights.basic,
            weights.fast,
            weights.tank,
            weights.ranged
        ];
    }
    
    getEnemyMultipliers() {
        return {
            health: this.levelData.enemyHealth,
            speed: this.levelData.enemySpeed,
            damage: this.levelData.enemyDamage
        };
    }
    
    getSpawnDelay() {
        return Math.max(0.2, 1 / this.levelData.spawnRate);
    }
    
    getEnemiesPerWave() {
        return this.levelData.enemyCount;
    }
}