/**
 * Industrial Top Dropdown Navigation Component
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  FileText, 
  Settings, 
  Terminal, 
  Info,
  ChevronDown,
  Compass,
  Check,
  Clock
} from 'lucide-react';
import { localDB } from '../../services/db';

export type ActiveModule = 
  | 'dashboard'
  | 'models'
  | 'reference'
  | 'livetest'
  | 'pending'
  | 'diagnosis'
  | 'history'
  | 'analytics'
  | 'settings'
  | 'terminal'
  | 'about';

interface NavigationDrawerProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  activeModule,
  onSelectModule
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const checkPending = () => {
      const tests = localDB.getPendingTests();
      setPendingCount(tests.length);
    };
    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Control Center' },
    { id: 'livetest', label: 'New Test', icon: Activity, desc: 'ESP32 Real-time Capture' },
    { id: 'pending', label: 'Pending Tests', icon: Clock, desc: 'Resume Interrupted Sessions', badge: pendingCount > 0 ? `${pendingCount} PENDING` : undefined },
    { id: 'history', label: 'History & Reports', icon: FileText, desc: 'Test Records & PDF' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Model Manager & Reference Data' },
    { id: 'terminal', label: 'ESP32 Terminal', icon: Terminal, desc: 'Serial Monitor' },
    { id: 'about', label: 'About', icon: Info, desc: 'System Info' }
  ];

  const currentItem = navItems.find(item => item.id === activeModule) || navItems[0];
  const CurrentIcon = currentItem.icon;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0B132B] border-b border-gray-800 text-gray-200 px-3 py-1.5 flex items-center justify-between z-30 font-mono text-xs shadow-md shrink-0">
      {/* Left side: MAIN NAVIGATION Dropdown Menu */}
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        <div className="flex items-center gap-1.5 text-orange-400 font-extrabold uppercase text-[11px] tracking-wider shrink-0">
          <Compass className="w-4 h-4 text-orange-400" />
          <span className="hidden sm:inline">MAIN NAVIGATION:</span>
        </div>

        {/* Dropdown Menu Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-orange-950/90 hover:bg-orange-900 border border-orange-500/80 text-orange-200 font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <CurrentIcon className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-white">{currentItem.label}</span>
          <span className="text-[10px] text-orange-300/80 hidden md:inline font-mono">({currentItem.desc})</span>
          <ChevronDown className={`w-4 h-4 text-orange-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Popup Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#131E3A] border border-orange-500/60 rounded-xl shadow-2xl p-1.5 z-50">
            <div className="px-2 py-1 border-b border-gray-800 text-[9px] font-extrabold uppercase text-orange-400 tracking-wider flex justify-between items-center">
              <span>Select Navigation Section</span>
              <span className="text-gray-500">6 Modules</span>
            </div>
            <div className="py-1 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectModule(item.id as ActiveModule);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-600/90 text-white font-bold shadow border border-orange-400'
                        : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                      <div>
                        <div className="text-xs leading-tight font-medium flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-mono font-bold animate-pulse">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] leading-tight ${isActive ? 'text-orange-100' : 'text-gray-400'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right side: System Status */}
      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
        <span className="hidden sm:inline">MODE: <strong className="text-gray-300">OFFLINE LOCAL</strong></span>
        <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
          ONLINE LOCAL DB
        </span>
      </div>
    </div>
  );
};

