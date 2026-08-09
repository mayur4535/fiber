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
  UserCheck
} from 'lucide-react';
import { ESP32Status, AppUserRole, FiberModel } from '../../types';
import { esp32Service } from '../../services/esp32Service';

interface HeaderProps {
  activeModel?: FiberModel;
  userRole: AppUserRole;
  onRoleChange: (role: AppUserRole) => void;
  onOpenTerminal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModel,
  userRole,
  onRoleChange,
  onOpenTerminal
}) => {
  const [espStatus, setEspStatus] = useState<ESP32Status>(esp32Service.getStatus());
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const unsub = esp32Service.subscribeStatus(setEspStatus);
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.toLocaleDateString());
    }, 1000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="bg-[#0F172A] border-b border-gray-800 px-3 py-1.5 text-white flex flex-row items-center justify-between gap-2 shadow-md z-20 shrink-0">
      {/* App Branding */}
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
          onClick={onOpenTerminal}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer transition-all ${
            espStatus.connected 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-emerald-400' 
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
          title="Click to open ESP32 Terminal"
        >
          <Cpu className={`w-4 h-4 ${espStatus.isCapturing ? 'animate-spin text-orange-400' : ''}`} />
          <div className="flex flex-col">
            <span className="font-semibold text-[11px] leading-tight">
              {espStatus.connected ? espStatus.deviceName : 'ESP32 Disconnected'}
            </span>
            <span className="text-[9px] text-gray-400 leading-tight">
              {espStatus.connected ? `${espStatus.connectionType} (${espStatus.portName})` : 'Click to connect'}
            </span>
          </div>
          <span className={`w-2 h-2 rounded-full ${espStatus.connected ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
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
