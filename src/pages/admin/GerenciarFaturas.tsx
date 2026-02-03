import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFaturas, useDeleteFatura, FaturaMensal } from '@/hooks/useFaturas';
import { useUnidadesConsumidoras } from '@/hooks/useUnidadesConsumidoras';
import { useClientes } from '@/hooks/useClientes';
import { Trash2, Edit, Search, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function GerenciarFaturas() {
  const navigate = useNavigate();
  const { data: faturas, isLoading: loadingFaturas } = useFaturas();
  const { data: ucs } = useUnidadesConsumidoras();
  const { data: clientes } = useClientes();
  const deleteFatura = useDeleteFatura();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterUc, setFilterUc] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [faturaToDelete, setFaturaToDelete] = useState<FaturaMensal | null>(null);

  const getUcInfo = (ucId: string) => {
    const uc = ucs?.find(u => u.id === ucId);
    if (!uc) return { numero: 'N/A', cliente: 'N/A' };
    const cliente = clientes?.find(c => c.id === uc.cliente_id);
    return { numero: uc.numero, cliente: cliente?.nome || 'N/A' };
  };

  const formatMesRef = (mesRef: string) => {
    try {
      // Parse usando date-fns para evitar problemas de timezone
      const [year, month] = mesRef.split('-').map(Number);
      const date = new Date(year, month - 1, 1); // month é 0-indexed
      return format(date, 'MMM/yyyy', { locale: ptBR }).toUpperCase();
    } catch {
      return mesRef;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fechado':
        return <Badge variant="default" className="bg-green-600">Fechado</Badge>;
      case 'rascunho':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'critico':
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredFaturas = faturas?.filter(fatura => {
    const ucInfo = getUcInfo(fatura.uc_id);
    const matchesSearch = 
      ucInfo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ucInfo.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fatura.mes_ref.includes(searchTerm);
    
    const matchesUc = filterUc === 'all' || fatura.uc_id === filterUc;
    const matchesStatus = filterStatus === 'all' || fatura.status === filterStatus;

    return matchesSearch && matchesUc && matchesStatus;
  });

  const handleDelete = async () => {
    if (!faturaToDelete) return;
    
    try {
      await deleteFatura.mutateAsync(faturaToDelete.id);
      toast.success('Fatura excluída com sucesso!');
      setFaturaToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir fatura');
      console.error(error);
    }
  };

  const handleEdit = (fatura: FaturaMensal) => {
    // Enriquecer fatura com dados da UC e cliente para o wizard
    const uc = ucs?.find(u => u.id === fatura.uc_id);
    const cliente = uc ? clientes?.find(c => c.id === uc.cliente_id) : undefined;
    
    const faturaEnriquecida = {
      ...fatura,
      unidades_consumidoras: uc ? {
        ...uc,
        clientes: cliente
      } : undefined
    };
    
    navigate('/admin/lancar', { state: { editFatura: faturaEnriquecida } });
  };

  return (
    <DashboardLayout title="Gerenciar Faturas" subtitle="Visualize, edite ou exclua faturas lançadas">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Faturas Lançadas
            </CardTitle>
            <CardDescription>
              {faturas?.length || 0} faturas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por UC, cliente ou mês..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterUc} onValueChange={setFilterUc}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por UC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as UCs</SelectItem>
                  {ucs?.map(uc => (
                    <SelectItem key={uc.id} value={uc.id}>
                      {uc.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loadingFaturas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFaturas?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma fatura encontrada</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês Ref.</TableHead>
                      <TableHead>UC</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Consumo (kWh)</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFaturas?.map((fatura) => {
                      const ucInfo = getUcInfo(fatura.uc_id);
                      const hasAlerts = fatura.alertas && Array.isArray(fatura.alertas) && fatura.alertas.length > 0;
                      
                      return (
                        <TableRow key={fatura.id}>
                          <TableCell className="font-medium">
                            {formatMesRef(fatura.mes_ref)}
                          </TableCell>
                          <TableCell>{ucInfo.numero}</TableCell>
                          <TableCell>{ucInfo.cliente}</TableCell>
                          <TableCell>
                            {fatura.consumo_total_kwh.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(fatura.valor_total)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(fatura.status)}
                              {hasAlerts && (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(fatura)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFaturaToDelete(fatura)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!faturaToDelete} onOpenChange={() => setFaturaToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a fatura de{' '}
              <strong>{faturaToDelete && formatMesRef(faturaToDelete.mes_ref)}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFaturaToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteFatura.isPending}
            >
              {deleteFatura.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
