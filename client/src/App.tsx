import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { LandProvider, useLand } from "@/contexts/LandContext";
import { LandSwitcher } from "@/components/land-switcher";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { GlobalTranslationLoader } from "@/components/GlobalTranslationLoader";

// Pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Weather from "@/pages/weather";
import Predictions from "@/pages/predictions";
import Lands from "@/pages/lands";
import Chat from "@/pages/chat";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function AppHeader() {
  const [location] = useLocation();
  const { lands, selectedLand, setSelectedLand } = useLand();
  
  // Pages that should show the land switcher
  const landSwitcherPages = ['/', '/weather', '/predictions', '/chat'];
  const showLandSwitcher = landSwitcherPages.includes(location);

  return (
    <header className="flex items-center justify-between p-3 border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger 
          data-testid="button-sidebar-toggle" 
          className="hover:bg-primary/10 transition-colors duration-200" 
        />
        {showLandSwitcher && (
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary/30 rounded-full"></div>
            <LandSwitcher 
              lands={lands}
              selectedLand={selectedLand}
              onLandChange={setSelectedLand}
            />
          </div>
        )}
      </div>
      {/* Optional: Add a subtle gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
    </header>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Custom sidebar width for agricultural application
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <>
      {isLoading || !isAuthenticated ? (
        <Switch>
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </Switch>
      ) : (
        <LandProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
              <AppHeader />
                <main className="flex-1 overflow-y-auto">
                  <Switch>
                    <Route path="/" component={Home} />
                    <Route path="/weather" component={Weather} />
                    <Route path="/predictions" component={Predictions} />
                    <Route path="/lands" component={Lands} />
                    <Route path="/chat" component={Chat} />
                    <Route path="/profile" component={Profile} />
                    <Route component={NotFound} />
                  </Switch>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </LandProvider>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <TooltipProvider>
          <GlobalTranslationLoader />
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </TranslationProvider>
    </QueryClientProvider>
  );
}

export default App;
