/**
 * Machine Health Analytics & Fleet Dashboard (Part 9B)
 */

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  PieChart, 
  Layers 
} from 'lucide-react';
import { DiagnosisReport, FiberModel } from '../../types';

interface AnalyticsModuleProps {
  reports: DiagnosisReport[];
  models: FiberModel[];
}

export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({
  reports,
  models
}) => {
  const total = reports.length;
  const passed = reports.filter((r) => r.overallStatus === 'PASS').length;
  const warning = reports.filter((r) => r.overallStatus === 'WARNING').length;
  const failed = reports.filter((r) => r.overallStatus === 'FAIL').length;

  const avgHealthScore = total > 0 ? Math.round(reports.reduce((acc, r) => acc + r.healthScore, 0) / total) : 100;

  // Group by Fault Location
  const faultLocations: Record<string, number> = {};
  reports.forEach((r) => {
    const loc = r.primaryFaultLocation;
    faultLocations[loc] = (faultLocations[loc] || 0) + 1;
  });

  // Group by Brand
  const brandStats: Record<string, { total: number; pass: number }> = {};
  reports.forEach((r) => {
    if (!brandStats[r.brand]) brandStats[r.brand] = { total: 0, pass: 0 };
    brandStats[r.brand].total += 1;
    if (r.overallStatus === 'PASS') brandStats[r.brand].pass += 1;
  });

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner Toolbar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            MACHINE HEALTH & FLEET ANALYTICS DASHBOARD
          </h2>
          <p className="text-xs text-gray-400">
            Real-time optical health scores, fault frequencies, and brand statistics
          </p>
        </div>

        <span className="text-xs font-mono bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3 py-1 rounded font-bold">
          {total} ANALYZED SESSIONS
        </span>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-400 font-bold uppercase mb-1">AVG HEALTH SCORE</div>
          <div className="text-3xl font-black font-mono text-emerald-400">{avgHealthScore}/100</div>
          <div className="text-[10px] text-gray-500 mt-1">Across all logged sessions</div>
        </div>

        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-400 font-bold uppercase mb-1">TOTAL PASSED (NOMINAL)</div>
          <div className="text-3xl font-black font-mono text-emerald-400">{passed}</div>
          <div className="text-[10px] text-gray-500 mt-1">{total > 0 ? ((passed / total) * 100).toFixed(1) : 0}% Pass Rate</div>
        </div>

        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-400 font-bold uppercase mb-1">WARNINGS DETECTED</div>
          <div className="text-3xl font-black font-mono text-yellow-400">{warning}</div>
          <div className="text-[10px] text-gray-500 mt-1">Minor optical drift</div>
        </div>

        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-400 font-bold uppercase mb-1">CRITICAL FAULTS (FAIL)</div>
          <div className="text-3xl font-black font-mono text-red-400">{failed}</div>
          <div className="text-[10px] text-gray-500 mt-1">Immediate repair required</div>
        </div>
      </div>

      {/* Fault Locations Frequency & Brand Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Frequent Fault Locations */}
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-orange-400" />
            MOST FREQUENT FAULT LOCATIONS
          </h3>

          {Object.keys(faultLocations).length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs font-mono">No fault data available.</div>
          ) : (
            <div className="space-y-2 text-xs font-mono">
              {Object.entries(faultLocations).map(([loc, count]) => (
                <div key={loc} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-white font-bold">{loc}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded font-bold">
                      {count} Occurrences
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand Reliability Breakdown */}
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            BRAND RELIABILITY & PASS RATE
          </h3>

          {Object.keys(brandStats).length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs font-mono">No brand test records available.</div>
          ) : (
            <div className="space-y-2 text-xs font-mono">
              {Object.entries(brandStats).map(([b, st]) => {
                const pct = ((st.pass / st.total) * 100).toFixed(1);
                return (
                  <div key={b} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="text-white font-bold">{b}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{st.pass}/{st.total} Pass</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded font-bold">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
