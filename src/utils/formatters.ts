import { LatLngPoint } from '../types/fieldbook';

import { getActiveAgricolaInfo } from '../data/initialData';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function diffDaysISO(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split('-').map(Number);
  const [y2, m2, d2] = toISO.split('-').map(Number);
  if (!y1 || !y2) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

export function formatDateCL(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function formatCurrencyCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberCL(value: number, decimals = 1): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getCarenciaStatus(
  fechaAplicacion: string,
  carenciaDias: number,
  referenceISO = getTodayISO()
) {
  if (carenciaDias <= 0) {
    return {
      fechaLiberacion: fechaAplicacion,
      diasRestantes: 0,
      enCarencia: false,
    };
  }
  const fechaLiberacion = addDaysISO(fechaAplicacion, carenciaDias);
  const diasRestantes = diffDaysISO(referenceISO, fechaLiberacion);
  return {
    fechaLiberacion,
    diasRestantes: Math.max(0, diasRestantes),
    enCarencia: diasRestantes > 0,
  };
}

/** Computes approximate geodesic polygon area in hectares (Shoelace on spherical projection) */
export function computePolygonAreaHa(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  const R = 6378137;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2);
  return Math.round((area / 10000) * 100) / 100;
}

export function computePolygonCenter(points: LatLngPoint[]): LatLngPoint {
  if (points.length === 0) return { lat: -39.708, lng: -72.385 };
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: Number((sum.lat / points.length).toFixed(6)),
    lng: Number((sum.lng / points.length).toFixed(6)),
  };
}

