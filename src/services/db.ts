/**
 * Single SQLite File Database Engine & Firebase Cloud Sync Service
 * MAYUR FIBER DIAGNOSIS
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
// @ts-ignore
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  FiberModel,
  DiagnosisReport,
  CalibrationData,
  AppSettings,
  SystemLog,
  PendingTestSession
} from '../types';
import { DEFAULT_FIBER_MODELS } from '../data/defaultModels';
import { 
  saveTestLogToCloud, 
  saveSettingsToCloud, 
  auth, 
  saveUserDataToCloud, 
  fetchAllUserDataFromCloud 
} from './firebase';

const STORAGE_KEYS = {
  MODELS: 'fsdp_models_v1',
  REPORTS: 'fsdp_reports_v1',
  SETTINGS: 'fsdp_settings_v1',
  CALIBRATION: 'fsdp_calibration_v1',
  LOGS: 'fsdp_logs_v1',
  PENDING_TEST: 'fsdp_pending_test_v1',
  SQLITE_BINARY: 'fsdp_sqlite_db_binary',
  MIGRATED: 'fsdp_migrated_to_sqlite'
};

const DEFAULT_DB_PATH = 'FiberSourceDiagnosticPro/Data/FSDP_Database.db';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  userRole: 'Engineer',
  powerUnit: 'W',
  tempUnit: '°C',
  autoBackupEnabled: true,
  companyName: 'Mayur Laser Diagnostic Services',
  engineerName: 'Mayur Raval (Lead Engineer)',
  comPort: 'COM3 (ESP32 USB Serial)',
  baudRate: 115200,
  toleranceDefaultPercent: 2.0,
  demoMode: true,
  storageMode: 'local', // Default MUST be Local PC Database (SQLite)
  dbPath: DEFAULT_DB_PATH
};

const DEFAULT_CALIBRATION: CalibrationData = {
  id: 'calib-001',
  deviceId: 'ESP32-FSDP-09412',
  calibrationDate: new Date().toISOString(),
  engineerName: 'Mayur Raval',
  powerOffsetW: 0.0,
  powerGainFactor: 1.0,
  tempOffsetC: 0.0,
  freqGainFactor: 1.0,
  verified: true
};

export interface SyncResult {
  success: boolean;
  status: 'synced' | 'local_mode' | 'auth_required' | 'offline' | 'error';
  message: string;
  updatedCount?: number;
}

// Helper to safely get Node.js 'fs' and 'path' modules if in Electron
function getNodeFs(): any {
  if (typeof window !== 'undefined' && (window as any).require) {
    try {
      return (window as any).require('fs');
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getNodePath(): any {
  if (typeof window !== 'undefined' && (window as any).require) {
    try {
      return (window as any).require('path');
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getNodeElectron(): any {
  if (typeof window !== 'undefined' && (window as any).require) {
    try {
      return (window as any).require('electron');
    } catch (e) {
      return null;
    }
  }
  return null;
}

class LocalDBService {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private isInitialized: boolean = false;
  private currentDbPath: string = DEFAULT_DB_PATH;
  private isMissingDbFile: boolean = false;
  private initError: string | null = null;
  private memoryLogs: SystemLog[] = [];

  constructor() {
    // Asynchronously initialize SQLite engine
    this.initSQLite().catch((err) => {
      console.error('SQLite initialization failed:', err);
      this.initError = err.message || String(err);
    });
  }

  public getInitError(): string | null {
    return this.initError;
  }

  public async initSQLite(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load sql.js WASM locally or via reliable CDN fallbacks
      try {
        this.SQL = await initSqlJs({
          locateFile: (file) => {
            if (file.endsWith('.wasm') && sqlWasmUrl) {
              return sqlWasmUrl;
            }
            return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`;
          }
        });
      } catch (wasmErr) {
        console.warn('Local WASM URL init failed, trying cdnjs CDN fallback:', wasmErr);
        try {
          this.SQL = await initSqlJs({
            locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
          });
        } catch (cdnErr) {
          console.warn('cdnjs CDN WASM init failed, trying jsdelivr CDN fallback:', cdnErr);
          try {
            this.SQL = await initSqlJs({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/${file}`
            });
          } catch (e: any) {
            this.initError = 'All SQLite WebAssembly initialization attempts failed. Please ensure WASM support is enabled.';
            console.error('All SQLite WASM initialization attempts failed.', e);
          }
        }
      }

      // Load existing setting to get dbPath
      const savedSettings = this.readSettingsFromFallback();
      if (savedSettings?.dbPath) {
        this.currentDbPath = savedSettings.dbPath;
      }

      // Check if file exists on disk (if in Electron environment)
      const fs = getNodeFs();
      const pathModule = getNodePath();

      let loadedBinary: Uint8Array | null = null;

      if (fs && pathModule) {
        const fullPath = pathModule.isAbsolute(this.currentDbPath) 
          ? this.currentDbPath 
          : pathModule.join(process.cwd(), this.currentDbPath);

        if (fs.existsSync(fullPath)) {
          const buffer = fs.readFileSync(fullPath);
          loadedBinary = new Uint8Array(buffer);
          this.isMissingDbFile = false;
        } else if (savedSettings?.dbPath && savedSettings.dbPath !== DEFAULT_DB_PATH) {
          // Custom path configured but missing on disk!
          this.isMissingDbFile = true;
          console.warn(`[SQLite] Configured database file NOT found at path: ${fullPath}`);
        }
      } else {
        // Web Browser Fallback: read binary from localStorage / IndexedDB
        const base64Str = localStorage.getItem(STORAGE_KEYS.SQLITE_BINARY);
        if (base64Str) {
          try {
            const binaryString = atob(base64Str);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            loadedBinary = bytes;
          } catch (e) {
            console.error('Failed to parse web sqlite binary from localStorage:', e);
          }
        }
      }

      if (loadedBinary && this.SQL) {
        this.db = new this.SQL.Database(loadedBinary);
      } else if (this.SQL && !this.isMissingDbFile) {
        // Create fresh SQLite database instance
        this.db = new this.SQL.Database();
      }

      if (this.db) {
        this.createTablesSchema();
        this.migrateFromLocalStorageIfNeeded();
        this.seedDefaultsIfEmpty();
        this.persistDatabaseToDisk();
      } else if (!this.SQL) {
        this.initError = 'SQLite engine (sql.js) failed to load.';
      }

      this.isInitialized = true;
    } catch (err: any) {
      console.error('Error during SQLite initialization:', err);
      this.initError = err.message || String(err);
      this.isInitialized = true;
    }
  }

  private createTablesSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Models (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS GoldenReferences (
        id TEXT PRIMARY KEY,
        model_id TEXT,
        data TEXT NOT NULL,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS LiveTestReadings (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        data TEXT NOT NULL,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS ReferenceReadings (
        id TEXT PRIMARY KEY,
        model_id TEXT,
        data TEXT NOT NULL,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS DiagnosticReports (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS Calibration (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS Settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS Logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        module TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT
      );

      CREATE TABLE IF NOT EXISTS PendingSessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER
      );
    `);
  }

  private migrateFromLocalStorageIfNeeded(): void {
    if (!this.db) return;
    if (localStorage.getItem(STORAGE_KEYS.MIGRATED) === 'true') return;

    try {
      console.log('📦 Starting 1-time Migration from localStorage to SQLite FSDP_Database.db...');

      // 1. Models
      const legacyModelsStr = localStorage.getItem(STORAGE_KEYS.MODELS);
      if (legacyModelsStr) {
        const models: FiberModel[] = JSON.parse(legacyModelsStr);
        for (const m of models) {
          this.db.run(
            'INSERT OR REPLACE INTO Models (id, data, updated_at) VALUES (?, ?, ?)',
            [m.id, JSON.stringify(m), Date.now()]
          );
        }
      }

      // 2. Reports
      const legacyReportsStr = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (legacyReportsStr) {
        const reports: DiagnosisReport[] = JSON.parse(legacyReportsStr);
        for (const r of reports) {
          this.db.run(
            'INSERT OR REPLACE INTO DiagnosticReports (id, data, created_at) VALUES (?, ?, ?)',
            [r.id, JSON.stringify(r), Date.now()]
          );
        }
      }

      // 3. Settings
      const legacySettingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (legacySettingsStr) {
        const settings: AppSettings = JSON.parse(legacySettingsStr);
        settings.storageMode = 'local';
        settings.dbPath = settings.dbPath || DEFAULT_DB_PATH;
        this.db.run(
          'INSERT OR REPLACE INTO Settings (id, data, updated_at) VALUES (?, ?, ?)',
          ['app_settings', JSON.stringify(settings), Date.now()]
        );
      }

      // 4. Calibration
      const legacyCalibStr = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
      if (legacyCalibStr) {
        const calib: CalibrationData = JSON.parse(legacyCalibStr);
        this.db.run(
          'INSERT OR REPLACE INTO Calibration (id, data, updated_at) VALUES (?, ?, ?)',
          [calib.id || 'calib-001', JSON.stringify(calib), Date.now()]
        );
      }

      // Mark migration completed
      localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true');
      console.log('✅ SQLite Migration Completed Successfully.');
    } catch (err) {
      console.error('Error migrating localStorage to SQLite:', err);
    }
  }

  private seedDefaultsIfEmpty(): void {
    if (!this.db) return;

    // Seed default models if table empty
    const modelRes = this.db.exec('SELECT COUNT(*) FROM Models');
    if (modelRes.length === 0 || modelRes[0].values[0][0] === 0) {
      for (const m of DEFAULT_FIBER_MODELS) {
        this.db.run(
          'INSERT OR REPLACE INTO Models (id, data, updated_at) VALUES (?, ?, ?)',
          [m.id, JSON.stringify(m), Date.now()]
        );
      }
    }

    // Seed default settings if empty
    const settingsRes = this.db.exec('SELECT COUNT(*) FROM Settings');
    if (settingsRes.length === 0 || settingsRes[0].values[0][0] === 0) {
      this.db.run(
        'INSERT OR REPLACE INTO Settings (id, data, updated_at) VALUES (?, ?, ?)',
        ['app_settings', JSON.stringify(DEFAULT_SETTINGS), Date.now()]
      );
    }

    // Seed default calibration if empty
    const calibRes = this.db.exec('SELECT COUNT(*) FROM Calibration');
    if (calibRes.length === 0 || calibRes[0].values[0][0] === 0) {
      this.db.run(
        'INSERT OR REPLACE INTO Calibration (id, data, updated_at) VALUES (?, ?, ?)',
        [DEFAULT_CALIBRATION.id, JSON.stringify(DEFAULT_CALIBRATION), Date.now()]
      );
    }
  }

  public persistDatabaseToDisk(): void {
    if (!this.db) return;

    try {
      const data = this.db.export(); // Uint8Array
      const fs = getNodeFs();
      const pathModule = getNodePath();

      if (fs && pathModule) {
        const fullPath = pathModule.isAbsolute(this.currentDbPath)
          ? this.currentDbPath
          : pathModule.join(process.cwd(), this.currentDbPath);

        const dir = pathModule.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, Buffer.from(data));
      } else {
        // Web Browser Fallback: save chunked base64 in localStorage
        let binaryStr = '';
        const len = data.byteLength;
        for (let i = 0; i < len; i++) {
          binaryStr += String.fromCharCode(data[i]);
        }
        localStorage.setItem(STORAGE_KEYS.SQLITE_BINARY, btoa(binaryStr));
      }
    } catch (err) {
      console.error('Failed to persist SQLite database to disk:', err);
    }
  }

  // --- MODELS ---
  public getModels(): FiberModel[] {
    if (!this.db) {
      return this.getFallbackModels();
    }
    try {
      const res = this.db.exec('SELECT data FROM Models');
      if (res.length === 0) return DEFAULT_FIBER_MODELS;
      return res[0].values.map((v) => JSON.parse(v[0] as string));
    } catch (e) {
      console.error('Error fetching models from SQLite:', e);
      return DEFAULT_FIBER_MODELS;
    }
  }

  public saveModel(model: FiberModel): void {
    model.modifiedDate = new Date().toISOString();
    if (!this.db) {
      this.saveFallbackModel(model);
      return;
    }
    try {
      this.db.run(
        'INSERT OR REPLACE INTO Models (id, data, updated_at) VALUES (?, ?, ?)',
        [model.id, JSON.stringify(model), Date.now()]
      );
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error saving model to SQLite:', e);
    }
  }

  public saveModels(models: FiberModel[]): void {
    for (const m of models) {
      this.saveModel(m);
    }
  }

  public deleteModel(id: string): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM Models WHERE id = ?', [id]);
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error deleting model from SQLite:', e);
    }
  }

  // --- REPORTS ---
  public getReports(): DiagnosisReport[] {
    if (!this.db) {
      return this.getFallbackReports();
    }
    try {
      const res = this.db.exec('SELECT data FROM DiagnosticReports ORDER BY created_at DESC');
      if (res.length === 0) return [];
      return res[0].values.map((v) => JSON.parse(v[0] as string));
    } catch (e) {
      console.error('Error fetching reports from SQLite:', e);
      return this.getFallbackReports();
    }
  }

  public saveReport(report: DiagnosisReport): void {
    if (!this.db) {
      this.saveFallbackReport(report);
      return;
    }
    try {
      this.db.run(
        'INSERT OR REPLACE INTO DiagnosticReports (id, data, created_at) VALUES (?, ?, ?)',
        [report.id, JSON.stringify(report), Date.now()]
      );
      this.persistDatabaseToDisk();

      if (this.getSettings().storageMode === 'firebase') {
        saveTestLogToCloud(report).catch(() => {});
      }
    } catch (e) {
      console.error('Error saving report to SQLite:', e);
      this.saveFallbackReport(report);
    }
  }

  public deleteReport(id: string): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM DiagnosticReports WHERE id = ?', [id]);
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error deleting report from SQLite:', e);
    }
  }

  // --- PENDING SESSIONS ---
  public getPendingTests(): PendingTestSession[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec('SELECT data FROM PendingSessions');
      if (res.length === 0) return [];
      return res[0].values.map((v) => JSON.parse(v[0] as string));
    } catch (e) {
      return [];
    }
  }

  public getPendingTest(id?: string): PendingTestSession | null {
    const list = this.getPendingTests();
    if (list.length === 0) return null;
    if (id) {
      return list.find((s) => s.id === id) || null;
    }
    return list[0];
  }

  public savePendingTest(session: PendingTestSession): void {
    if (!this.db) return;
    try {
      this.db.run(
        'INSERT OR REPLACE INTO PendingSessions (id, data, updated_at) VALUES (?, ?, ?)',
        [session.id, JSON.stringify(session), Date.now()]
      );
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error saving pending session to SQLite:', e);
    }
  }

  public deletePendingTest(id: string): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM PendingSessions WHERE id = ?', [id]);
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error deleting pending session from SQLite:', e);
    }
  }

  public clearPendingTest(): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM PendingSessions');
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error clearing pending sessions from SQLite:', e);
    }
  }

  // --- SETTINGS ---
  public getSettings(): AppSettings {
    if (!this.db) {
      return this.readSettingsFromFallback() || DEFAULT_SETTINGS;
    }
    try {
      const res = this.db.exec('SELECT data FROM Settings WHERE id = "app_settings"');
      if (res.length > 0 && res[0].values.length > 0) {
        const loaded = JSON.parse(res[0].values[0][0] as string) as AppSettings;
        return {
          ...DEFAULT_SETTINGS,
          ...loaded,
          dbPath: loaded.dbPath || this.currentDbPath,
          storageMode: loaded.storageMode || 'local'
        };
      }
    } catch (e) {
      console.error('Error fetching settings from SQLite:', e);
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: AppSettings): void {
    if (settings.dbPath) {
      this.currentDbPath = settings.dbPath;
    }
    if (!this.db) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return;
    }
    try {
      this.db.run(
        'INSERT OR REPLACE INTO Settings (id, data, updated_at) VALUES (?, ?, ?)',
        ['app_settings', JSON.stringify(settings), Date.now()]
      );
      this.persistDatabaseToDisk();

      if (settings.storageMode === 'firebase') {
        saveSettingsToCloud(settings).catch(() => {});
      }
    } catch (e) {
      console.error('Error saving settings to SQLite:', e);
    }
  }

  // --- CALIBRATION ---
  public getCalibration(): CalibrationData {
    if (!this.db) return DEFAULT_CALIBRATION;
    try {
      const res = this.db.exec('SELECT data FROM Calibration LIMIT 1');
      if (res.length > 0 && res[0].values.length > 0) {
        return JSON.parse(res[0].values[0][0] as string);
      }
    } catch (e) {
      console.error('Error fetching calibration from SQLite:', e);
    }
    return DEFAULT_CALIBRATION;
  }

  public saveCalibration(cal: CalibrationData): void {
    if (!this.db) return;
    try {
      this.db.run(
        'INSERT OR REPLACE INTO Calibration (id, data, updated_at) VALUES (?, ?, ?)',
        [cal.id || 'calib-001', JSON.stringify(cal), Date.now()]
      );
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error saving calibration to SQLite:', e);
    }
  }

  // --- LOGS ---
  public getLogs(): SystemLog[] {
    if (!this.db) return this.memoryLogs;
    try {
      const res = this.db.exec('SELECT id, timestamp, level, module, message, details FROM Logs ORDER BY id DESC LIMIT 500');
      if (res.length === 0) return this.memoryLogs;
      return res[0].values.map((v) => ({
        id: String(v[0]),
        timestamp: String(v[1]),
        level: v[2] as any,
        category: String(v[3]),
        message: String(v[4]),
        details: v[5] ? String(v[5]) : undefined
      }));
    } catch (e) {
      return this.memoryLogs;
    }
  }

  public log(level: SystemLog['level'], moduleName: string, message: string, details?: any): void {
    const entry: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      category: moduleName,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : undefined
    };

    this.memoryLogs.unshift(entry);
    if (this.memoryLogs.length > 500) this.memoryLogs.pop();

    if (this.db) {
      try {
        this.db.run(
          'INSERT INTO Logs (timestamp, level, module, message, details) VALUES (?, ?, ?, ?, ?)',
          [entry.timestamp, entry.level, entry.category, entry.message, entry.details || '']
        );
        this.persistDatabaseToDisk();
      } catch (e) {
        // Silent catch for rapid log writes
      }
    }
  }

  public clearLogs(): void {
    this.memoryLogs = [];
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM Logs');
      this.persistDatabaseToDisk();
    } catch (e) {
      console.error('Error clearing logs in SQLite:', e);
    }
  }

  // --- DATABASE FILE MANAGEMENT & DIALOGS ---

  public getDatabasePath(): string {
    return this.currentDbPath;
  }

  public isMissingDatabaseFile(): boolean {
    return this.isMissingDbFile;
  }

  public async selectDatabaseFolderNative(): Promise<{
    canceled: boolean;
    folderPath?: string;
    dbPath?: string;
    exists?: boolean;
    error?: string;
  }> {
    if (typeof window !== 'undefined' && (window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
          return await ipcRenderer.invoke('select-database-folder');
        }
      } catch (e) {
        console.warn('Electron IPC select-database-folder failed:', e);
      }
    }

    // Web Browser Fallback (if running outside Electron)
    const currentPath = this.getDatabasePath();
    const userFolder = prompt('Enter or paste folder path for FSDP_Database.db:', currentPath.replace(/[/\\]?FSDP_Database\.db$/, ''));
    if (!userFolder || !userFolder.trim()) {
      return { canceled: true };
    }
    const cleanFolder = userFolder.trim().replace(/[/\\]+$/, '');
    const dbPath = `${cleanFolder}/FSDP_Database.db`;

    const fs = getNodeFs();
    let exists = false;
    if (fs) {
      exists = fs.existsSync(dbPath);
    }

    return {
      canceled: false,
      folderPath: cleanFolder,
      dbPath: dbPath,
      exists: exists
    };
  }

  public createNewDatabaseAtPath(newPath: string): void {
    if (!this.SQL) return;
    this.currentDbPath = newPath;
    this.db = new this.SQL.Database();
    this.createTablesSchema();
    this.seedDefaultsIfEmpty();
    this.persistDatabaseToDisk();
    this.isMissingDbFile = false;

    const currentSettings = this.getSettings();
    this.saveSettings({ ...currentSettings, dbPath: newPath });
  }

  public locateDatabaseFile(existingPath: string): boolean {
    const fs = getNodeFs();
    if (fs) {
      if (!fs.existsSync(existingPath)) {
        return false;
      }
      try {
        const buffer = fs.readFileSync(existingPath);
        if (this.SQL) {
          this.db = new this.SQL.Database(new Uint8Array(buffer));
        }
      } catch (e) {
        console.error('Failed to read existing SQLite database from disk:', e);
        return false;
      }
    }

    this.currentDbPath = existingPath;
    this.isMissingDbFile = false;

    if (this.db) {
      this.createTablesSchema();
      this.seedDefaultsIfEmpty();
    }

    const currentSettings = this.getSettings();
    this.saveSettings({ ...currentSettings, dbPath: existingPath });
    return true;
  }

  public async openDatabaseFolder(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
          return await ipcRenderer.invoke('open-database-folder', this.getDatabasePath());
        }
      } catch (e) {
        console.warn('Electron IPC open-database-folder failed:', e);
      }
    }

    const electron = getNodeElectron();
    const pathModule = getNodePath();

    if (electron && electron.shell && pathModule) {
      const fullPath = pathModule.isAbsolute(this.currentDbPath)
        ? this.currentDbPath
        : pathModule.join(process.cwd(), this.currentDbPath);

      electron.shell.showItemInFolder(fullPath);
      return true;
    } else {
      // Browser fallback: trigger export download
      this.exportSQLiteDatabaseFile();
      return true;
    }
  }

  // --- FULL DATABASE EXPORT & IMPORT ---

  public exportSQLiteDatabase(): Uint8Array | null {
    if (!this.db) return null;
    return this.db.export();
  }

  public exportSQLiteDatabaseFile(): void {
    const binary = this.exportSQLiteDatabase();
    if (!binary) {
      alert('SQLite database is not initialized.');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `FSDP_Database_${dateStr}.fsdbackup`;

    const blob = new Blob([binary], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public importSQLiteDatabase(binaryData: Uint8Array): { success: boolean; message: string } {
    if (!this.SQL) {
      return { success: false, message: 'SQLite engine not initialized.' };
    }

    try {
      // 1. Create automatic safety backup of current database first
      this.createAutomaticSafetyBackup();

      // 2. Load new database
      const newDb = new this.SQL.Database(binaryData);

      // Verify essential tables exist
      const checkTables = newDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='Models'");
      if (checkTables.length === 0) {
        return { success: false, message: 'Invalid database backup file. Missing Models table.' };
      }

      this.db = newDb;
      this.persistDatabaseToDisk();

      return { success: true, message: 'SQLite database restored successfully!' };
    } catch (err: any) {
      return { success: false, message: `Import failed: ${err.message || err}` };
    }
  }

  private createAutomaticSafetyBackup(): void {
    if (!this.db) return;
    try {
      const binary = this.db.export();
      const fs = getNodeFs();
      const pathModule = getNodePath();

      if (fs && pathModule) {
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = pathModule.join(process.cwd(), `FiberSourceDiagnosticPro/Data/SafetyBackup_${dateStr}.fsdbackup`);
        const dir = pathModule.dirname(backupPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(backupPath, Buffer.from(binary));
        console.log(`🛡️ Safety backup created at: ${backupPath}`);
      }
    } catch (e) {
      console.error('Failed to create safety backup:', e);
    }
  }

  // --- JSON EXPORT / IMPORT FOR COMPATIBILITY ---
  public exportFullDatabaseJSON(): string {
    const payload = {
      app: 'MAYUR FIBER DIAGNOSIS',
      exportDate: new Date().toISOString(),
      models: this.getModels(),
      reports: this.getReports(),
      settings: this.getSettings(),
      calibration: this.getCalibration(),
      logs: this.getLogs(),
      pendingSessions: this.getPendingTests()
    };
    return JSON.stringify(payload, null, 2);
  }

  public importFullDatabaseJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonStr);
      this.createAutomaticSafetyBackup();

      if (Array.isArray(data.models)) this.saveModels(data.models);
      if (Array.isArray(data.reports)) {
        for (const r of data.reports) this.saveReport(r);
      }
      if (data.settings) this.saveSettings(data.settings);
      if (data.calibration) this.saveCalibration(data.calibration);

      return { success: true, message: 'JSON database imported successfully into SQLite.' };
    } catch (err: any) {
      return { success: false, message: `JSON import failed: ${err.message || err}` };
    }
  }

  public resetToFactoryDefaults(): void {
    if (!this.db) return;
    try {
      this.db.run('DELETE FROM Models');
      this.db.run('DELETE FROM DiagnosticReports');
      this.db.run('DELETE FROM PendingSessions');
      this.db.run('DELETE FROM Calibration');
      this.db.run('DELETE FROM Settings');
      this.db.run('DELETE FROM Logs');
      this.seedDefaultsIfEmpty();
      this.persistDatabaseToDisk();
      localStorage.clear();
    } catch (e) {
      console.error('Error resetting factory defaults:', e);
    }
  }

  public async syncWithCloud(firebaseService?: any): Promise<SyncResult> {
    const settings = this.getSettings();
    if (settings.storageMode !== 'firebase') {
      return {
        success: true,
        status: 'local_mode',
        message: 'Storage Mode is set to Local PC Database (SQLite).'
      };
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      return {
        success: false,
        status: 'auth_required',
        message: 'Firebase authentication required for Cloud Sync. Please log in.'
      };
    }

    try {
      const cloudData = await fetchAllUserDataFromCloud(uid);
      if (cloudData) {
        const { models, reports, settings: cloudSettings, calibration } = cloudData;
        if (models && Array.isArray(models)) this.saveModels(models);
        if (reports && Array.isArray(reports)) {
          for (const r of reports) this.saveReport(r);
        }
        if (cloudSettings) this.saveSettings(cloudSettings);
        if (calibration) this.saveCalibration(calibration);

        return {
          success: true,
          status: 'synced',
          message: 'Synced with Firebase Cloud Storage.'
        };
      }
      return {
        success: false,
        status: 'error',
        message: 'Failed to fetch user data from Firebase Cloud.'
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'error',
        message: err.message || 'Cloud sync error'
      };
    }
  }

  // --- FALLBACK HELPERS ---
  private getFallbackModels(): FiberModel[] {
    const str = localStorage.getItem(STORAGE_KEYS.MODELS);
    if (str) {
      try { return JSON.parse(str); } catch (e) {}
    }
    return DEFAULT_FIBER_MODELS;
  }

  private saveFallbackModel(model: FiberModel): void {
    const list = this.getFallbackModels();
    const idx = list.findIndex(m => m.id === model.id);
    if (idx >= 0) list[idx] = model;
    else list.push(model);
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(list));
  }

  private getFallbackReports(): DiagnosisReport[] {
    const str = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (str) {
      try { return JSON.parse(str); } catch (e) {}
    }
    return [];
  }

  private saveFallbackReport(report: DiagnosisReport): void {
    const list = this.getFallbackReports();
    const idx = list.findIndex(r => r.id === report.id);
    if (idx >= 0) list[idx] = report;
    else list.unshift(report);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(list));
  }

  private readSettingsFromFallback(): AppSettings | null {
    const str = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (str) {
      try { return JSON.parse(str); } catch (e) {}
    }
    return null;
  }
}

export const localDB = new LocalDBService();
