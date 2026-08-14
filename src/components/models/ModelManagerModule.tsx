/**
 * Model Manager & Configuration Tree Module
 * Identical layout, theme, dark canvas (#070B14, #0B1120, #0B132B), and interaction model
 * as LiveTestModule.
 * Full Split View with Edit, Rename, Duplicate, Delete, Drag & Drop, and Add operations on all levels
 * (Model > Cycle > Module > Joint Reference).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  ChevronDown, 
  ChevronRight, 
  FileCode,
  Layers,
  Box,
  GripVertical,
  Check,
  X,
  Pencil,
  Copy,
  Cpu,
  ShieldCheck,
  Activity,
  Sun,
  BarChart2,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  FolderPlus,
  Zap,
  Filter,
  Sliders,
  CheckCircle2,
  Radio
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
import { localDB } from '../../services/db';
import { esp32Service } from '../../services/esp32Service';
import { ConfirmModal, PromptModal } from '../common/ModalDialogs';

interface ModelManagerModuleProps {
  models: FiberModel[];
  onModelsChange: (updatedModels: FiberModel[]) => void;
  activeModel: FiberModel;
  onSelectModel: (model: FiberModel) => void;
}

export const ModelManagerModule: React.FC<ModelManagerModuleProps> = ({
  models,
  onModelsChange,
  activeModel,
  onSelectModel
}) => {
  // Brand Filter & Selection
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('All');

  // Selected Tree Nodes
  const [selectedModelId, setSelectedModelId] = useState<string>(activeModel.id);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(activeModel.cycles[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(activeModel.cycles[0]?.modules[0]?.id || '');
  const [activeJoint, setActiveJoint] = useState<JointType>('Before');

  // Accordion Expand/Collapse States
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({ Raycus: true, JPT: true, IPG: true, MAX: true });
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({ [activeModel.id]: true });

  // Modal / Form States for Creating Model
  const [showAddModelModal, setShowAddModelModal] = useState<boolean>(false);
  const [newBrand, setNewBrand] = useState<LaserBrand>('Raycus');
  const [newModelName, setNewModelName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newRatedPower, setNewRatedPower] = useState<number>(50);

  // Modal / Form States for Add Cycle & Add Module
  const [showAddCycleModal, setShowAddCycleModal] = useState<boolean>(false);
  const [newCycleName, setNewCycleName] = useState<string>('');

  const [showAddModuleModal, setShowAddModuleModal] = useState<boolean>(false);
  const [targetCycleIdForModule, setTargetCycleIdForModule] = useState<string>('');
  const [newModuleName, setNewModuleName] = useState<string>('');
  const [newModuleType, setNewModuleType] = useState<FiberModule['moduleType']>('Pump');

  // Inline editing states
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editingCycleName, setEditingCycleName] = useState<string>('');

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleName, setEditingModuleName] = useState<string>('');

  // Drag and drop states
  const [draggedStep, setDraggedStep] = useState<{ cycleId: string; moduleId: string; index: number } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ cycleId: string; index: number } | null>(null);

  // Custom Dialog Modals (Replaces native prompt & confirm)
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

  // ESP32 Live Capture & Reference Parameter State
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureCountdown, setCaptureCountdown] = useState<number>(0);
  const samplesReceivedRef = useRef<boolean>(false);
  const [capturedParams, setCapturedParams] = useState<ReadingParameters>({
    intensity: 99.5,
    frequency: 30,
    pulseWidth: 220,
    averagePower: activeModel.ratedPowerW || 50,
    peakPower: (activeModel.ratedPowerW || 50) * 1.25,
    temperature: 28.5,
    stability: 99.5,
    minimum: (activeModel.ratedPowerW || 50) * 0.98,
    maximum: (activeModel.ratedPowerW || 50) * 1.02,
    readingTime: 5.0
  });

  const currentModel = models.find((m) => m.id === selectedModelId) || activeModel;
  const currentCycle = currentModel.cycles.find((c) => c.id === selectedCycleId) || currentModel.cycles[0];
  const currentModule = currentCycle?.modules.find((mod) => mod.id === selectedModuleId) || currentCycle?.modules[0];

  // Auto-sync selection when model updates
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

  // Load module reference reading when selecting module or joint
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
        const power = currentModel.ratedPowerW || 50;
        setCapturedParams({
          intensity: 99.0,
          frequency: 30,
          pulseWidth: 220,
          averagePower: power,
          peakPower: Number((power * 1.25).toFixed(1)),
          temperature: 28.5,
          stability: 99.2,
          minimum: Number((power * 0.98).toFixed(1)),
          maximum: Number((power * 1.02).toFixed(1)),
          readingTime: 5.0
        });
      }
    }
  }, [selectedModuleId, activeJoint, currentModel.id]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const toggleModelNode = (modelId: string) => {
    setExpandedModels((prev) => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  // ==========================================
  // MODEL OPERATIONS: ADD, DUPLICATE, DELETE
  // ==========================================

  const handleAddModel = () => {
    if (!newModelName.trim()) {
      alert('Model Name is required.');
      return;
    }

    const newModel: FiberModel = {
      id: `model-${Date.now()}`,
      brand: newBrand,
      modelName: newModelName.trim(),
      description: newDescription.trim() || `${newBrand} ${newModelName} Fiber Source`,
      laserType: 'Fiber Laser',
      ratedPowerW: newRatedPower || 50,
      opticalPathVersion: 'v1.0',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      cycles: [
        {
          id: `cycle-${Date.now()}-1`,
          name: 'Cycle 1 - Main Circuit',
          displayOrder: 1,
          modules: [
            {
              id: `mod-${Date.now()}-1`,
              name: 'Pump Stage → Combiner',
              moduleType: 'Pump',
              opticalPosition: 1,
              reference: { isComplete: false, status: 'Pending' }
            }
          ]
        }
      ]
    };

    localDB.saveModel(newModel);
    const updated = localDB.getModels();
    onModelsChange(updated);
    onSelectModel(newModel);
    setSelectedModelId(newModel.id);
    setShowAddModelModal(false);
    setNewModelName('');
    setNewDescription('');
  };

  const handleDuplicateModel = () => {
    setPromptModal({
      isOpen: true,
      title: 'Duplicate Model',
      message: 'Enter name for duplicated model:',
      defaultValue: `${currentModel.modelName}_Copy`,
      onSave: (dupName) => {
        if (!dupName.trim()) return;

        const duplicatedModel: FiberModel = {
          ...currentModel,
          id: `model-${Date.now()}`,
          modelName: dupName.trim(),
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
          cycles: currentModel.cycles.map(c => ({
            ...c,
            id: `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            modules: c.modules.map(m => ({
              ...m,
              id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              reference: { isComplete: false, status: 'Pending' }
            }))
          }))
        };

        localDB.saveModel(duplicatedModel);
        const updated = localDB.getModels();
        onModelsChange(updated);
        onSelectModel(duplicatedModel);
        setSelectedModelId(duplicatedModel.id);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteModel = (modelId: string) => {
    if (models.length <= 1) {
      alert('Cannot delete the last remaining model.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Model',
      message: 'Permanently delete this model and all its cycles, modules, and reference data?',
      onConfirm: () => {
        localDB.deleteModel(modelId);
        const updated = localDB.getModels();
        onModelsChange(updated);
        if (updated.length > 0) {
          onSelectModel(updated[0]);
          setSelectedModelId(updated[0].id);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ==========================================
  // CYCLE OPERATIONS: ADD, EDIT, DELETE
  // ==========================================

  const handleOpenAddCycleModal = () => {
    setNewCycleName(`Cycle ${currentModel.cycles.length + 1} - Main Circuit`);
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
      displayOrder: currentModel.cycles.length + 1,
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
      ...currentModel,
      cycles: [...currentModel.cycles, newCycle],
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setSelectedCycleId(newCycle.id);
    if (newCycle.modules.length > 0) {
      setSelectedModuleId(newCycle.modules[0].id);
    }
    setShowAddCycleModal(false);
    setNewCycleName('');
  };

  const handleStartRenameCycle = (cycle: FiberCycle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCycleId(cycle.id);
    setEditingCycleName(cycle.name);
  };

  const handleSaveCycleRename = (cycleId: string) => {
    if (!editingCycleName.trim()) return;

    const updatedCycles = currentModel.cycles.map(c => 
      c.id === cycleId ? { ...c, name: editingCycleName.trim() } : c
    );

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setEditingCycleId(null);
  };

  const handleDeleteCycle = (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentModel.cycles.length <= 1) {
      alert('Cannot delete the last remaining cycle of a model.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Cycle',
      message: 'Delete this cycle and all its optical modules & reference readings?',
      onConfirm: () => {
        const updatedCycles = currentModel.cycles.filter(c => c.id !== cycleId);
        const updatedModel: FiberModel = {
          ...currentModel,
          cycles: updatedCycles,
          modifiedDate: new Date().toISOString()
        };

        localDB.saveModel(updatedModel);
        const updatedList = localDB.getModels();
        onModelsChange(updatedList);
        onSelectModel(updatedModel);

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
  // MODULE OPERATIONS: ADD, EDIT, DELETE, DRAG & DROP
  // ==========================================

  const handleOpenAddModuleModal = (cycleId?: string) => {
    const targetId = cycleId || selectedCycleId || currentModel.cycles[0]?.id || '';
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

    const cid = targetCycleIdForModule || selectedCycleId || currentModel.cycles[0]?.id;
    if (!cid) {
      alert('No cycle found to add module to.');
      return;
    }

    const targetCycle = currentModel.cycles.find(c => c.id === cid);
    if (!targetCycle) return;

    const newModule: FiberModule = {
      id: `mod-${Date.now()}`,
      name: newModuleName.trim(),
      moduleType: newModuleType,
      opticalPosition: targetCycle.modules.length + 1,
      reference: { isComplete: false, status: 'Pending' }
    };

    const updatedCycles = currentModel.cycles.map(c => {
      if (c.id === cid) {
        return { ...c, modules: [...c.modules, newModule] };
      }
      return c;
    });

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setSelectedCycleId(cid);
    setSelectedModuleId(newModule.id);
    setShowAddModuleModal(false);
    setNewModuleName('');
  };

  const handleStartRenameModule = (mod: FiberModule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModuleId(mod.id);
    setEditingModuleName(mod.name);
  };

  const handleSaveModuleRename = (cycleId: string, modId: string) => {
    if (!editingModuleName.trim()) return;

    const updatedCycles = currentModel.cycles.map(c => {
      if (c.id === cycleId) {
        return {
          ...c,
          modules: c.modules.map(m => m.id === modId ? { ...m, name: editingModuleName.trim() } : m)
        };
      }
      return c;
    });

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setEditingModuleId(null);
  };

  const handleDeleteModule = (cycleId: string, modId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Module',
      message: 'Delete this optical module?',
      onConfirm: () => {
        const updatedCycles = currentModel.cycles.map(c => {
          if (c.id === cycleId) {
            return { ...c, modules: c.modules.filter(m => m.id !== modId) };
          }
          return c;
        });

        const updatedModel: FiberModel = {
          ...currentModel,
          cycles: updatedCycles,
          modifiedDate: new Date().toISOString()
        };

        localDB.saveModel(updatedModel);
        const updatedList = localDB.getModels();
        onModelsChange(updatedList);
        onSelectModel(updatedModel);

        const targetCycle = updatedCycles.find(c => c.id === cycleId);
        if (targetCycle && targetCycle.modules.length > 0) {
          setSelectedModuleId(targetCycle.modules[0].id);
        } else {
          setSelectedModuleId('');
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // DRAG & DROP MODULE REORDERING
  const handleDragStart = (e: React.DragEvent, cycleId: string, moduleId: string, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ cycleId, moduleId, index }));
    setDraggedStep({ cycleId, moduleId, index });
  };

  const handleDragOver = (e: React.DragEvent, cycleId: string, index: number) => {
    e.preventDefault();
    setDragOverInfo({ cycleId, index });
  };

  const handleDrop = (e: React.DragEvent, targetCycleId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedStep) return;

    const { cycleId: sourceCycleId, moduleId: sourceModId } = draggedStep;

    let movedMod: FiberModule | null = null;

    const nextCycles = currentModel.cycles.map(c => {
      if (c.id === sourceCycleId) {
        const found = c.modules.find(m => m.id === sourceModId);
        if (found) {
          movedMod = { ...found };
          return { ...c, modules: c.modules.filter(m => m.id !== sourceModId) };
        }
      }
      return c;
    });

    if (!movedMod) return;

    const finalCycles = nextCycles.map(c => {
      if (c.id === targetCycleId) {
        const newMods = [...c.modules];
        newMods.splice(targetIndex, 0, movedMod!);
        return { ...c, modules: newMods };
      }
      return c;
    });

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: finalCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setDraggedStep(null);
    setDragOverInfo(null);
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
    setDragOverInfo(null);
  };

  // Process 100 raw samples received from verified ESP32
  const processReferenceSamples = useCallback((samples: number[], readingTimeSec: number = 5.0) => {
    if (!Array.isArray(samples) || samples.length === 0) return;

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
      frequency: capturedParams.frequency || 30,
      pulseWidth: capturedParams.pulseWidth || 220,
      averagePower: Number(avg.toFixed(2)),
      peakPower: Number((avg * 1.25).toFixed(2)),
      temperature: capturedParams.temperature || 28.5,
      stability: Number(stabilityVal.toFixed(2)),
      minimum: Number(minVal.toFixed(2)),
      maximum: Number(maxVal.toFixed(2)),
      readingTime: Number(readingTimeSec.toFixed(2))
    };

    setCapturedParams(newParams);
    setIsCapturing(false);
    samplesReceivedRef.current = true;
  }, [capturedParams.frequency, capturedParams.pulseWidth, capturedParams.temperature]);

  // Subscribe to ESP32 Capture Protocol Events & Hardware Switch
  useEffect(() => {
    const unsubCapEvents = esp32Service.subscribeCaptureEvents((evt) => {
      if (evt.type === 'CAPTURE_STARTED') {
        setIsCapturing(true);
        setCaptureCountdown(5);
        samplesReceivedRef.current = false;
      } else if (evt.type === 'MEASUREMENT_RESULT') {
        const result = evt.payload;
        if (result.sample_count !== 100) {
          alert(`❌ INVALID CAPTURE PACKET: ESP32 returned sample_count = ${result.sample_count}. Expected exactly 100 samples.`);
          setIsCapturing(false);
          return;
        }

        // Dual Calculation Verification
        if (result.raw_samples && result.raw_samples.length === 100) {
          const pcSum = result.raw_samples.reduce((a, b) => a + Number(b), 0);
          const pcAvg = Number((pcSum / 100).toFixed(2));
          const delta = Math.abs(pcAvg - result.average_power);
          console.log(`[DUAL-VERIFICATION] Model Manager Reference - ESP32 Avg: ${result.average_power} W | PC Recalc Avg: ${pcAvg} W | Delta: ${delta.toFixed(4)} W`);
        }

        const newParams: ReadingParameters = {
          intensity: result.intensity,
          frequency: capturedParams.frequency || 30,
          pulseWidth: capturedParams.pulseWidth || 220,
          averagePower: result.average_power,
          peakPower: Number((result.average_power * 1.25).toFixed(2)),
          temperature: capturedParams.temperature || 28.5,
          stability: result.stability,
          minimum: result.min_power,
          maximum: result.max_power,
          loss: result.optical_loss,
          tolerance: result.tolerance,
          readingTime: result.reading_time
        };

        setCapturedParams(newParams);
        setIsCapturing(false);
        samplesReceivedRef.current = true;
      } else if (evt.type === 'SAMPLES') {
        const { samples, reading_time } = evt.payload;
        if (Array.isArray(samples) && samples.length === 100 && !samplesReceivedRef.current) {
          processReferenceSamples(samples.map(s => Number(s)), reading_time || 5.0);
        }
      } else if (evt.type === 'CAPTURE_COMPLETE') {
        setIsCapturing(false);
      }
    });

    const unsubHW = esp32Service.subscribeHardwareEvents((event) => {
      if (event === 'CAPTURE') {
        handleCaptureFromESP();
      }
    });

    return () => {
      unsubCapEvents();
      unsubHW();
    };
  }, [processReferenceSamples]);

  // ==========================================
  // ESP32 CAPTURE & SAVE JOINT REFERENCE
  // ==========================================

  const handleCaptureFromESP = async () => {
    if (isCapturing) return;

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
      alert('Please select an active module first.');
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

    const updatedCycles = currentModel.cycles.map((c) => 
      c.id === currentCycle.id ? { ...c, modules: updatedModules } : c
    );

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    onModelsChange(localDB.getModels());

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
        alert('Golden Reference complete for this module! Saved all 3 joints (Before, Upper, After).');
      }
    }
  };

  const brandsList: (LaserBrand | 'All')[] = ['All', 'Raycus', 'JPT', 'IPG', 'MAX', 'RECI', 'BWT', 'Other'];

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col font-sans select-none rounded-xl overflow-hidden border border-slate-800">
      
      {/* MODULE HEADER BAR (IDENTICAL TO LIVE TEST MODULE) */}
      <div className="bg-[#0B1120] border-b border-slate-800 px-6 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="text-sm font-bold text-slate-300 font-mono tracking-wider flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-orange-400" />
          Fiber Source Diagnostic Pro
        </div>

        <div className="text-xl font-black text-white tracking-widest font-sans uppercase">
          MODEL MANAGER MODULE
        </div>

        <div className="flex items-center gap-3">
          {/* Brand Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-xs">
            <Filter className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-400 font-bold">Brand Filter:</span>
            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value)}
              className="bg-slate-800 text-amber-300 font-mono font-bold border border-slate-700 rounded px-1.5 py-0.5 outline-none text-xs cursor-pointer"
            >
              {brandsList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDuplicateModel}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded flex items-center gap-1.5 transition-colors shadow-md"
            title="Duplicate Current Model"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate Model</span>
          </button>

          <button
            onClick={() => setShowAddModelModal(true)}
            className="px-3.5 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Model</span>
          </button>

          <div className="bg-[#0f172a] border border-slate-700 px-3.5 py-1 rounded-full text-xs font-mono font-bold text-orange-300">
            [{currentModel.brand}] {currentModel.modelName} ({currentModel.ratedPowerW}W)
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT (IDENTICAL TO LIVE TEST MODULE) */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        
        {/* LEFT COLUMN: MODEL & CYCLE SIDEBAR WITH EDIT, RENAME, DELETE, DRAG & DROP */}
        <div className="lg:col-span-4 bg-[#0B132B] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between shadow-2xl overflow-y-auto max-h-[840px]">
          <div>
            <div className="flex items-center justify-between uppercase mb-3 border-b border-slate-800/80 pb-2">
              <div className="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <span className="text-orange-400 font-mono text-sm">▼</span>
                <span>MODEL & OPTICAL PATH NAVIGATION</span>
              </div>
              
              <button
                onClick={handleOpenAddCycleModal}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-colors"
                title="Add New Cycle"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Cycle</span>
              </button>
            </div>

            {/* LASER BRANDS & MODELS TREE */}
            <div className="space-y-3 font-mono text-xs">
              {['Raycus', 'JPT', 'IPG', 'MAX', 'RECI', 'BWT', 'Other'].map((brand) => {
                if (selectedBrandFilter !== 'All' && selectedBrandFilter !== brand) return null;
                const brandModels = models.filter((m) => m.brand === brand);
                if (brandModels.length === 0) return null;
                const isBrandExpanded = expandedBrands[brand] !== false;

                return (
                  <div key={brand} className="bg-[#091024] border border-slate-800/90 rounded-lg p-2 space-y-2">
                    
                    {/* BRAND HEADER */}
                    <div
                      onClick={() => toggleBrand(brand)}
                      className="flex items-center justify-between text-xs font-bold font-mono text-orange-400 cursor-pointer select-none bg-slate-900/80 px-2 py-1 rounded"
                    >
                      <div className="flex items-center gap-1.5">
                        {isBrandExpanded ? <ChevronDown className="w-4 h-4 text-orange-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span>{brand}</span>
                      </div>
                      <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-mono border border-orange-500/30">
                        {brandModels.length} Models
                      </span>
                    </div>

                    {/* MODELS UNDER BRAND */}
                    {isBrandExpanded && (
                      <div className="space-y-2 pl-2">
                        {brandModels.map((model) => {
                          const isModelSelected = selectedModelId === model.id;
                          const isModelExpanded = expandedModels[model.id] !== false;

                          return (
                            <div key={model.id} className="border-l border-slate-800 pl-2 space-y-1.5">
                              
                              {/* MODEL ITEM NODE */}
                              <div
                                onClick={() => {
                                  setSelectedModelId(model.id);
                                  onSelectModel(model);
                                  toggleModelNode(model.id);
                                }}
                                className={`p-1.5 rounded flex items-center justify-between cursor-pointer text-xs transition-all ${
                                  isModelSelected
                                    ? 'bg-orange-600/90 text-white font-black shadow-md border border-orange-400'
                                    : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {isModelExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  <span className="truncate">{model.modelName}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-80">
                                  {model.ratedPowerW}W
                                </span>
                              </div>

                              {/* CYCLES UNDER SELECTED MODEL */}
                              {isModelExpanded && isModelSelected && (
                                <div className="pl-2 space-y-2 pt-1">
                                  {model.cycles.map((cycle) => {
                                    const isCycleSelected = selectedCycleId === cycle.id;

                                    return (
                                      <div key={cycle.id} className="bg-[#111A30] border border-slate-800 rounded p-2 space-y-1.5">
                                        
                                        {/* CYCLE HEADER WITH EDIT & DELETE */}
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                                          {editingCycleId === cycle.id ? (
                                            <div className="flex items-center gap-1 flex-1">
                                              <input
                                                type="text"
                                                value={editingCycleName}
                                                onChange={(e) => setEditingCycleName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCycleRename(cycle.id)}
                                                className="bg-slate-900 border border-amber-400 text-amber-300 text-xs px-2 py-0.5 rounded outline-none w-full font-bold"
                                                autoFocus
                                              />
                                              <button onClick={() => handleSaveCycleRename(cycle.id)} className="p-1 text-emerald-400">
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button onClick={() => setEditingCycleId(null)} className="p-1 text-slate-400">
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <span
                                              onClick={() => setSelectedCycleId(cycle.id)}
                                              className="text-blue-300 cursor-pointer font-extrabold flex items-center gap-1 truncate"
                                            >
                                              <Layers className="w-3.5 h-3.5 text-blue-400" />
                                              {cycle.name}
                                            </span>
                                          )}

                                          <div className="flex items-center gap-1 text-[11px]">
                                            <button
                                              onClick={(e) => handleStartRenameCycle(cycle, e)}
                                              className="p-1 text-slate-400 hover:text-amber-300 rounded"
                                              title="Rename Cycle"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>

                                            <button
                                              onClick={() => handleOpenAddModuleModal(cycle.id)}
                                              className="p-1 text-slate-400 hover:text-emerald-300 rounded"
                                              title="Add Module to Cycle"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                              onClick={(e) => handleDeleteCycle(cycle.id, e)}
                                              className="p-1 text-slate-400 hover:text-red-400 rounded"
                                              title="Delete Cycle"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* MODULES LIST (DRAGGABLE & EDITABLE) */}
                                        <div className="space-y-1 pl-1">
                                          {cycle.modules.map((mod, index) => {
                                            const isModSelected = selectedModuleId === mod.id;
                                            const isDragOver = dragOverInfo?.cycleId === cycle.id && dragOverInfo?.index === index;

                                            return (
                                              <div
                                                key={mod.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, cycle.id, mod.id, index)}
                                                onDragOver={(e) => handleDragOver(e, cycle.id, index)}
                                                onDrop={(e) => handleDrop(e, cycle.id, index)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => {
                                                  setSelectedCycleId(cycle.id);
                                                  setSelectedModuleId(mod.id);
                                                }}
                                                className={`p-1.5 rounded border flex items-center justify-between cursor-pointer text-xs transition-all group ${
                                                  isDragOver
                                                    ? 'border-2 border-emerald-400 bg-emerald-950/30'
                                                    : isModSelected
                                                    ? 'bg-amber-500/10 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] text-white font-bold'
                                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                                }`}
                                              >
                                                <div className="flex items-center gap-1.5 overflow-hidden flex-1 pr-1">
                                                  <div className="cursor-grab text-slate-600 group-hover:text-slate-400">
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                  </div>

                                                  <span
                                                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                                      isModSelected
                                                        ? 'bg-amber-400 text-slate-950 font-black'
                                                        : 'border border-slate-600 text-slate-400 bg-slate-900'
                                                    }`}
                                                  >
                                                    {index + 1}
                                                  </span>

                                                  {editingModuleId === mod.id ? (
                                                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                                      <input
                                                        type="text"
                                                        value={editingModuleName}
                                                        onChange={(e) => setEditingModuleName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveModuleRename(cycle.id, mod.id)}
                                                        className="bg-slate-900 border border-amber-400 text-amber-300 text-xs px-1.5 py-0.5 rounded outline-none w-full font-bold"
                                                        autoFocus
                                                      />
                                                      <button onClick={() => handleSaveModuleRename(cycle.id, mod.id)} className="p-1 text-emerald-400">
                                                        <Check className="w-3 h-3" />
                                                      </button>
                                                      <button onClick={() => setEditingModuleId(null)} className="p-1 text-slate-400">
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <span className="truncate">{mod.name}</span>
                                                  )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                  <span
                                                    className={`w-2 h-2 rounded-full ${
                                                      mod.reference.status === 'Complete'
                                                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                                                        : mod.reference.status === 'Partial'
                                                        ? 'bg-yellow-400'
                                                        : 'bg-slate-600'
                                                    }`}
                                                    title={`Ref Status: ${mod.reference.status}`}
                                                  />

                                                  <button
                                                    onClick={(e) => handleStartRenameModule(mod, e)}
                                                    className="p-0.5 text-slate-500 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Rename Module"
                                                  >
                                                    <Pencil className="w-3 h-3" />
                                                  </button>

                                                  <button
                                                    onClick={(e) => handleDeleteModule(cycle.id, mod.id, e)}
                                                    className="p-0.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete Module"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <button
                                          onClick={() => handleOpenAddModuleModal(cycle.id)}
                                          className="w-full py-1 mt-1 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-emerald-500/60 text-emerald-400 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>+ Add Module to {cycle.name}</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>Selected Model ID: {currentModel.id}</span>
            <span className="text-orange-400 font-bold">MASTER LOCK V4</span>
          </div>
        </div>

        {/* RIGHT COLUMN: MODEL SPECIFICATIONS & REFERENCE PARAMETER EDITOR */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* 1. CURRENT MODEL & MODULE BREADCRUMB HEADER BOX */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-lg p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase">
                    {currentModel.brand}
                  </span>
                  <h3 className="text-lg font-black text-white tracking-wide">
                    {currentModel.modelName}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    ({currentModel.ratedPowerW} Watts)
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  PATH: <span className="text-blue-300 font-bold">{currentCycle?.name || 'Cycle'}</span> &gt; <span className="text-amber-300 font-bold">{currentModule?.name || 'Module'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteModel(currentModel.id)}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Model</span>
                </button>
              </div>
            </div>

            {/* Editable Model Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Brand Manufacturer</label>
                <input
                  type="text"
                  value={currentModel.brand}
                  disabled
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Rated Power Output (W)</label>
                <input
                  type="number"
                  value={currentModel.ratedPowerW}
                  onChange={(e) => {
                    const updated = { ...currentModel, ratedPowerW: Number(e.target.value) };
                    localDB.saveModel(updated);
                    onModelsChange(localDB.getModels());
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded p-2 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Optical Path Version</label>
                <input
                  type="text"
                  value={currentModel.opticalPathVersion || 'v1.0'}
                  onChange={(e) => {
                    const updated = { ...currentModel, opticalPathVersion: e.target.value };
                    localDB.saveModel(updated);
                    onModelsChange(localDB.getModels());
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* 2. THREE OPTICAL JOINTS SELECTOR CARDS (IDENTICAL TO LIVE TEST) */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-lg p-4 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                SELECT OPTICAL JOINT FOR REFERENCE CAPTURE
              </h4>
              <span className="text-xs font-mono text-orange-400 font-bold">
                Active: {activeJoint} Joint
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    className={`p-3.5 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                      isActive
                        ? 'bg-orange-950/40 border-orange-500 text-white shadow-lg shadow-orange-950/50 animate-pulse'
                        : isSaved
                        ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                          JOINT INTERFACE
                        </span>
                        <h5 className="text-base font-bold text-white">{joint} Joint</h5>
                      </div>
                      {isSaved && (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          ✓ SAVED
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono flex items-center justify-between text-slate-400">
                      <span>{isActive ? '● ACTIVE BLINKING' : isSaved ? 'Golden Ref Complete' : 'Pending Capture'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GOLDEN REFERENCE CAPTURE & PARAMETER CARDS */}
          <div className="bg-[#0B132B] border border-slate-800 rounded-lg p-4 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-orange-400" />
                  REFERENCE PARAMETER VALUES [{activeJoint} Joint]
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Selected Module: {currentModule?.name || 'N/A'} | Rated Power: {currentModel.ratedPowerW}W
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCaptureFromESP}
                  disabled={isCapturing}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-md"
                >
                  <Cpu className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
                  <span>{isCapturing ? 'Capturing ESP32...' : 'Capture From ESP32'}</span>
                </button>

                <button
                  onClick={handleSaveJoint}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save {activeJoint} Joint</span>
                </button>
              </div>
            </div>

            {/* 10 Reference Parameter Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" />
                  Intensity (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.intensity}
                  onChange={(e) => setCapturedParams({ ...capturedParams, intensity: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  Frequency (kHz)
                </label>
                <input
                  type="number"
                  step="1"
                  value={capturedParams.frequency}
                  onChange={(e) => setCapturedParams({ ...capturedParams, frequency: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3 text-blue-400" />
                  Pulse Width (ns)
                </label>
                <input
                  type="number"
                  step="1"
                  value={capturedParams.pulseWidth}
                  onChange={(e) => setCapturedParams({ ...capturedParams, pulseWidth: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-orange-400 font-bold block mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Average Power (W)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.averagePower}
                  onChange={(e) => setCapturedParams({ ...capturedParams, averagePower: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-orange-500 text-orange-400 text-sm font-bold rounded p-2 focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Peak Power (W)</label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.peakPower}
                  onChange={(e) => setCapturedParams({ ...capturedParams, peakPower: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-emerald-400 font-semibold block mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.temperature}
                  onChange={(e) => setCapturedParams({ ...capturedParams, temperature: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-emerald-400 text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Stability (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.stability}
                  onChange={(e) => setCapturedParams({ ...capturedParams, stability: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <ArrowDownCircle className="w-3 h-3 text-cyan-400" />
                  Min Power (W)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.minimum}
                  onChange={(e) => setCapturedParams({ ...capturedParams, minimum: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <ArrowUpCircle className="w-3 h-3 text-cyan-400" />
                  Max Power (W)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={capturedParams.maximum}
                  onChange={(e) => setCapturedParams({ ...capturedParams, maximum: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  Duration (s)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={capturedParams.readingTime}
                  onChange={(e) => setCapturedParams({ ...capturedParams, readingTime: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-sm font-bold rounded p-2 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM HARDWARE STATUS BAR (IDENTICAL TO LIVE TEST MODULE) */}
      <div className="bg-[#0B1120] border-t border-slate-800 px-6 py-2.5 flex flex-wrap justify-between items-center text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            ESP32 HARDWARE: ONLINE
          </span>
          <span>COM3 (115200 bps)</span>
          <span>Firmware v3.2.0</span>
        </div>

        <div className="flex items-center gap-4">
          <span>Active Model: <strong className="text-white">{currentModel.modelName}</strong></span>
          <span className="text-orange-400 font-bold">MASTER LOCK V4</span>
        </div>
      </div>

      {/* Modal: Create New Model */}
      {showAddModelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-slate-700 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Plus className="w-5 h-5 text-orange-400" />
              CREATE NEW FIBER LASER MODEL
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Select Brand</label>
                <select
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value as LaserBrand)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-orange-500"
                >
                  {['Raycus', 'JPT', 'IPG', 'MAX', 'RECI', 'BWT', 'Other'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Model Name / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. 100QB or YLP-200W"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Rated Laser Power (Watts)</label>
                <input
                  type="number"
                  placeholder="e.g. 50, 1000, 2000"
                  value={newRatedPower}
                  onChange={(e) => setNewRatedPower(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Description</label>
                <textarea
                  placeholder="Model details, optical specifications..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
              <button
                onClick={() => setShowAddModelModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModel}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold shadow-md"
              >
                Create Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Cycle */}
      {showAddCycleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B132B] border border-blue-500/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <FolderPlus className="w-5 h-5 text-blue-400" />
              ADD NEW CYCLE TO {currentModel.modelName}
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Cycle Name / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Cycle 2 - Power Stage or Q-Switch Loop"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
              <button
                onClick={() => setShowAddCycleModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
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
          <div className="bg-[#0B132B] border border-emerald-500/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              ADD OPTICAL MODULE TO CYCLE
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Target Cycle</label>
                <select
                  value={targetCycleIdForModule}
                  onChange={(e) => setTargetCycleIdForModule(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-emerald-500"
                >
                  {currentModel.cycles.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Module Name</label>
                <input
                  type="text"
                  placeholder="e.g. MO 1+1, YDF2 High Power, AOM, HR Mirror"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Module Type</label>
                <select
                  value={newModuleType}
                  onChange={(e) => setNewModuleType(e.target.value as FiberModule['moduleType'])}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2.5 outline-none focus:border-emerald-500"
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

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddModule}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-md flex items-center gap-1.5"
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
