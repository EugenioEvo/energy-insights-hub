import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Shield, Building2, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUsers, useUpdateUserRole, useAddUserClienteVinculo, useRemoveUserClienteVinculo, UserProfile } from '@/hooks/useUsers';
import { useClientes } from '@/hooks/useClientes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Usuarios() {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: clientes, isLoading: loadingClientes } = useClientes();
  const updateRole = useUpdateUserRole();
  const addVinculo = useAddUserClienteVinculo();
  const removeVinculo = useRemoveUserClienteVinculo();
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [vinculoDialogOpen, setVinculoDialogOpen] = useState(false);

  const handleRoleChange = async (userId: string, role: 'admin' | 'cliente') => {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success('Role atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar role');
    }
  };

  const handleToggleCliente = async (userId: string, clienteId: string, isLinked: boolean) => {
    try {
      if (isLinked) {
        await removeVinculo.mutateAsync({ userId, clienteId });
        toast.success('Vínculo removido');
      } else {
        await addVinculo.mutateAsync({ userId, clienteId });
        toast.success('Vínculo adicionado');
      }
    } catch (error) {
      toast.error('Erro ao atualizar vínculo');
    }
  };

  const getClienteNome = (clienteId: string) => {
    return clientes?.find(c => c.id === clienteId)?.nome || 'Cliente não encontrado';
  };

  const isLoading = loadingUsers || loadingClientes;

  return (
    <DashboardLayout title="Gerenciar Usuários" subtitle="Roles e vínculos de clientes">
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/20">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users?.filter(u => u.role === 'admin').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users?.filter(u => u.role === 'cliente').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Clientes Vinculados</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: 'admin' | 'cliente') => 
                            handleRoleChange(user.user_id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="cliente">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Cliente
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.clientes_vinculados?.length ? (
                            user.clientes_vinculados.slice(0, 2).map(clienteId => (
                              <Badge key={clienteId} variant="secondary" className="text-xs">
                                {getClienteNome(clienteId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Nenhum vínculo
                            </span>
                          )}
                          {(user.clientes_vinculados?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(user.clientes_vinculados?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog 
                          open={vinculoDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setVinculoDialogOpen(open);
                            if (open) setSelectedUser(user);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Vínculos
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Gerenciar Vínculos</DialogTitle>
                              <DialogDescription>
                                Selecione os clientes que {selectedUser?.nome} pode acessar
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[400px] pr-4">
                              <div className="space-y-3">
                                {clientes?.map((cliente) => {
                                  const isLinked = selectedUser?.clientes_vinculados?.includes(cliente.id);
                                  return (
                                    <div 
                                      key={cliente.id}
                                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Checkbox
                                          id={cliente.id}
                                          checked={isLinked}
                                          onCheckedChange={() => {
                                            if (selectedUser) {
                                              handleToggleCliente(
                                                selectedUser.user_id,
                                                cliente.id,
                                                !!isLinked
                                              );
                                            }
                                          }}
                                        />
                                        <div>
                                          <label 
                                            htmlFor={cliente.id}
                                            className="font-medium cursor-pointer"
                                          >
                                            {cliente.nome}
                                          </label>
                                          <p className="text-xs text-muted-foreground">
                                            {cliente.cnpj}
                                          </p>
                                        </div>
                                      </div>
                                      {isLinked && (
                                        <Badge variant="default" className="bg-primary/10 text-primary">
                                          Vinculado
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                                {!clientes?.length && (
                                  <p className="text-center text-muted-foreground py-4">
                                    Nenhum cliente cadastrado
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!users?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
