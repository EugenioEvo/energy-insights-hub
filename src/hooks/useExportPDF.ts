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
const BRAND = {
  green: { r: 26, g: 61, b: 46 },       // #1A3D2E
  greenLight: { r: 35, g: 80, b: 60 },   // lighter green for accents
  gold: { r: 196, g: 167, b: 78 },       // #C4A74E
  goldLight: { r: 220, g: 200, b: 130 },
  dark: { r: 30, g: 30, b: 30 },
  medium: { r: 100, g: 100, b: 100 },
  light: { r: 160, g: 160, b: 160 },
  bg: { r: 250, g: 250, b: 248 },
  white: { r: 255, g: 255, b: 255 },
  cardBg: { r: 245, g: 245, b: 243 },
};

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

const formatCNPJ = (cnpj: string) => {
  if (!cnpj || cnpj === '-') return '-';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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
      if (!element) {
        throw new Error('Element not found');
      }

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

      // Load logo
      let logoBase64: string | null = null;
      try {
        logoBase64 = await loadImageAsBase64(wegenLogo);
      } catch (e) {
        console.warn('Could not load logo:', e);
      }

      // Capture content
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
            const htmlEl = el as HTMLElement;
            const style = clonedDoc.defaultView?.getComputedStyle(htmlEl);
            if (!style) return;
            if (style.position === 'fixed' || style.position === 'sticky') {
              htmlEl.style.position = 'static';
            }
            if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                style.overflowX === 'auto' || style.overflowX === 'scroll') {
              htmlEl.style.overflow = 'visible';
              htmlEl.style.overflowX = 'visible';
              htmlEl.style.overflowY = 'visible';
              htmlEl.style.maxHeight = 'none';
              htmlEl.style.height = 'auto';
            }
            if (style.maxHeight !== 'none') {
              htmlEl.style.maxHeight = 'none';
            }
          });
          clonedDoc.querySelectorAll('[class*="card"], [class*="Card"], .avoid-break').forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.breakInside = 'avoid';
            htmlEl.style.pageBreakInside = 'avoid';
          });
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.width = `${fixedViewportWidth}px`;
            clonedElement.style.minHeight = 'auto';
            clonedElement.style.overflow = 'visible';
          }
        }
      });

      // A4 dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = { left: 10, right: 10, top: 0, bottom: 0 };
      const headerTotalHeight = 50; // Total header area including cover page header
      const footerHeight = 12;
      const contentWidth = pageWidth - margin.left - margin.right;
      const contentStartY = headerTotalHeight;
      const contentAvailableHeight = pageHeight - contentStartY - footerHeight;

      // Calculate image dimensions
      const reductionFactor = 0.85;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const baseScale = contentWidth / (imgWidth / captureScale);
      const scale = baseScale * reductionFactor;
      const totalContentHeightMm = (imgHeight / captureScale) * scale;
      
      // Total pages = cover + content pages
      const contentPages = Math.ceil(totalContentHeightMm / contentAvailableHeight);
      const totalPages = 1 + contentPages; // 1 cover + content

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const dataGeracao = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      // ========== COVER PAGE ==========
      const drawCoverPage = () => {
        // Full green background at top (60% of page)
        const coverGreenHeight = 170;
        pdf.setFillColor(BRAND.green.r, BRAND.green.g, BRAND.green.b);
        pdf.rect(0, 0, pageWidth, coverGreenHeight, 'F');

        // Subtle diagonal accent line
        pdf.setDrawColor(BRAND.gold.r, BRAND.gold.g, BRAND.gold.b);
        pdf.setLineWidth(0.8);
        pdf.line(0, coverGreenHeight - 1, pageWidth, coverGreenHeight - 1);

        // Logo - centered, large
        if (logoBase64) {
          try {
            const logoW = 50;
            const logoH = 28;
            pdf.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, 35, logoW, logoH);
          } catch (e) {
            console.warn('Could not add logo:', e);
          }
        }

        // Report Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, pageWidth / 2, 85, { align: 'center' });

        // Gold underline below title
        const titleWidth = pdf.getTextWidth(reportTitle);
        pdf.setDrawColor(BRAND.gold.r, BRAND.gold.g, BRAND.gold.b);
        pdf.setLineWidth(1);
        pdf.line((pageWidth - titleWidth) / 2, 88, (pageWidth + titleWidth) / 2, 88);

        // Period
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text(mesRef, pageWidth / 2, 100, { align: 'center' });

        // Client info card (white card on green background)
        const cardX = 25;
        const cardY = 115;
        const cardW = pageWidth - 50;
        const cardH = 42;
        
        // Card shadow effect
        pdf.setFillColor(20, 50, 38);
        pdf.roundedRect(cardX + 1, cardY + 1, cardW, cardH, 3, 3, 'F');
        
        // Card
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'F');

        // Card content
        const cardPadding = 8;
        const leftCol = cardX + cardPadding;
        const rightCol = cardX + cardW / 2 + 5;

        // Left column - Cliente
        pdf.setTextColor(BRAND.green.r, BRAND.green.g, BRAND.green.b);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CLIENTE', leftCol, cardY + 10);

        pdf.setTextColor(BRAND.dark.r, BRAND.dark.g, BRAND.dark.b);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const maxNameLen = 28;
        const nameTrunc = clienteNome.length > maxNameLen ? clienteNome.substring(0, maxNameLen) + '...' : clienteNome;
        pdf.text(nameTrunc, leftCol, cardY + 16);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(BRAND.medium.r, BRAND.medium.g, BRAND.medium.b);
        pdf.text(`CNPJ: ${formatCNPJ(clienteCNPJ)}`, leftCol, cardY + 22);
        
        const maxEndLen = 38;
        const endTrunc = ucEndereco.length > maxEndLen ? ucEndereco.substring(0, maxEndLen) + '...' : ucEndereco;
        pdf.text(endTrunc, leftCol, cardY + 28);

        // Vertical divider
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.3);
        pdf.line(cardX + cardW / 2, cardY + 7, cardX + cardW / 2, cardY + cardH - 7);

        // Right column - UC
        pdf.setTextColor(BRAND.green.r, BRAND.green.g, BRAND.green.b);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text('UNIDADE CONSUMIDORA', rightCol, cardY + 10);

        pdf.setTextColor(BRAND.dark.r, BRAND.dark.g, BRAND.dark.b);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`UC ${ucNumero}`, rightCol, cardY + 16);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(BRAND.medium.r, BRAND.medium.g, BRAND.medium.b);
        pdf.text(`Distribuidora: ${ucDistribuidora}`, rightCol, cardY + 22);
        
        const demandaStr = ucDemandaContratada > 0 ? `${ucDemandaContratada} kW` : '-';
        pdf.text(`${ucGrupoTarifario} | ${ucModalidade} | ${demandaStr}`, rightCol, cardY + 28);

        // Gold accent tag
        const tagY = cardY + 33;
        pdf.setFillColor(BRAND.gold.r, BRAND.gold.g, BRAND.gold.b);
        pdf.roundedRect(rightCol, tagY, 45, 5, 1, 1, 'F');
        pdf.setTextColor(BRAND.dark.r, BRAND.dark.g, BRAND.dark.b);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RELATÓRIO PERSONALIZADO', rightCol + 2, tagY + 3.5);

        // Bottom section (below green)
        const bottomY = coverGreenHeight + 10;
        
        pdf.setTextColor(BRAND.medium.r, BRAND.medium.g, BRAND.medium.b);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Gerado em ${dataGeracao}`, pageWidth / 2, bottomY, { align: 'center' });

        pdf.setTextColor(BRAND.dark.r, BRAND.dark.g, BRAND.dark.b);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Este relatório apresenta uma visão consolidada do consumo de energia,', pageWidth / 2, bottomY + 10, { align: 'center' });
        pdf.text('geração solar, créditos de assinatura e oportunidades de economia.', pageWidth / 2, bottomY + 16, { align: 'center' });

        // Confidentiality notice
        pdf.setFontSize(7);
        pdf.setTextColor(BRAND.light.r, BRAND.light.g, BRAND.light.b);
        pdf.text('Documento confidencial - uso exclusivo do destinatário', pageWidth / 2, bottomY + 30, { align: 'center' });

        // Footer on cover
        drawFooter(1);
      };

      // ========== HEADER (content pages) ==========
      const drawContentHeader = (pageNum: number) => {
        // Top bar - green
        pdf.setFillColor(BRAND.green.r, BRAND.green.g, BRAND.green.b);
        pdf.rect(0, 0, pageWidth, 14, 'F');
        
        // Logo (small)
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, 'PNG', margin.left, 2, 18, 10);
          } catch (e) {
            console.warn('Could not add logo:', e);
          }
        }
        
        // Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, margin.left + 22, 9);
        
        // Right side info
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(mesRef, pageWidth - margin.right, 7, { align: 'right' });
        pdf.setFontSize(6);
        pdf.text(`Página ${pageNum}/${totalPages}`, pageWidth - margin.right, 11, { align: 'right' });

        // Gold accent line
        pdf.setFillColor(BRAND.gold.r, BRAND.gold.g, BRAND.gold.b);
        pdf.rect(0, 14, pageWidth, 1.2, 'F');

        // Info strip (light bg)
        pdf.setFillColor(BRAND.cardBg.r, BRAND.cardBg.g, BRAND.cardBg.b);
        pdf.rect(0, 15.2, pageWidth, 12, 'F');

        pdf.setTextColor(BRAND.dark.r, BRAND.dark.g, BRAND.dark.b);
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        const nameTrunc2 = clienteNome.length > 30 ? clienteNome.substring(0, 30) + '...' : clienteNome;
        pdf.text(nameTrunc2, margin.left, 22);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(BRAND.medium.r, BRAND.medium.g, BRAND.medium.b);
        pdf.setFontSize(7);
        pdf.text(`UC ${ucNumero}  |  ${ucDistribuidora}  |  ${ucGrupoTarifario} ${ucModalidade}`, margin.left, 25.5);

        // Bottom border
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(0, 27.2, pageWidth, 27.2);
      };

      // ========== FOOTER ==========
      const drawFooter = (pageNum: number) => {
        const footerY = pageHeight - footerHeight;
        
        // Top line
        pdf.setDrawColor(BRAND.gold.r, BRAND.gold.g, BRAND.gold.b);
        pdf.setLineWidth(0.5);
        pdf.line(margin.left, footerY, pageWidth - margin.right, footerY);

        // Left: company
        pdf.setFontSize(6.5);
        pdf.setTextColor(BRAND.medium.r, BRAND.medium.g, BRAND.medium.b);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`© ${new Date().getFullYear()} ${companyName} — Energia inteligente para o seu negócio`, margin.left, footerY + 5);

        // Right: page number
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(BRAND.green.r, BRAND.green.g, BRAND.green.b);
        pdf.text(`${pageNum} / ${totalPages}`, pageWidth - margin.right, footerY + 5, { align: 'right' });

        pdf.setTextColor(0, 0, 0);
      };

      // ========== BUILD PDF ==========
      
      // Page 1: Cover
      drawCoverPage();

      // Content pages
      const contentStartYForPages = 29; // after header on content pages
      const contentAvailableForPages = pageHeight - contentStartYForPages - footerHeight;

      for (let page = 0; page < contentPages; page++) {
        pdf.addPage();
        
        const pageNum = page + 2; // +2 because cover is page 1
        drawContentHeader(pageNum);
        drawFooter(pageNum);

        // Calculate which portion of the image to render
        const sourceY = (page * contentAvailableForPages / scale) * captureScale;
        const sourceHeight = Math.min(
          (contentAvailableForPages / scale) * captureScale,
          imgHeight - sourceY
        );
        
        if (sourceHeight <= 0) continue;

        // Create slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = Math.ceil(sourceHeight);
        
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0, sourceY,
            imgWidth, sourceHeight,
            0, 0,
            imgWidth, sourceHeight
          );
          
          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const actualContentWidth = contentWidth * reductionFactor;
          const renderHeight = Math.min(contentAvailableForPages, (sourceHeight / captureScale) * scale);
          const xOffset = margin.left + (contentWidth - actualContentWidth) / 2;
          
          pdf.addImage(
            sliceImgData, 
            'PNG', 
            xOffset, 
            contentStartYForPages, 
            actualContentWidth, 
            renderHeight
          );
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
