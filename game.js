// Game State
const gameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAMEOVER: 'gameover',
    PAUSED: 'paused'
};

// Game Configuration
const config = {
    gravity: 0.8,
    jumpStrength: -18,
    groundY: 300,
    gameSpeed: 5,
    speedIncreaseRate: 0.001,
    maxSpeed: 15,
    obstacleSpawnRate: 0.008,
    cloudSpawnRate: 0.003,
    starSpawnRate: 0.001
};

// Game Variables
let canvas, ctx;
let state = gameState.MENU;
let score = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let currentSpeed = config.gameSpeed;
let frameCount = 0;
let level = 1;
let previousLevel = 1;
let levelUpAnimation = null; // Store level-up animation state

// Game Objects
let dino;
let obstacles = [];
let clouds = [];
let stars = [];
let particles = [];
let ground = [];
let lastObstacleX = 0; // Track last obstacle position for spacing

// Input Handling
const keys = {};
let touchStartY = 0;

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Initialize Game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size to fullscreen with proper scaling
    function resizeCanvas() {
        const headerHeight = document.querySelector('.game-header').offsetHeight || 80;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - headerHeight;
        
        // Update ground Y position - ensure track is always visible
        // Leave space for track (40px) + some margin at bottom
        config.groundY = canvas.height - 60;
        
        // Ensure track is always visible in fullscreen
        if (config.groundY < canvas.height * 0.7) {
            config.groundY = canvas.height * 0.75; // At least 75% down the screen
        }
        
        // Reinitialize ground if needed
        if (dino) {
            dino.y = config.groundY;
        }
        initializeGround();
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    // Also resize on orientation change for mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 100);
    });
    
    // Initialize objects
    dino = new Dino();
    initializeGround();
    
    // Update high score display
    updateHighScore();
    
    // Event listeners
    setupEventListeners();
    
    // Start game loop
    gameLoop();
}

function initializeGround() {
    ground = [];
    for (let i = 0; i < canvas.width / 50 + 1; i++) {
        ground.push({
            x: i * 50,
            y: config.groundY
        });
    }
}

function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            handleJump();
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            handleCrouch();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
        if (e.code === 'ArrowDown') {
            handleCrouchRelease();
        }
    });
    
    // Enhanced Touch and Swipe controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        
        // Start game on touch if in menu
        if (state === gameState.MENU || state === gameState.GAMEOVER) {
            startGame();
            return;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (state !== gameState.PLAYING) return;
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Swipe detection
        if (deltaTime < 300 && distance > 30) {
            // Swipe up - jump
            if (deltaY < -30 && Math.abs(deltaX) < Math.abs(deltaY)) {
                handleJump();
                return;
            }
            // Swipe down - crouch
            if (deltaY > 30 && Math.abs(deltaX) < Math.abs(deltaY)) {
                handleCrouch();
                setTimeout(() => handleCrouchRelease(), 200);
                return;
            }
        }
        
        // Simple tap - jump
        if (deltaTime < 200 && distance < 30) {
            handleJump();
        }
        
        handleCrouchRelease();
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (state !== gameState.PLAYING) return;
        
        const touch = e.touches[0];
        const currentY = touch.clientY;
        
        // Swipe down detection - crouch while swiping
        if (currentY > touchStartY + 40) {
            handleCrouch();
        } else {
            handleCrouchRelease();
        }
    }, { passive: false });
    
    // Mouse controls
    canvas.addEventListener('click', () => {
        if (state === gameState.MENU || state === gameState.GAMEOVER) {
            startGame();
        } else if (state === gameState.PLAYING) {
            handleJump();
        }
    });
    
    // Button listeners
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', startGame);
}

function handleJump() {
    if (state === gameState.PLAYING && !dino.isJumping && !dino.isCrouching) {
        dino.jump();
        createParticles(dino.x + 20, config.groundY, '#4ade80');
    }
}

function handleCrouch() {
    if (state === gameState.PLAYING) {
        dino.crouch();
    }
}

function handleCrouchRelease() {
    if (state === gameState.PLAYING) {
        dino.uncrouch();
    }
}


