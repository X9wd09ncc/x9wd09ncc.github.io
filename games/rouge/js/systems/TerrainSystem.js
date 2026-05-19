class TerrainSystem {
    constructor() {
        this.terrainTiles = new Map();
        this.tileSize = 100;
        this.renderDistance = 10;
        
        this.terrainTypes = {
            grass: {
                color: '#2d5016',
                pattern: 'grass',
                walkSpeed: 1
            },
            stone: {
                color: '#5a5a5a',
                pattern: 'stone',
                walkSpeed: 0.9
            },
            mountain: {
                color: '#8b7355',
                pattern: 'mountain',
                walkSpeed: 0.7
            },
            sand: {
                color: '#c19a6b',
                pattern: 'sand',
                walkSpeed: 0.8
            },
            water: {
                color: '#1e90ff',
                pattern: 'water',
                walkSpeed: 0.5
            }
        };
        
        this.decorations = [];
        this.generateTerrain();
    }
    
    generateTerrain() {
        const worldSize = 40;
        
        for (let x = -worldSize; x <= worldSize; x++) {
            for (let y = -worldSize; y <= worldSize; y++) {
                const tile = this.generateTile(x, y);
                const key = `${x},${y}`;
                this.terrainTiles.set(key, tile);
            }
        }
        
        this.generateDecorations();
    }
    
    generateTile(x, y) {
        const noise1 = this.noise(x * 0.1, y * 0.1);
        const noise2 = this.noise(x * 0.05 + 100, y * 0.05 + 100);
        const combinedNoise = (noise1 + noise2) / 2;
        
        let type = 'grass';
        if (combinedNoise < 0.3) {
            type = 'water';
        } else if (combinedNoise < 0.4) {
            type = 'sand';
        } else if (combinedNoise < 0.6) {
            type = 'grass';
        } else if (combinedNoise < 0.8) {
            type = 'stone';
        } else {
            type = 'mountain';
        }
        
        return {
            x: x,
            y: y,
            type: type,
            variation: Math.random()
        };
    }
    
    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const a = this.p[X] + Y;
        const aa = this.p[a];
        const ab = this.p[a + 1];
        const b = this.p[X + 1] + Y;
        const ba = this.p[b];
        const bb = this.p[b + 1];
        
        const gradAA = this.grad(this.p[aa], x, y);
        const gradBA = this.grad(this.p[ba], x - 1, y);
        const gradAB = this.grad(this.p[ab], x, y - 1);
        const gradBB = this.grad(this.p[bb], x - 1, y - 1);
        
        const lerpX1 = this.lerp(gradAA, gradBA, u);
        const lerpX2 = this.lerp(gradAB, gradBB, u);
        
        return (this.lerp(lerpX1, lerpX2, v) + 1) / 2;
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    get p() {
        if (!this._p) {
            this._p = [];
            const permutation = [];
            for (let i = 0; i < 256; i++) {
                permutation[i] = i;
            }
            
            for (let i = 255; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
            }
            
            for (let i = 0; i < 512; i++) {
                this._p[i] = permutation[i & 255];
            }
        }
        return this._p;
    }
    
    generateDecorations() {
        const decorationCount = 500;
        const worldSize = 4000;
        
        for (let i = 0; i < decorationCount; i++) {
            const x = (Math.random() - 0.5) * worldSize;
            const y = (Math.random() - 0.5) * worldSize;
            const tileX = Math.floor(x / this.tileSize);
            const tileY = Math.floor(y / this.tileSize);
            const tile = this.getTile(tileX, tileY);
            
            if (tile && tile.type !== 'water') {
                let decorationType = 'rock';
                if (tile.type === 'grass') {
                    decorationType = Math.random() < 0.7 ? 'tree' : 'flower';
                } else if (tile.type === 'sand') {
                    decorationType = Math.random() < 0.8 ? 'cactus' : 'rock';
                } else if (tile.type === 'stone' || tile.type === 'mountain') {
                    decorationType = 'rock';
                }
                
                this.decorations.push({
                    x: x,
                    y: y,
                    type: decorationType,
                    size: 0.5 + Math.random() * 0.5,
                    rotation: Math.random() * Math.PI * 2
                });
            }
        }
    }
    
    getTile(x, y) {
        const key = `${x},${y}`;
        return this.terrainTiles.get(key);
    }
    
    getTerrainAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        const tile = this.getTile(tileX, tileY);
        return tile ? this.terrainTypes[tile.type] : this.terrainTypes.grass;
    }
    
    render(renderer, camera) {
        const startX = Math.floor((camera.x - renderer.width / 2 / camera.zoom) / this.tileSize) - 1;
        const endX = Math.floor((camera.x + renderer.width / 2 / camera.zoom) / this.tileSize) + 1;
        const startY = Math.floor((camera.y - renderer.height / 2 / camera.zoom) / this.tileSize) - 1;
        const endY = Math.floor((camera.y + renderer.height / 2 / camera.zoom) / this.tileSize) + 1;
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const tile = this.getTile(x, y);
                if (tile) {
                    this.renderTile(renderer, tile);
                }
            }
        }
        
        this.renderDecorations(renderer, camera);
    }
    
    renderTile(renderer, tile) {
        const terrain = this.terrainTypes[tile.type];
        const worldX = tile.x * this.tileSize;
        const worldY = tile.y * this.tileSize;
        
        renderer.ctx.fillStyle = terrain.color;
        renderer.drawRectWorld(
            new Vector2(worldX, worldY),
            this.tileSize,
            this.tileSize,
            terrain.color
        );
        
        if (tile.type === 'grass') {
            this.drawGrassPattern(renderer, worldX, worldY, tile.variation);
        } else if (tile.type === 'stone') {
            this.drawStonePattern(renderer, worldX, worldY, tile.variation);
        } else if (tile.type === 'water') {
            this.drawWaterPattern(renderer, worldX, worldY, tile.variation);
        }
    }
    
    drawGrassPattern(renderer, x, y, variation) {
        const grassCount = 3 + Math.floor(variation * 3);
        renderer.ctx.strokeStyle = '#1a3a0a';
        renderer.ctx.lineWidth = 2;
        
        for (let i = 0; i < grassCount; i++) {
            const offsetX = x + (variation + i * 0.3) * this.tileSize;
            const offsetY = y + (variation + i * 0.4) * this.tileSize;
            
            if (offsetX < x + this.tileSize && offsetY < y + this.tileSize) {
                renderer.drawLineWorld(
                    new Vector2(offsetX, offsetY),
                    new Vector2(offsetX - 5, offsetY - 10),
                    '#1a3a0a',
                    2
                );
            }
        }
    }
    
    drawStonePattern(renderer, x, y, variation) {
        const stoneCount = 2 + Math.floor(variation * 2);
        
        for (let i = 0; i < stoneCount; i++) {
            const offsetX = x + (variation + i * 0.4) * this.tileSize;
            const offsetY = y + (variation + i * 0.3) * this.tileSize;
            const size = 5 + variation * 10;
            
            if (offsetX < x + this.tileSize && offsetY < y + this.tileSize) {
                renderer.drawCircleWorld(
                    new Vector2(offsetX, offsetY),
                    size,
                    '#3a3a3a'
                );
            }
        }
    }
    
    drawWaterPattern(renderer, x, y, variation) {
        const time = Date.now() / 1000;
        const waveOffset = Math.sin(time + variation * 10) * 5;
        
        renderer.ctx.strokeStyle = '#0066cc';
        renderer.ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            const offsetY = y + (i + 0.5) * this.tileSize / 3;
            renderer.drawLineWorld(
                new Vector2(x, offsetY + waveOffset),
                new Vector2(x + this.tileSize, offsetY + waveOffset),
                '#0066cc',
                1
            );
        }
    }
    
    renderDecorations(renderer, camera) {
        const viewRadius = Math.max(renderer.width, renderer.height) / camera.zoom;
        
        this.decorations.forEach(decoration => {
            const distance = Math.sqrt(
                Math.pow(decoration.x - camera.x, 2) + 
                Math.pow(decoration.y - camera.y, 2)
            );
            
            if (distance < viewRadius) {
                this.renderDecoration(renderer, decoration);
            }
        });
    }
    
    renderDecoration(renderer, decoration) {
        renderer.ctx.save();
        
        const screenPos = renderer.worldToScreen(new Vector2(decoration.x, decoration.y));
        renderer.ctx.translate(screenPos.x, screenPos.y);
        renderer.ctx.rotate(decoration.rotation);
        
        const size = decoration.size * renderer.camera.zoom;
        
        switch (decoration.type) {
            case 'tree':
                renderer.ctx.fillStyle = '#228b22';
                renderer.ctx.fillRect(-size * 10, -size * 30, size * 20, size * 30);
                renderer.ctx.fillStyle = '#8b4513';
                renderer.ctx.fillRect(-size * 3, 0, size * 6, size * 15);
                break;
                
            case 'rock':
                renderer.ctx.fillStyle = '#696969';
                renderer.ctx.beginPath();
                renderer.ctx.arc(0, 0, size * 15, 0, Math.PI * 2);
                renderer.ctx.fill();
                break;
                
            case 'flower':
                renderer.ctx.fillStyle = '#ff69b4';
                for (let i = 0; i < 5; i++) {
                    renderer.ctx.save();
                    renderer.ctx.rotate(i * Math.PI * 2 / 5);
                    renderer.ctx.beginPath();
                    renderer.ctx.arc(0, -size * 8, size * 4, 0, Math.PI * 2);
                    renderer.ctx.fill();
                    renderer.ctx.restore();
                }
                renderer.ctx.fillStyle = '#ffff00';
                renderer.ctx.beginPath();
                renderer.ctx.arc(0, 0, size * 3, 0, Math.PI * 2);
                renderer.ctx.fill();
                break;
                
            case 'cactus':
                renderer.ctx.fillStyle = '#2e8b57';
                renderer.ctx.fillRect(-size * 5, -size * 25, size * 10, size * 25);
                renderer.ctx.fillRect(-size * 15, -size * 15, size * 8, size * 10);
                renderer.ctx.fillRect(size * 7, -size * 20, size * 8, size * 10);
                break;
        }
        
        renderer.ctx.restore();
    }
}