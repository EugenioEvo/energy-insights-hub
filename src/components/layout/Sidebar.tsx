import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  Sun, 
  FileText, 
  PlusCircle,
  Building2,
  LogOut,
  FileSearch,
  Factory,
  DollarSign,
  Users
} from 'lucide-react';
import { useEnergy } from '@/contexts/EnergyContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import wegenLogo from '@/assets/wegen-logo.png';
import { toast } from 'sonner';

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
  { name: 'Usuários', href: '/admin/usuarios', icon: Users },
  { name: 'Usinas Remotas', href: '/admin/usinas', icon: Factory },
  { name: 'Tarifas', href: '/admin/tarifas', icon: DollarSign },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, cliente } = useEnergy();
  const { isAdmin, signOut } = useAuthContext();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Até logo!');
      navigate('/auth');
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo WeGen */}
        <div className="flex h-16 items-center justify-center px-6 border-b border-sidebar-border">
          <img 
            src={wegenLogo} 
            alt="WeGen" 
            className="h-10 w-auto object-contain brightness-0 invert"
          />
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
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.nome}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {isAdmin ? 'Administrador' : 'Cliente'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
