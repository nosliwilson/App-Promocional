import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      socialName TEXT,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      hasTicket BOOLEAN,
      wonPrize TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      customData TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      discount TEXT NOT NULL,
      probability REAL NOT NULL,
      maxQuantity INTEGER,
      redeemedQuantity INTEGER DEFAULT 0
    );
  `);

  try {
    await db.exec('ALTER TABLE participants ADD COLUMN customData TEXT;');
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';");
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await db.exec("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1;");
  } catch (e) {
    // Ignore if already exists
  }

  // Default settings
  await db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('appTitle', 'Promoção KPop Tour');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('ticketQuestionText', 'Você já possui ingresso para o show?');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('socialLinks', '{"instagram": "", "twitter": ""}');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('socialNameEnabled', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('backgroundImage', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('logoImage', '');
  `);

  // Create default admin user
  const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const defaultHash = await bcrypt.hash('admin', 10);
    await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', defaultHash, 'admin']);
  }

  // Ensure first user is admin if exists
  const firstUser = await db.get('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  if (firstUser) {
    await db.run("UPDATE users SET role = 'admin' WHERE id = ?", [firstUser.id]);
  }

  // Create default prizes if table is empty
  const prizeCount = await db.get('SELECT COUNT(*) as count FROM prizes');
  if (prizeCount.count === 0) {
    await db.run('INSERT INTO prizes (name, discount, probability, maxQuantity) VALUES (?, ?, ?, ?)', ['Cupom R$ 50', '50', 0.1, 10]);
    await db.run('INSERT INTO prizes (name, discount, probability, maxQuantity) VALUES (?, ?, ?, ?)', ['Cupom R$ 35', '35', 0.2, 50]);
    await db.run('INSERT INTO prizes (name, discount, probability, maxQuantity) VALUES (?, ?, ?, ?)', ['Cupom R$ 20', '20', 0.3, 100]);
  }

  return db;
}

export async function backupDb(): Promise<string> {
  if (db) await db.close();
  db = null;
  return DB_PATH;
}

export async function getSettings() {
  const d = await getDb();
  const rows = await d.all('SELECT * FROM settings');
  const settings: Record<string, any> = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  }
  return settings;
}

export async function updateSetting(key: string, value: any) {
  const d = await getDb();
  const valString = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await d.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', [key, valString, valString]);
}

export async function addParticipant(data: { name: string; socialName?: string; phone: string; email: string; hasTicket: boolean; wonPrize: string | null; customData?: any }) {
  const d = await getDb();
  try {
    const customDataStr = data.customData ? (typeof data.customData === 'string' ? data.customData : JSON.stringify(data.customData)) : null;
    await d.run(
        'INSERT INTO participants (name, socialName, phone, email, hasTicket, wonPrize, customData) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.name, data.socialName || null, data.phone, data.email, data.hasTicket ? 1 : 0, data.wonPrize, customDataStr]
    );
    return { success: true };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return { success: false, error: 'already_participated' };
    }
    throw error;
  }
}

export async function getParticipantByEmail(email: string) {
  const d = await getDb();
  return d.get('SELECT * FROM participants WHERE email = ?', [email]);
}

export async function getAllParticipants() {
  const d = await getDb();
  return d.all('SELECT * FROM participants ORDER BY createdAt DESC');
}

export async function clearDatabase() {
  if (db) await db.close();
  db = null;
  fs.unlinkSync(DB_PATH);
  await getDb();
}

// User Functions
export async function getUserByUsername(username: string) {
  const d = await getDb();
  return d.get('SELECT * FROM users WHERE username = ?', [username]);
}

export async function getAllUsers() {
  const d = await getDb();
  return d.all('SELECT id, username, role, active FROM users ORDER BY id ASC');
}

export async function createUser(username: string, hash: string, role = 'user') {
  const d = await getDb();
  await d.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role]);
}

export async function deleteUser(id: number) {
  const d = await getDb();
  await d.run('DELETE FROM users WHERE id = ?', [id]);
}

export async function updateUserPassword(id: number, hash: string) {
  const d = await getDb();
  await d.run('UPDATE users SET password = ? WHERE id = ?', [hash, id]);
}

export async function updateUserStatus(id: number, active: number) {
  const d = await getDb();
  await d.run('UPDATE users SET active = ? WHERE id = ?', [active, id]);
}

// Prize Functions
export async function getAllPrizes() {
  const d = await getDb();
  return d.all('SELECT * FROM prizes ORDER BY discount DESC');
}

export async function addPrize(prize: { name: string; discount: string; probability: number; maxQuantity: number | null }) {
  const d = await getDb();
  await d.run('INSERT INTO prizes (name, discount, probability, maxQuantity) VALUES (?, ?, ?, ?)', [prize.name, prize.discount, prize.probability, prize.maxQuantity]);
}

export async function updatePrize(id: number, prize: { name: string; discount: string; probability: number; maxQuantity: number | null }) {
  const d = await getDb();
  await d.run('UPDATE prizes SET name = ?, discount = ?, probability = ?, maxQuantity = ? WHERE id = ?', [prize.name, prize.discount, prize.probability, prize.maxQuantity, id]);
}

export async function deletePrize(id: number) {
  const d = await getDb();
  await d.run('DELETE FROM prizes WHERE id = ?', [id]);
}

export async function incrementPrizeRedeemed(id: number) {
  const d = await getDb();
  await d.run('UPDATE prizes SET redeemedQuantity = redeemedQuantity + 1 WHERE id = ?', [id]);
}
