/**
 * Industrial PDF Report Generator Service
 * Creates multi-page, print-ready A4 Diagnostic Reports
 */

import { jsPDF } from 'jspdf';
import { DiagnosisReport } from '../types';

export function generatePdfReport(report: DiagnosisReport): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const darkBg = '#0F172A';
  const cardBg = '#1F2937';
  const orange = '#F97316';
  const green = '#22C55E';
  const red = '#EF4444';
  const yellow = '#EAB308';
  const white = '#FFFFFF';
  const lightGray = '#E5E7EB';
  const darkText = '#1E293B';

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Title
  doc.setTextColor(249, 115, 22); // Orange #F97316
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FIBER SOURCE DIAGNOSTIC PRO', 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INDUSTRIAL FIBER LASER SOURCE DIAGNOSTIC REPORT', 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Report ID: ${report.id}  |  Date: ${new Date(report.timestamp).toLocaleString()}`, 14, 25);

  // Status Badge in Top Right
  let statusColor = green;
  if (report.overallStatus === 'WARNING') statusColor = yellow;
  if (report.overallStatus === 'FAIL') statusColor = red;

  doc.setFillColor(statusColor);
  doc.rect(pageWidth - 45, 8, 32, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(report.overallStatus, pageWidth - 38, 16);

  let y = 38;

  // --- MACHINE & SERVICE INFO GRID ---
  doc.setFillColor(243, 244, 246); // Light gray box
  doc.rect(14, y, pageWidth - 28, 30, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(14, y, pageWidth - 28, 30, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkText);

  // Column 1
  doc.text('MACHINE & SOURCE INFO', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${report.customerName || 'Factory Client'}`, 18, y + 12);
  doc.text(`Machine Name: ${report.machineName || 'Laser Workstation'}`, 18, y + 17);
  doc.text(`Machine ID: ${report.machineId || 'MAC-8891'}`, 18, y + 22);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('SOURCE METADATA', 105, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Brand / Model: ${report.brand} ${report.modelName}`, 105, y + 12);
  doc.text(`Serial Number: ${report.serialNumber || 'SN-99812-F'}`, 105, y + 17);
  doc.text(`Engineer: ${report.engineerName}`, 105, y + 22);

  y += 36;

  // --- DIAGNOSTIC SUMMARY BOX ---
  doc.setFillColor(31, 41, 55); // Dark card #1F2937
  doc.rect(14, y, pageWidth - 28, 28, 'F');

  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const engineTitle = report.engineType === 'GOOGLE_AI' 
    ? 'GOOGLE AI FAULT DIAGNOSIS SUMMARY (GEMINI MODEL)' 
    : 'RULE-BASED EXPERT FAULT DIAGNOSIS SUMMARY';
  doc.text(engineTitle, 18, y + 7);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Primary Fault Location: ${report.primaryFaultLocation}`, 18, y + 14);
  doc.text(`Health Score: ${report.healthScore}/100 (${report.healthGrade})`, 18, y + 19);
  doc.text(`Testing Scope: ${report.cycleName} -> ${report.moduleName} [Joint: ${report.joint}]`, 18, y + 24);

  y += 34;

  // --- COMPARISON DATA TABLE ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MEASUREMENT COMPARISON MATRIX (GOLDEN REF vs LIVE READING)', 14, y);

  y += 4;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  doc.text('PARAMETER', 17, y + 5);
  doc.text('GOLDEN REF', 65, y + 5);
  doc.text('LIVE CAPTURE', 100, y + 5);
  doc.text('DIFF / DELTA', 135, y + 5);
  doc.text('STATUS', 172, y + 5);

  y += 7;

  report.comparisons.forEach((comp, idx) => {
    // Zebra row background
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
    } else {
      doc.setFillColor(243, 244, 246);
    }
    doc.rect(14, y, pageWidth - 28, 6.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);

    doc.text(comp.label, 17, y + 4.5);
    doc.text(`${comp.referenceValue} ${comp.unit}`, 65, y + 4.5);
    doc.text(`${comp.liveValue} ${comp.unit}`, 100, y + 4.5);

    const diffStr = `${comp.difference > 0 ? '+' : ''}${comp.difference} ${comp.unit} (${comp.differencePercent}%)`;
    doc.text(diffStr, 135, y + 4.5);

    // Status label color
    if (comp.status === 'PASS') doc.setTextColor(34, 197, 94);
    else if (comp.status === 'WARNING') doc.setTextColor(202, 138, 4);
    else doc.setTextColor(239, 68, 68);

    doc.setFont('helvetica', 'bold');
    doc.text(comp.status, 172, y + 4.5);

    y += 6.5;
  });

  y += 6;

  // --- TRIGGERED RULES & PROBABLE CAUSES ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TRIGGERED INDUSTRIAL RULES & PROBABLE CAUSES', 14, y);

  y += 5;

  report.triggeredRules.forEach((rule) => {
    doc.setFillColor(254, 243, 199); // light warning yellow box
    if (rule.severity === 'Critical') doc.setFillColor(254, 226, 226); // light red box
    if (rule.severity === 'Information') doc.setFillColor(240, 253, 244); // light green box

    doc.rect(14, y, pageWidth - 28, 22, 'F');
    doc.setDrawColor(217, 119, 6);
    if (rule.severity === 'Critical') doc.setDrawColor(220, 38, 38);
    doc.rect(14, y, pageWidth - 28, 22, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`[${rule.id}] ${rule.name} (Confidence: ${rule.confidence}%, Priority: ${rule.priority})`, 18, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Diagnosis: ${rule.diagnosisText}`, 18, y + 10, { maxWidth: pageWidth - 36 });
    doc.text(`Probable Cause: ${rule.probableCauses.join(' | ')}`, 18, y + 17, { maxWidth: pageWidth - 36 });

    y += 25;
  });

  // --- STEP-BY-STEP REPAIR ACTIONS ---
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RECOMMENDED STEP-BY-STEP REPAIR PROCEDURE', 14, y);

  y += 5;

  report.repairSteps.forEach((step, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${idx + 1}. ${step}`, 18, y, { maxWidth: pageWidth - 36 });
    y += 5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text(`Next Suggested Test: ${report.nextTestRecommendation}`, 14, y);

  y += 12;

  // --- SIGNATURE BLOCK ---
  if (y > pageHeight - 40) {
    doc.addPage();
    y = pageHeight - 40;
  }

  doc.setDrawColor(209, 213, 219);
  doc.line(14, y, pageWidth - 14, y);

  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('SERVICE ENGINEER SIGNATURE', 18, y);
  doc.text('CUSTOMER ACCEPTANCE SIGNATURE', 110, y);

  doc.line(18, y + 14, 80, y + 14);
  doc.line(110, y + 14, 180, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Name: ${report.engineerName}`, 18, y + 18);
  doc.text(`Name: ${report.customerName || 'Factory Representative'}`, 110, y + 18);

  // Footer on bottom
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Fiber Source Diagnostic Pro - Industrial Machine Diagnostic Platform - Page 1', 14, pageHeight - 8);

  return doc;
}

export function downloadPdfReport(report: DiagnosisReport): void {
  const doc = generatePdfReport(report);
  const fileName = `FSDP_Report_${report.id}_${report.brand}_${report.modelName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
