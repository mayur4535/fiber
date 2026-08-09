/**
 * Industrial Dashboard Module (Main Control Center)
 */

import React from 'react';
import { 
  FolderTree, 
  Database, 
  Activity, 
  Stethoscope, 
  FileText, 
  Settings, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  ArrowRight,
  Clock,
  HardDrive
} from 'lucide-react';
import { FiberModel, DiagnosisReport, ESP32Status } from '../../types';
import { ActiveModule } from '../common/NavigationDrawer';

interface DashboardModuleProps {
  models: FiberModel[];
  reports: DiagnosisReport[];
  activeModel: FiberModel;
  espStatus: ESP32Status;
  onNavigate: (module: ActiveModule) => void;
  onSelectModel: (model: FiberModel) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  models,
  reports,
  activeModel,
  espStatus,
  onNavigate,
  onSelectModel
}) => {
  // Stats
  const totalModels = models.length;
  const completedReferences = models.reduce((acc, m) => {
    let count = 0;
    m.cycles.forEach((c) => {
      c.modules.forEach((mod) => {
        if (mod.reference.isComplete) count++;
      });
    });
    return acc + count;
  }, 0);

  const totalReports = reports.length;
  const passedReports = reports.filter((r) => r.overallStatus === 'PASS').length;
  const warningReports = reports.filter((r) => r.overallStatus === 'WARNING').length;
  const failedReports = reports.filter((r) => r.overallStatus === 'FAIL').length;

  const mainLaunchers = [
    {
      id: 'models',
      title: 'Model Manager',
      icon: FolderTree,
      color: 'border-blue-500 text-blue-400',
      badge: `${totalModels} Models`,
      desc: 'Configure Brand, Model, Cycles, and Modules tree'
    },
    {
      id: 'reference',
      title: 'Reference Reading',
      icon: Database,
      color: 'border-emerald-500 text-emerald-400',
      badge: `${completedReferences} Complete`,
      desc: 'Capture Golden Reference readings (Before/Upper/After)'
    },
    {
      id: 'livetest',
      title: 'Live Test Engine',
      icon: Activity,
      color: 'border-orange-500 text-orange-400',
      badge: 'Real-Time ESP32',
      desc: 'Capture real-time readings & stream waveform'
    },
    {
      id: 'diagnosis',
      title: 'Fault Diagnosis',
      icon: Stethoscope,
      color: 'border-purple-500 text-purple-400',
      badge: 'Master Rule Engine',
      desc: 'Automatic optical fault detection & repair procedure'
    },
    {
      id: 'history',
      title: 'Reports & History',
      icon: FileText,
      color: 'border-cyan-500 text-cyan-400',
      badge: `${totalReports} Tests Logged`,
      desc: 'Search history and generate multi-page industrial PDFs'
    },
    {
      id: 'settings',
      title: 'Settings & Calib',
      icon: Settings,
      color: 'border-gray-500 text-gray-300',
      badge: 'Offline Local DB',
      desc: 'Sensor offsets, baud rate, and JSON DB backup'
    }
  ];

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Status Bar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-orange-400">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-mono">SELECTED LASER SOURCE MODEL</div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>{activeModel.brand} {activeModel.modelName}</span>
              <span className="text-xs font-normal px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded">
                {activeModel.ratedPowerW}W {activeModel.laserType}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{activeModel.description}</p>
          </div>
        </div>

        {/* Model Switcher Dropdown */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select
            value={activeModel.id}
            onChange={(e) => {
              const m = models.find((x) => x.id === e.target.value);
              if (m) onSelectModel(m);
            }}
            className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg p-2.5 outline-none focus:border-orange-500 w-full lg:w-64"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.brand}] {m.modelName} ({m.ratedPowerW}W)
              </option>
            ))}
          </select>
          <button
            onClick={() => onNavigate('livetest')}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shadow-md"
          >
            <span>Start Live Test</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Feature Launcher Grid */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-400" />
          MAIN DIAGNOSTIC MODULES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainLaunchers.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.id as ActiveModule)}
                className={`bg-[#1F2937] hover:bg-gray-800 border-l-4 ${item.color.split(' ')[0]} border-t border-r border-b border-gray-700 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2.5 bg-gray-900/80 border border-gray-700 rounded-lg">
                      <Icon className={`w-6 h-6 ${item.color.split(' ')[1]}`} />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-900 text-gray-300 border border-gray-700 rounded">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-gray-800 flex items-center justify-between text-xs text-orange-400 font-medium">
                  <span>Open Module</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Status Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hardware Status Card */}
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              ESP32 HARDWARE STATUS
            </span>
            <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${espStatus.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {espStatus.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1">
              <span>Device Name:</span>
              <span className="text-white">{espStatus.deviceName}</span>
            </div>
            <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1">
              <span>Connection:</span>
              <span className="text-orange-400">{espStatus.connectionType}</span>
            </div>
            <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1">
              <span>Port / Baud:</span>
              <span className="text-white">{espStatus.portName} ({espStatus.baudRate})</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Device Temp:</span>
              <span className="text-emerald-400">{espStatus.deviceTemperatureC}°C</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Testing Overview */}
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              TEST SUMMARY LEDGER
            </span>
            <span className="text-[10px] text-gray-400 font-mono">{totalReports} Total Tests</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center my-2">
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg">
              <div className="text-lg font-bold text-emerald-400">{passedReports}</div>
              <div className="text-[10px] text-gray-400 font-semibold">PASS</div>
            </div>
            <div className="bg-yellow-950/40 border border-yellow-500/30 p-2 rounded-lg">
              <div className="text-lg font-bold text-yellow-400">{warningReports}</div>
              <div className="text-[10px] text-gray-400 font-semibold">WARNING</div>
            </div>
            <div className="bg-red-950/40 border border-red-500/30 p-2 rounded-lg">
              <div className="text-lg font-bold text-red-400">{failedReports}</div>
              <div className="text-[10px] text-gray-400 font-semibold">FAIL</div>
            </div>
          </div>
        </div>

        {/* Database & Offline Storage Status */}
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              LOCAL DATABASE STORAGE
            </span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-mono">
              OFFLINE READY
            </span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1">
              <span>Laser Models:</span>
              <span className="text-white">{totalModels} Models</span>
            </div>
            <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1">
              <span>Golden References:</span>
              <span className="text-emerald-400">{completedReferences} Saved</span>
            </div>
            <div className="flex justify-between text-gray-400 border-b border-gray-800 pb-1">
              <span>Saved Reports:</span>
              <span className="text-white">{totalReports} Records</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Storage Encryption:</span>
              <span className="text-cyan-400">Local JSON DB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Diagnostic Activity Log */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            RECENT DIAGNOSTIC TESTS & LOGS
          </h3>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-orange-400 hover:text-orange-300 font-medium"
          >
            View All Reports →
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs border border-dashed border-gray-700 rounded-lg">
            No diagnostic tests performed yet. Select a model and click "Start Live Test" above.
          </div>
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                onClick={() => onNavigate('history')}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-2 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      report.overallStatus === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : report.overallStatus === 'WARNING'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {report.overallStatus}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white">
                      [{report.brand}] {report.modelName} - {report.moduleName} ({report.joint})
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Location: {report.primaryFaultLocation} | Score: {report.healthScore}/100
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  {new Date(report.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
