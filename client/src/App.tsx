import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import DashboardPage from "@/pages/dashboard-page";
import ApprovalsPage from "@/pages/approvals-page";
import EmailPage from "@/pages/email-page";
import HistoryPage from "@/pages/history-page";
import GalleryPage from "@/pages/gallery-page";
import ShopPage from "@/pages/shop-page";
import BankPage from "@/pages/bank-page";
import AdminPage from "@/pages/admin-page";
import ProfilePage from "@/pages/profile-page";
import InventoryPage from "@/pages/inventory-page";
import BackgroundMusic from "@/components/ui/background-music";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/approvals" component={ApprovalsPage} />
      <ProtectedRoute path="/email" component={EmailPage} />
      <ProtectedRoute path="/gallery" component={GalleryPage} />
      <ProtectedRoute path="/shop" component={ShopPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/bank" component={BankPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BackgroundMusic volume={15} />
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
