import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { fecha_mexico } from '@/lib/mexico-time';

const EXPORT_WIDTH = 860;
const MARGIN_MM = 10;
const HEADER_SPACE_MM = 22;
const FOOTER_SPACE_MM = 10;
const COL_GAP_MM = 4;
const ROW_GAP_MM = 4;
const SECTION_GAP_MM = 4;
const MAX_PAGES = 2;

type PdfKind = 'meta' | 'kpis' | 'chart';

interface CapturedSection {
  kind: PdfKind;
  dataUrl: string;
  width: number;
  height: number;
}

async function waitForRender(ms = 300) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

function normalizeClone(clone: HTMLElement, kind: PdfKind) {
  clone.style.width = `${EXPORT_WIDTH}px`;
  clone.style.maxWidth = `${EXPORT_WIDTH}px`;
  clone.style.background = '#ffffff';
  clone.style.opacity = '1';
  clone.style.transform = 'none';
  clone.style.boxSizing = 'border-box';

  if (kind === 'chart') {
    clone.style.border = '1px solid #e2ebd4';
    clone.style.borderRadius = '12px';
    clone.style.padding = '8px 10px 10px';
    clone.style.overflow = 'hidden';
  }

  clone.querySelectorAll('*').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.opacity = '1';
    node.style.transform = 'none';
    node.style.animation = 'none';
  });

  clone.querySelectorAll('svg').forEach((svg) => {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo procesar la captura'));
  });
  return img;
}

async function captureElement(element: HTMLElement, kind: PdfKind): Promise<CapturedSection> {
  const clone = element.cloneNode(true) as HTMLElement;
  normalizeClone(clone, kind);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${EXPORT_WIDTH}px`;
  host.style.zIndex = '-1';
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForRender();
    const height = Math.max(clone.scrollHeight, clone.offsetHeight, 1);

    let dataUrl: string;
    try {
      dataUrl = await toPng(clone, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: EXPORT_WIDTH,
        height,
        skipFonts: true,
      });
    } catch {
      const canvas = await html2canvas(clone, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: EXPORT_WIDTH,
        height,
      });
      dataUrl = canvas.toDataURL('image/png');
    }

    const img = await loadImage(dataUrl);
    return { kind, dataUrl, width: img.width, height: img.height };
  } finally {
    document.body.removeChild(host);
  }
}

function drawPdfHeader(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(75, 121, 20);
  pdf.rect(0, 0, pageWidth, 2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(75, 121, 20);
  pdf.text('LRJAS — Reporte de dashboard', MARGIN_MM, 11);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(91, 114, 53);
  pdf.text(`Generado: ${fecha_mexico()}`, MARGIN_MM, 16);

  pdf.setDrawColor(220, 232, 204);
  pdf.setLineWidth(0.25);
  pdf.line(MARGIN_MM, 18.5, pageWidth - MARGIN_MM, 18.5);
}

function drawPageFooter(pdf: jsPDF, page: number, total: number) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(140, 150, 130);
  pdf.text(`Página ${page} de ${total}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
}

function pageBottom(pdf: jsPDF) {
  return pdf.internal.pageSize.getHeight() - MARGIN_MM - FOOTER_SPACE_MM;
}

function sectionHeightMm(section: CapturedSection, drawWidthMm: number) {
  return (section.height * drawWidthMm) / section.width;
}

