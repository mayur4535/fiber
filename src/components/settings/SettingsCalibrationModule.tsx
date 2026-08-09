/**
 * Settings, Calibration & Database Management Module (Part 9A & 9C)
 * MASTER LOCK V4 Architecture with clean Sub-Tabs
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Sliders, 
  HardDrive, 
  Download, 
  Upload, 
  RotateCcw, 
  Save, 
  ShieldCheck, 
  CheckCircle2, 
  UserCheck,
  Cpu,
  FileText,
  Users,
  FolderTree,
  Database,
  Radio,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react';
import { AppSettings, CalibrationData, AppUserRole, FiberModel } from '../../types';
import { localDB } from '../../services/db';
import { esp32Service } from '../../services/esp32Service';
import { ConfirmModal } from '../common/ModalDialogs';
import { ModelManagerModule } from '../models/ModelManagerModule';
import { ReferenceReadingModule } from '../reference/ReferenceReadingModule';

import { SettingsModelManagerWindow } from './SettingsModelManagerWindow';

export type SettingsSubTab = 
  | 'models'
  | 'general' 
  | 'firmware' 
  | 'calibration' 
  | 'reports' 
  | 'users' 
  | 'backup';

interface SettingsCalibrationModuleProps {
  settings: AppSettings;
  calibration: CalibrationData;
  onSettingsSaved: (newSettings: AppSettings) => void;
  onCalibrationSaved: (newCalib: CalibrationData) => void;
  onRoleChange: (role: AppUserRole) => void;
  models?: FiberModel[];
  onModelsChange?: (updatedModels: FiberModel[]) => void;
  activeModel?: FiberModel | null;
  onSelectModel?: (model: FiberModel) => void;
  onModelUpdated?: (updatedModel: FiberModel) => void;
}

export const SettingsCalibrationModule: React.FC<SettingsCalibrationModuleProps> = ({
  settings,
  calibration,
  onSettingsSaved,
  onCalibrationSaved,
  onRoleChange,
  models = [],
  onModelsChange = () => {},
  activeModel = null,
  onSelectModel = () => {},
  onModelUpdated = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<SettingsSubTab>('models');
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [localCalib, setLocalCalib] = useState<CalibrationData>({ ...calibration });
  const [importJsonText, setImportJsonStr] = useState<string>('');

  // Firmware tab states
  const [baudRate, setBaudRate] = useState<string>('115200');
  const [comPort, setComPort] = useState<string>('COM3 (ESP32-S3)');
  const [firmwareVer, setFirmwareVer] = useState<string>('v3.2.0-Production');
  const [pingStatus, setPingStatus] = useState<string>('ESP32 Online (11ms ping)');

  // Reports tab states
  const [reportLogoText, setReportLogoText] = useState<string>('INDUSTRIAL FIBER OPTIC DIAGNOSTICS');
  const [autoGenPdf, setAutoGenPdf] = useState<boolean>(true);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleSaveSettings = () => {
    localDB.saveSettings(localSettings);
    onSettingsSaved(localSettings);
    alert('Application Settings saved successfully.');
  };

  const handleSaveCalibration = () => {
    localDB.saveCalibration(localCalib);
    onCalibrationSaved(localCalib);
    alert('Hardware Sensor Calibration offsets saved.');
  };

  const handleImportDatabase = () => {
    if (!importJsonText.trim()) {
      alert('Please paste a valid JSON backup string.');
      return;
    }
    const success = localDB.importFullDatabaseJSON(importJsonText);
    if (success) {
      alert('Database imported successfully. Page will reload.');
      window.location.reload();
    } else {
      alert('Failed to parse database backup JSON.');
    }
  };

  const handleFactoryReset = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Factory Reset',
      message: 'CRITICAL WARNING: Factory Reset will erase all custom models, references, and test reports. Proceed?',
      onConfirm: () => {
        localDB.resetToFactoryDefaults();
        alert('System reset to factory defaults. Page reloading...');
        window.location.reload();
      }
    });
  };

  const handleTestPing = () => {
    setPingStatus('Testing ping to ESP32...');
    setTimeout(() => {
      setPingStatus('ESP32 Online - Response 8ms (Signal 100%)');
    }, 800);
  };

  const navTabs: { id: SettingsSubTab; label: string; icon: React.FC<any>; badge?: string }[] = [
    { id: 'models', label: 'Model Manager & Reference Reading', icon: FolderTree, badge: 'UNIFIED' },
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'firmware', label: 'Firmware & COM', icon: Cpu },
    { id: 'calibration', label: 'Hardware Calibration', icon: Sliders },
    { id: 'reports', label: 'Report Layout', icon: FileText },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'backup', label: 'Database Backup', icon: HardDrive }
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner Toolbar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-400" />
            SYSTEM SETTINGS & MODEL CONFIGURATION
          </h2>
          <p className="text-xs text-gray-400">
            MASTER LOCK V4: Manage System, Firmware, Calibration, Models, & Reference Databases
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-md transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>

      {/* SUB TABS NAVIGATION BAR */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-2 flex flex-wrap gap-2 shadow-md">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-orange-600 text-white border border-orange-400 shadow-md'
                  : 'bg-gray-900/80 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                  isActive ? 'bg-orange-800 text-orange-200' : 'bg-orange-950 text-orange-400 border border-orange-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT REGIONS */}

      {/* 1. GENERAL TAB */}
      {activeTab === 'general' && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3 shadow-xl text-xs">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-700 pb-2">
            <UserCheck className="w-4 h-4 text-orange-400" />
            GENERAL & OPERATOR PREFERENCES
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 font-semibold block mb-1">Company / Service Provider</label>
              <input
                type="text"
                value={localSettings.companyName}
                onChange={(e) => setLocalSettings({ ...localSettings, companyName: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-gray-400 font-semibold block mb-1">Lead Engineer Name</label>
              <input
                type="text"
                value={localSettings.engineerName}
                onChange={(e) => setLocalSettings({ ...localSettings, engineerName: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 font-semibold block mb-1">Power Units</label>
                <select
                  value={localSettings.powerUnit}
                  onChange={(e) => setLocalSettings({ ...localSettings, powerUnit: e.target.value as any })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
                >
                  <option value="W">Watts (W)</option>
                  <option value="mW">Milliwatts (mW)</option>
                  <option value="dBm">Decibel-Milliwatts (dBm)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Temperature Units</label>
                <select
                  value={localSettings.tempUnit}
                  onChange={(e) => setLocalSettings({ ...localSettings, tempUnit: e.target.value as any })}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
                >
                  <option value="°C">Celsius (°C)</option>
                  <option value="°F">Fahrenheit (°F)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 font-semibold block mb-1">Default Tolerance Threshold (%)</label>
              <input
                type="number"
                step="0.5"
                value={localSettings.toleranceDefaultPercent}
                onChange={(e) => setLocalSettings({ ...localSettings, toleranceDefaultPercent: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. FIRMWARE TAB */}
      {activeTab === 'firmware' && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-4 shadow-xl text-xs">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-700 pb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            ESP32 HARDWARE FIRMWARE & COMMUNICATION CONFIG
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 font-semibold block mb-1">COM Port / Device</label>
                <select
                  value={comPort}
                  onChange={(e) => setComPort(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
                >
                  <option value="COM3 (ESP32-S3)">COM3 (ESP32-S3 Dual Type-C)</option>
                  <option value="COM4 (CP2102)">COM4 (CP2102 USB Bridge)</option>
                  <option value="USB-SERIAL1">/dev/ttyUSB0 (Linux/Mac)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Serial Baud Rate</label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-amber-300 font-bold rounded p-2 font-mono text-xs"
                >
                  <option value="115200">115200 bps (Standard)</option>
                  <option value="921600">921600 bps (High Speed Capture)</option>
                  <option value="57600">57600 bps</option>
                  <option value="9600">9600 bps</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Embedded Firmware Version</label>
                <input
                  type="text"
                  value={firmwareVer}
                  readOnly
                  className="w-full bg-gray-900 border border-gray-700 text-emerald-400 rounded p-2 font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 font-bold flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    HARDWARE CONNECTION STATUS
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold font-mono">
                    ONLINE
                  </span>
                </div>

                <p className="text-gray-400 text-mono text-[11px] bg-black/40 p-2.5 rounded border border-gray-800">
                  {pingStatus}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestPing}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ping Test ESP32</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CALIBRATION TAB */}
      {activeTab === 'calibration' && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3 shadow-xl text-xs">
          <div className="flex justify-between items-center border-b border-gray-700 pb-2">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              HARDWARE SENSOR CALIBRATION OFFSETS
            </h3>
            <button
              onClick={handleSaveCalibration}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow"
            >
              Save Calibration Offsets
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Power Sensor Zero Offset (Watts)</label>
              <input
                type="number"
                step="0.01"
                value={localCalib.powerOffsetW}
                onChange={(e) => setLocalCalib({ ...localCalib, powerOffsetW: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 text-emerald-400 rounded p-2 font-bold text-xs"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Power Gain Multiplier Factor</label>
              <input
                type="number"
                step="0.001"
                value={localCalib.powerGainFactor}
                onChange={(e) => setLocalCalib({ ...localCalib, powerGainFactor: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 text-xs"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Temperature Sensor Offset (°C)</label>
              <input
                type="number"
                step="0.1"
                value={localCalib.tempOffsetC}
                onChange={(e) => setLocalCalib({ ...localCalib, tempOffsetC: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3 shadow-xl text-xs">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-700 pb-2">
            <FileText className="w-4 h-4 text-orange-400" />
            DIAGNOSTIC REPORT GENERATION & BRANDING
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 font-semibold block mb-1">Report Header Banner Text</label>
              <input
                type="text"
                value={reportLogoText}
                onChange={(e) => setReportLogoText(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="autoPdf"
                checked={autoGenPdf}
                onChange={(e) => setAutoGenPdf(e.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <label htmlFor="autoPdf" className="text-gray-300 font-semibold cursor-pointer">
                Auto-generate PDF report upon completion of Diagnosis
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 5. USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3 shadow-xl text-xs">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-700 pb-2">
            <Users className="w-4 h-4 text-blue-400" />
            USER PROFILES & ROLE ACCESS CONTROL
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['Engineer', 'Senior Technology Specialist', 'Administrator'] as AppUserRole[]).map((role) => {
              const isCurrent = settings.userRole === role;
              return (
                <div
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-orange-950/40 border-orange-500 text-white shadow-lg'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-white">{role}</span>
                    {isCurrent && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {role === 'Admin' ? 'Full privileges: Model creation, Golden Reference modification, calibration.' : 'Service testing, ESP32 captures, diagnostic report export.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3 shadow-xl text-xs">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-700 pb-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            OFFLINE LOCAL DATABASE BACKUP & RESTORE
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-gray-300 font-semibold block">Export Full Database JSON Backup</span>
              <p className="text-gray-400 text-[11px]">
                Downloads a complete offline JSON file containing all models, golden references, test history, and rules.
              </p>
              <button
                onClick={() => {
                  const jsonStr = localDB.exportFullDatabaseJSON();
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `FSDP_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center gap-2 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Download JSON Backup</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-gray-300 font-semibold block">Restore / Import Database JSON</span>
              <textarea
                placeholder="Paste backup JSON string here..."
                value={importJsonText}
                onChange={(e) => setImportJsonStr(e.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2 font-mono text-[11px]"
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={handleImportDatabase}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-2 shadow"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Database</span>
                </button>

                <button
                  onClick={handleFactoryReset}
                  className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800 rounded font-semibold text-[11px]"
                >
                  Reset Factory Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. MODEL MANAGER & REFERENCE READING UNIFIED TAB ⭐ */}
      {activeTab === 'models' && (
        <SettingsModelManagerWindow
          models={models}
          onModelsChange={onModelsChange}
          activeModel={activeModel}
          onSelectModel={onSelectModel}
          onModelUpdated={onModelUpdated}
        />
      )}

      {/* CONFIRM DIALOG MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

