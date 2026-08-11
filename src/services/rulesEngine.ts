/**
 * Industrial Rule-Based Expert System for Fiber Laser Diagnostics
 * Implements LOCKED Master Prompt Part 5A - 5F Rules
 */

import {
  ReadingParameters,
  ParameterComparison,
  TestResultStatus,
  DiagnosticRule,
  JointType,
  JointComparisonResult,
  FiberModule,
  DiagnosisReport,
  LaserBrand,
  RuleSeverity
} from '../types';

export const PARAMETER_LABELS: Record<string, { label: string; unit: string }> = {
  intensity: { label: 'Intensity', unit: '%' },
  averagePower: { label: 'Average Power', unit: 'W' },
  loss: { label: 'Optical Loss %', unit: '%' },
  stability: { label: 'Stability %', unit: '%' },
  minimum: { label: 'Min Range', unit: 'W' },
  maximum: { label: 'Max Range', unit: 'W' },
  tolerance: { label: 'Tolerance %', unit: '%' },
  readingTime: { label: 'Reading Time (5s)', unit: 's' }
};

/**
 * Compares a Live Reading with a Golden Reference Reading
 */
export function compareReadings(
  ref: ReadingParameters,
  live: ReadingParameters,
  tolerancePercent: number = 2.0
): ParameterComparison[] {
  const allowedKeys: (keyof ReadingParameters)[] = [
    'intensity',
    'averagePower',
    'loss',
    'stability',
    'minimum',
    'maximum',
    'tolerance',
    'readingTime'
  ];

  return allowedKeys.map((key) => {
    const refVal = Number(ref[key] ?? 0);
    const liveVal = Number(live[key] ?? 0);
    const diff = liveVal - refVal;
    
    let diffPct = 0;
    if (refVal !== 0) {
      diffPct = (diff / Math.abs(refVal)) * 100;
    } else if (diff !== 0) {
      diffPct = 100;
    }

    let status: TestResultStatus = 'PASS';
    const absDiffPct = Math.abs(diffPct);

    if (absDiffPct > tolerancePercent * 2.5) {
      status = 'FAIL';
    } else if (absDiffPct > tolerancePercent) {
      status = 'WARNING';
    } else {
      status = 'PASS';
    }

    const info = PARAMETER_LABELS[key] || { label: key, unit: '' };

    return {
      parameterName: key,
      label: info.label,
      unit: info.unit,
      referenceValue: Number(refVal.toFixed(2)),
      liveValue: Number(liveVal.toFixed(2)),
      difference: Number(diff.toFixed(2)),
      differencePercent: Number(diffPct.toFixed(2)),
      toleranceValue: tolerancePercent,
      status
    };
  });
}

export interface StepJointReadings {
  beforeLive: number;
  beforeRef: number;
  upperLive: number;
  upperRef: number;
  afterLive: number;
  afterRef: number;
}

export interface OpticalStepDiagnosis {
  ruleCase: 'CASE_1_SOURCE_DAMAGED' | 'CASE_2_JOINT_HIGH_REFLECT' | 'CASE_3_AFTER_JOINT_NO_SIGNAL' | 'CASE_4_MID_PATH_NO_SIGNAL' | 'MATCHED' | 'GENERAL';
  caseTitle: string;
  finalVerdict: string;
  moduleA: string;
  moduleB: string;
  severity: RuleSeverity;
  healthScore: number;
  probableCauses: string[];
  repairSteps: string[];
}

export const STANDARD_SOURCE_COMPONENTS = [
  'mo pump',
  'pa pump',
  'mo 1+1 combinder',
  'pa 1+1 combinder',
  'pa 6+1 combinder',
  'YDF 1 COIL',
  'YDF 2 COIL',
  'HR Grating',
  'OC Grating',
  'Mode Stripper',
  'Optical Isolator',
  'QBH Output Head',
  'Red Guide Laser Jumper'
];

/**
 * Parses a step name like "MO Pump -> MO 1+1 Combiner" or "MO Pump to MO 1+1 Combiner"
 */
