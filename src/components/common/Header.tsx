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

  // Connection Center Popover states
  const [isConnPanelOpen, setIsConnPanelOpen] = useState<boolean>(false);
  const [connTab, setConnTab] = useState<'usb' | 'wifi'>('usb');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [wifiIp, setWifiIp] = useState<string>('192.168.1.50');
  const [wifiPort, setWifiPort] = useState<number>(81);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connError, setConnError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleAutoDetectUSB = async () => {
    setIsConnecting(true);
    setConnError(null);
    try {
      const ok = await esp32Service.autoDetectUSBPort(baudRate);
      if (!ok) {
        setConnError('ESP32 hardware not detected on authorized COM ports. Use "Select USB COM Port" to grant access.');
      }
    } catch (err: any) {
      setConnError(err.message || 'Auto-detect error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRequestUSBPort = async () => {
    setIsConnecting(true);
    setConnError(null);
    try {
      await esp32Service.requestFreshPort(baudRate);
    } catch (err: any) {
      setConnError(err.message || 'USB selection failed or cancelled');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectWiFi = async (mode: 'auto' | 'http') => {
    setIsConnecting(true);
    setConnError(null);
    try {
      if (mode === 'auto') {
        await esp32Service.connectWiFiAuto(wifiIp, wifiPort);
      } else {
        await esp32Service.connectWiFiHTTPPolling(wifiIp, wifiPort === 81 ? 80 : wifiPort);
      }
    } catch (err: any) {
      setConnError(err.message || `Failed to connect to ESP32 at ${wifiIp}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      await esp32Service.disconnectHardware(false, true);
      setConnError(null);
    } finally {
      setIsConnecting(false);
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
                Fiber Source Diagnostic Pro
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

        {/* Center Hardware & Connection Control Center Badge */}
        <div className="flex items-center gap-2 text-xs relative">
          <div 
            onClick={() => setIsConnPanelOpen(!isConnPanelOpen)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border cursor-pointer transition-all shadow-md select-none ${
              espStatus.isSearching
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900/80'
                : espStatus.connected 
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-900/90' 
                  : 'bg-red-950/80 border-red-500/60 text-red-200 hover:bg-red-900/80 hover:border-red-400'
            }`}
            title="Click to open ESP32 Connection Control Center"
          >
            {espStatus.isSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            ) : (
              <Cpu className={`w-4 h-4 shrink-0 ${espStatus.isCapturing ? 'animate-spin text-orange-400' : espStatus.connected ? 'text-emerald-400' : 'text-red-400'}`} />
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-bold text-[11px] leading-tight">
                {espStatus.isSearching ? (
                  <span className="text-amber-300 animate-pulse">Detecting ESP32...</span>
                ) : espStatus.connected ? (
                  <span className="text-emerald-300">{espStatus.deviceName}</span>
                ) : (
                  <span className="text-red-300">ESP32 Not Connected</span>
                )}

                {espStatus.connected && (
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-1 py-0.2 rounded font-mono font-bold">
                    {espStatus.connectionType.includes('USB') ? 'USB' : 'Wi-Fi'}
                  </span>
                )}
              </div>

              <span className="text-[9.5px] text-slate-300 leading-tight font-mono">
                {espStatus.isSearching 
                  ? (espStatus.searchStatusText || 'Scanning COM Ports...')
                  : espStatus.connected 
                    ? `${espStatus.portName || 'Connected'} • FW:${espStatus.firmwareVersion || '3.0'}` 
                    : 'Click to Scan / Connect'}
              </span>
            </div>

            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              espStatus.isSearching 
                ? 'bg-amber-400 animate-ping' 
                : espStatus.connected 
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                  : 'bg-red-500 animate-ping'
            }`} />
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

          {/* TOP HEADER CONNECTION CONTROL CENTER POPOVER PANEL */}
          {isConnPanelOpen && (
            <div 
              ref={panelRef}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-white z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-200">
                    ESP32 Connection Control Center
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
                  <span className="font-bold uppercase text-[10px] text-slate-400">Current Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    espStatus.connected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {espStatus.connected ? '🟢 VERIFIED CONNECTED' : '🔴 DISCONNECTED'}
                  </span>
                </div>

                {espStatus.connected ? (
                  <div className="space-y-1 pt-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-400">Device Name:</span><span className="font-bold text-emerald-300">{espStatus.deviceName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Connection:</span><span>{espStatus.connectionType} ({espStatus.portName})</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Firmware:</span><span className="text-amber-300 font-bold">{espStatus.firmwareVersion}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Hardware UID:</span><span className="text-cyan-300 font-bold">{espStatus.serialNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Temperature:</span><span>{espStatus.deviceTemperatureC}°C</span></div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                    No active ESP32-S3 hardware link verified. Click <strong className="text-emerald-400">Auto-Detect</strong> or select port below.
                  </p>
                )}
              </div>

              {/* CONNECTION TAB SELECTOR */}
              <div className="flex border-b border-slate-800 mb-3">
                <button
                  onClick={() => setConnTab('usb')}
                  className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                    connTab === 'usb'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>USB Serial (COM)</span>
                </button>

                <button
                  onClick={() => setConnTab('wifi')}
                  className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                    connTab === 'wifi'
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Wi-Fi Network</span>
                </button>
              </div>

              {/* TAB 1: USB SERIAL */}
              {connTab === 'usb' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Baud Rate</label>
                    <select
                      value={baudRate}
                      onChange={(e) => setBaudRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
                    >
                      <option value={115200}>115200 Baud (Standard ESP32-S3)</option>
                      <option value={921600}>921600 Baud (High Speed)</option>
                      <option value={57600}>57600 Baud</option>
                      <option value={9600}>9600 Baud</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      disabled={isConnecting || espStatus.isSearching}
                      onClick={handleAutoDetectUSB}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>{isConnecting || espStatus.isSearching ? 'Scanning & Handshaking...' : '⚡ Auto-Detect ESP32-S3 (USB)'}</span>
                    </button>

                    <button
                      disabled={isConnecting || espStatus.isSearching}
                      onClick={handleRequestUSBPort}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <Usb className="w-4 h-4 text-emerald-400" />
                      <span>🔌 Select / Grant USB COM Port</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: WI-FI NETWORK */}
              {connTab === 'wifi' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">ESP32 IP</label>
                      <input
                        type="text"
                        value={wifiIp}
                        onChange={(e) => setWifiIp(e.target.value)}
                        placeholder="192.168.1.50"
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Port</label>
                      <input
                        type="number"
                        value={wifiPort}
                        onChange={(e) => setWifiPort(Number(e.target.value))}
                        placeholder="81"
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      disabled={isConnecting}
                      onClick={() => handleConnectWiFi('auto')}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Radio className="w-4 h-4 text-amber-300" />
                      <span>{isConnecting ? 'Connecting Wi-Fi...' : '⚡ Connect Wi-Fi (Auto WebSocket / HTTP)'}</span>
                    </button>

                    <button
                      disabled={isConnecting}
                      onClick={() => handleConnectWiFi('http')}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 rounded-lg font-bold text-xs"
                    >
                      🌐 Connect HTTP Live Stream Mode
                    </button>
                  </div>
                </div>
              )}

              {/* ERROR NOTICE IN PANEL */}
              {connError && (
                <div className="mt-3 p-2 bg-red-950/80 border border-red-500/60 rounded-lg text-red-200 text-[11px] flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="leading-tight">{connError}</p>
                </div>
              )}

              {/* BOTTOM ACTIONS */}
              <div className="mt-4 pt-2 border-t border-slate-800 flex justify-between items-center">
                {espStatus.connected ? (
                  <button
                    onClick={handleDisconnect}
                    className="w-full py-1.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 rounded-lg font-bold text-xs transition-all"
                  >
                    Disconnect ESP32 Hardware
                  </button>
                ) : (
                  <div className="flex justify-between w-full items-center text-[11px] text-slate-400">
                    <span>Handshake Protocol: HELLO / HELLO_ACK</span>
                    <button
                      onClick={onOpenTerminal}
                      className="text-orange-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Terminal</span>
                    </button>
                  </div>
                )}
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
