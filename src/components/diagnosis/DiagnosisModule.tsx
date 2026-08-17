/**
 * AI & Rule-Based Industrial Fault Diagnosis Module
 * Offers 3 selectable Diagnosis Options:
 * 1. Rule-Based Expert Engine (My Rules / Master Rules)
 * 2. Google AI Diagnosis (Gemini Neural Engine)
 * 3. Dual Comparison View (Side-by-Side Comparison of Both Rules)
 */

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Download, 
  CheckCircle2, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  FileText,
  Zap,
  Activity,
  Bot,
  Cpu,
  Loader2,
  Sparkles,
  Columns,
  Check,
  HelpCircle
} from 'lucide-react';
import { DiagnosisReport } from '../../types';
import { downloadPdfReport, downloadDualPdfReport } from '../../services/pdfReportService';
import { generateGoogleAiDiagnosis } from '../../services/geminiService';

interface DiagnosisModuleProps {
  currentReport: DiagnosisReport | null;
  onNavigateToHistory: () => void;
}

export const DiagnosisModule: React.FC<DiagnosisModuleProps> = ({
  currentReport,
  onNavigateToHistory
}) => {
  const [selectedEngine, setSelectedEngine] = useState<'RULE_BASED' | 'GOOGLE_AI' | 'DUAL_VIEW'>('DUAL_VIEW');
  const [aiReport, setAiReport] = useState<DiagnosisReport | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Automatically trigger AI Diagnosis whenever report changes so both are instantly available
  useEffect(() => {
    if (!currentReport) return;
    
    // Reset AI report if base report changes
    setAiReport(null);
    runAiDiagnosis(currentReport);
  }, [currentReport?.id]);

  const runAiDiagnosis = async (base: DiagnosisReport) => {
    setIsGeneratingAi(true);
    try {
      const result = await generateGoogleAiDiagnosis(base);
      setAiReport(result);
    } catch (err) {
      console.error('Failed to generate Google AI diagnosis:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

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

  // Prepared Reports for both engines
  const ruleReport: DiagnosisReport = { ...currentReport, engineType: 'RULE_BASED' };
  const resolvedAiReport: DiagnosisReport = aiReport || { ...currentReport, engineType: 'GOOGLE_AI' };

  // Active single report when not in DUAL_VIEW
  const activeReport: DiagnosisReport = selectedEngine === 'GOOGLE_AI' ? resolvedAiReport : ruleReport;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 text-white">
      {/* Top Banner Toolbar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded font-bold">
              REPORT ID: {currentReport.id}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {new Date(currentReport.timestamp).toLocaleString()}
            </span>
          </div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2 mt-1">
            <Stethoscope className="w-5 h-5 text-purple-400" />
            INDUSTRIAL DIAGNOSIS RESULT (MY RULES & GOOGLE AI)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedEngine === 'DUAL_VIEW' ? (
            <button
              onClick={() => downloadDualPdfReport(ruleReport, resolvedAiReport)}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download Dual Diagnosis PDF</span>
            </button>
          ) : (
            <button
              onClick={() => downloadPdfReport(activeReport)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download {selectedEngine === 'GOOGLE_AI' ? 'Google AI' : 'Rule-Based'} PDF</span>
            </button>
          )}

          <button
            onClick={onNavigateToHistory}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>View All Reports</span>
          </button>
        </div>
      </div>

      {/* 3 DIAGNOSIS ENGINE OPTIONS TOGGLE SELECTOR */}
      <div className="bg-[#111827] border border-cyan-500/40 rounded-xl p-3 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                SELECT DIAGNOSIS VIEW MODE
              </span>
              <span className="text-[11px] text-gray-400">
                Compare results calculated by your Rule-Based Expert Engine against Google AI (Gemini) Rules
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-gray-900 p-1 rounded-lg border border-gray-800 w-full lg:w-auto">
            <button
              onClick={() => setSelectedEngine('RULE_BASED')}
              className={`px-3 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                selectedEngine === 'RULE_BASED'
                  ? 'bg-orange-600 text-white shadow-lg border border-orange-400/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-orange-300" />
              <span>1. My Rule-Based Result</span>
            </button>

            <button
              onClick={() => setSelectedEngine('GOOGLE_AI')}
              className={`px-3 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                selectedEngine === 'GOOGLE_AI'
                  ? 'bg-purple-600 text-white shadow-lg border border-purple-400/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-300" />
              <span>2. Google AI Result</span>
              <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
            </button>

            <button
              onClick={() => setSelectedEngine('DUAL_VIEW')}
              className={`px-3 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                selectedEngine === 'DUAL_VIEW'
                  ? 'bg-gradient-to-r from-orange-600 to-purple-600 text-white shadow-lg border border-cyan-400/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-cyan-300" />
              <span>3. Dual Side-by-Side View</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI GENERATING SPINNER BANNER */}
      {isGeneratingAi && (
        <div className="bg-purple-950/40 border border-purple-500/50 p-3 rounded-xl flex items-center gap-3 text-purple-200 text-xs">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
          <span className="font-mono font-bold">
            Google AI (Gemini) is analyzing optical parameters, joint delta reflection, and thermal characteristics...
          </span>
        </div>
      )}

      {/* DUAL COMPARISON VIEW (SIDE-BY-SIDE) */}
      {selectedEngine === 'DUAL_VIEW' ? (
        <div className="space-y-4">
          {/* Comparison Header Summary */}
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-bold">
                METADATA
              </span>
              <span className="text-gray-300">
                Machine: <strong className="text-white">{currentReport.brand} {currentReport.modelName}</strong> ({currentReport.machineId})
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">
                Module/Joint: <strong className="text-orange-400">{currentReport.moduleName} ({currentReport.joint})</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <span>Agreement Status:</span>
              {ruleReport.primaryFaultLocation === resolvedAiReport.primaryFaultLocation ? (
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> High Agreement (Same Fault Location)
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-yellow-950 text-yellow-400 border border-yellow-800 rounded font-bold flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Alternative Perspective Detected
                </span>
              )}
            </div>
          </div>

          {/* Side by Side Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT COLUMN: MY RULE-BASED DIAGNOSIS */}
            <div className="bg-[#1F2937] border-2 border-orange-500/40 rounded-xl p-4 space-y-4 shadow-xl relative">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <h3 className="text-sm font-bold text-orange-300 uppercase tracking-wider">
                    1. MY RULE-BASED DIAGNOSIS (EXPERT ENGINE)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 bg-orange-950/80 text-orange-400 border border-orange-800 text-[10px] font-mono font-bold rounded">
                  USER RULES
                </span>
              </div>

              {/* Score & Fault location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">HEALTH SCORE</span>
                  <span className="text-2xl font-black font-mono text-orange-400 mt-1">{ruleReport.healthScore}/100</span>
                  <span className="text-[10px] font-bold text-gray-300">{ruleReport.healthGrade}</span>
                </div>

                <div className="sm:col-span-2 bg-gray-900 p-3 rounded-lg border border-gray-800 flex flex-col justify-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-400" /> ISOLATED FAULT LOCATION
                  </span>
                  <span className="text-xs font-bold text-white mt-1 leading-snug">{ruleReport.primaryFaultLocation}</span>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 font-bold">STATUS: {ruleReport.overallStatus}</span>
                </div>
              </div>

              {/* Verdict */}
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-1">
                <span className="text-[10px] text-orange-400 font-bold uppercase block">RULE ENGINE VERDICT:</span>
                <p className="text-xs text-gray-200 font-mono leading-relaxed">{ruleReport.evidenceSummary}</p>
              </div>

              {/* Triggered Rules */}
              <div className="space-y-2">
                <span className="text-[11px] text-gray-300 font-bold uppercase block">EXECUTED MASTER RULES ({ruleReport.triggeredRules.length}):</span>
                {ruleReport.triggeredRules.map((rule, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-900 rounded border border-gray-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-orange-400 font-bold text-[11px]">
                      <span>[{rule.id}] {rule.name}</span>
                      <span>{rule.confidence}% Conf.</span>
                    </div>
                    <p className="text-gray-300 text-[11px]">{rule.diagnosisText}</p>
                  </div>
                ))}
              </div>

              {/* Probable Causes */}
              <div className="space-y-2">
                <span className="text-[11px] text-gray-300 font-bold uppercase block">RANKED PROBABLE CAUSES:</span>
                <div className="space-y-1.5">
                  {ruleReport.probableCauses.map((item, idx) => (
                    <div key={idx} className="bg-gray-900 p-2 rounded border border-gray-800 flex justify-between items-center text-xs">
                      <span className="text-gray-200 font-medium">#{idx + 1} {item.cause}</span>
                      <span className="font-mono font-bold text-orange-400">{item.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repair Steps */}
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <span className="text-[11px] text-gray-300 font-bold uppercase block">RECOMMENDED REPAIR PROCEDURE:</span>
                <div className="space-y-1 text-xs font-mono">
                  {ruleReport.repairSteps.map((step, idx) => (
                    <div key={idx} className="bg-gray-900 p-2 rounded border border-gray-800 text-gray-300">
                      Step {idx + 1}: {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: GOOGLE AI DIAGNOSIS */}
            <div className="bg-[#1F2937] border-2 border-purple-500/40 rounded-xl p-4 space-y-4 shadow-xl relative">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                    2. GOOGLE AI DIAGNOSIS (GEMINI NEURAL)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-800 text-[10px] font-mono font-bold rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" /> GEMINI AI
                </span>
              </div>

              {/* Score & Fault location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">AI HEALTH SCORE</span>
                  <span className="text-2xl font-black font-mono text-purple-400 mt-1">{resolvedAiReport.healthScore}/100</span>
                  <span className="text-[10px] font-bold text-gray-300">{resolvedAiReport.healthGrade}</span>
                </div>

                <div className="sm:col-span-2 bg-gray-900 p-3 rounded-lg border border-gray-800 flex flex-col justify-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-400" /> ISOLATED FAULT LOCATION
                  </span>
                  <span className="text-xs font-bold text-white mt-1 leading-snug">{resolvedAiReport.primaryFaultLocation}</span>
                  <span className="text-[10px] text-purple-300 font-mono mt-1 font-bold">STATUS: {resolvedAiReport.overallStatus}</span>
                </div>
              </div>

              {/* AI Verdict & Physics Breakdown */}
              <div className="bg-purple-950/20 p-3 rounded-lg border border-purple-900/50 space-y-1.5">
                <span className="text-[10px] text-purple-300 font-bold uppercase block">GOOGLE AI VERDICT & PHYSICS BREAKDOWN:</span>
                <p className="text-xs text-purple-100 font-mono leading-relaxed">{resolvedAiReport.evidenceSummary}</p>
                {resolvedAiReport.aiExplanation && (
                  <p className="text-[11px] text-purple-200/80 font-mono pt-1.5 border-t border-purple-900/40">
                    {resolvedAiReport.aiExplanation}
                  </p>
                )}
              </div>

              {/* Evaluated Rules */}
              <div className="space-y-2">
                <span className="text-[11px] text-gray-300 font-bold uppercase block">AI EVALUATED RULES ({resolvedAiReport.triggeredRules.length}):</span>
                {resolvedAiReport.triggeredRules.map((rule, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-900 rounded border border-gray-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-purple-300 font-bold text-[11px]">
                      <span>[{rule.id}] {rule.name}</span>
                      <span>{rule.confidence}% Conf.</span>
                    </div>
                    <p className="text-gray-300 text-[11px]">{rule.diagnosisText}</p>
                  </div>
                ))}
              </div>

              {/* Probable Causes */}
              <div className="space-y-2">
                <span className="text-[11px] text-gray-300 font-bold uppercase block">RANKED PROBABLE CAUSES:</span>
                <div className="space-y-1.5">
                  {resolvedAiReport.probableCauses.map((item, idx) => (
                    <div key={idx} className="bg-gray-900 p-2 rounded border border-gray-800 flex justify-between items-center text-xs">
                      <span className="text-gray-200 font-medium">#{idx + 1} {item.cause}</span>
                      <span className="font-mono font-bold text-purple-400">{item.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repair Steps */}
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <span className="text-[11px] text-gray-300 font-bold uppercase block">RECOMMENDED REPAIR PROCEDURE:</span>
                <div className="space-y-1 text-xs font-mono">
                  {resolvedAiReport.repairSteps.map((step, idx) => (
                    <div key={idx} className="bg-gray-900 p-2 rounded border border-gray-800 text-gray-300">
                      Step {idx + 1}: {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE ENGINE DETAILED VIEW */
        <div className="space-y-4">
          {/* HEALTH SCORE GAUGE & PRIMARY FAULT LOCATION BANNER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Health Score Box */}
            <div className="lg:col-span-4 bg-[#1F2937] border border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
              <div className="text-xs text-gray-400 font-bold uppercase mb-2">
                {selectedEngine === 'GOOGLE_AI' ? 'GOOGLE AI HEALTH SCORE' : 'SYSTEM HEALTH SCORE'}
              </div>

              <div
                className={`w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center my-2 shadow-2xl ${
                  activeReport.healthScore >= 85
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : activeReport.healthScore >= 65
                    ? 'border-yellow-500 text-yellow-400 bg-yellow-950/20'
                    : 'border-red-500 text-red-400 bg-red-950/20'
                }`}
              >
                <span className="text-3xl font-black font-mono leading-none">{activeReport.healthScore}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">/ 100</span>
              </div>

              <div className="mt-1">
                <span
                  className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                    activeReport.healthScore >= 85
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : activeReport.healthScore >= 65
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  GRADE: {activeReport.healthGrade} ({activeReport.overallStatus})
                </span>
              </div>
            </div>

            {/* Fault Location & Scope Banner */}
            <div className="lg:col-span-8 bg-[#1F2937] border border-gray-700 rounded-xl p-5 flex flex-col justify-between shadow-xl">
              <div>
                <div className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <MapPin className="w-4 h-4" />
                  ISOLATED OPTICAL FAULT LOCATION ({selectedEngine === 'GOOGLE_AI' ? 'GOOGLE AI NEURAL INFERENCE' : 'RULE-BASED EXPERT ENGINE'})
                </div>

                <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-lg font-bold text-white flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <span>{activeReport.primaryFaultLocation}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
                  <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">SOURCE BRAND</span>
                    <span className="font-bold text-white">{activeReport.brand}</span>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">MODEL NAME</span>
                    <span className="font-bold text-white">{activeReport.modelName}</span>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">MODULE / JOINT</span>
                    <span className="font-bold text-orange-400">{activeReport.moduleName} ({activeReport.joint})</span>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">MACHINE ID</span>
                    <span className="font-bold text-white">{activeReport.machineId}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-800">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 font-mono">
                  FINAL CONCLUSIVE DIAGNOSIS VERDICT ({selectedEngine === 'GOOGLE_AI' ? 'GOOGLE AI' : 'RULE-BASED'}):
                </span>
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/50 rounded-lg text-xs font-mono font-bold text-amber-200">
                  {activeReport.evidenceSummary}
                </div>
              </div>
            </div>
          </div>

          {/* GOOGLE AI DETAILED EXPLANATION BREAKDOWN */}
          {selectedEngine === 'GOOGLE_AI' && activeReport.aiExplanation && (
            <div className="bg-purple-950/20 border border-purple-500/40 rounded-xl p-4 shadow-xl space-y-2">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                GOOGLE AI OPTICAL PHYSICS INSIGHT & MECHANISM BREAKDOWN
              </h3>
              <p className="text-xs text-purple-100 font-mono leading-relaxed bg-gray-900/80 p-3 rounded-lg border border-purple-900/50">
                {activeReport.aiExplanation}
              </p>
            </div>
          )}

          {/* TRIGGERED INDUSTRIAL RULES LIST */}
          <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400" />
              {selectedEngine === 'GOOGLE_AI' ? 'GOOGLE AI EVALUATED OPTICAL RULES' : 'EXECUTED MASTER DIAGNOSTIC RULES'}
            </h3>

            <div className="space-y-3">
              {activeReport.triggeredRules.map((rule, rIdx) => (
                <div
                  key={rule.id || rIdx}
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
                      <span className="font-bold block text-gray-400 text-[11px]">Diagnosis Conclusion:</span>
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
              RANKED PROBABLE CAUSES ({selectedEngine === 'GOOGLE_AI' ? 'GOOGLE AI LIKELIHOOD ANALYSIS' : 'RULE-BASED LIKELIHOOD ANALYSIS'})
            </h3>

            <div className="space-y-2">
              {activeReport.probableCauses.map((item, idx) => (
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
              RECOMMENDED STEP-BY-STEP REPAIR PROCEDURE ({selectedEngine === 'GOOGLE_AI' ? 'GOOGLE AI RECOMMENDED' : 'MASTER RULES RECOMMENDED'})
            </h3>

            <div className="space-y-2 text-xs">
              {activeReport.repairSteps.map((step, idx) => (
                <div key={idx} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-start gap-3">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded font-mono font-bold">
                    Step {idx + 1}
                  </span>
                  <span className="text-gray-200 mt-0.5 font-medium">{step}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-orange-950/40 border border-orange-500/40 rounded-lg text-xs font-mono text-orange-300 font-bold flex items-center justify-between mt-3">
              <span>NEXT SUGGESTED TEST: {activeReport.nextTestRecommendation}</span>
              <button
                onClick={() => downloadPdfReport(activeReport)}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded font-sans text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Selected ({selectedEngine === 'GOOGLE_AI' ? 'Google AI' : 'Rule-Based'}) PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
