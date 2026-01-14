import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Server, LogFile } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'log-monitor.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // 确保 data 目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
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

  // 清理重复记录后再创建唯一索引
  cleanupDuplicatesBeforeIndex(database);

  // 为已存在的表添加唯一索引（如果不存在）
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_log_files_server_path ON log_files(serverId, path);
  `);
}

// 在创建唯一索引前清理重复记录
function cleanupDuplicatesBeforeIndex(database: Database.Database) {
  // 检查索引是否已存在
  const indexExists = database.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='index' AND name='idx_log_files_server_path'
  `).get();

  if (indexExists) {
    return; // 索引已存在，无需清理
  }

  // 查找重复的记录
  const duplicates = database.prepare(`
    SELECT serverId, path, COUNT(*) as count
    FROM log_files
    GROUP BY serverId, path
    HAVING COUNT(*) > 1
  `).all() as { serverId: string; path: string; count: number }[];

  if (duplicates.length === 0) {
    return;
  }

  console.log(`[DB] 发现 ${duplicates.length} 组重复记录，正在清理...`);

  // 删除重复记录（保留最早创建的）
  const deleteStmt = database.prepare(`
    DELETE FROM log_files
    WHERE serverId = ? AND path = ? AND id NOT IN (
      SELECT id FROM log_files
      WHERE serverId = ? AND path = ?
      ORDER BY createdAt ASC
      LIMIT 1
    )
  `);

  let deletedCount = 0;
  const cleanup = database.transaction(() => {
    for (const dup of duplicates) {
      const result = deleteStmt.run(dup.serverId, dup.path, dup.serverId, dup.path);
      deletedCount += result.changes;
    }
  });

  cleanup();
  console.log(`[DB] 清理完成，删除了 ${deletedCount} 条重复记录`);
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

// 检查日志文件是否已存在（根据 serverId 和 path）
export function getLogFileByServerAndPath(serverId: string, path: string): LogFile | undefined {
  return getDb().prepare('SELECT * FROM log_files WHERE serverId = ? AND path = ?').get(serverId, path) as LogFile | undefined;
}

// 批量检查日志文件是否已存在
export function getExistingLogFilePaths(serverId: string, paths: string[]): Set<string> {
  if (paths.length === 0) return new Set();
  const placeholders = paths.map(() => '?').join(',');
  const rows = getDb().prepare(
    `SELECT path FROM log_files WHERE serverId = ? AND path IN (${placeholders})`
  ).all(serverId, ...paths) as { path: string }[];
  return new Set(rows.map(r => r.path));
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

// 批量创建日志文件（使用事务）
export function createLogFiles(logFiles: Omit<LogFile, 'createdAt'>[]): LogFile[] {
  const database = getDb();
  const insertStmt = database.prepare(`
    INSERT INTO log_files (id, serverId, name, path, tailLines)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((files: Omit<LogFile, 'createdAt'>[]) => {
    for (const lf of files) {
      insertStmt.run(lf.id, lf.serverId, lf.name, lf.path, lf.tailLines);
    }
  });

  insertMany(logFiles);

  // 返回创建的日志文件
  return logFiles.map(lf => getLogFileById(lf.id)!);
}

// 清理重复的日志文件记录（保留最早创建的记录）
export function cleanupDuplicateLogFiles(): { deletedCount: number; duplicates: { serverId: string; path: string; count: number }[] } {
  const database = getDb();

  // 查找重复的记录
  const duplicates = database.prepare(`
    SELECT serverId, path, COUNT(*) as count
    FROM log_files
    GROUP BY serverId, path
    HAVING COUNT(*) > 1
  `).all() as { serverId: string; path: string; count: number }[];

  if (duplicates.length === 0) {
    return { deletedCount: 0, duplicates: [] };
  }

  // 删除重复记录（保留最早创建的）
  let deletedCount = 0;
  const deleteStmt = database.prepare(`
    DELETE FROM log_files
    WHERE serverId = ? AND path = ? AND id NOT IN (
      SELECT id FROM log_files
      WHERE serverId = ? AND path = ?
      ORDER BY createdAt ASC
      LIMIT 1
    )
  `);

  const cleanup = database.transaction(() => {
    for (const dup of duplicates) {
      const result = deleteStmt.run(dup.serverId, dup.path, dup.serverId, dup.path);
      deletedCount += result.changes;
    }
  });

  cleanup();

  return { deletedCount, duplicates };
}
