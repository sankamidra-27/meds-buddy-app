import { useState } from "react";
import Onboarding from "@/components/Onboarding";
import PatientDashboard from "@/components/PatientDashboard";
import CaretakerDashboard from "@/components/CaretakerDashboard";
import Signup from "@/components/Signup";
import Login from "@/components/login";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type UserType = "patient" | "caretaker" | null;

const Index = () => {
  const [authPage, setAuthPage] = useState<"signup" | "login">("signup");
  const [userType, setUserType] = useState<UserType>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const handleOnboardingComplete = (type: UserType) => {
    setUserType(type);
    setIsOnboarded(true);
  };

  const handleLogin = (role: string) => {
    setUserType(role === "patient" ? "patient" : "caretaker");
    setIsOnboarded(true);
  };

  if (!userType || !isOnboarded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-green-500 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          {authPage === "signup" ? (
            <Signup onSignupSuccess={() => setAuthPage("login")} />
          ) : (
            <Login onLoginSuccess={handleLogin} />
          )}
          <p className="text-center text-sm text-gray-600 mt-4">
            {authPage === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setAuthPage("login")}
                  className="text-blue-600 underline hover:text-blue-800 font-semibold"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don’t have an account?{" "}
                <button
                  onClick={() => setAuthPage("signup")}
                  className="text-blue-600 underline hover:text-blue-800 font-semibold"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                MediCare Companion
              </h1>
              <p className="text-sm text-muted-foreground">
                {userType === "patient" ? "Patient View" : "Caretaker View"}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setUserType(null);
              setIsOnboarded(false);
              localStorage.removeItem("token");
            }}
            className="flex items-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {userType === "patient" ? <PatientDashboard /> : <CaretakerDashboard />}
      </main>
    </div>
  );
};

export default Index;
