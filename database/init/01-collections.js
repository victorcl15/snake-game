// ============================================================
// MongoDB Collections Initialization Script
// Creates all collections with JSON Schema validators
// ============================================================

db = db.getSiblingDB('snake_game');

// ============================================================
// 1. PLAYERS Collection
// ============================================================
db.createCollection('players', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['username', 'createdAt'],
            properties: {
                _id: { bsonType: 'objectId' },
                username: {
                    bsonType: 'string',
                    minLength: 3,
                    maxLength: 30,
                    pattern: '^[a-zA-Z0-9_-]+$',
                    description: 'Unique username'
                },
                email: { bsonType: 'string', pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' },
                avatar: { bsonType: 'string' },
                cosmetics: {
                    bsonType: 'object',
                    properties: {
                        snakeSkin: { bsonType: 'string' },
                        trailEffect: { bsonType: 'string' },
                        mouseType: { bsonType: 'string' },
                        particleEffect: { bsonType: 'string' }
                    }
                },
                settings: {
                    bsonType: 'object',
                    properties: {
                        soundEnabled: { bsonType: 'bool' },
                        difficulty: { enum: ['easy', 'normal', 'hard', 'extreme'] },
                        theme: { enum: ['dark', 'light', 'neon'] }
                    }
                },
                statistics: {
                    bsonType: 'object',
                    properties: {
                        totalGames: { bsonType: 'int' },
                        wins: { bsonType: 'int' },
                        totalScore: { bsonType: 'long' },
                        highScore: { bsonType: 'long' },
                        avgScore: { bsonType: 'double' },
                        playtime: { bsonType: 'long', description: 'milliseconds' }
                    }
                },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' },
                lastLogin: { bsonType: 'date' }
            }
        }
    }
});

// ============================================================
// 2. GAMES Collection
// ============================================================
db.createCollection('games', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['playerId', 'score', 'duration', 'startTime'],
            properties: {
                _id: { bsonType: 'objectId' },
                playerId: { bsonType: 'objectId', description: 'Reference to player' },
                roomId: { bsonType: 'objectId', description: 'Reference to multiplayer room (optional)' },
                score: { bsonType: 'long' },
                level: { bsonType: 'int' },
                duration: { bsonType: 'long', description: 'milliseconds' },
                foodEaten: { bsonType: 'int' },
                snakeLength: { bsonType: 'int' },
                difficulty: { enum: ['easy', 'normal', 'hard', 'extreme'] },
                gameMode: { enum: ['solo', 'multiplayer', 'survival'] },
                startTime: { bsonType: 'date' },
                endTime: { bsonType: 'date' },
                replay: {
                    bsonType: 'object',
                    properties: {
                        moves: { bsonType: 'array' },
                        checkpoints: { bsonType: 'array' }
                    }
                },
                createdAt: { bsonType: 'date' }
            }
        }
    }
});

// ============================================================
// 3. MULTIPLAYER ROOMS Collection
// ============================================================
db.createCollection('rooms', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'maxPlayers', 'createdAt'],
            properties: {
                _id: { bsonType: 'objectId' },
                name: { bsonType: 'string' },
                description: { bsonType: 'string' },
                maxPlayers: { bsonType: 'int', minimum: 2, maximum: 8 },
                players: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        properties: {
                            playerId: { bsonType: 'objectId' },
                            username: { bsonType: 'string' },
                            score: { bsonType: 'long' },
                            joinedAt: { bsonType: 'date' }
                        }
                    }
                },
                status: { enum: ['waiting', 'in_progress', 'finished'] },
                difficulty: { enum: ['easy', 'normal', 'hard', 'extreme'] },
                startTime: { bsonType: 'date' },
                endTime: { bsonType: 'date' },
                winner: {
                    bsonType: 'object',
                    properties: {
                        playerId: { bsonType: 'objectId' },
                        username: { bsonType: 'string' },
                        score: { bsonType: 'long' }
                    }
                },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
            }
        }
    }
});

// ============================================================
// 4. COSMETICS Collection
// ============================================================
db.createCollection('cosmetics', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'type', 'price', 'rarity'],
            properties: {
                _id: { bsonType: 'objectId' },
                name: { bsonType: 'string' },
                description: { bsonType: 'string' },
                type: { enum: ['snakeSkin', 'trailEffect', 'mouseType', 'particleEffect'] },
                color: { bsonType: 'string' },
                rarity: { enum: ['common', 'rare', 'epic', 'legendary'] },
                price: { bsonType: 'int', description: 'in coins' },
                icon: { bsonType: 'string', description: 'URL or data' },
                preview: { bsonType: 'string', description: 'preview image/animation' },
                attributes: { bsonType: 'object' },
                unlockMethod: { enum: ['shop', 'event', 'achievement', 'seasonal'] },
                expiresAt: { bsonType: 'date' },
                active: { bsonType: 'bool' },
                createdAt: { bsonType: 'date' }
            }
        }
    }
});

// ============================================================
// 5. PLAYER COSMETICS Collection
// ============================================================
db.createCollection('player_cosmetics', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['playerId', 'cosmeticId'],
            properties: {
                _id: { bsonType: 'objectId' },
                playerId: { bsonType: 'objectId' },
                cosmeticId: { bsonType: 'objectId' },
                purchasedAt: { bsonType: 'date' },
                expiresAt: { bsonType: 'date' },
                isActive: { bsonType: 'bool' }
            }
        }
    }
});

// ============================================================
// 6. LEADERBOARD Collection (Denormalized for speed)
// ============================================================
db.createCollection('leaderboard', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['playerId', 'score', 'rank'],
            properties: {
                _id: { bsonType: 'objectId' },
                playerId: { bsonType: 'objectId' },
                username: { bsonType: 'string' },
                avatar: { bsonType: 'string' },
                score: { bsonType: 'long' },
                rank: { bsonType: 'int' },
                wins: { bsonType: 'int' },
                totalGames: { bsonType: 'int' },
                winRate: { bsonType: 'double' },
                updatedAt: { bsonType: 'date' }
            }
        }
    }
});

print('✅ All collections created with JSON Schema validation');
