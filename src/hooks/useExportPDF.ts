import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  companyName?: string;
  reportTitle?: string;
  mesRef?: string;
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
        companyName = 'Evolight Energia',
        reportTitle = 'Relatório Executivo de Energia',
        mesRef = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      } = options;

      // Configure html2canvas options
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions
      const imgWidth = 190; // A4 width with margins
      const pageHeight = 297; // A4 height in mm
      const headerHeight = 35; // Header space
      const footerHeight = 15; // Footer space
      const contentHeight = pageHeight - headerHeight - footerHeight;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginLeft = 10;

      // Add header function
      const addHeader = (pageNum: number, totalPages: number) => {
        // Company name / Logo area
        pdf.setFillColor(15, 52, 67); // Azul petróleo
        pdf.rect(0, 0, pageWidth, 25, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(companyName, marginLeft, 12);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(reportTitle, marginLeft, 19);

        // Date and page number on the right
        const dateText = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        pdf.setFontSize(8);
        pdf.text(dateText, pageWidth - marginLeft, 12, { align: 'right' });
        pdf.text(`Período: ${mesRef}`, pageWidth - marginLeft, 17, { align: 'right' });
        pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - marginLeft, 22, { align: 'right' });

        // Accent line
        pdf.setFillColor(196, 167, 78); // Amarelo escuro
        pdf.rect(0, 25, pageWidth, 2, 'F');

        // Reset text color
        pdf.setTextColor(0, 0, 0);
      };

      // Add footer function
      const addFooter = () => {
        pdf.setFontSize(7);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          'Este relatório foi gerado automaticamente pelo sistema de gestão de energia.',
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
        pdf.text(
          `© ${new Date().getFullYear()} ${companyName} - Todos os direitos reservados`,
          pageWidth / 2,
          pageHeight - 4,
          { align: 'center' }
        );
        pdf.setTextColor(0, 0, 0);
      };

      // Calculate total pages
      const totalPages = Math.ceil(imgHeight / contentHeight);

      // Add first page
      let heightLeft = imgHeight;
      let position = headerHeight;
      let currentPage = 1;

      addHeader(currentPage, totalPages);
      pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
      addFooter();
      
      heightLeft -= contentHeight;

      // Add more pages if needed
      while (heightLeft > 0) {
        currentPage++;
        pdf.addPage();
        addHeader(currentPage, totalPages);
        
        position = headerHeight - (imgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', marginLeft, position, imgWidth, imgHeight);
        addFooter();
        
        heightLeft -= contentHeight;
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
