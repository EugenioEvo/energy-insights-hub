import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  created_at: string;
  role?: 'admin' | 'cliente';
  clientes_vinculados?: string[];
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'cliente';
}

export interface UserClienteVinculo {
  id: string;
  user_id: string;
  cliente_id: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch vinculos
      const { data: vinculos, error: vinculosError } = await supabase
        .from('user_cliente_vinculo')
        .select('*');

      if (vinculosError) throw vinculosError;

      // Merge data
      const users: UserProfile[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userVinculos = vinculos?.filter(v => v.user_id === profile.user_id) || [];
        
        return {
          ...profile,
          role: (userRole?.role as 'admin' | 'cliente') || 'cliente',
          clientes_vinculados: userVinculos.map(v => v.cliente_id),
        };
      });

      return users;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'cliente' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useAddUserClienteVinculo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, clienteId }: { userId: string; clienteId: string }) => {
      const { error } = await supabase
        .from('user_cliente_vinculo')
        .insert({ user_id: userId, cliente_id: clienteId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveUserClienteVinculo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, clienteId }: { userId: string; clienteId: string }) => {
      const { error } = await supabase
        .from('user_cliente_vinculo')
        .delete()
        .eq('user_id', userId)
        .eq('cliente_id', clienteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
