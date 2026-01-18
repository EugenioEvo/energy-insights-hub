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

interface SectionData {
  canvas: HTMLCanvasElement;
  heightMm: number;
}

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

      // A4 dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const marginLeft = 10;
      const marginRight = 10;
      const headerHeight = 52;
      const footerHeight = 12;
      const contentWidth = pageWidth - marginLeft - marginRight;
      const contentHeight = pageHeight - headerHeight - footerHeight;
      const sectionGap = 4;

      // Find sections - look for section elements or direct children
      const sectionElements: HTMLElement[] = [];
      
      // First try to find <section> tags
      const sections = element.querySelectorAll(':scope > section, :scope > div');
      sections.forEach(section => {
        if (section instanceof HTMLElement && section.offsetHeight > 20) {
          sectionElements.push(section);
        }
      });
      
      // If no sections found, use the whole element
      if (sectionElements.length === 0) {
        sectionElements.push(element);
      }

      // Capture each section
      const capturedSections: SectionData[] = [];
      
      for (const section of sectionElements) {
        try {
          const canvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });
          
          // Calculate height in mm (considering scale factor of 2)
          const pixelWidth = canvas.width / 2;
          const pixelHeight = canvas.height / 2;
          const ratio = contentWidth / pixelWidth;
          const heightMm = pixelHeight * ratio;
          
          if (heightMm > 2) { // Skip very small sections
            capturedSections.push({ canvas, heightMm });
          }
        } catch (e) {
          console.warn('Could not capture section:', e);
        }
      }

      // Fallback - capture entire element if nothing was captured
      if (capturedSections.length === 0) {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        
        const pixelWidth = canvas.width / 2;
        const pixelHeight = canvas.height / 2;
        const ratio = contentWidth / pixelWidth;
        const heightMm = pixelHeight * ratio;
        
        capturedSections.push({ canvas, heightMm });
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const formatCNPJ = (cnpj: string) => {
        if (!cnpj || cnpj === '-') return '-';
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      };

      // Calculate total pages
      let tempY = 0;
      let tempPages = 1;
      
      for (const section of capturedSections) {
        const neededHeight = section.heightMm + sectionGap;
        
        if (tempY + neededHeight > contentHeight) {
          // Section doesn't fit - need new page
          if (section.heightMm <= contentHeight) {
            // Section fits on a single page - move to new page
            tempPages++;
            tempY = section.heightMm + sectionGap;
          } else {
            // Section is larger than a page - will need splitting
            const remainingOnCurrentPage = contentHeight - tempY;
            let remaining = section.heightMm - remainingOnCurrentPage;
            tempY = 0;
            
            while (remaining > 0) {
              if (remaining > contentHeight) {
                tempPages++;
                remaining -= contentHeight;
              } else {
                tempPages++;
                tempY = remaining + sectionGap;
                remaining = 0;
              }
            }
          }
        } else {
          tempY += neededHeight;
        }
      }
      
      const totalPages = tempPages;

      // Helper functions
      const addHeader = (pageNum: number) => {
        // Green header bar
        pdf.setFillColor(26, 61, 46);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        
        // Logo
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, 'PNG', marginLeft, 3, 22, 12);
          } catch (e) {
            console.warn('Could not add logo:', e);
          }
        }
        
        // Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, marginLeft + 28, 11);
        
        // Date and page number
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const dataGeracao = `Gerado: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        pdf.text(dataGeracao, pageWidth - marginRight, 8, { align: 'right' });
        pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - marginRight, 13, { align: 'right' });

        // Client info bar (gray)
        pdf.setFillColor(245, 245, 245);
        pdf.rect(0, 18, pageWidth, 24, 'F');
        
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(0, 18, pageWidth, 18);
        
        pdf.setTextColor(33, 33, 33);
        
        // Left column - Client info
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', marginLeft, 25);
        pdf.setFont('helvetica', 'normal');
        const clienteNomeTruncated = clienteNome.length > 40 ? clienteNome.substring(0, 40) + '...' : clienteNome;
        pdf.text(clienteNomeTruncated, marginLeft + 14, 25);
        
        pdf.setFontSize(8);
        pdf.text(`CNPJ: ${formatCNPJ(clienteCNPJ)}`, marginLeft, 31);
        
        const maxEnderecoLength = 55;
        const enderecoTruncado = ucEndereco.length > maxEnderecoLength 
          ? ucEndereco.substring(0, maxEnderecoLength) + '...' 
          : ucEndereco;
        pdf.text(`Endereço: ${enderecoTruncado}`, marginLeft, 37);
        
        // Right column - UC info
        const colDireita = pageWidth / 2 + 10;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('UC:', colDireita, 25);
        pdf.setFont('helvetica', 'normal');
        pdf.text(ucNumero, colDireita + 8, 25);
        
        pdf.setFontSize(8);
        pdf.text(`Distribuidora: ${ucDistribuidora}`, colDireita, 31);
        
        const demandaFormatada = ucDemandaContratada > 0 ? `${ucDemandaContratada} kW` : '-';
        pdf.text(`${ucGrupoTarifario} | ${ucModalidade} | ${demandaFormatada}`, colDireita, 37);

        // Period bar (gold/yellow)
        pdf.setFillColor(196, 167, 78);
        pdf.rect(0, 42, pageWidth, 8, 'F');
        
        pdf.setTextColor(33, 33, 33);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Período de Referência: ${mesRef}`, pageWidth / 2, 47, { align: 'center' });
        
        pdf.setDrawColor(180, 150, 60);
        pdf.setLineWidth(0.5);
        pdf.line(0, 50, pageWidth, 50);
        
        pdf.setTextColor(0, 0, 0);
      };

      const addFooter = () => {
        pdf.setFontSize(7);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          'Relatório gerado automaticamente pelo sistema WeGen de gestão de energia.',
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
        pdf.text(
          `© ${new Date().getFullYear()} ${companyName} - Todos os direitos reservados`,
          pageWidth / 2,
          pageHeight - 3,
          { align: 'center' }
        );
        pdf.setTextColor(0, 0, 0);
      };

      // Render content
      let currentY = 0;
      let currentPage = 1;
      
      addHeader(currentPage);
      addFooter();

      for (let i = 0; i < capturedSections.length; i++) {
        const section = capturedSections[i];
        const imgData = section.canvas.toDataURL('image/png');
        const sectionHeight = section.heightMm;
        
        // Check if section fits on current page
        if (currentY + sectionHeight > contentHeight) {
          // Section doesn't fit
          if (sectionHeight <= contentHeight) {
            // Section fits on a single page - move to new page
            currentPage++;
            pdf.addPage();
            addHeader(currentPage);
            addFooter();
            currentY = 0;
          }
          // If section is larger than page, we'll handle it below
        }
        
        // Render section (possibly split across pages)
        if (sectionHeight > contentHeight - currentY && sectionHeight > contentHeight) {
          // Large section that needs splitting
          const scale = 2;
          const pixelsPerMm = (section.canvas.width / scale) / contentWidth;
          let sourceY = 0;
          let remainingHeight = sectionHeight;
          
          while (remainingHeight > 0) {
            const availableHeight = contentHeight - currentY;
            const chunkHeight = Math.min(availableHeight, remainingHeight);
            const sourceHeight = chunkHeight * pixelsPerMm * scale;
            
            // Create chunk canvas
            const chunkCanvas = document.createElement('canvas');
            chunkCanvas.width = section.canvas.width;
            chunkCanvas.height = Math.ceil(sourceHeight);
            
            const ctx = chunkCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                section.canvas,
                0, sourceY * pixelsPerMm * scale,
                section.canvas.width, sourceHeight,
                0, 0,
                section.canvas.width, sourceHeight
              );
              
              const chunkImgData = chunkCanvas.toDataURL('image/png');
              pdf.addImage(chunkImgData, 'PNG', marginLeft, headerHeight + currentY, contentWidth, chunkHeight);
            }
            
            sourceY += chunkHeight;
            remainingHeight -= chunkHeight;
            currentY += chunkHeight;
            
            // Add new page if more content
            if (remainingHeight > 0) {
              currentPage++;
              pdf.addPage();
              addHeader(currentPage);
              addFooter();
              currentY = 0;
            }
          }
        } else {
          // Normal section - render directly
          pdf.addImage(imgData, 'PNG', marginLeft, headerHeight + currentY, contentWidth, sectionHeight);
          currentY += sectionHeight + sectionGap;
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
