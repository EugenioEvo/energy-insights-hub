import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';

interface TarifasTableProps {
  tarifas: Tables<'tarifas_concessionaria'>[];
  grupoTarifario: 'A' | 'B';
}

const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
};

export function TarifasTable({ tarifas, grupoTarifario }: TarifasTableProps) {
  if (tarifas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>Nenhuma tarifa cadastrada para o Grupo {grupoTarifario}</p>
        <p className="text-sm">Clique em "Buscar Tarifas" para atualizar</p>
      </div>
    );
  }

  if (grupoTarifario === 'A') {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Subgrupo</TableHead>
              <TableHead className="w-24">Modalidade</TableHead>
              <TableHead className="text-right">TE Ponta</TableHead>
              <TableHead className="text-right">TE F.Ponta</TableHead>
              <TableHead className="text-right">TUSD Ponta</TableHead>
              <TableHead className="text-right">TUSD F.Ponta</TableHead>
              <TableHead className="text-right">Demanda P</TableHead>
              <TableHead className="text-right">Demanda FP</TableHead>
              <TableHead className="text-right">Dem. Única</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tarifas.map((tarifa) => (
              <TableRow key={tarifa.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {tarifa.subgrupo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={tarifa.modalidade === 'Verde' ? 'default' : 'secondary'}
                    className={tarifa.modalidade === 'Verde' ? 'bg-green-500' : 'bg-blue-500'}
                  >
                    {tarifa.modalidade}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.te_ponta_rs_kwh)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.te_fora_ponta_rs_kwh)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.tusd_ponta_rs_kwh)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.tusd_fora_ponta_rs_kwh)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.demanda_ponta_rs_kw)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.demanda_fora_ponta_rs_kw)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tarifa.demanda_unica_rs_kw)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Grupo B - Tabela simplificada
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Subgrupo</TableHead>
            <TableHead className="w-32">Classe</TableHead>
            <TableHead className="text-right">TE (R$/kWh)</TableHead>
            <TableHead className="text-right">TUSD (R$/kWh)</TableHead>
            <TableHead className="text-right">Total (R$/kWh)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tarifas.map((tarifa) => {
            const teUnica = tarifa.te_unica_rs_kwh || 0;
            const tusdUnica = tarifa.tusd_unica_rs_kwh || 0;
            const total = teUnica + tusdUnica;

            return (
              <TableRow key={tarifa.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {tarifa.subgrupo}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tarifa.modalidade}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(teUnica)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(tusdUnica)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {formatCurrency(total)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
