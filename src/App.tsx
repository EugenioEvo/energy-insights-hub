import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EnergyProvider } from "@/contexts/EnergyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import EnergiaFatura from "./pages/EnergiaFatura";
import Solar from "./pages/Solar";
import Assinatura from "./pages/Assinatura";
import LancarDados from "./pages/admin/LancarDados";
import Clientes from "./pages/admin/Clientes";
import GerenciarFaturas from "./pages/admin/GerenciarFaturas";
import UsinasRemotas from "./pages/admin/UsinasRemotas";
import Tarifas from "./pages/admin/Tarifas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes - Cliente e Admin */}
            <Route path="/" element={
              <ProtectedRoute>
                <EnergyProvider>
                  <ExecutiveDashboard />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/energia" element={
              <ProtectedRoute>
                <EnergyProvider>
                  <EnergiaFatura />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/solar" element={
              <ProtectedRoute>
                <EnergyProvider>
                  <Solar />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/assinatura" element={
              <ProtectedRoute>
                <EnergyProvider>
                  <Assinatura />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            
            {/* Admin only routes */}
            <Route path="/admin/lancar" element={
              <ProtectedRoute requireAdmin>
                <EnergyProvider>
                  <LancarDados />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/admin/clientes" element={
              <ProtectedRoute requireAdmin>
                <EnergyProvider>
                  <Clientes />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/admin/faturas" element={
              <ProtectedRoute requireAdmin>
                <EnergyProvider>
                  <GerenciarFaturas />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/admin/usinas" element={
              <ProtectedRoute requireAdmin>
                <EnergyProvider>
                  <UsinasRemotas />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            <Route path="/admin/tarifas" element={
              <ProtectedRoute requireAdmin>
                <EnergyProvider>
                  <Tarifas />
                </EnergyProvider>
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
