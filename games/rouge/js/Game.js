class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.inputManager = new InputManager(this.canvas);

        this.joystick = new Joystick(document.getElementById('joystick-container'));
        this.minimap = new Minimap();

        this.player = null;
        this.enemies = [];
        this.bulletManager = new BulletManager();
        this.collisionSystem = new CollisionSystem();
        this.particleSystem = new ParticleSystem();
        this.levelManager = new LevelManager();
        this.terrainSystem = new TerrainSystem();
        this.pickupManager = new PickupManager();
        this.audioManager = new AudioManager();
        this.skillSystem = new SkillSystem();
        this.upgradePanel = new UpgradePanel();

        this.collisionSystem.setParticleSystem(this.particleSystem);

        this.levelManager.onLevelUp = (level) => {
            this.showLevelUpMessage(level);
            this.player.levelUp();
            this.particleSystem.createLevelUp(this.player.position.x, this.player.position.y);
            this.audioManager.play('levelUp');
            // 显示升级选择界面
            this.showUpgradeOptions();
        };

        this.wave = 1;
        this.enemiesPerWave = 5;
        this.waveTimer = 0;
        this.waveDelay = 3;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.spawnDelay = 1;

        this.gameState = 'playing';
        this.isPaused = false;
        this.gameTime = 0;

        this.lastTime = 0;
        this.deltaTime = 0;

        this.ui = {
            score: document.getElementById('score'),
            health: document.getElementById('health'),
            wave: document.getElementById('wave'),
            level: document.getElementById('level'),
            levelProgress: document.getElementById('level-progress'),
            attack: document.getElementById('attack'),
            defense: document.getElementById('defense'),
            crit: document.getElementById('crit'),
            speed: document.getElementById('speed')
        };

        this.levelUpMessage = '';
        this.levelUpMessageTimer = 0;
        this.pauseMessage = '游戏已暂停';
        this.pauseHint = '按 空格 继续';
        this.pauseOverlayOffset = 0;
        this.floatingTexts = [];

        window.game = this;
    }

    start() {
        this.player = new Player(0, 0);
        this.updateUI();
        this.gameLoop(0);

        // 绑定技能快捷键
        this.inputManager.onKeyPress = (key) => {
            if (key === ' ' || key === 'Space' || key === 'Spacebar') {
                this.togglePause();
                return;
            }
            if (this.upgradePanel.visible) return;
            if (key >= '1' && key <= '6') {
                const skillIndex = parseInt(key) - 1;
                this.skillSystem.activateSkill(skillIndex, this.player, this);
            }
        };
    }

    gameLoop(currentTime) {
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        if (this.gameState === 'playing' && !this.isPaused) {
            this.updateFloatingTexts(this.deltaTime);
            this.update(this.deltaTime);
        } else if (this.upgradePanel.visible) {
            this.upgradePanel.update(this.deltaTime, this.inputManager);
        }

        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        this.gameTime += deltaTime;

        if (this.player.alive) {
            // 更新玩家技能属性
            this.player.skillStats = this.skillSystem.getPlayerSkillStats(this.player);

            const terrain = this.terrainSystem.getTerrainAt(this.player.position.x, this.player.position.y);
            this.player.speedMultiplier = terrain.walkSpeed;
            this.player.update(deltaTime, this.inputManager, this.joystick, this.enemies, this.bulletManager);

            // 更新技能系统
            this.skillSystem.updateSkills(deltaTime, this.player, this);
        } else {
            this.gameState = 'gameover';
        }

        this.enemies = this.enemies.filter(enemy => enemy.alive);
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime, this.player, this.enemies, this.bulletManager);
        });

        this.bulletManager.update(deltaTime);

        this.collisionSystem.checkCollisions(
            this.player,
            this.enemies,
            this.bulletManager.activeBullets
        );

        this.particleSystem.update(deltaTime);

        this.levelManager.update(this.player.kills);

        this.pickupManager.update(deltaTime, this.player, this.levelManager);

        this.minimap.update(deltaTime, this.player, this.enemies);

        this.updateWaveSystem(deltaTime);

        if (this.levelUpMessageTimer > 0) {
            this.levelUpMessageTimer -= deltaTime;
        }

        this.renderer.setCameraPosition(
            this.player.position.x,
            this.player.position.y
        );

        this.updateUI();
    }

    updateWaveSystem(deltaTime) {
        const enemiesPerWave = this.levelManager.getEnemiesPerWave();
        const spawnDelay = this.levelManager.getSpawnDelay();

        if (this.enemiesSpawned < enemiesPerWave) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= spawnDelay) {
                this.spawnEnemy();
                this.enemiesSpawned++;
                this.spawnTimer = 0;
            }
        } else if (this.enemies.length === 0) {
            this.waveTimer += deltaTime;
            if (this.waveTimer >= this.waveDelay) {
                this.nextWave();
            }
        }
    }

    spawnEnemy() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 100;
        const x = this.player.position.x + Math.cos(angle) * distance;
        const y = this.player.position.y + Math.sin(angle) * distance;

        const types = ['basic', 'fast', 'tank', 'ranged'];
        const weights = this.levelManager.getEnemyTypeWeights();

        const type = this.weightedRandom(types, weights);
        const enemy = new Enemy(x, y, type);

        const multipliers = this.levelManager.getEnemyMultipliers();
        enemy.applyLevelMultipliers(multipliers);

        this.enemies.push(enemy);
    }

    weightedRandom(options, weights) {
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < options.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return options[i];
            }
        }

        return options[options.length - 1];
    }

    nextWave() {
        this.wave++;
        this.enemiesSpawned = 0;
        this.waveTimer = 0;

        const healAmount = 20 + (this.levelManager.level - 1) * 5;
        this.player.heal(healAmount);
    }

    render() {
        this.renderer.clear();

        this.terrainSystem.render(this.renderer, this.renderer.camera);

        this.drawBackground();

        this.particleSystem.render(this.renderer);

        this.enemies.forEach(enemy => {
            enemy.render(this.renderer);
        });

        if (this.player.alive) {
            this.player.render(this.renderer);
        }

        this.bulletManager.render(this.renderer);

        this.pickupManager.render(this.renderer);

        if (this.gameState === 'gameover') {
            this.drawGameOver();
        }

        if (this.levelUpMessageTimer > 0) {
            this.drawLevelUpMessage();
        }

        // 渲染升级面板
        if (this.upgradePanel.visible) {
            this.upgradePanel.render(this.renderer);
        }

        // 渲染技能UI
        this.drawSkillUI();

        this.drawFloatingTexts();
        if (this.isPaused && this.gameState === 'playing' && !this.upgradePanel.visible) {
            this.drawPauseOverlay();
        }
    }

    drawGameOver() {
        this.renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.renderer.ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

        this.renderer.ctx.fillStyle = '#ff4444';
        this.renderer.ctx.font = '48px Arial';
        this.renderer.ctx.textAlign = 'center';
        this.renderer.ctx.fillText('游戏结束', this.renderer.width / 2, this.renderer.height / 2 - 50);

        this.renderer.ctx.fillStyle = '#ffffff';
        this.renderer.ctx.font = '24px Arial';
        this.renderer.ctx.fillText(`最终得分: ${this.player.score}`, this.renderer.width / 2, this.renderer.height / 2 + 10);
        this.renderer.ctx.fillText(`到达波次: ${this.wave}`, this.renderer.width / 2, this.renderer.height / 2 + 40);
        this.renderer.ctx.fillText(`击杀数: ${this.player.kills}`, this.renderer.width / 2, this.renderer.height / 2 + 70);

        this.renderer.ctx.font = '18px Arial';
        this.renderer.ctx.fillText('按 F5 重新开始', this.renderer.width / 2, this.renderer.height / 2 + 120);
    }

    updateUI() {
        if (this.ui.score) this.ui.score.textContent = this.player.score;
        if (this.ui.health) this.ui.health.textContent = Math.max(0, Math.floor(this.player.health));
        if (this.ui.wave) this.ui.wave.textContent = this.wave;
        if (this.ui.level) this.ui.level.textContent = this.levelManager.level;
        if (this.ui.levelProgress) {
            this.ui.levelProgress.style.width = `${this.levelManager.levelProgress * 100}%`;
        }
        if (this.ui.attack) this.ui.attack.textContent = this.player.attributes.attack.toFixed(1);
        if (this.ui.defense) this.ui.defense.textContent = Math.floor(this.player.attributes.defense * 100) + '%';
        if (this.ui.crit) this.ui.crit.textContent = Math.floor(this.player.attributes.critChance * 100) + '%';
        if (this.ui.speed) this.ui.speed.textContent = Math.floor((1 + this.player.attributes.speedBonus) * 100) + '%';
    }

    showLevelUpMessage(level) {
        this.levelUpMessage = `关卡 ${level}!`;
        this.levelUpMessageTimer = 3;
    }

    drawLevelUpMessage() {
        const alpha = Math.min(1, this.levelUpMessageTimer);
        this.renderer.ctx.save();
        this.renderer.ctx.globalAlpha = alpha;
        this.renderer.ctx.fillStyle = '#ffff00';
        this.renderer.ctx.font = 'bold 48px Arial';
        this.renderer.ctx.textAlign = 'center';
        this.renderer.ctx.fillText(this.levelUpMessage, this.renderer.width / 2, 100);
        this.renderer.ctx.restore();
    }

    drawBackground() {
        const ctx = this.renderer.ctx;
        const { width, height, camera } = this.renderer;

        // 背景渐变
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#081026');
        grad.addColorStop(1, '#05040a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // 轻微世界网格，作为参考（不会影响性能）
        const gridSize = 200;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;

        const zoom = camera.zoom || 1;
        const worldLeft = camera.x - (width / 2) / zoom;
        const worldRight = camera.x + (width / 2) / zoom;
        const worldTop = camera.y - (height / 2) / zoom;
        const worldBottom = camera.y + (height / 2) / zoom;

        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const startY = Math.floor(worldTop / gridSize) * gridSize;

        for (let x = startX; x <= worldRight; x += gridSize) {
            const p1 = this.renderer.worldToScreen({ x: x, y: worldTop });
            const p2 = this.renderer.worldToScreen({ x: x, y: worldBottom });
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        for (let y = startY; y <= worldBottom; y += gridSize) {
            const p1 = this.renderer.worldToScreen({ x: worldLeft, y: y });
            const p2 = this.renderer.worldToScreen({ x: worldRight, y: y });
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawPauseOverlay() {
        this.pauseOverlayOffset += 0.05;
        const floatY = Math.sin(this.pauseOverlayOffset) * 8;
        const ctx = this.renderer.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.pauseMessage, this.renderer.width / 2, this.renderer.height / 2 - 20 + floatY);

        ctx.font = '24px Arial';
        ctx.fillText(this.pauseHint, this.renderer.width / 2, this.renderer.height / 2 + 40 + floatY);
        ctx.restore();
    }

    addFloatingText(text, color = '#ffffff') {
        const side = this.floatingTexts.length % 2 === 0 ? 'right' : 'left';
        this.floatingTexts.push({ text, color, elapsed: 0, duration: 1.5, side });
    }

    updateFloatingTexts(deltaTime) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const item = this.floatingTexts[i];
            item.elapsed += deltaTime;
            if (item.elapsed >= item.duration) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    drawFloatingTexts() {
        if (!this.player || this.floatingTexts.length === 0) return;
        const basePos = this.renderer.worldToScreen(this.player.position);
        const ctx = this.renderer.ctx;
        const startY = basePos.y - 40;

        this.floatingTexts.forEach((item, index) => {
            const alpha = 1 - item.elapsed / item.duration;
            const xOffset = item.side === 'right' ? 80 : -80;
            const x = basePos.x + xOffset;
            const y = startY + index * 26;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = item.color;
            ctx.font = '18px Arial';
            ctx.textAlign = item.side === 'right' ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.text, x, y);
            ctx.restore();
        });
    }
    togglePause() {
        if (this.gameState !== 'playing') return;
        if (this.upgradePanel.visible) return;

        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.pauseOverlayOffset = 0;
        }
    }

    showUpgradeOptions() {
        const options = this.skillSystem.getRandomSkillOptions(3);
        if (options.length > 0) {
            this.isPaused = true;
            this.upgradePanel.show(options, (selected) => {
                this.skillSystem.addSkillToPlayer(selected.id);
                this.isPaused = false;
                // 播放选择音效
                if (this.audioManager) {
                    this.audioManager.play('powerup');
                }
            });
        }
    }

    drawSkillUI() {
        const ctx = this.renderer.ctx;
        const skills = this.skillSystem.playerSkills;
        const startX = 10;
        const startY = this.renderer.height - 80;
        const slotSize = 60;
        const spacing = 10;

        skills.forEach((skill, index) => {
            const x = startX + index * (slotSize + spacing);
            const y = startY;

            // 技能槽背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y, slotSize, slotSize);

            // 技能槽边框
            ctx.strokeStyle = skill.type === 'active' ? '#4488ff' : '#44ff44';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, slotSize, slotSize);

            // 技能图标
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(skill.icon, x + slotSize / 2, y + slotSize / 2 + 10);

            // 技能等级
            if (skill.level > 1) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#ffff00';
                ctx.textAlign = 'right';
                ctx.fillText('Lv' + skill.level, x + slotSize - 5, y + slotSize - 5);
            }

            // 冷却时间
            if (skill.type === 'active' && skill.currentCooldown > 0) {
                // 冷却遮罩
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                const cooldownHeight = slotSize * (skill.currentCooldown / skill.cooldown);
                ctx.fillRect(x, y + slotSize - cooldownHeight, slotSize, cooldownHeight);

                // 冷却时间文字
                ctx.font = '18px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(Math.ceil(skill.currentCooldown), x + slotSize / 2, y + slotSize / 2 + 5);
            }

            // 快捷键提示
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText((index + 1).toString(), x + 5, y + 15);
        });
    }
}