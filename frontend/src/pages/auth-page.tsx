import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Gem, Eye, EyeOff, ArrowRight, UserPlus, LogIn } from "lucide-react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, register } = useAuth();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await login(username, password);
            } else {
                await register(username, password);
            }
            toast({
                title: isLogin ? "Welcome back!" : "Account created!",
                description: isLogin
                    ? "You've been logged in successfully."
                    : "Your account has been created and you're now logged in.",
            });
        } catch (error: any) {
            const message = error?.message || "Something went wrong";
            // Extract error message from response
            let errorMsg = "Something went wrong";
            try {
                const parsed = JSON.parse(message.split(": ").slice(1).join(": "));
                errorMsg = parsed.error || errorMsg;
            } catch {
                errorMsg = message;
            }
            toast({
                title: "Error",
                description: errorMsg,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 30%, #2d1b4e 50%, #1a1a3e 70%, #0f0f23 100%)" }}>
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse"
                    style={{ background: "radial-gradient(circle, #e11d48 0%, transparent 70%)", filter: "blur(60px)" }} />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse"
                    style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", filter: "blur(60px)", animationDelay: "1s" }} />
                <div className="absolute top-3/4 left-1/2 w-64 h-64 rounded-full opacity-5 animate-pulse"
                    style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", filter: "blur(40px)", animationDelay: "2s" }} />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo / Brand */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-4 shadow-2xl"
                        style={{ background: "linear-gradient(135deg, #e11d48, #be185d, #7c3aed)" }}>
                        <Gem className="h-10 w-10 text-white drop-shadow-lg" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Ruby AI</h1>
                    <p className="text-white/50 text-sm">Your secure AI assistant</p>
                </div>

                {/* Auth Card */}
                <div className="rounded-2xl border border-white/10 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700"
                    style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                    }}>
                    {/* Tab Toggle */}
                    <div className="flex rounded-xl p-1 mb-8" style={{ background: "rgba(255, 255, 255, 0.06)" }}>
                        <button
                            onClick={() => setIsLogin(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300"
                            style={{
                                background: isLogin ? "linear-gradient(135deg, #e11d48, #7c3aed)" : "transparent",
                                color: isLogin ? "white" : "rgba(255, 255, 255, 0.5)",
                            }}
                        >
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300"
                            style={{
                                background: !isLogin ? "linear-gradient(135deg, #e11d48, #7c3aed)" : "transparent",
                                color: !isLogin ? "white" : "rgba(255, 255, 255, 0.5)",
                            }}
                        >
                            <UserPlus className="h-4 w-4" />
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                minLength={3}
                                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all duration-300 focus:ring-2 focus:ring-pink-500/50"
                                style={{
                                    background: "rgba(255, 255, 255, 0.07)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                                data-testid="input-username"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all duration-300 focus:ring-2 focus:ring-pink-500/50 pr-12"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.07)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                    }}
                                    data-testid="input-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            style={{
                                background: "linear-gradient(135deg, #e11d48, #7c3aed)",
                                boxShadow: "0 4px 20px rgba(225, 29, 72, 0.3)",
                            }}
                            data-testid="button-auth-submit"
                        >
                            {isSubmitting ? (
                                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? "Sign In" : "Create Account"}
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-white/30 text-xs mt-6">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-pink-400 hover:text-pink-300 transition-colors font-medium"
                        >
                            {isLogin ? "Register" : "Sign in"}
                        </button>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-white/20 text-xs mt-6">
                    Your conversations are private and secure
                </p>
            </div>
        </div>
    );
}
