/**
 * Industrial Top Header Component
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Wifi,
  Usb,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Sliders,
  X,
  Radio
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

  // Top Communication Bar states
  const [availablePorts, setAvailablePorts] = useState<Array<{ index: number; label: string; portObj: any }>>([]);
  const [selectedComPortIndex, setSelectedComPortIndex] = useState<number>(0);
  const [isScanningPorts, setIsScanningPorts] = useState<boolean>(false);
  const [isUsbConnecting, setIsUsbConnecting] = useState<boolean>(false);
  const [isWifiConnecting, setIsWifiConnecting] = useState<boolean>(false);

  const [isConnPanelOpen, setIsConnPanelOpen] = useState<boolean>(false);
  const [connTab, setConnTab] = useState<'usb' | 'wifi'>('usb');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [wifiIp, setWifiIp] = useState<string>('192.168.1.50');
  const [wifiPort, setWifiPort] = useState<number>(81);
  const [connError, setConnError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const refreshPortsList = async () => {
    setIsScanningPorts(true);
    try {
      const ports = await esp32Service.getAvailableComPorts();
      setAvailablePorts(ports);
      if (ports.length > 0 && selectedComPortIndex >= ports.length) {
        setSelectedComPortIndex(0);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsScanningPorts(false);
    }
  };

  useEffect(() => {
    refreshPortsList();
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      const handleSerialChange = () => refreshPortsList();
      (navigator as any).serial.addEventListener('connect', handleSerialChange);
      (navigator as any).serial.addEventListener('disconnect', handleSerialChange);
      return () => {
        try {
          (navigator as any).serial.removeEventListener('connect', handleSerialChange);
          (navigator as any).serial.removeEventListener('disconnect', handleSerialChange);
        } catch (e) {}
      };
    }
  }, []);

  const handleConnectUSB = async () => {
    setIsUsbConnecting(true);
    setConnError(null);
    try {
      if (availablePorts.length > 0 && selectedComPortIndex >= 0 && selectedComPortIndex < availablePorts.length) {
        await esp32Service.connectSpecificPortIndex(selectedComPortIndex, baudRate);
      } else {
        await esp32Service.requestFreshPort(baudRate);
        await refreshPortsList();
      }
    } catch (err: any) {
      setConnError(err.message || 'USB Connection failed');
    } finally {
      setIsUsbConnecting(false);
    }
  };

  const handleRequestUSBPort = async () => {
    setIsUsbConnecting(true);
    setConnError(null);
    try {
      await esp32Service.requestFreshPort(baudRate);
      await refreshPortsList();
    } catch (err: any) {
      setConnError(err.message || 'USB selection failed or cancelled');
    } finally {
      setIsUsbConnecting(false);
    }
  };

  const handleDisconnectUSB = async () => {
    setIsUsbConnecting(true);
    try {
      await esp32Service.disconnectUSB(true);
    } finally {
      setIsUsbConnecting(false);
    }
  };

  const handleConnectWiFiClick = async () => {
    setIsWifiConnecting(true);
    setConnError(null);
    try {
      await esp32Service.connectWiFiAuto(wifiIp, wifiPort);
    } catch (err: any) {
      setConnError(err.message || `Failed to connect to ESP32 at ${wifiIp}`);
    } finally {
      setIsWifiConnecting(false);
    }
  };

  const handleDisconnectWiFi = async () => {
    setIsWifiConnecting(true);
    try {
      await esp32Service.disconnectWiFi(true);
    } finally {
      setIsWifiConnecting(false);
    }
  };

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
          const res = await fetch('https://api.github.com/repos/mayur4535/fiber/releases/latest');
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
      window.open('https://github.com/mayur4535/fiber/releases', '_blank');
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
      <header className="bg-[#0F172A] border-b border-gray-800 px-3 py-1.5 text-white flex flex-row items-center justify-between gap-2 shadow-md z-20 shrink-0 relative">
        {/* App Branding & Auto Update Notification Badge */}
        <div className="flex items-center gap-2">
          <div className="bg-orange-600 p-1.5 rounded-md flex items-center justify-center text-white font-bold shadow-inner">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-gray-100">
                MAYUR FIBER DIAGNOSIS
              </h1>
              {/* CURRENT SOFTWARE VERSION DISPLAY */}
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded font-mono font-black tracking-wider">
                v{APP_VERSION}
              </span>

              {/* AUTO UPDATE INDICATOR BADGE */}
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

        {/* Center Hardware & Communication Control Bar */}
        <div className="flex items-center gap-2 text-xs relative">
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 shadow-inner text-xs">
            {/* USB CONTROL SECTION */}
            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2.5">
              <span className="text-[10px] font-extrabold text-slate-300 uppercase flex items-center gap-1">
                <Usb className="w-3.5 h-3.5 text-emerald-400" /> USB
              </span>

              <select
                value={selectedComPortIndex}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'request_new') {
                    handleRequestUSBPort();
                  } else {
                    setSelectedComPortIndex(Number(val));
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-amber-300 font-mono text-[10.5px] font-bold rounded px-1.5 py-0.5 outline-none focus:border-emerald-500 max-w-[130px] cursor-pointer"
              >
                {availablePorts.length === 0 ? (
                  <option value="-1">No COM Ports</option>
                ) : (
                  availablePorts.map((p) => (
                    <option key={p.index} value={p.index}>{p.label}</option>
                  ))
                )}
                <option value="request_new">+ Grant / Select USB Port...</option>
              </select>

              <button
                onClick={refreshPortsList}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Refresh COM Ports List"
              >
                <RefreshCw className={`w-3 h-3 ${isScanningPorts ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              {espStatus.usbStatus?.state === 'VERIFIED CONNECTED' ? (
                <button
                  onClick={handleDisconnectUSB}
                  className="px-2 py-0.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 font-bold text-[10px] rounded transition-all cursor-pointer"
                >
                  DISCONNECT
                </button>
              ) : (
                <button
                  disabled={isUsbConnecting}
                  onClick={handleConnectUSB}
                  className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer shadow"
                >
                  {isUsbConnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-300" />}
                  <span>CONNECT</span>
                </button>
              )}

              {/* USB STATUS BADGE */}
              <div className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border flex items-center gap-1 ${
                espStatus.usbStatus?.state === 'VERIFIED CONNECTED'
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                  : espStatus.usbStatus?.state === 'CONNECTING'
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
                    : espStatus.usbStatus?.state === 'CONNECTION FAILED'
                      ? 'bg-red-950/90 border-red-500/60 text-red-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  espStatus.usbStatus?.state === 'VERIFIED CONNECTED' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' :
                  espStatus.usbStatus?.state === 'CONNECTING' ? 'bg-amber-400 animate-ping' :
                  espStatus.usbStatus?.state === 'CONNECTION FAILED' ? 'bg-red-500' : 'bg-slate-600'
                }`} />
                <span>{espStatus.usbStatus?.state === 'VERIFIED CONNECTED' ? `VERIFIED (${espStatus.usbStatus.portOrIp || 'USB'})` : (espStatus.usbStatus?.state || 'DISCONNECTED')}</span>
              </div>
            </div>

            {/* WI-FI CONTROL SECTION */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-300 uppercase flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" /> Wi-Fi
              </span>

              <input
                type="text"
                value={wifiIp}
                onChange={(e) => setWifiIp(e.target.value)}
                placeholder="192.168.1.50"
                className="bg-slate-900 border border-slate-700 text-amber-300 font-mono text-[10.5px] font-bold rounded px-1.5 py-0.5 outline-none focus:border-cyan-400 w-28 text-center"
              />

              {espStatus.wifiStatus?.state === 'VERIFIED CONNECTED' ? (
                <button
                  onClick={handleDisconnectWiFi}
                  className="px-2 py-0.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 font-bold text-[10px] rounded transition-all cursor-pointer"
                >
                  DISCONNECT
                </button>
              ) : (
                <button
                  disabled={isWifiConnecting}
                  onClick={handleConnectWiFiClick}
                  className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer shadow"
                >
                  {isWifiConnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3 text-amber-300" />}
                  <span>CONNECT</span>
                </button>
              )}

              {/* WI-FI STATUS BADGE */}
              <div className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border flex items-center gap-1 ${
                espStatus.wifiStatus?.state === 'VERIFIED CONNECTED'
                  ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300'
                  : espStatus.wifiStatus?.state === 'CONNECTING'
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
                    : espStatus.wifiStatus?.state === 'CONNECTION FAILED'
                      ? 'bg-red-950/90 border-red-500/60 text-red-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  espStatus.wifiStatus?.state === 'VERIFIED CONNECTED' ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' :
                  espStatus.wifiStatus?.state === 'CONNECTING' ? 'bg-amber-400 animate-ping' :
                  espStatus.wifiStatus?.state === 'CONNECTION FAILED' ? 'bg-red-500' : 'bg-slate-600'
                }`} />
                <span>{espStatus.wifiStatus?.state === 'VERIFIED CONNECTED' ? `VERIFIED (${wifiIp})` : (espStatus.wifiStatus?.state || 'DISCONNECTED')}</span>
              </div>
            </div>
          </div>

          {/* Device Temp Badge */}
          {espStatus.connected && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/80 border border-gray-700/80 rounded text-gray-300 font-mono text-[11px]">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              <span>{espStatus.deviceTemperatureC}°C</span>
            </div>
          )}

          {/* System Time Ticker */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/80 border border-gray-700/80 rounded text-gray-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{timeStr || 'System Ready'}</span>
          </div>

          {/* OPTIONAL HARDWARE DETAILS POPOVER */}
          {isConnPanelOpen && (
            <div 
              ref={panelRef}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-white z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-200">
                    ESP32-S3 Hardware Diagnostic Details
                  </span>
                </div>
                <button
                  onClick={() => setIsConnPanelOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* CURRENT HARDWARE STATUS BOX */}
              <div className={`p-3 rounded-lg border mb-3 space-y-1.5 text-xs font-mono ${
                espStatus.connected 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200' 
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase text-[10px] text-slate-400">System Link Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    espStatus.connected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {espStatus.connected ? '🟢 VERIFIED LINK' : '🔴 NO HARDWARE LINK'}
                  </span>
                </div>

                {espStatus.connected ? (
                  <div className="space-y-1 pt-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-400">Device Name:</span><span className="font-bold text-emerald-300">{espStatus.deviceName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Active Transport:</span><span className="text-amber-300 font-bold">{espStatus.activeTransport}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">USB Status:</span><span>{espStatus.usbStatus?.state} ({espStatus.usbStatus?.portOrIp || 'N/A'})</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Wi-Fi Status:</span><span>{espStatus.wifiStatus?.state} ({espStatus.wifiStatus?.portOrIp || 'N/A'})</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Firmware:</span><span className="text-amber-300 font-bold">{espStatus.firmwareVersion}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Hardware UID:</span><span className="text-cyan-300 font-bold">{espStatus.serialNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Temperature:</span><span>{espStatus.deviceTemperatureC}°C</span></div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                    Use the <strong className="text-emerald-400">Top Communication Bar</strong> above to connect via USB or Wi-Fi.
                  </p>
                )}
              </div>

              {/* ERROR NOTICE IN PANEL */}
              {connError && (
                <div className="mt-3 p-2 bg-red-950/80 border border-red-500/60 rounded-lg text-red-200 text-[11px] flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="leading-tight">{connError}</p>
                </div>
              )}

              {/* BOTTOM ACTIONS */}
              <div className="mt-4 pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                <span>Handshake Protocol: HELLO / PING</span>
                <button
                  onClick={onOpenTerminal}
                  className="text-orange-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Terminal</span>
                </button>
              </div>
            </div>
          )}
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
