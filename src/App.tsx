/**
 * Fiber Source Diagnostic Pro
 * Main Industrial Application Shell
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { NavigationDrawer, ActiveModule } from './components/common/NavigationDrawer';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { ModelManagerModule } from './components/models/ModelManagerModule';
import { ReferenceReadingModule } from './components/reference/ReferenceReadingModule';
import { LiveTestModule } from './components/livetest/LiveTestModule';
import { PendingTestsModule } from './components/pending/PendingTestsModule';
import { DiagnosisModule } from './components/diagnosis/DiagnosisModule';
import { HistoryReportsModule } from './components/history/HistoryReportsModule';
import { AnalyticsModule } from './components/analytics/AnalyticsModule';
import { SettingsCalibrationModule } from './components/settings/SettingsCalibrationModule';
import { Esp32TerminalModule } from './components/terminal/Esp32TerminalModule';
import { AboutModule } from './components/about/AboutModule';

import { 
  FiberModel, 
  DiagnosisReport, 
  AppSettings, 
  CalibrationData, 
  AppUserRole, 
  ESP32Status 
} from './types';
import { localDB } from './services/db';
import { esp32Service } from './services/esp32Service';

export default function App() {
  const [models, setModels] = useState<FiberModel[]>([]);
  const [reports, setReports] = useState<DiagnosisReport[]>([]);
  const [settings, setSettings] = useState<AppSettings>(localDB.getSettings());
  const [calibration, setCalibration] = useState<CalibrationData>(localDB.getCalibration());
  
  const [activeModel, setActiveModel] = useState<FiberModel | null>(null);
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [currentReport, setCurrentReport] = useState<DiagnosisReport | null>(null);
  const [userRole, setUserRole] = useState<AppUserRole>(settings.userRole || 'Engineer');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [espStatus, setEspStatus] = useState<ESP32Status>(esp32Service.getStatus());
  const [showHardwareModal, setShowHardwareModal] = useState<boolean>(false);

  // Initialization
  useEffect(() => {
    async function init() {
      await localDB.initSQLite();
      const loadedModels = localDB.getModels();
      setModels(loadedModels);
      if (loadedModels.length > 0) {
        setActiveModel(loadedModels[0]);
      }

      const loadedReports = localDB.getReports();
      setReports(loadedReports);
      if (loadedReports.length > 0) {
        setCurrentReport(loadedReports[0]);
      }

      setSettings(localDB.getSettings());
      setCalibration(localDB.getCalibration());
    }

    init();

    const unsubEsp = esp32Service.subscribeStatus(setEspStatus);
    return () => unsubEsp();
  }, []);

  const handleSelectModel = (model: FiberModel) => {
    setActiveModel(model);
  };

  const handleRoleChange = (role: AppUserRole) => {
    setUserRole(role);
    const updated = { ...settings, userRole: role };
    setSettings(updated);
    localDB.saveSettings(updated);
  };

  if (!activeModel) {
    return (
      <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center justify-center font-mono p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-orange-600 rounded-xl mx-auto flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-orange-900/50">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-white">MAYUR FIBER DIAGNOSIS</h1>
          <p className="text-xs text-orange-400 font-semibold uppercase tracking-widest">Developed by Mayur Raval</p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-ping" />
            <span className="text-sm text-gray-400">Loading MAYUR FIBER DIAGNOSIS SQLite Database...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#111827] text-gray-100 flex flex-col font-sans select-none antialiased overflow-hidden">
      {/* Top Header */}
      <Header
        activeModel={activeModel}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        onOpenTerminal={() => setActiveModule('terminal')}
        onOpenHardwareModal={() => {
          setShowHardwareModal(true);
          if (activeModule !== 'livetest') {
            setActiveModule('livetest');
          }
        }}
      />

      {/* Main Body Shell */}
      <div className="flex flex-col flex-1 overflow-hidden h-[calc(100vh-50px)]">
        {/* Top Navigation Bar with Dropdown Menu */}
        <NavigationDrawer
          activeModule={activeModule}
          onSelectModule={(mod) => setActiveModule(mod)}
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        />

        {/* Content Region */}
        <main className={`flex-1 bg-[#111827] ${activeModule === 'livetest' ? 'p-1 overflow-hidden h-full' : 'p-2 md:p-3 overflow-y-auto'}`}>
          {activeModule === 'dashboard' && (
            <DashboardModule
              models={models}
              reports={reports}
              activeModel={activeModel}
              espStatus={espStatus}
              onNavigate={(mod) => setActiveModule(mod)}
              onSelectModel={handleSelectModel}
            />
          )}



          {activeModule === 'livetest' && (
            <LiveTestModule
              activeModel={activeModel}
              models={models}
              onSelectModel={handleSelectModel}
              onModelUpdated={(updated) => {
                setModels(localDB.getModels());
                setActiveModel(updated);
              }}
              onNavigateToDiagnosis={(report) => {
                setCurrentReport(report);
                setReports(localDB.getReports());
                setActiveModule('diagnosis');
              }}
              showHardwareModal={showHardwareModal}
              setShowHardwareModal={setShowHardwareModal}
            />
          )}

          {activeModule === 'pending' && (
            <PendingTestsModule
              models={models}
              onResumePendingTest={(session) => {
                const targetModel = models.find(m => m.id === session.modelId) || activeModel;
                if (targetModel) setActiveModel(targetModel);
                setActiveModule('livetest');
              }}
              onNavigateToHistory={() => {
                setReports(localDB.getReports());
                setActiveModule('history');
              }}
            />
          )}

          {activeModule === 'diagnosis' && (
            <DiagnosisModule
              currentReport={currentReport}
              onNavigateToHistory={() => setActiveModule('history')}
            />
          )}

          {activeModule === 'history' && (
            <HistoryReportsModule
              reports={reports}
              onReportsChange={(updated) => setReports(updated)}
              onSelectReportForDiagnosis={(report) => {
                setCurrentReport(report);
                setActiveModule('diagnosis');
              }}
            />
          )}

          {activeModule === 'analytics' && (
            <AnalyticsModule reports={reports} models={models} />
          )}

          {(activeModule === 'settings' || activeModule === 'models' || activeModule === 'reference') && (
            <SettingsCalibrationModule
              settings={settings}
              calibration={calibration}
              onSettingsSaved={(s) => setSettings(s)}
              onCalibrationSaved={(c) => setCalibration(c)}
              onRoleChange={handleRoleChange}
              models={models}
              onModelsChange={(updated) => setModels(updated)}
              activeModel={activeModel}
              onSelectModel={handleSelectModel}
              onModelUpdated={(updated) => {
                setModels(localDB.getModels());
                setActiveModel(updated);
              }}
            />
          )}

          {activeModule === 'terminal' && <Esp32TerminalModule />}

          {activeModule === 'about' && <AboutModule />}
        </main>
      </div>
    </div>
  );
}
