import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnergyProvider } from "@/contexts/EnergyContext";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import EnergiaFatura from "./pages/EnergiaFatura";
import Solar from "./pages/Solar";
import Assinatura from "./pages/Assinatura";
import LancarDados from "./pages/admin/LancarDados";
import Clientes from "./pages/admin/Clientes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EnergyProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ExecutiveDashboard />} />
            <Route path="/energia" element={<EnergiaFatura />} />
            <Route path="/solar" element={<Solar />} />
            <Route path="/assinatura" element={<Assinatura />} />
            <Route path="/admin/lancar" element={<LancarDados />} />
            <Route path="/admin/clientes" element={<Clientes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EnergyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
