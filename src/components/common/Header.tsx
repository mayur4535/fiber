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
import { localDB } from '../../services/db';

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

  const APP_VERSION = '3.2.0';

  // Top Header Auto-Update Indicator & Modal states
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    version: string;
    releaseNotes: string;
    downloadUrl?: string;
  } | null>(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStepText, setUpdateStepText] = useState<string>('');
  const [updateComplete, setUpdateComplete] = useState<boolean>(false);

  useEffect(() => {
    const unsub = esp32Service.subscribeStatus(setEspStatus);
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.toLocaleDateString());
    }, 1000);

    const checkUpdate = async () => {
      if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
        (window as any).ipcRenderer.send('check-for-updates');
      } else {
        try {
          const res = await fetch('https://api.github.com/repos/mayur4535/FiberSourceDiagnosticPro/releases/latest');
          if (res.ok) {
            const data = await res.json();
            const latestTag = (data.tag_name || '').replace(/^v/, '');
            if (latestTag && latestTag !== APP_VERSION) {
              setUpdateInfo({
                hasUpdate: true,
                version: latestTag,
                releaseNotes: data.body || 'New Fiber Source Diagnostic Pro Release Available',
                downloadUrl: data.html_url
              });
            }
          }
        } catch (e) {
          console.warn('GitHub release check failed:', e);
        }
      }
    };

    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      const ipc = (window as any).ipcRenderer;
      const handleUpdateEvent = (_: any, data: any) => {
        if (data.status === 'checking') {
          setUpdateStepText('Checking GitHub Releases for updates...');
        } else if (data.status === 'available') {
          setUpdateInfo({
            hasUpdate: true,
            version: data.version,
            releaseNotes: data.releaseNotes || 'New Fiber Source Diagnostic Pro Release Available'
          });
          setUpdateStepText(`New Update v${data.version} available on GitHub Releases.`);
        } else if (data.status === 'not-available') {
          setUpdateStepText(`You are running the latest version (v${APP_VERSION}).`);
        } else if (data.status === 'downloading') {
          setIsUpdating(true);
          setUpdateProgress(data.percent || 0);
          setUpdateStepText(`Downloading update... ${data.percent}% (${((data.transferred || 0) / 1024 / 1024).toFixed(1)} MB / ${((data.total || 0) / 1024 / 1024).toFixed(1)} MB)`);
        } else if (data.status === 'downloaded') {
          setIsUpdating(false);
          setUpdateProgress(100);
          setUpdateComplete(true);
          setUpdateStepText(`✅ Update v${data.version} downloaded successfully! Ready to restart.`);
        } else if (data.status === 'error') {
          setIsUpdating(false);
          setUpdateStepText(`Notice: ${data.message}`);
        }
      };

      ipc.on('auto-update-event', handleUpdateEvent);
      ipc.send('check-for-updates');
    } else {
      checkUpdate();
    }

    const updateCheckInterval = setInterval(checkUpdate, 300000);

    return () => {
      unsub();
      clearInterval(timer);
      clearInterval(updateCheckInterval);
    };
  }, []);

  const handleStartUpdate = () => {
    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      setIsUpdating(true);
      setUpdateStepText('Starting update download from GitHub Releases...');
      (window as any).ipcRenderer.send('start-download-update');
    } else if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
    } else {
      window.open('https://github.com/mayur4535/FiberSourceDiagnosticPro/releases', '_blank');
    }
  };

  const handleRestartAndInstall = () => {
    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      (window as any).ipcRenderer.send('quit-and-install');
    } else {
      window.location.reload();
    }
  };

  return (
    <>
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
              {/* CURRENT SOFTWARE VERSION DISPLAY */}
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded font-mono font-black tracking-wider">
                v{APP_VERSION}
              </span>

              {/* AUTO UPDATE INDICATOR BADGE (ONLY SHOWS/BLINKS IF UPDATE IS ACTUALLY AVAILABLE) */}
              {updateInfo && updateInfo.hasUpdate && !updateComplete && (
                <button
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="flex items-center gap-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 hover:from-amber-400 hover:to-teal-300 text-black font-extrabold text-[9px] px-2.5 py-0.5 rounded-full shadow-lg animate-pulse transition-all cursor-pointer transform hover:scale-105"
                  title="Software Update Available on GitHub Releases!"
                >
                  <Sparkles className="w-3 h-3 text-black" />
                  <span>UPDATE AVAILABLE v{updateInfo.version}</span>
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

      {/* PLAY STORE STYLE ONE-CLICK AUTO-UPDATE MODAL */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 rounded-xl text-black font-extrabold shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-400 uppercase tracking-wide">
                  Play Store Style 1-Click Auto-Update
                </h3>
                <p className="text-xs text-slate-400">
                  Direct Software Hot-Patch • No EXE Re-installation Required
                </p>
              </div>
            </div>

            {/* WHAT'S NEW IN UPDATE */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="font-bold text-amber-300 text-[11px] uppercase flex justify-between">
                <span>Update Release v{updateInfo?.version || '3.2.1'}</span>
                <span className="text-emerald-400 font-mono">Current: v{APP_VERSION}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">
                {updateInfo?.releaseNotes || 'Includes direct USB Serial auto-handshake, hardware heartbeat, and raw 100 sample validation.'}
              </p>
            </div>

            {/* PROGRESS BAR & STATUS */}
            {(isUpdating || updateComplete || updateStepText) && (
              <div className="space-y-2 pt-1 font-mono">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300">{updateStepText}</span>
                  {isUpdating && <span className="text-emerald-400">{updateProgress}%</span>}
                </div>

                {isUpdating && (
                  <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 h-full rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${updateProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-2 pt-2">
              {!updateComplete ? (
                <>
                  <button
                    disabled={isUpdating}
                    onClick={handleStartUpdate}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-black" />
                    <span>{isUpdating ? 'DOWNLOADING UPDATE...' : '⚡ UPDATE NOW'}</span>
                  </button>

                  <button
                    disabled={isUpdating}
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-700"
                  >
                    Close
                  </button>
                </>
              ) : (
                <div className="space-y-2 w-full">
                  <div className="bg-emerald-950/80 border border-emerald-500/50 p-2.5 rounded-lg text-[11px] text-emerald-200 leading-relaxed font-sans">
                    <strong>✅ Software Update Ready!</strong><br />
                    The update package has been downloaded successfully. Click below to restart and complete installation.
                  </div>
                  <button
                    onClick={handleRestartAndInstall}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02] active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4 text-black" />
                    <span>RESTART & INSTALL UPDATE</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
