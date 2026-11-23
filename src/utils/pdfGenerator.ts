import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getActiveAgricolaInfo } from '../data/initialData';
import { Cuartel, OrdenAplicacion, RegistroCosecha } from '../types/fieldbook';
import { formatDateCL, formatNumberCL } from './formatters';
import { buildQrDeepLink, generateQrDataUrl } from './qrUtils';
import type { QrLabelData } from '../components/QrLabelModal';

function createLetterDoc(): jsPDF {
  return new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });
}

function addOfficialLetterhead(doc: jsPDF, title: string, subtitle: string): number {
  const info = getActiveAgricolaInfo();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(20, 83, 45);
  doc.rect(14, 12, pageWidth - 28, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(info.razonSocial, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `RUT: ${info.rut}  ·  Ref: ${info.referencia}  ·  ${info.domicilio}, ${info.comuna}`,
    14,
    25
  );
  doc.text(`${info.utm}  ·  ${info.certificacion}`, 14, 29.5);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 33, pageWidth - 14, 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(subtitle, 14, 45.5);

  return 51;
}

function addPageFooters(doc: jsPDF) {
  const info = getActiveAgricolaInfo();
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowStr = new Date().toLocaleString('es-CL');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${info.nombreCorto} · Cuaderno de Campo Digital (Formato Carta) · Emitido: ${nowStr}`,
      14,
      pageHeight - 10
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }
}

export function exportTableToPdfLetter(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | undefined)[][],
  landscape = false
) {
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const startY = addOfficialLetterhead(doc, title, subtitle);

  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.map((r) => r.map((c) => (c === undefined || c === null ? '' : String(c)))),
    margin: { left: 14, right: 14, bottom: 20 },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  addPageFooters(doc);
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export interface PdfSignatureOptions {
  signerName?: string;
  signatureDataUrl?: string | null;
}

export async function exportOrdenAplicacionPdfLetter(
  orden: OrdenAplicacion,
  cuarteles: Cuartel[],
  sigOpts?: PdfSignatureOptions
) {
  const doc = createLetterDoc();
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = addOfficialLetterhead(
    doc,
    `ORDEN DE APLICACIÓN N° ${orden.numeroOrden}`,
    `Tipo: ${orden.tipoOrden}  ·  Estado: ${orden.estado}  ·  Emisión: ${formatDateCL(orden.fechaEmision)}  ·  Programada: ${formatDateCL(orden.fechaProgramada)}`
  );

  try {
    const qrUrl = await generateQrDataUrl(buildQrDeepLink('orden', orden.id), 220);
    doc.addImage(qrUrl, 'PNG', pageWidth - 36, 14, 20, 20);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(orden.numeroOrden, pageWidth - 26, 36, { align: 'center' });
  } catch {
    // Continue without QR if canvas unavailable
  }

  const selectedCuarteles = cuarteles.filter((c) => orden.cuartelIds.includes(c.id));
  const cuartelesLabel = selectedCuarteles
    .map((c) => `${c.codigo} ${c.nombre} (${formatNumberCL(c.superficieHa, 1)} ha)`)
    .join(', ');

  const totalAguaLts = orden.superficieTotalHa * orden.mojamientoLtsHa;
  const maquinadas =
    orden.capacidadEstanqueLts > 0 ? totalAguaLts / orden.capacidadEstanqueLts : 0;

  autoTable(doc, {
    startY: y,
    head: [['Parámetro Operativo', 'Detalle']],
    body: [
      ['Cultivo / Especie', orden.cultivo],
      ['Cuartel(es) Objetivo', cuartelesLabel || 'Sin asignar'],
      ['Superficie Total a Tratar', `${formatNumberCL(orden.superficieTotalHa, 2)} ha`],
      ['Objetivo / Plaga o Nutrición', orden.objetivo],
      ['Mojamiento / Volumen Total', `${formatNumberCL(orden.mojamientoLtsHa, 0)} L/ha  (${formatNumberCL(totalAguaLts, 0)} L totales)`],
      ['Estanque / Maquinadas Est.', `${formatNumberCL(orden.capacidadEstanqueLts, 0)} L  (${formatNumberCL(maquinadas, 1)} cargas)`],
      ['Maquinaria Asignada', orden.maquinaria],
      [
        'Aplicador Designado',
        `${orden.aplicador}${orden.carnetAplicadorRef ? `  ·  Carnet SAG: ${orden.carnetAplicadorRef}` : ''}`,
      ],
      ...(orden.tractorista || orden.carnetTractoristaRef
        ? [
            [
              'Tractorista (Lic. Clase D)',
              `${orden.tractorista || 'Asignado'}${orden.carnetTractoristaRef ? `  ·  ${orden.carnetTractoristaRef}` : ''}`,
            ],
          ]
        : []),
      ['Responsable Técnico', orden.responsableTecnico],
      ['Período de Carencia / Reingreso', `${orden.carenciaDias} días de carencia  ·  ${orden.reingresoHoras} horas de reingreso`],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    head: [['Producto Comercial', 'Ingrediente Activo', 'Dosis / ha', 'Total a Retirar de Bodega']],
    body: orden.productos.map((p) => [
      p.nombreProducto,
      p.ingredienteActivo,
      `${p.dosisPorHa} ${p.unidadDosis}`,
      `${formatNumberCL(p.cantidadTotal, 2)} ${p.unidadTotal}`,
    ]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    head: [['Seguridad, Clima y Observaciones']],
    body: [
      [`EPP Obligatorio: ${orden.eppRequerido}`],
      [`Condiciones Climáticas: ${orden.condicionesClimaRequeridas}`],
      [`Observaciones: ${orden.observaciones || 'Ninguna'}`],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  if (y > 245) {
    doc.addPage();
    y = 40;
  }

  const colW = (pageWidth - 28) / 3;
  if (sigOpts?.signatureDataUrl) {
    try {
      const xStart = 14 + 2 * colW + 6;
      doc.addImage(sigOpts.signatureDataUrl, 'PNG', xStart, y - 18, colW - 12, 16);
    } catch {
      // Ignore invalid signature image
    }
  }

  const sigTitles = [
    'Firma Responsable Técnico',
    'Firma Despacho Bodega',
    sigOpts?.signerName ? `Aplicador: ${sigOpts.signerName}` : 'Firma Aplicador',
  ];
  sigTitles.forEach((label, idx) => {
    const x1 = 14 + idx * colW + 4;
    const x2 = 14 + (idx + 1) * colW - 4;
    doc.setDrawColor(100, 116, 139);
    doc.line(x1, y, x2, y);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(label, (x1 + x2) / 2, y + 4.5, { align: 'center' });
  });

  addPageFooters(doc);
  doc.save(`${orden.numeroOrden}-Agricola-Queni.pdf`);
}

export async function exportGuiaDespachoPdfLetter(
  cosecha: RegistroCosecha,
  cuartel: Cuartel | undefined,
  enCarencia: boolean,
  sigOpts?: PdfSignatureOptions
) {
  const doc = createLetterDoc();
  const pageWidth = doc.internal.pageSize.getWidth();
  const guiaTitulo = cosecha.guiaDespacho || `COSECHA-${cosecha.fecha}`;

  let y = addOfficialLetterhead(
    doc,
    `GUÍA DE DESPACHO Y COSECHA N° ${guiaTitulo}`,
    `Fecha: ${formatDateCL(cosecha.fecha)}  ·  Cultivo: ${cosecha.cultivo}  ·  Destino: ${cosecha.destino}`
  );

  try {
    const qrUrl = await generateQrDataUrl(
      buildQrDeepLink('cuartel', cosecha.cuartelId || cosecha.id),
      220
    );
    doc.addImage(qrUrl, 'PNG', pageWidth - 36, 14, 20, 20);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(guiaTitulo, pageWidth - 26, 36, { align: 'center' });
  } catch {
    // Continue without QR
  }

  const kilosNetos = Math.max(0, cosecha.kilosBrutos - cosecha.kilosDescarte);

  autoTable(doc, {
    startY: y,
    head: [['Campo de Trazabilidad', 'Detalle del Despacho']],
    body: [
      ['Guía / Documento N°', guiaTitulo],
      ['Fecha de Cosecha / Salida', formatDateCL(cosecha.fecha)],
      [
        'Cuartel de Origen',
        cuartel
          ? `${cuartel.codigo} · ${cuartel.nombre} (${cuartel.cultivo} - ${cuartel.variedad})`
          : 'Sin cuartel especificado',
      ],
      ['Destino Comercial', cosecha.destino],
      ['Kilos Brutos Entregados', `${formatNumberCL(cosecha.kilosBrutos, 0)} kg`],
      ['Kilos Descarte / Merma', `${formatNumberCL(cosecha.kilosDescarte, 0)} kg`],
      ['Kilos Netos Trazables', `${formatNumberCL(kilosNetos, 0)} kg`],
      ['Madurez (°Brix)', `${formatNumberCL(cosecha.brix, 1)} °Brix`],
      ['Dotación de Cosecheros', `${cosecha.cosecheros} personas`],
      [
        'Estado Carencia Fitosanitaria',
        enCarencia
          ? 'ADVERTENCIA: Cuartel registraba carencia activa en la fecha'
          : 'Liberado (Sin carencia activa)',
      ],
      ['Observaciones de Calidad', cosecha.observaciones || 'Conforme para despacho'],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62 } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
  if (y > 245) {
    doc.addPage();
    y = 40;
  }

  const colW = (pageWidth - 28) / 2;
  if (sigOpts?.signatureDataUrl) {
    try {
      const xStart = 14 + colW + 10;
      doc.addImage(sigOpts.signatureDataUrl, 'PNG', xStart, y - 20, colW - 20, 18);
    } catch {
      // Ignore
    }
  }

  const sigLabels = [
    'Firma Responsable Predio / Packing',
    sigOpts?.signerName ? `Recepción / Transporte: ${sigOpts.signerName}` : 'Firma Conductor / Recepción',
  ];
  sigLabels.forEach((label, idx) => {
    const x1 = 14 + idx * colW + 8;
    const x2 = 14 + (idx + 1) * colW - 8;
    doc.setDrawColor(100, 116, 139);
    doc.line(x1, y, x2, y);
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, (x1 + x2) / 2, y + 5, { align: 'center' });
  });

  addPageFooters(doc);
  doc.save(`Guia-${guiaTitulo.replace(/[^a-zA-Z0-9_-]/g, '')}-Agricola-Queni.pdf`);
}

export function exportQrLabelPdfLetter(
  label: QrLabelData,
  qrDataUrl: string,
  deepLink: string
) {
  const doc = createLetterDoc();
  const pageWidth = doc.internal.pageSize.getWidth();
  const startY = addOfficialLetterhead(
    doc,
    `ETIQUETA QR DE TRAZABILIDAD · ${label.code}`,
    label.title
  );

  // Printable card border (centered top half of letter page for easy cut-out)
  const cardX = 28;
  const cardY = startY + 8;
  const cardW = pageWidth - 56;
  const cardH = 122;

  doc.setDrawColor(20, 83, 45);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S');

  doc.addImage(qrDataUrl, 'PNG', cardX + 10, cardY + 14, 58, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(label.code, cardX + 76, cardY + 22);

  doc.setFontSize(11);
  doc.text(label.title, cardX + 76, cardY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(label.subtitle, cardX + 76, cardY + 37);

  let rowY = cardY + 48;
  label.metadataRows.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${row.label}:`, cardX + 76, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row.value, cardX + 108, rowY);
    rowY += 7;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Escanea con cámara móvil: ${deepLink}`, cardX + 10, cardY + 112);

  addPageFooters(doc);
  doc.save(`Etiqueta-QR-${label.code.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`);
}
