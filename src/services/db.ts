/**
 * Offline Local Storage & IndexedDB / Firebase Sync Service
 * Fiber Source Diagnostic Pro
 */

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
  PENDING_TEST: 'fsdp_pending_test_v1'
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  userRole: 'Engineer',
  powerUnit: 'W',
  tempUnit: '°C',
  autoBackupEnabled: true,
  companyName: 'Laser Automation Services',
  engineerName: 'Rajesh Patel (Lead Service Eng.)',
  comPort: 'COM3 (ESP32 USB Serial)',
  baudRate: 115200,
  toleranceDefaultPercent: 2.0,
  demoMode: true,
  storageMode: 'firebase'
};

const DEFAULT_CALIBRATION: CalibrationData = {
  id: 'calib-001',
  deviceId: 'ESP32-FSDP-09412',
  calibrationDate: new Date().toISOString(),
  engineerName: 'Lead Service Engineer',
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

class LocalDBService {
  constructor() {
    this.initDefaultData();
  }

  public get<T = any>(key: string): T | null {
    try {
      const data = localStorage.getItem(`fsdp_${key}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to get from localDB:', e);
    }
    return null;
  }

  public save<T = any>(key: string, value: T): void {
    try {
      localStorage.setItem(`fsdp_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localDB:', e);
    }
  }

  private initDefaultData(): void {
    if (!localStorage.getItem(STORAGE_KEYS.MODELS)) {
      this.saveModels(DEFAULT_FIBER_MODELS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CALIBRATION)) {
      this.saveCalibration(DEFAULT_CALIBRATION);
    }
  }

  // --- MODELS ---
  public getModels(): FiberModel[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MODELS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load models:', e);
    }
    return DEFAULT_FIBER_MODELS;
  }

  public getModelById(id: string): FiberModel | undefined {
    const models = this.getModels();
    return models.find((m) => m.id === id);
  }

  public saveModels(models: FiberModel[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));
      const user = auth.currentUser;
      const settings = this.getSettings();
      if (user && settings.storageMode !== 'local') {
        saveUserDataToCloud(user.uid, 'models', models).catch((err) => console.warn('Cloud sync error for models:', err));
      }
    } catch (e) {
      console.error('Failed to save models:', e);
    }
  }

  public saveModel(model: FiberModel): void {
    const models = this.getModels();
    const idx = models.findIndex((m) => m.id === model.id);
    const updatedModel = {
      ...model,
      modifiedDate: new Date().toISOString()
    };
    if (idx >= 0) {
      models[idx] = updatedModel;
    } else {
      models.push({
        ...updatedModel,
        createdDate: new Date().toISOString()
      });
    }
    this.saveModels(models);
  }

  public deleteModel(id: string): void {
    const models = this.getModels().filter((m) => m.id !== id);
    this.saveModels(models);
  }

  // --- REPORTS & TEST HISTORY ---
  public getReports(): DiagnosisReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load reports:', e);
    }
    return [];
  }

  public saveReport(report: DiagnosisReport): void {
    const reports = this.getReports();
    const idx = reports.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      reports[idx] = report;
    } else {
      reports.unshift(report);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
      this.log('INFO', 'Report Saved', `Saved diagnostic report ${report.id}`);

      const user = auth.currentUser;
      const currentSettings = this.getSettings();
      if (currentSettings.storageMode !== 'local') {
        if (user) {
          saveUserDataToCloud(user.uid, 'reports', reports).catch((err) => console.warn('Cloud sync error for reports:', err));
        }
        saveTestLogToCloud({
          timestamp: report.timestamp,
          cableId: report.machineId || report.serialNumber || 'Fiber-Source-Cable',
          fiberIndex: 1,
          lossDb: report.healthScore,
          status: report.overallStatus,
          operator: report.engineerName,
          notes: JSON.stringify({
            brand: report.brand,
            modelName: report.modelName,
            primaryFaultLocation: report.primaryFaultLocation,
            evidenceSummary: report.evidenceSummary
          })
        }).catch((err) => console.warn('Cloud sync error for test log:', err));
      }
    } catch (e) {
      console.error('Failed to save report:', e);
    }
  }

  public deleteReport(id: string): void {
    const reports = this.getReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    const user = auth.currentUser;
    const settings = this.getSettings();
    if (user && settings.storageMode !== 'local') {
      saveUserDataToCloud(user.uid, 'reports', reports).catch((err) => console.warn('Cloud sync error for reports:', err));
    }
  }

  // --- PENDING TEST (AUTO-SAVE & RECOVERY) ---
  public getPendingTests(): PendingTestSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_TEST);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      }
    } catch (e) {
      console.error('Failed to load pending tests list:', e);
    }
    return [];
  }

  public getPendingTest(id?: string): PendingTestSession | null {
    const list = this.getPendingTests();
    if (list.length === 0) return null;
    if (id) {
      return list.find(s => s.id === id) || null;
    }
    return list[0];
  }

  public savePendingTest(session: PendingTestSession): void {
    try {
      const list = this.getPendingTests();
      const idx = list.findIndex(s => s.id === session.id || s.serialNumber === session.serialNumber);
      if (idx >= 0) {
        list[idx] = session;
      } else {
        list.unshift(session);
      }
      localStorage.setItem(STORAGE_KEYS.PENDING_TEST, JSON.stringify(list));
      const user = auth.currentUser;
      const settings = this.getSettings();
      if (user && settings.storageMode !== 'local') {
        saveUserDataToCloud(user.uid, 'pendingTests', list).catch((err) => console.warn('Cloud sync error for pending tests:', err));
      }
    } catch (e) {
      console.error('Failed to save pending test:', e);
    }
  }

  public deletePendingTest(id: string): void {
    try {
      const list = this.getPendingTests().filter(s => s.id !== id && s.serialNumber !== id);
      localStorage.setItem(STORAGE_KEYS.PENDING_TEST, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete pending test:', e);
    }
  }

  public clearPendingTest(id?: string): void {
    try {
      if (id) {
        this.deletePendingTest(id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.PENDING_TEST);
      }
    } catch (e) {
      console.error('Failed to clear pending test:', e);
    }
  }

  // --- SETTINGS ---
  public getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      const user = auth.currentUser;
      if (user && settings.storageMode !== 'local') {
        saveUserDataToCloud(user.uid, 'settings', settings).catch((err) => console.warn('Cloud sync error for settings:', err));
        saveSettingsToCloud(settings).catch((err) => console.warn('Cloud sync error for settings:', err));
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // --- CALIBRATION ---
  public getCalibration(): CalibrationData {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load calibration:', e);
    }
    return DEFAULT_CALIBRATION;
  }

  public saveCalibration(calibration: CalibrationData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibration));
      const user = auth.currentUser;
      const settings = this.getSettings();
      if (user && settings.storageMode !== 'local') {
        saveUserDataToCloud(user.uid, 'calibration', calibration).catch((err) => console.warn('Cloud sync error for calibration:', err));
      }
    } catch (e) {
      console.error('Failed to save calibration:', e);
    }
  }

  // --- LOGS ---
  private memoryLogs: SystemLog[] | null = null;
  private logSaveTimer: any = null;

  public getLogs(): SystemLog[] {
    if (this.memoryLogs) {
      return [...this.memoryLogs];
    }
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data) {
        this.memoryLogs = JSON.parse(data);
        return [...(this.memoryLogs || [])];
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
    this.memoryLogs = [];
    return [];
  }

  public log(level: 'INFO' | 'WARN' | 'ERROR' | 'COMMAND', category: string, message: string, details?: string): void {
    if (!this.memoryLogs) {
      this.getLogs();
    }
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };
    if (this.memoryLogs) {
      this.memoryLogs.unshift(newLog);
      if (this.memoryLogs.length > 300) {
        this.memoryLogs.pop();
      }
    }

    if (!this.logSaveTimer) {
      this.logSaveTimer = setTimeout(() => {
        try {
          if (this.memoryLogs) {
            localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.memoryLogs));
          }
        } catch (e) {
          console.error('Failed to persist logs:', e);
        } finally {
          this.logSaveTimer = null;
        }
      }, 1000);
    }
  }

  public clearLogs(): void {
    this.memoryLogs = [];
    if (this.logSaveTimer) {
      clearTimeout(this.logSaveTimer);
      this.logSaveTimer = null;
    }
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  }

  // --- CLOUD SYNC ENGINE WITH CONFLIC RESOLUTION ---
  public async syncWithCloud(): Promise<SyncResult> {
    const settings = this.getSettings();
    if (settings.storageMode === 'local') {
      return {
        success: true,
        status: 'local_mode',
        message: 'Local PC Storage active. Cloud sync skipped.'
      };
    }

    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        status: 'auth_required',
        message: 'Please log in to Firebase account to sync data.'
      };
    }

    try {
      const cloudData = await fetchAllUserDataFromCloud(user.uid);
      let updatedCount = 0;

      // 1. Models Sync
      if (Array.isArray(cloudData.models) && cloudData.models.length > 0) {
        const localModels = this.getModels();
        const mergedModelsMap = new Map<string, FiberModel>();
        localModels.forEach(m => mergedModelsMap.set(m.id, m));

        cloudData.models.forEach((cloudM: FiberModel) => {
          const localM = mergedModelsMap.get(cloudM.id);
          if (!localM) {
            mergedModelsMap.set(cloudM.id, cloudM);
            updatedCount++;
          } else {
            const cloudDate = new Date(cloudM.modifiedDate || cloudM.createdDate || 0).getTime();
            const localDate = new Date(localM.modifiedDate || localM.createdDate || 0).getTime();
            if (cloudDate > localDate) {
              mergedModelsMap.set(cloudM.id, cloudM);
              updatedCount++;
            }
          }
        });

        const mergedModels = Array.from(mergedModelsMap.values());
        localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(mergedModels));
        saveUserDataToCloud(user.uid, 'models', mergedModels).catch(() => {});
      } else {
        const localModels = this.getModels();
        if (localModels.length > 0) {
          saveUserDataToCloud(user.uid, 'models', localModels).catch(() => {});
        }
      }

      // 2. Reports Sync
      if (Array.isArray(cloudData.reports) && cloudData.reports.length > 0) {
        const localReports = this.getReports();
        const mergedReportsMap = new Map<string, DiagnosisReport>();
        localReports.forEach(r => mergedReportsMap.set(r.id, r));

        cloudData.reports.forEach((cloudR: DiagnosisReport) => {
          const localR = mergedReportsMap.get(cloudR.id);
          if (!localR) {
            mergedReportsMap.set(cloudR.id, cloudR);
            updatedCount++;
          }
        });

        const mergedReports = Array.from(mergedReportsMap.values());
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(mergedReports));
        saveUserDataToCloud(user.uid, 'reports', mergedReports).catch(() => {});
      } else {
        const localReports = this.getReports();
        if (localReports.length > 0) {
          saveUserDataToCloud(user.uid, 'reports', localReports).catch(() => {});
        }
      }

      // 3. Settings Sync
      if (cloudData.settings && typeof cloudData.settings === 'object') {
        const mergedSettings = { ...this.getSettings(), ...cloudData.settings };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
      } else {
        saveUserDataToCloud(user.uid, 'settings', settings).catch(() => {});
      }

      // 4. Calibration Sync
      if (cloudData.calibration && typeof cloudData.calibration === 'object') {
        const mergedCalibration = { ...this.getCalibration(), ...cloudData.calibration };
        localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(mergedCalibration));
      } else {
        saveUserDataToCloud(user.uid, 'calibration', this.getCalibration()).catch(() => {});
      }

      this.log('INFO', 'Cloud Sync', `Firebase cloud sync completed successfully. Updated ${updatedCount} records.`);

      return {
        success: true,
        status: 'synced',
        message: 'Firebase Cloud sync complete!',
        updatedCount
      };
    } catch (e: any) {
      console.error('Firebase cloud sync error:', e);
      return {
        success: false,
        status: 'offline',
        message: `Firebase Offline / Connection Failed: ${e.message || 'Network error'}`
      };
    }
  }

  // --- VERSIONED BACKUP EXPORT & IMPORT ---
  public exportFullDatabaseJSON(): string {
    const exportData = {
      format: 'FSDP_DATA_EXPORT',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      applicationVersion: '3.2.0',
      data: {
        models: this.getModels(),
        reports: this.getReports(),
        settings: this.getSettings(),
        calibration: this.getCalibration(),
        pendingTests: this.getPendingTests(),
        logs: this.getLogs()
      }
    };
    return JSON.stringify(exportData, null, 2);
  }

  public importFullDatabaseJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      if (!jsonStr || typeof jsonStr !== 'string') {
        return { success: false, message: 'Invalid file format: empty or non-string input.' };
      }

      const parsed = JSON.parse(jsonStr);

      // Handle both v1.0 schema format and legacy raw JSON format
      let modelsData = null;
      let reportsData = null;
      let settingsData = null;
      let calibrationData = null;
      let pendingData = null;

      if (parsed && parsed.format === 'FSDP_DATA_EXPORT' && parsed.data) {
        modelsData = parsed.data.models;
        reportsData = parsed.data.reports;
        settingsData = parsed.data.settings;
        calibrationData = parsed.data.calibration;
        pendingData = parsed.data.pendingTests;
      } else if (parsed && typeof parsed === 'object') {
        modelsData = parsed.models;
        reportsData = parsed.reports;
        settingsData = parsed.settings;
        calibrationData = parsed.calibration;
        pendingData = parsed.pendingTests;
      } else {
        return { success: false, message: 'Invalid / Corrupted Backup File: Unrecognized format.' };
      }

      // Validate models structure if present
      if (modelsData) {
        if (!Array.isArray(modelsData)) {
          return { success: false, message: 'Corrupted Backup: "models" field must be an array.' };
        }
        for (const m of modelsData) {
          if (!m.id || !m.name || !Array.isArray(m.cycles)) {
            return { success: false, message: 'Corrupted Backup: Invalid FiberModel structure detected.' };
          }
        }
        this.saveModels(modelsData);
      }

      if (reportsData && Array.isArray(reportsData)) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reportsData));
      }

      if (settingsData && typeof settingsData === 'object') {
        this.saveSettings(settingsData);
      }

      if (calibrationData && typeof calibrationData === 'object') {
        this.saveCalibration(calibrationData);
      }

      if (pendingData && Array.isArray(pendingData)) {
        localStorage.setItem(STORAGE_KEYS.PENDING_TEST, JSON.stringify(pendingData));
      }

      this.log('INFO', 'Database Import', 'Full database successfully restored from verified backup file.');

      // Trigger cloud sync if in Firebase mode
      const currentSettings = this.getSettings();
      if (currentSettings.storageMode !== 'local' && auth.currentUser) {
        this.syncWithCloud().catch(() => {});
      }

      return { success: true, message: 'Backup imported successfully! All records restored.' };
    } catch (e: any) {
      console.error('Failed to import database:', e);
      return { success: false, message: `Import Failed: ${e.message || 'Corrupted JSON file'}` };
    }
  }

  public resetToFactoryDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.MODELS);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CALIBRATION);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.PENDING_TEST);
    this.initDefaultData();
  }
}

export const localDB = new LocalDBService();
