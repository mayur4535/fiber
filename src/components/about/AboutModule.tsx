/**
 * About & System Specifications Module
 */

import React from 'react';
import { ShieldCheck, Cpu, HardDrive, FileText, CheckCircle2, Zap, Layers } from 'lucide-react';

export const AboutModule: React.FC = () => {
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 font-mono text-xs">
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
          <div className="p-3 bg-orange-600 rounded-xl text-white">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white uppercase">MAYUR FIBER DIAGNOSIS</h2>
            <p className="text-orange-400 font-semibold text-xs">Developed by Mayur Raval</p>
            <p className="text-gray-400 text-[10px]">Version 3.2.0-PRO (Master Lock Release)</p>
          </div>
        </div>

        <div className="space-y-2 text-gray-300">
          <p>
            MAYUR FIBER DIAGNOSIS is a production-grade Industrial Fiber Laser Source Diagnostic Platform engineered specifically for Laser Service Engineers, Maintenance Teams, and Repair Facilities.
          </p>
          <p>
            Supported Manufacturers include <span className="text-orange-400 font-bold">Raycus, JPT, IPG, MAX Photonics, RECI, BWT</span>, and custom Fiber Laser Sources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-orange-400 font-bold block">✓ OFFLINE FIRST ARCHITECTURE</span>
            <p className="text-gray-400 text-[11px]">Zero cloud dependency. All models, golden references, diagnostic rules, and test ledgers remain 100% local on device.</p>
          </div>

          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-emerald-400 font-bold block">✓ LOCATION-FIRST RULE ENGINE</span>
            <p className="text-gray-400 text-[11px]">Pinpoints WHERE the fault exists along the optical path before identifying WHAT the fault is using deterministic expert rules.</p>
          </div>

          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-cyan-400 font-bold block">✓ ESP32 HARDWARE PROTOCOL</span>
            <p className="text-gray-400 text-[11px]">Full support for USB OTG Serial / Web Serial and hardware simulator with realistic optical fault injection.</p>
          </div>

          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
            <span className="text-purple-400 font-bold block">✓ PRINT-READY PDF REPORTS</span>
            <p className="text-gray-400 text-[11px]">Multi-page industrial reports complete with comparative matrices, evidence breakdown, and repair steps.</p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 flex justify-between items-center text-gray-500 text-[10px]">
          <span>© 2026 Laser Automation Services</span>
          <span>Industrial Automation Software Standard</span>
        </div>
      </div>
    </div>
  );
};
