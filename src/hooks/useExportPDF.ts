import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import wegenLogo from '@/assets/wegen-logo.png';

interface ExportOptions {
  companyName?: string;
  reportTitle?: string;
  mesRef?: string;
  clienteNome?: string;
  clienteCNPJ?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  ucNumero?: string;
  ucEndereco?: string;
  ucDistribuidora?: string;
  ucGrupoTarifario?: string;
  ucModalidade?: string;
  ucDemandaContratada?: number;
}

// Brand colors
const B = {
  green:     [26,  61,  46 ] as const, // #1A3D2E
  greenDk:   [18,  42,  32 ] as const,
  greenLt:   [40,  90,  68 ] as const,
  gold:      [196, 167, 78 ] as const, // #C4A74E
  goldLt:    [220, 200, 130] as const,
  goldDk:    [160, 135, 55 ] as const,
  dark:      [25,  25,  25 ] as const,
  medium:    [100, 100, 100] as const,
  light:     [160, 160, 160] as const,
  subtle:    [200, 200, 200] as const,
  cardBg:    [247, 247, 245] as const,
  white:     [255, 255, 255] as const,
};

const fill = (pdf: jsPDF, c: readonly [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);
const stroke = (pdf: jsPDF, c: readonly [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2]);
const textColor = (pdf: jsPDF, c: readonly [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);

const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

const fmtCNPJ = (cnpj: string) => {
  if (!cnpj || cnpj === '-') return '-';
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return cnpj;
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = useCallback(async (
    elementId: string,
    filename: string = 'relatorio-executivo.pdf',
    options: ExportOptions = {}
  ) => {
    setIsExporting(true);
    
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const {
        companyName = 'WeGen',
        reportTitle = 'Relatório Executivo de Energia',
        mesRef = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        clienteNome = 'Cliente não informado',
        clienteCNPJ = '-',
        ucNumero = '-',
        ucEndereco = '-',
        ucDistribuidora = '-',
        ucGrupoTarifario = '-',
        ucModalidade = '-',
        ucDemandaContratada = 0,
      } = options;

      let logoBase64: string | null = null;
      try { logoBase64 = await loadImageAsBase64(wegenLogo); } catch { /* ok */ }

      // Capture content with high quality
      const captureScale = 2.5;
      const fixedViewportWidth = 1280;
      
      const canvas = await html2canvas(element, {
        scale: captureScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: fixedViewportWidth,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('[data-no-pdf]').forEach(el => el.remove());
          clonedDoc.querySelectorAll('*').forEach((el: Element) => {
            const h = el as HTMLElement;
            const s = clonedDoc.defaultView?.getComputedStyle(h);
            if (!s) return;
            if (s.position === 'fixed' || s.position === 'sticky') h.style.position = 'static';
            if (['auto', 'scroll'].includes(s.overflow) || ['auto', 'scroll'].includes(s.overflowY) || ['auto', 'scroll'].includes(s.overflowX)) {
              h.style.overflow = 'visible';
              h.style.overflowX = 'visible';
              h.style.overflowY = 'visible';
              h.style.maxHeight = 'none';
              h.style.height = 'auto';
            }
            if (s.maxHeight !== 'none') h.style.maxHeight = 'none';
          });
          clonedDoc.querySelectorAll('[class*="card"], [class*="Card"], .avoid-break').forEach((el: Element) => {
            const h = el as HTMLElement;
            h.style.breakInside = 'avoid';
            h.style.pageBreakInside = 'avoid';
          });
          const ce = clonedDoc.getElementById(elementId);
          if (ce) {
            ce.style.width = `${fixedViewportWidth}px`;
            ce.style.minHeight = 'auto';
            ce.style.overflow = 'visible';
          }
        }
      });

      // A4
      const PW = 210, PH = 297;
      const ML = 12, MR = 12;
      const CW = PW - ML - MR;
      const HEADER_H = 30;
      const FOOTER_H = 14;
      const CONTENT_Y = HEADER_H + 2;
      const CONTENT_H = PH - CONTENT_Y - FOOTER_H;

      const reductionFactor = 0.88;
      const imgW = canvas.width, imgH = canvas.height;
      const bScale = CW / (imgW / captureScale);
      const sc = bScale * reductionFactor;
      const totalMm = (imgH / captureScale) * sc;
      const contentPages = Math.ceil(totalMm / CONTENT_H);
      const totalPages = 1 + contentPages;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date();
      const dataGeracao = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      // ─── Decorative Helpers ────────────────────────────────
      
      // Draw geometric pattern (subtle circles/dots)
      const drawGeometricPattern = (x: number, y: number, w: number, h: number, opacity: number = 0.08) => {
        pdf.setGState(new (pdf as any).GState({ opacity }));
        fill(pdf, B.goldLt);
        const spacing = 12;
        for (let cx = x; cx < x + w; cx += spacing) {
          for (let cy = y; cy < y + h; cy += spacing) {
            pdf.circle(cx, cy, 1, 'F');
          }
        }
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      };

      // Draw diagonal lines pattern
      const drawDiagonalAccent = (y: number, width: number) => {
        pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
        stroke(pdf, B.gold);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < width; i += 8) {
          pdf.line(i, y, i + 4, y - 4);
        }
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      };

      // Watermark on content pages
      const drawWatermark = () => {
        pdf.setGState(new (pdf as any).GState({ opacity: 0.03 }));
        textColor(pdf, B.green);
        pdf.setFontSize(60);
        pdf.setFont('helvetica', 'bold');
        // Rotate text
        const cx = PW / 2, cy = PH / 2;
        pdf.text('WeGen', cx, cy, { align: 'center', angle: 35 });
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      };

      // Gold separator bar
      const drawGoldBar = (y: number, width: number = PW) => {
        // Gradient effect via layered rects
        fill(pdf, B.goldDk);
        pdf.rect(0, y, width, 0.4, 'F');
        fill(pdf, B.gold);
        pdf.rect(0, y + 0.4, width, 1.0, 'F');
        fill(pdf, B.goldLt);
        pdf.rect(0, y + 1.4, width, 0.4, 'F');
      };

      // ─── COVER PAGE ─────────────────────────────────────────

      const drawCoverPage = () => {
        // Full dark green background
        fill(pdf, B.green);
        pdf.rect(0, 0, PW, PH, 'F');

        // Lighter green accent strip at left edge
        fill(pdf, B.greenLt);
        pdf.rect(0, 0, 5, PH, 'F');

        // Geometric pattern top-right
        drawGeometricPattern(130, 10, 80, 60, 0.06);

        // Top gold accent line
        drawGoldBar(0);

        // Logo area - white circle behind logo
        const logoCircleY = 55;
        if (logoBase64) {
          try {
            // Subtle glow behind logo
            pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
            fill(pdf, B.white);
            pdf.circle(PW / 2, logoCircleY + 12, 28, 'F');
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

            const logoW = 52, logoH = 29;
            pdf.addImage(logoBase64, 'PNG', (PW - logoW) / 2, logoCircleY - 2, logoW, logoH);
          } catch { /* ok */ }
        }

        // Report Title with shadow effect
        const titleY = 105;
        // Shadow
        pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
        textColor(pdf, B.dark);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, PW / 2 + 0.5, titleY + 0.5, { align: 'center' });
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        // Main text
        textColor(pdf, B.white);
        pdf.text(reportTitle, PW / 2, titleY, { align: 'center' });

        // Gold decorative underline with diamond ends
        const tW = pdf.getTextWidth(reportTitle);
        const lineY = titleY + 5;
        stroke(pdf, B.gold);
        pdf.setLineWidth(1.2);
        const lx1 = (PW - tW) / 2 - 5, lx2 = (PW + tW) / 2 + 5;
        pdf.line(lx1, lineY, lx2, lineY);
        // Diamond accents at ends
        fill(pdf, B.gold);
        const ds = 2;
        [lx1, lx2].forEach(dx => {
          pdf.lines([[ds, -ds], [ds, ds], [-ds, ds], [-ds, -ds]], dx - ds, lineY, [1, 1], 'F');
        });

        // Period with subtle bg
        const periodY = titleY + 16;
        textColor(pdf, B.goldLt);
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'normal');
        pdf.text(mesRef, PW / 2, periodY, { align: 'center' });

        // Diagonal accent
        drawDiagonalAccent(135, PW);

        // ── Client Card ──
        const cardX = 22, cardY = 142, cardW = PW - 44, cardH = 52;
        
        // Card outer glow
        pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
        fill(pdf, B.dark);
        pdf.roundedRect(cardX + 2, cardY + 2, cardW, cardH, 4, 4, 'F');
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        
        // Card
        fill(pdf, B.white);
        pdf.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F');
        
        // Gold top border on card
        fill(pdf, B.gold);
        pdf.roundedRect(cardX, cardY, cardW, 3, 4, 4, 'F');
        // Fix bottom corners of gold strip
        fill(pdf, B.white);
        pdf.rect(cardX, cardY + 2, cardW, 2, 'F');
        fill(pdf, B.gold);
        pdf.rect(cardX, cardY, cardW, 2.5, 'F');

        const pad = 10;
        const lCol = cardX + pad;
        const rCol = cardX + cardW / 2 + 8;

        // Left - CLIENTE
        textColor(pdf, B.gold);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text('▎ CLIENTE', lCol, cardY + 12);

        textColor(pdf, B.dark);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        const nm = clienteNome.length > 26 ? clienteNome.substring(0, 26) + '…' : clienteNome;
        pdf.text(nm, lCol, cardY + 19);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        textColor(pdf, B.medium);
        pdf.text(`CNPJ  ${fmtCNPJ(clienteCNPJ)}`, lCol, cardY + 26);
        
        const endT = ucEndereco.length > 36 ? ucEndereco.substring(0, 36) + '…' : ucEndereco;
        pdf.text(endT, lCol, cardY + 32);

        // Vertical divider with dots
        const divX = cardX + cardW / 2;
        stroke(pdf, B.subtle);
        pdf.setLineWidth(0.2);
        for (let dy = cardY + 9; dy < cardY + cardH - 8; dy += 3) {
          pdf.line(divX, dy, divX, dy + 1.5);
        }

        // Right - UC
        textColor(pdf, B.gold);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text('▎ UNIDADE CONSUMIDORA', rCol, cardY + 12);

        textColor(pdf, B.dark);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`UC ${ucNumero}`, rCol, cardY + 19);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        textColor(pdf, B.medium);
        pdf.text(ucDistribuidora, rCol, cardY + 26);
        
        const dem = ucDemandaContratada > 0 ? `${ucDemandaContratada} kW` : '—';
        pdf.text(`${ucGrupoTarifario}  ·  ${ucModalidade}  ·  ${dem}`, rCol, cardY + 32);

        // Small gold badges in card
        const badgeY = cardY + 39;
        const badges = ['ENERGIA', 'SOLAR', 'ECONOMIA'];
        let bx = lCol;
        badges.forEach(label => {
          const bw = pdf.getTextWidth(label) + 6;
          fill(pdf, B.gold);
          pdf.roundedRect(bx, badgeY, bw, 5.5, 1.5, 1.5, 'F');
          textColor(pdf, B.dark);
          pdf.setFontSize(5.5);
          pdf.setFont('helvetica', 'bold');
          pdf.text(label, bx + 3, badgeY + 4);
          bx += bw + 3;
        });

        // ── Bottom section ──
        // Geometric pattern bottom
        drawGeometricPattern(10, 200, 50, 40, 0.04);

        const botY = 210;
        textColor(pdf, B.goldLt);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Gerado em ${dataGeracao}`, PW / 2, botY, { align: 'center' });

        // Description in a refined box
        const descBoxY = botY + 8;
        pdf.setGState(new (pdf as any).GState({ opacity: 0.08 }));
        fill(pdf, B.white);
        pdf.roundedRect(30, descBoxY - 2, PW - 60, 22, 3, 3, 'F');
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

        textColor(pdf, B.goldLt);
        pdf.setFontSize(9);
        pdf.text('Visão consolidada de consumo de energia, geração solar,', PW / 2, descBoxY + 5, { align: 'center' });
        pdf.text('créditos de assinatura e oportunidades de economia.', PW / 2, descBoxY + 11, { align: 'center' });

        // Confidentiality
        pdf.setFontSize(6.5);
        textColor(pdf, B.greenLt);
        pdf.text('DOCUMENTO CONFIDENCIAL  ·  USO EXCLUSIVO DO DESTINATÁRIO', PW / 2, descBoxY + 24, { align: 'center' });

        // Bottom gold bar
        drawGoldBar(PH - FOOTER_H - 2);

        // Footer
        drawFooter(1);
      };

      // ─── CONTENT HEADER ─────────────────────────────────────

      const drawContentHeader = (pageNum: number) => {
        // Green header
        fill(pdf, B.green);
        pdf.rect(0, 0, PW, 15, 'F');
        
        // Left accent stripe
        fill(pdf, B.greenLt);
        pdf.rect(0, 0, 3, 15, 'F');

        // Logo
        if (logoBase64) {
          try { pdf.addImage(logoBase64, 'PNG', ML + 2, 2.5, 17, 9.5); } catch { /* ok */ }
        }
        
        // Title
        textColor(pdf, B.white);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, ML + 23, 9.5);
        
        // Right side
        textColor(pdf, B.goldLt);
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(mesRef, PW - MR, 7, { align: 'right' });
        
        // Page number badge
        fill(pdf, B.gold);
        const pnText = `${pageNum}/${totalPages}`;
        const pnW = pdf.getTextWidth(pnText) + 6;
        pdf.roundedRect(PW - MR - pnW, 9, pnW, 4.5, 1, 1, 'F');
        textColor(pdf, B.dark);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text(pnText, PW - MR - pnW / 2, 12, { align: 'center' });

        // Gold bar
        drawGoldBar(15);

        // Info strip
        fill(pdf, B.cardBg);
        pdf.rect(0, 16.8, PW, 11, 'F');

        // Client info
        textColor(pdf, B.dark);
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        const nm2 = clienteNome.length > 30 ? clienteNome.substring(0, 30) + '…' : clienteNome;
        pdf.text(nm2, ML, 22.5);
        
        // Dot separator
        textColor(pdf, B.gold);
        pdf.text('  ●  ', ML + pdf.getTextWidth(nm2), 22.5);
        
        textColor(pdf, B.medium);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(`UC ${ucNumero}  ·  ${ucDistribuidora}  ·  ${ucGrupoTarifario} ${ucModalidade}`, ML, 26);

        // Bottom border
        stroke(pdf, B.subtle);
        pdf.setLineWidth(0.15);
        pdf.line(ML, 27.8, PW - MR, 27.8);
      };

      // ─── FOOTER ────────────────────────────────────────────

      const drawFooter = (pageNum: number) => {
        const fy = PH - FOOTER_H;
        
        // Gold top line
        drawGoldBar(fy);

        // Background
        fill(pdf, B.cardBg);
        pdf.rect(0, fy + 1.8, PW, FOOTER_H - 1.8, 'F');

        // Left: copyright
        pdf.setFontSize(6);
        textColor(pdf, B.medium);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`© ${now.getFullYear()} ${companyName}  ·  Energia inteligente para o seu negócio`, ML, fy + 7);

        // Center: generated date
        pdf.setFontSize(5.5);
        textColor(pdf, B.light);
        pdf.text(`Gerado em ${dataGeracao}`, PW / 2, fy + 11, { align: 'center' });

        // Right: page number with green bg
        fill(pdf, B.green);
        const pgLabel = `${pageNum} / ${totalPages}`;
        const pgW = pdf.getTextWidth(pgLabel) + 8;
        pdf.roundedRect(PW - MR - pgW, fy + 3.5, pgW, 6, 1.5, 1.5, 'F');
        textColor(pdf, B.white);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(pgLabel, PW - MR - pgW / 2, fy + 7.5, { align: 'center' });

        textColor(pdf, B.dark);
      };

      // ═══════════════ BUILD PDF ═══════════════
      
      // Page 1: Cover
      drawCoverPage();

      // Content pages
      const CY = 29.5;
      const CH = PH - CY - FOOTER_H;

      for (let page = 0; page < contentPages; page++) {
        pdf.addPage();
        
        const pn = page + 2;
        
        // Watermark first (behind content)
        drawWatermark();
        
        drawContentHeader(pn);
        drawFooter(pn);

        const sourceY = (page * CH / sc) * captureScale;
        const sourceH = Math.min((CH / sc) * captureScale, imgH - sourceY);
        if (sourceH <= 0) continue;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgW;
        sliceCanvas.height = Math.ceil(sourceH);
        
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, sourceY, imgW, sourceH, 0, 0, imgW, sourceH);
          
          const sliceData = sliceCanvas.toDataURL('image/png');
          const actW = CW * reductionFactor;
          const rH = Math.min(CH, (sourceH / captureScale) * sc);
          const xOff = ML + (CW - actW) / 2;
          
          pdf.addImage(sliceData, 'PNG', xOff, CY, actW, rH);
        }
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportToPDF, isExporting };
}