export function parseStepModules(stepName: string): { moduleA: string; moduleB: string } {
  if (!stepName) return { moduleA: 'mo pump', moduleB: 'mo 1+1 combinder' };
  const parts = stepName.split(/→|->|to/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { moduleA: parts[0], moduleB: parts[1] };
  } else if (parts.length === 1) {
    return { moduleA: parts[0], moduleB: 'Next Stage' };
  }
  return { moduleA: 'mo pump', moduleB: 'mo 1+1 combinder' };
}

/**
 * Rule Engine Evaluator for 4 Master Fault Cases:
 * Case 1: Before = 0, Upper = 0, After = 0 vs Ref = 12, 12, 12 -> "[Module A] is damage or check joint to [Module A] fiber connection"
 * Case 2: Before = 12, Upper = 30, After = 1 vs Ref = 12, 12, 12 -> "[Module A] to [Module B] joint open or break because intensity detected high at upper joint compared to reference reading"
 * Case 3: Before = 12, Upper = 12, After = 1 vs Ref = 12, 12, 12 -> "[Module A] to [Module B] joint open or break because after joint no detected intensity"
 * Case 4: Cycle 1 Step 1 matched, but Step 2 Before=0, Upper=0, After=0 -> "[Module A] TO [Module B] NOT TOUCH INTENSITY SO FINAL VERDICT IS [Module A] FAULTY OR CHECK BETWEEN FIBER CABLE"
 */
