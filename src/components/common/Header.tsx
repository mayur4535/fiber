/**
 * Industrial Top Header Component
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  RefreshCw,
  UserCheck,
  Download,
  Sparkles
} from 'lucide-react';
import { ESP32Status, AppUserRole, FiberModel } from '../../types';
import { esp32Service } from '../../services/esp32Service';

interface HeaderProps {
  activeModel?: FiberModel;
  userRole: AppUserRole;
  onRoleChange: (role: AppUserRole) => void;
  onOpenTerminal: () => void;
  onOpenHardwareModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModel,
  userRole,
  onRoleChange,
  onOpenTerminal,
  onOpenHardwareModal
}) => {
  const [espStatus, setEspStatus] = useState<ESP32Status>(esp32Service.getStatus());
  const [timeStr, setTimeStr] = useState<string>('');

  // Top Header Auto-Update Indicator states
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    runNumber: number;
    htmlUrl: string;
    commitMsg: string;
  } | null>(null);

  useEffect(() => {
    const unsub = esp32Service.subscribeStatus(setEspStatus);
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.toLocaleDateString());
    }, 1000);

    // Auto-check GitHub for updates in background (runs on mount)
    const checkGitHubUpdate = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/mayur4535/fiber/actions/runs?per_page=1');
        if (res.ok) {
          const data = await res.json();
          if (data.workflow_runs && data.workflow_runs.length > 0) {
            const run = data.workflow_runs[0];
            setUpdateInfo({
              hasUpdate: true,
              runNumber: run.run_number,
              htmlUrl: run.html_url || 'https://github.com/mayur4535/fiber/actions',
              commitMsg: run.head_commit?.message || 'New EXE Build Artifact'
            });
          }
        }
      } catch (e) {
        // Silently catch network errors in background loop
      }
    };

    checkGitHubUpdate();
    // Check every 5 minutes in background
    const updateCheckInterval = setInterval(checkGitHubUpdate, 300000);

    return () => {
      unsub();
      clearInterval(timer);
      clearInterval(updateCheckInterval);
    };
  }, []);

  return (
    <header className="bg-[#0F172A] border-b border-gray-800 px-3 py-1.5 text-white flex flex-row items-center justify-between gap-2 shadow-md z-20 shrink-0">
      {/* App Branding & Auto Update Notification Badge */}
      <div className="flex items-center gap-2">
        <div className="bg-orange-600 p-1.5 rounded-md flex items-center justify-center text-white font-bold shadow-inner">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-gray-100">
              Fiber Source Diagnostic Pro
            </h1>
            <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/40 px-1 py-0.2 rounded font-mono font-semibold">
              v3.2
            </span>

            {/* AUTO UPDATE INDICATOR BADGE (LIKE MOBILE / ANDROID) */}
            {updateInfo && updateInfo.hasUpdate && (
              <button
                onClick={() => {
                  alert(`⚡ NEW SOFTWARE UPDATE DETECTED! (GitHub Build #${updateInfo.runNumber})\n\nCommit: "${updateInfo.commitMsg}"\n\nClicking OK will open the GitHub download page directly to grab the latest EXE artifact.`);
                  window.open(updateInfo.htmlUrl, '_blank');
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-black font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg animate-pulse transition-all cursor-pointer transform hover:scale-105"
                title="Click to download new EXE build directly from GitHub"
              >
                <Sparkles className="w-3 h-3 text-black" />
                <span>UPDATE AVAILABLE (Build #{updateInfo.runNumber})</span>
                <Download className="w-3 h-3 text-black" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
            <span>Diagnostics Engine</span>
            {activeModel && (
              <span className="text-orange-400 font-medium hidden sm:inline">
                • Active: {activeModel.brand} {activeModel.modelName}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Center Hardware & Connection Status Indicators */}
      <div className="flex items-center gap-2 text-xs">
        {/* ESP Connection Status */}
        <div 
          onClick={onOpenHardwareModal || onOpenTerminal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer transition-all shadow ${
            espStatus.connected 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-900/80' 
              : 'bg-red-950/70 border-red-500/60 text-red-200 hover:bg-red-900/80 hover:border-red-400 animate-pulse'
          }`}
          title="Click to open Physical ESP32 Hardware Live Connection Window"
        >
          <Cpu className={`w-4 h-4 ${espStatus.isCapturing ? 'animate-spin text-orange-400' : espStatus.connected ? 'text-emerald-400' : 'text-red-400'}`} />
          <div className="flex flex-col">
            <span className="font-semibold text-[11px] leading-tight">
              {espStatus.connected ? espStatus.deviceName : 'ESP32 Disconnected'}
            </span>
            <span className="text-[9px] text-slate-300 leading-tight">
              {espStatus.connected ? `${espStatus.connectionType} (${espStatus.portName})` : 'Click to connect'}
            </span>
          </div>
          <span className={`w-2 h-2 rounded-full ${espStatus.connected ? 'bg-emerald-400 animate-ping' : 'bg-red-500 animate-ping'}`} />
        </div>

        {/* Device Temp */}
        {espStatus.connected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/80 border border-gray-700/80 rounded text-gray-300">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-xs">{espStatus.deviceTemperatureC}°C</span>
          </div>
        )}

        {/* System Time Ticker */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/80 border border-gray-700/80 rounded text-gray-300 font-mono text-[11px]">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{timeStr || 'System Ready'}</span>
        </div>
      </div>

      {/* Right Controls: User Role Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded p-0.5">
          <UserCheck className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
          {(['Operator', 'Engineer', 'Admin'] as AppUserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                userRole === role
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenTerminal}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded transition-colors"
          title="ESP32 Command Terminal & Simulator"
        >
          <Terminal className="w-4 h-4 text-orange-400" />
        </button>
      </div>
    </header>
  );
};
