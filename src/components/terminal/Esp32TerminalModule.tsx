/**
 * ESP32 Serial Protocol Terminal & Defect Injection Simulator (Part 4B, 8A, 8B)
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Send, 
  Trash2, 
  Cpu, 
  RefreshCw, 
  Play, 
  Square, 
  Sliders, 
  Zap, 
  AlertTriangle 
} from 'lucide-react';
import { ESP32Status, ESP32Packet } from '../../types';
import { esp32Service, SimulatedFaultType } from '../../services/esp32Service';
import { localDB } from '../../services/db';

export const Esp32TerminalModule: React.FC = () => {
  const [status, setStatus] = useState<ESP32Status>(esp32Service.getStatus());
  const [logs, setLogs] = useState<string[]>([]);
  const [inputCmd, setInputCmd] = useState<string>('');
  const [activeFault, setActiveFault] = useState<SimulatedFaultType>(esp32Service.getActiveFault());

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubStatus = esp32Service.subscribeStatus(setStatus);

    const appendLog = (msg: string) => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    appendLog('ESP32 Communication Monitor initialized.');
    appendLog(`Device: ${status.deviceName} (${status.hardwareVersion}) on ${status.portName}`);

    const unsubPacket = esp32Service.subscribePacket((pkt: ESP32Packet) => {
      appendLog(`RX <- [CMD:${pkt.commandId}] ${JSON.stringify(pkt.payload)}`);
    });

    return () => {
      unsubStatus();
      unsubPacket();
    };
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSendCommand = async () => {
    if (!inputCmd.trim()) return;
    const cmd = inputCmd.trim().toUpperCase();
    setInputCmd('');

    setLogs((prev) => [...prev, `TX -> ${cmd}`]);

    if (cmd === 'PING') {
      const res = await esp32Service.sendPing();
      setLogs((prev) => [...prev, `RX <- ${res}`]);
    } else if (cmd === 'WHO_ARE_YOU' || cmd === 'GET_DEVICE_INFO') {
      const info = await esp32Service.getDeviceInfo();
      setLogs((prev) => [...prev, `RX <- ${JSON.stringify(info)}`]);
    } else if (cmd === 'START_CAPTURE') {
      await esp32Service.captureReading();
    } else if (cmd === 'REBOOT') {
      setLogs((prev) => [...prev, 'TX -> Sending Reboot Signal...']);
      await esp32Service.rebootDevice();
    } else {
      setLogs((prev) => [...prev, `RX <- ACK Command [${cmd}] Received`]);
    }
  };

  const handleFaultSelect = (fault: SimulatedFaultType) => {
    setActiveFault(fault);
    esp32Service.setFaultSimulation(fault);
    setLogs((prev) => [...prev, `SYSTEM: Fault simulation mode changed to: ${fault}`]);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header Toolbar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
            <Terminal className="w-5 h-5 text-orange-400" />
            ESP32 SERIAL COMMAND MONITOR & DEFECT SIMULATOR
          </h2>
          <p className="text-xs text-gray-400">
            Real-time half-duplex binary packet monitor for ESP32 OTG / Serial link
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded text-xs flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Clear Terminal</span>
          </button>
        </div>
      </div>

      {/* Grid: Terminal Monitor & Fault Injector Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Defect Injector Sidebar */}
        <div className="lg:col-span-4 bg-[#1F2937] border border-gray-700 rounded-xl p-4 space-y-4 shadow-xl text-xs">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-700 pb-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            TEST DEFECT INJECTION SUITE
          </h3>

          <div className="space-y-2 font-mono">
            {[
              { id: 'None', label: 'Golden Nominal (No Fault)', desc: '100% healthy optical performance' },
              { id: 'PumpDegradation', label: 'Pump Diode Aging (-28% P_avg)', desc: 'Triggers RULE-0001 (Pump Output Low)' },
              { id: 'FiberBreak', label: 'Fiber Break / Fracture (100% Loss)', desc: 'Triggers RULE-0003 (Output Lost After Joint)' },
              { id: 'ConnectorLoss', label: 'Connector Contamination (-15%)', desc: 'Triggers RULE-0005 (Connector Loss)' },
              { id: 'ThermalOverheat', label: 'Thermal Overheat (46°C)', desc: 'Triggers RULE-0009 (Temperature Too High)' },
              { id: 'UnstableLaser', label: 'Laser Mode Fluctuation (72% Stab)', desc: 'Triggers RULE-0008 (Signal Unstable)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleFaultSelect(item.id as SimulatedFaultType)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  activeFault === item.id
                    ? 'bg-orange-600/90 text-white border-orange-400 font-bold'
                    : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{item.label}</span>
                  {activeFault === item.id && <span className="text-[10px] bg-white text-orange-600 px-1 rounded font-black">ACTIVE</span>}
                </div>
                <div className="text-[10px] text-gray-400 font-normal mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Console Output Screen */}
        <div className="lg:col-span-8 bg-[#090D16] border border-gray-800 rounded-xl p-4 flex flex-col justify-between h-[520px] shadow-2xl font-mono text-xs">
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`${
                  log.includes('TX ->')
                    ? 'text-orange-400 font-bold'
                    : log.includes('RX <-')
                    ? 'text-emerald-400 font-bold'
                    : 'text-gray-400'
                }`}
              >
                {log}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Command Input Bar */}
          <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              placeholder="Enter protocol command (PING, GET_DEVICE_INFO, START_CAPTURE, REBOOT)..."
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded p-2.5 outline-none focus:border-orange-500 font-mono text-xs"
            />
            <button
              onClick={handleSendCommand}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
