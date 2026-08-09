/**
 * Industrial Left Navigation Drawer Component
 */

import React from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  Database, 
  Activity, 
  Stethoscope, 
  FileText, 
  BarChart3, 
  Settings, 
  Terminal, 
  Info,
  ChevronRight
} from 'lucide-react';

export type ActiveModule = 
  | 'dashboard'
  | 'models'
  | 'reference'
  | 'livetest'
  | 'diagnosis'
  | 'history'
  | 'analytics'
  | 'settings'
  | 'terminal'
  | 'about';

interface NavigationDrawerProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  activeModule,
  onSelectModule,
  isOpen
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Control Center' },
    { id: 'livetest', label: 'New Test', icon: Activity, desc: 'ESP32 Real-time Capture' },
    { id: 'history', label: 'History & Reports', icon: FileText, desc: 'Test Records & PDF' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Model Manager & Reference Data' },
    { id: 'terminal', label: 'ESP32 Terminal', icon: Terminal, desc: 'Serial Monitor' },
    { id: 'about', label: 'About', icon: Info, desc: 'System Info' }
  ];

  return (
    <aside
      className={`bg-[#0F172A] border-r border-gray-800 text-gray-200 flex flex-col transition-all duration-200 z-10 ${
        isOpen ? 'w-64' : 'w-16 md:w-64'
      }`}
    >
      <div className="px-2.5 py-1.5 border-b border-gray-800/80 hidden md:block">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
          MAIN NAVIGATION
        </span>
      </div>

      <nav className="flex-1 p-1.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id as ActiveModule)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all group ${
                isActive
                  ? 'bg-orange-600/90 text-white font-semibold shadow-md border border-orange-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-400'}`} />
                <div className="hidden md:block">
                  <div className="text-xs leading-tight font-medium">{item.label}</div>
                  <div className="text-[9px] text-gray-500 group-hover:text-gray-400 leading-tight">
                    {item.desc}
                  </div>
                </div>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 hidden md:block text-orange-200" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800 text-[10px] text-gray-500 hidden md:block">
        <div className="flex justify-between items-center">
          <span>MODE: OFFLINE LOCAL</span>
          <span className="text-emerald-400 font-semibold">ONLINE LOCAL DB</span>
        </div>
        <div className="mt-1 text-gray-600 text-[9px]">
          Fiber Source Diagnostic Pro v3.2
        </div>
      </div>
    </aside>
  );
};
