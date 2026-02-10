import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest } from "./queryClient";

interface User {
    id: string;
    username: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check auth status on mount
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            })
            .catch(() => { })
            .finally(() => setIsLoading(false));
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const res = await apiRequest("POST", "/api/auth/login", { username, password });
        const data = await res.json();
        setUser(data);
    }, []);

    const register = useCallback(async (username: string, password: string) => {
        const res = await apiRequest("POST", "/api/auth/register", { username, password });
        const data = await res.json();
        setUser(data);
    }, []);

    const logout = useCallback(async () => {
        await apiRequest("POST", "/api/auth/logout");
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
