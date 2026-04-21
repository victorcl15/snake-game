// ============================================================
// SNAKE HUNT — Enhanced Gameplay Engine v2
// Fixed collision bugs + enhanced gameplay + more satisfaction
// ============================================================

const CONFIG = {
    gridSize: 20,
    cellSize: 25,
    initialSpeed: 130,
    speedIncrement: 8,
    maxSpeed: 55,
    levelUpScore: 100,
    mouseSpawnInterval: 2800,
    maxMice: 5,
    mouseTypes: [
        { color: '#9ca3af', glowColor: 'rgba(156,163,175,0.4)', points: 10, growth: 1, speed: 1, weight: 50, name: 'gray' },
        { color: '#cd7f32', glowColor: 'rgba(205,127,50,0.5)', points: 20, growth: 2, speed: 1.5, weight: 30, name: 'brown' },
        { color: '#ffd700', glowColor: 'rgba(255,215,0,0.6)', points: 50, growth: 3, speed: 2, weight: 20, name: 'gold' }
    ],
    interpolation: true,
    screenShake: true,
    trailEnabled: true,
    comboWindow: 2000,
    mouseFleeRadius: 4,     // How close before mice start fleeing
    mouseFleeChance: 0.6,   // Chance to flee vs random when near snake
    spawnSafeRadius: 3,     // Min distance from head when spawning
};

// ============================================================
// Utility helpers
// ============================================================
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function randomRange(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

// ============================================================
// Enhanced Snake with Input Buffering & Interpolation
// ============================================================
class Snake {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.inputQueue = [];
        this.maxQueueSize = 3;
        this.reset();
    }

    reset() {
        const cx = Math.floor(this.gridSize / 2);
        const cy = Math.floor(this.gridSize / 2);
        this.body = [
            { x: cx, y: cy },
            { x: cx - 1, y: cy },
            { x: cx - 2, y: cy }
        ];
        this.prevBody = this.body.map(s => ({ ...s }));
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.growing = 0;
        this.inputQueue = [];
        this.moveProgress = 0;
        this.eatScale = 0;
    }

    queueDirection(newDir) {
        const lastDir = this.inputQueue.length > 0
            ? this.inputQueue[this.inputQueue.length - 1]
            : this.nextDirection;
        if (newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
        if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;
        if (this.inputQueue.length < this.maxQueueSize) {
            this.inputQueue.push(newDir);
        }
    }

    processInput() {
        if (this.inputQueue.length > 0) {
            const newDir = this.inputQueue.shift();
            if (!(newDir.x === -this.direction.x && newDir.y === -this.direction.y)) {
                this.nextDirection = newDir;
            }
        }
    }

    move() {
        this.processInput();
        this.direction = { ...this.nextDirection };
        this.prevBody = this.body.map(s => ({ ...s }));

        const head = { ...this.body[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        this.body.unshift(head);

        if (this.growing > 0) {
            this.growing--;
            this.prevBody.push({ ...this.prevBody[this.prevBody.length - 1] });
        } else {
            this.body.pop();
        }
        this.moveProgress = 0;
    }

    grow(amount) {
        this.growing += amount;
        this.eatScale = 1;
    }

    checkCollision() {
        const head = this.body[0];
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) return true;
        for (let i = 1; i < this.body.length; i++) {
            if (head.x === this.body[i].x && head.y === this.body[i].y) return true;
        }
        return false;
    }

    getHead() { return this.body[0]; }

    // Get the position the head is moving TOWARD (next tick)
    getNextHeadPos() {
        const effectiveDir = this.inputQueue.length > 0 ? this.inputQueue[0] : this.nextDirection;
        // Validate it's not opposite
        const dir = (effectiveDir.x === -this.direction.x && effectiveDir.y === -this.direction.y)
            ? this.direction : effectiveDir;
        return {
            x: this.body[0].x + dir.x,
            y: this.body[0].y + dir.y
        };
    }

    getInterpolatedBody(t) {
        const smoothT = easeOutCubic(Math.min(t, 1));
        return this.body.map((seg, i) => {
            const prev = this.prevBody[i] || seg;
            return {
                x: lerp(prev.x, seg.x, smoothT),
                y: lerp(prev.y, seg.y, smoothT)
            };
        });
    }
}

// ============================================================
// Enhanced Mouse with Smooth Movement + Flee AI
// ============================================================
class Mouse {
    constructor(gridSize, type, avoidPositions = [], safeRadius = 3, snakeHead = null) {
        this.gridSize = gridSize;
        this.type = type;
        this.respawn(avoidPositions, safeRadius, snakeHead);
        this.moveTimer = 0;
        this.moveInterval = 500 / type.speed;
        this.prevX = this.x;
        this.prevY = this.y;
        this.moveProgress = 1;
        this.wobble = 0;
        this.wobbleSpeed = randomRange(3, 6);
        this.scale = 0;
        this.spawnTimer = 0;
        this.tailAngle = 0;
        this.scared = false; // Visual indicator when fleeing
        this.scaredTimer = 0;
    }

    respawn(avoidPositions = [], safeRadius = 3, snakeHead = null) {
        let position, attempts = 0;
        do {
            position = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            attempts++;
            // Check not on occupied cell AND not too close to snake head
            const tooClose = snakeHead && dist(position, snakeHead) < safeRadius;
            const occupied = this.isPositionOccupied(position, avoidPositions);
            if (!occupied && !tooClose) break;
        } while (attempts < 200);

        this.x = position.x;
        this.y = position.y;
        this.prevX = this.x;
        this.prevY = this.y;

        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        this.direction = dirs[Math.floor(Math.random() * dirs.length)];
    }

    isPositionOccupied(pos, avoids) {
        return avoids.some(p => p.x === pos.x && p.y === pos.y);
    }

    update(deltaTime, snakeHead = null) {
        this.moveTimer += deltaTime;
        this.wobble += deltaTime * 0.01 * this.wobbleSpeed;
        this.tailAngle += deltaTime * 0.015;
        this.spawnTimer += deltaTime;
        this.scale = Math.min(1, easeOutElastic(this.spawnTimer / 400));

        if (this.moveProgress < 1) {
            this.moveProgress = Math.min(1, this.moveProgress + deltaTime / (this.moveInterval * 0.8));
        }

        // Scared decay
        if (this.scaredTimer > 0) {
            this.scaredTimer -= deltaTime;
            this.scared = this.scaredTimer > 0;
        }

        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.move(snakeHead);
            return true;
        }
        return false;
    }

    move(snakeHead = null) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.moveProgress = 0;

        // Check if snake is nearby — flee behavior
        let fleeing = false;
        if (snakeHead && dist({ x: this.x, y: this.y }, snakeHead) <= CONFIG.mouseFleeRadius) {
            if (Math.random() < CONFIG.mouseFleeChance) {
                fleeing = true;
                this.scared = true;
                this.scaredTimer = 500;
                this.fleeFrom(snakeHead);
                return;
            }
        }

        const newX = this.x + this.direction.x;
        const newY = this.y + this.direction.y;

        if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize || Math.random() < 0.15) {
            this.changeDirection();
        } else {
            this.x = newX;
            this.y = newY;
        }
    }

    fleeFrom(threat) {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

        // Score each direction by how far it goes from the threat
        const scored = dirs.map(d => {
            const nx = this.x + d.x;
            const ny = this.y + d.y;
            if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) {
                return { dir: d, score: -100 }; // Can't go out of bounds
            }
            const distFromThreat = dist({ x: nx, y: ny }, threat);
            return { dir: d, score: distFromThreat };
        });

        scored.sort((a, b) => b.score - a.score);

        // Pick best escape direction (with some randomness for fun)
        const best = scored[0].score > 0 ? scored[0] : scored[Math.floor(Math.random() * scored.length)];
        this.direction = best.dir;
        const nx = this.x + best.dir.x;
        const ny = this.y + best.dir.y;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
            this.x = nx;
            this.y = ny;
        }
    }

    changeDirection() {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const valid = dirs.filter(d => !(d.x === -this.direction.x && d.y === -this.direction.y));
        this.direction = valid[Math.floor(Math.random() * valid.length)];
    }

    getInterpolatedPos() {
        const t = easeOutCubic(Math.min(this.moveProgress, 1));
        return { x: lerp(this.prevX, this.x, t), y: lerp(this.prevY, this.y, t) };
    }

    // FIX: Collision checks BOTH current position AND previous position
    // to prevent swap-through bug
    checkCollision(x, y) {
        return this.x === x && this.y === y;
    }

    checkSwapCollision(snakePrevHead, snakeNewHead) {
        // Detect if snake and mouse swapped positions
        // Snake was at snakePrevHead, moved to snakeNewHead
        // Mouse was at prevX/prevY, moved to x/y
        // Swap = snake went to where mouse was AND mouse went to where snake was
        if (snakeNewHead.x === this.prevX && snakeNewHead.y === this.prevY &&
            this.x === snakePrevHead.x && this.y === snakePrevHead.y) {
            return true;
        }
        // Also check if they crossed through each other diagonally-adjacent
        // by checking if the mouse was where the snake head now is
        if (snakeNewHead.x === this.x && snakeNewHead.y === this.y) {
            return true;
        }
        return false;
    }
}

