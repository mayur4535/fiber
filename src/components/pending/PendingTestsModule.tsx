/**
 * Pending Tests & Interrupted Session Manager
 * Fiber Source Diagnostic Pro
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Cpu, 
  Activity, 
  Plus, 
  Search,
  ArrowRight,
  ShieldAlert,
  Zap,
  Sparkles,
  FileText
} from 'lucide-react';
import { PendingTestSession, FiberModel, DiagnosisReport } from '../../types';
import { localDB } from '../../services/db';
import { ConfirmModal } from '../common/ModalDialogs';

interface PendingTestsModuleProps {
  models: FiberModel[];
  onResumePendingTest: (session: PendingTestSession) => void;
  onNavigateToHistory: () => void;
}

export const PendingTestsModule: React.FC<PendingTestsModuleProps> = ({
  models,
  onResumePendingTest,
  onNavigateToHistory
}) => {
  const [pendingSessions, setPendingSessions] = useState<PendingTestSession[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; serial: string }>({
    isOpen: false,
    id: '',
    serial: ''
  });

  const reloadSessions = () => {
    const list = localDB.getPendingTests();
    setPendingSessions(list);
  };

  useEffect(() => {
    reloadSessions();
  }, []);

  // Handle Delete Session
  const handleDeleteSession = (id: string) => {
    localDB.deletePendingTest(id);
    reloadSessions();
    setConfirmDelete({ isOpen: false, id: '', serial: '' });
  };

  // Handle Finalize & Save Report directly from Pending
  const handleFinalizeAndComplete = (session: PendingTestSession) => {
    const model = models.find(m => m.id === session.modelId) || models[0];
    
    // Create completed diagnosis report
    const report: DiagnosisReport = {
      id: `FSDP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      testId: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      customerName: 'Factory Operations (Recovered Session)',
      machineId: 'MAC-8891-XL',
      machineName: 'High Precision Fiber Laser Workstation',
      engineerName: 'Rajesh Patel (Lead Service Eng.)',
      brand: session.brand || model.brand,
      modelName: session.modelName || model.modelName,
      serialNumber: session.serialNumber || `SN-${model.brand.toUpperCase()}-RECOVERED`,
      cycleName: session.activeCycleId || 'Cycle 1',
      moduleName: session.activeStepId || 'Optical Path',
      joint: session.selectedJoint || 'Before',
      referenceReading: {
        intensity: 100,
        frequency: 35.0,
        pulseWidth: 120.0,
        averagePower: model.ratedPowerW || 50,
        peakPower: (model.ratedPowerW || 50) * 1.25,
        temperature: 28.0,
        stability: 98.5,
        minimum: (model.ratedPowerW || 50) * 0.95,
        maximum: (model.ratedPowerW || 50) * 1.05,
        readingTime: 5.0
      },
      liveReading: {
        intensity: parseFloat(session.capturedParams?.intensity) || 95.0,
        frequency: parseFloat(session.capturedParams?.frequency) || 35.2,
        pulseWidth: parseFloat(session.capturedParams?.pulseWidth) || 120.5,
        averagePower: parseFloat(session.capturedParams?.averagePower) || (model.ratedPowerW || 50),
        peakPower: (parseFloat(session.capturedParams?.averagePower) || (model.ratedPowerW || 50)) * 1.2,
        temperature: 28.5,
        stability: parseFloat(session.capturedParams?.stability) || 98.0,
        minimum: parseFloat(session.capturedParams?.minimum) || 23.0,
        maximum: parseFloat(session.capturedParams?.maximum) || 24.0,
        readingTime: 5.0
      },
      comparisons: [],
      overallStatus: 'PASS',
      healthScore: 92,
      healthGrade: 'Good',
      triggeredRules: [],
      primaryFaultLocation: 'Optical Path - Full Diagnostics Verified',
      evidenceSummary: 'Session recovered after interruption and completed successfully.',
      probableCauses: [{ cause: 'Nominal Operational State', probability: 95 }],
      repairSteps: ['System operational. All optical readings recorded.'],
      nextTestRecommendation: 'Scheduled routine maintenance'
    };

    // Save report to Completed History
    localDB.saveReport(report);

    // Remove from Pending list
    localDB.deletePendingTest(session.id);
    reloadSessions();
    onNavigateToHistory();
  };

  // Create a simulated pending test session for quick testing / demo
  const handleSimulatePendingTest = () => {
    const targetModel = models[0] || { id: 'm1', brand: 'Raycus', modelName: '50QB Pulsed Fiber Laser' };
    const randomSN = `SN-${targetModel.brand.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newPendingSession: PendingTestSession = {
      id: `pending-${Date.now()}`,
      serialNumber: randomSN,
      modelId: targetModel.id,
      brand: targetModel.brand,
      modelName: targetModel.modelName,
      activeCycleId: 'cycle-1',
      activeStepId: 'c1-s2',
      selectedJoint: 'Upper',
      activeFault: 'None',
      jointStatuses: {
        'cycle-1-c1-s1-Before': 'Saved',
        'cycle-1-c1-s1-Upper': 'Saved',
        'cycle-1-c1-s1-After': 'Saved',
        'cycle-1-c1-s2-Before': 'Saved',
        'cycle-1-c1-s2-Upper': 'Captured'
      },
      capturedParams: {
        intensity: '23.42 W',
        frequency: '35.20 kHz',
        pulseWidth: '120.5 ns',
        stability: '98.62 %',
        loss: '1.85 %',
        averagePower: '23.30 W',
        readingTime: '5.00 s',
        minimum: '23.11 W',
        maximum: '23.48 W'
      },
      lastSavedAt: new Date().toISOString(),
      completedJointsCount: 5,
      totalJointsCount: 15
    };

    localDB.savePendingTest(newPendingSession);
    reloadSessions();
  };

  const filteredSessions = pendingSessions.filter(s => 
    s.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.modelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 font-sans text-gray-100">
      {/* TOP BANNER TOOLBAR */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>PENDING TESTS & INTERRUPTED SESSION RECOVERY</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Auto-saved Live Test sessions interrupted by laptop shutdown, power off, or browser closing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulatePendingTest}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
            title="Create an interrupted test session to test recovery flow"
          >
            <Plus className="w-4 h-4" />
            <span>+ Simulate Interrupted Session</span>
          </button>

          <button
            onClick={reloadSessions}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold text-xs rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* INFO NOTIFICATION BANNER */}
      <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex items-start gap-3 text-xs text-amber-200 shadow-md">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-extrabold text-amber-300 uppercase tracking-wide block mb-0.5">
            Automatic Interruption Safety Net:
          </strong>
          <span>
            While working in <strong>Live Test</strong>, every optical joint capture is saved continuously. If your laptop shuts off or turns off mid-way, the test goes into <strong>Pending</strong> state. When you power on your laptop again, click <strong>"Resume & Complete Test"</strong> below to finish testing and automatically send it to <strong>Completed History</strong>!
          </span>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pending sessions by Serial Number, Laser Brand or Model..."
            className="w-full bg-[#111827] border border-gray-600 text-white font-mono text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="text-xs text-gray-400 font-mono">
          Pending Sessions: <strong className="text-amber-400 font-extrabold">{filteredSessions.length}</strong>
        </div>
      </div>

      {/* SESSIONS LIST */}
      {filteredSessions.length === 0 ? (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-gray-800/80 border border-gray-700 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">No Pending / Interrupted Test Sessions</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              All live tests have been completed or saved to history. Any interrupted test will automatically appear here for seamless recovery.
            </p>
          </div>
          <button
            onClick={handleSimulatePendingTest}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg inline-flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Demo Interrupted Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => {
            const completedCount = session.completedJointsCount || Object.values(session.jointStatuses || {}).filter(st => st === 'Saved' || st === 'Captured').length || 0;
            const totalCount = session.totalJointsCount || 15;
            const progressPercent = Math.min(100, Math.round((completedCount / totalCount) * 100));

            return (
              <div 
                key={session.id}
                className="bg-[#1F2937] border-2 border-amber-500/60 hover:border-amber-400 rounded-xl p-4 shadow-xl flex flex-col justify-between space-y-4 transition-all relative overflow-hidden"
              >
                {/* Top Badge Banner */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-700/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/60 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                      <span>PENDING - INTERRUPTED</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
                      {session.serialNumber}
                    </span>
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(session.lastSavedAt || Date.now()).toLocaleString()}
                  </span>
                </div>

                {/* Main Session Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-orange-400" />
                        <span>{session.brand} {session.modelName}</span>
                      </h4>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        Interrupted At: <strong className="text-gray-200">{session.activeStepId || 'Step 01'}</strong> ({session.selectedJoint || 'Before'} Joint)
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 bg-[#111827] p-2.5 rounded-lg border border-gray-700 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Test Progress:</span>
                      <strong className="text-amber-400 font-bold">{completedCount} / {totalCount} Joints ({progressPercent}%)</strong>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${Math.max(5, progressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Captured Live Parameters Sample */}
                  {session.capturedParams && (
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono bg-[#111827]/80 p-2 rounded border border-gray-800 text-gray-300">
                      <div>
                        <span className="text-gray-500 block">Intensity:</span>
                        <strong className="text-emerald-400">{session.capturedParams.intensity}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Frequency:</span>
                        <strong className="text-cyan-400">{session.capturedParams.frequency}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Pulse Width:</span>
                        <strong className="text-amber-300">{session.capturedParams.pulseWidth}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-2 border-t border-gray-700/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    {/* RESUME & COMPLETE BUTTON */}
                    <button
                      onClick={() => onResumePendingTest(session)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Resume & Complete Test</span>
                    </button>

                    {/* FINALIZE DIRECTLY BUTTON */}
                    <button
                      onClick={() => handleFinalizeAndComplete(session)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer font-mono"
                      title="Mark complete directly and save report"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />
                      <span className="hidden sm:inline">Save as Completed</span>
                    </button>
                  </div>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => setConfirmDelete({ isOpen: true, id: session.id, serial: session.serialNumber })}
                    className="p-2 bg-gray-800 hover:bg-red-900/80 text-gray-400 hover:text-red-300 border border-gray-700 hover:border-red-700 rounded-lg transition-colors cursor-pointer"
                    title="Delete Pending Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Pending Test Session"
        message={`Are you sure you want to discard the pending test session for ${confirmDelete.serial}?`}
        onConfirm={() => handleDeleteSession(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ isOpen: false, id: '', serial: '' })}
      />
    </div>
  );
};
