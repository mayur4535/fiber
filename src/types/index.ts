/**
 * Fiber Source Diagnostic Pro
 * Universal Data Models and Specification
 */

export type LaserBrand = 'Raycus' | 'JPT' | 'IPG' | 'MAX' | 'RECI' | 'BWT' | 'Other';

export type JointType = 'Before' | 'Upper' | 'After';

export type JointStatus = 'Pending' | 'Partial' | 'Complete';

export type TestResultStatus = 'PASS' | 'WARNING' | 'FAIL';

export type RuleSeverity = 'Information' | 'Warning' | 'Major' | 'Critical';

export type AppUserRole = 'Operator' | 'Engineer' | 'Admin';

export interface ReadingParameters {
  intensity: number;      // % or relative intensity
  frequency: number;      // kHz
  pulseWidth: number;     // ns
  averagePower: number;   // W
  peakPower: number;      // W or kW
  temperature: number;    // °C
  stability: number;      // %
  minimum: number;        // W or %
  maximum: number;        // W or %
  readingTime: number;    // seconds
}

export interface JointReading {
  joint: JointType;
  parameters: ReadingParameters;
  capturedAt?: string;
  capturedBy?: string;
  captureMethod?: 'ESP32' | 'Manual';
}

export interface ModuleReference {
  before?: JointReading;
  upper?: JointReading;
  after?: JointReading;
  isComplete: boolean;
  status: JointStatus; // Gray = Pending (no reading), Yellow = Partial, Green = Complete
  lastUpdated?: string;
}

export interface FiberModule {
  id: string;
  name: string; // e.g. "Pump", "ISO", "Combiner", "MO", "QBH", "PA", "Output Coupler"
  moduleType: 'Seed' | 'ISO' | 'Pump' | 'Combiner' | 'MO' | 'PA' | 'Output Coupler' | 'QBH' | 'Other';
  opticalPosition: number; // Order along the optical path
  previousModuleId?: string;
  nextModuleId?: string;
  expectedInputPower?: number;
  expectedOutputPower?: number;
  expectedLossDb?: number;
  reference: ModuleReference;
}

export interface FiberCycle {
  id: string;
  name: string; // e.g. "Cycle 1", "Cycle 2"
  displayOrder: number;
  modules: FiberModule[];
}

export interface FiberModel {
  id: string;
  brand: LaserBrand;
  modelName: string; // e.g. "50QB", "1000W", "YLP-100W"
  description: string;
  laserType: 'Fiber Laser' | 'MOPA' | 'Q-Switched' | 'CW Fiber';
  ratedPowerW: number;
  opticalPathVersion: string;
  createdDate: string;
  modifiedDate: string;
  componentsUsed?: string[];
  cycles: FiberCycle[];
}

export interface ParameterComparison {
  parameterName: keyof ReadingParameters;
  label: string;
  unit: string;
  referenceValue: number;
  liveValue: number;
  difference: number;        // Live - Ref
  differencePercent: number; // ((Live - Ref) / Ref) * 100
  toleranceValue: number;    // e.g. 2% or absolute
  status: TestResultStatus;
}

export interface JointComparisonResult {
  joint: JointType;
  parameterComparisons: ParameterComparison[];
  status: TestResultStatus;
}

export interface ESP32Packet {
  header: 'FSDP';
  protocolVersion: '1.0';
  commandId: number;
  packetNum: number;
  payload: Record<string, any>;
  crc16: number;
  footer: 'END';
}

export interface DiagnosticRule {
  id: string; // e.g. "RULE-0001"
  name: string;
  category: 'Power Loss' | 'Signal Loss' | 'Optical Loss' | 'Temperature' | 'Frequency' | 'Pulse Width' | 'Stability' | 'Connector' | 'Fiber' | 'Pump' | 'Configuration' | 'Joint Analysis';
  priority: number; // 1 = Critical, 2 = Major, 3 = Warning, 4 = Info
  conditionDescription: string;
  diagnosisText: string;
  faultLocation: string; // e.g. "MO Output -> OC Input"
  confidence: number;    // %
  severity: RuleSeverity;
  probableCauses: string[];
  recommendedActions: string[];
  nextSuggestedTest: string;
}

export interface DiagnosisReport {
  id: string; // e.g. "FSDP-2026-0001"
  testId: string;
  timestamp: string;
  customerName: string;
  machineId: string;
  machineName: string;
  engineerName: string;
  brand: LaserBrand;
  modelName: string;
  serialNumber: string;
  cycleName: string;
  moduleName: string;
  joint: JointType;
  
  // Readings
  referenceReading: ReadingParameters;
  liveReading: ReadingParameters;
  comparisons: ParameterComparison[];
  
  // Diagnostics
  overallStatus: TestResultStatus;
  healthScore: number; // 0-100
  healthGrade: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical';
  triggeredRules: DiagnosticRule[];
  primaryFaultLocation: string;
  evidenceSummary: string;
  probableCauses: { cause: string; probability: number }[];
  repairSteps: string[];
  nextTestRecommendation: string;
  
  // Notes & Signatures
  engineerNotes?: string;
  customerNotes?: string;
  engineerSignature?: string;
  customerSignature?: string;
}

export interface CalibrationData {
  id: string;
  deviceId: string;
  calibrationDate: string;
  engineerName: string;
  powerOffsetW: number;
  powerGainFactor: number;
  tempOffsetC: number;
  freqGainFactor: number;
  verified: boolean;
}

export interface ESP32Status {
  connected: boolean;
  connectionType: 'USB Serial' | 'Bluetooth' | 'WiFi' | 'Wi-Fi WebSocket' | 'Simulated' | 'Disconnected';
  deviceName: string;
  firmwareVersion: string;
  hardwareVersion: string;
  serialNumber: string;
  deviceTemperatureC: number;
  batteryLevelPercent: number;
  isCapturing: boolean;
  portName?: string;
  baudRate: number;
}

export interface AppSettings {
  theme: 'dark';
  userRole: AppUserRole;
  powerUnit: 'W' | 'mW' | 'dBm';
  tempUnit: '°C' | '°F';
  autoBackupEnabled: boolean;
  companyName: string;
  companyLogoUrl?: string;
  engineerName: string;
  comPort: string;
  baudRate: number;
  toleranceDefaultPercent: number;
  demoMode: boolean;
  storageMode?: 'firebase' | 'local';
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'COMMAND';
  category: string;
  message: string;
  details?: string;
}

export interface PendingTestSession {
  id: string;
  serialNumber: string;
  modelId: string;
  brand: LaserBrand;
  modelName: string;
  activeCycleId: string;
  activeStepId: string;
  selectedJoint: JointType;
  activeFault: string;
  jointStatuses: Record<string, 'Pending' | 'Captured' | 'Saved' | 'Skipped' | 'Error'>;
  capturedParams: {
    intensity: string;
    frequency: string;
    pulseWidth: string;
    stability: string;
    loss: string;
    averagePower: string;
    readingTime: string;
    minimum: string;
    maximum: string;
  };
  lastSavedAt: string;
  completedJointsCount: number;
  totalJointsCount: number;
}
