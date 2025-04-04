import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        user.status === 'pending' ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-yellow-500 mb-4 flex items-center justify-center">
              <span className="text-white text-2xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold mb-4">Account Pending Approval</h1>
            <p className="mb-4">
              Your account is waiting for approval from a Banson. You'll gain access
              to all Ratatoing Nation features once approved.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Check Status
            </button>
          </div>
        ) : (
          <Component />
        )
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
