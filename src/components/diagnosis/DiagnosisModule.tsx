/**
 * AI & Rule-Based Industrial Fault Diagnosis Module (Part 5A - 5F)
 * Location-First Optical Path Fault Detection & Step-by-Step Repair Guide
 */

import React from 'react';
import { 
  Stethoscope, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  FileText,
  Clock,
  Cpu,
  Zap,
  Activity
} from 'lucide-react';
import { DiagnosisReport } from '../../types';
import { downloadPdfReport } from '../../services/pdfReportService';

interface DiagnosisModuleProps {
  currentReport: DiagnosisReport | null;
  onNavigateToHistory: () => void;
}

export const DiagnosisModule: React.FC<DiagnosisModuleProps> = ({
  currentReport,
  onNavigateToHistory
}) => {
  if (!currentReport) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-8 shadow-xl">
          <Stethoscope className="w-12 h-12 text-orange-400 mx-auto mb-3 animate-pulse" />
          <h2 className="text-base font-bold text-white uppercase">NO ACTIVE DIAGNOSTIC REPORT SELECTED</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Please run a Live Test or select a saved report from History to view the complete location-first fault analysis.
          </p>
          <button
            onClick={onNavigateToHistory}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg inline-flex items-center gap-2"
          >
            <span>Open Test History & Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const {
    id,
    timestamp,
    brand,
    modelName,
    serialNumber,
    customerName,
    machineName,
    machineId,
    cycleName,
    moduleName,
    joint,
    overallStatus,
    healthScore,
    healthGrade,
    triggeredRules,
    primaryFaultLocation,
    evidenceSummary,
    probableCauses,
    repairSteps,
    nextTestRecommendation
  } = currentReport;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner Toolbar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded font-bold">
              REPORT ID: {id}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2 mt-1">
            <Stethoscope className="w-5 h-5 text-purple-400" />
            LOCATION-FIRST INDUSTRIAL DIAGNOSIS REPORT
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadPdfReport(currentReport)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download Industrial PDF</span>
          </button>
          <button
            onClick={onNavigateToHistory}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>View All Reports</span>
          </button>
        </div>
      </div>

      {/* HEALTH SCORE GAUGE & PRIMARY FAULT LOCATION BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Health Score Box */}
        <div className="lg:col-span-4 bg-[#1F2937] border border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
          <div className="text-xs text-gray-400 font-bold uppercase mb-2">SYSTEM HEALTH SCORE</div>

          <div
            className={`w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center my-2 shadow-2xl ${
              healthScore >= 85
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : healthScore >= 65
                ? 'border-yellow-500 text-yellow-400 bg-yellow-950/20'
                : 'border-red-500 text-red-400 bg-red-950/20'
            }`}
          >
            <span className="text-3xl font-black font-mono leading-none">{healthScore}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">/ 100</span>
          </div>

          <div className="mt-1">
            <span
              className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                healthScore >= 85
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : healthScore >= 65
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              GRADE: {healthGrade} ({overallStatus})
            </span>
          </div>
        </div>

        {/* Fault Location & Scope Banner */}
        <div className="lg:col-span-8 bg-[#1F2937] border border-gray-700 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <MapPin className="w-4 h-4" />
              ISOLATED OPTICAL FAULT LOCATION
            </div>

            <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-lg font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
              <span>{primaryFaultLocation}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
              <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                <span className="text-gray-400 block text-[10px]">SOURCE BRAND</span>
                <span className="font-bold text-white">{brand}</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                <span className="text-gray-400 block text-[10px]">MODEL NAME</span>
                <span className="font-bold text-white">{modelName}</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                <span className="text-gray-400 block text-[10px]">MODULE / JOINT</span>
                <span className="font-bold text-orange-400">{moduleName} ({joint})</span>
              </div>
              <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                <span className="text-gray-400 block text-[10px]">MACHINE ID</span>
                <span className="font-bold text-white">{machineId}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-800">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 font-mono">
              FINAL CONCLUSIVE DIAGNOSIS VERDICT:
            </span>
            <div className="p-2.5 bg-amber-950/40 border border-amber-500/50 rounded-lg text-xs font-mono font-bold text-amber-200">
              {evidenceSummary}
            </div>
          </div>
        </div>
      </div>

      {/* TRIGGERED INDUSTRIAL RULES LIST */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" />
          EXECUTED MASTER DIAGNOSTIC RULES
        </h3>

        <div className="space-y-3">
          {triggeredRules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                rule.severity === 'Critical'
                  ? 'bg-red-950/30 border-red-500/60 text-red-200'
                  : rule.severity === 'Major'
                  ? 'bg-yellow-950/30 border-yellow-500/60 text-yellow-200'
                  : 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
              }`}
            >
              <div className="flex justify-between items-center border-b border-gray-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-black/40 rounded font-mono font-bold">
                    {rule.id}
                  </span>
                  <span className="font-bold text-sm text-white">{rule.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span>Category: {rule.category}</span>
                  <span className="px-2 py-0.5 bg-black/40 rounded font-bold">
                    Confidence: {rule.confidence}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="font-bold block text-gray-400 text-[11px]">Condition Description:</span>
                  <p className="text-gray-200 font-mono mt-0.5">{rule.conditionDescription}</p>
                </div>
                <div>
                  <span className="font-bold block text-gray-400 text-[11px]">Rule Diagnosis Conclusion:</span>
                  <p className="text-white mt-0.5">{rule.diagnosisText}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROBABLE CAUSES RANKED BY CONFIDENCE */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          RANKED PROBABLE CAUSES (LIKELIHOOD ANALYSIS)
        </h3>

        <div className="space-y-2">
          {probableCauses.map((item, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-600/30 text-orange-400 font-bold font-mono text-xs flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="text-xs text-white font-medium">{item.cause}</span>
              </div>

              <div className="flex items-center gap-3 w-48">
                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{ width: `${item.probability}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-orange-400 w-10 text-right">
                  {item.probability}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECOMMENDED STEP-BY-STEP REPAIR ACTIONS */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          RECOMMENDED STEP-BY-STEP REPAIR PROCEDURE
        </h3>

        <div className="space-y-2 text-xs">
          {repairSteps.map((step, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-start gap-3">
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded font-mono font-bold">
                Step {idx + 1}
              </span>
              <span className="text-gray-200 mt-0.5 font-medium">{step}</span>
            </div>
          ))}
        </div>

        <div className="p-3 bg-orange-950/40 border border-orange-500/40 rounded-lg text-xs font-mono text-orange-300 font-bold flex items-center justify-between mt-3">
          <span>NEXT SUGGESTED TEST: {nextTestRecommendation}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
