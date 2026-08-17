/**
 * Industrial Digital Oscilloscope Modal
 * Fiber Source Diagnostic Pro
 *
 * Real-Time ESP32 Optical Sensor Waveform Diagnostic Visualization
 * Uses actual ESP32 sample stream without modifying official measurement data.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  Maximize2, 
  Grid, 
  Target, 
  Zap,
  Wifi,
  Usb,
  AlertTriangle,
  Move
} from 'lucide-react';
import { esp32Service } from '../../services/esp32Service';
import { ESP32Status } from '../../types';

interface OscilloscopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  espStatus?: ESP32Status;
  initialSamples?: number[];
}

export const OscilloscopeModal: React.FC<OscilloscopeModalProps> = ({
  isOpen,
  onClose,
  espStatus,
  initialSamples
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connection State
  const [status, setStatus] = useState<ESP32Status>(
    espStatus || {
      connected: false,
      connectionType: 'Disconnected',
      deviceName: 'ESP32 Optical Sensor',
      firmwareVersion: 'v3.2.0',
      hardwareVersion: 'ESP32-S3',
      serialNumber: '',
      deviceTemperatureC: 0,
      batteryLevelPercent: 0,
      isCapturing: false,
      baudRate: 115200
    }
  );

  // Real Hardware Sample Buffer (100 samples)
  const [samples, setSamples] = useState<number[]>(initialSamples || []);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoRange, setAutoRange] = useState<boolean>(true);

  // Oscilloscope Display Parameters
  const [powerPerDiv, setPowerPerDiv] = useState<number>(5.0); // W/div
  const [timePerDivMs, setTimePerDivMs] = useState<number>(500); // ms/div (500ms * 10 div = 5000ms = 5s)
  const [verticalOffset, setVerticalOffset] = useState<number>(0); // W shift
  const [horizontalOffset, setHorizontalOffset] = useState<number>(0); // sample index shift
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Trigger Controls
  const [triggerEnabled, setTriggerEnabled] = useState<boolean>(true);
  const [triggerLevel, setTriggerLevel] = useState<number>(15.0); // W

  // Cursor Controls
  const [showCursors, setShowCursors] = useState<boolean>(false);
  const [cursorA, setCursorA] = useState<number>(25); // Sample index 0-99
  const [cursorB, setCursorB] = useState<number>(75); // Sample index 0-99

  // Derived Waveform Statistics
  const [stats, setStats] = useState<{
    avg: number;
    min: number;
    max: number;
    vpp: number;
    sampleCount: number;
    readingTime: number;
  }>({
    avg: 0,
    min: 0,
    max: 0,
    vpp: 0,
    sampleCount: 0,
    readingTime: 5.0
  });

  // Available Power Scales
  const powerScales = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];
  const timeScalesMs = [10, 50, 100, 200, 500, 1000, 2000, 5000];

  // Subscribe to real hardware status & sample stream
  useEffect(() => {
    if (!isOpen) return;

    const unsubStatus = esp32Service.subscribeStatus((st) => {
      setStatus(st);
    });

    const unsubSamples = esp32Service.subscribeRawSamples((rawArr) => {
      if (!isPaused && Array.isArray(rawArr) && rawArr.length > 0) {
        setSamples([...rawArr]);
      }
    });

    // Initial check for buffered samples
    const currentBuffer = esp32Service.getLatestRawSamples();
    if (currentBuffer && currentBuffer.length > 0) {
      setSamples([...currentBuffer]);
    }

    return () => {
      unsubStatus();
      unsubSamples();
    };
  }, [isOpen, isPaused]);

  // Calculate statistics whenever sample buffer updates
  useEffect(() => {
    if (samples.length === 0) {
      setStats({ avg: 0, min: 0, max: 0, vpp: 0, sampleCount: 0, readingTime: 5.0 });
      return;
    }

    const sum = samples.reduce((a, b) => a + b, 0);
    const avg = sum / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const vpp = max - min;

    setStats({
      avg,
      min,
      max,
      vpp,
      sampleCount: samples.length,
      readingTime: 5.0
    });

    // Auto set scale if autoRange is active
    if (autoRange && max > 0) {
      const neededSpan = (max - min) || max || 1.0;
      const suitableDiv = powerScales.find(s => (s * 8) >= neededSpan * 1.2) || 10.0;
      setPowerPerDiv(suitableDiv);
      setVerticalOffset(min - suitableDiv * 0.5);
    }
  }, [samples, autoRange]);

  // Handle Auto-Set Button
  const handleAutoSet = useCallback(() => {
    if (samples.length === 0) return;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const span = (max - min) || max || 5.0;

    // Find best scale
    const bestScale = powerScales.find(s => (s * 6) >= span) || 5.0;
    setPowerPerDiv(bestScale);
    setVerticalOffset(Math.max(0, min - bestScale));
    setHorizontalOffset(0);
    setZoomScale(1.0);
    setTriggerLevel((min + max) / 2);
  }, [samples]);

  // Canvas Drawing Loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Dark CRT Oscilloscope Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Reticle Grid Lines (10 cols x 8 rows)
    if (showGrid) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      // Vertical divisions (10 sections)
      const colWidth = width / 10;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * colWidth, 0);
        ctx.lineTo(i * colWidth, height);
        ctx.stroke();

        // Sub-ticks
        if (i < 10) {
          ctx.strokeStyle = '#0f172a';
          for (let t = 1; t < 5; t++) {
            const subX = i * colWidth + (t * colWidth) / 5;
            ctx.beginPath();
            ctx.moveTo(subX, height / 2 - 4);
            ctx.lineTo(subX, height / 2 + 4);
            ctx.stroke();
          }
          ctx.strokeStyle = '#1e293b';
        }
      }

      // Horizontal divisions (8 sections)
      const rowHeight = height / 8;
      for (let j = 0; j <= 8; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * rowHeight);
        ctx.lineTo(width, j * rowHeight);
        ctx.stroke();

        // Sub-ticks on center line
        if (j < 8) {
          ctx.strokeStyle = '#0f172a';
          for (let t = 1; t < 5; t++) {
            const subY = j * rowHeight + (t * rowHeight) / 5;
            ctx.beginPath();
            ctx.moveTo(width / 2 - 4, subY);
            ctx.lineTo(width / 2 + 4, subY);
            ctx.stroke();
          }
          ctx.strokeStyle = '#1e293b';
        }
      }

      // Center Axes (Brighter)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
    }

    const isRealConnected = status.connected && esp32Service.getIsRealHardwareConnected();

    // 3. Hardware Disconnected Banner
    if (!isRealConnected) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(width * 0.1, height * 0.35, width * 0.8, height * 0.3);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(width * 0.1, height * 0.35, width * 0.8, height * 0.3);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔴 ESP32 HARDWARE NOT CONNECTED', width / 2, height / 2 - 10);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Connect USB Serial OTG or Wi-Fi Hardware to View Live Waveform', width / 2, height / 2 + 15);
      return;
    }

    // 4. Draw Trigger Line
    if (triggerEnabled) {
      const triggerY = height - ((triggerLevel - verticalOffset) / (powerPerDiv * 8)) * height;
      if (triggerY >= 0 && triggerY <= height) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, triggerY);
        ctx.lineTo(width, triggerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TRIG: ${triggerLevel.toFixed(2)}W`, 8, triggerY - 4);
      }
    }

    // 5. Draw Phosphor Signal Trace
    if (samples.length > 0) {
      const totalDivsHeight = 8;
      const totalPowerSpan = powerPerDiv * totalDivsHeight;

      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const numSamples = samples.length;
      for (let i = 0; i < numSamples; i++) {
        const val = samples[i];
        const x = (i / (numSamples - 1)) * width * zoomScale + horizontalOffset;
        
        // Convert power value to Y coordinate (0W at bottom by default)
        const normalizedY = (val - verticalOffset) / totalPowerSpan;
        const y = height - normalizedY * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset glow
    } else {
      // Waiting for capture message
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ WAITING FOR ESP32 SAMPLE STREAM...', width / 2, height / 2);
    }

    // 6. Draw Measurement Cursors
    if (showCursors && samples.length > 0) {
      const curAX = (cursorA / 100) * width;
      const curBX = (cursorB / 100) * width;

      const valA = samples[Math.min(99, Math.max(0, cursorA))] || 0;
      const valB = samples[Math.min(99, Math.max(0, cursorB))] || 0;

      // Cursor A Line (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(curAX, 0);
      ctx.lineTo(curAX, height);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText(`A: ${valA.toFixed(2)}W`, curAX + 4, 15);

      // Cursor B Line (Magenta)
      ctx.strokeStyle = '#e879f9';
      ctx.beginPath();
      ctx.moveTo(curBX, 0);
      ctx.lineTo(curBX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#e879f9';
      ctx.fillText(`B: ${valB.toFixed(2)}W`, curBX + 4, 30);
    }

  }, [
    isOpen,
    samples,
    status,
    showGrid,
    powerPerDiv,
    verticalOffset,
    horizontalOffset,
    zoomScale,
    triggerEnabled,
    triggerLevel,
    showCursors,
    cursorA,
    cursorB
  ]);

  if (!isOpen) return null;

  const isRealConnected = status.connected && esp32Service.getIsRealHardwareConnected();

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-cyan-800/80 rounded-2xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        
        {/* HEADER BAR */}
        <div className="bg-slate-900/90 border-b border-cyan-900/60 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cyan-950 border border-cyan-700/60 rounded-lg text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-cyan-300 tracking-wider uppercase flex items-center gap-2">
                <span>MAYUR FIBER DIAGNOSIS</span>
                <span className="text-[10px] bg-cyan-900/50 border border-cyan-700/50 text-cyan-200 px-2 py-0.5 rounded-full font-sans">
                  Industrial Digital Oscilloscope
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Real-Time Optical Sensor Waveform Diagnostics (100 Samples / 5.0s Window)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isRealConnected 
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300' 
                : 'bg-red-950/80 border-red-800/80 text-red-300'
            }`}>
              {isRealConnected ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span>ESP32 READY ({status.connectionType})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>ESP32 NOT CONNECTED</span>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Close Oscilloscope"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DIGITAL METERING TOP READOUT BAR */}
        <div className="bg-[#080d1a] border-b border-slate-800 px-4 py-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 shrink-0 text-center text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">AVG POWER</span>
            <span className="text-amber-300 font-bold text-sm">{stats.avg.toFixed(2)} W</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">MIN POWER</span>
            <span className="text-cyan-300 font-bold text-sm">{stats.min.toFixed(2)} W</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">MAX POWER</span>
            <span className="text-emerald-300 font-bold text-sm">{stats.max.toFixed(2)} W</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">PEAK-TO-PEAK (Ppp)</span>
            <span className="text-purple-300 font-bold text-sm">{stats.vpp.toFixed(2)} W</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">SAMPLE COUNT</span>
            <span className="text-sky-300 font-bold text-sm">{stats.sampleCount} pts</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">TIMEBASE</span>
            <span className="text-cyan-300 font-bold text-sm">{timePerDivMs} ms/div</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-sans">POWER SCALE</span>
            <span className="text-amber-300 font-bold text-sm">{powerPerDiv} W/div</span>
          </div>
        </div>

        {/* MAIN DISPLAY AREA */}
        <div className="flex-1 min-h-0 relative bg-slate-950 flex items-center justify-center p-2">
          <canvas
            ref={canvasRef}
            width={960}
            height={480}
            className="w-full h-full object-contain rounded-lg border border-cyan-900/50 shadow-inner"
          />

          {/* Floating Scale Badge */}
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700/80 text-[11px] text-cyan-300 px-3 py-1.5 rounded-md space-y-0.5 shadow-lg">
            <div>V/DIV: <span className="font-bold text-white">{powerPerDiv} W/div</span></div>
            <div>TIME/DIV: <span className="font-bold text-white">{timePerDivMs} ms/div</span></div>
            <div>OFFSET Y: <span className="font-bold text-amber-300">{verticalOffset.toFixed(1)} W</span></div>
          </div>
        </div>

        {/* CONTROLS PANEL */}
        <div className="bg-[#0b1329] border-t border-slate-800 p-3 space-y-3 shrink-0">
          
          {/* Row 1: Primary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoSet}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Auto Set</span>
              </button>

              <button
                onClick={() => setAutoRange(!autoRange)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  autoRange 
                    ? 'bg-cyan-900/80 border-cyan-600 text-cyan-200' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Auto Range: {autoRange ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isPaused 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume Stream' : 'Freeze / Pause'}</span>
              </button>

              <button
                onClick={() => setSamples([])}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  showGrid ? 'bg-slate-800 border-cyan-700 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                onClick={() => setShowCursors(!showCursors)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  showCursors ? 'bg-purple-950 border-purple-700 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Cursors</span>
              </button>

              <button
                onClick={() => {
                  setVerticalOffset(0);
                  setHorizontalOffset(0);
                  setZoomScale(1.0);
                  setPowerPerDiv(5.0);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Reset View
              </button>
            </div>

          </div>

          {/* Row 2: Sliders & Adjusters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
            
            {/* Vertical Power/Div Adjuster */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 w-24 shrink-0 font-sans">Power/Div Scale:</span>
              <select
                value={powerPerDiv}
                onChange={(e) => {
                  setAutoRange(false);
                  setPowerPerDiv(Number(e.target.value));
                }}
                className="bg-slate-900 border border-slate-700 text-amber-300 rounded px-2 py-1 text-xs outline-none focus:border-amber-400"
              >
                {powerScales.map((s) => (
                  <option key={`p-scale-${s}`} value={s}>{s} W/div</option>
                ))}
              </select>
              
              {/* Vertical Offset Slider */}
              <div className="flex-1 flex items-center gap-1.5 ml-2">
                <span className="text-[10px] text-slate-500">Y-Offset:</span>
                <input
                  type="range"
                  min={-20}
                  max={100}
                  step={0.5}
                  value={verticalOffset}
                  onChange={(e) => {
                    setAutoRange(false);
                    setVerticalOffset(Number(e.target.value));
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Timebase / Horiz Position */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 w-24 shrink-0 font-sans">Timebase Scale:</span>
              <select
                value={timePerDivMs}
                onChange={(e) => setTimePerDivMs(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-cyan-300 rounded px-2 py-1 text-xs outline-none focus:border-cyan-400"
              >
                {timeScalesMs.map((t) => (
                  <option key={`t-scale-${t}`} value={t}>{t} ms/div</option>
                ))}
              </select>

              {/* Horiz Position Slider */}
              <div className="flex-1 flex items-center gap-1.5 ml-2">
                <span className="text-[10px] text-slate-500">X-Pos:</span>
                <input
                  type="range"
                  min={-300}
                  max={300}
                  step={10}
                  value={horizontalOffset}
                  onChange={(e) => setHorizontalOffset(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Trigger Level Control */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 w-20 shrink-0 font-sans">Trigger Level:</span>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={triggerLevel}
                onChange={(e) => setTriggerLevel(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="text-amber-300 font-bold w-12 text-right">{triggerLevel.toFixed(1)}W</span>
            </div>

          </div>

          {/* Cursor Readout Panel if Enabled */}
          {showCursors && (
            <div className="bg-purple-950/40 border border-purple-800/60 p-2 rounded-lg flex items-center justify-between text-xs text-purple-200">
              <div className="flex items-center gap-4">
                <span>Cursor A (T1): <strong className="text-sky-300">Sample #{cursorA}</strong> ({(cursorA * 0.05).toFixed(2)}s)</span>
                <span>Cursor B (T2): <strong className="text-pink-300">Sample #{cursorB}</strong> ({(cursorB * 0.05).toFixed(2)}s)</span>
              </div>
              <div className="flex items-center gap-4 font-bold">
                <span>ΔTime: {Math.abs(cursorB - cursorA) * 0.05} s</span>
                <span>ΔPower: {Math.abs((samples[cursorB] || 0) - (samples[cursorA] || 0)).toFixed(2)} W</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
