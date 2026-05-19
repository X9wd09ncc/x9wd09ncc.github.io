class UpgradePanel {
    constructor() {
        this.visible = false;
        this.options = [];
        this.selectedIndex = -1;
        this.animationTime = 0;
        this.onSelect = null;
    }
    
    show(options, onSelect) {
        this.visible = true;
        this.options = options;
        this.selectedIndex = -1;
        this.animationTime = 0;
        this.onSelect = onSelect;
    }
    
    hide() {
        this.visible = false;
        this.options = [];
        this.selectedIndex = -1;
    }
    
    update(deltaTime, inputManager) {
        if (!this.visible) return;
        
        this.animationTime += deltaTime;
        
        const mousePos = inputManager.getMousePosition();
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = mousePos.x - rect.left;
        const y = mousePos.y - rect.top;
        
        // 检测鼠标悬停
        const panelWidth = 800;
        const panelHeight = 400;
        const startX = (canvas.width - panelWidth) / 2;
        const startY = (canvas.height - panelHeight) / 2;
        
        const cardWidth = 240;
        const cardHeight = 320;
        const cardSpacing = 20;
        const totalWidth = cardWidth * 3 + cardSpacing * 2;
        const cardStartX = startX + (panelWidth - totalWidth) / 2;
        const cardY = startY + 40;
        
        this.selectedIndex = -1;
        
        for (let i = 0; i < this.options.length; i++) {
            const cardX = cardStartX + i * (cardWidth + cardSpacing);
            
            if (x >= cardX && x <= cardX + cardWidth &&
                y >= cardY && y <= cardY + cardHeight) {
                this.selectedIndex = i;
                
                if (inputManager.isMousePressed()) {
                    if (this.onSelect) {
                        this.onSelect(this.options[i]);
                    }
                    this.hide();
                }
                break;
            }
        }
    }
    
    render(renderer) {
        if (!this.visible) return;
        
        const ctx = renderer.ctx;
        const canvas = ctx.canvas;
        
        // 背景遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 面板背景
        const panelWidth = 800;
        const panelHeight = 400;
        const startX = (canvas.width - panelWidth) / 2;
        const startY = (canvas.height - panelHeight) / 2;
        
        // 面板渐变背景
        const bgGradient = ctx.createLinearGradient(startX, startY, startX, startY + panelHeight);
        bgGradient.addColorStop(0, 'rgba(20, 20, 40, 0.95)');
        bgGradient.addColorStop(1, 'rgba(10, 10, 30, 0.95)');
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(startX, startY, panelWidth, panelHeight);
        
        // 面板边框
        ctx.strokeStyle = '#4444ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(startX, startY, panelWidth, panelHeight);
        
        // 标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('选择升级', canvas.width / 2, startY + 40);
        
        // 技能卡片
        const cardWidth = 240;
        const cardHeight = 320;
        const cardSpacing = 20;
        const totalWidth = cardWidth * 3 + cardSpacing * 2;
        const cardStartX = startX + (panelWidth - totalWidth) / 2;
        const cardY = startY + 40;
        
        this.options.forEach((option, index) => {
            const cardX = cardStartX + index * (cardWidth + cardSpacing);
            const isHovered = this.selectedIndex === index;
            
            // 卡片动画
            const scale = isHovered ? 1.05 : 1;
            const offsetY = Math.sin(this.animationTime * 2 + index) * 5;
            
            ctx.save();
            ctx.translate(cardX + cardWidth / 2, cardY + cardHeight / 2 + offsetY);
            ctx.scale(scale, scale);
            ctx.translate(-cardWidth / 2, -cardHeight / 2);
            
            // 卡片背景
            const rarityColors = {
                common: { bg: 'rgba(80, 80, 80, 0.9)', border: '#888888', glow: '#aaaaaa' },
                rare: { bg: 'rgba(40, 80, 120, 0.9)', border: '#4488cc', glow: '#66aaff' },
                epic: { bg: 'rgba(80, 40, 120, 0.9)', border: '#aa44cc', glow: '#cc66ff' },
                legendary: { bg: 'rgba(120, 80, 40, 0.9)', border: '#ffaa44', glow: '#ffcc66' }
            };
            
            const colors = rarityColors[option.skill.rarity] || rarityColors.common;
            
            // 发光效果
            if (isHovered) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = colors.glow;
            }
            
            // 卡片渐变背景
            const cardGradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
            cardGradient.addColorStop(0, colors.bg);
            cardGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
            
            ctx.fillStyle = cardGradient;
            ctx.fillRect(0, 0, cardWidth, cardHeight);
            
            // 卡片边框
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = isHovered ? 4 : 2;
            ctx.strokeRect(0, 0, cardWidth, cardHeight);
            
            ctx.shadowBlur = 0;
            
            // 技能图标
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(option.skill.icon, cardWidth / 2, 60);
            
            // 技能名称
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = colors.glow;
            ctx.fillText(option.skill.name, cardWidth / 2, 100);
            
            // 升级标记
            if (option.isUpgrade) {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#ffff44';
                ctx.fillText(`等级 ${option.currentLevel} → ${option.currentLevel + 1}`, cardWidth / 2, 125);
            } else {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#44ff44';
                ctx.fillText('新技能!', cardWidth / 2, 125);
            }
            
            // 技能类型
            ctx.font = '14px Arial';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(option.skill.type === 'active' ? '主动技能' : '被动技能', cardWidth / 2, 150);
            
            // 技能描述
            ctx.font = '14px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            const description = option.skill.getDescription();
            const lines = this.wrapText(ctx, description, cardWidth - 20);
            lines.forEach((line, i) => {
                ctx.fillText(line, 10, 180 + i * 20);
            });
            
            // 冷却时间（主动技能）
            if (option.skill.type === 'active') {
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#88ccff';
                ctx.fillText(`冷却时间: ${option.skill.cooldown}秒`, cardWidth / 2, cardHeight - 20);
            }
            
            ctx.restore();
        });
        
        // 提示文字
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('点击选择一项升级', canvas.width / 2, startY + panelHeight - 20);
    }
    
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
}