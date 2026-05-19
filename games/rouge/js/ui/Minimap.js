class Minimap {
    constructor(size = 150, margin = 20) {
        this.size = size;
        this.margin = margin;
        this.radarRange = 500; // 雷达探测范围
        this.blipSize = 3;
        this.playerBlipSize = 5;
        
        // 创建小地图画布
        this.canvas = document.createElement('canvas');
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.className = 'minimap';
        this.ctx = this.canvas.getContext('2d');
        
        // 设置样式
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = margin + 'px';
        this.canvas.style.right = margin + 'px';
        this.canvas.style.border = '2px solid rgba(0, 255, 255, 0.5)';
        this.canvas.style.borderRadius = '50%';
        this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.canvas.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
        
        document.getElementById('ui-overlay').appendChild(this.canvas);
        
        // 雷达扫描效果
        this.scanAngle = 0;
        this.scanSpeed = 2; // 弧度/秒
    }
    
    update(deltaTime, player, enemies) {
        // 更新雷达扫描角度
        this.scanAngle += this.scanSpeed * deltaTime;
        if (this.scanAngle > Math.PI * 2) {
            this.scanAngle -= Math.PI * 2;
        }
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.size, this.size);
        
        // 绘制雷达背景
        this.drawRadarBackground();
        
        // 绘制扫描线
        this.drawScanLine();
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制玩家
        this.drawPlayer();
        
        // 绘制敌人
        this.drawEnemies(player, enemies);
        
        // 绘制边框光晕
        this.drawBorderGlow();
    }
    
    drawRadarBackground() {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const radius = this.size / 2 - 2;
        
        // 背景渐变
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0, 40, 40, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 20, 30, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawScanLine() {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const radius = this.size / 2 - 2;
        
        // 扫描线渐变
        const gradient = this.ctx.createLinearGradient(
            centerX,
            centerY,
            centerX + Math.cos(this.scanAngle) * radius,
            centerY + Math.sin(this.scanAngle) * radius
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
        
        // 绘制扫描扇形
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, radius, this.scanAngle - 0.5, this.scanAngle, false);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 绘制扫描线
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(
            centerX + Math.cos(this.scanAngle) * radius,
            centerY + Math.sin(this.scanAngle) * radius
        );
        this.ctx.stroke();
    }
    
    drawGrid() {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        // 绘制同心圆
        for (let i = 1; i <= 3; i++) {
            const radius = (this.size / 2 - 2) * (i / 3);
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // 绘制十字线
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, 2);
        this.ctx.lineTo(centerX, this.size - 2);
        this.ctx.moveTo(2, centerY);
        this.ctx.lineTo(this.size - 2, centerY);
        this.ctx.stroke();
    }
    
    drawPlayer() {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        
        // 玩家光点
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.playerBlipSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 玩家光晕
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.playerBlipSize + 3, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawEnemies(player, enemies) {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const scale = (this.size / 2 - 10) / this.radarRange;
        
        enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            const dx = enemy.position.x - player.position.x;
            const dy = enemy.position.y - player.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 只显示雷达范围内的敌人
            if (distance <= this.radarRange) {
                const blipX = centerX + dx * scale;
                const blipY = centerY + dy * scale;
                
                // 检查是否在雷达圆形范围内
                const blipDistance = Math.sqrt(
                    Math.pow(blipX - centerX, 2) + 
                    Math.pow(blipY - centerY, 2)
                );
                
                if (blipDistance <= this.size / 2 - 5) {
                    // 根据敌人类型设置颜色
                    let color = '#ff0000';
                    switch(enemy.enemyType) {
                        case 'fast':
                            color = '#ff8800';
                            break;
                        case 'tank':
                            color = '#ff0088';
                            break;
                        case 'ranged':
                            color = '#ff00ff';
                            break;
                    }
                    
                    // 雷达扫描过的敌人会发光
                    const angleToEnemy = Math.atan2(dy, dx);
                    const angleDiff = Math.abs(angleToEnemy - this.scanAngle);
                    const isScanned = angleDiff < 0.2 || angleDiff > Math.PI * 2 - 0.2;
                    
                    if (isScanned) {
                        // 扫描到的敌人发光效果
                        this.ctx.shadowBlur = 10;
                        this.ctx.shadowColor = color;
                    }
                    
                    // 绘制敌人光点
                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.arc(blipX, blipY, this.blipSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.shadowBlur = 0;
                    
                    // 距离指示器
                    if (distance < 150) {
                        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.arc(blipX, blipY, this.blipSize + 2, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }
            }
        });
    }
    
    drawBorderGlow() {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const radius = this.size / 2 - 2;
        
        // 外边框发光
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
    }
}