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

      // Capture entire content as single canvas with high quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      const marginLeft = 8;
      const marginRight = 8;
      const headerHeight = 50;
      const footerHeight = 10;
      const contentWidth = pageWidth - marginLeft - marginRight;
      const contentHeight = pageHeight - headerHeight - footerHeight;

      // Calculate image dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const scale = contentWidth / (imgWidth / 2); // Divide by 2 because of html2canvas scale:2
      const totalContentHeightMm = (imgHeight / 2) * scale;
      
      // Calculate number of pages needed
      const totalPages = Math.ceil(totalContentHeightMm / contentHeight);

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

      // Helper: Add header
      const addHeader = (pageNum: number) => {
        // Green header bar
        pdf.setFillColor(26, 61, 46);
        pdf.rect(0, 0, pageWidth, 16, 'F');
        
        // Logo
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, 'PNG', marginLeft, 2, 20, 11);
          } catch (e) {
            console.warn('Could not add logo:', e);
          }
        }
        
        // Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, marginLeft + 24, 10);
        
        // Date and page number
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        const dataGeracao = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        pdf.text(dataGeracao, pageWidth - marginRight, 7, { align: 'right' });
        pdf.text(`Página ${pageNum}/${totalPages}`, pageWidth - marginRight, 12, { align: 'right' });

        // Client info bar (light gray)
        pdf.setFillColor(248, 248, 248);
        pdf.rect(0, 16, pageWidth, 22, 'F');
        
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(0, 16, pageWidth, 16);
        
        pdf.setTextColor(40, 40, 40);
        
        // Left column - Client info
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', marginLeft, 22);
        pdf.setFont('helvetica', 'normal');
        const clienteNomeTrunc = clienteNome.length > 35 ? clienteNome.substring(0, 35) + '...' : clienteNome;
        pdf.text(clienteNomeTrunc, marginLeft + 13, 22);
        
        pdf.setFontSize(7);
        pdf.text(`CNPJ: ${formatCNPJ(clienteCNPJ)}`, marginLeft, 27);
        
        const maxEndLen = 50;
        const endTrunc = ucEndereco.length > maxEndLen ? ucEndereco.substring(0, maxEndLen) + '...' : ucEndereco;
        pdf.text(`End: ${endTrunc}`, marginLeft, 32);
        
        // Right column - UC info
        const col2 = pageWidth / 2 + 5;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('UC:', col2, 22);
        pdf.setFont('helvetica', 'normal');
        pdf.text(ucNumero, col2 + 7, 22);
        
        pdf.setFontSize(7);
        pdf.text(`Distribuidora: ${ucDistribuidora}`, col2, 27);
        
        const demandaStr = ucDemandaContratada > 0 ? `${ucDemandaContratada} kW` : '-';
        pdf.text(`${ucGrupoTarifario} | ${ucModalidade} | ${demandaStr}`, col2, 32);

        // Period bar (gold)
        pdf.setFillColor(196, 167, 78);
        pdf.rect(0, 38, pageWidth, 7, 'F');
        
        pdf.setTextColor(30, 30, 30);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Período: ${mesRef}`, pageWidth / 2, 43, { align: 'center' });
        
        pdf.setDrawColor(170, 140, 50);
        pdf.setLineWidth(0.3);
        pdf.line(0, 45, pageWidth, 45);
        
        pdf.setTextColor(0, 0, 0);
      };

      // Helper: Add footer
      const addFooter = () => {
        pdf.setFontSize(6);
        pdf.setTextColor(120, 120, 120);
        pdf.text(
          `© ${new Date().getFullYear()} ${companyName} - Relatório gerado automaticamente`,
          pageWidth / 2,
          pageHeight - 4,
          { align: 'center' }
        );
        pdf.setTextColor(0, 0, 0);
      };

      // Render pages
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        addHeader(page + 1);
        addFooter();

        // Calculate which portion of the image to render
        const sourceY = (page * contentHeight / scale) * 2; // *2 for html2canvas scale
        const sourceHeight = Math.min(
          (contentHeight / scale) * 2,
          imgHeight - sourceY
        );
        
        if (sourceHeight <= 0) continue;

        // Create a temporary canvas for this page's slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = Math.ceil(sourceHeight);
        
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0, sourceY, // Source position
            imgWidth, sourceHeight, // Source size
            0, 0, // Destination position
            imgWidth, sourceHeight // Destination size
          );
          
          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const renderHeight = Math.min(contentHeight, (sourceHeight / 2) * scale);
          
          pdf.addImage(
            sliceImgData, 
            'PNG', 
            marginLeft, 
            headerHeight, 
            contentWidth, 
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
