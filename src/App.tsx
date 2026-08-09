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

  // Initialization
  useEffect(() => {
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
      <div className="min-h-screen bg-[#111827] text-white flex items-center justify-center font-mono">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-4 h-4 bg-orange-500 rounded-full animate-ping" />
          <span>Initializing Fiber Source Diagnostic Pro Database...</span>
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
      />

      {/* Main Body Shell */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-50px)]">
        {/* Left Navigation Drawer */}
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