// ============================================================
// Particle System
// ============================================================
class Particle {
    constructor(x, y, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = opts.vx || (Math.random() - 0.5) * 6;
        this.vy = opts.vy || (Math.random() - 0.5) * 6;
        this.life = 1;
        this.maxLife = opts.maxLife || randomRange(0.4, 1);
        this.decay = 1 / (this.maxLife * 1000);
        this.color = opts.color || '#fff';
        this.size = opts.size || randomRange(2, 5);
        this.gravity = opts.gravity || 0.05;
        this.friction = opts.friction || 0.98;
        this.type = opts.type || 'circle';
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update(dt) {
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay * dt;
        this.rotation += this.rotationSpeed;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        switch (this.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size * this.life, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                break;
            case 'spark':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = Math.max(0.5, this.size * 0.5 * this.life);
                ctx.beginPath();
                ctx.moveTo(-this.size * 2, 0);
                ctx.lineTo(this.size * 2, 0);
                ctx.stroke();
                break;
            case 'star':
                ctx.fillStyle = this.color;
                this.drawStar(ctx, 0, 0, 5, this.size * this.life, this.size * 0.5 * this.life);
                break;
            case 'ring':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = Math.max(0.5, 2 * this.life);
                ctx.beginPath();
                ctx.arc(0, 0, this.size * (1 - this.life) * 3, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'square':
                ctx.fillStyle = this.color;
                const s = this.size * this.life;
                ctx.fillRect(-s / 2, -s / 2, s, s);
                break;
        }
        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
        ctx.fill();
    }
}

// ============================================================
// Score Popup
// ============================================================
class ScorePopup {
    constructor(x, y, text, color, size = 16) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1;
        this.decay = 0.0012;
        this.vy = -1.5;
        this.scale = 0;
    }

    update(dt) {
        this.y += this.vy;
        this.vy *= 0.98;
        this.life -= this.decay * dt;
        this.scale = Math.min(1, easeOutBack(Math.min(1, (1 - this.life + 0.3))));
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.font = `bold ${this.size}px Poppins, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, 0, 0);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

// ============================================================
// Trail Point
// ============================================================
class TrailPoint {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.life = 1;
        this.color = color;
    }

    update(dt) {
        this.life -= dt * 0.002;
        return this.life > 0;
    }

    draw(ctx, cs) {
        ctx.save();
        ctx.globalAlpha = this.life * 0.15;
        ctx.fillStyle = this.color;
        const size = cs * 0.6 * this.life;
        ctx.beginPath();
        ctx.arc(this.x * cs + cs / 2, this.y * cs + cs / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ============================================================
// Screen Shake
// ============================================================
class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.decay = 0.9;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    trigger(intensity) {
        this.intensity = Math.max(this.intensity, intensity);
    }

    update() {
        if (this.intensity > 0.3) {
            this.offsetX = (Math.random() - 0.5) * this.intensity;
            this.offsetY = (Math.random() - 0.5) * this.intensity;
            this.intensity *= this.decay;
        } else {
            this.intensity = 0;
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }
}

// ============================================================
// Danger Warning (border flash when close to edge)
// ============================================================
class DangerIndicator {
    constructor() {
        this.alpha = 0;
        this.side = null; // 'top', 'bottom', 'left', 'right'
    }

    update(snakeHead, gridSize) {
        const margin = 1;
        this.sides = [];
        if (snakeHead.y <= margin) this.sides.push('top');
        if (snakeHead.y >= gridSize - 1 - margin) this.sides.push('bottom');
        if (snakeHead.x <= margin) this.sides.push('left');
        if (snakeHead.x >= gridSize - 1 - margin) this.sides.push('right');

        this.alpha = this.sides.length > 0
            ? 0.15 + Math.sin(Date.now() * 0.008) * 0.08
            : Math.max(0, this.alpha - 0.02);
    }

    draw(ctx, canvasW, canvasH) {
        if (this.alpha <= 0) return;
        const thickness = 4;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.sides.includes('top')) {
            const g = ctx.createLinearGradient(0, 0, 0, 40);
            g.addColorStop(0, '#f5576c');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, canvasW, 40);
        }
        if (this.sides.includes('bottom')) {
            const g = ctx.createLinearGradient(0, canvasH, 0, canvasH - 40);
            g.addColorStop(0, '#f5576c');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(0, canvasH - 40, canvasW, 40);
        }
        if (this.sides.includes('left')) {
            const g = ctx.createLinearGradient(0, 0, 40, 0);
            g.addColorStop(0, '#f5576c');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 40, canvasH);
        }
        if (this.sides.includes('right')) {
            const g = ctx.createLinearGradient(canvasW, 0, canvasW - 40, 0);
            g.addColorStop(0, '#f5576c');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(canvasW - 40, 0, 40, canvasH);
        }

        ctx.restore();
    }
}

// ============================================================
// Main Game Engine
// ============================================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = CONFIG.gridSize * CONFIG.cellSize;
        this.canvas.height = CONFIG.gridSize * CONFIG.cellSize;

        this.snake = new Snake(CONFIG.gridSize);
        this.mice = [];
        this.particles = [];
        this.scorePopups = [];
        this.trailPoints = [];
        this.screenShake = new ScreenShake();
        this.dangerIndicator = new DangerIndicator();
        this.pulseRings = [];

        this.score = 0;
        this.level = 1;
        this.highscore = parseInt(localStorage.getItem('snakeHighscore')) || 0;
        this.gameState = 'start';
        this.speed = CONFIG.initialSpeed;
        this.lastFrameTime = 0;
        this.snakeTimer = 0;
        this.mouseSpawnTimer = 0;
        this.frameTime = 0;

        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;

        // Gameplay stats
        this.miceEaten = 0;
        this.playTime = 0;

        // Death animation
        this.deathTimer = 0;
        this.deathDuration = 1500;
        this.deathExplosionDone = false;

        // Speed lines effect when moving fast
        this.speedLines = [];

        // Near-miss tracking (snake passes adjacent to mouse = cool)
        this.nearMissTimer = 0;

        // Background stars
        this.bgStars = [];
        for (let i = 0; i < 50; i++) {
            this.bgStars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: randomRange(0.5, 2),
                speed: randomRange(0.2, 1),
                opacity: randomRange(0.1, 0.5)
            });
        }

        // Head glow trail (more intense trail behind head)
        this.headTrail = [];

        this.setupEventListeners();
        this.updateUI();
        this.renderStartScreen();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameState === 'playing' || this.gameState === 'paused') {
                    this.togglePause();
                }
                return;
            }

            if (this.gameState !== 'playing') return;

            const keyMap = {
                'ArrowUp': { x: 0, y: -1 },
                'ArrowDown': { x: 0, y: 1 },
                'ArrowLeft': { x: -1, y: 0 },
                'ArrowRight': { x: 1, y: 0 },
                'w': { x: 0, y: -1 }, 'W': { x: 0, y: -1 },
                's': { x: 0, y: 1 }, 'S': { x: 0, y: 1 },
                'a': { x: -1, y: 0 }, 'A': { x: -1, y: 0 },
                'd': { x: 1, y: 0 }, 'D': { x: 1, y: 0 }
            };

            if (keyMap[e.key]) {
                e.preventDefault();
                this.snake.queueDirection(keyMap[e.key]);
            }
        });

        // Touch controls
        let touchStartX = 0, touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.gameState !== 'playing') return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.snake.queueDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
            } else {
                this.snake.queueDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
            }
        }, { passive: true });

        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('menuBtn').addEventListener('click', () => this.showStartScreen());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('quitBtn').addEventListener('click', () => this.showStartScreen());
    }

    startGame() {
        this.snake.reset();
        this.mice = [];
        this.particles = [];
        this.scorePopups = [];
        this.trailPoints = [];
        this.pulseRings = [];
        this.speedLines = [];
        this.headTrail = [];
        this.score = 0;
        this.level = 1;
        this.speed = CONFIG.initialSpeed;
        this.mouseSpawnTimer = 0;
        this.snakeTimer = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.miceEaten = 0;
        this.playTime = 0;
        this.deathTimer = 0;
        this.deathExplosionDone = false;
        this.nearMissTimer = 0;

        this.spawnMouse();
        this.spawnMouse();

        this.gameState = 'playing';
        this.hideAllOverlays();
        this.updateUI();
        this.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseScreen').classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseScreen').classList.add('hidden');
            this.lastFrameTime = performance.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    showStartScreen() {
        this.gameState = 'start';
        this.hideAllOverlays();
        document.getElementById('startScreen').classList.remove('hidden');
        this.renderStartScreen();
    }

    hideAllOverlays() {
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    }

    spawnMouse() {
        if (this.mice.length >= CONFIG.maxMice) return;
        const totalWeight = CONFIG.mouseTypes.reduce((s, t) => s + t.weight, 0);
        let rnd = Math.random() * totalWeight;
        let selectedType = CONFIG.mouseTypes[0];
        for (const type of CONFIG.mouseTypes) {
            rnd -= type.weight;
            if (rnd <= 0) { selectedType = type; break; }
        }
        const avoid = [...this.snake.body, ...this.mice.map(m => ({ x: m.x, y: m.y }))];
        const head = this.snake.getHead();
        this.mice.push(new Mouse(CONFIG.gridSize, selectedType, avoid, CONFIG.spawnSafeRadius, head));
    }

    // ========================================================
    // Game Loop
    // ========================================================
    gameLoop(currentTime) {
        if (this.gameState !== 'playing' && this.gameState !== 'dying') return;

        const deltaTime = Math.min(currentTime - this.lastFrameTime, 50);
        this.lastFrameTime = currentTime;
        this.frameTime += deltaTime;

        if (this.gameState === 'dying') {
            this.updateDeathAnimation(deltaTime);
        } else {
            this.update(deltaTime);
        }
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        this.snakeTimer += deltaTime;
        this.playTime += deltaTime;

        // Combo timer
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.comboTimer = 0;
            }
        }

        // Near miss timer
        if (this.nearMissTimer > 0) this.nearMissTimer -= deltaTime;

        const snakeHead = this.snake.getHead();

        // Update mice with snake head for flee behavior
        this.mice.forEach(mouse => mouse.update(deltaTime, snakeHead));

        // Snake interpolation
        if (this.snake.moveProgress < 1) {
            this.snake.moveProgress += deltaTime / this.speed;
        }

        // Eat animation
        if (this.snake.eatScale > 0) {
            this.snake.eatScale -= deltaTime * 0.004;
            if (this.snake.eatScale < 0) this.snake.eatScale = 0;
        }

        // Move snake on tick
        if (this.snakeTimer >= this.speed) {
            this.snakeTimer -= this.speed;

            const prevHead = { ...this.snake.getHead() };

            // Trail
            if (CONFIG.trailEnabled) {
                const tail = this.snake.body[this.snake.body.length - 1];
                this.trailPoints.push(new TrailPoint(tail.x, tail.y, '#667eea'));
            }

            // Head glow trail
            this.headTrail.push({
                x: prevHead.x, y: prevHead.y,
                life: 1, color: '#667eea'
            });
            if (this.headTrail.length > 8) this.headTrail.shift();

            this.snake.move();

            if (this.snake.checkCollision()) {
                this.startDeathAnimation();
                return;
            }

            // FIX: Enhanced collision detection after snake move
            // Check both normal collision AND swap-through
            const newHead = this.snake.getHead();
            this.handleMouseCollisionsEnhanced(prevHead, newHead);

            // Check near-misses for satisfaction
            this.checkNearMiss(newHead);
        }

        // Also check standard collisions every frame (mouse moved into head)
        this.handleMouseCollisions();

        // Spawn mice
        this.mouseSpawnTimer += deltaTime;
        if (this.mouseSpawnTimer >= CONFIG.mouseSpawnInterval) {
            this.mouseSpawnTimer = 0;
            this.spawnMouse();
        }

        // Speed lines at higher levels
        if (this.level >= 3 && Math.random() < 0.15) {
            this.speedLines.push({
                x: randomRange(0, this.canvas.width),
                y: randomRange(0, this.canvas.height),
                length: randomRange(10, 30),
                speed: randomRange(3, 8),
                dir: this.snake.direction,
                life: 1
            });
        }

        // Danger indicator
        this.dangerIndicator.update(this.snake.getHead(), CONFIG.gridSize);

        // Update effects
        this.updateEffects(deltaTime);
    }

    // Standard collision: head position === mouse position
    handleMouseCollisions() {
        const head = this.snake.getHead();
        for (let i = this.mice.length - 1; i >= 0; i--) {
            if (this.mice[i].checkCollision(head.x, head.y)) {
                this.eatMouse(i);
            }
        }
    }

    // FIX: Enhanced collision that also detects swap-through
    handleMouseCollisionsEnhanced(prevHead, newHead) {
        for (let i = this.mice.length - 1; i >= 0; i--) {
            const mouse = this.mice[i];
            // Check normal overlap
            if (mouse.checkCollision(newHead.x, newHead.y)) {
                this.eatMouse(i);
                continue;
            }
            // Check swap-through: did snake and mouse swap places?
            if (mouse.checkSwapCollision(prevHead, newHead)) {
                this.eatMouse(i);
                continue;
            }
            // Check path-through: was the mouse on the cell the snake just passed through?
            // (mouse.prevX/prevY was where head is now, meaning they crossed)
            if (mouse.prevX === newHead.x && mouse.prevY === newHead.y) {
                this.eatMouse(i);
                continue;
            }
        }
    }

    eatMouse(mouseIndex) {
        const mouse = this.mice[mouseIndex];
        const head = this.snake.getHead();

        // Combo
        this.combo++;
        this.comboTimer = CONFIG.comboWindow;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const multiplier = Math.min(this.combo, 5);
        const points = mouse.type.points * multiplier;
        this.score += points;
        this.miceEaten++;
        this.snake.grow(mouse.type.growth);

        // Effects at mouse position (use mouse pos for more accurate visual)
        const effectX = mouse.x;
        const effectY = mouse.y;
        const px = (effectX + 0.5) * CONFIG.cellSize;
        const py = (effectY + 0.5) * CONFIG.cellSize;

        this.createEatExplosion(px, py, mouse.type.color, mouse.type.glowColor);

        // Score popup
        let popText = `+${points}`;
        if (multiplier > 1) popText += ` x${multiplier}`;
        const popSize = multiplier >= 4 ? 22 : multiplier >= 2 ? 18 : 16;
        this.scorePopups.push(new ScorePopup(px, py - 10, popText, mouse.type.color, popSize));

        // Pulse ring
        const ringSize = mouse.type.name === 'gold' ? 80 : mouse.type.name === 'brown' ? 65 : 50;
        this.pulseRings.push({ x: px, y: py, radius: 0, maxRadius: ringSize, life: 1, color: mouse.type.color });

        // Screen shake
        if (CONFIG.screenShake) {
            const shakeAmt = mouse.type.name === 'gold' ? 10 : mouse.type.name === 'brown' ? 6 : 3;
            this.screenShake.trigger(shakeAmt);
        }

        // Bonus: slow-motion-like effect for gold catches (brief speed boost feeling)
        if (mouse.type.name === 'gold') {
            // Extra burst of particles for gold
            for (let k = 0; k < 15; k++) {
                const angle = randomRange(0, Math.PI * 2);
                this.particles.push(new Particle(px, py, {
                    vx: Math.cos(angle) * randomRange(2, 7),
                    vy: Math.sin(angle) * randomRange(2, 7),
                    color: k % 2 === 0 ? '#ffd700' : '#fff',
                    size: randomRange(3, 8),
                    maxLife: randomRange(0.5, 1.2),
                    gravity: -0.02,
                    friction: 0.96,
                    type: 'star'
                }));
            }
            // Double ring
            this.pulseRings.push({ x: px, y: py, radius: 0, maxRadius: 120, life: 1, color: '#ffd700' });
        }

        this.mice.splice(mouseIndex, 1);

        if (this.score >= this.level * CONFIG.levelUpScore) {
            this.levelUp();
        }
        this.updateUI();
    }

    checkNearMiss(head) {
        if (this.nearMissTimer > 0) return;
        for (const mouse of this.mice) {
            const d = dist(head, { x: mouse.x, y: mouse.y });
            if (d === 1) {
                // Adjacent but didn't eat — near miss!
                this.nearMissTimer = 500;
                const px = (mouse.x + 0.5) * CONFIG.cellSize;
                const py = (mouse.y + 0.5) * CONFIG.cellSize;
                this.scorePopups.push(new ScorePopup(px, py - 15, '¡CASI!', '#f5576c', 12));

                // Small particle burst
                for (let i = 0; i < 5; i++) {
                    this.particles.push(new Particle(px, py, {
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        color: '#f5576c',
                        size: randomRange(1, 3),
                        maxLife: 0.3,
                        gravity: 0,
                        friction: 0.95,
                        type: 'circle'
                    }));
                }
                break;
            }
        }
    }

    createEatExplosion(x, y, color, glowColor) {
        const types = ['circle', 'spark', 'star', 'square'];
        for (let i = 0; i < 25; i++) {
            const angle = (Math.PI * 2 / 25) * i + randomRange(-0.3, 0.3);
            const speed = randomRange(1.5, 5);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: i % 3 === 0 ? '#fff' : color,
                size: randomRange(2, 6),
                maxLife: randomRange(0.3, 0.8),
                gravity: 0.02,
                friction: 0.97,
                type: types[i % types.length]
            }));
        }
        // Glow ring
        this.particles.push(new Particle(x, y, {
            vx: 0, vy: 0,
            color: glowColor,
            size: 15,
            maxLife: 0.4,
            gravity: 0,
            friction: 1,
            type: 'ring'
        }));
    }

    // ========================================================
    // Death Animation
    // ========================================================
    startDeathAnimation() {
        this.gameState = 'dying';
        this.deathTimer = 0;
        this.deathExplosionDone = false;
        this.screenShake.trigger(12);
    }

    updateDeathAnimation(deltaTime) {
        this.deathTimer += deltaTime;

        if (!this.deathExplosionDone) {
            const progress = this.deathTimer / (this.deathDuration * 0.7);
            const segmentsToExplode = Math.min(
                Math.floor(progress * this.snake.body.length),
                this.snake.body.length
            );

            for (let i = this.snake.body.length - 1; i >= this.snake.body.length - segmentsToExplode; i--) {
                if (i < 0) break;
                const seg = this.snake.body[i];
                if (!seg._exploded) {
                    seg._exploded = true;
                    const px = (seg.x + 0.5) * CONFIG.cellSize;
                    const py = (seg.y + 0.5) * CONFIG.cellSize;
                    for (let j = 0; j < 10; j++) {
                        const angle = randomRange(0, Math.PI * 2);
                        const speed = randomRange(1, 5);
                        this.particles.push(new Particle(px, py, {
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            color: j % 3 === 0 ? '#fff' : j % 2 === 0 ? '#667eea' : '#764ba2',
                            size: randomRange(2, 6),
                            maxLife: randomRange(0.5, 1.2),
                            gravity: 0.08,
                            friction: 0.96,
                            type: j % 4 === 0 ? 'star' : j % 3 === 0 ? 'spark' : 'circle'
                        }));
                    }
                    this.screenShake.trigger(4);
                }
            }

            if (segmentsToExplode >= this.snake.body.length) {
                this.deathExplosionDone = true;
                // Final big explosion at head
                const headSeg = this.snake.body[0];
                const hpx = (headSeg.x + 0.5) * CONFIG.cellSize;
                const hpy = (headSeg.y + 0.5) * CONFIG.cellSize;
                for (let j = 0; j < 30; j++) {
                    const angle = randomRange(0, Math.PI * 2);
                    const speed = randomRange(2, 8);
                    this.particles.push(new Particle(hpx, hpy, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        color: j % 4 === 0 ? '#ffd700' : j % 3 === 0 ? '#f5576c' : j % 2 === 0 ? '#667eea' : '#fff',
                        size: randomRange(3, 8),
                        maxLife: randomRange(0.6, 1.5),
                        gravity: 0.05,
                        friction: 0.97,
                        type: j % 3 === 0 ? 'star' : 'circle'
                    }));
                }
                this.pulseRings.push({ x: hpx, y: hpy, radius: 0, maxRadius: 150, life: 1, color: '#f5576c' });
                this.screenShake.trigger(15);
            }
        }

        this.updateEffects(deltaTime);

        if (this.deathTimer >= this.deathDuration) {
            this.gameOver();
        }
    }

    levelUp() {
        this.level++;
        this.speed = Math.max(CONFIG.maxSpeed, this.speed - CONFIG.speedIncrement);
        this.spawnMouse();

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        this.pulseRings.push({ x: cx, y: cy, radius: 0, maxRadius: 200, life: 1, color: '#00f2fe' });
        this.pulseRings.push({ x: cx, y: cy, radius: 0, maxRadius: 250, life: 0.8, color: '#667eea' });
        this.scorePopups.push(new ScorePopup(cx, cy, `¡NIVEL ${this.level}!`, '#00f2fe', 24));
        this.screenShake.trigger(8);

        // Level up particle burst
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 / 40) * i;
            const speed = randomRange(3, 7);
            this.particles.push(new Particle(cx, cy, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: i % 3 === 0 ? '#00f2fe' : i % 2 === 0 ? '#667eea' : '#fff',
                size: randomRange(3, 6),
                maxLife: randomRange(0.5, 1),
                gravity: 0.01,
                friction: 0.98,
                type: i % 4 === 0 ? 'star' : 'circle'
            }));
        }
    }

    gameOver() {
        this.gameState = 'gameOver';

        if (this.score > this.highscore) {
            this.highscore = this.score;
            localStorage.setItem('snakeHighscore', this.highscore);
            document.getElementById('newRecordMsg').classList.add('show');
        } else {
            document.getElementById('newRecordMsg').classList.remove('show');
        }

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        this.updateUI();
    }

    // ========================================================
    // Effects Updates
    // ========================================================
    updateEffects(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (!this.particles[i].update(dt)) this.particles.splice(i, 1);
        }
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            if (!this.scorePopups[i].update(dt)) this.scorePopups.splice(i, 1);
        }
        for (let i = this.trailPoints.length - 1; i >= 0; i--) {
            if (!this.trailPoints[i].update(dt)) this.trailPoints.splice(i, 1);
        }
        for (let i = this.pulseRings.length - 1; i >= 0; i--) {
            const r = this.pulseRings[i];
            r.life -= dt * 0.002;
            r.radius = r.maxRadius * (1 - r.life);
            if (r.life <= 0) this.pulseRings.splice(i, 1);
        }
        // Speed lines
        for (let i = this.speedLines.length - 1; i >= 0; i--) {
            const sl = this.speedLines[i];
            sl.x += sl.dir.x * sl.speed;
            sl.y += sl.dir.y * sl.speed;
            sl.life -= dt * 0.003;
            if (sl.life <= 0) this.speedLines.splice(i, 1);
        }
        // Head trail
        for (let i = this.headTrail.length - 1; i >= 0; i--) {
            this.headTrail[i].life -= dt * 0.003;
            if (this.headTrail[i].life <= 0) this.headTrail.splice(i, 1);
        }

        this.screenShake.update();
        this.bgStars.forEach(s => {
            s.opacity = 0.1 + Math.sin(this.frameTime * 0.001 * s.speed) * 0.2;
        });
    }

    // ========================================================
    // RENDERING
    // ========================================================
    render() {
        const ctx = this.ctx;
        const cs = CONFIG.cellSize;

        ctx.save();
        ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);

        // Background
        this.renderBackground(ctx);

        // Trail
        this.trailPoints.forEach(t => t.draw(ctx, cs));

        // Head glow trail
        this.headTrail.forEach(ht => {
            ctx.save();
            ctx.globalAlpha = ht.life * 0.25;
            ctx.fillStyle = ht.color;
            ctx.beginPath();
            ctx.arc(ht.x * cs + cs / 2, ht.y * cs + cs / 2, cs * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Speed lines
        this.speedLines.forEach(sl => {
            ctx.save();
            ctx.globalAlpha = sl.life * 0.15;
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x - sl.dir.x * sl.length, sl.y - sl.dir.y * sl.length);
            ctx.stroke();
            ctx.restore();
        });

        // Pulse rings
        this.pulseRings.forEach(r => {
            ctx.save();
            ctx.globalAlpha = r.life * 0.4;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = Math.max(1, 3 * r.life);
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Mice
        this.renderMice(ctx, cs);

        // Snake
        if (this.gameState !== 'dying' || !this.deathExplosionDone) {
            this.renderSnake(ctx, cs);
        }

        // Danger indicator
        if (this.gameState === 'playing') {
            this.dangerIndicator.draw(ctx, this.canvas.width, this.canvas.height);
        }

        // Particles
        this.particles.forEach(p => p.draw(ctx));

        // Score popups
        this.scorePopups.forEach(p => p.draw(ctx));

        // Combo
        if (this.combo > 1 && this.gameState === 'playing') {
            this.renderComboIndicator(ctx);
        }

        ctx.restore();
    }

    renderStartScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderGridLines(ctx);
    }

    renderBackground(ctx) {
        const grad = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        grad.addColorStop(0, '#1a1a35');
        grad.addColorStop(1, '#0f0f1e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        this.bgStars.forEach(s => {
            ctx.globalAlpha = s.opacity;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        this.renderGridLines(ctx);
    }

    renderGridLines(ctx) {
        const cs = CONFIG.cellSize;
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= CONFIG.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cs, 0);
            ctx.lineTo(i * cs, this.canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cs);
            ctx.lineTo(this.canvas.width, i * cs);
            ctx.stroke();
        }
        // Border glow
        ctx.strokeStyle = 'rgba(102,126,234,0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
    }

    renderSnake(ctx, cs) {
        const interpT = Math.min(this.snake.moveProgress, 1);
        const body = CONFIG.interpolation
            ? this.snake.getInterpolatedBody(interpT)
            : this.snake.body;
        const totalSegs = body.length;

        // Draw back to front
        for (let i = totalSegs - 1; i >= 0; i--) {
            const seg = body[i];
            const px = seg.x * cs + cs / 2;
            const py = seg.y * cs + cs / 2;
            const ratio = i / totalSegs;
            const isHead = i === 0;

            let radius = cs / 2 - 1.5;
            if (isHead) {
                radius += 1;
                if (this.snake.eatScale > 0) radius += this.snake.eatScale * 4;
            } else {
                radius *= (1 - ratio * 0.3);
            }

            // Color gradient along body
            const hue = lerp(240, 280, ratio);
            const sat = lerp(70, 60, ratio);
            const light = lerp(65, 40, ratio);
            const bodyColor = `hsl(${hue}, ${sat}%, ${light}%)`;

            // Outer glow
            if (isHead || i % 3 === 0) {
                ctx.save();
                ctx.globalAlpha = 0.15 - ratio * 0.1;
                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Main body circle
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.save();
            ctx.globalAlpha = 0.3;
            const hlGrad = ctx.createRadialGradient(px - radius * 0.3, py - radius * 0.3, 0, px, py, radius);
            hlGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
            hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hlGrad;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Connector between segments
            if (i < totalSegs - 1) {
                const next = body[i + 1];
                const npx = next.x * cs + cs / 2;
                const npy = next.y * cs + cs / 2;
                const nextRatio = (i + 1) / totalSegs;
                const nextRadius = (cs / 2 - 1.5) * (1 - nextRatio * 0.3);
                const midX = (px + npx) / 2;
                const midY = (py + npy) / 2;
                const midRadius = (radius + nextRadius) / 2 * 0.85;
                const midHue = lerp(240, 280, (ratio + nextRatio) / 2);
                const midSat = lerp(70, 60, (ratio + nextRatio) / 2);
                const midLight = lerp(65, 40, (ratio + nextRatio) / 2);

                ctx.fillStyle = `hsl(${midHue}, ${midSat}%, ${midLight}%)`;
                ctx.beginPath();
                ctx.arc(midX, midY, midRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Eyes
            if (isHead) {
                this.renderSnakeEyes(ctx, px, py, radius, this.snake.direction);
            }
        }
    }

    renderSnakeEyes(ctx, hx, hy, radius, dir) {
        const eyeR = 3.5;
        const pupilR = 2;
        const eyeOffset = radius * 0.45;
        const eyeForward = radius * 0.3;
        let e1x, e1y, e2x, e2y;

        if (dir.x === 1) {
            e1x = hx + eyeForward; e1y = hy - eyeOffset;
            e2x = hx + eyeForward; e2y = hy + eyeOffset;
        } else if (dir.x === -1) {
            e1x = hx - eyeForward; e1y = hy - eyeOffset;
            e2x = hx - eyeForward; e2y = hy + eyeOffset;
        } else if (dir.y === -1) {
            e1x = hx - eyeOffset; e1y = hy - eyeForward;
            e2x = hx + eyeOffset; e2y = hy - eyeForward;
        } else {
            e1x = hx - eyeOffset; e1y = hy + eyeForward;
            e2x = hx + eyeOffset; e2y = hy + eyeForward;
        }

        // Eye whites
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2); ctx.fill();

        // Pupils
        ctx.fillStyle = '#1a1a2e';
        const pOff = 1;
        ctx.beginPath(); ctx.arc(e1x + dir.x * pOff, e1y + dir.y * pOff, pupilR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2x + dir.x * pOff, e2y + dir.y * pOff, pupilR, 0, Math.PI * 2); ctx.fill();
    }

    renderMice(ctx, cs) {
        this.mice.forEach(mouse => {
            const pos = mouse.getInterpolatedPos();
            const px = pos.x * cs + cs / 2;
            const py = pos.y * cs + cs / 2;
            const scale = mouse.scale;

            ctx.save();
            ctx.translate(px, py);
            ctx.scale(scale, scale);

            // Wobble (faster when scared)
            const wobbleMult = mouse.scared ? 3 : 1;
            ctx.translate(
                Math.sin(mouse.wobble * wobbleMult) * 1.5 * wobbleMult,
                Math.sin(mouse.wobble * 1.3 * wobbleMult) * 1 * wobbleMult
            );

            const bodyR = cs * 0.35;

            // Shadow
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(1, 3, bodyR, bodyR * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Scared glow (red pulse)
            if (mouse.scared) {
                ctx.save();
                ctx.globalAlpha = 0.25 + Math.sin(this.frameTime * 0.015) * 0.15;
                ctx.fillStyle = 'rgba(245, 87, 108, 0.5)';
                ctx.beginPath();
                ctx.arc(0, 0, bodyR + 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Gold glow
            if (mouse.type.name === 'gold') {
                ctx.save();
                ctx.globalAlpha = 0.3 + Math.sin(this.frameTime * 0.005) * 0.15;
                ctx.fillStyle = mouse.type.glowColor;
                ctx.beginPath();
                ctx.arc(0, 0, bodyR + 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Body
            ctx.fillStyle = mouse.type.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, bodyR, bodyR * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ears
            const earR = bodyR * 0.45;
            ctx.fillStyle = mouse.type.color;
            ctx.beginPath(); ctx.arc(-bodyR * 0.5, -bodyR * 0.6, earR, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.5, -bodyR * 0.6, earR, 0, Math.PI * 2); ctx.fill();

            // Inner ears (bigger/redder when scared)
            ctx.fillStyle = mouse.scared ? '#f87171' : '#f9a8d4';
            const innerEarScale = mouse.scared ? 0.7 : 0.6;
            ctx.beginPath(); ctx.arc(-bodyR * 0.5, -bodyR * 0.6, earR * innerEarScale, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.5, -bodyR * 0.6, earR * innerEarScale, 0, Math.PI * 2); ctx.fill();

            // Eyes (wider when scared)
            const eyeSize = mouse.scared ? 2.8 : 2;
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath(); ctx.arc(-bodyR * 0.25, -bodyR * 0.15, eyeSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.25, -bodyR * 0.15, eyeSize, 0, Math.PI * 2); ctx.fill();

            // Eye shine
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-bodyR * 0.25 + 0.5, -bodyR * 0.15 - 0.5, 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.25 + 0.5, -bodyR * 0.15 - 0.5, 0.8, 0, Math.PI * 2); ctx.fill();

            // Scared sweat drop
            if (mouse.scared) {
                ctx.fillStyle = 'rgba(147, 197, 253, 0.8)';
                ctx.beginPath();
                ctx.ellipse(bodyR * 0.65, -bodyR * 0.5, 1.5, 2.5, 0.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Nose
            ctx.fillStyle = '#f472b6';
            ctx.beginPath(); ctx.arc(0, bodyR * 0.15, 1.5, 0, Math.PI * 2); ctx.fill();

            // Tail
            ctx.strokeStyle = mouse.type.color;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const tsx = -mouse.direction.x * bodyR * 0.7;
            const tsy = -mouse.direction.y * bodyR * 0.7 + bodyR * 0.3;
            ctx.moveTo(tsx, tsy);
            const tailSpeed = mouse.scared ? 2 : 1;
            const tc = Math.sin(mouse.tailAngle * tailSpeed) * 5;
            ctx.quadraticCurveTo(
                tsx - mouse.direction.x * 6 + tc,
                tsy - mouse.direction.y * 6 + tc,
                tsx - mouse.direction.x * 10,
                tsy - mouse.direction.y * 10 + Math.sin(mouse.tailAngle * 1.5 * tailSpeed) * 4
            );
            ctx.stroke();

            // Body highlight
            ctx.save();
            ctx.globalAlpha = 0.25;
            const hlG = ctx.createRadialGradient(-bodyR * 0.2, -bodyR * 0.3, 0, 0, 0, bodyR);
            hlG.addColorStop(0, '#fff');
            hlG.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hlG;
            ctx.beginPath();
            ctx.ellipse(0, 0, bodyR, bodyR * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.restore();
        });
    }

    renderComboIndicator(ctx) {
        const text = `COMBO x${this.combo}`;
        const x = this.canvas.width / 2;
        const y = 30;
        const pulse = 1 + Math.sin(this.frameTime * 0.008) * 0.05;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
        ctx.font = 'bold 14px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Combo bar
        const barW = 80, barH = 4;
        const comboP = this.comboTimer / CONFIG.comboWindow;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-barW / 2, 10, barW, barH);

        const comboHue = lerp(0, 60, comboP);
        ctx.fillStyle = `hsl(${comboHue}, 100%, 60%)`;
        ctx.fillRect(-barW / 2, 10, barW * comboP, barH);

        ctx.shadowColor = this.combo >= 5 ? '#ffd700' : this.combo >= 3 ? '#ff6b6b' : '#667eea';
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.combo >= 5 ? '#ffd700' : this.combo >= 3 ? '#ff6b6b' : '#fff';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('highscore').textContent = this.highscore;

        const scoreEl = document.getElementById('score');
        scoreEl.classList.remove('score-bump');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('score-bump');
    }
}

// ============================================================
// Init
// ============================================================
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});
