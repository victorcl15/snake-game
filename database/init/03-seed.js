// ============================================================
// MongoDB Seed Data Script
// Populate initial cosmetics (12 items)
// ============================================================

db = db.getSiblingDB('snake_game');

// ============================================================
// COSMETICS - Initial Seed Data
// ============================================================

db.cosmetics.deleteMany({});

db.cosmetics.insertMany([
    // ============================================================
    // SNAKE SKINS (4)
    // ============================================================
    {
        name: 'Classic Green',
        description: 'The original Snake skin',
        type: 'snakeSkin',
        color: '#00FF00',
        rarity: 'common',
        price: 0,
        icon: '🐍',
        preview: 'classic-green',
        attributes: { glow: false, particle: false },
        unlockMethod: 'shop',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Neon Purple',
        description: 'Sleek neon purple with glow effect',
        type: 'snakeSkin',
        color: '#9D00FF',
        rarity: 'rare',
        price: 500,
        icon: '🐲',
        preview: 'neon-purple',
        attributes: { glow: true, particle: true },
        unlockMethod: 'shop',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Gold Dragon',
        description: 'Legendary golden dragon scale pattern',
        type: 'snakeSkin',
        color: '#FFD700',
        rarity: 'epic',
        price: 2000,
        icon: '💛',
        preview: 'gold-dragon',
        attributes: { glow: true, particle: true, animate: true },
        unlockMethod: 'achievement',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Cyber Viper',
        description: 'Futuristic holographic viper',
        type: 'snakeSkin',
        color: '#00FFFF',
        rarity: 'legendary',
        price: 5000,
        icon: '⚡',
        preview: 'cyber-viper',
        attributes: { glow: true, particle: true, animate: true, shader: 'holographic' },
        unlockMethod: 'seasonal',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        createdAt: new Date()
    },

    // ============================================================
    // TRAIL EFFECTS (3)
    // ============================================================
    {
        name: 'Classic Trail',
        description: 'Simple fade trail',
        type: 'trailEffect',
        color: '#00FF00',
        rarity: 'common',
        price: 0,
        icon: '✨',
        preview: 'classic-trail',
        attributes: { particles: false, glow: false },
        unlockMethod: 'shop',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Fire Trail',
        description: 'Burning fire particle trail',
        type: 'trailEffect',
        color: '#FF4500',
        rarity: 'rare',
        price: 800,
        icon: '🔥',
        preview: 'fire-trail',
        attributes: { particles: true, glow: true, color: 'orange' },
        unlockMethod: 'shop',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Ice Trail',
        description: 'Frozen crystal trail effect',
        type: 'trailEffect',
        color: '#00FFFF',
        rarity: 'epic',
        price: 1500,
        icon: '❄️',
        preview: 'ice-trail',
        attributes: { particles: true, glow: true, color: 'cyan', shader: 'crystal' },
        unlockMethod: 'achievement',
        active: true,
        createdAt: new Date()
    },

    // ============================================================
    // MOUSE TYPES (3)
    // ============================================================
    {
        name: 'Gray Mouse',
        description: 'Standard gray mouse',
        type: 'mouseType',
        color: '#9ca3af',
        rarity: 'common',
        price: 0,
        icon: '🐭',
        preview: 'gray-mouse',
        attributes: { points: 10, speed: 1, size: 'normal' },
        unlockMethod: 'shop',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Golden Mouse',
        description: 'Rare golden mouse worth extra points',
        type: 'mouseType',
        color: '#ffd700',
        rarity: 'epic',
        price: 1200,
        icon: '✨',
        preview: 'golden-mouse',
        attributes: { points: 50, speed: 2, size: 'large', glow: true },
        unlockMethod: 'event',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Chromatic Mouse',
        description: 'Legendary shifting color mouse',
        type: 'mouseType',
        color: '#FF00FF',
        rarity: 'legendary',
        price: 4000,
        icon: '🌈',
        preview: 'chromatic-mouse',
        attributes: { points: 100, speed: 3, size: 'huge', glow: true, animate: true, shader: 'chromatic' },
        unlockMethod: 'seasonal',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        createdAt: new Date()
    },

    // ============================================================
    // PARTICLE EFFECTS (2)
    // ============================================================
    {
        name: 'Sparkle Effect',
        description: 'Sparkling particle effect on eat',
        type: 'particleEffect',
        color: '#FFD700',
        rarity: 'rare',
        price: 600,
        icon: '✨',
        preview: 'sparkle-effect',
        attributes: { particles: 'sparkle', count: 10, lifetime: 1000 },
        unlockMethod: 'shop',
        active: true,
        createdAt: new Date()
    },
    {
        name: 'Explosion Effect',
        description: 'Explosive burst on eating mouse',
        type: 'particleEffect',
        color: '#FF6347',
        rarity: 'epic',
        price: 1800,
        icon: '💥',
        preview: 'explosion-effect',
        attributes: { particles: 'explosion', count: 20, lifetime: 2000, force: 'high' },
        unlockMethod: 'achievement',
        active: true,
        createdAt: new Date()
    }
]);

print('✅ Cosmetics seeded successfully!');
print('   - 4 Snake Skins');
print('   - 3 Trail Effects');
print('   - 3 Mouse Types');
print('   - 2 Particle Effects');
print('   Total: 12 cosmetics');