function startGame() {
    state = gameState.PLAYING;
    score = 0;
    level = 1;
    previousLevel = 1;
    currentSpeed = config.gameSpeed;
    frameCount = 0;
    obstacles = [];
    clouds = [];
    stars = [];
    particles = [];
    lastObstacleX = 0;
    levelUpAnimation = null;
    updateLevel();
    dino.reset();
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
}

function gameOver() {
    state = gameState.GAMEOVER;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoHighScore', highScore);
        updateHighScore();
    }
    
    document.getElementById('finalScore').textContent = String(score).padStart(5, '0');
    document.getElementById('finalLevel').textContent = String(level).padStart(2, '0');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    
    // Explosion effect
    for (let i = 0; i < 30; i++) {
        createParticles(dino.x + 35, dino.y + 35, '#ef4444');
    }
}

function update() {
    if (state !== gameState.PLAYING) return;
    
    frameCount++;
    
    // Calculate level based on score (level up every 500 points - longer intervals)
    previousLevel = level;
    level = Math.floor(score / 500) + 1;
    
    // Check for level up
    if (level > previousLevel) {
        levelUp();
    }
    
    // Update speed based on level - higher level = faster, lower level = slower
    const levelSpeedMultiplier = 0.7 + (level - 1) * 0.25; // Start at 70% speed at level 1, +25% per level
    const baseSpeed = Math.min(config.gameSpeed + frameCount * config.speedIncreaseRate, config.maxSpeed);
    currentSpeed = Math.min(baseSpeed * levelSpeedMultiplier, config.maxSpeed * 2); // Allow up to 2x max speed
    updateSpeedBar();
    
    // Update score (increment by at least 1 per frame, scales with speed)
    score += Math.max(1, Math.floor(currentSpeed * 0.2));
    updateScore();
    updateLevel();
    
    // Update dino
    dino.update();
    
    // Spawn obstacles (includes birds, cacti) - obstacles appear in all levels
    // Higher level = more obstacles, lower level = fewer obstacles
    const levelSpawnMultiplier = 0.5 + (level - 1) * 0.35; // Start at 50% spawn rate at level 1, +35% per level
    const spawnRate = config.obstacleSpawnRate * currentSpeed * levelSpawnMultiplier;
    if (Math.random() < spawnRate) {
        spawnObstacle();
    }
    
    // Spawn clouds
    if (Math.random() < config.cloudSpawnRate) {
        spawnCloud();
    }
    
    // Spawn stars (night mode indicator)
    if (frameCount > 2000 && Math.random() < config.starSpawnRate) {
        spawnStar();
    }
    
    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
    });
    
    // Reset last obstacle X when all obstacles are gone
    if (obstacles.length === 0) {
        lastObstacleX = 0;
    } else {
        // Update to the rightmost obstacle
        const rightmost = obstacles.reduce((max, obs) => obs.x > max.x ? obs : max, obstacles[0]);
        lastObstacleX = rightmost.x;
    }
    
    // Collision detection
    obstacles.forEach((obstacle) => {
        if (checkCollision(dino, obstacle)) {
            gameOver();
        }
    });
    
    // Update clouds
    clouds.forEach((cloud, index) => {
        cloud.update();
        if (cloud.x + cloud.width < 0) {
            clouds.splice(index, 1);
        }
    });
    
    // Update stars
    stars.forEach((star, index) => {
        star.update();
        if (star.x + star.width < 0) {
            stars.splice(index, 1);
        }
    });
    
    // Update particles
    particles.forEach((particle, index) => {
        particle.update();
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    // Update ground
    ground.forEach((segment) => {
        segment.x -= currentSpeed;
        if (segment.x + 50 < 0) {
            segment.x = canvas.width;
        }
    });
}

function render() {
    // Clear canvas with background color
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ensure ground is visible by drawing a base layer if needed
    if (!ground || ground.length === 0) {
        initializeGround();
    }
    
    // Draw VISIBLE RUNNING TRACK first (where dino runs and cacti are placed)
    const trackTopY = config.groundY;
    const trackThickness = 45; // Thick visible track
    
    // Draw track background (below track)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, trackTopY + trackThickness, canvas.width, canvas.height - (trackTopY + trackThickness));
    
    // Draw RUNNING TRACK surface - VERY VISIBLE
    // Track base layer
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, trackTopY, canvas.width, trackThickness);
    
    // Track surface gradient
    const trackGradient = ctx.createLinearGradient(0, trackTopY, 0, trackTopY + trackThickness);
    trackGradient.addColorStop(0, '#D2691E'); // Top - lighter brown
    trackGradient.addColorStop(0.3, '#CD853F'); // Light brown
    trackGradient.addColorStop(0.6, '#A0522D'); // Medium brown
    trackGradient.addColorStop(1, '#8B4513'); // Darker brown bottom
    ctx.fillStyle = trackGradient;
    ctx.fillRect(0, trackTopY, canvas.width, trackThickness);
    
    // Track top border - BRIGHT GOLD LINE (where dino runs)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, trackTopY);
    ctx.lineTo(canvas.width, trackTopY);
    ctx.stroke();
    
    // Track bottom border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, trackTopY + trackThickness);
    ctx.lineTo(canvas.width, trackTopY + trackThickness);
    ctx.stroke();
    
    // Additional highlight lines on track
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, trackTopY + 12);
    ctx.lineTo(canvas.width, trackTopY + 12);
    ctx.stroke();
    
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, trackTopY + 25);
    ctx.lineTo(canvas.width, trackTopY + 25);
    ctx.stroke();
    
    // White border for maximum contrast
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, trackTopY);
    ctx.lineTo(canvas.width, trackTopY);
    ctx.stroke();
    
    // Draw vibrant sky gradient (stop at track)
    const gradient = ctx.createLinearGradient(0, 0, 0, trackTopY);
    const timeOfDay = (frameCount % 4000) / 4000;
    if (timeOfDay < 0.5) {
        // Day - vibrant blue sky
        gradient.addColorStop(0, '#4FC3F7');
        gradient.addColorStop(0.5, '#29B6F6');
        gradient.addColorStop(1, '#E3F2FD');
    } else {
        // Night - deep purple/blue
        gradient.addColorStop(0, '#1A237E');
        gradient.addColorStop(0.5, '#283593');
        gradient.addColorStop(1, '#424242');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, trackTopY);
    
    // Draw stars (night mode)
    if (frameCount > 2000) {
        stars.forEach(star => star.draw(ctx));
        // Additional static stars
        for (let i = 0; i < 30; i++) {
            const x = (i * 50 + frameCount * 0.1) % canvas.width;
            const y = 20 + (i * 17) % 150;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw clouds (behind everything)
    clouds.forEach(cloud => cloud.draw(ctx));
    
    // Draw ground
    drawGround();
    
    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw(ctx));
    
    // Draw dino
    dino.draw(ctx);
    
    // Draw particles
    particles.forEach(particle => particle.draw(ctx));
    
    // Draw level-up animation
    if (levelUpAnimation) {
        levelUpAnimation.frame++;
        const progress = levelUpAnimation.frame / levelUpAnimation.duration;
        levelUpAnimation.alpha = 1 - progress;
        
        if (levelUpAnimation.frame < levelUpAnimation.duration) {
            // Draw "LEVEL UP!" text
            ctx.save();
            ctx.globalAlpha = levelUpAnimation.alpha;
            ctx.font = 'bold 60px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const text = `LEVEL ${level}!`;
            const x = canvas.width / 2;
            const y = canvas.height / 2 - 50;
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
            ctx.restore();
        } else {
            levelUpAnimation = null;
        }
    }
}

