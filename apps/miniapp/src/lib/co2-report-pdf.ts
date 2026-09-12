import { jsPDF } from 'jspdf';
import type { MonthlyTrendPoint } from './monthly-trend';
import { formatLiters } from './formatters';

export interface Co2ReportInput {
  merchantName: string;
  generatedAt: Date;
  monthly: MonthlyTrendPoint[];
}

export function generateCo2ReportPdf({ merchantName, generatedAt, monthly }: Co2ReportInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 64;

  doc.setFontSize(18);
  doc.text('Báo cáo phát thải CO2e (ước tính)', marginX, y);
  y += 24;

  doc.setFontSize(11);
  doc.text(`Quán: ${merchantName}`, marginX, y);
  y += 16;
  doc.text(`Ngày xuất: ${generatedAt.toLocaleDateString('vi-VN')}`, marginX, y);
  y += 28;

  doc.setFontSize(12);
  doc.text('Tháng', marginX, y);
  doc.text('Lít dầu tái chế', marginX + 140, y);
  doc.text('CO2e ước tính (kg)', marginX + 300, y);
  y += 8;
  doc.line(marginX, y, marginX + 460, y);
  y += 16;

  doc.setFontSize(11);
  let totalLiters = 0;
  let totalCo2 = 0;
  for (const point of monthly) {
    doc.text(point.label, marginX, y);
    doc.text(formatLiters(point.liters), marginX + 140, y);
    doc.text(point.co2Kg.toFixed(1), marginX + 300, y);
    totalLiters += point.liters;
    totalCo2 += point.co2Kg;
    y += 18;
  }

  y += 8;
  doc.line(marginX, y, marginX + 460, y);
  y += 20;
  doc.setFontSize(12);
  doc.text(`Tổng cộng: ${formatLiters(totalLiters)} · ${totalCo2.toFixed(1)} kg CO2e (ước tính)`, marginX, y);

  y += 28;
  doc.setFontSize(9);
  doc.text('Số liệu ước tính theo hệ số quy đổi 2.5 kg CO2/lít dầu tái chế, chỉ mang tính tham khảo.', marginX, y);

  return doc;
}
