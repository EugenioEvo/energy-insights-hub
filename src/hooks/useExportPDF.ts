import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  companyName?: string;
  reportTitle?: string;
  mesRef?: string;
  // Dados do Cliente
  clienteNome?: string;
  clienteCNPJ?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  // Dados da UC
  ucNumero?: string;
  ucEndereco?: string;
  ucDistribuidora?: string;
  ucGrupoTarifario?: string;
  ucModalidade?: string;
  ucDemandaContratada?: number;
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
        clienteNome = 'Cliente não informado',
        clienteCNPJ = '-',
        ucNumero = '-',
        ucEndereco = '-',
        ucDistribuidora = '-',
        ucGrupoTarifario = '-',
        ucModalidade = '-',
        ucDemandaContratada = 0,
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
      
      // A4 dimensions
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const marginLeft = 10;
      const marginRight = pageWidth - 10;
      const imgWidth = pageWidth - 20; // Content width with margins
      const headerHeight = 50; // Expanded header for client info
      const footerHeight = 12;
      const contentHeight = pageHeight - headerHeight - footerHeight;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Format CNPJ for display
      const formatCNPJ = (cnpj: string) => {
        if (!cnpj || cnpj === '-') return '-';
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      };

      // Add header function
      const addHeader = (pageNum: number, totalPages: number) => {
        // === FAIXA SUPERIOR (Empresa) - Azul Petróleo ===
        pdf.setFillColor(15, 52, 67);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(companyName, marginLeft, 11);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(reportTitle, marginLeft, 16);
        
        // Data e página (direita)
        pdf.setFontSize(8);
        const dataGeracao = `Gerado: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        pdf.text(dataGeracao, marginRight, 8, { align: 'right' });
        pdf.text(`Página ${pageNum} de ${totalPages}`, marginRight, 13, { align: 'right' });

        // === FAIXA DO CLIENTE - Cinza Claro ===
        pdf.setFillColor(245, 245, 245);
        pdf.rect(0, 18, pageWidth, 22, 'F');
        
        // Linha divisória sutil
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(0, 18, pageWidth, 18);
        
        pdf.setTextColor(33, 33, 33);
        
        // Cliente (esquerda)
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', marginLeft, 25);
        pdf.setFont('helvetica', 'normal');
        pdf.text(clienteNome, marginLeft + 14, 25);
        
        pdf.setFontSize(8);
        pdf.text(`CNPJ: ${formatCNPJ(clienteCNPJ)}`, marginLeft, 30);
        
        // Truncar endereço se muito longo
        const maxEnderecoLength = 70;
        const enderecoTruncado = ucEndereco.length > maxEnderecoLength 
          ? ucEndereco.substring(0, maxEnderecoLength) + '...' 
          : ucEndereco;
        pdf.text(`Endereço: ${enderecoTruncado}`, marginLeft, 35);
        
        // UC (direita)
        const colDireita = pageWidth / 2 + 15;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('UC:', colDireita, 25);
        pdf.setFont('helvetica', 'normal');
        pdf.text(ucNumero, colDireita + 8, 25);
        
        pdf.setFontSize(8);
        pdf.text(`Distribuidora: ${ucDistribuidora}`, colDireita, 30);
        
        // Info tarifária
        const demandaFormatada = ucDemandaContratada > 0 ? `${ucDemandaContratada} kW` : '-';
        pdf.text(`Grupo: ${ucGrupoTarifario} | ${ucModalidade} | Demanda: ${demandaFormatada}`, colDireita, 35);

        // === FAIXA DE PERÍODO - Amarelo Dourado ===
        pdf.setFillColor(196, 167, 78);
        pdf.rect(0, 40, pageWidth, 8, 'F');
        
        pdf.setTextColor(33, 33, 33);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Período de Referência: ${mesRef}`, pageWidth / 2, 45.5, { align: 'center' });
        
        // Linha de separação final
        pdf.setDrawColor(180, 150, 60);
        pdf.setLineWidth(0.5);
        pdf.line(0, 48, pageWidth, 48);
        
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
