const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/games.db');

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    // Create tables
    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        current_player_id TEXT,
        board_state TEXT NOT NULL,
        move_count INTEGER DEFAULT 0,
        min_players INTEGER DEFAULT 2,
        max_players INTEGER DEFAULT 2,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}',
        FOREIGN KEY (current_player_id) REFERENCES users (id),
        CHECK (min_players >= 1 AND min_players <= 10),
        CHECK (max_players >= min_players AND max_players <= 10)
      );

      CREATE TABLE IF NOT EXISTS game_players (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        player_order INTEGER NOT NULL,
        color TEXT,
        player_data TEXT DEFAULT '{}',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE (game_id, user_id),
        UNIQUE (game_id, player_order),
        CHECK (player_order >= 1 AND player_order <= 10)
      );

      CREATE TABLE IF NOT EXISTS moves (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        move_notation TEXT NOT NULL,
        board_state_after TEXT NOT NULL,
        move_number INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        game_id TEXT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
      CREATE INDEX IF NOT EXISTS idx_games_current_player ON games (current_player_id);
      CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players (game_id);
      CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players (user_id);
      CREATE INDEX IF NOT EXISTS idx_moves_game ON moves (game_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
    `;

    database.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
      } else {
        console.log('Database tables created successfully');
        resolve();
      }
    });
  });
}

function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        db = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};