function drawGround() {
    // Ensure we have ground segments
    if (!ground || ground.length === 0) {
        initializeGround();
    }
    
    const trackTopY = config.groundY;
    const trackThickness = 45;
    
    // Draw track lane markings and details on the track surface
    ground.forEach((segment) => {
        // Update segment Y to match current groundY
        segment.y = config.groundY;
        
        // Moving lane dividers on track surface (gold dashes)
        if ((segment.x - frameCount * currentSpeed) % 100 < 60 && segment.x % 100 < 60) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(segment.x + 15, trackTopY + 8, 8, 4);
            
            // Glow effect for visibility
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
            ctx.fillRect(segment.x + 15, trackTopY + 8, 8, 4);
            ctx.shadowBlur = 0;
        }
        
        // Distance markers on track (vertical lines)
        if (segment.x % 300 < 50) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 12]);
            ctx.beginPath();
            ctx.moveTo(segment.x + 25, trackTopY + 10);
            ctx.lineTo(segment.x + 25, trackTopY + trackThickness - 10);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
    
    // Draw track side borders (left and right edges)
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, trackTopY, 10, trackThickness);
    ctx.fillRect(canvas.width - 10, trackTopY, 10, trackThickness);
    
    // Draw track texture/details for realism
    ctx.fillStyle = 'rgba(139, 69, 19, 0.25)';
    for (let i = 0; i < canvas.width; i += 60) {
        ctx.fillRect(i, trackTopY + 18, 45, 2);
    }
}

