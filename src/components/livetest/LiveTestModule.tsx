/**
 * Live Test Module
 * Location-first optical path test progress with full Edit, Rename, Delete, Drag & Drop, and Add capabilities.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sun, 
  Activity, 
  BarChart2, 
  ShieldCheck, 
  MinusCircle, 
  Zap, 
  Clock, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Target, 
  Save, 
  RotateCcw, 
  FastForward, 
  ChevronDown, 
  ChevronRight,
  Stethoscope,
  Sliders,
  GripVertical,
  Edit3,
  Trash2,
  Plus,
  Check,
  X,
  Pencil,
  FolderPlus,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { 
  FiberModel, 
  JointType, 
  ReadingParameters, 
  ESP32Status,
  DiagnosisReport,
  PendingTestSession
} from '../../types';
import { esp32Service, SimulatedFaultType } from '../../services/esp32Service';
import { compareReadings, diagnoseFaults, evaluateOpticalStepDiagnosis, parseStepModules, STANDARD_SOURCE_COMPONENTS } from '../../services/rulesEngine';
import { localDB } from '../../services/db';
import { ConfirmModal, PromptModal } from '../common/ModalDialogs';

interface LiveTestModuleProps {
  activeModel: FiberModel;
  models: FiberModel[];
  onSelectModel: (model: FiberModel) => void;
  onNavigateToDiagnosis: (report: DiagnosisReport) => void;
  onModelUpdated?: (model: FiberModel) => void;
  showHardwareModal?: boolean;
  setShowHardwareModal?: (show: boolean) => void;
}

export interface TestStepItem {
  id: string;
  stepNum: string;
  name: string;
  cycleId: string;
  status: 'active' | 'pending' | 'good' | 'completed';
}

export interface CycleGroup {
  id: string;
  name: string;
  isOpen: boolean;
  steps: TestStepItem[];
}

const INITIAL_CYCLES: CycleGroup[] = [
  {
    id: 'cycle-1',
    name: 'Cycle-1',
    isOpen: true,
    steps: [
      { id: 'c1-s1', stepNum: '01', name: 'MO Pump → MO 1+1 Combiner', cycleId: 'cycle-1', status: 'active' },
      { id: 'c1-s2', stepNum: '02', name: 'MO 1+1 Combiner → YDF1', cycleId: 'cycle-1', status: 'pending' },
      { id: 'c1-s3', stepNum: '03', name: 'YDF1 → AOM', cycleId: 'cycle-1', status: 'pending' },
      { id: 'c1-s4', stepNum: '04', name: 'AOM → HR', cycleId: 'cycle-1', status: 'pending' },
      { id: 'c1-s5', stepNum: '05', name: 'HR → OUT', cycleId: 'cycle-1', status: 'pending' },
    ]
  },
  {
    id: 'cycle-2',
    name: 'Cycle-2',
    isOpen: true,
    steps: [
      { id: 'c2-s1', stepNum: '01', name: 'MO 1+1 Combiner → OC', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s2', stepNum: '02', name: 'OC → WDM', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s3', stepNum: '03', name: 'WDM → PA 2+1', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s4', stepNum: '04', name: '60W → PA 2+1', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s5', stepNum: '05', name: 'Extra Pump → PA 2+1', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s6', stepNum: '06', name: 'PA 2+1 → YDF2', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s7', stepNum: '07', name: 'YDF2 → Extra Fiber', cycleId: 'cycle-2', status: 'pending' },
      { id: 'c2-s8', stepNum: '08', name: 'Extra Fiber → ISO Gun', cycleId: 'cycle-2', status: 'pending' },
    ]
  }
];

const convertModelToCycleGroups = (model: FiberModel): CycleGroup[] => {
  if (!model || !model.cycles || model.cycles.length === 0) {
    return INITIAL_CYCLES;
  }
  return model.cycles.map((cycle, cIdx) => ({
    id: cycle.id || `cycle-${cIdx + 1}`,
    name: cycle.name || `Cycle-${cIdx + 1}`,
    isOpen: true,
    steps: (cycle.modules || []).map((mod, mIdx) => ({
      id: mod.id || `mod-${cIdx + 1}-${mIdx + 1}`,
      stepNum: String(mIdx + 1).padStart(2, '0'),
      name: mod.name,
      cycleId: cycle.id || `cycle-${cIdx + 1}`,
      status: 'pending' as const
    }))
  }));
};

export const LiveTestModule: React.FC<LiveTestModuleProps> = ({
  activeModel,
  models,
  onSelectModel,
  onNavigateToDiagnosis,
  onModelUpdated,
  showHardwareModal: propShowHardwareModal,
  setShowHardwareModal: propSetShowHardwareModal
}) => {
  // Cycle and Step State derived from activeModel
  const [cycles, setCycles] = useState<CycleGroup[]>(() => convertModelToCycleGroups(activeModel));

  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [activeStepId, setActiveStepId] = useState<string>('');

  // Auto sync cycles with activeModel when activeModel changes or is updated
  useEffect(() => {
    if (activeModel && activeModel.cycles && activeModel.cycles.length > 0) {
      const modelCycles = convertModelToCycleGroups(activeModel);
      setCycles(modelCycles);
      if (modelCycles.length > 0) {
        setActiveCycleId(modelCycles[0].id);
        if (modelCycles[0].steps.length > 0) {
          setActiveStepId(modelCycles[0].steps[0].id);
        } else {
          setActiveStepId('');
        }
      }
    }
  }, [activeModel.id, activeModel.modifiedDate, JSON.stringify(activeModel.cycles)]);

  const [selectedJoint, setSelectedJoint] = useState<JointType>('Before');

  // Inline editing states
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepName, setEditingStepName] = useState<string>('');

  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editingCycleName, setEditingCycleName] = useState<string>('');

  // Drag & drop state
  const [draggedStep, setDraggedStep] = useState<{ cycleId: string; stepId: string; index: number } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ cycleId: string; index: number } | null>(null);

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

  // Diagnosis Modal State
  const [showDiagnosisModal, setShowDiagnosisModal] = useState<boolean>(false);

  // ESP32 and Simulation
  const [espStatus, setEspStatus] = useState<ESP32Status>(esp32Service.getStatus());
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [activeFault, setActiveFault] = useState<SimulatedFaultType>(esp32Service.getActiveFault());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Editable Reference Data State
  const [refThresholds, setRefThresholds] = useState<{ [key: string]: string }>({
    intensity: '23.50 W',
    frequency: '35.00 ± 2.00 kHz',
    pulseWidth: '120 ± 10 ns',
    stability: '≥ 95.00 %',
    loss: '≤ 3.00 %',
    averagePower: '23.50 W',
    readingTime: '5.00 s',
    minimum: '≥ 22.80 W',
    maximum: '≤ 24.20 W',
  });
  const [showEditRefModal, setShowEditRefModal] = useState<boolean>(false);
  const [showEditLiveModal, setShowEditLiveModal] = useState<boolean>(false);

  // Real Hardware Connection States (USB COM Port & Wi-Fi)
  const [internalShowHardwareModal, setInternalShowHardwareModal] = useState<boolean>(false);
  const showHardwareModal = propShowHardwareModal !== undefined ? propShowHardwareModal : internalShowHardwareModal;
  const setShowHardwareModal = propSetShowHardwareModal || setInternalShowHardwareModal;
  const [hardwareTab, setHardwareTab] = useState<'usb' | 'wifi' | 'code'>('usb');
  const [usbBaudRate, setUsbBaudRate] = useState<number>(115200);
  const [wifiIp, setWifiIp] = useState<string>('192.168.1.100');
  const [wifiPort, setWifiPort] = useState<number>(81);
  const [hardwareLogs, setHardwareLogs] = useState<string[]>([]);
  const [autoApplyHardwareStream, setAutoApplyHardwareStream] = useState<boolean>(false);
  const [connectingHardware, setConnectingHardware] = useState<boolean>(false);
  const [captureSequenceIndex, setCaptureSequenceIndex] = useState<number>(0);
  const samplesReceivedRef = useRef<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubStatus = esp32Service.subscribeStatus(setEspStatus);
    const unsubLogs = esp32Service.subscribeLogs((log) => {
      setHardwareLogs((prev) => [log, ...prev.slice(0, 49)]);
    });

    // Subscribe to live physical sensor reading streams from real USB/Wi-Fi hardware
    const unsubReadings = esp32Service.subscribeReadingStream((reading) => {
      if (autoApplyHardwareStream && !isCapturing && !hasCaptured) {
        setCapturedParams({
          intensity: `${reading.intensity.toFixed(2)} %`,
          frequency: `${reading.frequency.toFixed(2)} kHz`,
          pulseWidth: `${reading.pulseWidth.toFixed(1)} ns`,
          stability: `${reading.stability.toFixed(2)} %`,
          loss: '0.10 %',
          averagePower: `${reading.averagePower.toFixed(2)} W`,
          readingTime: `${reading.readingTime.toFixed(2)} s`,
          minimum: `${reading.minimum.toFixed(2)} W`,
          maximum: `${reading.maximum.toFixed(2)} W`
        });

        // Also sync joint intensity
        setJointReadings(prev => ({
          ...prev,
          [selectedJoint]: reading.intensity || reading.averagePower
        }));
      }
    });

    return () => {
      unsubStatus();
      unsubLogs();
      unsubReadings();
    };
  }, [autoApplyHardwareStream, selectedJoint]);

  // Recalculate step numbers for a cycle
  const renumberSteps = (steps: TestStepItem[]): TestStepItem[] => {
    return steps.map((s, idx) => ({
      ...s,
      stepNum: String(idx + 1).padStart(2, '0')
    }));
  };

  // Toggle Cycle Open/Close
  const toggleCycleOpen = (cycleId: string) => {
    setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, isOpen: !c.isOpen } : c));
  };

  // Add Step to Cycle
  const handleAddStep = (cycleId: string) => {
    setPromptModal({
      isOpen: true,
      title: 'Add Optical Joint Step',
      message: 'Enter new step / joint location name:',
      defaultValue: 'New Optical Joint',
      onSave: (name) => {
        if (!name.trim()) return;
        setCycles(prev => prev.map(cycle => {
          if (cycle.id === cycleId) {
            const newStep: TestStepItem = {
              id: `step-${Date.now()}`,
              stepNum: String(cycle.steps.length + 1).padStart(2, '0'),
              name: name.trim(),
              cycleId,
              status: 'pending'
            };
            const updatedSteps = renumberSteps([...cycle.steps, newStep]);
            return { ...cycle, steps: updatedSteps };
          }
          return cycle;
        }));
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Add New Cycle
  const handleAddCycle = () => {
    setPromptModal({
      isOpen: true,
      title: 'Add New Cycle',
      message: 'Enter new Cycle Name:',
      defaultValue: `Cycle-${cycles.length + 1}`,
      onSave: (name) => {
        if (!name.trim()) return;
        const newCycleId = `cycle-${Date.now()}`;
        const newCycle: CycleGroup = {
          id: newCycleId,
          name: name.trim(),
          isOpen: true,
          steps: [
            {
              id: `step-${Date.now()}-1`,
              stepNum: '01',
              name: `${name.trim()} - Main Joint`,
              cycleId: newCycleId,
              status: 'pending'
            }
          ]
        };
        setCycles(prev => [...prev, newCycle]);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Start Inline Step Rename
  const handleStartRenameStep = (step: TestStepItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStepId(step.id);
    setEditingStepName(step.name);
  };

  // Save Step Rename
  const handleSaveStepRename = (cycleId: string, stepId: string) => {
    if (!editingStepName.trim()) return;
    setCycles(prev => prev.map(cycle => {
      if (cycle.id === cycleId) {
        return {
          ...cycle,
          steps: cycle.steps.map(s => s.id === stepId ? { ...s, name: editingStepName.trim() } : s)
        };
      }
      return cycle;
    }));
    setEditingStepId(null);
  };

  // Delete Step
  const handleDeleteStep = (cycleId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Step',
      message: 'Delete this test step position?',
      onConfirm: () => {
        setCycles(prev => prev.map(cycle => {
          if (cycle.id === cycleId) {
            const filtered = cycle.steps.filter(s => s.id !== stepId);
            return { ...cycle, steps: renumberSteps(filtered) };
          }
          return cycle;
        }));
        if (activeStepId === stepId) {
          const allSteps = cycles.flatMap(c => c.steps).filter(s => s.id !== stepId);
          if (allSteps.length > 0) {
            setActiveCycleId(allSteps[0].cycleId);
            setActiveStepId(allSteps[0].id);
          }
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Start Inline Cycle Rename
  const handleStartRenameCycle = (cycle: CycleGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCycleId(cycle.id);
    setEditingCycleName(cycle.name);
  };

  // Save Cycle Rename
  const handleSaveCycleRename = (cycleId: string) => {
    if (!editingCycleName.trim()) return;
    setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, name: editingCycleName.trim() } : c));
    setEditingCycleId(null);
  };

  // Delete Cycle
  const handleDeleteCycle = (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cycles.length <= 1) {
      alert('Cannot delete the last remaining cycle.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Cycle',
      message: 'Are you sure you want to delete this entire cycle and all its test steps?',
      onConfirm: () => {
        const updated = cycles.filter(c => c.id !== cycleId);
        setCycles(updated);
        if (activeCycleId === cycleId && updated.length > 0) {
          setActiveCycleId(updated[0].id);
          if (updated[0].steps.length > 0) {
            setActiveStepId(updated[0].steps[0].id);
          }
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // DRAG & DROP HANDLERS FOR REORDERING STEPS
  const handleDragStart = (e: React.DragEvent, cycleId: string, stepId: string, index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ cycleId, stepId, index }));
    setDraggedStep({ cycleId, stepId, index });
  };

  const handleDragOver = (e: React.DragEvent, cycleId: string, index: number) => {
    e.preventDefault();
    setDragOverInfo({ cycleId, index });
  };

  const handleDrop = (e: React.DragEvent, targetCycleId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedStep) return;

    const { cycleId: sourceCycleId, stepId: sourceStepId } = draggedStep;

    setCycles(prevCycles => {
      let movedItem: TestStepItem | null = null;
      
      // Remove item from source
      const nextCycles = prevCycles.map(c => {
        if (c.id === sourceCycleId) {
          const itemIndex = c.steps.findIndex(s => s.id === sourceStepId);
          if (itemIndex !== -1) {
            movedItem = { ...c.steps[itemIndex], cycleId: targetCycleId };
            const newSteps = c.steps.filter(s => s.id !== sourceStepId);
            return { ...c, steps: renumberSteps(newSteps) };
          }
        }
        return c;
      });

      if (!movedItem) return prevCycles;

      // Insert item into target
      return nextCycles.map(c => {
        if (c.id === targetCycleId) {
          const newSteps = [...c.steps];
          newSteps.splice(targetIndex, 0, movedItem!);
          return { ...c, steps: renumberSteps(newSteps) };
        }
        return c;
      });
    });

    setDraggedStep(null);
    setDragOverInfo(null);
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
    setDragOverInfo(null);
  };

  // Find active step details
  const activeCycle = cycles.find(c => c.id === activeCycleId) || cycles[0];
  const activeStep = activeCycle?.steps.find(s => s.id === activeStepId) || activeCycle?.steps[0] || {
    id: 'c1-s1',
    stepNum: '01',
    name: 'MO Pump → MO 1+1 Combiner',
    cycleId: 'cycle-1',
    status: 'active'
  };

  const stepTotal = activeCycle?.steps.length || 1;
  const currentStepNum = parseInt(activeStep.stepNum, 10);

  // Helper to extract numeric reference parameter from activeModel or refThresholds
  const getReferenceParams = (): ReadingParameters => {
    // Check if activeModel has a module reference saved for selected Joint
    const cycleInModel = activeModel.cycles.find(
      c => c.id === activeCycleId || c.id === activeCycle?.id || c.name.toLowerCase() === activeCycle?.name.toLowerCase()
    );
    const moduleInModel = cycleInModel?.modules.find(
      m => m.id === activeStepId || m.id === activeStep?.id || m.name.toLowerCase() === activeStep?.name.toLowerCase()
    ) || cycleInModel?.modules[0] || activeModel.cycles[0]?.modules[0];

    const jointKey = selectedJoint.toLowerCase() as 'before' | 'upper' | 'after';
    const savedJointParams = moduleInModel?.reference?.[jointKey]?.parameters
      || moduleInModel?.reference?.before?.parameters
      || moduleInModel?.reference?.upper?.parameters
      || moduleInModel?.reference?.after?.parameters;

    if (savedJointParams) {
      return savedJointParams;
    }

    // Default reference parameters scaled by model rated power
    const baseP = activeModel.ratedPowerW || 23.5;
    return {
      intensity: 100,
      averagePower: baseP,
      loss: 1.5,
      stability: 98.5,
      minimum: Number((baseP * 0.97).toFixed(2)),
      maximum: Number((baseP * 1.03).toFixed(2)),
      tolerance: 2.0,
      readingTime: 5.0
    };
  };

  // Live Captured parameters (7 required metrics)
  const [capturedParams, setCapturedParams] = useState<{
    intensity: string;
    averagePower: string;
    loss: string;
    stability: string;
    minimum: string;
    maximum: string;
    tolerance: string;
    readingTime: string;
  }>({
    intensity: '100 %',
    averagePower: '23.30 W',
    loss: '1.85 %',
    stability: '98.62 %',
    minimum: '22.80 W',
    maximum: '24.20 W',
    tolerance: '2.00 %',
    readingTime: '5.00 s'
  });

  // State for 3 Joint readings (Before, Upper, After) to evaluate exact 4 Master Fault Cases
  const [jointReadings, setJointReadings] = useState<{ Before: number; Upper: number; After: number }>({
    Before: 12.0,
    Upper: 12.0,
    After: 12.0
  });
  const [simulatedPrevStepPassed, setSimulatedPrevStepPassed] = useState<boolean>(false);

  // Raw 100 Samples Packet State from real ESP32
  const [rawSamplesData, setRawSamplesData] = useState<{
    captureId: string;
    sampleCount: number;
    readingTime: number;
    samples: number[];
    timestamp: string;
    source: string;
    deviceUid: string;
    connectionType: string;
  } | null>(null);

  // Sync current selected joint reading when capturedParams.intensity or selectedJoint changes
  useEffect(() => {
    const liveVal = parseFloat(capturedParams.intensity) || parseFloat(capturedParams.averagePower) || 0;
    setJointReadings(prev => ({
      ...prev,
      [selectedJoint]: liveVal
    }));
  }, [selectedJoint, capturedParams.intensity, capturedParams.averagePower]);

  // Parameter Bypass State for the 7 required metrics
  const [enabledParams, setEnabledParams] = useState<Record<string, boolean>>({
    intensity: true,
    averagePower: true,
    loss: true,
    stability: true,
    minimum: true,
    maximum: true,
    tolerance: true,
    readingTime: true
  });

  const toggleParamBypass = (paramName: string) => {
    setEnabledParams((prev) => ({
      ...prev,
      [paramName]: !prev[paramName]
    }));
  };

  const toggleAllParams = (enable: boolean) => {
    setEnabledParams((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = enable;
      });
      return next;
    });
  };

  const refParamsNum = getReferenceParams();

  // Convert string inputs to ReadingParameters for Rules Engine
  const liveParamsNum: ReadingParameters = {
    intensity: parseFloat(capturedParams.intensity) || 0,
    averagePower: parseFloat(capturedParams.averagePower) || 0,
    loss: parseFloat(capturedParams.loss) || 0,
    stability: parseFloat(capturedParams.stability) || 0,
    minimum: parseFloat(capturedParams.minimum) || 0,
    maximum: parseFloat(capturedParams.maximum) || 0,
    tolerance: parseFloat(capturedParams.tolerance) || 2.0,
    readingTime: parseFloat(capturedParams.readingTime) || 5.0
  };

  // Run Rules Engine Comparison
  const liveComparisons = compareReadings(refParamsNum, liveParamsNum, 2.0);

  // Filter out bypassed parameters for diagnosis rules so they don't trigger false alarms
  const activeComparisonsForDiagnosis = liveComparisons.filter(
    (comp) => enabledParams[comp.parameterName] !== false
  );

  const activeModuleForDiagnosis = activeModel.cycles.flatMap(c => c.modules).find(m => m.name.toLowerCase() === activeStep?.name.toLowerCase()) || activeModel.cycles[0]?.modules[0] || {
    id: 'mod-1',
    name: activeStep?.name || 'Optical Stage',
    moduleType: 'Pump',
    opticalPosition: 1,
    reference: { isComplete: true, status: 'Complete' }
  };

  // Construct 3-Joint readings for 4 Master Fault Cases
  const stepJointReadings = {
    beforeLive: jointReadings.Before,
    beforeRef: parseFloat(refThresholds.intensity) || 12.0,
    upperLive: jointReadings.Upper,
    upperRef: parseFloat(refThresholds.intensity) || 12.0,
    afterLive: jointReadings.After,
    afterRef: parseFloat(refThresholds.intensity) || 12.0
  };

  // Determine if previous step passed for Case 4 (Mid-Path Interruption) evaluation
  const allStepsList = cycles.flatMap(c => c.steps);
  const activeStepIdx = allStepsList.findIndex(s => s.id === activeStepId);
  const previousStepPassed = activeStepIdx > 0
    ? (allStepsList[activeStepIdx - 1]?.status === 'success' || allStepsList[activeStepIdx - 1]?.status === 'completed' || simulatedPrevStepPassed)
    : simulatedPrevStepPassed;

  const liveDiagnosis = diagnoseFaults(
    activeComparisonsForDiagnosis,
    refParamsNum,
    liveParamsNum,
    activeModuleForDiagnosis,
    selectedJoint,
    stepJointReadings,
    previousStepPassed
  );

  // Capture countdown state (5-sec stable reading)
  const [captureCountdown, setCaptureCountdown] = useState<number>(5);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);

  // Serial Number state for Faulty Pulse Source under test
  const [serialNumber, setSerialNumber] = useState<string>(() => {
    return `SN-${activeModel.brand.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  // Pending test recovery session
  const [pendingTestBanner, setPendingTestBanner] = useState<PendingTestSession | null>(null);

  // Check for pending test on mount or activeModel change and auto-hydrate state
  useEffect(() => {
    const pending = localDB.getPendingTest(`pending-${activeModel.id}`) || localDB.getPendingTest();
    if (pending && (Object.keys(pending.jointStatuses || {}).length > 0 || pending.serialNumber)) {
      setPendingTestBanner(pending);
      if (pending.serialNumber) setSerialNumber(pending.serialNumber);
      if (pending.activeCycleId) setActiveCycleId(pending.activeCycleId);
      if (pending.activeStepId) setActiveStepId(pending.activeStepId);
      if (pending.selectedJoint) setSelectedJoint(pending.selectedJoint);
      if (pending.jointStatuses) setJointStatuses(pending.jointStatuses);
      if (pending.capturedParams) setCapturedParams(pending.capturedParams);
      if (pending.activeFault) {
        setActiveFault(pending.activeFault as SimulatedFaultType);
        esp32Service.setFaultSimulation(pending.activeFault as SimulatedFaultType);
      }
    } else {
      setPendingTestBanner(null);
    }
  }, [activeModel.id]);

  // Joint Status Engine: Key = `${cycleId}-${stepId}-${jointKey}` -> 'Pending' | 'Captured' | 'Saved' | 'Skipped' | 'Error'
  const [jointStatuses, setJointStatuses] = useState<Record<string, 'Pending' | 'Captured' | 'Saved' | 'Skipped' | 'Error'>>({});

  // Auto-save pending test session to Local Storage
  useEffect(() => {
    const completedJoints = Object.values(jointStatuses).filter(st => st === 'Saved' || st === 'Skipped' || st === 'Captured').length;
    const totalJoints = (cycles.reduce((acc, c) => acc + c.steps.length, 0)) * 3;

    if (completedJoints > 0 || serialNumber) {
      const session: PendingTestSession = {
        id: `pending-${activeModel.id}`,
        serialNumber,
        modelId: activeModel.id,
        brand: activeModel.brand,
        modelName: activeModel.modelName,
        activeCycleId,
        activeStepId,
        selectedJoint,
        activeFault,
        jointStatuses,
        capturedParams,
        lastSavedAt: new Date().toISOString(),
        completedJointsCount: completedJoints,
        totalJointsCount: totalJoints
      };
      localDB.savePendingTest(session);
    }
  }, [serialNumber, jointStatuses, capturedParams, activeCycleId, activeStepId, selectedJoint, activeFault, cycles, activeModel]);

  // Subscribe to Physical ESP32 Hardware Switches (GPIO5 Capture & GPIO6 Next)
  useEffect(() => {
    const unsubHW = esp32Service.subscribeHardwareEvents((event) => {
      if (event === 'CAPTURE') {
        handleCaptureReading();
      } else if (event === 'NEXT') {
        handleSaveAndNext();
      }
    });
    return () => unsubHW();
  }, [isCapturing, hasCaptured, selectedJoint, activeStepId, activeCycleId]);

  const handleResumePendingTest = () => {
    if (!pendingTestBanner) return;
    if (pendingTestBanner.serialNumber) setSerialNumber(pendingTestBanner.serialNumber);
    if (pendingTestBanner.activeCycleId) setActiveCycleId(pendingTestBanner.activeCycleId);
    if (pendingTestBanner.activeStepId) setActiveStepId(pendingTestBanner.activeStepId);
    if (pendingTestBanner.selectedJoint) setSelectedJoint(pendingTestBanner.selectedJoint);
    if (pendingTestBanner.jointStatuses) setJointStatuses(pendingTestBanner.jointStatuses);
    if (pendingTestBanner.capturedParams) setCapturedParams(pendingTestBanner.capturedParams);
    if (pendingTestBanner.activeFault) {
      setActiveFault(pendingTestBanner.activeFault as SimulatedFaultType);
      esp32Service.setFaultSimulation(pendingTestBanner.activeFault as SimulatedFaultType);
    }
    setPendingTestBanner(null);
  };

  const handleDiscardPendingTest = () => {
    localDB.clearPendingTest();
    setPendingTestBanner(null);
    setJointStatuses({});
  };

  const getJointKey = (jointKey: JointType = selectedJoint, stepId: string = activeStepId, cycleId: string = activeCycleId) => {
    return `${cycleId}-${stepId}-${jointKey}`;
  };

  const currentJointStatus = jointStatuses[getJointKey()] || 'Pending';

  // --- NEW CAPTURE PROTOCOL ENGINE (100 SAMPLES ARITHMETIC MEAN) ---
  const processCapturedSamples = useCallback((samples: number[], readingTimeSec: number = 5.0) => {
    if (!Array.isArray(samples) || samples.length === 0) return;

    // Validate 100 numeric samples
    const validSamples = samples.map(s => Number(s)).filter(s => !isNaN(s));
    const count = validSamples.length;

    // 7. Calculate arithmetic mean: average = sum(samples) / 100
    const sum = validSamples.reduce((acc, v) => acc + v, 0);
    const avg = count > 0 ? sum / count : 0;

    // 10. Min = minimum of the 100 samples
    const minVal = count > 0 ? Math.min(...validSamples) : 0;

    // 11. Max = maximum of the 100 samples
    const maxVal = count > 0 ? Math.max(...validSamples) : 0;

    // 12. Stability calculated from the 100 samples
    const range = maxVal - minVal;
    const stabilityVal = avg > 0 ? Math.max(0, Math.min(100, 100 * (1 - range / (2 * avg)))) : 0;

    // 14 & 15. Optical Loss and Tolerance calculated against baseline reference
    const refIntensity = parseFloat(refThresholds.intensity) || 100;
    const lossVal = Math.max(0, ((refIntensity - avg) / (refIntensity || 1)) * 100);
    const toleranceVal = Math.abs(((avg - refIntensity) / (refIntensity || 1)) * 100);

    const newParams = {
      intensity: `${avg.toFixed(2)} %`,
      averagePower: `${avg.toFixed(2)} W`,
      loss: `${lossVal.toFixed(2)} %`,
      stability: `${stabilityVal.toFixed(2)} %`,
      minimum: `${minVal.toFixed(2)} W`,
      maximum: `${maxVal.toFixed(2)} W`,
      tolerance: `${toleranceVal.toFixed(2)} %`,
      readingTime: `${readingTimeSec.toFixed(2)} s`
    };

    setCapturedParams(newParams);
    setIsCapturing(false);
    setHasCaptured(true);
    samplesReceivedRef.current = true;

    setJointStatuses((prev) => ({
      ...prev,
      [`${activeCycleId}-${activeStepId}-${selectedJoint}`]: 'Captured'
    }));

    setJointReadings((prev) => ({
      ...prev,
      [selectedJoint]: avg
    }));
  }, [selectedJoint, refThresholds.intensity, activeCycleId, activeStepId]);

  // Subscribe to ESP32 Hardware Capture Protocol Events
  useEffect(() => {
    const unsubCapEvents = esp32Service.subscribeCaptureEvents((evt) => {
      if (evt.type === 'CAPTURE_STARTED') {
        setIsCapturing(true);
        setCaptureCountdown(5);
        setHasCaptured(false);
        samplesReceivedRef.current = false;
      } else if (evt.type === 'SAMPLES') {
        const { capture_id, samples, reading_time } = evt.payload;
        if (Array.isArray(samples) && samples.length === 100) {
          const validNumSamples = samples.map(s => Number(s));
          setRawSamplesData({
            captureId: capture_id || `CAP_${Date.now().toString().slice(-4)}`,
            sampleCount: validNumSamples.length,
            readingTime: reading_time || 5.0,
            samples: validNumSamples,
            timestamp: new Date().toLocaleTimeString(),
            source: 'REAL_ESP32',
            deviceUid: espStatus.serialNumber || 'ESP32-S3-UID',
            connectionType: espStatus.connectionType
          });
          processCapturedSamples(validNumSamples, reading_time || 5.0);
        } else {
          alert(`❌ INVALID CAPTURE DATA: ESP32 returned ${samples?.length || 0} samples. Expected exactly 100 samples.`);
          setIsCapturing(false);
        }
      } else if (evt.type === 'CAPTURE_COMPLETE') {
        setIsCapturing(false);
      }
    });
    return () => unsubCapEvents();
  }, [processCapturedSamples, espStatus.serialNumber, espStatus.connectionType]);

  const handleCaptureReading = async () => {
    if (isCapturing) return;

    // MANDATORY HARDWARE CHECK: No capture without real connected & verified ESP32
    const currentEspStatus = esp32Service.getStatus();
    if (!currentEspStatus.connected || !esp32Service.getIsRealHardwareConnected()) {
      alert("❌ ESP32 NOT CONNECTED\n\nCannot perform capture because no physical ESP32-S3 hardware is connected and verified.\n\nPlease connect real hardware via USB COM Port or Wi-Fi before capturing.");
      return;
    }

    setIsCapturing(true);
    setCaptureCountdown(5);
    setHasCaptured(false);
    samplesReceivedRef.current = false;

    const capId = `TEST00${captureSequenceIndex + 1}`;
    setCaptureSequenceIndex((idx) => idx + 1);

    // Send CAPTURE:<capture_id> command to real ESP32
    try {
      await esp32Service.sendRawCommand(`CAPTURE:${capId}`);
    } catch (e: any) {
      alert(`ESP32 Capture Transmission Failed: ${e.message || e}`);
      setIsCapturing(false);
      return;
    }

    const timer = setInterval(() => {
      setCaptureCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Protection: If 100 raw samples were not received over hardware, stop capture
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

  const handleSaveAndNext = async () => {
    if (!hasCaptured && currentJointStatus !== 'Captured' && currentJointStatus !== 'Saved') {
      alert('Please perform "CAPTURE READING" (5s Stable Reading) before saving.');
      return;
    }

    // Mark current joint as SAVED (Green)
    setJointStatuses((prev) => ({
      ...prev,
      [getJointKey()]: 'Saved'
    }));
    setHasCaptured(false);

    // Send <SAV> and <NJT> to ESP32
    try {
      await esp32Service.sendRawCommand('<SAV>');
      await esp32Service.sendRawCommand('<NJT>');
    } catch (e) {
      console.warn('ESP32 command failed:', e);
    }

    // Move to next joint in cycle: Before -> Upper -> After -> Next Step
    if (selectedJoint === 'Before') {
      setSelectedJoint('Upper');
    } else if (selectedJoint === 'Upper') {
      setSelectedJoint('After');
    } else if (selectedJoint === 'After') {
      setSelectedJoint('Before');
      // Move to next step
      const currentStepIndex = activeCycle.steps.findIndex((s) => s.id === activeStepId);
      if (currentStepIndex !== -1 && currentStepIndex < activeCycle.steps.length - 1) {
        setActiveStepId(activeCycle.steps[currentStepIndex + 1].id);
      } else {
        const cycleIndex = cycles.findIndex((c) => c.id === activeCycleId);
        if (cycleIndex !== -1 && cycleIndex < cycles.length - 1) {
          const nextCycle = cycles[cycleIndex + 1];
          setActiveCycleId(nextCycle.id);
          if (nextCycle.steps.length > 0) {
            setActiveStepId(nextCycle.steps[0].id);
          }
        }
      }
    }
  };

  const handleSkipJoint = async () => {
    // Mark current joint as SKIPPED (Yellow)
    setJointStatuses((prev) => ({
      ...prev,
      [getJointKey()]: 'Skipped'
    }));
    setHasCaptured(false);

    try {
      await esp32Service.sendRawCommand('<NJT>');
    } catch (e) {
      console.warn('ESP32 command failed:', e);
    }

    if (selectedJoint === 'Before') {
      setSelectedJoint('Upper');
    } else if (selectedJoint === 'Upper') {
      setSelectedJoint('After');
    } else if (selectedJoint === 'After') {
      setSelectedJoint('Before');
      const currentStepIndex = activeCycle.steps.findIndex((s) => s.id === activeStepId);
      if (currentStepIndex !== -1 && currentStepIndex < activeCycle.steps.length - 1) {
        setActiveStepId(activeCycle.steps[currentStepIndex + 1].id);
      }
    }
  };

  const handleStepSelect = (cycleId: string, stepId: string) => {
    setActiveCycleId(cycleId);
    setActiveStepId(stepId);
  };

  const handleFaultChange = (f: SimulatedFaultType) => {
    setActiveFault(f);
    esp32Service.setFaultSimulation(f);
  };

  const handleTriggerDiagnosis = () => {
    const stepIdx = activeCycle.steps.findIndex(s => s.id === activeStepId);
    let beforeLive = 12, upperLive = 12, afterLive = 12;
    let prevPassed = false;

    if (activeFault === 'Case1_SourceDamaged') {
      beforeLive = 0; upperLive = 0; afterLive = 0;
    } else if (activeFault === 'Case2_UpperHighReflect') {
      beforeLive = 12; upperLive = 30; afterLive = 1;
    } else if (activeFault === 'Case3_AfterNoSignal') {
      beforeLive = 12; upperLive = 12; afterLive = 1;
    } else if (activeFault === 'Case4_MidPathInterruption') {
      if (stepIdx <= 0) {
        beforeLive = 12; upperLive = 12; afterLive = 12;
      } else {
        beforeLive = 0; upperLive = 0; afterLive = 0;
        prevPassed = true;
      }
    } else {
      const capVal = parseFloat(capturedParams.intensity) || parseFloat(capturedParams.averagePower) || 12;
      if (selectedJoint === 'Before') beforeLive = capVal;
      if (selectedJoint === 'Upper') upperLive = capVal;
      if (selectedJoint === 'After') afterLive = capVal;
    }

    const stepDiag = evaluateOpticalStepDiagnosis(
      activeStep.name,
      {
        beforeLive,
        beforeRef: 12,
        upperLive,
        upperRef: 12,
        afterLive,
        afterRef: 12
      },
      prevPassed
    );

    const isPass = stepDiag.severity === 'Information';

    const report: DiagnosisReport = {
      id: `FSDP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      testId: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      customerName: 'Factory Operations (Unit A)',
      machineId: 'MAC-8891-XL',
      machineName: 'High Precision Fiber Laser Workstation',
      engineerName: 'Rajesh Patel (Lead Service Eng.)',
      brand: activeModel.brand,
      modelName: activeModel.modelName,
      serialNumber: serialNumber || `SN-${activeModel.brand.toUpperCase()}-9912`,
      cycleName: activeCycle.name,
      moduleName: activeStep.name,
      joint: selectedJoint,
      referenceReading: refParamsNum,
      liveReading: liveParamsNum,
      comparisons: liveComparisons,
      overallStatus: isPass ? 'PASS' : 'FAIL',
      healthScore: stepDiag.healthScore,
      healthGrade: stepDiag.healthScore >= 85 ? 'Excellent' : stepDiag.healthScore >= 65 ? 'Good' : 'Critical',
      triggeredRules: [
        {
          id: stepDiag.ruleCase,
          name: stepDiag.caseTitle,
          category: 'Joint Analysis',
          priority: 1,
          severity: stepDiag.severity,
          conditionDescription: `Before: ${beforeLive} W (Ref: 12W), Upper: ${upperLive} W (Ref: 12W), After: ${afterLive} W (Ref: 12W)`,
          diagnosisText: stepDiag.finalVerdict,
          faultLocation: `${stepDiag.moduleA} → ${stepDiag.moduleB}`,
          confidence: 99,
          probableCauses: stepDiag.probableCauses,
          recommendedActions: stepDiag.repairSteps,
          nextSuggestedTest: isPass ? 'Proceed to next optical stage' : 'Inspect fiber joint splice or replace damaged module'
        }
      ],
      primaryFaultLocation: `${stepDiag.moduleA} → ${stepDiag.moduleB}`,
      evidenceSummary: stepDiag.finalVerdict,
      probableCauses: stepDiag.probableCauses.map((cause, i) => ({ cause, probability: Math.max(30, 95 - i * 15) })),
      repairSteps: stepDiag.repairSteps,
      nextTestRecommendation: isPass ? 'Proceed to Next Module' : 'Perform Joint Inspection & Fiber Connection Check'
    };

    localDB.clearPendingTest();
    setPendingTestBanner(null);
    localDB.saveReport(report);
    onNavigateToDiagnosis(report);
  };

  return (
    <div className="h-full flex flex-col bg-[#070B14] text-white font-sans select-none overflow-hidden">
      {/* MODULE HEADER BAR */}
      <div className="bg-[#0B1120] border-b border-slate-800 px-2.5 py-1 flex flex-wrap justify-between items-center gap-1.5 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white tracking-wider font-sans uppercase">
            LIVE TEST
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            • Fiber Source Diagnostic Pro
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Faulty Pulse Source Serial Number Input */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">
            <span className="text-cyan-400 font-bold hidden xs:inline">S/N:</span>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Pulse Source Serial No"
              title="Serial Number of Faulty Pulse Source Under Test"
              className="bg-slate-800 text-emerald-300 font-mono font-bold border border-slate-700 rounded px-1.5 py-0.5 outline-none text-[10px] w-28 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={() => setSerialNumber(`SN-${activeModel.brand.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`)}
              className="text-slate-400 hover:text-cyan-300 p-0.5"
              title="Generate New Serial Number"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Active Model Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">
            <span className="text-slate-400 font-bold">Model:</span>
            <select
              value={activeModel.id}
              onChange={(e) => {
                const selected = models.find(m => m.id === e.target.value);
                if (selected) onSelectModel(selected);
              }}
              className="bg-slate-800 text-cyan-300 font-mono font-bold border border-slate-700 rounded px-1 py-0.5 outline-none text-[10px]"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.modelName} ({m.ratedPowerW}W)
                </option>
              ))}
            </select>
          </div>


          <div className="bg-[#0f172a] border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-slate-200">
            Step {currentStepNum}/{stepTotal}
          </div>
        </div>
      </div>

      {/* PENDING TEST RECOVERY SESSION BANNER */}
      {pendingTestBanner && (
        <div className="bg-amber-950/90 border-b border-amber-500/80 px-2.5 py-1 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-[11px]">
              <span className="font-extrabold text-amber-300 uppercase tracking-wider">
                PENDING TEST RECOVERED:
              </span>
              <span className="text-slate-200 ml-1.5 font-mono">
                S/N: <strong className="text-emerald-300">{pendingTestBanner.serialNumber}</strong> ({pendingTestBanner.brand} {pendingTestBanner.modelName})
              </span>
              <span className="text-slate-400 ml-2 hidden md:inline">
                • Progress: <strong className="text-cyan-300">{pendingTestBanner.completedJointsCount} / {pendingTestBanner.totalJointsCount || 3} Joints</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResumePendingTest}
              className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow flex items-center gap-1 transition-colors text-[10px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESUME PENDING TEST</span>
            </button>
            <button
              onClick={handleDiscardPendingTest}
              className="px-2 py-0.5 bg-slate-800 hover:bg-red-700 text-slate-300 hover:text-white font-bold rounded border border-slate-600 text-[10px] transition-colors"
            >
              DISCARD
            </button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="flex-1 p-1.5 grid grid-cols-1 lg:grid-cols-12 gap-1.5 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: TEST PROGRESS SIDEBAR WITH EDIT, RENAME, DELETE, DRAG & DROP */}
        <div className="lg:col-span-4 bg-[#0B132B] border border-slate-800 rounded-lg p-2 flex flex-col justify-between shadow-xl overflow-y-auto h-full space-y-1.5 min-h-0">
          <div>
            <div className="flex items-center justify-between uppercase mb-2 border-b border-slate-800/80 pb-1.5">
              <div className="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
                <span className="text-lime-400 font-mono text-xs">▼</span>
                <span>TEST PROGRESS</span>
              </div>
              
            </div>

            {/* CYCLES LIST */}
            <div className="space-y-2">
              {cycles.map((cycle) => (
                <div key={cycle.id} className="bg-[#091024] border border-slate-800/90 rounded-lg p-2 space-y-1.5">
                  
                  {/* CYCLE HEADER */}
                  <div className="flex items-center justify-between text-xs font-bold font-mono">
                    <div className="flex items-center gap-1 flex-1 overflow-hidden pr-1">
                      <button
                        onClick={() => toggleCycleOpen(cycle.id)}
                        className="text-lime-400 hover:text-lime-300"
                      >
                        {cycle.isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>

                      {editingCycleId === cycle.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingCycleName}
                            onChange={(e) => setEditingCycleName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCycleRename(cycle.id)}
                            className="bg-slate-900 border border-amber-400 text-amber-300 text-xs px-1.5 py-0.5 rounded outline-none w-full font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCycleRename(cycle.id)}
                            className="p-0.5 text-emerald-400 hover:bg-slate-800 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingCycleId(null)}
                            className="p-0.5 text-slate-400 hover:bg-slate-800 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => toggleCycleOpen(cycle.id)}
                          className="text-lime-400 cursor-pointer font-extrabold truncate text-xs"
                        >
                          {cycle.name}
                        </span>
                      )}
                    </div>

                    {/* Cycle Action Buttons */}
                    <div className="flex items-center gap-0.5 text-[10px]">
                      <button
                        onClick={(e) => handleStartRenameCycle(cycle, e)}
                        className="p-0.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded"
                        title="Rename Cycle"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleAddStep(cycle.id)}
                        className="p-0.5 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded"
                        title="Add Step to Cycle"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteCycle(cycle.id, e)}
                        className="p-0.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                        title="Delete Cycle"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* CYCLE STEPS LIST (DRAGGABLE & EDITABLE) */}
                  {cycle.isOpen && (
                    <div className="space-y-1 pl-1">
                      {cycle.steps.map((step, index) => {
                        const isSelected = activeCycleId === cycle.id && activeStepId === step.id;
                        const isDragOver = dragOverInfo?.cycleId === cycle.id && dragOverInfo?.index === index;

                        return (
                          <div
                            key={step.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, cycle.id, step.id, index)}
                            onDragOver={(e) => handleDragOver(e, cycle.id, index)}
                            onDrop={(e) => handleDrop(e, cycle.id, index)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleStepSelect(cycle.id, step.id)}
                            className={`p-1.5 rounded-md border flex items-center justify-between cursor-pointer transition-all text-xs font-mono group ${
                              isDragOver
                                ? 'border-2 border-emerald-400 bg-emerald-950/30'
                                : isSelected
                                ? 'bg-amber-500/10 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                : 'bg-[#111A30] border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden flex-1 pr-1">
                              {/* Drag Handle */}
                              <div className="cursor-grab active:cursor-grabbing text-slate-600 group-hover:text-slate-400 shrink-0">
                                <GripVertical className="w-3 h-3" />
                              </div>

                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : 'border border-slate-600 text-slate-400 bg-slate-900/60'
                                }`}
                              >
                                {step.stepNum}
                              </span>

                              {editingStepId === step.id ? (
                                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingStepName}
                                    onChange={(e) => setEditingStepName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveStepRename(cycle.id, step.id)}
                                    className="bg-slate-900 border border-amber-400 text-amber-300 text-xs px-1 py-0.5 rounded outline-none w-full font-bold"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveStepRename(cycle.id, step.id)}
                                    className="p-0.5 text-emerald-400 hover:bg-slate-800 rounded"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingStepId(null)}
                                    className="p-0.5 text-slate-400 hover:bg-slate-800 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className={`truncate font-semibold text-xs ${isSelected ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                                  {step.name}
                                </span>
                              )}
                            </div>

                            {/* Step Item Quick Actions */}
                            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={(e) => handleStartRenameStep(step, e)}
                                className="p-0.5 text-slate-500 hover:text-amber-300 rounded"
                                title="Rename Step"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              <button
                                onClick={(e) => handleDeleteStep(cycle.id, step.id, e)}
                                className="p-0.5 text-slate-500 hover:text-red-400 rounded"
                                title="Delete Step"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {cycle.steps.length === 0 && (
                        <div className="text-center py-1.5 text-slate-500 text-[10px] font-mono italic">
                          No steps in {cycle.name}. Click + to add.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN TEST PANEL (8 Cols on desktop) */}
        <div className="lg:col-span-8 bg-[#0B132B] border border-slate-800 rounded-lg p-2 flex flex-col justify-between shadow-xl overflow-hidden h-full space-y-1.5 min-h-0">
          <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
            
            {/* COMPACT HORIZONTAL JOINT HEADER BANNER */}
            <div className="bg-[#0d1836] border border-slate-800 px-2.5 py-1 rounded-lg shadow-inner flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Joint Name & Rename */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-1 py-0.2 rounded font-mono">
                  JOINT
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-300 font-sans tracking-wide">
                  {activeStep.name}
                </span>
                <button
                  onClick={() => {
                    setPromptModal({
                      isOpen: true,
                      title: 'Rename Joint Position',
                      message: 'Rename Current Joint Position:',
                      defaultValue: activeStep.name,
                      onSave: (newName) => {
                        if (!newName.trim()) return;
                        setCycles(prev => prev.map(c => c.id === activeCycleId ? {
                          ...c,
                          steps: c.steps.map(s => s.id === activeStepId ? { ...s, name: newName.trim() } : s)
                        } : c));
                        setPromptModal((prev) => ({ ...prev, isOpen: false }));
                      }
                    });
                  }}
                  className="text-slate-400 hover:text-amber-300 p-0.5"
                  title="Rename Joint"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>

              {/* Compact Joint Selection Tabs (Before, Upper, After) */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                {(['Before', 'Upper', 'After'] as JointType[]).map((jKey) => {
                  const isActive = selectedJoint === jKey;
                  const jStatus = jointStatuses[getJointKey(jKey)] || 'Pending';

                  let statusBg = 'bg-slate-600';
                  let statusText = 'Pending';
                  if (jStatus === 'Saved') {
                    statusBg = 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
                    statusText = 'Completed';
                  } else if (jStatus === 'Skipped') {
                    statusBg = 'bg-amber-400 shadow-[0_0_6px_#f59e0b]';
                    statusText = 'Skipped';
                  } else if (jStatus === 'Captured') {
                    statusBg = 'bg-blue-400 shadow-[0_0_6px_#60a5fa]';
                    statusText = 'Ready';
                  } else if (jStatus === 'Error') {
                    statusBg = 'bg-red-500 shadow-[0_0_6px_#ef4444]';
                    statusText = 'Error';
                  }

                  return (
                    <div
                      key={jKey}
                      onClick={() => setSelectedJoint(jKey)}
                      className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
                        isActive ? 'bg-slate-900 border border-amber-400/50 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                      <span className="uppercase font-bold tracking-wider">{jKey}</span>
                      <span className={`w-2 h-2 rounded-full ${statusBg}`} />
                      <span className="text-[9px] uppercase font-bold text-slate-300">{statusText}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5-SECOND STABLE CAPTURE COUNTDOWN BAR */}
            {isCapturing && (
              <div className="bg-slate-950 border border-cyan-500/60 px-2.5 py-1 rounded-md shadow-md space-y-0.5 animate-pulse shrink-0">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-cyan-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span>5-SEC SENSOR CAPTURE IN PROGRESS...</span>
                  </span>
                  <span className="text-amber-300 font-extrabold text-[11px]">{6 - captureCountdown} / 5 s</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-amber-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((6 - captureCountdown) / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* DATA TABLE CONTAINER */}
            <div className="bg-[#091124] border border-blue-900/60 rounded-lg overflow-hidden shadow-xl flex-1 flex flex-col min-h-0">
              <div className="px-2.5 py-1 bg-[#12203A] flex flex-wrap justify-between items-center gap-1 text-[10px] font-mono font-bold text-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">⚡</span>
                  <span className="uppercase tracking-wider">PARAMETER BASELINE & LIVE COMPARISON</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono">
                    {activeComparisonsForDiagnosis.length}/{liveComparisons.length} Active for Diagnosis
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowEditLiveModal(true)}
                    className="px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[9px] font-bold flex items-center gap-1 transition-colors shadow"
                    title="Temporarily edit live sensor readings to test diagnostic rules"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Edit Live Readings (Test)</span>
                  </button>
                  <button
                    onClick={() => setShowEditRefModal(true)}
                    className="px-1.5 py-0.2 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] flex items-center gap-0.5 transition-colors"
                  >
                    <Settings className="w-2.5 h-2.5" />
                    <span>Edit Baseline</span>
                  </button>
                </div>
              </div>

              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse text-[11px] font-mono">
                  <thead>
                    <tr className="bg-[#0d172e] text-slate-300 border-b border-blue-900/80 font-bold uppercase text-[10px]">
                      <th className="py-1.5 px-2 text-center w-8">
                        <input
                          type="checkbox"
                          checked={Object.values(enabledParams).every(Boolean)}
                          onChange={(e) => toggleAllParams(e.target.checked)}
                          className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                          title="Check/Uncheck All Parameters for Diagnosis Evaluation"
                        />
                      </th>
                      <th className="py-1.5 px-3">PARAMETER</th>
                      <th className="py-1.5 px-3 text-center">CAPTURED</th>
                      <th className="py-1.5 px-3 text-center">BASELINE</th>
                      <th className="py-1.5 px-3 text-center">DIFF (Δ)</th>
                      <th className="py-1.5 px-3 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {liveComparisons.map((comp) => {
                      const isEnabled = enabledParams[comp.parameterName] !== false;
                      const diffSign = comp.difference > 0 ? '+' : '';
                      const isFail = isEnabled && comp.status === 'FAIL';
                      const isWarn = isEnabled && comp.status === 'WARNING';

                      let icon = <Zap className="w-3.5 h-3.5 text-amber-400" />;
                      if (comp.parameterName === 'intensity') icon = <Sun className="w-3.5 h-3.5 text-amber-400" />;
                      if (comp.parameterName === 'averagePower') icon = <Zap className="w-3.5 h-3.5 text-orange-400" />;
                      if (comp.parameterName === 'loss') icon = <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />;
                      if (comp.parameterName === 'stability') icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
                      if (comp.parameterName === 'minimum') icon = <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-400" />;
                      if (comp.parameterName === 'maximum') icon = <ArrowUpCircle className="w-3.5 h-3.5 text-cyan-400" />;
                      if (comp.parameterName === 'tolerance') icon = <BarChart2 className="w-3.5 h-3.5 text-purple-400" />;
                      if (comp.parameterName === 'readingTime') icon = <Clock className="w-3.5 h-3.5 text-blue-400" />;

                      return (
                        <tr key={comp.parameterName} className={`hover:bg-[#111F38]/60 transition-colors ${!isEnabled ? 'opacity-50 bg-slate-950/40' : ''}`}>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleParamBypass(comp.parameterName)}
                              className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                              title={isEnabled ? "Click to Bypass Parameter in Diagnosis" : "Click to Enable Parameter for Diagnosis"}
                            />
                          </td>

                          <td className="py-1 px-3 font-semibold text-slate-200 flex items-center gap-2">
                            {icon}
                            <span>{comp.label} ({comp.unit})</span>
                            {!isEnabled && <span className="text-[9px] text-amber-400/80 italic font-mono">(Bypassed)</span>}
                          </td>

                          <td className={`py-1 px-3 text-center font-bold text-xs ${!isEnabled ? 'text-slate-400' : isFail ? 'text-red-400 font-extrabold' : isWarn ? 'text-amber-300' : 'text-emerald-400'}`}>
                            {comp.liveValue} {comp.unit}
                          </td>

                          <td className="py-1 px-3 text-center font-bold text-slate-300 text-[11px] bg-slate-900/40">
                            {comp.referenceValue} {comp.unit}
                          </td>

                          <td className={`py-1 px-3 text-center font-bold text-[11px] ${!isEnabled ? 'text-slate-500' : isFail ? 'text-red-400' : isWarn ? 'text-amber-300' : 'text-slate-400'}`}>
                            {comp.difference === 0 ? (
                              <span className="text-slate-500">0.00</span>
                            ) : (
                              <span>
                                {diffSign}{comp.difference} {comp.unit} ({diffSign}{comp.differencePercent}%)
                              </span>
                            )}
                          </td>

                          <td className="py-1 px-3 text-center font-bold text-[10px]">
                            {!isEnabled ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full bg-slate-800 border border-slate-600 text-slate-400 font-bold">
                                <MinusCircle className="w-3 h-3 text-slate-400" /> BYPASSED
                              </span>
                            ) : isFail ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full bg-red-950 border border-red-500 text-red-400 font-black">
                                <XCircle className="w-3 h-3" /> FAULT
                              </span>
                            ) : isWarn ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full bg-amber-950 border border-amber-500 text-amber-300 font-black">
                                <AlertTriangle className="w-3 h-3" /> DEVIATION
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3 h-3" /> PASS
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BUTTON TO OPEN DIAGNOSIS ENGINE MODAL */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a1226] border border-cyan-500/50 p-2.5 rounded-xl shadow-lg font-mono">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${
                  liveDiagnosis.overallStatus === 'FAIL' 
                    ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse' 
                    : liveDiagnosis.overallStatus === 'WARNING'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                    : 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                }`}>
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white tracking-wider uppercase flex items-center gap-1.5">
                    DIAGNOSIS ENGINE
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      liveDiagnosis.overallStatus === 'FAIL' ? 'bg-red-600 text-white' : liveDiagnosis.overallStatus === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {liveDiagnosis.overallStatus === 'FAIL' ? '🔴 FAULT' : liveDiagnosis.overallStatus === 'WARNING' ? '⚠️ DEVIATION' : '🟢 NOMINAL PASS'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                    Score: <strong className={liveDiagnosis.healthScore < 60 ? 'text-red-400' : liveDiagnosis.healthScore < 85 ? 'text-amber-300' : 'text-emerald-400'}>{liveDiagnosis.healthScore}/100 ({liveDiagnosis.healthGrade})</strong> • {liveDiagnosis.triggeredRules.length} Rule(s) Triggered
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDiagnosisModal(true)}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-[11px] rounded-lg shadow-md border border-cyan-400/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-cyan-200" />
                <span>OPEN DIAGNOSIS ENGINE</span>
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS GRID (4 EQUAL BUTTONS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            
            {/* 1. CAPTURE READING */}
            <button
              onClick={handleCaptureReading}
              disabled={isCapturing}
              className="bg-[#1E40AF] hover:bg-[#1D3587] disabled:opacity-50 text-white p-2.5 rounded-lg border border-blue-400/30 flex items-center gap-2 shadow-md transition-all text-left active:scale-[0.98]"
            >
              <div className="p-1.5 bg-blue-950/80 rounded-full border border-blue-400/40 shrink-0">
                <Target className={`w-5 h-5 text-white ${isCapturing ? 'animate-spin text-amber-300' : ''}`} />
              </div>
              <div className="overflow-hidden">
                <div className="font-extrabold text-xs text-white tracking-wide uppercase leading-tight">
                  CAPTURE
                </div>
                <div className="text-[9px] text-blue-200/90 font-mono mt-0.5 truncate">
                  5 Sec Reading
                </div>
              </div>
            </button>

            {/* 2. SAVE & NEXT */}
            <button
              onClick={handleSaveAndNext}
              className="bg-[#15803D] hover:bg-[#116630] text-white p-2.5 rounded-lg border border-emerald-400/30 flex items-center gap-2 shadow-md transition-all text-left active:scale-[0.98]"
            >
              <div className="p-1.5 bg-emerald-950/80 rounded-full border border-emerald-400/40 shrink-0">
                <Save className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="font-extrabold text-xs text-white tracking-wide uppercase leading-tight">
                  SAVE & NEXT
                </div>
                <div className="text-[9px] text-emerald-200/90 font-mono mt-0.5 truncate">
                  Save & Advance
                </div>
              </div>
            </button>

            {/* 3. RETEST */}
            <button
              onClick={handleCaptureReading}
              className="bg-[#C2410C] hover:bg-[#9A3412] text-white p-2.5 rounded-lg border border-orange-400/30 flex items-center gap-2 shadow-md transition-all text-left active:scale-[0.98]"
            >
              <div className="p-1.5 bg-orange-950/80 rounded-full border border-orange-400/40 shrink-0">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="font-extrabold text-xs text-white tracking-wide uppercase leading-tight">
                  RETEST
                </div>
                <div className="text-[9px] text-orange-200/90 font-mono mt-0.5 truncate">
                  Retest Position
                </div>
              </div>
            </button>

            {/* 4. SKIP */}
            <button
              onClick={handleSkipJoint}
              disabled={isCapturing}
              className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 text-white p-2.5 rounded-lg border border-red-400/30 flex items-center gap-2 shadow-md transition-all text-left active:scale-[0.98]"
            >
              <div className="p-1.5 bg-red-950/80 rounded-full border border-red-400/40 shrink-0">
                <FastForward className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="font-extrabold text-xs text-white tracking-wide uppercase leading-tight">
                  SKIP
                </div>
                <div className="text-[9px] text-red-200/90 font-mono mt-0.5 truncate">
                  Skip Joint
                </div>
              </div>
            </button>

          </div>

        </div>
      </div>

      {/* MODAL: EDIT REFERENCE BASELINE DATA */}
      {showEditRefModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
              <Settings className="w-5 h-5 text-amber-400" />
              EDIT REFERENCE DATA BASELINES
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.keys(refThresholds).map((key) => (
                <div key={key}>
                  <label className="text-gray-300 block mb-1 font-semibold uppercase">{key}</label>
                  <input
                    type="text"
                    value={refThresholds[key]}
                    onChange={(e) => setRefThresholds({ ...refThresholds, [key]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono rounded p-2 text-xs outline-none focus:border-amber-400"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-700 text-xs">
              <button
                onClick={() => setShowEditRefModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TEMPORARY EDIT LIVE TEST READINGS */}
      {showEditLiveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1F2937] border border-cyan-800/80 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Pencil className="w-4 h-4 text-cyan-400" />
                <span>Temporary Test: Edit Live Sensor Readings</span>
              </h3>
              <button
                onClick={() => setShowEditLiveModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Edit live test parameter values manually to simulate optical sensor conditions and test diagnostic rule evaluations in real time.
            </p>

            {/* Quick Presets for 4 Master Fault Cases */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-amber-300 font-mono uppercase tracking-wider block">
                Quick Master Fault Presets (±2 W Tolerance Engine):
              </span>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => {
                    setJointReadings({ Before: 12.0, Upper: 12.0, After: 12.0 });
                    setSimulatedPrevStepPassed(false);
                    setCapturedParams({
                      intensity: '12.00 W',
                      frequency: '35.00 kHz',
                      pulseWidth: '120.0 ns',
                      stability: '98.50 %',
                      loss: '0.10 %',
                      averagePower: '12.00 W',
                      readingTime: '5.00 s',
                      minimum: '11.80 W',
                      maximum: '12.20 W'
                    });
                  }}
                  className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded font-bold shadow"
                >
                  🟢 Matched (12W)
                </button>

                <button
                  onClick={() => {
                    setJointReadings({ Before: 0.0, Upper: 0.0, After: 0.0 });
                    setSimulatedPrevStepPassed(false);
                    setCapturedParams({
                      intensity: '0.00 W',
                      frequency: '0.00 kHz',
                      pulseWidth: '0.0 ns',
                      stability: '0.00 %',
                      loss: '100.00 %',
                      averagePower: '0.00 W',
                      readingTime: '5.00 s',
                      minimum: '0.00 W',
                      maximum: '0.00 W'
                    });
                  }}
                  className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-700 rounded font-bold shadow"
                >
                  🔴 Case 1: Damaged (0W)
                </button>

                <button
                  onClick={() => {
                    setJointReadings({ Before: 12.0, Upper: 30.0, After: 1.0 });
                    setSimulatedPrevStepPassed(false);
                    setCapturedParams({
                      intensity: '30.00 W',
                      frequency: '35.00 kHz',
                      pulseWidth: '120.0 ns',
                      stability: '75.00 %',
                      loss: '80.00 %',
                      averagePower: '30.00 W',
                      readingTime: '5.00 s',
                      minimum: '1.00 W',
                      maximum: '30.00 W'
                    });
                  }}
                  className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 rounded font-bold shadow"
                >
                  ⚠️ Case 2: Upper High Reflection (30W)
                </button>

                <button
                  onClick={() => {
                    setJointReadings({ Before: 12.0, Upper: 12.0, After: 1.0 });
                    setSimulatedPrevStepPassed(false);
                    setCapturedParams({
                      intensity: '1.00 W',
                      frequency: '35.00 kHz',
                      pulseWidth: '120.0 ns',
                      stability: '80.00 %',
                      loss: '90.00 %',
                      averagePower: '1.00 W',
                      readingTime: '5.00 s',
                      minimum: '1.00 W',
                      maximum: '12.00 W'
                    });
                  }}
                  className="px-2 py-1 bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-700 rounded font-bold shadow"
                >
                  ⚠️ Case 3: After Joint Break (1W)
                </button>

                <button
                  onClick={() => {
                    setJointReadings({ Before: 0.0, Upper: 0.0, After: 0.0 });
                    setSimulatedPrevStepPassed(true);
                    setCapturedParams({
                      intensity: '0.00 W',
                      frequency: '0.00 kHz',
                      pulseWidth: '0.0 ns',
                      stability: '0.00 %',
                      loss: '100.00 %',
                      averagePower: '0.00 W',
                      readingTime: '5.00 s',
                      minimum: '0.00 W',
                      maximum: '0.00 W'
                    });
                  }}
                  className="px-2 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 rounded font-bold shadow"
                >
                  🛑 Case 4: Mid-Path Interruption (Step 2 0W)
                </button>
              </div>
            </div>

            {/* Joint Readings Direct Custom Inputs */}
            <div className="bg-slate-900/90 border border-slate-700 p-2.5 rounded-lg space-y-1.5 font-mono">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                Direct 3-Joint Intensity Control (Ref Baseline: {refThresholds.intensity || '12.00 W'}):
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block text-[9px] font-bold uppercase mb-0.5">BEFORE JOINT</label>
                  <input
                    type="number"
                    value={jointReadings.Before}
                    onChange={(e) => setJointReadings(prev => ({ ...prev, Before: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-2 py-1 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[9px] font-bold uppercase mb-0.5">UPPER JOINT</label>
                  <input
                    type="number"
                    value={jointReadings.Upper}
                    onChange={(e) => setJointReadings(prev => ({ ...prev, Upper: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-2 py-1 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[9px] font-bold uppercase mb-0.5">AFTER JOINT</label>
                  <input
                    type="number"
                    value={jointReadings.After}
                    onChange={(e) => setJointReadings(prev => ({ ...prev, After: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-2 py-1 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Parameter Inputs */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              {Object.keys(capturedParams).map((key) => (
                <div key={`live-edit-${key}`}>
                  <label className="text-slate-300 block mb-1 font-semibold uppercase text-[10px]">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={capturedParams[key as keyof typeof capturedParams]}
                    onChange={(e) => setCapturedParams({ ...capturedParams, [key]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-bold rounded px-2.5 py-1 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-700 text-xs">
              <button
                onClick={() => setShowEditLiveModal(false)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-all shadow active:scale-95"
              >
                Save & Apply Live Readings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL HARDWARE LIVE CONNECTION MODAL (USB SERIAL COMPORT & WI-FI WEBSOCKET) */}
      {showHardwareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0B132B] border border-cyan-500/50 rounded-xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3 text-slate-100 font-sans max-h-[92vh] flex flex-col my-auto overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-950 border border-emerald-500/50 rounded-lg">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-300 font-mono tracking-wide uppercase">
                    Physical ESP32 Hardware Live Connection
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
                    Connect real optical sensors & ESP32 via USB COMPORT or Wi-Fi WebSocket Stream
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHardwareModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mandatory / Optional Bypass Notice Banner */}
            <div className="bg-slate-900/90 border border-amber-500/40 p-2 sm:p-2.5 rounded-lg text-xs font-mono space-y-1 shrink-0">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase text-[10px] sm:text-[11px]">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>ESP32 Hardware Connection Modes (Mandatory vs Optional / Bypass)</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed pl-4 space-y-0.5">
                <p>
                  • <strong className="text-emerald-300">Live Hardware Mode:</strong> Connect ESP32 via USB Serial or Wi-Fi to feed live sensor telemetry.
                </p>
                <p>
                  • <strong className="text-cyan-300">Bypass / Manual Mode:</strong> Physical hardware is <strong>NOT mandatory</strong>. You can bypass ESP32 connection anytime.
                </p>
              </div>
            </div>

            {/* Connection Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs font-mono shrink-0">
              <button
                onClick={() => setHardwareTab('usb')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  hardwareTab === 'usb'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>🔌 USB / COM Port</span>
              </button>

              <button
                onClick={() => setHardwareTab('wifi')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  hardwareTab === 'wifi'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>📡 Wi-Fi WebSocket</span>
              </button>

              <button
                onClick={() => setHardwareTab('code')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  hardwareTab === 'code'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>💻 ESP32 C++ Code</span>
              </button>
            </div>

            {/* Tab 1: USB / COM PORT (Web Serial) */}
            {hardwareTab === 'usb' && (
              <div className="space-y-3 text-xs font-mono shrink-0">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-cyan-300 uppercase text-[10px] sm:text-[11px]">Web Serial API Configuration</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400">Supported in Chrome / Edge / Opera</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Baud Rate</label>
                      <select
                        value={usbBaudRate}
                        onChange={(e) => setUsbBaudRate(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400"
                      >
                        <option value={9600}>9600 Baud</option>
                        <option value={19200}>19200 Baud</option>
                        <option value={38400}>38400 Baud</option>
                        <option value={57600}>57600 Baud</option>
                        <option value={115200}>115200 Baud (Standard ESP32)</option>
                        <option value={230400}>230400 Baud</option>
                        <option value={921600}>921600 Baud (High Speed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Auto-Stream Sensor Data</label>
                      <button
                        onClick={() => setAutoApplyHardwareStream(!autoApplyHardwareStream)}
                        className={`w-full py-1.5 px-2.5 rounded-lg font-bold border transition-all text-xs flex items-center justify-center gap-1.5 ${
                          autoApplyHardwareStream
                            ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                            : 'bg-slate-950 border-slate-700 text-slate-400'
                        }`}
                      >
                        {autoApplyHardwareStream ? '✅ Auto-Apply Enabled' : '⏸️ Stream Paused'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      disabled={connectingHardware}
                      onClick={async () => {
                        setConnectingHardware(true);
                        try {
                          await esp32Service.requestFreshPort(usbBaudRate);
                        } catch (err: any) {
                          alert(`USB Serial Connection: ${err.message || 'Port selection cancelled'}`);
                        } finally {
                          setConnectingHardware(false);
                        }
                      }}
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-700 text-white rounded-lg font-bold transition-all shadow-md text-xs flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>{connectingHardware ? 'Connecting...' : '🔍 Scan & Select COM8 / USB Serial Port'}</span>
                    </button>

                    <button
                      disabled={connectingHardware}
                      onClick={async () => {
                        setConnectingHardware(true);
                        try {
                          await esp32Service.connectWebSerial(usbBaudRate);
                        } catch (err: any) {
                          alert(`USB Serial Connection Error: ${err.message || 'Port selection cancelled'}`);
                        } finally {
                          setConnectingHardware(false);
                        }
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg font-semibold transition-all text-xs flex items-center justify-center gap-1.5"
                      title="Connect using last granted COM port"
                    >
                      <span>Quick Reconnect</span>
                    </button>

                    {espStatus.connectionType === 'USB Serial' && espStatus.connected && (
                      <button
                        onClick={() => esp32Service.disconnectHardware()}
                        className="px-3 py-2 bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 rounded-lg font-bold text-xs"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  {/* COM PORT TROUBLESHOOTING GUIDE */}
                  <div className="bg-amber-950/40 border border-amber-500/50 p-2.5 rounded-lg space-y-1.5 text-[11px] text-amber-200">
                    <div className="font-bold flex items-center gap-1.5 text-amber-400 uppercase text-[10px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>COM PORT નથી બતાવતું? (Troubleshooting Guide)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-300">
                      <li><strong>1. USB Data Cable વાપરો:</strong> ચાર્જિંગ કેબલમાં ડેટા વાયર નથી હોતા. 4-Wire USB Data Cable વાપરો.</li>
                      <li><strong>2. Windows Driver:</strong> Windows Device Manager માં <strong>CH340 / CP2102 / ESP32-S3 CDC Driver</strong> ઇન્સ્ટોલ હોવો જોઈએ.</li>
                      <li><strong>3. Arduino Option:</strong> Arduino IDE માં Tools → <strong>USB CDC On Boot: "Enabled"</strong> રાખીને કોડ અપલોડ કરો.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: WI-FI WEBSOCKET & HTTP STREAM */}
            {hardwareTab === 'wifi' && (
              <div className="space-y-3 text-xs font-mono shrink-0">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-cyan-300 uppercase text-[10px] sm:text-[11px]">Wi-Fi Network Live Communication</span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold">Auto Protocol (WebSocket / HTTP Stream)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">ESP32 IP Address</label>
                      <input
                        type="text"
                        value={wifiIp}
                        onChange={(e) => setWifiIp(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Port (Default: 81 for WS, 80 for HTTP)</label>
                      <input
                        type="number"
                        value={wifiPort}
                        onChange={(e) => setWifiPort(Number(e.target.value))}
                        placeholder="81"
                        className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      disabled={connectingHardware}
                      onClick={async () => {
                        setConnectingHardware(true);
                        try {
                          await esp32Service.connectWiFiAuto(wifiIp, wifiPort);
                          alert(`✅ ESP32 Connected via Wi-Fi at ${wifiIp}!`);
                        } catch (err: any) {
                          alert(`Wi-Fi Connection Error: ESP32 not responding at ${wifiIp}.\n\n1. Check if ESP32 is powered ON.\n2. Ensure laptop & ESP32 are connected to the SAME Wi-Fi network/Hotspot.\n3. Verify exact IP Address from Arduino Serial Monitor.`);
                        } finally {
                          setConnectingHardware(false);
                        }
                      }}
                      className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:bg-slate-700 text-white rounded-lg font-bold transition-all shadow text-xs flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>{connectingHardware ? 'Connecting to ESP32 Wi-Fi...' : '⚡ Connect ESP32 Wi-Fi (Auto Detect)'}</span>
                    </button>

                    <button
                      disabled={connectingHardware}
                      onClick={async () => {
                        setConnectingHardware(true);
                        try {
                          await esp32Service.connectWiFiHTTPPolling(wifiIp, wifiPort === 81 ? 80 : wifiPort);
                          alert(`✅ Connected to ESP32 via HTTP Live Stream!`);
                        } catch (err: any) {
                          alert(`HTTP Stream Connection Error: Check ESP32 IP ${wifiIp}`);
                        } finally {
                          setConnectingHardware(false);
                        }
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 rounded-lg font-bold text-xs"
                      title="Direct HTTP REST Polling Stream"
                    >
                      HTTP Stream
                    </button>

                    {espStatus.connected && (espStatus.connectionType.includes('Wi-Fi')) && (
                      <button
                        onClick={() => esp32Service.disconnectHardware()}
                        className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 rounded-lg font-bold text-xs"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  {/* WIFI TROUBLESHOOTING GUIDE */}
                  <div className="bg-blue-950/40 border border-blue-500/50 p-2.5 rounded-lg space-y-1 text-[11px] text-blue-200">
                    <div className="font-bold flex items-center gap-1.5 text-cyan-400 uppercase text-[10px]">
                      <Info className="w-3.5 h-3.5" />
                      <span>ESP32 Wi-Fi કનેક્ટ કરવાની રીત (Gujarati Step-by-Step Guide):</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      1. તમારા ESP32 માં Wi-Fi Name (SSID) અને Password નાખી કોડ ફ્લેશ કરો.<br />
                      2. Arduino IDE નો Serial Monitor ખોલો, ત્યાં જે <strong className="text-amber-300">ESP32 IP Address</strong> બતાવે (જેમ કે 192.168.1.15 અથવા 192.168.43.100) તે ઉપરના બોક્સમાં લખો.<br />
                      3. તમારા લેપટોપ અને ESP32 બંને એક જ Wi-Fi વાઈફાઈ અથવા મોબાઈલ હોટસ્પોટ સાથે કનેક્ટેડ હોવા જોઈએ.<br />
                      4. <strong className="text-cyan-300">Connect ESP32 Wi-Fi</strong> પર ક્લિક કરતા જ લાઈવ સિગ્નલ ડેટા મળવાનું ચાલુ થઈ જશે!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: ESP32 FIRMWARE C++ CODE GENERATOR */}
            {hardwareTab === 'code' && (
              <div className="space-y-3 text-xs font-mono shrink-0">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-amber-300 font-bold text-[11px]">
                    <span>Arduino IDE ESP32 Complete Wi-Fi & USB Firmware Code</span>
                    <button
                      onClick={() => {
                        const code = `#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>

const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

void handleData() {
  float intensityVal = analogRead(34) * (30.0 / 4095.0);
  String json = "{\\"intensity\\":" + String(intensityVal, 2) + ",\\"frequency\\":35.0,\\"pulseWidth\\":120.0,\\"temperature\\":31.5}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/data", handleData);
  server.begin();
  webSocket.begin();
}

void loop() {
  server.handleClient();
  webSocket.loop();

  float intensityVal = analogRead(34) * (30.0 / 4095.0);
  String json = "{\\"intensity\\":" + String(intensityVal, 2) + ",\\"frequency\\":35.0,\\"pulseWidth\\":120.0,\\"temperature\\":31.5}";
  
  // Broadcast USB and WebSocket
  Serial.println(json);
  webSocket.broadcastTXT(json);
  delay(250);
}`;
                        navigator.clipboard.writeText(code);
                        alert('ESP32 Dual Wi-Fi (WebSocket + HTTP) C++ Code copied to clipboard!');
                      }}
                      className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded text-[10px] font-bold cursor-pointer"
                    >
                      Copy Complete C++ Code
                    </button>
                  </div>
                  <pre className="bg-slate-900 p-2.5 rounded-lg text-[10px] text-emerald-300 font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-40">
{`#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>

const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

void handleData() {
  float intensity = analogRead(34) * (30.0 / 4095.0);
  String json = "{\\"intensity\\":" + String(intensity, 2) + ",\\"frequency\\":35.0,\\"pulseWidth\\":120.0}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  Serial.print("ESP32 IP: "); Serial.println(WiFi.localIP());
  server.on("/data", handleData);
  server.begin();
  webSocket.begin();
}

void loop() {
  server.handleClient();
  webSocket.loop();
  float intensity = analogRead(34) * (30.0 / 4095.0);
  String json = "{\\"intensity\\":" + String(intensity, 2) + ",\\"frequency\\":35.0}";
  Serial.println(json);
  webSocket.broadcastTXT(json);
  delay(250);
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Hardware Live Terminal Logs */}
            <div className="bg-slate-950 border border-slate-800 p-2 sm:p-2.5 rounded-xl space-y-1 font-mono text-[10px] shrink-0">
              <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[9px]">
                <span>Live Hardware RX Communication Terminal:</span>
                <span className={espStatus.connected ? 'text-emerald-400 font-black flex items-center gap-1' : 'text-red-400 font-black flex items-center gap-1 animate-pulse'}>
                  <span className={`w-2 h-2 rounded-full ${espStatus.connected ? 'bg-emerald-400 animate-ping' : 'bg-red-500 animate-ping'} inline-block`} />
                  STATUS: {espStatus.connected ? `${espStatus.connectionType} (ACTIVE)` : 'DISCONNECTED / OFFLINE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg h-16 sm:h-20 overflow-y-auto font-mono text-[10px] text-cyan-300 space-y-1 border border-slate-800/80">
                {hardwareLogs.length === 0 ? (
                  <div className="text-slate-500 italic text-[10px]">No hardware activity logged yet. Click Connect USB Serial or Wi-Fi to start live packet streaming.</div>
                ) : (
                  hardwareLogs.map((log, idx) => (
                    <div key={`hw-log-${idx}`} className="leading-tight">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowHardwareModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
              >
                Close Connection Window
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

      {/* DIAGNOSIS ENGINE MODAL */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1329] border border-cyan-500/60 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative text-slate-100 font-mono my-8">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-400">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-wide text-white flex flex-wrap items-center gap-2 uppercase">
                    LIVE DIAGNOSTIC RULE ENGINE ANALYSIS
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      liveDiagnosis.overallStatus === 'FAIL' ? 'bg-red-600 text-white' : liveDiagnosis.overallStatus === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      STATUS: {liveDiagnosis.overallStatus === 'FAIL' ? '🔴 FAULTY FIBER SOURCE' : liveDiagnosis.overallStatus === 'WARNING' ? '⚠️ WARNING DEVIATION' : '🟢 GOLDEN NOMINAL'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 font-sans mt-0.5">
                    Evaluated on Model <strong className="text-cyan-300">{activeModel.brand} {activeModel.modelName}</strong> at <strong className="text-amber-300">{activeStep?.name || 'Position'} ({selectedJoint} Joint)</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDiagnosisModal(false)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Health score and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs text-slate-400 uppercase font-mono">Health Score</div>
                <div className={`text-2xl font-extrabold ${
                  liveDiagnosis.healthScore < 60 ? 'text-red-400' : liveDiagnosis.healthScore < 85 ? 'text-amber-300' : 'text-emerald-400'
                }`}>
                  {liveDiagnosis.healthScore} / 100 ({liveDiagnosis.healthGrade})
                </div>
              </div>

              <button
                onClick={() => {
                  setShowDiagnosisModal(false);
                  handleTriggerDiagnosis();
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
              >
                <Stethoscope className="w-4 h-4" />
                <span>View Full PDF Report</span>
              </button>
            </div>

            {/* Triggered Rules & Diagnosis */}
            {liveDiagnosis.triggeredRules.length > 0 ? (
              <div className="space-y-4 text-xs">
                <div className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>TRIGGERED DIAGNOSTIC RULES ({liveDiagnosis.triggeredRules.length} Rule(s) Applied)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {liveDiagnosis.triggeredRules.map((rule) => (
                    <div key={rule.id} className="bg-slate-950/80 border border-red-500/40 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-red-400 font-black font-mono">{rule.id}: {rule.name}</span>
                        <span className="text-amber-300 bg-amber-950 px-2 py-0.5 rounded text-[10px] border border-amber-500/40 font-bold">
                          Confidence: {rule.confidence}%
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] font-sans">{rule.diagnosisText}</p>
                      <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                        <strong className="text-slate-300">Location:</strong> {rule.faultLocation}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Probable Causes */}
                {liveDiagnosis.probableCauses.length > 0 && (
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs font-sans">
                    <div className="font-bold text-slate-200 uppercase text-[11px] font-mono flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span>Probable Causes & Diagnosis Action</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                      {liveDiagnosis.probableCauses.map((cause, idx) => (
                        <li key={idx}>
                          <strong className="text-amber-300">{cause.cause}</strong> ({cause.probability}% Probability)
                        </li>
                      ))}
                    </ul>
                    {liveDiagnosis.repairSteps.length > 0 && (
                      <div className="pt-2 text-[11px] text-emerald-300 font-mono border-t border-slate-800/80">
                        <strong>Recommended Repair Step:</strong> {liveDiagnosis.repairSteps[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex items-center gap-3 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>ALL PARAMETERS MATCH GOLDEN REFERENCE SPECIFICATIONS FOR {activeModel.modelName.toUpperCase()}. NO OPTICAL FAULTS DETECTED.</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDiagnosisModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
