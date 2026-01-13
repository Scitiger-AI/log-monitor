import Database from 'better-sqlite3';
import path from 'path';
import { Server, LogFile } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'log-monitor.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables() {
  const database = db!;

  database.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT NOT NULL,
      privateKeyPath TEXT,
      isLocal INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS log_files (
      id TEXT PRIMARY KEY,
      serverId TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      tailLines INTEGER DEFAULT 100,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serverId) REFERENCES servers(id) ON DELETE CASCADE
    );
  `);
}

// 服务器 CRUD
export function getAllServers(): Server[] {
  return getDb().prepare('SELECT * FROM servers ORDER BY createdAt DESC').all() as Server[];
}

export function getServerById(id: string): Server | undefined {
  return getDb().prepare('SELECT * FROM servers WHERE id = ?').get(id) as Server | undefined;
}

export function createServer(server: Omit<Server, 'createdAt'>): Server {
  const stmt = getDb().prepare(`
    INSERT INTO servers (id, name, host, port, username, privateKeyPath, isLocal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(server.id, server.name, server.host, server.port, server.username, server.privateKeyPath, server.isLocal ? 1 : 0);
  return getServerById(server.id)!;
}

export function updateServer(id: string, updates: Partial<Server>): Server | undefined {
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'createdAt');
  if (fields.length === 0) return getServerById(id);

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => {
    const val = (updates as Record<string, unknown>)[f];
    return f === 'isLocal' ? (val ? 1 : 0) : val;
  });

  getDb().prepare(`UPDATE servers SET ${setClause} WHERE id = ?`).run(...values, id);
  return getServerById(id);
}

export function deleteServer(id: string): boolean {
  const result = getDb().prepare('DELETE FROM servers WHERE id = ?').run(id);
  return result.changes > 0;
}

// 日志文件 CRUD
export function getAllLogFiles(): LogFile[] {
  return getDb().prepare('SELECT * FROM log_files ORDER BY createdAt DESC').all() as LogFile[];
}

export function getLogFilesByServerId(serverId: string): LogFile[] {
  return getDb().prepare('SELECT * FROM log_files WHERE serverId = ? ORDER BY createdAt DESC').all(serverId) as LogFile[];
}

export function getLogFileById(id: string): LogFile | undefined {
  return getDb().prepare('SELECT * FROM log_files WHERE id = ?').get(id) as LogFile | undefined;
}

export function createLogFile(logFile: Omit<LogFile, 'createdAt'>): LogFile {
  const stmt = getDb().prepare(`
    INSERT INTO log_files (id, serverId, name, path, tailLines)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(logFile.id, logFile.serverId, logFile.name, logFile.path, logFile.tailLines);
  return getLogFileById(logFile.id)!;
}

export function updateLogFile(id: string, updates: Partial<LogFile>): LogFile | undefined {
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'createdAt');
  if (fields.length === 0) return getLogFileById(id);

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);

  getDb().prepare(`UPDATE log_files SET ${setClause} WHERE id = ?`).run(...values, id);
  return getLogFileById(id);
}

export function deleteLogFile(id: string): boolean {
  const result = getDb().prepare('DELETE FROM log_files WHERE id = ?').run(id);
  return result.changes > 0;
}
