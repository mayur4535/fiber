/**
 * History & Service Record Reports Module (Part 6A & 6B)
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Filter, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  X,
  Stethoscope
} from 'lucide-react';
import { DiagnosisReport } from '../../types';
import { localDB } from '../../services/db';
import { downloadPdfReport } from '../../services/pdfReportService';
import { ConfirmModal } from '../common/ModalDialogs';

interface HistoryReportsModuleProps {
  reports: DiagnosisReport[];
  onReportsChange: (updated: DiagnosisReport[]) => void;
  onSelectReportForDiagnosis: (report: DiagnosisReport) => void;
}

export const HistoryReportsModule: React.FC<HistoryReportsModuleProps> = ({
  reports,
  onReportsChange,
  onSelectReportForDiagnosis
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReportModal, setSelectedReportModal] = useState<DiagnosisReport | null>(null);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.machineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.primaryFaultLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.overallStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Service Report',
      message: `Permanently delete report ${id}?`,
      onConfirm: () => {
        localDB.deleteReport(id);
        const updated = localDB.getReports();
        onReportsChange(updated);
        if (selectedReportModal?.id === id) setSelectedReportModal(null);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner Toolbar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            TEST HISTORY & INDUSTRIAL SERVICE REPORTS
          </h2>
          <p className="text-xs text-gray-400">
            Search, preview, and download multi-page PDF diagnostic records ({reports.length} total saved)
          </p>
        </div>

        {/* Export All DB Backup */}
        <button
          onClick={() => {
            const jsonStr = localDB.exportFullDatabaseJSON();
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FSDP_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
          }}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Full DB JSON</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Report ID, Customer, Model, Serial, Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-3 py-2 rounded-lg outline-none focus:border-orange-500 font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 font-bold uppercase">Filter Status:</span>
          {['ALL', 'PASS', 'WARNING', 'FAIL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded font-mono font-bold text-xs transition-colors ${
                statusFilter === st
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table List */}
      <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-4 shadow-xl">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs border border-dashed border-gray-700 rounded-xl space-y-2">
            <FileText className="w-8 h-8 text-gray-600 mx-auto" />
            <p>No matching diagnostic test reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-gray-900 text-gray-400 border-b border-gray-700">
                  <th className="p-3">REPORT ID</th>
                  <th className="p-3">DATE / TIME</th>
                  <th className="p-3">SOURCE MODEL</th>
                  <th className="p-3">FAULT LOCATION</th>
                  <th className="p-3">HEALTH SCORE</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReportForDiagnosis(report)}
                    className="hover:bg-gray-800/80 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold text-orange-400">{report.id}</td>
                    <td className="p-3 text-gray-300">
                      {new Date(report.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-white font-bold">
                      [{report.brand}] {report.modelName}
                    </td>
                    <td className="p-3 text-gray-300 font-medium">
                      {report.primaryFaultLocation}
                    </td>
                    <td className="p-3 font-bold text-white">
                      {report.healthScore}/100 ({report.healthGrade})
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          report.overallStatus === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : report.overallStatus === 'WARNING'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {report.overallStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReportForDiagnosis(report);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold border border-purple-400 rounded text-xs inline-flex items-center gap-1.5 shadow"
                        title="View Full Diagnosis (1. Rule-Based & 2. Google AI)"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Open Diagnosis</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteReport(report.id, e)}
                        className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 rounded"
                        title="Delete Report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Report Quick View Dialog */}
      {selectedReportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1F2937] border border-gray-700 rounded-xl p-6 max-w-3xl w-full my-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <div>
                <span className="text-xs font-mono bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold">
                  {selectedReportModal.id}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  [{selectedReportModal.brand}] {selectedReportModal.modelName} Diagnostic Report
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-gray-900 p-3 rounded border border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-500 block">Customer:</span>
                  <span className="text-white font-bold">{selectedReportModal.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Machine ID:</span>
                  <span className="text-white font-bold">{selectedReportModal.machineId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Engineer:</span>
                  <span className="text-white font-bold">{selectedReportModal.engineerName}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-900 rounded border border-gray-800">
                <span className="text-gray-400 font-bold block mb-1">Fault Location:</span>
                <span className="text-orange-400 font-bold text-sm">{selectedReportModal.primaryFaultLocation}</span>
              </div>

              <div className="p-3 bg-gray-900 rounded border border-gray-800">
                <span className="text-gray-400 font-bold block mb-1">Executed Diagnostic Rules:</span>
                <div className="space-y-1 mt-1">
                  {selectedReportModal.triggeredRules.map((rule) => (
                    <div key={rule.id} className="text-gray-200">
                      • [{rule.id}] {rule.name} (Conf: {rule.confidence}%) - {rule.diagnosisText}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-700 text-xs">
              <button
                onClick={() => {
                  onSelectReportForDiagnosis(selectedReportModal);
                  setSelectedReportModal(null);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Open Full Diagnosis Screen</span>
              </button>

              <button
                onClick={() => downloadPdfReport(selectedReportModal)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Report</span>
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
    </div>
  );
};