export function exportRowsToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | undefined)[][]
) {
  const escapeCell = (cell: string | number | undefined) => {
    const str = cell === undefined || cell === null ? '' : String(cell);
    if (str.includes('"') || str.includes(';') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(';'), ...rows.map((r) => r.map(escapeCell).join(';'))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string | number | undefined): string {
  const str = text === undefined || text === null ? '' : String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Exports any structured table report to Word (.doc) formatted for Letter / Tamaño Carta */
export function exportTableToWordLetter(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | undefined)[][],
  footerNote?: string
) {
  const info = getActiveAgricolaInfo();
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: letter; margin: 1.5cm; }
  body { font-family: Calibri, Arial, sans-serif; color: #0f172a; font-size: 10pt; }
  .header { border-bottom: 2px solid #15803d; padding-bottom: 8px; margin-bottom: 14px; }
  .company { font-size: 13pt; font-weight: bold; color: #14532d; }
  .meta { font-size: 8.5pt; color: #475569; margin-top: 2px; }
  h1 { font-size: 12pt; margin: 10px 0 2px 0; color: #0f172a; }
  .sub { font-size: 9pt; color: #475569; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; color: #0f172a; font-weight: bold; text-align: left; border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt; }
  td { border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 8.5pt; vertical-align: top; }
  .footer { margin-top: 18px; font-size: 8pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">${escapeHtml(info.razonSocial)}</div>
    <div class="meta">RUT: ${escapeHtml(info.rut)} · Ref: ${escapeHtml(info.referencia)} · ${escapeHtml(info.domicilio)}, ${escapeHtml(info.comuna)}</div>
  </div>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">${escapeHtml(subtitle)}</div>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows
        .map((r) => `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('')}
    </tbody>
  </table>
  <div class="footer">${escapeHtml(footerNote || 'Documento generado desde Cuaderno de Campo Digital · Formato Carta')}</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Exports an individual Orden de Aplicación to Word (.doc) formatted for Letter / Tamaño Carta with signatures */
export function exportOrdenAplicacionWordLetter(orden: {
  numeroOrden: string;
  fechaEmision: string;
  fechaProgramada: string;
  cultivo: string;
  superficieTotalHa: number;
  tipoOrden: string;
  objetivo: string;
  productos: {
    nombreProducto: string;
    ingredienteActivo: string;
    dosisPorHa: number;
    unidadDosis: string;
    cantidadTotal: number;
    unidadTotal: string;
  }[];
  mojamientoLtsHa: number;
  capacidadEstanqueLts: number;
  maquinaria: string;
  aplicador: string;
  tractorista?: string;
  carnetAplicadorRef?: string;
  carnetTractoristaRef?: string;
  responsableTecnico: string;
  eppRequerido: string;
  condicionesClimaRequeridas: string;
  carenciaDias: number;
  reingresoHoras: number;
  estado: string;
  observaciones: string;
}, cuartelesLabel: string) {
  const info = getActiveAgricolaInfo();
  const aguaTotal = orden.superficieTotalHa * orden.mojamientoLtsHa;
  const maquinadas =
    orden.capacidadEstanqueLts > 0 ? aguaTotal / orden.capacidadEstanqueLts : 0;

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(orden.numeroOrden)}</title>
<style>
  @page { size: letter; margin: 1.5cm; }
  body { font-family: Calibri, Arial, sans-serif; color: #0f172a; font-size: 10pt; }
  .header { border-bottom: 2px solid #15803d; padding-bottom: 8px; margin-bottom: 12px; }
  .company { font-size: 13pt; font-weight: bold; color: #14532d; }
  .meta { font-size: 8.5pt; color: #475569; margin-top: 2px; }
  h1 { font-size: 12.5pt; margin: 10px 0 2px 0; color: #0f172a; }
  .sub { font-size: 9pt; color: #475569; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f1f5f9; color: #0f172a; font-weight: bold; text-align: left; border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt; }
  td { border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 8.5pt; vertical-align: top; }
  .green-head th { background: #15803d; color: #ffffff; }
  .sigs { width: 100%; margin-top: 42px; border: none; }
  .sigs td { border: none; text-align: center; width: 33%; padding-top: 24px; }
  .sig-line { border-top: 1px solid #64748b; width: 85%; margin: 0 auto 4px auto; }
  .footer { margin-top: 18px; font-size: 8pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company">${escapeHtml(info.razonSocial)}</div>
    <div class="meta">RUT: ${escapeHtml(info.rut)} · Ref: ${escapeHtml(info.referencia)} · ${escapeHtml(info.domicilio)}, ${escapeHtml(info.comuna)}</div>
  </div>
  <h1>ORDEN DE APLICACIÓN N° ${escapeHtml(orden.numeroOrden)}</h1>
  <div class="sub">Tipo: ${escapeHtml(orden.tipoOrden)} · Estado: ${escapeHtml(orden.estado)} · Emisión: ${escapeHtml(formatDateCL(orden.fechaEmision))} · Programada: ${escapeHtml(formatDateCL(orden.fechaProgramada))}</div>

  <table>
    <thead><tr><th style="width: 34%;">Parámetro Operativo</th><th>Detalle</th></tr></thead>
    <tbody>
      <tr><td><strong>Cultivo / Especie</strong></td><td>${escapeHtml(orden.cultivo)}</td></tr>
      <tr><td><strong>Cuartel(es) Objetivo</strong></td><td>${escapeHtml(cuartelesLabel)}</td></tr>
      <tr><td><strong>Superficie Total</strong></td><td>${escapeHtml(formatNumberCL(orden.superficieTotalHa, 2))} ha</td></tr>
      <tr><td><strong>Objetivo / Control</strong></td><td>${escapeHtml(orden.objetivo)}</td></tr>
      <tr><td><strong>Mojamiento / Volumen Total</strong></td><td>${escapeHtml(formatNumberCL(orden.mojamientoLtsHa, 0))} L/ha (${escapeHtml(formatNumberCL(aguaTotal, 0))} L totales)</td></tr>
      <tr><td><strong>Estanque / Maquinadas</strong></td><td>${escapeHtml(formatNumberCL(orden.capacidadEstanqueLts, 0))} L (${escapeHtml(formatNumberCL(maquinadas, 1))} cargas)</td></tr>
      <tr><td><strong>Maquinaria Asignada</strong></td><td>${escapeHtml(orden.maquinaria)}</td></tr>
      <tr><td><strong>Aplicador Designado</strong></td><td>${escapeHtml(orden.aplicador)}${orden.carnetAplicadorRef ? ` · Carnet SAG: ${escapeHtml(orden.carnetAplicadorRef)}` : ''}</td></tr>
      ${orden.tractorista || orden.carnetTractoristaRef ? `<tr><td><strong>Tractorista (Clase D)</strong></td><td>${escapeHtml(orden.tractorista || 'Asignado')}${orden.carnetTractoristaRef ? ` · Lic.: ${escapeHtml(orden.carnetTractoristaRef)}` : ''}</td></tr>` : ''}
      <tr><td><strong>Responsable Técnico</strong></td><td>${escapeHtml(orden.responsableTecnico)}</td></tr>
      <tr><td><strong>Carencia / Reingreso</strong></td><td>${orden.carenciaDias} días de carencia · ${orden.reingresoHoras} horas de reingreso</td></tr>
    </tbody>
  </table>

  <table>
    <thead class="green-head">
      <tr>
        <th>Producto Comercial</th>
        <th>Ingrediente Activo</th>
        <th>Dosis / ha</th>
        <th>Total Retiro Bodega</th>
      </tr>
    </thead>
    <tbody>
      ${orden.productos
        .map(
          (p) => `
      <tr>
        <td>${escapeHtml(p.nombreProducto)}</td>
        <td>${escapeHtml(p.ingredienteActivo)}</td>
        <td>${escapeHtml(p.dosisPorHa)} ${escapeHtml(p.unidadDosis)}</td>
        <td><strong>${escapeHtml(formatNumberCL(p.cantidadTotal, 2))} ${escapeHtml(p.unidadTotal)}</strong></td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <table>
    <thead><tr><th>Seguridad, Clima y Observaciones</th></tr></thead>
    <tbody>
      <tr><td><strong>EPP Obligatorio:</strong> ${escapeHtml(orden.eppRequerido)}</td></tr>
      <tr><td><strong>Condiciones Climáticas:</strong> ${escapeHtml(orden.condicionesClimaRequeridas)}</td></tr>
      <tr><td><strong>Observaciones:</strong> ${escapeHtml(orden.observaciones || 'Ninguna')}</td></tr>
    </tbody>
  </table>

  <table class="sigs">
    <tr>
      <td><div class="sig-line"></div>Firma Responsable Técnico</td>
      <td><div class="sig-line"></div>Firma Despacho Bodega</td>
      <td><div class="sig-line"></div>Firma Aplicador</td>
    </tr>
  </table>

  <div class="footer">${escapeHtml(info.nombreCorto)} · Cuaderno de Campo Digital (Formato Carta) · RUT ${escapeHtml(info.rut)}</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${orden.numeroOrden}-Agricola-Queni.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
