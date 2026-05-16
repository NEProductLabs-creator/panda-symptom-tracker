import { ReactNode, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import LogEntry from "@/pages/LogEntry";
import MedLibrary from "@/pages/MedLibrary";
import PrintSummary from "@/pages/PrintSummary";
import ExportPDF from "@/pages/ExportPDF";
import Intro, { hasVisited } from "@/pages/Intro";
import MilestonesPage from "@/pages/Milestones";
import Sidebar from "@/components/layout/Sidebar";
import Timeline from "@/pages/Timeline";
import Baseline from "@/pages/Baseline";
import PTECCheckin from "@/pages/PTECCheckin";
import TriggerLogPage from "@/pages/TriggerLog";
import Medications from "@/pages/Medications";

const queryClient = new QueryClient();

const NO_SIDEBAR_ROUTES = ["/print", "/about"];

function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  if (NO_SIDEBAR_ROUTES.includes(location)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}

function Router() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!hasVisited() && location === "/") {
      navigate("/about");
    }
  }, []);

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/log" component={LogEntry} />
        <Route path="/library" component={MedLibrary} />
        <Route path="/print" component={PrintSummary} />
        <Route path="/export" component={ExportPDF} />
        <Route path="/milestones" component={MilestonesPage} />
        <Route path="/ptec" component={PTECCheckin} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/baseline" component={Baseline} />
        <Route path="/triggers" component={TriggerLogPage} />
        <Route path="/medications" component={Medications} />
        <Route path="/about" component={Intro} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
