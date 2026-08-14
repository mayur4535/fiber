/**
 * Golden Reference Reading Engine
 * Complete Brand > Model > Cycle > Module hierarchy management with
 * Add, Edit (Rename), Delete operations for Cycles and Modules,
 * along with Live ESP32 Capture and Manual Entry for Golden Reference readings.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Database, 
  Cpu, 
  Edit3, 
  Save, 
  CheckCircle, 
  ChevronRight, 
  Box, 
  Layers, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Filter, 
  FolderPlus,
  Zap,
  Activity,
  Sun,
  BarChart2,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle
} from 'lucide-react';
import { 
  FiberModel, 
  FiberCycle, 
  FiberModule, 
  JointType, 
  ReadingParameters, 
  JointReading,
  LaserBrand 
} from '../../types';
import { esp32Service } from '../../services/esp32Service';
import { localDB } from '../../services/db';
import { ConfirmModal, PromptModal } from '../common/ModalDialogs';

interface ReferenceReadingModuleProps {
  activeModel: FiberModel;
  models: FiberModel[];
  onModelUpdated: (updatedModel: FiberModel) => void;
  onSelectModel: (model: FiberModel) => void;
}

export const ReferenceReadingModule: React.FC<ReferenceReadingModuleProps> = ({
  activeModel,
  models,
  onModelUpdated,
  onSelectModel
}) => {
  // Brand Filter & Selection
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

  // Hierarchy Selection States
  const [selectedCycleId, setSelectedCycleId] = useState<string>(activeModel.cycles[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(activeModel.cycles[0]?.modules[0]?.id || '');
  const [activeJoint, setActiveJoint] = useState<JointType>('Before');

  // Cycle Inline Editing State
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editingCycleName, setEditingCycleName] = useState<string>('');

  // Module Inline Editing State
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleName, setEditingModuleName] = useState<string>('');

  // Modals for Add Cycle and Add Module
  const [showAddCycleModal, setShowAddCycleModal] = useState<boolean>(false);
  const [newCycleName, setNewCycleName] = useState<string>('');

  const [showAddModuleModal, setShowAddModuleModal] = useState<boolean>(false);
  const [targetCycleIdForModule, setTargetCycleIdForModule] = useState<string>('');
  const [newModuleName, setNewModuleName] = useState<string>('');
  const [newModuleType, setNewModuleType] = useState<FiberModule['moduleType']>('Pump');

  // Custom Dialog Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    defaultValue?: string;
    onSave: (val: string) => void;
  }>({ isOpen: false, title: '', defaultValue: '', onSave: () => {} });

  // Reading Capture & Manual Parameter State (7 required metrics)
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureCountdown, setCaptureCountdown] = useState<number>(0);
  const samplesReceivedRef = useRef<boolean>(false);
  const processedCaptureIdsRef = useRef<Set<string>>(new Set());
  const captureSourceRef = useRef<'PC_BUTTON' | 'GPIO5_SWITCH'>('PC_BUTTON');

  const [capturedParams, setCapturedParams] = useState<ReadingParameters>({
    intensity: 99.5,
    averagePower: activeModel.ratedPowerW || 50,
    loss: 0.0,
    stability: 99.5,
    minimum: Number(((activeModel.ratedPowerW || 50) * 0.98).toFixed(1)),
    maximum: Number(((activeModel.ratedPowerW || 50) * 1.02).toFixed(1)),
    tolerance: 2.0,
    readingTime: 5.0
  });

  // Filter models by selected brand
  const filteredModels = selectedBrand === 'All' 
    ? models 
    : models.filter(m => m.brand === selectedBrand);

  const currentCycle = activeModel.cycles.find((c) => c.id === selectedCycleId) || activeModel.cycles[0];
  const currentModule = currentCycle?.modules.find((m) => m.id === selectedModuleId) || currentCycle?.modules[0];

  // Auto-sync selection if activeModel changes
  useEffect(() => {
    if (activeModel.cycles.length > 0) {
      const cycle = activeModel.cycles.find(c => c.id === selectedCycleId) || activeModel.cycles[0];
      setSelectedCycleId(cycle.id);
      if (cycle.modules.length > 0) {
        const mod = cycle.modules.find(m => m.id === selectedModuleId) || cycle.modules[0];
        setSelectedModuleId(mod.id);
      } else {
        setSelectedModuleId('');
      }
    }
  }, [activeModel.id]);

  // Load existing saved reference data when changing module or joint
  useEffect(() => {
    if (currentModule) {
      const existingJointData =
        activeJoint === 'Before'
          ? currentModule.reference.before
          : activeJoint === 'Upper'
          ? currentModule.reference.upper
          : currentModule.reference.after;

      if (existingJointData && existingJointData.parameters) {
        setCapturedParams({ ...existingJointData.parameters });
      } else {
        const power = activeModel.ratedPowerW || 50;
        setCapturedParams({
          intensity: 99.0,
          averagePower: power,
          loss: 1.5,
          stability: 99.2,
          minimum: Number((power * 0.98).toFixed(1)),
          maximum: Number((power * 1.02).toFixed(1)),
          tolerance: 2.0,
          readingTime: 5.0
        });
      }
    }
  }, [selectedModuleId, activeJoint, activeModel.id]);

  // ==========================================
  // CYCLE OPERATIONS: ADD, EDIT/RENAME, DELETE
  // ==========================================

  const handleOpenAddCycleModal = () => {
    setNewCycleName(`Cycle ${activeModel.cycles.length + 1} - Main Circuit`);
    setShowAddCycleModal(true);
  };

  const handleConfirmAddCycle = () => {
    if (!newCycleName.trim()) {
      alert('Cycle Name is required.');
      return;
    }

    const newCycle: FiberCycle = {
      id: `cycle-${Date.now()}`,
      name: newCycleName.trim(),
      displayOrder: activeModel.cycles.length + 1,
      modules: [
        {
          id: `mod-${Date.now()}-1`,
          name: `${newCycleName.trim()} Stage 1`,
          moduleType: 'Other',
          opticalPosition: 1,
          reference: { isComplete: false, status: 'Pending' }
        }
      ]
    };

    const updatedModel: FiberModel = {
      ...activeModel,
      cycles: [...activeModel.cycles, newCycle],
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    onModelUpdated(updatedModel);
    setSelectedCycleId(newCycle.id);
    if (newCycle.modules.length > 0) {
      setSelectedModuleId(newCycle.modules[0].id);
    }
    setShowAddCycleModal(false);
    setNewCycleName('');
  };

  // Start Rename Cycle
  const handleStartRenameCycle = (cycle: FiberCycle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCycleId(cycle.id);
    setEditingCycleName(cycle.name);
  };

  // Save Rename Cycle
  const handleSaveCycleRename = (cycleId: string) => {
    if (!editingCycleName.trim()) return;

    const updatedCycles = activeModel.cycles.map(c => 
      c.id === cycleId ? { ...c, name: editingCycleName.trim() } : c
    );

    const updatedModel: FiberModel = {
      ...activeModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    onModelUpdated(updatedModel);
    setEditingCycleId(null);
  };

  // Delete Cycle
  const handleDeleteCycle = (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeModel.cycles.length <= 1) {
      alert('Cannot delete the last cycle of a model.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Cycle',
      message: 'Delete this cycle and all its optical modules & reference readings?',
      onConfirm: () => {
        const updatedCycles = activeModel.cycles.filter(c => c.id !== cycleId);
        const updatedModel: FiberModel = {
          ...activeModel,
          cycles: updatedCycles,
          modifiedDate: new Date().toISOString()
        };

        localDB.saveModel(updatedModel);
        onModelUpdated(updatedModel);

        if (updatedCycles.length > 0) {
          setSelectedCycleId(updatedCycles[0].id);
          if (updatedCycles[0].modules.length > 0) {
            setSelectedModuleId(updatedCycles[0].modules[0].id);
          }
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ==========================================
  // MODULE OPERATIONS: ADD, EDIT/RENAME, DELETE
  // ==========================================

  const handleOpenAddModuleModal = (cycleId?: string) => {
    const targetId = cycleId || currentCycle?.id || activeModel.cycles[0]?.id || '';
    setTargetCycleIdForModule(targetId);
    setNewModuleName(`Optical Stage ${Date.now().toString().slice(-4)}`);
    setNewModuleType('Pump');
    setShowAddModuleModal(true);
  };

  const handleConfirmAddModule = () => {
    if (!newModuleName.trim()) {
      alert('Module Name is required.');
      return;
    }

    const cid = targetCycleIdForModule || currentCycle?.id || activeModel.cycles[0]?.id;
    if (!cid) {
      alert('No cycle selected to add module to.');
      return;
    }

    const targetCycle = activeModel.cycles.find(c => c.id === cid);
    if (!targetCycle) return;

    const newModule: FiberModule = {
      id: `mod-${Date.now()}`,
      name: newModuleName.trim(),
      moduleType: newModuleType,
      opticalPosition: targetCycle.modules.length + 1,
      reference: { isComplete: false, status: 'Pending' }
    };

    const updatedCycles = activeModel.cycles.map(c => {
      if (c.id === cid) {
        return { ...c, modules: [...c.modules, newModule] };
      }
      return c;
    });

    const updatedModel: FiberModel = {
      ...activeModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    onModelUpdated(updatedModel);
    setSelectedCycleId(cid);
    setSelectedModuleId(newModule.id);
    setShowAddModuleModal(false);
    setNewModuleName('');
  };

  // Start Rename Module
  const handleStartRenameModule = (mod: FiberModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModuleId(mod.id);
    setEditingModuleName(mod.name);
  };

  // Save Rename Module
  const handleSaveModuleRename = (modId: string) => {
    if (!editingModuleName.trim() || !currentCycle) return;

    const updatedModules = currentCycle.modules.map(m => 
      m.id === modId ? { ...m, name: editingModuleName.trim() } : m
    );

    const updatedCycles = activeModel.cycles.map(c => 
      c.id === currentCycle.id ? { ...c, modules: updatedModules } : c
    );

    const updatedModel: FiberModel = {
      ...activeModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    onModelUpdated(updatedModel);
    setEditingModuleId(null);
  };

  // Delete Module
  const handleDeleteModule = (modId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCycle) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Module',
      message: 'Delete this optical module and its saved reference data?',
      onConfirm: () => {
        const updatedModules = currentCycle.modules.filter(m => m.id !== modId);
        const updatedCycles = activeModel.cycles.map(c => 
          c.id === currentCycle.id ? { ...c, modules: updatedModules } : c
        );

        const updatedModel: FiberModel = {
          ...activeModel,
          cycles: updatedCycles,
          modifiedDate: new Date().toISOString()
        };

        localDB.saveModel(updatedModel);
        onModelUpdated(updatedModel);

        if (updatedModules.length > 0) {
          setSelectedModuleId(updatedModules[0].id);
        } else {
          setSelectedModuleId('');
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Process 100 raw samples received from verified ESP32
  const processReferenceSamples = useCallback((samples: number[], readingTimeSec: number = 5.0) => {
    if (!Array.isArray(samples) || samples.length === 0 || samplesReceivedRef.current) return;

    // Validate 100 numeric samples
    const validSamples = samples.map(s => Number(s)).filter(s => !isNaN(s));
    const count = validSamples.length;

    // Calculate arithmetic mean: SUM(samples) / 100
    const sum = validSamples.reduce((acc, v) => acc + v, 0);
    const avg = count > 0 ? sum / count : 0;

    const minVal = count > 0 ? Math.min(...validSamples) : 0;
    const maxVal = count > 0 ? Math.max(...validSamples) : 0;

    const range = maxVal - minVal;
    const stabilityVal = avg > 0 ? Math.max(0, Math.min(100, 100 * (1 - range / (2 * avg)))) : 0;

    const newParams: ReadingParameters = {
      intensity: Number(avg.toFixed(2)),
      averagePower: Number(avg.toFixed(2)),
      loss: 0.0,
      stability: Number(stabilityVal.toFixed(2)),
      minimum: Number(minVal.toFixed(2)),
      maximum: Number(maxVal.toFixed(2)),
      tolerance: 2.0,
      readingTime: Number(readingTimeSec.toFixed(2))
    };

    setCapturedParams(newParams);
    setIsCapturing(false);
    samplesReceivedRef.current = true;
  }, []);

  // Subscribe to ESP32 Capture Protocol Events & Hardware Switch
  useEffect(() => {
    const unsubCapEvents = esp32Service.subscribeCaptureEvents((evt) => {
      if (evt.type === 'CAPTURE_STARTED') {
        setIsCapturing(true);
        setCaptureCountdown(5);
        samplesReceivedRef.current = false;
      } else if (evt.type === 'MEASUREMENT_RESULT') {
        const result = evt.payload;
        const source = captureSourceRef.current;
        const timeStr = new Date().toISOString();

        console.log(`[MEASUREMENT_RESULT] capture_id=${result.capture_id || 'N/A'} source=${source} time=${timeStr} average_power=${result.average_power} intensity=${result.intensity} optical_loss=${result.optical_loss} stability=${result.stability} min_power=${result.min_power} max_power=${result.max_power} tolerance=${result.tolerance} reading_time=${result.reading_time}`);

        if (result.sample_count !== 100) {
          alert(`❌ INVALID CAPTURE PACKET: ESP32 returned sample_count = ${result.sample_count}. Expected exactly 100 samples.`);
          setIsCapturing(false);
          return;
        }

        // Lock by capture_id: prevent duplicate processing or second updates
        if (result.capture_id && processedCaptureIdsRef.current.has(result.capture_id)) {
          console.log(`[SECOND_UPDATE_BLOCKED] time=${timeStr} source=${source} capture_id=${result.capture_id} average_power=${result.average_power} (Duplicate result rejected by lock)`);
          return;
        }
        if (result.capture_id) {
          processedCaptureIdsRef.current.add(result.capture_id);
        }

        // Dual Calculation Verification
        if (result.raw_samples && result.raw_samples.length === 100) {
          const pcSum = result.raw_samples.reduce((a, b) => a + Number(b), 0);
          const pcAvg = Number((pcSum / 100).toFixed(2));
          const delta = Math.abs(pcAvg - result.average_power);
          console.log(`[DUAL-VERIFICATION] Reference Reading Module - ESP32 Avg: ${result.average_power} W | PC Recalc Avg: ${pcAvg} W | Delta: ${delta.toFixed(4)} W`);
        }

        // DIRECT PLACEMENT: Map ESP32 Final Measurement Packet directly
        const newParams: ReadingParameters = {
          intensity: result.intensity,
          averagePower: result.average_power,
          loss: result.optical_loss,
          stability: result.stability,
          minimum: result.min_power,
          maximum: result.max_power,
          tolerance: result.tolerance,
          readingTime: result.reading_time
        };

        console.log(`[UI_UPDATE] capture_id=${result.capture_id || 'N/A'} source=${source} time=${timeStr} average_power=${result.average_power}`);

        setCapturedParams(newParams);
        setIsCapturing(false);
        samplesReceivedRef.current = true;
      } else if (evt.type === 'SAMPLES') {
        const { capture_id, samples, reading_time } = evt.payload;
        if (Array.isArray(samples) && samples.length === 100) {
          const isLocked = capture_id ? processedCaptureIdsRef.current.has(capture_id) : false;
          if (samplesReceivedRef.current || isLocked) {
            console.log(`[SECOND_UPDATE_BLOCKED] time=${new Date().toISOString()} capture_id=${capture_id || 'N/A'} (Raw SAMPLES event ignored after lock)`);
          } else {
            processReferenceSamples(samples.map(s => Number(s)), reading_time || 5.0);
          }
        }
      } else if (evt.type === 'CAPTURE_COMPLETE') {
        setIsCapturing(false);
      }
    });

    const unsubHW = esp32Service.subscribeHardwareEvents((event) => {
      if (event === 'CAPTURE') {
        console.log(`[CAPTURE_EVENT] trigger=GPIO5_SWITCH time=${new Date().toISOString()}`);
        handleCaptureFromESP('GPIO5_SWITCH');
      }
    });

    return () => {
      unsubCapEvents();
      unsubHW();
    };
  }, [processReferenceSamples]);

  // ==========================================
  // ESP32 LIVE CAPTURE & SAVE REFERENCE
  // ==========================================

  const handleCaptureFromESP = async (source: 'PC_BUTTON' | 'GPIO5_SWITCH' = 'PC_BUTTON') => {
    if (isCapturing) return;

    captureSourceRef.current = source;

    // MANDATORY HARDWARE CHECK: No capture without real connected & verified ESP32
    const currentEspStatus = esp32Service.getStatus();
    if (!currentEspStatus.connected || !esp32Service.getIsRealHardwareConnected()) {
      alert("❌ ESP32 NOT CONNECTED\n\nCannot perform reference capture because no physical ESP32-S3 hardware is connected and verified.\n\nPlease connect real hardware via USB COM Port or Wi-Fi before capturing.");
      return;
    }

    setIsCapturing(true);
    setCaptureCountdown(5);
    samplesReceivedRef.current = false;

    const capId = `REF_${Date.now().toString().slice(-4)}`;
    console.log(`[CAPTURE_EVENT] source=${source} capture_id=${capId} time=${new Date().toISOString()}`);

    try {
      await esp32Service.sendRawCommand(`CAPTURE:{"capture_id":"${capId}","reference_power":0}`);
    } catch (e: any) {
      alert(`ESP32 Reference Capture Transmission Failed: ${e.message || e}`);
      setIsCapturing(false);
      return;
    }

    const timer = setInterval(() => {
      setCaptureCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!samplesReceivedRef.current) {
            setIsCapturing(false);
            alert("❌ CAPTURE TIMEOUT: Real ESP32 did not transmit 100 SAMPLES packet within 5 seconds.");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSaveJoint = () => {
    if (!currentModule || !currentCycle) {
      alert('Please select an active module before saving reference reading.');
      return;
    }

    const values = Object.values(capturedParams) as number[];
    if (values.some((v) => v === undefined || v === null || Number.isNaN(v))) {
      alert('Reference Reading Incomplete: Missing numeric values detected in parameter fields.');
      return;
    }

    const newJointReading: JointReading = {
      joint: activeJoint,
      parameters: { ...capturedParams },
      capturedAt: new Date().toISOString(),
      capturedBy: 'Service Engineer',
      captureMethod: 'ESP32'
    };

    const updatedRef = { ...currentModule.reference };
    if (activeJoint === 'Before') updatedRef.before = newJointReading;
    if (activeJoint === 'Upper') updatedRef.upper = newJointReading;
    if (activeJoint === 'After') updatedRef.after = newJointReading;

    const isComplete = Boolean(updatedRef.before && updatedRef.upper && updatedRef.after);
    let status: 'Pending' | 'Partial' | 'Complete' = 'Pending';
    if (updatedRef.before || updatedRef.upper || updatedRef.after) status = 'Partial';
    if (isComplete) status = 'Complete';

    updatedRef.isComplete = isComplete;
    updatedRef.status = status;
    updatedRef.lastUpdated = new Date().toISOString();

    const updatedModules = currentCycle.modules.map((m) => 
      m.id === currentModule.id ? { ...m, reference: updatedRef } : m
    );

    const updatedCycles = activeModel.cycles.map((c) => 
      c.id === currentCycle.id ? { ...c, modules: updatedModules } : c
    );

    const updatedModel: FiberModel = {
      ...activeModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    onModelUpdated(updatedModel);

    // Auto Workflow Sequence
    if (activeJoint === 'Before') {
      setActiveJoint('Upper');
    } else if (activeJoint === 'Upper') {
      setActiveJoint('After');
    } else if (activeJoint === 'After') {
      const modIdx = currentCycle.modules.findIndex((m) => m.id === currentModule.id);
      if (modIdx >= 0 && modIdx < currentCycle.modules.length - 1) {
        const nextMod = currentCycle.modules[modIdx + 1];
        setSelectedModuleId(nextMod.id);
        setActiveJoint('Before');
      } else {
        alert('Golden Reference complete for this module! All 3 joints (Before, Upper, After) saved successfully.');
      }
    }
  };

  const brandsList: (LaserBrand | 'All')[] = ['All', 'Raycus', 'JPT', 'IPG', 'MAX', 'RECI', 'BWT', 'Other'];

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* HEADER PANEL: BRAND > MODEL HIERARCHY */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            GOLDEN REFERENCE READING ENGINE
          </h2>
          <p className="text-xs text-gray-400">
            Set baseline reference readings via Live Capture or Manual Entry across Brand &gt; Model &gt; Cycle &gt; Module
          </p>
        </div>

        {/* Brand & Model Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Brand Filter */}
          <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-gray-400 font-semibold">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent text-amber-300 font-bold outline-none font-mono cursor-pointer"
            >
              {brandsList.map((b) => (
                <option key={b} value={b} className="bg-gray-900 text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-gray-400 font-semibold">Model:</span>
            <select
              value={activeModel.id}
              onChange={(e) => {
                const m = models.find((x) => x.id === e.target.value);
                if (m) {
                  onSelectModel(m);
                  if (m.cycles.length > 0) {
                    setSelectedCycleId(m.cycles[0].id);
                    if (m.cycles[0].modules.length > 0) {
                      setSelectedModuleId(m.cycles[0].modules[0].id);
                    }
                  }
                }
              }}
              className="bg-transparent text-white font-bold outline-none font-mono cursor-pointer"
            >
              {filteredModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-gray-900 text-white">
                  [{m.brand}] {m.modelName} ({m.ratedPowerW}W)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* BREADCRUMB DISPLAY */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-mono text-gray-300 overflow-x-auto">
        <span className="text-orange-400 font-bold">PATH:</span>
        <span className="bg-gray-800 px-2 py-0.5 rounded text-amber-300 font-bold">{activeModel.brand}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        <span className="bg-gray-800 px-2 py-0.5 rounded text-white font-bold">{activeModel.modelName}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        <span className="bg-gray-800 px-2 py-0.5 rounded text-blue-300 font-bold">{currentCycle?.name || 'No Cycle'}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        <span className="bg-gray-800 px-2 py-0.5 rounded text-emerald-300 font-bold">{currentModule?.name || 'No Module'}</span>
      </div>

      {/* CYCLE MANAGEMENT PANEL */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-3.5 space-y-2 shadow-md">
        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>CYCLES IN MODEL ({activeModel.cycles.length})</span>
          </div>

          <button
            onClick={handleOpenAddCycleModal}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow"
            title="Add New Cycle"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Add Cycle</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center pt-1">
          {activeModel.cycles.map((cycle) => {
            const isSelected = currentCycle?.id === cycle.id;

            return (
              <div
                key={cycle.id}
                onClick={() => {
                  setSelectedCycleId(cycle.id);
                  if (cycle.modules.length > 0) {
                    setSelectedModuleId(cycle.modules[0].id);
                  } else {
                    setSelectedModuleId('');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-md'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {editingCycleId === cycle.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingCycleName}
                      onChange={(e) => setEditingCycleName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCycleRename(cycle.id)}
                      className="bg-slate-900 border border-amber-400 text-amber-300 text-xs px-1.5 py-0.5 rounded outline-none w-28 font-bold"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveCycleRename(cycle.id)}
                      className="p-0.5 text-emerald-400 hover:bg-slate-800 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCycleId(null)}
                      className="p-0.5 text-slate-400 hover:bg-slate-800 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>{cycle.name}</span>
                )}

                <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                  <button
                    onClick={(e) => handleStartRenameCycle(cycle, e)}
                    className="p-0.5 hover:text-amber-300 rounded"
                    title="Rename Cycle"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteCycle(cycle.id, e)}
                    className="p-0.5 hover:text-red-400 rounded"
                    title="Delete Cycle"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODULE MANAGEMENT PANEL */}
      {currentCycle && (
        <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-3.5 space-y-2 shadow-md">
          <div className="flex justify-between items-center border-b border-gray-700 pb-2">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-orange-400" />
              <span>MODULES IN [{currentCycle.name}] ({currentCycle.modules.length})</span>
            </div>

            <button
              onClick={() => handleOpenAddModuleModal(currentCycle?.id)}
              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow"
              title="Add New Module"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Module</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center pt-1">
            {currentCycle.modules.map((mod) => {
              const isSelected = selectedModuleId === mod.id;

              return (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-600 border-orange-400 text-white font-bold shadow-md'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {editingModuleId === mod.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingModuleName}
                        onChange={(e) => setEditingModuleName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveModuleRename(mod.id)}
                        className="bg-slate-900 border border-amber-400 text-amber-300 text-xs px-1.5 py-0.5 rounded outline-none w-28 font-bold"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveModuleRename(mod.id)}
                        className="p-0.5 text-emerald-400 hover:bg-slate-800 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingModuleId(null)}
                        className="p-0.5 text-slate-400 hover:bg-slate-800 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span>{mod.name}</span>
                  )}

                  {/* Status Indicator */}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      mod.reference.status === 'Complete'
                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                        : mod.reference.status === 'Partial'
                        ? 'bg-yellow-400'
                        : 'bg-gray-500'
                    }`}
                    title={`Reference Status: ${mod.reference.status}`}
                  />

                  <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                    <button
                      onClick={(e) => handleStartRenameModule(mod, e)}
                      className="p-0.5 hover:text-amber-300 rounded"
                      title="Rename Module"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteModule(mod.id, e)}
                      className="p-0.5 hover:text-red-400 rounded"
                      title="Delete Module"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {currentCycle.modules.length === 0 && (
              <span className="text-gray-500 text-xs italic font-mono">
                No modules in this cycle. Click + Add Module above.
              </span>
            )}
          </div>
        </div>
      )}

      {/* THREE INTERACTIVE JOINT BUTTONS */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            SELECT ACTIVE OPTICAL JOINT FOR REFERENCE CAPTURE
          </h3>
          <span className="text-xs font-mono text-orange-400 font-bold">
            Active: {activeJoint} Joint
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Before', 'Upper', 'After'] as JointType[]).map((joint) => {
            const isActive = activeJoint === joint;
            const isSaved =
              currentModule &&
              ((joint === 'Before' && currentModule.reference.before) ||
                (joint === 'Upper' && currentModule.reference.upper) ||
                (joint === 'After' && currentModule.reference.after));

            return (
              <button
                key={joint}
                onClick={() => setActiveJoint(joint)}
                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                  isActive
                    ? 'bg-orange-950/40 border-orange-500 text-white shadow-lg shadow-orange-950/50 animate-pulse'
                    : isSaved
                    ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold font-mono tracking-wider text-gray-400 uppercase">
                      JOINT INTERFACE
                    </span>
                    <h4 className="text-lg font-bold text-white">{joint} Joint</h4>
                  </div>
                  {isSaved && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                      ✓ SAVED
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono mt-2 flex items-center justify-between text-gray-400">
                  <span>{isActive ? '● ACTIVE BLINKING' : isSaved ? 'Golden Ref Complete' : 'Pending Capture'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PARAMETERS CAPTURE & MANUAL EDITING CARDS */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-orange-400" />
              REFERENCE READING PARAMETERS [{activeJoint} Joint]
            </h3>
            <p className="text-xs text-gray-400">
              Module: {currentModule?.name || 'N/A'} | Target Rated Power: {activeModel.ratedPowerW}W
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCaptureFromESP}
              disabled={isCapturing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-md"
            >
              <Cpu className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
              <span>{isCapturing ? 'Capturing ESP32...' : 'Capture From ESP32'}</span>
            </button>

            <button
              onClick={handleSaveJoint}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save {activeJoint} Joint</span>
            </button>
          </div>
        </div>

        {/* 7 Required Reading Parameter Input Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-amber-400 font-bold block mb-1">Intensity (%)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.intensity}
              onChange={(e) => setCapturedParams({ ...capturedParams, intensity: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-amber-300 font-mono text-sm font-bold rounded p-2 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-orange-400 font-bold block mb-1">Average Power (W)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.averagePower}
              onChange={(e) => setCapturedParams({ ...capturedParams, averagePower: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-orange-500 text-orange-400 font-mono text-sm font-bold rounded p-2 focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-[11px] text-rose-400 font-bold block mb-1">Optical Loss (%)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.loss}
              onChange={(e) => setCapturedParams({ ...capturedParams, loss: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-rose-300 font-mono text-sm font-bold rounded p-2 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-emerald-400 font-bold block mb-1">Stability (%)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.stability}
              onChange={(e) => setCapturedParams({ ...capturedParams, stability: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-emerald-300 font-mono text-sm font-bold rounded p-2 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-cyan-400 font-semibold block mb-1">Min Power Range (W)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.minimum}
              onChange={(e) => setCapturedParams({ ...capturedParams, minimum: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-cyan-300 font-mono text-sm font-bold rounded p-2 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-cyan-400 font-semibold block mb-1">Max Power Range (W)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.maximum}
              onChange={(e) => setCapturedParams({ ...capturedParams, maximum: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-cyan-300 font-mono text-sm font-bold rounded p-2 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-purple-400 font-semibold block mb-1">Tolerance (%)</label>
            <input
              type="number"
              step="0.1"
              value={capturedParams.tolerance}
              onChange={(e) => setCapturedParams({ ...capturedParams, tolerance: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-purple-300 font-mono text-sm font-bold rounded p-2 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-blue-400 font-semibold block mb-1">Reading Time (5 sec)</label>
            <input
              type="number"
              step="0.5"
              value={capturedParams.readingTime}
              onChange={(e) => setCapturedParams({ ...capturedParams, readingTime: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 text-blue-300 font-mono text-sm font-bold rounded p-2 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Modal: Create New Cycle */}
      {showAddCycleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1F2937] border border-blue-500/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white font-sans">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <FolderPlus className="w-5 h-5 text-blue-400" />
              ADD NEW CYCLE TO {activeModel.modelName}
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Cycle Name / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Cycle 2 - Amplification Circuit"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-700 text-xs font-mono">
              <button
                onClick={() => setShowAddCycleModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddCycle}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cycle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Optical Module */}
      {showAddModuleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1F2937] border border-orange-500/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white font-sans">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <Plus className="w-5 h-5 text-orange-400" />
              ADD OPTICAL MODULE TO CYCLE
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Target Cycle</label>
                <select
                  value={targetCycleIdForModule}
                  onChange={(e) => setTargetCycleIdForModule(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 outline-none focus:border-orange-500"
                >
                  {activeModel.cycles.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Module Name</label>
                <input
                  type="text"
                  placeholder="e.g. MO 1+1, YDF2 High Power, PA Stage, HR Mirror"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 outline-none focus:border-orange-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Module Type</label>
                <select
                  value={newModuleType}
                  onChange={(e) => setNewModuleType(e.target.value as FiberModule['moduleType'])}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded p-2.5 outline-none focus:border-orange-500"
                >
                  <option value="Pump">Pump Stage</option>
                  <option value="Amplifier">Fiber Amplifier (PA/MA)</option>
                  <option value="Combiner">Beam Combiner</option>
                  <option value="Isolator">Optical Isolator</option>
                  <option value="HR">High Reflector (HR)</option>
                  <option value="OC">Output Coupler (OC)</option>
                  <option value="QCS">Output Head / QCS</option>
                  <option value="Other">Other Optical Component</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-700 text-xs font-mono">
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddModule}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Module</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* PROMPT DIALOG MODAL */}
      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        message={promptModal.message}
        defaultValue={promptModal.defaultValue}
        onSave={promptModal.onSave}
        onCancel={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