export function evaluateOpticalStepDiagnosis(
  stepName: string,
  readings: StepJointReadings,
  previousStepPassed?: boolean
): OpticalStepDiagnosis {
  const { moduleA, moduleB } = parseStepModules(stepName);
  const { beforeLive, beforeRef, upperLive, upperRef, afterLive, afterRef } = readings;

  // Reading tolerance: ±2.0 W (or ±2.0 units) from reference is acceptable (normal)
  const isBeforeMatch = Math.abs(beforeLive - beforeRef) <= 2.0;
  const isUpperMatch = Math.abs(upperLive - upperRef) <= 2.0;
  const isAfterMatch = Math.abs(afterLive - afterRef) <= 2.0;

  // Zero / Lost signal checks
  const isBeforeZero = beforeLive <= 2.0 && beforeRef > 2.0;
  const isUpperZero = upperLive <= 2.0 && upperRef > 2.0;
  const isAfterZero = afterLive <= 2.0 && afterRef > 2.0;

  // High intensity reflection check at Upper joint
  const isUpperHigh = upperLive > upperRef + 2.0;

  // Low / 0 signal after joint
  const isAfterLow = afterLive <= 2.0 && afterRef > 2.0;

  // CASE 1 & CASE 4: Zero Intensity across all 3 joints
  if (isBeforeZero && isUpperZero && isAfterZero) {
    if (previousStepPassed) {
      // CASE 4: Step 1 passed, but Step 2 receives no intensity
      return {
        ruleCase: 'CASE_4_MID_PATH_NO_SIGNAL',
        caseTitle: 'CASE 4: MID-PATH OPTICAL SIGNAL INTERRUPTION',
        finalVerdict: `so final verdict :- ${moduleA} TO ${moduleB} NOT TOUCH INTENSITY SO FINAL VERDICT IS ${moduleA.toUpperCase()} FAULTY OR CHECK BETWEEN FIBER CABLE`,
        moduleA,
        moduleB,
        severity: 'Critical',
        healthScore: 10,
        probableCauses: [
          `${moduleA} output section or internal amplifier failure`,
          `Fiber optic cable between ${moduleA} and ${moduleB} broken or pinched`,
          `Fusion splice catastrophic disconnect at output of ${moduleA}`
        ],
        repairSteps: [
          `Inspect fiber cable connecting ${moduleA} to ${moduleB} under laser safety light`,
          `Verify fusion splice sleeve between ${moduleA} and ${moduleB}`,
          `Check ${moduleA} power supply current and control signals`,
          `Replace broken fiber cable or repair fusion splice joint`
        ]
      };
    } else {
      // CASE 1: Pump / Source output zero at initial step
      return {
        ruleCase: 'CASE_1_SOURCE_DAMAGED',
        caseTitle: 'CASE 1: PUMP/SOURCE INTENSITY LOST',
        finalVerdict: `so final conclusive is :- ${moduleA} is damage or check joint to ${moduleA} fiber connection`,
        moduleA,
        moduleB,
        severity: 'Critical',
        healthScore: 5,
        probableCauses: [
          `${moduleA} laser diode emitter damaged or burned out`,
          `${moduleA} driver power supply disconnected or blown fuse`,
          `Fiber connection to ${moduleA} disconnected or severed`,
          `Trigger or pulse signal missing from main board`
        ],
        repairSteps: [
          `Check DC supply voltage and current at ${moduleA} driver board`,
          `Inspect fiber jumper connection from ${moduleA}`,
          `Verify laser enable/trigger signal from controller`,
          `Replace ${moduleA} module if driver power supply is normal`
        ]
      };
    }
  }

  // CASE 2: Before = Match (~12), Upper = High (~30), After = Low/0 (~1)
  if (isBeforeMatch && isUpperHigh && isAfterLow) {
    return {
      ruleCase: 'CASE_2_JOINT_HIGH_REFLECT',
      caseTitle: 'CASE 2: JOINT OPEN / HIGH REFLECTION DETECTED',
      finalVerdict: `so final verdict :- ${moduleA} to ${moduleB} joint open or break because intensity detected high at upper joint compared to reference reading`,
      moduleA,
      moduleB,
      severity: 'Critical',
      healthScore: 15,
      probableCauses: [
        `Joint interface between ${moduleA} and ${moduleB} opened or mechanically broken`,
        `Abnormally high back-reflection or scatter detected at upper joint interface`,
        `Connector ferrule dirt/burn contamination or air-gap creation`,
        `Optical isolator or protection window damage`
      ],
      repairSteps: [
        `Power down laser source and inspect joint connection between ${moduleA} and ${moduleB}`,
        `Inspect connector end-face using 400x microscope for burn marks or dirt`,
        `Clean optical ferrule thoroughly with isopropyl alcohol optics wipe`,
        `Re-seat joint connector firmly or re-fuse optical fiber joint`
      ]
    };
  }

  // CASE 3: Before = Match (~12), Upper = Match (~12), After = Low/0 (~1)
  if (isBeforeMatch && isUpperMatch && isAfterLow) {
    return {
      ruleCase: 'CASE_3_AFTER_JOINT_NO_SIGNAL',
      caseTitle: 'CASE 3: AFTER JOINT SIGNAL LOSS',
      finalVerdict: `so final verdict :- ${moduleA} to ${moduleB} joint open or break because after joint no detected intensity`,
      moduleA,
      moduleB,
      severity: 'Critical',
      healthScore: 20,
      probableCauses: [
        `Joint interface between ${moduleA} and ${moduleB} opened or broken`,
        `Optical signal path severed immediately after joint`,
        `Fusion splice complete attenuation or fiber fracture inside protection sleeve`,
        `Optical isolator or beam dump blocking signal after joint`
      ],
      repairSteps: [
        `Inspect output fiber cable immediately following joint between ${moduleA} and ${moduleB}`,
        `Check fusion splice protection sleeve for mechanical stress or crack`,
        `Re-clean optical connector ferrule and verify latching mechanism`,
        `Inject red VFL laser light to trace physical light leak after joint`
      ]
    };
  }

  // MATCHED CASE: All 3 joints match reference within ±2.0 W
  if (isBeforeMatch && isUpperMatch && isAfterMatch) {
    return {
      ruleCase: 'MATCHED',
      caseTitle: 'NOMINAL PERFORMANCE MATCHED',
      finalVerdict: `so final verdict :- ${moduleA} to ${moduleB} reading matched`,
      moduleA,
      moduleB,
      severity: 'Information',
      healthScore: 100,
      probableCauses: [`All intensity readings match Golden Reference values within ±2.0 W standard tolerance`],
      repairSteps: [`No repair necessary. Proceed to next test step in optical path.`]
    };
  }

  // GENERAL FALLBACK
  return {
    ruleCase: 'GENERAL',
    caseTitle: 'GENERAL PARAMETER DEVIATION',
    finalVerdict: `so final verdict :- ${moduleA} to ${moduleB} parameter variation detected. Check individual joint tolerances.`,
    moduleA,
    moduleB,
    severity: 'Warning',
    healthScore: 75,
    probableCauses: [`Partial optical power drop or alignment tolerance shift`],
    repairSteps: [`Re-verify joint calibration and clean optical connectors`]
  };
}

