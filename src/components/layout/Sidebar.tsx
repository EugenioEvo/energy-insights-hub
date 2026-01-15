import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  Sun, 
  FileText, 
  Settings, 
  PlusCircle,
  Building2,
  LogOut,
  FileSearch,
  Factory,
  DollarSign
} from 'lucide-react';
import { useEnergy } from '@/contexts/EnergyContext';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Visão Executiva', href: '/', icon: LayoutDashboard },
  { name: 'Energia & Fatura', href: '/energia', icon: Zap },
  { name: 'Solar', href: '/solar', icon: Sun },
  { name: 'Assinatura', href: '/assinatura', icon: FileText },
];

const adminNavigation = [
  { name: 'Lançar Dados', href: '/admin/lancar', icon: PlusCircle },
  { name: 'Gerenciar Faturas', href: '/admin/faturas', icon: FileSearch },
  { name: 'Clientes', href: '/admin/clientes', icon: Building2 },
  { name: 'Usinas Remotas', href: '/admin/usinas', icon: Factory },
  { name: 'Tarifas', href: '/admin/tarifas', icon: DollarSign },
];

export function Sidebar() {
  const location = useLocation();
  const { user, cliente } = useEnergy();
  const isAdmin = user.role === 'admin';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Zap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-bold text-sidebar-foreground">Evolight</span>
            <span className="block text-xs text-sidebar-foreground/60">Gestão de Energia</span>
          </div>
        </div>

        {/* Cliente Info */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Cliente</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {cliente?.nome || 'Nenhum cliente selecionado'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Dashboard
          </p>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'nav-link',
                  isActive && 'active'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <p className="px-3 mt-6 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Administração
              </p>
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'nav-link',
                      isActive && 'active'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-medium">
              {user.nome.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.nome}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
            <button className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