function checkCollision(dino, obstacle) {
    // Dino position: x is left edge, y is groundY (base), drawn from y - height
    const dinoRect = {
        x: dino.x + 12,
        y: dino.y - dino.height + 15, // Top of dino
        width: dino.width - 24, // Adjusted for thinner dino
        height: dino.height - 30
    };
    
    // Obstacle position: for cactus, x is left, y is groundY (base), drawn from groundY - height
    let obstacleRect;
    if (obstacle.type !== undefined) {
        // Cactus - aligned to ground
        obstacleRect = {
            x: obstacle.x + 8,
            y: config.groundY - obstacle.height + 8, // Top of cactus
            width: obstacle.width - 16,
            height: obstacle.height - 16
        };
    } else if (obstacle.cacti) {
        // CactusGroup - use the tallest one
        const tallest = Math.max(...obstacle.cacti.map(c => c.height));
        obstacleRect = {
            x: obstacle.x + 8,
            y: config.groundY - tallest + 8,
            width: obstacle.width - 16,
            height: tallest - 16
        };
    } else if (obstacle.wingPosition !== undefined) {
        // Bird - use its actual Y position (flying in air)
        obstacleRect = {
            x: obstacle.x + 8,
            y: obstacle.y + 5,
            width: obstacle.width - 16,
            height: obstacle.height - 10
        };
    } else {
        // Other obstacle
        obstacleRect = {
            x: obstacle.x + 5,
            y: obstacle.y + 5,
            width: obstacle.width - 10,
            height: obstacle.height - 10
        };
    }
    
    return dinoRect.x < obstacleRect.x + obstacleRect.width &&
           dinoRect.x + dinoRect.width > obstacleRect.x &&
           dinoRect.y < obstacleRect.y + obstacleRect.height &&
           dinoRect.y + dinoRect.height > obstacleRect.y;
}