/**
 * Calculates Module / Joint overall status
 */
export function evaluateJointStatus(comparisons: ParameterComparison[]): TestResultStatus {
  if (comparisons.some((c) => c.status === 'FAIL')) {
    return 'FAIL';
  }
  if (comparisons.some((c) => c.status === 'WARNING')) {
    return 'WARNING';
  }
  return 'PASS';
}

/**
 * Master Industrial Fault Rule Engine Execution
 */
export function diagnoseFaults(
  comparisons: ParameterComparison[],
  ref: ReadingParameters,
  live: ReadingParameters,
  moduleInfo: FiberModule,
  joint: JointType,
  stepJointReadings?: StepJointReadings,
  previousStepPassed?: boolean
): {
  overallStatus: TestResultStatus;
  healthScore: number;
  healthGrade: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical';
  triggeredRules: DiagnosticRule[];
  primaryFaultLocation: string;
  evidenceSummary: string;
  probableCauses: { cause: string; probability: number }[];
  repairSteps: string[];
  nextTestRecommendation: string;
} {
  const triggeredRules: DiagnosticRule[] = [];
  
  const powerComp = comparisons.find((c) => c.parameterName === 'averagePower');
  const peakComp = comparisons.find((c) => c.parameterName === 'peakPower');
  const tempComp = comparisons.find((c) => c.parameterName === 'temperature');
  const stabilityComp = comparisons.find((c) => c.parameterName === 'stability');
  const freqComp = comparisons.find((c) => c.parameterName === 'frequency');

  const livePower = live.averagePower;
  const refPower = ref.averagePower;
  const powerDropPct = refPower > 0 ? ((refPower - livePower) / refPower) * 100 : 0;

  // RULE-0003: OUTPUT LOST AFTER JOINT
  if (refPower > 1 && livePower <= 0.1) {
    triggeredRules.push({
      id: 'RULE-0003',
      name: 'OUTPUT LOST AFTER JOINT',
      category: 'Signal Loss',
      priority: 1,
      severity: 'Critical',
      conditionDescription: `Reference Power = ${refPower}W, Live Power = ${livePower}W (100% Signal Loss)`,
      diagnosisText: `Signal reaches the joint (${joint}) but disappears completely after it. Critical fiber or component disconnect detected.`,
      faultLocation: `After Joint [${moduleInfo.name} -> ${joint}]`,
      confidence: 99,
      probableCauses: [
        'Fiber break or crush along optical path',
        'Connector ferrule damaged or unplugged',
        'Fusion splice catastrophic failure',
        'Output fiber macro-bend or fracture'
      ],
      recommendedActions: [
        'Perform visual inspection of fiber routing using laser safety glasses',
        'Inspect optical connector end-face with fiber microscope',
        'Check fusion splice sleeve for thermal or mechanical damage',
        'Reconnect fiber and verify mechanical latching'
      ],
      nextSuggestedTest: `Measure Output at next optical module [${moduleInfo.nextModuleId || 'QBH Head'}]`
    });
  }

  // RULE-0001: MO PUMP OUTPUT LOW
  if (moduleInfo.moduleType === 'Pump' || moduleInfo.moduleType === 'MO') {
    if (powerDropPct > 15 && livePower > 0.1) {
      triggeredRules.push({
        id: 'RULE-0001',
        name: 'MO PUMP OUTPUT LOW',
        category: 'Power Loss',
        priority: 1,
        severity: 'Critical',
        conditionDescription: `Reference Power = ${refPower}W, Live Power = ${livePower}W (Power dropped by ${powerDropPct.toFixed(1)}%)`,
        diagnosisText: `Pump module output is significantly below the expected golden reference. Fault is localized inside the Pump Stage or Driver circuit.`,
        faultLocation: `Inside Module [${moduleInfo.name}]`,
        confidence: 98,
        probableCauses: [
          'Pump laser diode aging or partial emitter burnout',
          'Pump driver current degradation',
          'Driver power supply voltage drop',
          'Internal optical coupler loss'
        ],
        recommendedActions: [
          'Measure pump driver DC supply current with clamp meter',
          'Verify TEC cooler voltage and operating temperature',
          'Check control signal pulse trigger from driver board',
          'Replace degraded pump diode assembly if current is normal'
        ],
        nextSuggestedTest: 'Measure Pump Driver Current & Supply Voltage'
      });
    }
  }

  // RULE-0002: ABNORMAL POWER CHANGE ACROSS JOINT
  if (joint === 'Upper' && powerComp && powerComp.status !== 'PASS') {
    triggeredRules.push({
      id: 'RULE-0002',
      name: 'ABNORMAL POWER CHANGE ACROSS JOINT',
      category: 'Joint Analysis',
      priority: 2,
      severity: 'Major',
      conditionDescription: `Power difference of ${powerComp.difference}W (${powerComp.differencePercent}%) detected at Upper Joint`,
      diagnosisText: `Abnormal optical power variation detected across the joint interface. Passive optical joints must maintain linear throughput.`,
      faultLocation: `At Joint [${moduleInfo.name} - Upper]`,
      confidence: 92,
      probableCauses: [
        'Fiber core alignment mismatch during re-assembly',
        'High insertion loss at fusion splice',
        'Dust or oil contamination on connector ferrule',
        'Optical sensor alignment position error'
      ],
      recommendedActions: [
        'Unplug and clean optical connector with dust-free isopropyl alcohol swabs',
        'Inspect fiber ferrule with 400x fiber scope',
        'Re-align optical sensor head and verify zero-offset',
        'Re-measure Upper Joint'
      ],
      nextSuggestedTest: 'Re-clean Joint and Perform Retest on Upper Joint'
    });
  }

  // RULE-0005: CONNECTOR CONTAMINATION
  if (moduleInfo.moduleType === 'ISO' || moduleInfo.moduleType === 'QBH') {
    if (powerDropPct >= 5 && powerDropPct <= 25) {
      triggeredRules.push({
        id: 'RULE-0005',
        name: 'CONNECTOR CONTAMINATION',
        category: 'Connector',
        priority: 2,
        severity: 'Major',
        conditionDescription: `Moderate power drop of ${powerDropPct.toFixed(1)}% observed across connector module`,
        diagnosisText: `Optical loss consistent with dust particle burn or surface film contamination on optical connector window/end-face.`,
        faultLocation: `Connector Interface [${moduleInfo.name}]`,
        confidence: 95,
        probableCauses: [
          'Dust or dirt accumulation on quartz protection window',
          'Oil/fingerprint film on optical ferrule',
          'Minor surface pitting or laser burn mark'
        ],
        recommendedActions: [
          'Clean protective window with high-purity ethanol and lint-free optics paper',
          'Inspect window glass under coaxial illumination',
          'Replace protection window if burn spot is permanent'
        ],
        nextSuggestedTest: 'Perform Optical End-face Inspection and Retest'
      });
    }
  }

  // RULE-0006: FIBER BEND LOSS
  if (powerDropPct > 3 && powerDropPct <= 12 && (!tempComp || tempComp.status === 'PASS')) {
    triggeredRules.push({
      id: 'RULE-0006',
      name: 'FIBER BEND LOSS',
      category: 'Fiber',
      priority: 2,
      severity: 'Major',
      conditionDescription: `Gradual power reduction of ${powerDropPct.toFixed(1)}% without thermal overload`,
      diagnosisText: `Macro-bending or micro-bending optical leakage along the delivery fiber jacket causing light to escape into cladding.`,
      faultLocation: `Fiber Routing Cable [${moduleInfo.name}]`,
      confidence: 94,
      probableCauses: [
        'Fiber optic cable radius bent tighter than minimum allowed 150mm',
        'Internal fiber strain inside cable carrier/drag chain',
        'Mechanical pinch on armor conduit'
      ],
      recommendedActions: [
        'Inspect entire fiber cable tray and drag chain for sharp bends',
        'Ensure minimum bend radius exceeds manufacturer specification',
        'Straighten fiber cable and re-verify power'
      ],
      nextSuggestedTest: 'Check Fiber Conduit Routing and Retest'
    });
  }

  // RULE-0008: SIGNAL UNSTABLE
  if (stabilityComp && stabilityComp.status !== 'PASS') {
    triggeredRules.push({
      id: 'RULE-0008',
      name: 'SIGNAL UNSTABLE',
      category: 'Stability',
      priority: 3,
      severity: 'Warning',
      conditionDescription: `Stability measured at ${live.stability}% vs Reference ${ref.stability}%`,
      diagnosisText: `Laser output amplitude exhibits continuous low-frequency power fluctuation or mode hopping.`,
      faultLocation: `Module Resonator [${moduleInfo.name}]`,
      confidence: 91,
      probableCauses: [
        'Pump laser driver current ripple or noisy power supply',
        'Thermoelectric cooler (TEC) temperature hunting loop',
        'Optical feedback reflection back into seed cavity',
        'Vibration at optical bench'
      ],
      recommendedActions: [
        'Check DC power supply voltage ripple with oscilloscope',
        'Inspect TEC thermal grease and temperature sensor binding',
        'Verify isolator back-reflection suppression'
      ],
      nextSuggestedTest: 'Monitor Power Drift for 60 Seconds'
    });
  }

  // RULE-0009: TEMPERATURE TOO HIGH
  if (live.temperature > ref.temperature + 8 || live.temperature > 45) {
    triggeredRules.push({
      id: 'RULE-0009',
      name: 'TEMPERATURE TOO HIGH',
      category: 'Temperature',
      priority: 1,
      severity: 'Critical',
      conditionDescription: `Measured Temperature = ${live.temperature}°C (Ref = ${ref.temperature}°C)`,
      diagnosisText: `Module operating temperature exceeds safe thermal specification limit. Overheating risks permanent laser diode degradation.`,
      faultLocation: `Thermal Baseplate [${moduleInfo.name}]`,
      confidence: 97,
      probableCauses: [
        'Chiller water flow restricted or coolant temperature set too high',
        'Thermoelectric cooler (TEC) Peltier element failure',
        'Thermal grease dried out or air gap between module and plate',
        'Cooling fan filter clogged'
      ],
      recommendedActions: [
        'IMMEDIATE: Verify chiller water flow rate (> 8 L/min) and water temp (22°C)',
        'Check cooling fan operation and clean dust filter',
        'Re-apply thermal compound on module baseplate'
      ],
      nextSuggestedTest: 'Check Water Chiller Flow Rate and Temperature'
    });
  }

  // Default RULE if everything is good
  if (triggeredRules.length === 0) {
    triggeredRules.push({
      id: 'RULE-0000',
      name: 'NORMAL OPTICAL PERFORMANCE',
      category: 'Configuration',
      priority: 4,
      severity: 'Information',
      conditionDescription: 'All parameters match Golden Reference within strict industrial tolerances',
      diagnosisText: 'Module is operating within 100% nominal specification. Optical path throughput, stability, and thermal metrics are healthy.',
      faultLocation: 'None (System Nominal)',
      confidence: 99,
      probableCauses: ['System operating in peak golden condition'],
      recommendedActions: ['No repair or adjustment required. Log test in service ledger.'],
      nextSuggestedTest: `Proceed to Next Module [${moduleInfo.nextModuleId || 'Complete'}]`
    });
  }

  // Check 4 Master Optical Step Cases
  const jointReadingsToUse: StepJointReadings = stepJointReadings || {
    beforeLive: live.intensity || live.averagePower,
    beforeRef: ref.intensity || ref.averagePower || 12.0,
    upperLive: live.intensity || live.averagePower,
    upperRef: ref.intensity || ref.averagePower || 12.0,
    afterLive: live.intensity || live.averagePower,
    afterRef: ref.intensity || ref.averagePower || 12.0
  };

  const stepDiag = evaluateOpticalStepDiagnosis(moduleInfo.name, jointReadingsToUse, previousStepPassed);

  // Calculate Health Score (0 to 100)
  let healthScore = 100;

  comparisons.forEach((c) => {
    if (c.status === 'FAIL') {
      healthScore -= 18;
    } else if (c.status === 'WARNING') {
      healthScore -= 6;
    }
  });

  if (livePower <= 0.1 && refPower > 1) {
    healthScore = Math.min(healthScore, 10);
  }

  if (stepDiag.ruleCase !== 'GENERAL' && stepDiag.ruleCase !== 'MATCHED') {
    healthScore = Math.min(healthScore, stepDiag.healthScore);
  }

  healthScore = Math.max(0, Math.min(100, healthScore));

  let healthGrade: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical' = 'Excellent';
  if (healthScore >= 92) healthGrade = 'Excellent';
  else if (healthScore >= 80) healthGrade = 'Good';
  else if (healthScore >= 65) healthGrade = 'Average';
  else if (healthScore >= 45) healthGrade = 'Poor';
  else healthGrade = 'Critical';

  const overallStatus: TestResultStatus = healthScore >= 85 ? 'PASS' : healthScore >= 65 ? 'WARNING' : 'FAIL';

  // Primary Fault Location & Evidence
  const primaryRule = triggeredRules.sort((a, b) => a.priority - b.priority)[0];
  const primaryFaultLocation = stepDiag.ruleCase !== 'MATCHED' && stepDiag.ruleCase !== 'GENERAL' 
    ? `${stepDiag.moduleA} → ${stepDiag.moduleB}` 
    : (primaryRule ? primaryRule.faultLocation : 'System Nominal');

  let evidenceSummary = stepDiag.finalVerdict;

  // Consolidated probable causes with probability percentages
  const probableCauses: { cause: string; probability: number }[] = [];
  if (stepDiag.probableCauses && stepDiag.probableCauses.length > 0) {
    stepDiag.probableCauses.forEach((cause, cIdx) => {
      probableCauses.push({ cause, probability: Math.max(35, 98 - cIdx * 15) });
    });
  }
  triggeredRules.forEach((rule, rIdx) => {
    rule.probableCauses.forEach((cause, cIdx) => {
      if (!probableCauses.some(p => p.cause === cause)) {
        const baseProb = Math.max(30, rule.confidence - cIdx * 12 - rIdx * 10);
        probableCauses.push({ cause, probability: Math.min(99, baseProb) });
      }
    });
  });

  // Consolidated repair steps
  const repairSteps: string[] = [];
  if (stepDiag.repairSteps && stepDiag.repairSteps.length > 0) {
    stepDiag.repairSteps.forEach((step) => repairSteps.push(step));
  }
  triggeredRules.forEach((rule) => {
    rule.recommendedActions.forEach((step) => {
      if (!repairSteps.includes(step)) {
        repairSteps.push(step);
      }
    });
  });

  const nextTestRecommendation = primaryRule ? primaryRule.nextSuggestedTest : 'Proceed to Next Module';

  return {
    overallStatus,
    healthScore,
    healthGrade,
    triggeredRules,
    primaryFaultLocation,
    evidenceSummary,
    probableCauses,
    repairSteps,
    nextTestRecommendation
  };
}
