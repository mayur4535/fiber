/**
 * Model Package Import / Export Service (.fsdmodel)
 * Fiber Source Diagnostic Pro
 *
 * Provides single-file Model Import and Export capability (.fsdmodel).
 * Independent from Full Database Backup/Restore (.fsdbackup).
 */

import { FiberModel } from '../types';
import { localDB } from './db';

export interface ModelPackageFile {
  fileType: 'FSDP_MODEL_PACKAGE';
  schemaVersion: '1.0';
  exportedAt: string;
  exportedBy?: string;
  application: 'MAYUR FIBER DIAGNOSIS';
  developer: 'Mayur Raval';
  model: FiberModel;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  modelPackage?: ModelPackageFile;
}

/**
 * Export a single FiberModel as a complete .fsdmodel package file
 */
export function exportModelPackage(model: FiberModel): void {
  if (!model) {
    alert('No model selected for export.');
    return;
  }

  const packageData: ModelPackageFile = {
    fileType: 'FSDP_MODEL_PACKAGE',
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: localDB.getSettings().engineerName || 'Mayur Raval',
    application: 'MAYUR FIBER DIAGNOSIS',
    developer: 'Mayur Raval',
    model: JSON.parse(JSON.stringify(model)) // Deep clone complete model including all cycles, modules, & references
  };

  const jsonString = JSON.stringify(packageData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanBrand = (model.brand || 'Laser').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (model.modelName || 'Model').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `FSDP_Model_${cleanBrand}_${cleanName}.fsdmodel`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  localDB.log('INFO', 'Model Export', `Exported Model Package: ${fileName}`);
}

/**
 * Validate an imported .fsdmodel file object
 */
export function validateModelPackage(parsedData: any): ValidationResult {
  if (!parsedData || typeof parsedData !== 'object') {
    return { valid: false, reason: 'File content is not a valid JSON object.' };
  }

  // Handle both direct ModelPackageFile wrapper and raw FiberModel objects
  let targetModel: FiberModel | null = null;

  if (parsedData.fileType === 'FSDP_MODEL_PACKAGE' && parsedData.model) {
    targetModel = parsedData.model;
  } else if (parsedData.modelName && Array.isArray(parsedData.cycles)) {
    // Legacy direct model object compatibility wrapper
    targetModel = parsedData as FiberModel;
  } else {
    return {
      valid: false,
      reason: 'Invalid file signature. File is missing "fileType": "FSDP_MODEL_PACKAGE" or valid Model structure.'
    };
  }

  // Mandatory fields check
  if (!targetModel.modelName || typeof targetModel.modelName !== 'string' || !targetModel.modelName.trim()) {
    return { valid: false, reason: 'Model is missing a valid modelName field.' };
  }

  if (!Array.isArray(targetModel.cycles)) {
    return { valid: false, reason: 'Model is missing required "cycles" list or cycles field is not an array.' };
  }

  // Validate cycles and inner modules
  for (let cIdx = 0; cIdx < targetModel.cycles.length; cIdx++) {
    const cycle = targetModel.cycles[cIdx];
    if (!cycle || typeof cycle !== 'object') {
      return { valid: false, reason: `Cycle at index ${cIdx} is corrupted or null.` };
    }
    if (!cycle.name) {
      return { valid: false, reason: `Cycle at index ${cIdx} is missing a name.` };
    }
    if (!Array.isArray(cycle.modules)) {
      return { valid: false, reason: `Cycle "${cycle.name}" is missing a valid "modules" array.` };
    }

    for (let mIdx = 0; mIdx < cycle.modules.length; mIdx++) {
      const module = cycle.modules[mIdx];
      if (!module || typeof module !== 'object') {
        return { valid: false, reason: `Module at index ${mIdx} inside cycle "${cycle.name}" is corrupted.` };
      }
      if (!module.name) {
        return { valid: false, reason: `Module at index ${mIdx} inside cycle "${cycle.name}" is missing a module name.` };
      }
    }
  }

  // Form structured ModelPackageFile
  const normalizedPackage: ModelPackageFile = {
    fileType: 'FSDP_MODEL_PACKAGE',
    schemaVersion: parsedData.schemaVersion || '1.0',
    exportedAt: parsedData.exportedAt || new Date().toISOString(),
    exportedBy: parsedData.exportedBy || 'Imported User',
    application: 'MAYUR FIBER DIAGNOSIS',
    developer: 'Mayur Raval',
    model: targetModel
  };

  return { valid: true, modelPackage: normalizedPackage };
}

/**
 * Check if a model with same ID or same brand + modelName already exists
 */
export function checkDuplicateModel(importedModel: FiberModel): {
  isDuplicate: boolean;
  existingModel?: FiberModel;
  matchType?: 'id' | 'name';
} {
  const existingModels = localDB.getModels();

  // Check ID match
  const idMatch = existingModels.find(m => m.id === importedModel.id);
  if (idMatch) {
    return { isDuplicate: true, existingModel: idMatch, matchType: 'id' };
  }

  // Check Name match
  const nameMatch = existingModels.find(
    m => m.brand === importedModel.brand && m.modelName.toLowerCase() === importedModel.modelName.toLowerCase()
  );
  if (nameMatch) {
    return { isDuplicate: true, existingModel: nameMatch, matchType: 'name' };
  }

  return { isDuplicate: false };
}

/**
 * Import model package into local database
 */
export function commitImportModelPackage(
  modelPackage: ModelPackageFile,
  mode: 'replace' | 'new'
): FiberModel {
  const imported = JSON.parse(JSON.stringify(modelPackage.model)) as FiberModel;

  if (mode === 'new') {
    imported.id = `model-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const existingNames = localDB.getModels().map(m => m.modelName);
    if (existingNames.includes(imported.modelName)) {
      imported.modelName = `${imported.modelName} (Imported)`;
    }
  }

  imported.modifiedDate = new Date().toISOString();
  localDB.saveModel(imported);
  localDB.log('INFO', 'Model Import', `Successfully imported Model Package "${imported.brand} ${imported.modelName}" (${mode} mode)`);

  return imported;
}
