/**
 * Live Oscilloscope / Live Intensity Waveform Monitor
 * Fiber Source Diagnostic Pro
 *
 * Real-time time-series optical intensity waveform stream from ESP32.
 * Completely independent of official 8-parameter Capture measurements.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  Play, 
  Square, 
  RotateCcw, 
  Maximize2, 
  Sliders, 
  Zap, 
  Wifi, 
  Usb, 
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { esp32Service } from '../../services/esp32Service';
import { ESP32Status } from '../../types';

interface LiveOscilloscopeProps {
  espStatus?: ESP32Status;
  autoStartOnConnect?: boolean;
}

export const LiveOscilloscope: React.FC<LiveOscilloscopeProps> = ({
  espStatus: propEspStatus,
  autoStartOnConnect: defaultAutoStart = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Hardware Connection & Transport Status
  const [espStatus, setEspStatus] = useState<ESP32Status>(
    propEspStatus || esp32Service.getStatus()
  );

  // Live Stream State
  const [isLive, setIsLive] = useState<boolean>(false);
  const [streamStatusText, setStreamStatusText] = useState<string>('STOPPED');
  const [autoStartOnConnect, setAutoStartOnConnect] = useState<boolean>(defaultAutoStart);

  // Rolling Data Buffer (500 samples maximum)
  const MAX_BUFFER_SIZE = 500;
  const sampleBufferRef = useRef<number[]>([]);
  const [bufferLength, setBufferLength] = useState<number>(0);

  // Metering Readouts
  const [metering, setMetering] = useState<{
    current: number;
    min: number;
    max: number;
    peakToPeak: number;
  }>({
    current: 0,
    min: 0,
    max: 0,
    peakToPeak: 0
  });

  // Display Settings
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const [manualScaleMax, setManualScaleMax] = useState<number>(5.0);

  // Subscribe to ESP32 status updates
  useEffect(() => {
    const unsubStatus = esp32Service.subscribeStatus((st) => {
      setEspStatus(st);
      
      // Check if auto start on connect is enabled and transport became connected
      if (st.connected && autoStartOnConnect && !isLive && streamStatusText !== 'LIVE') {
        esp32Service.startLiveStream().catch(() => {});
      }
    });

    const unsubLiveState = esp32Service.subscribeLiveState((state) => {
      setIsLive(state.isLive);
      setStreamStatusText(state.statusText);
    });

    return () => {
      unsubStatus();
      unsubLiveState();
    };
  }, [autoStartOnConnect, isLive, streamStatusText]);

  // Subscribe to incoming LIVE_DATA packets
  useEffect(() => {
    const unsubData = esp32Service.subscribeLiveData((newSamples: number[]) => {
      if (!Array.isArray(newSamples) || newSamples.length === 0) return;

      // Append new time-series samples to rolling buffer
      const buffer = sampleBufferRef.current;
      for (const val of newSamples) {
        if (typeof val === 'number' && !isNaN(val)) {
          buffer.push(val);
          if (buffer.length > MAX_BUFFER_SIZE) {
            buffer.shift(); // Remove oldest sample
          }
        }
      }

      setBufferLength(buffer.length);

      // Update real-time metering readouts
      if (buffer.length > 0) {
        const latest = buffer[buffer.length - 1];
        const currentMin = Math.min(...buffer);
        const currentMax = Math.max(...buffer);
        setMetering({
          current: Number(latest.toFixed(2)),
          min: Number(currentMin.toFixed(2)),
          max: Number(currentMax.toFixed(2)),
          peakToPeak: Number((currentMax - currentMin).toFixed(2))
        });
      }
    });

    return () => {
      unsubData();
    };
  }, []);

  // Handle START LIVE button click
  const handleStartLive = async () => {
    try {
      await esp32Service.startLiveStream();
    } catch (e) {
      console.error('Failed to start live stream:', e);
    }
  };

  // Handle STOP LIVE button click
  const handleStopLive = async () => {
    try {
      await esp32Service.stopLiveStream();
    } catch (e) {
      console.error('Failed to stop live stream:', e);
    }
  };

  // Clear waveform buffer
  const handleClearBuffer = () => {
    sampleBufferRef.current = [];
    setBufferLength(0);
    setMetering({ current: 0, min: 0, max: 0, peakToPeak: 0 });
  };

  // Canvas Oscilloscope Animation Loop
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear Dark Background
    ctx.fillStyle = '#030712'; // Slate 950
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Reticle Gridlines (10 columns x 6 rows)
    ctx.strokeStyle = '#1e293b'; // Slate 800
    ctx.lineWidth = 1;

    const cols = 10;
    const rows = 6;
    const colWidth = width / cols;
    const rowHeight = height / rows;

    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * colWidth, 0);
      ctx.lineTo(c * colWidth, height);
      ctx.stroke();
    }

    for (let r = 1; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * rowHeight);
      ctx.lineTo(width, r * rowHeight);
      ctx.stroke();
    }

    // Center Axes Line (Brighter)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const buffer = sampleBufferRef.current;

    // Determine Y scale bounds
    let minY = 0;
    let maxY = manualScaleMax;

    if (autoScale && buffer.length > 0) {
      const calcMin = Math.min(...buffer);
      const calcMax = Math.max(...buffer);
      const span = (calcMax - calcMin) || 1.0;
      minY = Math.max(0, calcMin - span * 0.15);
      maxY = calcMax + span * 0.2;
      if (maxY <= minY) maxY = minY + 1.0;
    }

    const yRange = maxY - minY || 1.0;

    // 3. Draw Intensity Waveform Curve
    if (buffer.length > 1) {
      ctx.shadowColor = '#22d3ee'; // Cyan glow
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const numPts = buffer.length;
      for (let i = 0; i < numPts; i++) {
        const val = buffer[i];
        // X coord maps linearly from left (0) to right (width)
        const x = (i / (MAX_BUFFER_SIZE - 1)) * width;
        // Y coord: 0 at bottom, maxY at top
        const normY = (val - minY) / yRange;
        const y = height - normY * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset glow

      // Draw current live leading dot at the latest point
      const lastVal = buffer[buffer.length - 1];
      const lastX = ((buffer.length - 1) / (MAX_BUFFER_SIZE - 1)) * width;
      const lastNormY = (lastVal - minY) / yRange;
      const lastY = height - lastNormY * height;

      ctx.fillStyle = '#fbbf24'; // Amber pulse marker
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Empty buffer state
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      if (isLive) {
        ctx.fillText('⚡ WAITING FOR LIVE_DATA PACKETS...', width / 2, height / 2);
      } else {
        ctx.fillText('PRESS [ START LIVE ] TO BEGIN MONITORING WAVEFORM', width / 2, height / 2);
      }
    }

    // 4. Draw Y-Axis Scale Reference overlay text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Y-MAX: ${maxY.toFixed(2)} W`, 8, 14);
    ctx.fillText(`Y-MIN: ${minY.toFixed(2)} W`, 8, height - 6);

  }, [autoScale, manualScaleMax, isLive]);

  // Animation frame handler
  useEffect(() => {
    const loop = () => {
      drawCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [drawCanvas]);

  const activeTransport = espStatus.activeTransport || 'NONE';
  const isTransportConnected = espStatus.connected;

  return (
    <div className="bg-slate-950 border border-cyan-900/60 rounded-2xl shadow-xl overflow-hidden text-white font-sans">
      
      {/* HEADER & STATUS BAR */}
      <div className="bg-slate-900/90 border-b border-cyan-900/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400 shrink-0">
            <Activity className={`w-4 h-4 ${isLive ? 'animate-pulse text-emerald-400' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-cyan-300">
                LIVE OSCILLOSCOPE / INTENSITY WAVEFORM MONITOR
              </h3>
              
              {/* LIVE STATUS BADGE */}
              {streamStatusText === 'CONNECTION_LOST' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950 border border-red-700 text-red-300 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  LIVE CONNECTION LOST
                </span>
              ) : isLive ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 border border-emerald-500/80 text-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ● LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  ○ STOPPED
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-400">
              Continuous ESP32 optical sensor sample stream • Independent of Capture Workflow
            </p>
          </div>
        </div>

        {/* ACTIVE TRANSPORT BADGE & CONTROLS */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10.5px] font-mono font-bold flex items-center gap-1.5 text-slate-300">
            {activeTransport === 'USB' ? (
              <span className="text-emerald-400 flex items-center gap-1"><Usb className="w-3 h-3" /> USB</span>
            ) : activeTransport === 'WIFI' ? (
              <span className="text-cyan-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> Wi-Fi</span>
            ) : (
              <span className="text-slate-500">NO HARDWARE LINK</span>
            )}
            <span className="text-slate-600">|</span>
            <span className={isTransportConnected ? 'text-emerald-300' : 'text-slate-500'}>
              {isTransportConnected ? 'VERIFIED' : 'DISCONNECTED'}
            </span>
          </div>

          {/* START / STOP BUTTONS */}
          {isLive ? (
            <button
              onClick={handleStopLive}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </button>
          ) : (
            <button
              onClick={handleStartLive}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START LIVE</span>
            </button>
          )}
        </div>
      </div>

      {/* REAL-TIME METERING READOUT BAR */}
      <div className="bg-[#080d1a] border-b border-slate-900 px-4 py-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
        
        {/* CURRENT INTENSITY */}
        <div className="bg-slate-900/90 border border-cyan-800/60 p-2 rounded-xl flex flex-col items-center justify-center">
          <span className="text-[9.5px] text-cyan-400 uppercase font-sans font-extrabold tracking-wider">
            Current Intensity
          </span>
          <span className="text-amber-300 font-extrabold text-lg leading-tight">
            {metering.current.toFixed(2)} <span className="text-xs text-amber-400">W</span>
          </span>
        </div>

        {/* MINIMUM */}
        <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center">
          <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold">
            Minimum
          </span>
          <span className="text-cyan-300 font-bold text-sm">
            {metering.min.toFixed(2)} W
          </span>
        </div>

        {/* MAXIMUM */}
        <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center">
          <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold">
            Maximum
          </span>
          <span className="text-emerald-300 font-bold text-sm">
            {metering.max.toFixed(2)} W
          </span>
        </div>

        {/* PEAK-TO-PEAK DELTA */}
        <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center">
          <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold">
            Peak-to-Peak (Δ)
          </span>
          <span className="text-purple-300 font-bold text-sm">
            {metering.peakToPeak.toFixed(2)} W
          </span>
        </div>

        {/* SAMPLES IN BUFFER */}
        <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl flex flex-col items-center justify-center col-span-2 sm:col-span-1">
          <span className="text-[9.5px] text-slate-400 uppercase font-sans font-bold">
            Buffer Points
          </span>
          <span className="text-sky-300 font-bold text-sm">
            {bufferLength} / {MAX_BUFFER_SIZE}
          </span>
        </div>

      </div>

      {/* WAVEFORM CANVAS AREA */}
      <div className="p-3 bg-slate-950 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={220}
          className="w-full h-52 object-fill rounded-xl border border-cyan-900/50 shadow-inner"
        />

        {/* CONTROLS OVERLAY FOOTER */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScale(!autoScale)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all flex items-center gap-1 cursor-pointer ${
                autoScale
                  ? 'bg-cyan-950 border-cyan-600 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>AUTO SCALE: {autoScale ? 'ON' : 'OFF'}</span>
            </button>

            {!autoScale && (
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <span>Max Y:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={manualScaleMax}
                  onChange={(e) => setManualScaleMax(Math.max(0.5, Number(e.target.value)))}
                  className="bg-slate-900 border border-slate-700 text-amber-300 rounded px-1.5 py-0.5 w-16 outline-none text-center"
                />
              </div>
            )}

            <button
              onClick={handleClearBuffer}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-400 text-[11px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoStartOnConnect}
                onChange={(e) => setAutoStartOnConnect(e.target.checked)}
                className="accent-cyan-500 rounded cursor-pointer"
              />
              <span>Auto-Start Live on Connect</span>
            </label>
          </div>

        </div>
      </div>

    </div>
  );
};