function spawnObstacle() {
    // Dynamic spacing based on level - higher level = less spacing (harder), lower level = more spacing (easier)
    // Level 1: 500px spacing, Level 5: 250px, Level 10: 150px
    const baseSpacing = 500;
    const minSpacing = Math.max(150, baseSpacing - (level - 1) * 30);
    if (lastObstacleX > 0 && canvas.width - lastObstacleX < minSpacing) {
        return; // Don't spawn if too close
    }
    
    const types = ['cactus', 'cactusGroup', 'bird'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obstacle;
    if (type === 'bird') {
        obstacle = new Bird(canvas.width);
    } else if (type === 'cactusGroup') {
        obstacle = new CactusGroup(canvas.width);
    } else {
        obstacle = new Cactus(canvas.width);
    }
    
    obstacles.push(obstacle);
    lastObstacleX = obstacle.x;
}

function spawnCloud() {
    clouds.push(new Cloud(canvas.width));
}

function spawnStar() {
    stars.push(new Star(canvas.width));
}

function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateScore() {
    document.getElementById('score').textContent = String(score).padStart(5, '0');
}

function updateHighScore() {
    document.getElementById('highScore').textContent = String(highScore).padStart(5, '0');
}

function updateLevel() {
    const levelElement = document.getElementById('level');
    if (levelElement) {
        levelElement.textContent = String(level).padStart(2, '0');
    }
}

function levelUp() {
    // Create level-up animation
    levelUpAnimation = {
        frame: 0,
        duration: 60, // 1 second at 60fps
        alpha: 1
    };
    
    // Create celebration particles
    for (let i = 0; i < 30; i++) {
        const particle = new Particle(
            canvas.width / 2,
            canvas.height / 2,
            '#FFD700'
        );
        // Override velocity for celebration effect
        particle.vx = (Math.random() - 0.5) * 10;
        particle.vy = (Math.random() - 0.5) * 10;
        particle.life = 30 + Math.random() * 20;
        particle.maxLife = particle.life;
        particles.push(particle);
    }
    
    // Play level-up sound effect (visual only, no audio)
    // Add visual flash effect
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(255, 215, 0, 0.3);
        pointer-events: none;
        z-index: 1000;
        animation: flash 0.3s ease-out;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
}

function updateSpeedBar() {
    const speedPercentage = (currentSpeed / config.maxSpeed) * 100;
    document.getElementById('speedBar').style.width = speedPercentage + '%';
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Dinosaur Class
class Dino {
    constructor() {
        this.x = 80;
        this.y = config.groundY;
        this.width = 85; // Made thinner
        this.height = 110;
        this.velocityY = 0;
        this.isJumping = false;
        this.isCrouching = false;
        this.animationFrame = 0;
        this.legPosition = 0;
        this.bodyBounce = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.tailSway = 0;
    }
    
    reset() {
        this.y = config.groundY;
        this.velocityY = 0;
        this.isJumping = false;
        this.isCrouching = false;
        this.animationFrame = 0;
        this.legPosition = 0;
        this.bodyBounce = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.tailSway = 0;
    }
    
    jump() {
        if (!this.isJumping) {
            this.velocityY = config.jumpStrength;
            this.isJumping = true;
        }
    }
    
    crouch() {
        if (!this.isJumping) {
            this.isCrouching = true;
            this.height = 65;
            // Keep base aligned to groundY
            this.y = config.groundY;
        }
    }
    
    uncrouch() {
        this.isCrouching = false;
        this.height = 110;
        this.y = config.groundY;
    }
    
    update() {
        // Apply gravity
        if (this.isJumping) {
            this.velocityY += config.gravity;
            this.y += this.velocityY;
            
            // Ground collision
            if (this.y >= config.groundY) {
                this.y = config.groundY;
                this.velocityY = 0;
                this.isJumping = false;
                createParticles(this.x + 35, config.groundY, '#22c55e');
            }
        }
        
        // Animation
        this.animationFrame += 0.25;
        this.tailSway = Math.sin(this.animationFrame * 0.8) * 12;
        
        if (!this.isJumping && !this.isCrouching) {
            this.legPosition = Math.sin(this.animationFrame * 2) * 8;
            this.bodyBounce = Math.sin(this.animationFrame * 2) * 2;
        }
        
        // Blinking animation
        this.blinkTimer++;
        if (this.blinkTimer > 120 + Math.random() * 60) {
            this.isBlinking = true;
            this.blinkTimer = 0;
        }
        if (this.isBlinking && this.blinkTimer > 5) {
            this.isBlinking = false;
        }
    }
    
    draw(ctx) {
        ctx.save();
        // Align to ground line - dino base is at groundY
        ctx.translate(this.x, this.y - this.height);
        
        // Refined tail with smooth curves
        const tailBaseX = 5;
        const tailTipX = -12 + Math.sin(this.tailSway) * 3;
        const tailTipY = -15 + Math.sin(this.tailSway + 0.5) * 5;
        
        const tailGradient = ctx.createLinearGradient(0, 25, tailTipX, tailTipY);
        tailGradient.addColorStop(0, '#22c55e');
        tailGradient.addColorStop(1, '#15803d');
        ctx.fillStyle = tailGradient;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tailBaseX, 25);
        ctx.quadraticCurveTo(tailTipX * 0.5, 15, tailTipX, tailTipY);
        ctx.quadraticCurveTo(tailTipX * 0.7, 10, tailBaseX, 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Refined body with rounded corners
        const bodyGradient = ctx.createLinearGradient(20, 15, 50, 45);
        bodyGradient.addColorStop(0, '#22c55e');
        bodyGradient.addColorStop(0.3, '#16a34a');
        bodyGradient.addColorStop(0.7, '#15803d');
        bodyGradient.addColorStop(1, '#14532d');
        ctx.fillStyle = bodyGradient;
        
        // Rounded body
        ctx.beginPath();
        ctx.roundRect(18, 18, this.width - 36, this.height - 36, 8);
        ctx.fill();
        
        // Body outline with shadow
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(18, 18, this.width - 36, this.height - 36, 8);
        ctx.stroke();
        
        // Belly highlight with gradient
        const bellyGradient = ctx.createLinearGradient(20, 25, 50, 32);
        bellyGradient.addColorStop(0, '#4ade80');
        bellyGradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = bellyGradient;
        ctx.beginPath();
        ctx.roundRect(20, 25, this.width - 40, 12, 4);
        ctx.fill();
        
        // Refined neck with smooth connection
        const neckGradient = ctx.createLinearGradient(38, 32, 48, 42);
        neckGradient.addColorStop(0, '#22c55e');
        neckGradient.addColorStop(1, '#16a34a');
        ctx.fillStyle = neckGradient;
        ctx.beginPath();
        ctx.roundRect(38, 32, 10, 18, 5);
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(38, 32, 10, 18, 5);
        ctx.stroke();
        
        // Refined head with rounded shape
        const headGradient = ctx.createLinearGradient(32, -3, 55, 28);
        headGradient.addColorStop(0, '#22c55e');
        headGradient.addColorStop(0.5, '#16a34a');
        headGradient.addColorStop(1, '#15803d');
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.roundRect(32, -3, 28, 28, 6);
        ctx.fill();
        
        // Head outline
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(32, -3, 28, 28, 6);
        ctx.stroke();
        
        // Eye (with blinking) - more refined
        if (!this.isBlinking) {
            // Eye white
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(43, 8, 9, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye outline
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Eye pupil
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(43, 8, 5.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye shine
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(44.5, 6.5, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Closed eye - more refined
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(35, 8);
            ctx.quadraticCurveTo(43, 6, 51, 8);
            ctx.stroke();
        }
        
        // Refined mouth with expression
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (this.isJumping) {
            // Happy open mouth
            ctx.arc(50, 20, 7, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            // Smile
            ctx.moveTo(47, 19);
            ctx.quadraticCurveTo(50, 22, 53, 19);
            ctx.stroke();
        }
        
        // Refined legs with rounded shapes
        if (this.isCrouching) {
            // Crouching legs
            const legGradient = ctx.createLinearGradient(22, this.height - 12, 28, this.height - 5);
            legGradient.addColorStop(0, '#16a34a');
            legGradient.addColorStop(1, '#15803d');
            ctx.fillStyle = legGradient;
            ctx.beginPath();
            ctx.roundRect(22, this.height - 12, 10, 10, 3);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(38, this.height - 12, 10, 10, 3);
            ctx.fill();
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Running legs with refined animation
            const legOffset = this.legPosition;
            const legGradient = ctx.createLinearGradient(22, this.height - 10 + legOffset, 28, this.height + 2 + legOffset);
            legGradient.addColorStop(0, '#16a34a');
            legGradient.addColorStop(1, '#15803d');
            ctx.fillStyle = legGradient;
            
            // Front leg - rounded
            ctx.beginPath();
            ctx.roundRect(22, this.height - 10 + legOffset, 10, 12, 3);
            ctx.fill();
            
            // Back leg
            ctx.beginPath();
            ctx.roundRect(38, this.height - 10 - legOffset, 10, 12, 3);
            ctx.fill();
            
            // Leg outlines
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Feet with highlights
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.roundRect(23, this.height + 0.5 + legOffset, 8, 2.5, 1);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(39, this.height + 0.5 - legOffset, 8, 2.5, 1);
            ctx.fill();
        }
        
        // Jumping trail effect - refined
        if (this.isJumping) {
            const trailGradient = ctx.createRadialGradient(35, this.height, 0, 35, this.height, 30);
            trailGradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
            trailGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.2)');
            trailGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.arc(35, this.height, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Obstacle Classes
class Cactus {
    constructor(x) {
        this.x = x;
        this.y = config.groundY;
        this.width = 35;
        this.height = 85; // Increased height
        this.type = Math.floor(Math.random() * 3); // Different cactus variations
    }
    
    update() {
        this.x -= currentSpeed;
    }
    
    draw(ctx) {
        // Align to ground line - base at groundY
        const baseY = config.groundY;
        
        // Main stem with refined gradient
        const stemGradient = ctx.createLinearGradient(this.x + 14, baseY - this.height, this.x + 14, baseY);
        stemGradient.addColorStop(0, '#4a7c2a');
        stemGradient.addColorStop(0.3, '#3d6b1f');
        stemGradient.addColorStop(0.7, '#2d5016');
        stemGradient.addColorStop(1, '#1f3a0f');
        ctx.fillStyle = stemGradient;
        ctx.strokeStyle = '#1a3009';
        ctx.lineWidth = 2.5;
        
        // Rounded main stem
        ctx.beginPath();
        ctx.roundRect(this.x + 13, baseY - this.height, 14, this.height, 3);
        ctx.fill();
        ctx.stroke();
        
        // Stem highlight
        const highlightGradient = ctx.createLinearGradient(this.x + 13, baseY - this.height, this.x + 27, baseY);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.roundRect(this.x + 13, baseY - this.height, 7, this.height, 2);
        ctx.fill();
        
        // Left branch with refined shape
        if (this.type === 0 || this.type === 2) {
            const branchGradient = ctx.createLinearGradient(this.x + 3, baseY - this.height + 30, this.x + 15, baseY - this.height + 60);
            branchGradient.addColorStop(0, '#3d6b1f');
            branchGradient.addColorStop(1, '#2d5016');
            ctx.fillStyle = branchGradient;
            ctx.beginPath();
            ctx.roundRect(this.x + 3, baseY - this.height + 30, 12, 30, 3);
            ctx.fill();
            ctx.stroke();
        }
        
        // Right branch with refined shape
        if (this.type === 1 || this.type === 2) {
            const branchGradient = ctx.createLinearGradient(this.x + 25, baseY - this.height + 25, this.x + 37, baseY - this.height + 50);
            branchGradient.addColorStop(0, '#3d6b1f');
            branchGradient.addColorStop(1, '#2d5016');
            ctx.fillStyle = branchGradient;
            ctx.beginPath();
            ctx.roundRect(this.x + 25, baseY - this.height + 25, 12, 25, 3);
            ctx.fill();
            ctx.stroke();
        }
        
        // Refined top spike with multiple points
        ctx.fillStyle = '#2d5016';
        ctx.strokeStyle = '#1a3009';
        ctx.lineWidth = 2;
        
        // Main top spike
        ctx.beginPath();
        ctx.moveTo(this.x + 20, baseY - this.height);
        ctx.lineTo(this.x + 12, baseY - this.height - 8);
        ctx.lineTo(this.x + 28, baseY - this.height - 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Side spikes for more detail
        ctx.beginPath();
        ctx.moveTo(this.x + 17, baseY - this.height + 8);
        ctx.lineTo(this.x + 13, baseY - this.height + 5);
        ctx.lineTo(this.x + 21, baseY - this.height + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.x + 23, baseY - this.height + 8);
        ctx.lineTo(this.x + 19, baseY - this.height + 5);
        ctx.lineTo(this.x + 27, baseY - this.height + 5);
        ctx.closePath();
        ctx.fill();
        
        // Base shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x + 13, baseY - 3, 14, 3);
    }
}

class CactusGroup {
    constructor(x) {
        this.x = x;
        this.y = config.groundY;
        this.cacti = [];
        for (let i = 0; i < 2; i++) {
            this.cacti.push({
                x: i * 40,
                height: 60 + Math.random() * 45 // Increased height
            });
        }
        this.width = 80;
        this.height = 105; // Increased max height
    }
    
    update() {
        this.x -= currentSpeed;
    }
    
    draw(ctx) {
        const baseY = config.groundY;
        this.cacti.forEach((cactus, index) => {
            const cactusGradient = ctx.createLinearGradient(this.x + cactus.x, baseY - cactus.height, this.x + cactus.x, baseY);
            cactusGradient.addColorStop(0, '#3d6b1f');
            cactusGradient.addColorStop(1, '#2d5016');
            ctx.fillStyle = cactusGradient;
            ctx.strokeStyle = '#1a3009';
            ctx.lineWidth = 2;
            // Aligned to ground line
            ctx.fillRect(this.x + cactus.x + 12, baseY - cactus.height, 12, cactus.height);
            ctx.strokeRect(this.x + cactus.x + 12, baseY - cactus.height, 12, cactus.height);
        });
    }
}

class Bird {
    constructor(x) {
        this.x = x;
        // Birds fly at medium height - dino can jump and collide with them
        // Dino can jump ~200px, so birds should be in jump range (80-200px above ground)
        this.y = config.groundY - 100 - Math.random() * 80; // Between 100-180px above ground
        this.width = 40;
        this.height = 25;
        this.wingPosition = 0;
    }
    
    update() {
        this.x -= currentSpeed * 1.2;
        this.wingPosition += 0.3;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Body
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(8, -3, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(12, -3);
        ctx.lineTo(16, -5);
        ctx.lineTo(12, -1);
        ctx.closePath();
        ctx.fill();
        
        // Wings
        ctx.fillStyle = '#A0522D';
        const wingOffset = Math.sin(this.wingPosition) * 8;
        
        // Left wing
        ctx.beginPath();
        ctx.ellipse(-5, wingOffset, 15, 5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Right wing
        ctx.beginPath();
        ctx.ellipse(-5, -wingOffset, 15, 5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(10, -5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Cloud Class
class Cloud {
    constructor(x) {
        this.x = x;
        this.y = 30 + Math.random() * 100;
        this.width = 60 + Math.random() * 40;
        this.height = 30;
        this.speed = 0.5 + Math.random() * 0.5;
        this.opacity = 0.3 + Math.random() * 0.3;
    }
    
    update() {
        this.x -= currentSpeed * this.speed;
    }
    
    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        
        // Draw fluffy cloud
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.arc(this.x + 20, this.y, 20, 0, Math.PI * 2);
        ctx.arc(this.x + 40, this.y, 15, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y - 10, 12, 0, Math.PI * 2);
        ctx.arc(this.x + 30, this.y - 10, 15, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Star Class
class Star {
    constructor(x) {
        this.x = x;
        this.y = 20 + Math.random() * 150;
        this.width = 4;
        this.height = 4;
        this.twinkle = Math.random() * Math.PI * 2;
    }
    
    update() {
        this.x -= currentSpeed * 0.3;
        this.twinkle += 0.1;
    }
    
    draw(ctx) {
        const opacity = 0.5 + Math.sin(this.twinkle) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Particle Class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.maxLife = 30;
        this.size = 3 + Math.random() * 3;
        this.color = color;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        // Convert hex color to rgba with alpha
        if (this.color.startsWith('#')) {
            const r = parseInt(this.color.slice(1, 3), 16);
            const g = parseInt(this.color.slice(3, 5), 16);
            const b = parseInt(this.color.slice(5, 7), 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else {
            ctx.fillStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize game when page loads
window.addEventListener('load', init);

