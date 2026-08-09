/**
 * Offline Local Storage & IndexedDB Service
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
import { saveTestLogToCloud, saveSettingsToCloud } from './firebase';

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
  demoMode: true
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

class LocalDBService {
  constructor() {
    this.initDefaultData();
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
    } catch (e) {
      console.error('Failed to save models:', e);
    }
  }

  public saveModel(model: FiberModel): void {
    const models = this.getModels();
    const idx = models.findIndex((m) => m.id === model.id);
    if (idx >= 0) {
      models[idx] = { ...model, modifiedDate: new Date().toISOString() };
    } else {
      models.push({
        ...model,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString()
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

      // Sync test report to Firebase Cloud Firestore
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
      }).catch((err) => console.warn('Cloud sync error for report:', err));
    } catch (e) {
      console.error('Failed to save report:', e);
    }
  }

  public deleteReport(id: string): void {
    const reports = this.getReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  }

  // --- PENDING TEST (AUTO-SAVE & RECOVERY) ---
  public getPendingTest(): PendingTestSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_TEST);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load pending test:', e);
    }
    return null;
  }

  public savePendingTest(session: PendingTestSession): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_TEST, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save pending test:', e);
    }
  }

  public clearPendingTest(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_TEST);
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
      saveSettingsToCloud(settings).catch((err) => console.warn('Cloud sync error for settings:', err));
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
    } catch (e) {
      console.error('Failed to save calibration:', e);
    }
  }

  // --- LOGS ---
  public getLogs(): SystemLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
    return [];
  }

  public log(level: 'INFO' | 'WARN' | 'ERROR' | 'COMMAND', category: string, message: string, details?: string): void {
    const logs = this.getLogs();
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };
    logs.unshift(newLog);
    // keep max 500 logs
    if (logs.length > 500) logs.pop();
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save log:', e);
    }
  }

  public clearLogs(): void {
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  }

  // --- BACKUP & RESTORE ---
  public exportFullDatabaseJSON(): string {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      models: this.getModels(),
      reports: this.getReports(),
      settings: this.getSettings(),
      calibration: this.getCalibration(),
      logs: this.getLogs()
    };
    return JSON.stringify(exportData, null, 2);
  }

  public importFullDatabaseJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.models && Array.isArray(data.models)) {
        this.saveModels(data.models);
      }
      if (data.reports && Array.isArray(data.reports)) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(data.reports));
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      if (data.calibration) {
        this.saveCalibration(data.calibration);
      }
      this.log('INFO', 'Database Import', 'Full database successfully imported from backup file.');
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  }

  public resetToFactoryDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.MODELS);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CALIBRATION);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    this.initDefaultData();
  }
}

export const localDB = new LocalDBService();
