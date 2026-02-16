// ============================================================
// SNAKE HUNT — Enhanced Gameplay Engine
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
// Enhanced Mouse with Smooth Movement
// ============================================================
class Mouse {
    constructor(gridSize, type, avoidPositions = []) {
        this.gridSize = gridSize;
        this.type = type;
        this.respawn(avoidPositions);
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
    }

    respawn(avoidPositions = []) {
        let position, attempts = 0;
        do {
            position = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            attempts++;
        } while (attempts < 100 && this.isPositionOccupied(position, avoidPositions));

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

    update(deltaTime) {
        this.moveTimer += deltaTime;
        this.wobble += deltaTime * 0.01 * this.wobbleSpeed;
        this.tailAngle += deltaTime * 0.015;
        this.spawnTimer += deltaTime;
        this.scale = Math.min(1, easeOutElastic(this.spawnTimer / 400));

        if (this.moveProgress < 1) {
            this.moveProgress = Math.min(1, this.moveProgress + deltaTime / (this.moveInterval * 0.8));
        }

        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.move();
            return true;
        }
        return false;
    }

    move() {
        this.prevX = this.x;
        this.prevY = this.y;
        this.moveProgress = 0;

        const newX = this.x + this.direction.x;
        const newY = this.y + this.direction.y;

        if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize || Math.random() < 0.15) {
            this.changeDirection();
        } else {
            this.x = newX;
            this.y = newY;
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

    checkCollision(x, y) { return this.x === x && this.y === y; }
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
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
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
        ctx.font = 'bold 16px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
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
        this.decay = 0.92;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    trigger(intensity) {
        this.intensity = Math.max(this.intensity, intensity);
    }

    update() {
        if (this.intensity > 0.5) {
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

        // Death animation
        this.deathTimer = 0;
        this.deathDuration = 1500;
        this.deathExplosionDone = false;

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
        this.score = 0;
        this.level = 1;
        this.speed = CONFIG.initialSpeed;
        this.mouseSpawnTimer = 0;
        this.snakeTimer = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.deathTimer = 0;
        this.deathExplosionDone = false;

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
        this.mice.push(new Mouse(CONFIG.gridSize, selectedType, avoid));
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

        // Combo timer
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.comboTimer = 0;
            }
        }

        // Update mice
        this.mice.forEach(mouse => mouse.update(deltaTime));

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

            // Trail
            if (CONFIG.trailEnabled) {
                const tail = this.snake.body[this.snake.body.length - 1];
                this.trailPoints.push(new TrailPoint(tail.x, tail.y, '#667eea'));
            }

            this.snake.move();

            if (this.snake.checkCollision()) {
                this.startDeathAnimation();
                return;
            }

            this.handleMouseCollisions();
        }

        // Check collisions from mouse movement too
        this.handleMouseCollisions();

        // Spawn mice
        this.mouseSpawnTimer += deltaTime;
        if (this.mouseSpawnTimer >= CONFIG.mouseSpawnInterval) {
            this.mouseSpawnTimer = 0;
            this.spawnMouse();
        }

        // Update effects
        this.updateEffects(deltaTime);
    }

    handleMouseCollisions() {
        const head = this.snake.getHead();
        for (let i = this.mice.length - 1; i >= 0; i--) {
            if (this.mice[i].checkCollision(head.x, head.y)) {
                const mouse = this.mice[i];

                // Combo
                this.combo++;
                this.comboTimer = CONFIG.comboWindow;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
                const multiplier = Math.min(this.combo, 5);
                const points = mouse.type.points * multiplier;
                this.score += points;
                this.snake.grow(mouse.type.growth);

                // Effects
                const px = (head.x + 0.5) * CONFIG.cellSize;
                const py = (head.y + 0.5) * CONFIG.cellSize;
                this.createEatExplosion(px, py, mouse.type.color, mouse.type.glowColor);

                let popText = `+${points}`;
                if (multiplier > 1) popText += ` x${multiplier}`;
                this.scorePopups.push(new ScorePopup(px, py - 10, popText, mouse.type.color));
                this.pulseRings.push({ x: px, y: py, radius: 0, maxRadius: 60, life: 1, color: mouse.type.color });

                if (CONFIG.screenShake) {
                    const shakeAmt = mouse.type.name === 'gold' ? 8 : mouse.type.name === 'brown' ? 5 : 3;
                    this.screenShake.trigger(shakeAmt);
                }

                this.mice.splice(i, 1);

                if (this.score >= this.level * CONFIG.levelUpScore) {
                    this.levelUp();
                }
                this.updateUI();
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
                    for (let j = 0; j < 8; j++) {
                        const angle = randomRange(0, Math.PI * 2);
                        const speed = randomRange(1, 4);
                        this.particles.push(new Particle(px, py, {
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            color: j % 2 === 0 ? '#667eea' : '#764ba2',
                            size: randomRange(2, 5),
                            maxLife: randomRange(0.5, 1),
                            gravity: 0.08,
                            friction: 0.96,
                            type: j % 3 === 0 ? 'star' : 'circle'
                        }));
                    }
                    this.screenShake.trigger(3);
                }
            }

            if (segmentsToExplode >= this.snake.body.length) {
                this.deathExplosionDone = true;
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
        this.scorePopups.push(new ScorePopup(cx, cy, `¡NIVEL ${this.level}!`, '#00f2fe'));
        this.screenShake.trigger(6);
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

            // Wobble
            ctx.translate(
                Math.sin(mouse.wobble) * 1.5,
                Math.sin(mouse.wobble * 1.3) * 1
            );

            const bodyR = cs * 0.35;

            // Shadow
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(1, 3, bodyR, bodyR * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

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

            // Inner ears
            ctx.fillStyle = '#f9a8d4';
            ctx.beginPath(); ctx.arc(-bodyR * 0.5, -bodyR * 0.6, earR * 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.5, -bodyR * 0.6, earR * 0.6, 0, Math.PI * 2); ctx.fill();

            // Eyes
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath(); ctx.arc(-bodyR * 0.25, -bodyR * 0.15, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.25, -bodyR * 0.15, 2, 0, Math.PI * 2); ctx.fill();

            // Eye shine
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-bodyR * 0.25 + 0.5, -bodyR * 0.15 - 0.5, 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bodyR * 0.25 + 0.5, -bodyR * 0.15 - 0.5, 0.8, 0, Math.PI * 2); ctx.fill();

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
            const tc = Math.sin(mouse.tailAngle) * 5;
            ctx.quadraticCurveTo(
                tsx - mouse.direction.x * 6 + tc,
                tsy - mouse.direction.y * 6 + tc,
                tsx - mouse.direction.x * 10,
                tsy - mouse.direction.y * 10 + Math.sin(mouse.tailAngle * 1.5) * 4
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