function getKind(el: HTMLElement): PdfKind {
  const kind = el.dataset.pdfKind;
  if (kind === 'meta' || kind === 'kpis' || kind === 'chart') return kind;
  return 'chart';
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

function measureTop(sections: CapturedSection[], contentWidth: number) {
  let h = 0;
  for (const section of sections) {
    h += sectionHeightMm(section, contentWidth) + SECTION_GAP_MM;
  }
  return h;
}

function measureChartRows(charts: CapturedSection[], colWidth: number) {
  return chunkPairs(charts).map((row) =>
    Math.max(...row.map((c) => sectionHeightMm(c, colWidth))),
  );
}

function totalRowsHeight(rowHeights: number[]) {
  if (rowHeights.length === 0) return 0;
  return rowHeights.reduce((a, b) => a + b, 0) + (rowHeights.length - 1) * ROW_GAP_MM;
}

export async function exportDashboardPdf(root: HTMLElement): Promise<void> {
  await waitForRender(600);

  const elements = Array.from(root.querySelectorAll('[data-pdf-section]')) as HTMLElement[];
  if (elements.length === 0) {
    throw new Error('No hay contenido para exportar');
  }

  const sections: CapturedSection[] = [];
  for (const el of elements) {
    sections.push(await captureElement(el, getKind(el)));
  }

  const topSections = [
    ...sections.filter((s) => s.kind === 'meta'),
    ...sections.filter((s) => s.kind === 'kpis'),
  ];
  const charts = sections.filter((s) => s.kind === 'chart');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_MM * 2;
  const colWidth = (contentWidth - COL_GAP_MM) / 2;
  const usable = pageBottom(pdf) - HEADER_SPACE_MM;

  let topHeight = measureTop(topSections, contentWidth);
  let topScale = 1;
  // KPIs no deben comerse más de ~30% de la hoja
  const maxTop = usable * 0.3;
  if (topHeight > maxTop && topHeight > 0) {
    topScale = maxTop / topHeight;
    topHeight = maxTop;
  }

  const page1ChartsAvail = Math.max(usable - topHeight, 40);
  const chartsAvailTotal = page1ChartsAvail + usable;

  const naturalRowHeights = measureChartRows(charts, colWidth);
  const naturalChartsH = totalRowsHeight(naturalRowHeights);

  let chartScale = 1;
  if (naturalChartsH > 0) {
    const fitOne = page1ChartsAvail / naturalChartsH;
    const fitTwo = chartsAvailTotal / naturalChartsH;

    if (fitOne >= 1) {
      // Caben todas en 1 hoja a tamaño natural
      chartScale = 1;
    } else if (fitOne >= 0.5) {
      // Con un poco de reducción caben en 1 hoja
      chartScale = fitOne;
    } else if (fitTwo >= 1) {
      // Mejor en 2 hojas sin encoger
      chartScale = 1;
    } else {
      // Encoger para no pasar de 2 hojas
      chartScale = fitTwo;
    }
  }

  const scaledColW = colWidth * chartScale;
  const scaledRows = chunkPairs(charts);
  const scaledRowHeights = scaledRows.map((row) =>
    Math.max(...row.map((c) => sectionHeightMm(c, scaledColW))),
  );

  type PageItem =
    | { type: 'top'; section: CapturedSection; width: number; height: number }
    | { type: 'row'; charts: CapturedSection[]; height: number; colW: number };

  const pageItems: PageItem[][] = [[], []];
  let pageIdx = 0;
  let used = 0;

  const pushToPage = (item: PageItem, itemH: number, gapAfter: number) => {
    const need = itemH + (pageItems[pageIdx].length > 0 ? gapAfter : 0);
    if (pageIdx === 0 && used + need > usable && pageItems[0].length > 0) {
      pageIdx = 1;
      used = 0;
    }
    if (pageIdx === 1 && used + need > usable && pageItems[1].length > 0) {
      // Forzar cabida: no hay 3ª hoja; se ignora overflow residual (ya escalamos)
    }
    pageItems[pageIdx].push(item);
    used += (pageItems[pageIdx].length > 1 ? gapAfter : 0) + itemH;
  };

  for (const section of topSections) {
    const w = contentWidth * topScale;
    const h = sectionHeightMm(section, w);
    pushToPage({ type: 'top', section, width: w, height: h }, h, SECTION_GAP_MM);
  }

  for (let i = 0; i < scaledRows.length; i++) {
    const row = scaledRows[i];
    const h = scaledRowHeights[i];
    // Tras KPIs, las gráficas de página 1 usan el espacio restante; si no caben, página 2
    pushToPage({ type: 'row', charts: row, height: h, colW: scaledColW }, h, ROW_GAP_MM);
  }

  const pagesUsed = pageItems[1].length > 0 ? 2 : 1;

  for (let p = 0; p < pagesUsed; p++) {
    if (p > 0) pdf.addPage();
    drawPdfHeader(pdf);

    let y = HEADER_SPACE_MM;
    const items = pageItems[p];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const gap = i === 0 ? 0 : item.type === 'top' ? SECTION_GAP_MM : ROW_GAP_MM;
      y += gap;

      if (item.type === 'top') {
        const x = MARGIN_MM + (contentWidth - item.width) / 2;
        pdf.addImage(item.section.dataUrl, 'PNG', x, y, item.width, item.height, undefined, 'FAST');
        y += item.height;
      } else {
        const totalRowW = item.charts.length * item.colW + (item.charts.length - 1) * COL_GAP_MM * chartScale;
        let x = MARGIN_MM + (contentWidth - totalRowW) / 2;
        for (const chart of item.charts) {
          const h = sectionHeightMm(chart, item.colW);
          pdf.addImage(chart.dataUrl, 'PNG', x, y, item.colW, h, undefined, 'FAST');
          x += item.colW + COL_GAP_MM * chartScale;
        }
        y += item.height;
      }
    }
  }

  // Asegurar máximo 2 páginas por si jsPDF creó de más
  while (pdf.getNumberOfPages() > MAX_PAGES) {
    pdf.deletePage(pdf.getNumberOfPages());
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    drawPageFooter(pdf, page, totalPages);
  }

  pdf.save(`dashboard-lrjas-${new Date().toISOString().slice(0, 10)}.pdf`);
}
