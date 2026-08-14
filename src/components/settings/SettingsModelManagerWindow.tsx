/**
 * Unified Model Manager & Reference Reading Window Module
 * Replaces duplicate views with a single, pixel-perfect 3-panel layout matching user specification.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Copy, 
  Upload, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  FolderPlus, 
  Check, 
  X, 
  Zap, 
  Activity, 
  Clock, 
  Sliders, 
  Layers, 
  Box,
  CheckCircle2,
  Radio,
  FileCode,
  Sparkles
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
import { parseStepModules, STANDARD_SOURCE_COMPONENTS } from '../../services/rulesEngine';
import { ConfirmModal, PromptModal } from '../common/ModalDialogs';

interface SettingsModelManagerWindowProps {
  models: FiberModel[];
  onModelsChange: (updatedModels: FiberModel[]) => void;
  activeModel: FiberModel | null;
  onSelectModel: (model: FiberModel) => void;
  onModelUpdated?: (updatedModel: FiberModel) => void;
}

export const SettingsModelManagerWindow: React.FC<SettingsModelManagerWindowProps> = ({
  models,
  onModelsChange,
  activeModel,
  onSelectModel,
  onModelUpdated
}) => {
  // Selected Model ID
  const [selectedModelId, setSelectedModelId] = useState<string>(
    activeModel ? activeModel.id : (models[0]?.id || '')
  );

  // Active Model Object
  const currentModel = models.find((m) => m.id === selectedModelId) || models[0] || activeModel;

  // Editable Model Information
  const [brandInput, setBrandInput] = useState<string>(currentModel?.brand || 'Raycus');
  const [modelNameInput, setModelNameInput] = useState<string>(currentModel?.modelName || '');
  const [descriptionInput, setDescriptionInput] = useState<string>(currentModel?.description || '');

  // Tree View Selection
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>({});

  // Reference Reading Panel
  const [selectedJoint, setSelectedJoint] = useState<JointType>('Before');
  const [jointStatus, setJointStatus] = useState<'Pending' | 'Running' | 'Complete'>('Pending');
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureCountdown, setCaptureCountdown] = useState<number>(5);

  // Import / Export Modals
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showComponentsModal, setShowComponentsModal] = useState<boolean>(false);
  const [newCompInput, setNewCompInput] = useState<string>('');

  // Custom Dialog Modals (Replaces native prompt & confirm which fail in iframe)
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

  // 7 Required Reference Parameters State
  const [paramIntensity, setParamIntensity] = useState<string>('--');
  const [paramAveragePower, setParamAveragePower] = useState<string>('--');
  const [paramLoss, setParamLoss] = useState<string>('--');
  const [paramStability, setParamStability] = useState<string>('--');
  const [paramMin, setParamMin] = useState<string>('--');
  const [paramMax, setParamMax] = useState<string>('--');
  const [paramTolerance, setParamTolerance] = useState<string>('--');
  const [paramReadingTime, setParamReadingTime] = useState<string>('--');

  // Sync inputs when currentModel changes
  useEffect(() => {
    if (currentModel) {
      setBrandInput(currentModel.brand || 'Raycus');
      setModelNameInput(currentModel.modelName || '');
      setDescriptionInput(currentModel.description || '');

      if (currentModel.cycles && currentModel.cycles.length > 0) {
        const cId = selectedCycleId && currentModel.cycles.some(c => c.id === selectedCycleId) 
          ? selectedCycleId 
          : currentModel.cycles[0].id;
        setSelectedCycleId(cId);

        // Expand all cycles by default
        const expMap: Record<string, boolean> = {};
        currentModel.cycles.forEach((c) => { expMap[c.id] = true; });
        setExpandedCycles(expMap);

        const activeC = currentModel.cycles.find(c => c.id === cId) || currentModel.cycles[0];
        if (activeC && activeC.modules && activeC.modules.length > 0) {
          const mId = selectedModuleId && activeC.modules.some(m => m.id === selectedModuleId)
            ? selectedModuleId
            : activeC.modules[0].id;
          setSelectedModuleId(mId);
        } else {
          setSelectedModuleId('');
        }
      }
    }
  }, [selectedModelId, models]);

  // Selected Cycle & Module Objects
  const currentCycle = currentModel?.cycles?.find((c) => c.id === selectedCycleId) || currentModel?.cycles?.[0];
  const currentModule = currentCycle?.modules?.find((m) => m.id === selectedModuleId) || currentCycle?.modules?.[0];

  // Load Joint Reference parameters whenever module or joint changes
  useEffect(() => {
    if (currentModule && currentModule.reference) {
      const refData = 
        selectedJoint === 'Before' 
          ? currentModule.reference.before 
          : selectedJoint === 'Upper' 
          ? currentModule.reference.upper 
          : currentModule.reference.after;

      if (refData && refData.parameters) {
        const p = refData.parameters;
        setParamIntensity(`${p.intensity}`);
        setParamAveragePower(`${p.averagePower}`);
        setParamLoss(`${p.loss ?? 1.5}`);
        setParamStability(`${p.stability}`);
        setParamMin(`${p.minimum}`);
        setParamMax(`${p.maximum}`);
        setParamTolerance(`${p.tolerance ?? 2.0}`);
        setParamReadingTime(`${p.readingTime || 5.0}`);
        setJointStatus(currentModule.reference.status === 'Complete' ? 'Complete' : 'Running');
      } else {
        // Reset to empty
        setParamIntensity('--');
        setParamAveragePower('--');
        setParamLoss('--');
        setParamStability('--');
        setParamMin('--');
        setParamMax('--');
        setParamTolerance('--');
        setParamReadingTime('--');
        setJointStatus('Pending');
      }
    } else {
      setParamIntensity('--');
      setParamAveragePower('--');
      setParamLoss('--');
      setParamStability('--');
      setParamMin('--');
      setParamMax('--');
      setParamTolerance('--');
      setParamReadingTime('--');
      setJointStatus('Pending');
    }
  }, [selectedModuleId, selectedJoint, currentModule]);

  // Model Info Save Handler
  const handleSaveModelInfo = () => {
    if (!currentModel) return;
    const updatedModel: FiberModel = {
      ...currentModel,
      brand: (brandInput as LaserBrand) || 'Raycus',
      modelName: modelNameInput.trim() || 'Untitled Model',
      description: descriptionInput.trim(),
      modifiedDate: new Date().toISOString()
    };
    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    if (onModelUpdated) onModelUpdated(updatedModel);
  };

  // MODEL ACTIONS (Column 1)
  const handleAddModel = () => {
    const newId = `model-${Date.now()}`;
    const newModel: FiberModel = {
      id: newId,
      brand: 'Raycus',
      modelName: `New Model ${models.length + 1}`,
      description: 'Standard Fiber Laser Module Configuration',
      laserType: 'CW Fiber',
      ratedPowerW: 50,
      opticalPathVersion: 'v2.1',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      cycles: [
        {
          id: `cycle-1-${Date.now()}`,
          name: 'Cycle-1',
          displayOrder: 1,
          modules: [
            {
              id: `mod-1-${Date.now()}`,
              name: '1',
              moduleType: 'Pump',
              opticalPosition: 1,
              reference: { isComplete: false, status: 'Pending' }
            }
          ]
        }
      ]
    };

    localDB.saveModel(newModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    setSelectedModelId(newId);
    onSelectModel(newModel);
  };

  const handleDuplicateModel = () => {
    if (!currentModel) return;
    setPromptModal({
      isOpen: true,
      title: 'Duplicate Model',
      message: 'Enter name for duplicated model:',
      defaultValue: `${currentModel.modelName} (Copy)`,
      onSave: (dupName) => {
        if (!dupName.trim()) return;
        const dupModel: FiberModel = {
          ...currentModel,
          id: `model-${Date.now()}`,
          modelName: dupName.trim(),
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString()
        };
        localDB.saveModel(dupModel);
        const updatedList = localDB.getModels();
        onModelsChange(updatedList);
        setSelectedModelId(dupModel.id);
        onSelectModel(dupModel);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteModel = () => {
    if (!currentModel) return;
    if (models.length <= 1) {
      alert('Cannot delete the only available model.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Model',
      message: `Are you sure you want to delete model "${currentModel.modelName}" and all its data?`,
      onConfirm: () => {
        localDB.deleteModel(currentModel.id);
        const updatedList = localDB.getModels();
        onModelsChange(updatedList);
        if (updatedList.length > 0) {
          setSelectedModelId(updatedList[0].id);
          onSelectModel(updatedList[0]);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleExportModel = () => {
    if (!currentModel) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentModel, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentModel.brand}_${currentModel.modelName}_config.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed && parsed.modelName && parsed.cycles) {
        parsed.id = `model-imp-${Date.now()}`;
        localDB.saveModel(parsed);
        const updatedList = localDB.getModels();
        onModelsChange(updatedList);
        setSelectedModelId(parsed.id);
        onSelectModel(parsed);
        setShowImportModal(false);
        setImportJsonText('');
        alert('Model imported successfully.');
      } else {
        alert('Invalid Model JSON format.');
      }
    } catch (e) {
      alert('Error parsing JSON text.');
    }
  };

  // TREE ACTIONS (Column 2)
  const handleAddCycle = () => {
    if (!currentModel) return;
    const cycleCount = (currentModel.cycles || []).length + 1;
    const newCycle: FiberCycle = {
      id: `cycle-${Date.now()}`,
      name: `Cycle-${cycleCount}`,
      displayOrder: cycleCount,
      modules: [
        {
          id: `mod-${Date.now()}`,
          name: '1',
          moduleType: 'Pump',
          opticalPosition: 1,
          reference: { isComplete: false, status: 'Pending' }
        }
      ]
    };

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: [...(currentModel.cycles || []), newCycle],
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setSelectedCycleId(newCycle.id);
    setSelectedModuleId(newCycle.modules[0].id);
  };

  const modelComponents = currentModel?.componentsUsed && currentModel.componentsUsed.length > 0
    ? currentModel.componentsUsed
    : STANDARD_SOURCE_COMPONENTS;

  const handleAddComponent = () => {
    setPromptModal({
      isOpen: true,
      title: 'Add Laser Component',
      message: 'Enter Component Name (e.g. "mo pump", "pa pump", "YDF 1 COIL", "QBH Head"):',
      defaultValue: '',
      onSave: (compName) => {
        const trimmed = compName.trim();
        if (!trimmed || !currentModel) return;
        const updatedList = Array.from(new Set([...modelComponents, trimmed]));
        const updatedModel: FiberModel = {
          ...currentModel,
          componentsUsed: updatedList,
          modifiedDate: new Date().toISOString()
        };
        localDB.saveModel(updatedModel);
        const allModels = localDB.getModels();
        onModelsChange(allModels);
        onSelectModel(updatedModel);
        if (onModelUpdated) onModelUpdated(updatedModel);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRemoveComponent = (compToRemove: string) => {
    if (!currentModel) return;
    const updatedList = modelComponents.filter(c => c !== compToRemove);
    const updatedModel: FiberModel = {
      ...currentModel,
      componentsUsed: updatedList,
      modifiedDate: new Date().toISOString()
    };
    localDB.saveModel(updatedModel);
    const allModels = localDB.getModels();
    onModelsChange(allModels);
    onSelectModel(updatedModel);
    if (onModelUpdated) onModelUpdated(updatedModel);
  };

  const handleUpdateModuleName = (cycleId: string, moduleId: string, newName: string) => {
    if (!currentModel) return;
    const updatedCycles = currentModel.cycles.map((c) => {
      if (c.id === cycleId) {
        const updatedModules = c.modules.map((m) =>
          m.id === moduleId ? { ...m, name: newName } : m
        );
        return { ...c, modules: updatedModules };
      }
      return c;
    });

    const updatedModel: FiberModel = {
      ...currentModel,
      cycles: updatedCycles,
      modifiedDate: new Date().toISOString()
    };

    localDB.saveModel(updatedModel);
    const allModels = localDB.getModels();
    onModelsChange(allModels);
    onSelectModel(updatedModel);
    if (onModelUpdated) onModelUpdated(updatedModel);
  };

  const handleAddModuleToCycle = (cycleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentModel) return;

    const targetCycle = currentModel.cycles.find((c) => c.id === cycleId);
    if (!targetCycle) return;

    const defA = modelComponents[0] || 'mo pump';
    const defB = modelComponents[1] || 'mo 1+1 combinder';
    const defaultModName = `${defA} to ${defB}`;

    setPromptModal({
      isOpen: true,
      title: 'Add Module Optical Path',
      message: 'Enter Module Optical Path (e.g. "mo pump to mo 1+1 combinder"):',
      defaultValue: defaultModName,
      onSave: (modNamePrompt) => {
        if (!modNamePrompt.trim()) return;

        const newModule: FiberModule = {
          id: `mod-${Date.now()}`,
          name: modNamePrompt.trim(),
          moduleType: 'Pump',
          opticalPosition: targetCycle.modules.length + 1,
          reference: { isComplete: false, status: 'Pending' }
        };

        const updatedCycles = currentModel.cycles.map((c) => {
          if (c.id === cycleId) {
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
        setSelectedCycleId(cycleId);
        setSelectedModuleId(newModule.id);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // RENAME CYCLE
  const handleRenameCycle = (cycleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentModel) return;
    const cycle = currentModel.cycles.find((c) => c.id === cycleId);
    if (!cycle) return;

    setPromptModal({
      isOpen: true,
      title: 'Rename Cycle',
      message: 'Enter new Cycle Name:',
      defaultValue: cycle.name,
      onSave: (newName) => {
        if (!newName.trim()) return;

        const updatedCycles = currentModel.cycles.map((c) =>
          c.id === cycleId ? { ...c, name: newName.trim() } : c
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
        if (onModelUpdated) onModelUpdated(updatedModel);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // DELETE CYCLE
  const handleDeleteCycle = (cycleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentModel) return;
    if (currentModel.cycles.length <= 1) {
      alert('Cannot delete the last cycle in this model.');
      return;
    }

    const cycle = currentModel.cycles.find((c) => c.id === cycleId);
    if (!cycle) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Cycle',
      message: `Are you sure you want to delete cycle "${cycle.name}" and all its modules?`,
      onConfirm: () => {
        const updatedCycles = currentModel.cycles.filter((c) => c.id !== cycleId);
        const updatedModel: FiberModel = {
          ...currentModel,
          cycles: updatedCycles,
          modifiedDate: new Date().toISOString()
        };

        localDB.saveModel(updatedModel);
        const updatedList = localDB.getModels();
        onModelsChange(updatedList);
        onSelectModel(updatedModel);
        if (onModelUpdated) onModelUpdated(updatedModel);

        if (selectedCycleId === cycleId) {
          if (updatedCycles.length > 0) {
            setSelectedCycleId(updatedCycles[0].id);
            if (updatedCycles[0].modules.length > 0) {
              setSelectedModuleId(updatedCycles[0].modules[0].id);
            } else {
              setSelectedModuleId('');
            }
          }
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // RENAME MODULE
  const handleRenameModule = (cycleId: string, moduleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentModel) return;

    const cycle = currentModel.cycles.find((c) => c.id === cycleId);
    if (!cycle) return;
    const mod = cycle.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    setPromptModal({
      isOpen: true,
      title: 'Rename Module',
      message: 'Enter new Module Name:',
      defaultValue: mod.name,
      onSave: (newName) => {
        if (!newName.trim()) return;

        const updatedCycles = currentModel.cycles.map((c) => {
          if (c.id === cycleId) {
            const updatedModules = c.modules.map((m) =>
              m.id === moduleId ? { ...m, name: newName.trim() } : m
            );
            return { ...c, modules: updatedModules };
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
        if (onModelUpdated) onModelUpdated(updatedModel);
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // DELETE MODULE
  const handleDeleteModule = (cycleId: string, moduleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentModel) return;

    const cycle = currentModel.cycles.find((c) => c.id === cycleId);
    if (!cycle) return;
    const mod = cycle.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Module',
      message: `Are you sure you want to delete module "${mod.name}"?`,
      onConfirm: () => {
        const updatedCycles = currentModel.cycles.map((c) => {
          if (c.id === cycleId) {
            return { ...c, modules: c.modules.filter((m) => m.id !== moduleId) };
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
        if (onModelUpdated) onModelUpdated(updatedModel);

        if (selectedModuleId === moduleId) {
          const remainingCycle = updatedModel.cycles.find((c) => c.id === cycleId);
          if (remainingCycle && remainingCycle.modules.length > 0) {
            setSelectedModuleId(remainingCycle.modules[0].id);
          } else {
            setSelectedModuleId('');
          }
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const samplesReceivedRef = useRef<boolean>(false);
  const processedCaptureIdsRef = useRef<Set<string>>(new Set());
  const captureSourceRef = useRef<'PC_BUTTON' | 'GPIO5_SWITCH'>('PC_BUTTON');

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

    setParamIntensity(`${avg.toFixed(2)}`);
    setParamAveragePower(`${avg.toFixed(2)}`);
    setParamLoss('0.00');
    setParamStability(`${stabilityVal.toFixed(2)}`);
    setParamMin(`${minVal.toFixed(2)}`);
    setParamMax(`${maxVal.toFixed(2)}`);
    setParamTolerance('2.00');
    setParamReadingTime(`${readingTimeSec.toFixed(2)}`);

    setIsCapturing(false);
    setJointStatus('Running');
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

        // Validate 100 sample count and device metadata
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

        // Dual Calculation Verification Step (PC vs ESP32)
        if (result.raw_samples && result.raw_samples.length === 100) {
          const pcSum = result.raw_samples.reduce((a, b) => a + Number(b), 0);
          const pcAvg = Number((pcSum / 100).toFixed(2));
          const delta = Math.abs(pcAvg - result.average_power);
          console.log(`[DUAL-VERIFICATION] Reference Capture - ESP32 Avg: ${result.average_power} W | PC Recalc Avg: ${pcAvg} W | Delta: ${delta.toFixed(4)} W`);
        }

        console.log(`[UI_UPDATE] capture_id=${result.capture_id || 'N/A'} source=${source} time=${timeStr} average_power=${result.average_power}`);

        // DIRECT PLACEMENT: Update UI directly from ESP32 Measurement Engine Packet
        setParamIntensity(`${result.intensity.toFixed(2)}`);
        setParamAveragePower(`${result.average_power.toFixed(2)}`);
        setParamLoss(`${result.optical_loss.toFixed(2)}`);
        setParamStability(`${result.stability.toFixed(2)}`);
        setParamMin(`${result.min_power.toFixed(2)}`);
        setParamMax(`${result.max_power.toFixed(2)}`);
        setParamTolerance(`${result.tolerance.toFixed(2)}`);
        setParamReadingTime(`${result.reading_time.toFixed(2)}`);

        setIsCapturing(false);
        setJointStatus('Running');
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
        handleCaptureReading('GPIO5_SWITCH');
      }
    });

    return () => {
      unsubCapEvents();
      unsubHW();
    };
  }, [processReferenceSamples]);

  // REFERENCE READING ACTIONS (Column 3)
  const handleCaptureReading = async (source: 'PC_BUTTON' | 'GPIO5_SWITCH' = 'PC_BUTTON') => {
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

  const handleSaveReference = () => {
    if (!currentModule || !currentCycle) {
      alert('Please select a module first.');
      return;
    }

    const parseNum = (str: string, fallback: number = 0) => {
      const val = parseFloat(str.replace(/[^\d.-]/g, ''));
      return isNaN(val) ? fallback : val;
    };

    const readingParams: ReadingParameters = {
      intensity: parseNum(paramIntensity, 100.0),
      averagePower: parseNum(paramAveragePower, 23.5),
      loss: parseNum(paramLoss, 1.5),
      stability: parseNum(paramStability, 98.6),
      minimum: parseNum(paramMin, 23.0),
      maximum: parseNum(paramMax, 24.0),
      tolerance: parseNum(paramTolerance, 2.0),
      readingTime: parseNum(paramReadingTime, 5.0)
    };

    const newJointReading: JointReading = {
      joint: selectedJoint,
      parameters: readingParams,
      capturedAt: new Date().toISOString(),
      capturedBy: 'Operator',
      captureMethod: 'ESP32'
    };

    const updatedRef = { ...(currentModule.reference || {}) };
    if (selectedJoint === 'Before') updatedRef.before = newJointReading;
    if (selectedJoint === 'Upper') updatedRef.upper = newJointReading;
    if (selectedJoint === 'After') updatedRef.after = newJointReading;

    const isComplete = Boolean(updatedRef.before && updatedRef.upper && updatedRef.after);
    updatedRef.isComplete = isComplete;
    updatedRef.status = isComplete ? 'Complete' : 'Partial';

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
    const updatedList = localDB.getModels();
    onModelsChange(updatedList);
    onSelectModel(updatedModel);
    setJointStatus(isComplete ? 'Complete' : 'Running');
    alert(`Saved ${selectedJoint} joint reference reading for Module "${currentModule.name}".`);
  };

  const handleNextModule = () => {
    if (selectedJoint === 'Before') {
      setSelectedJoint('Upper');
    } else if (selectedJoint === 'Upper') {
      setSelectedJoint('After');
    } else if (selectedJoint === 'After') {
      setSelectedJoint('Before');
      // Advance to next module
      if (!currentCycle) return;
      const modIndex = currentCycle.modules.findIndex((m) => m.id === selectedModuleId);
      if (modIndex !== -1 && modIndex < currentCycle.modules.length - 1) {
        setSelectedModuleId(currentCycle.modules[modIndex + 1].id);
      } else {
        // Advance to next cycle
        const cycleIndex = currentModel.cycles.findIndex((c) => c.id === selectedCycleId);
        if (cycleIndex !== -1 && cycleIndex < currentModel.cycles.length - 1) {
          const nextCycle = currentModel.cycles[cycleIndex + 1];
          setSelectedCycleId(nextCycle.id);
          if (nextCycle.modules.length > 0) {
            setSelectedModuleId(nextCycle.modules[0].id);
          }
        }
      }
    }
  };

  return (
    <div className="bg-[#111827] text-gray-100 p-4 space-y-4 font-sans max-w-[1600px] mx-auto min-h-screen select-none">
      
      {/* TOP MODEL SELECTOR BAR WITH DROPDOWN MENU */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Dropdown Menu for Model Selection */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <label className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Select Laser Model:</span>
          </label>
          <div className="relative flex-1 max-w-md">
            <select
              value={selectedModelId}
              onChange={(e) => {
                setSelectedModelId(e.target.value);
                const found = models.find((m) => m.id === e.target.value);
                if (found) onSelectModel(found);
              }}
              className="w-full bg-[#111827] border border-amber-500/70 text-amber-300 font-bold font-mono text-xs sm:text-sm rounded-lg px-3 py-2 pr-8 outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow appearance-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-gray-900 text-white font-mono py-1">
                  [{m.brand}] {m.modelName} ({m.ratedPowerW || 50}W)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2 py-1 rounded shrink-0 font-bold">
            {models.length} Models Loaded
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleAddModel}
            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Add New Model"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Model</span>
          </button>

          <button
            onClick={handleDuplicateModel}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-amber-300 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Duplicate Selected Model"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-cyan-300 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Import Model JSON"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportModel}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-indigo-300 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Export Model JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export</span>
          </button>

          <button
            onClick={handleDeleteModel}
            className="bg-red-950/80 hover:bg-red-900 border border-red-600/80 text-red-300 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Delete Model"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ========================================================================= */}
        {/* COLUMN 1: MODEL INFORMATION & TREE VIEW (Col Span 5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-[#111827] border border-gray-700 rounded-lg p-3.5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide border-b border-gray-700 pb-1.5">
              Model Information
            </h3>

            {/* FORM INPUTS */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <label className="w-20 text-gray-400 font-bold shrink-0">Brand</label>
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => {
                    setBrandInput(e.target.value);
                    if (currentModel) {
                      currentModel.brand = e.target.value as LaserBrand;
                    }
                  }}
                  onBlur={handleSaveModelInfo}
                  placeholder="Brand Name"
                  className="bg-[#1E293B] border border-gray-600 text-white rounded px-2 py-1 w-full outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-20 text-gray-400 font-bold shrink-0">Model</label>
                <input
                  type="text"
                  value={modelNameInput}
                  onChange={(e) => {
                    setModelNameInput(e.target.value);
                    if (currentModel) {
                      currentModel.modelName = e.target.value;
                    }
                  }}
                  onBlur={handleSaveModelInfo}
                  placeholder="Model Name"
                  className="bg-[#1E293B] border border-gray-600 text-white rounded px-2 py-1 w-full outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-20 text-gray-400 font-bold shrink-0">Description</label>
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => {
                    setDescriptionInput(e.target.value);
                    if (currentModel) {
                      currentModel.description = e.target.value;
                    }
                  }}
                  onBlur={handleSaveModelInfo}
                  placeholder="Description"
                  className="bg-[#1E293B] border border-gray-600 text-white rounded px-2 py-1 w-full outline-none focus:border-amber-400 font-sans"
                />
              </div>
            </div>

            {/* COMPONENTS USED IN SOURCE MODAL TRIGGER BUTTON */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-lg p-2 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 overflow-hidden">
                <Box className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide block truncate">
                    Components Used in Source ({modelComponents.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    {modelComponents.slice(0, 3).join(', ')}{modelComponents.length > 3 ? '...' : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowComponentsModal(true)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 active:scale-95 shrink-0 transition-all shadow cursor-pointer"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* ADD CYCLE BUTTON */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={handleAddCycle}
                className="bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white text-xs font-bold py-1 px-3 rounded flex items-center gap-1 shadow active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Add Cycle</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Cycles & Modules Structure
              </span>
            </div>

            {/* TREE VIEW BOX */}
            <div className="bg-[#1E293B] border border-gray-600 rounded p-2 h-[380px] overflow-y-auto space-y-2 font-mono text-xs">
              {currentModel?.cycles?.map((cycle) => {
                const isCycleExpanded = expandedCycles[cycle.id] !== false;
                const isCycleSelected = cycle.id === selectedCycleId;

                return (
                  <div key={cycle.id} className="space-y-1">
                    {/* CYCLE HEADER NODE */}
                    <div
                      onClick={() => {
                        setSelectedCycleId(cycle.id);
                        setExpandedCycles((prev) => ({ ...prev, [cycle.id]: !isCycleExpanded }));
                      }}
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer group ${
                        isCycleSelected ? 'bg-gray-800 text-amber-300 font-bold border border-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isCycleExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                        <span className="truncate">{cycle.name}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleRenameCycle(cycle.id, e)}
                          className="p-1 text-gray-400 hover:text-cyan-300 rounded hover:bg-gray-700"
                          title="Rename Cycle"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCycle(cycle.id, e)}
                          className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700"
                          title="Delete Cycle"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* CYCLE MODULES LIST */}
                    {isCycleExpanded && (
                      <div className="pl-5 space-y-1">
                        {/* ADD MODULE BUTTON UNDER CYCLE */}
                        <button
                          onClick={(e) => handleAddModuleToCycle(cycle.id, e)}
                          className="text-[11px] text-gray-400 hover:text-emerald-400 flex items-center gap-1 py-0.5"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" />
                          <span>+ Add Module</span>
                        </button>

                        {/* MODULE ITEMS */}
                        {cycle.modules?.map((mod) => {
                          const isModSelected = mod.id === selectedModuleId;
                          const isComplete = mod.reference?.status === 'Complete';

                          return (
                            <div
                              key={mod.id}
                              onClick={() => {
                                setSelectedCycleId(cycle.id);
                                setSelectedModuleId(mod.id);
                              }}
                              className={`flex items-center justify-between p-1 rounded cursor-pointer text-xs group ${
                                isModSelected
                                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/60'
                                  : 'text-gray-300 hover:bg-gray-700/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    isComplete ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-emerald-500'
                                  }`}
                                />
                                <span className="truncate">{mod.name}</span>
                              </div>

                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                <button
                                  onClick={(e) => handleRenameModule(cycle.id, mod.id, e)}
                                  className="p-1 text-gray-400 hover:text-cyan-300 rounded hover:bg-gray-700"
                                  title="Rename Module"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteModule(cycle.id, mod.id, e)}
                                  className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700"
                                  title="Delete Module"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
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
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: MODULE REFERENCE PARAMETERS (Right ~60% - Col Span 7) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-[#111827] border border-gray-700 rounded-lg p-3.5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            {/* HEADER: MODULE NAME */}
            <h2 className="text-base font-bold text-gray-100 font-sans border-b border-gray-700 pb-1.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>{currentModule ? `Module: ${currentModule.name}` : 'No Module Selected'}</span>
                {currentModule && currentCycle && (
                  <button
                    onClick={(e) => handleRenameModule(currentCycle.id, currentModule.id, e)}
                    className="p-1 text-cyan-400 hover:text-cyan-300 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1 px-1.5 border border-gray-600"
                    title="Rename Selected Module"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span className="text-[10px] font-mono">Rename</span>
                  </button>
                )}
              </div>
              {currentModule && (
                <span className="text-xs font-mono text-gray-400">
                  [{currentCycle?.name}]
                </span>
              )}
            </h2>

            {/* MODULE OPTICAL PATH COMPONENT SELECTION */}
            {currentModule && currentCycle && (
              <div className="bg-[#0B1528] border border-cyan-800/70 p-2.5 rounded-lg space-y-1.5 shadow-md">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Module Optical Path Selection</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Configures Live Diagnostic Variable
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold">Module A (From):</span>
                    <select
                      value={parseStepModules(currentModule.name).moduleA}
                      onChange={(e) => {
                        const newA = e.target.value;
                        const { moduleB: currentB } = parseStepModules(currentModule.name);
                        const newName = `${newA} to ${currentB}`;
                        handleUpdateModuleName(currentCycle.id, currentModule.id, newName);
                      }}
                      className="bg-slate-900 text-amber-300 font-bold border border-slate-700 rounded px-2 py-1 outline-none text-xs focus:border-amber-400"
                    >
                      {modelComponents.map((comp) => (
                        <option key={`opt-a-${comp}`} value={comp}>{comp}</option>
                      ))}
                      {!modelComponents.includes(parseStepModules(currentModule.name).moduleA) && (
                        <option value={parseStepModules(currentModule.name).moduleA}>
                          {parseStepModules(currentModule.name).moduleA}
                        </option>
                      )}
                    </select>
                  </div>

                  <span className="text-cyan-400 font-extrabold px-1">TO</span>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold">Module B (To):</span>
                    <select
                      value={parseStepModules(currentModule.name).moduleB}
                      onChange={(e) => {
                        const newB = e.target.value;
                        const { moduleA: currentA } = parseStepModules(currentModule.name);
                        const newName = `${currentA} to ${newB}`;
                        handleUpdateModuleName(currentCycle.id, currentModule.id, newName);
                      }}
                      className="bg-slate-900 text-amber-300 font-bold border border-slate-700 rounded px-2 py-1 outline-none text-xs focus:border-amber-400"
                    >
                      {modelComponents.map((comp) => (
                        <option key={`opt-b-${comp}`} value={comp}>{comp}</option>
                      ))}
                      {!modelComponents.includes(parseStepModules(currentModule.name).moduleB) && (
                        <option value={parseStepModules(currentModule.name).moduleB}>
                          {parseStepModules(currentModule.name).moduleB}
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* JOINT SELECTOR TABS */}
            <div className="flex items-center gap-2">
              {(['Before', 'Upper', 'After'] as JointType[]).map((joint) => {
                const isActive = selectedJoint === joint;
                return (
                  <button
                    key={joint}
                    onClick={() => setSelectedJoint(joint)}
                    className={`px-3 py-1 text-xs font-bold rounded border transition-all ${
                      isActive
                        ? 'bg-gray-200 text-gray-900 border-white shadow'
                        : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {joint}
                  </button>
                );
              })}
            </div>

            {/* STATUS RADIO BUTTONS */}
            <div className="flex items-center gap-4 text-xs font-mono pt-1">
              {(['Pending', 'Running', 'Complete'] as const).map((st) => {
                const isChecked = jointStatus === st;
                return (
                  <label key={st} className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                    <input
                      type="radio"
                      name="jointStatus"
                      checked={isChecked}
                      onChange={() => setJointStatus(st)}
                      className="accent-amber-400 cursor-pointer"
                    />
                    <span>{st}</span>
                  </label>
                );
              })}
            </div>

            {/* CAPTURE COUNTDOWN DISPLAY */}
            {isCapturing && (
              <div className="bg-cyan-950/60 border border-cyan-500/80 p-2 rounded text-xs font-mono text-cyan-300 flex items-center justify-between animate-pulse">
                <span>5-Sec Photodiode Reading in progress...</span>
                <span className="font-bold text-amber-300">{6 - captureCountdown} / 5 sec</span>
              </div>
            )}

            {/* REFERENCE PARAMETERS LIST BOX */}
            <div className="bg-[#1E293B] border border-gray-600 rounded p-3 h-[280px] overflow-y-auto space-y-1.5 font-mono text-xs text-gray-200">
              {[
                { label: 'Intensity', value: paramIntensity, setter: setParamIntensity, unit: '%' },
                { label: 'Average Power', value: paramAveragePower, setter: setParamAveragePower, unit: 'W' },
                { label: 'Optical Loss', value: paramLoss, setter: setParamLoss, unit: '%' },
                { label: 'Stability %', value: paramStability, setter: setParamStability, unit: '%' },
                { label: 'Min Range', value: paramMin, setter: setParamMin, unit: 'W' },
                { label: 'Max Range', value: paramMax, setter: setParamMax, unit: 'W' },
                { label: 'Tolerance %', value: paramTolerance, setter: setParamTolerance, unit: '%' },
                { label: 'Reading Time', value: paramReadingTime, setter: setParamReadingTime, unit: 's' }
              ].map((row, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-gray-700/50">
                  <span className="text-gray-400 font-bold">{row.label}</span>
                  {isManualEntry ? (
                    <input
                      type="text"
                      value={row.value === '--' ? '' : row.value}
                      onChange={(e) => row.setter(e.target.value)}
                      placeholder="0.00"
                      className="bg-gray-900 border border-amber-400 text-amber-300 text-xs px-1.5 py-0.5 rounded w-28 text-right outline-none font-mono"
                    />
                  ) : (
                    <span className="font-bold text-gray-100">
                      {row.value !== '--' ? `${row.value} ${row.unit}` : '--'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM ACTION BUTTONS */}
          <div className="pt-2 border-t border-gray-700 flex flex-wrap items-center gap-2">
            <button
              onClick={handleCaptureReading}
              disabled={isCapturing}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 border border-gray-500 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-all flex items-center gap-1 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Capture</span>
            </button>

            <button
              onClick={() => setIsManualEntry(!isManualEntry)}
              className={`border font-bold text-xs py-1.5 px-3 rounded shadow transition-all flex items-center gap-1 active:scale-95 ${
                isManualEntry
                  ? 'bg-amber-600 border-amber-400 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isManualEntry ? 'Done Editing' : 'Manual Entry'}</span>
            </button>

            <button
              onClick={handleSaveReference}
              className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-all flex items-center gap-1 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              onClick={handleNextModule}
              className="bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-all flex items-center gap-1 active:scale-95"
            >
              <span>Next Module</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            </button>
          </div>
        </div>

      </div>

      {/* IMPORT JSON MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Import Model Configuration JSON</span>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </h3>

            <p className="text-xs text-gray-300">
              Paste a valid Model JSON structure below to import into your local offline database:
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste Model JSON object here..."
              className="w-full bg-[#111827] border border-gray-600 text-amber-300 font-mono text-xs p-3 rounded outline-none focus:border-amber-400"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJson}
                className="px-4 py-1.5 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-500"
              >
                Import Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTS USED IN SOURCE POPUP MODAL */}
      {showComponentsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1F2937] border border-cyan-800/80 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Box className="w-4 h-4 text-amber-400" />
                <span>Components Used in Laser Source ({modelComponents.length})</span>
              </h3>
              <button
                onClick={() => setShowComponentsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-sans">
              Add or remove components used in this laser source. These components populate the dropdown selection when defining module optical paths (e.g. MO Pump to MO 1+1 Combiner).
            </p>

            {/* Add Component Input Row */}
            <div className="flex items-center gap-2 bg-[#111827] p-2 rounded-lg border border-gray-700">
              <input
                type="text"
                value={newCompInput}
                onChange={(e) => setNewCompInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newCompInput.trim() && currentModel) {
                      const trimmed = newCompInput.trim();
                      const updatedList = Array.from(new Set([...modelComponents, trimmed]));
                      const updatedModel: FiberModel = {
                        ...currentModel,
                        componentsUsed: updatedList,
                        modifiedDate: new Date().toISOString()
                      };
                      localDB.saveModel(updatedModel);
                      const allModels = localDB.getModels();
                      onModelsChange(allModels);
                      onSelectModel(updatedModel);
                      if (onModelUpdated) onModelUpdated(updatedModel);
                      setNewCompInput('');
                    }
                  }
                }}
                placeholder="Type component name (e.g. 'mo pump', 'YDF 1 COIL')..."
                className="flex-1 bg-slate-900 border border-slate-700 text-amber-300 text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-400 font-mono"
              />
              <button
                onClick={() => {
                  if (newCompInput.trim() && currentModel) {
                    const trimmed = newCompInput.trim();
                    const updatedList = Array.from(new Set([...modelComponents, trimmed]));
                    const updatedModel: FiberModel = {
                      ...currentModel,
                      componentsUsed: updatedList,
                      modifiedDate: new Date().toISOString()
                    };
                    localDB.saveModel(updatedModel);
                    const allModels = localDB.getModels();
                    onModelsChange(allModels);
                    onSelectModel(updatedModel);
                    if (onModelUpdated) onModelUpdated(updatedModel);
                    setNewCompInput('');
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1 active:scale-95 transition-all shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Component Chips Container */}
            <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto p-2.5 bg-[#111827] border border-gray-700 rounded-lg">
              {modelComponents.length === 0 ? (
                <span className="text-xs text-gray-500 italic p-2">No components added yet.</span>
              ) : (
                modelComponents.map((comp) => (
                  <span
                    key={`modal-comp-chip-${comp}`}
                    className="inline-flex items-center gap-1.5 bg-slate-800 text-cyan-200 border border-slate-600 text-xs font-mono px-2.5 py-1 rounded-md shadow-sm"
                  >
                    <span>{comp}</span>
                    <button
                      onClick={() => handleRemoveComponent(comp)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      title="Remove Component"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Footer with Exit / Save & Back Button */}
            <div className="flex justify-end pt-2 border-t border-gray-700">
              <button
                onClick={() => setShowComponentsModal(false)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 active:scale-95"
              >
                <span>Save & Exit / Back</span>
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
