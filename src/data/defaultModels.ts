/**
 * Pre-populated Industrial Fiber Laser Source Models with Golden Reference Readings
 */

import { FiberModel } from '../types';

export const DEFAULT_FIBER_MODELS: FiberModel[] = [
  {
    id: 'model-raycus-50qb',
    brand: 'Raycus',
    modelName: '50QB Pulsed Fiber Laser',
    description: '50W Pulsed Fiber Source for Marking & Precision Laser Engraving',
    laserType: 'Q-Switched',
    ratedPowerW: 50,
    opticalPathVersion: 'v2.1',
    createdDate: '2026-01-15T08:00:00Z',
    modifiedDate: '2026-02-01T10:30:00Z',
    cycles: [
      {
        id: 'cycle-raycus-50qb-1',
        name: 'Cycle 1 - Core Optical Path',
        displayOrder: 1,
        modules: [
          {
            id: 'mod-pump-1',
            name: 'Pump Stage',
            moduleType: 'Pump',
            opticalPosition: 1,
            expectedInputPower: 50,
            expectedOutputPower: 48,
            expectedLossDb: 0.18,
            reference: {
              isComplete: true,
              status: 'Complete',
              lastUpdated: '2026-02-01T10:30:00Z',
              before: {
                joint: 'Before',
                capturedAt: '2026-02-01T10:20:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 99.5,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 50.0,
                  peakPower: 65.0,
                  temperature: 28.5,
                  stability: 99.8,
                  minimum: 49.5,
                  maximum: 50.5,
                  readingTime: 5.0
                }
              },
              upper: {
                joint: 'Upper',
                capturedAt: '2026-02-01T10:25:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 98.8,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 49.2,
                  peakPower: 64.2,
                  temperature: 29.1,
                  stability: 99.5,
                  minimum: 48.8,
                  maximum: 49.8,
                  readingTime: 5.0
                }
              },
              after: {
                joint: 'After',
                capturedAt: '2026-02-01T10:30:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 98.2,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 48.8,
                  peakPower: 63.8,
                  temperature: 29.5,
                  stability: 99.2,
                  minimum: 48.2,
                  maximum: 49.3,
                  readingTime: 5.0
                }
              }
            }
          },
          {
            id: 'mod-iso-1',
            name: 'Optical Isolator (ISO)',
            moduleType: 'ISO',
            opticalPosition: 2,
            expectedInputPower: 48.8,
            expectedOutputPower: 47.5,
            expectedLossDb: 0.12,
            reference: {
              isComplete: true,
              status: 'Complete',
              lastUpdated: '2026-02-01T10:45:00Z',
              before: {
                joint: 'Before',
                capturedAt: '2026-02-01T10:35:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 98.0,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 48.8,
                  peakPower: 63.5,
                  temperature: 30.0,
                  stability: 99.1,
                  minimum: 48.2,
                  maximum: 49.1,
                  readingTime: 5.0
                }
              },
              upper: {
                joint: 'Upper',
                capturedAt: '2026-02-01T10:40:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 97.2,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 48.0,
                  peakPower: 62.8,
                  temperature: 30.5,
                  stability: 98.8,
                  minimum: 47.5,
                  maximum: 48.4,
                  readingTime: 5.0
                }
              },
              after: {
                joint: 'After',
                capturedAt: '2026-02-01T10:45:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 96.5,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 47.5,
                  peakPower: 62.0,
                  temperature: 31.0,
                  stability: 98.5,
                  minimum: 47.0,
                  maximum: 48.0,
                  readingTime: 5.0
                }
              }
            }
          },
          {
            id: 'mod-combiner-1',
            name: 'Pump Combiner',
            moduleType: 'Combiner',
            opticalPosition: 3,
            expectedInputPower: 47.5,
            expectedOutputPower: 46.2,
            expectedLossDb: 0.12,
            reference: {
              isComplete: true,
              status: 'Complete',
              lastUpdated: '2026-02-01T11:00:00Z',
              before: {
                joint: 'Before',
                capturedAt: '2026-02-01T10:50:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 96.0,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 47.5,
                  peakPower: 61.8,
                  temperature: 31.2,
                  stability: 98.4,
                  minimum: 46.9,
                  maximum: 47.9,
                  readingTime: 5.0
                }
              },
              upper: {
                joint: 'Upper',
                capturedAt: '2026-02-01T10:55:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 95.0,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 46.8,
                  peakPower: 61.0,
                  temperature: 31.8,
                  stability: 98.0,
                  minimum: 46.2,
                  maximum: 47.2,
                  readingTime: 5.0
                }
              },
              after: {
                joint: 'After',
                capturedAt: '2026-02-01T11:00:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 94.2,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 46.2,
                  peakPower: 60.5,
                  temperature: 32.1,
                  stability: 97.8,
                  minimum: 45.8,
                  maximum: 46.6,
                  readingTime: 5.0
                }
              }
            }
          },
          {
            id: 'mod-mo-1',
            name: 'Master Oscillator (MO)',
            moduleType: 'MO',
            opticalPosition: 4,
            expectedInputPower: 46.2,
            expectedOutputPower: 45.0,
            expectedLossDb: 0.11,
            reference: {
              isComplete: true,
              status: 'Complete',
              lastUpdated: '2026-02-01T11:15:00Z',
              before: {
                joint: 'Before',
                capturedAt: '2026-02-01T11:05:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 94.0,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 46.2,
                  peakPower: 60.2,
                  temperature: 32.5,
                  stability: 97.6,
                  minimum: 45.6,
                  maximum: 46.5,
                  readingTime: 5.0
                }
              },
              upper: {
                joint: 'Upper',
                capturedAt: '2026-02-01T11:10:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 93.2,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 45.5,
                  peakPower: 59.5,
                  temperature: 33.0,
                  stability: 97.2,
                  minimum: 45.0,
                  maximum: 45.9,
                  readingTime: 5.0
                }
              },
              after: {
                joint: 'After',
                capturedAt: '2026-02-01T11:15:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 92.5,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 45.0,
                  peakPower: 59.0,
                  temperature: 33.2,
                  stability: 97.0,
                  minimum: 44.5,
                  maximum: 45.4,
                  readingTime: 5.0
                }
              }
            }
          },
          {
            id: 'mod-qbh-1',
            name: 'QBH Output Head',
            moduleType: 'QBH',
            opticalPosition: 5,
            expectedInputPower: 45.0,
            expectedOutputPower: 44.2,
            expectedLossDb: 0.08,
            reference: {
              isComplete: true,
              status: 'Complete',
              lastUpdated: '2026-02-01T11:30:00Z',
              before: {
                joint: 'Before',
                capturedAt: '2026-02-01T11:20:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 92.2,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 45.0,
                  peakPower: 58.8,
                  temperature: 33.5,
                  stability: 96.8,
                  minimum: 44.4,
                  maximum: 45.3,
                  readingTime: 5.0
                }
              },
              upper: {
                joint: 'Upper',
                capturedAt: '2026-02-01T11:25:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 91.5,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 44.6,
                  peakPower: 58.2,
                  temperature: 34.0,
                  stability: 96.5,
                  minimum: 44.0,
                  maximum: 44.9,
                  readingTime: 5.0
                }
              },
              after: {
                joint: 'After',
                capturedAt: '2026-02-01T11:30:00Z',
                capturedBy: 'Lead Service Engineer',
                captureMethod: 'ESP32',
                parameters: {
                  intensity: 91.0,
                  frequency: 30,
                  pulseWidth: 220,
                  averagePower: 44.2,
                  peakPower: 57.8,
                  temperature: 34.2,
                  stability: 96.2,
                  minimum: 43.8,
                  maximum: 44.5,
                  readingTime: 5.0
                }
              }
            }
          }
        ]
      }
    ]
  },
  {
    id: 'model-raycus-1000w',
    brand: 'Raycus',
    modelName: 'RFL-C1000 Continuous Fiber Source',
    description: '1000W High Power Single-Mode Continuous Wave Fiber Laser',
    laserType: 'CW Fiber',
    ratedPowerW: 1000,
    opticalPathVersion: 'v3.0',
    createdDate: '2026-01-20T09:00:00Z',
    modifiedDate: '2026-02-02T14:10:00Z',
    cycles: [
      {
        id: 'cycle-raycus-1000w-1',
        name: 'Cycle 1 - High Power Amplifier Chain',
        displayOrder: 1,
        modules: [
          {
            id: 'mod-seed-1000',
            name: 'Seed Laser Module',
            moduleType: 'Seed',
            opticalPosition: 1,
            expectedInputPower: 50,
            expectedOutputPower: 48,
            reference: {
              isComplete: true,
              status: 'Complete',
              before: {
                joint: 'Before',
                parameters: { intensity: 100, frequency: 0, pulseWidth: 0, averagePower: 50, peakPower: 50, temperature: 25, stability: 99.9, minimum: 49.8, maximum: 50.2, readingTime: 5 }
              },
              upper: {
                joint: 'Upper',
                parameters: { intensity: 99, frequency: 0, pulseWidth: 0, averagePower: 49, peakPower: 49, temperature: 25.5, stability: 99.7, minimum: 48.8, maximum: 49.2, readingTime: 5 }
              },
              after: {
                joint: 'After',
                parameters: { intensity: 98, frequency: 0, pulseWidth: 0, averagePower: 48, peakPower: 48, temperature: 26, stability: 99.5, minimum: 47.8, maximum: 48.2, readingTime: 5 }
              }
            }
          },
          {
            id: 'mod-pa-1000',
            name: 'Power Amplifier (PA Stage)',
            moduleType: 'PA',
            opticalPosition: 2,
            expectedInputPower: 48,
            expectedOutputPower: 1000,
            reference: {
              isComplete: true,
              status: 'Complete',
              before: {
                joint: 'Before',
                parameters: { intensity: 98, frequency: 0, pulseWidth: 0, averagePower: 48, peakPower: 48, temperature: 26, stability: 99.5, minimum: 47.8, maximum: 48.2, readingTime: 5 }
              },
              upper: {
                joint: 'Upper',
                parameters: { intensity: 99.5, frequency: 0, pulseWidth: 0, averagePower: 1020, peakPower: 1020, temperature: 38, stability: 99.2, minimum: 1010, maximum: 1025, readingTime: 5 }
              },
              after: {
                joint: 'After',
                parameters: { intensity: 99.0, frequency: 0, pulseWidth: 0, averagePower: 1000, peakPower: 1000, temperature: 39, stability: 99.0, minimum: 990, maximum: 1005, readingTime: 5 }
              }
            }
          }
        ]
      }
    ]
  },
  {
    id: 'model-jpt-m7-50w',
    brand: 'JPT',
    modelName: 'JPT MOPA M7 50W',
    description: '50W MOPA Fiber Laser with Adjustable Pulse Duration (1-350 ns)',
    laserType: 'MOPA',
    ratedPowerW: 50,
    opticalPathVersion: 'v1.8',
    createdDate: '2026-01-25T11:00:00Z',
    modifiedDate: '2026-02-03T16:00:00Z',
    cycles: [
      {
        id: 'cycle-jpt-50w-1',
        name: 'Cycle 1 - MOPA Signal Circuit',
        displayOrder: 1,
        modules: [
          {
            id: 'mod-jpt-seed',
            name: 'Semiconductor Diode Seed',
            moduleType: 'Seed',
            opticalPosition: 1,
            reference: {
              isComplete: true,
              status: 'Complete',
              before: { joint: 'Before', parameters: { intensity: 100, frequency: 100, pulseWidth: 100, averagePower: 10, peakPower: 500, temperature: 26, stability: 99.5, minimum: 9.8, maximum: 10.2, readingTime: 5 } },
              upper: { joint: 'Upper', parameters: { intensity: 99, frequency: 100, pulseWidth: 100, averagePower: 9.8, peakPower: 490, temperature: 26.5, stability: 99.2, minimum: 9.6, maximum: 10.0, readingTime: 5 } },
              after: { joint: 'After', parameters: { intensity: 98, frequency: 100, pulseWidth: 100, averagePower: 9.5, peakPower: 480, temperature: 27, stability: 99.0, minimum: 9.3, maximum: 9.7, readingTime: 5 } }
            }
          },
          {
            id: 'mod-jpt-pa',
            name: 'Fiber Pre-Amplifier',
            moduleType: 'PA',
            opticalPosition: 2,
            reference: {
              isComplete: true,
              status: 'Complete',
              before: { joint: 'Before', parameters: { intensity: 98, frequency: 100, pulseWidth: 100, averagePower: 9.5, peakPower: 480, temperature: 27, stability: 99.0, minimum: 9.3, maximum: 9.7, readingTime: 5 } },
              upper: { joint: 'Upper', parameters: { intensity: 99.2, frequency: 100, pulseWidth: 100, averagePower: 51.5, peakPower: 2500, temperature: 32, stability: 98.8, minimum: 50.8, maximum: 52.0, readingTime: 5 } },
              after: { joint: 'After', parameters: { intensity: 98.8, frequency: 100, pulseWidth: 100, averagePower: 50.0, peakPower: 2450, temperature: 32.8, stability: 98.5, minimum: 49.5, maximum: 50.5, readingTime: 5 } }
            }
          }
        ]
      }
    ]
  },
  {
    id: 'model-ipg-ylp-100w',
    brand: 'IPG',
    modelName: 'YLP-1-100-20-20-HC 100W',
    description: '100W Industrial Fiber Laser Source with High Peak Power',
    laserType: 'Fiber Laser',
    ratedPowerW: 100,
    opticalPathVersion: 'v4.0',
    createdDate: '2026-02-01T08:00:00Z',
    modifiedDate: '2026-02-04T12:00:00Z',
    cycles: [
      {
        id: 'cycle-ipg-1',
        name: 'Cycle 1 - IPG Resonator',
        displayOrder: 1,
        modules: [
          {
            id: 'mod-ipg-pump',
            name: 'IPG Multi-Emitter Pump',
            moduleType: 'Pump',
            opticalPosition: 1,
            reference: {
              isComplete: true,
              status: 'Complete',
              before: { joint: 'Before', parameters: { intensity: 100, frequency: 20, pulseWidth: 100, averagePower: 102, peakPower: 5000, temperature: 25, stability: 99.8, minimum: 101, maximum: 103, readingTime: 5 } },
              upper: { joint: 'Upper', parameters: { intensity: 99.5, frequency: 20, pulseWidth: 100, averagePower: 101, peakPower: 4950, temperature: 26, stability: 99.6, minimum: 100, maximum: 102, readingTime: 5 } },
              after: { joint: 'After', parameters: { intensity: 99.0, frequency: 20, pulseWidth: 100, averagePower: 100, peakPower: 4900, temperature: 26.5, stability: 99.4, minimum: 99.2, maximum: 100.8, readingTime: 5 } }
            }
          }
        ]
      }
    ]
  },
  {
    id: 'model-max-30w',
    brand: 'MAX',
    modelName: 'Max Photonics MFP-30W',
    description: '30W Compact Fiber Laser Source for Deep Engraving and Cutting',
    laserType: 'Q-Switched',
    ratedPowerW: 30,
    opticalPathVersion: 'v1.0',
    createdDate: '2026-02-02T09:00:00Z',
    modifiedDate: '2026-02-05T09:00:00Z',
    cycles: [
      {
        id: 'cycle-max-1',
        name: 'Cycle 1 - MFP Optical Line',
        displayOrder: 1,
        modules: [
          {
            id: 'mod-max-1',
            name: 'Pump Diode Array',
            moduleType: 'Pump',
            opticalPosition: 1,
            reference: {
              isComplete: true,
              status: 'Complete',
              before: { joint: 'Before', parameters: { intensity: 100, frequency: 30, pulseWidth: 200, averagePower: 30, peakPower: 35, temperature: 27, stability: 99.0, minimum: 29.5, maximum: 30.5, readingTime: 5 } },
              upper: { joint: 'Upper', parameters: { intensity: 98.5, frequency: 30, pulseWidth: 200, averagePower: 29.5, peakPower: 34.5, temperature: 27.5, stability: 98.8, minimum: 29.0, maximum: 30.0, readingTime: 5 } },
              after: { joint: 'After', parameters: { intensity: 97.8, frequency: 30, pulseWidth: 200, averagePower: 29.0, peakPower: 34.0, temperature: 28.0, stability: 98.5, minimum: 28.5, maximum: 29.5, readingTime: 5 } }
            }
          }
        ]
      }
    ]
  }
];
