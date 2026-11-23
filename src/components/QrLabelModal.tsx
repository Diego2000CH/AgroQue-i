import React, { useEffect, useState } from 'react';
import { QrCode, Download, Printer, X } from 'lucide-react';
import { buildQrDeepLink, generateQrDataUrl, QrEntityType } from '../utils/qrUtils';
import { exportQrLabelPdfLetter } from '../utils/pdfGenerator';

export interface QrLabelData {
  entityType: QrEntityType;
  entityId: string;
  code: string;
  title: string;
  subtitle: string;
  metadataRows: { label: string; value: string }[];
}

interface QrLabelModalProps {
  label: QrLabelData;
  onClose: () => void;
}

export const QrLabelModal: React.FC<QrLabelModalProps> = ({ label, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const qrPayload = buildQrDeepLink(label.entityType, label.entityId);

  useEffect(() => {
    let active = true;
    generateQrDataUrl(qrPayload, 360)
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [qrPayload]);

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${label.entityType}-${label.code.replace(/[^a-zA-Z0-9_-]/g, '')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadLabelPDF = () => {
    if (!qrDataUrl) return;
    exportQrLabelPdfLetter(label, qrDataUrl, qrPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Etiqueta QR de Trazabilidad
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-950 flex flex-col items-center text-center gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Agrícola Queñi · Trazabilidad en Terreno
            </div>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR ${label.code}`}
                className="w-44 h-44 rounded-lg border border-slate-200 bg-white p-1"
              />
            ) : (
              <div className="w-44 h-44 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                Generando QR...
              </div>
            )}
            <div className="w-full space-y-1">
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {label.code}
              </div>
              <div className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
                {label.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{label.subtitle}</div>
            </div>
            <div className="w-full border-t border-slate-200 dark:border-slate-800 pt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-left">
              {label.metadataRows.map((row) => (
                <div key={row.label} className="text-[11px]">
                  <span className="text-slate-400 block">{row.label}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!qrDataUrl}
              onClick={handleDownloadPNG}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PNG</span>
            </button>
            <button
              type="button"
              disabled={!qrDataUrl}
              onClick={handleDownloadLabelPDF}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF Etiqueta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
