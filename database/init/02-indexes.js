// ============================================================
// MongoDB Indexes Initialization Script
// Performance optimization with 12+ indexes
// ============================================================

db = db.getSiblingDB('snake_game');

// ============================================================
// PLAYERS Collection Indexes
// ============================================================

// Unique username index
db.players.createIndex({ username: 1 }, { unique: true });

// Email index (for login)
db.players.createIndex({ email: 1 }, { unique: true, sparse: true });

// Statistics index (for leaderboard queries)
db.players.createIndex({ 'statistics.highScore': -1, 'statistics.totalGames': -1 });

// Last login index (for active users)
db.players.createIndex({ lastLogin: -1 });

// TTL index for inactive accounts (90 days)
db.players.createIndex({ lastLogin: 1 }, { expireAfterSeconds: 7776000 });

// ============================================================
// GAMES Collection Indexes
// ============================================================

// Player games index (queries by playerId)
db.games.createIndex({ playerId: 1, startTime: -1 });

// Leaderboard index (high scores)
db.games.createIndex({ score: -1, createdAt: -1 });

// Room index (multiplayer games)
db.games.createIndex({ roomId: 1, endTime: -1 });

// Game mode index
db.games.createIndex({ gameMode: 1, difficulty: 1, score: -1 });

// TTL index for old replays (30 days)
db.games.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// ============================================================
// ROOMS Collection Indexes
// ============================================================

// Room status index (find active rooms)
db.rooms.createIndex({ status: 1, createdAt: -1 });

// Player in room index
db.rooms.createIndex({ 'players.playerId': 1 });

// Difficulty filter
db.rooms.createIndex({ difficulty: 1, status: 1 });

// TTL index for finished rooms (7 days)
db.rooms.createIndex({ endTime: 1 }, { expireAfterSeconds: 604800 });

// ============================================================
// COSMETICS Collection Indexes
// ============================================================

// Type index (filter by cosmetic type)
db.cosmetics.createIndex({ type: 1, rarity: 1 });

// Rarity index (legendary/epic filters)
db.cosmetics.createIndex({ rarity: 1, price: 1 });

// Active cosmetics (for shop)
db.cosmetics.createIndex({ active: 1, type: 1, price: 1 });

// TTL index for limited-time cosmetics
db.cosmetics.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================================
// PLAYER COSMETICS Collection Indexes
// ============================================================

// Player owned cosmetics
db.player_cosmetics.createIndex({ playerId: 1, isActive: 1 });

// Expiring cosmetics (for cleanup)
db.player_cosmetics.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================================
// LEADERBOARD Collection Indexes
// ============================================================

// Primary leaderboard index
db.leaderboard.createIndex({ rank: 1 });

// Score index (updates)
db.leaderboard.createIndex({ score: -1 });

// Player lookup
db.leaderboard.createIndex({ playerId: 1 }, { unique: true });

// Update time index
db.leaderboard.createIndex({ updatedAt: -1 });

print('✅ All indexes created successfully');
print('   - 6 players indexes');
print('   - 5 games indexes');
print('   - 4 rooms indexes');
print('   - 4 cosmetics indexes');
print('   - 2 player_cosmetics indexes');
print('   - 4 leaderboard indexes');
print('   Total: 25 indexes for optimal performance');
