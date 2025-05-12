import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { apiService } from "../services/api";

interface IncomingUser {
    userId: number;
    username: string;
    wins?: number; // Make stats optional as profile might not return them initially
    losses?: number;
}

// Define the user type
interface User {
    id: number;
    username: string;
    wins: number;
    losses: number;
}

// Define the auth context state
interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    error: string | null;
    refreshUserData: () => Promise<void>;
}

const transformIncomingUser = (incoming: IncomingUser | null): User | null => {
    if (!incoming) {
        return null;
    }
    // If the incoming data ALREADY has 'id', use it directly
    if ("id" in incoming && typeof (incoming as any).id === "number") {
        return incoming as User;
    }
    // Perform the transformation from userId -> id
    return {
        id: incoming.userId,
        username: incoming.username,
        wins: incoming.wins ?? 0,
        losses: incoming.losses ?? 0,
    };
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserProfile = async (_authToken: string): Promise<User | null> => {
        try {
            const response = await apiService.auth.getProfile();
            const incomingUserData = response.data as IncomingUser;
            return transformIncomingUser(incomingUserData);
        } catch (err: any) {
            console.error("Error fetching user profile:", err);

            if (err.response?.status === 401) {
                // Token expired or invalid
                return null;
            } else if (!navigator.onLine) {
                // Handle offline state
                throw new Error("Network is offline. Please check your connection.");
            } else {
                throw new Error(err.response?.data?.message ?? "Failed to fetch user profile");
            }
        }
    };

    // Check for token on mount
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const storedToken = localStorage.getItem("token");
                if (!storedToken) {
                    setLoading(false);
                    return;
                }

                setToken(storedToken);

                const userData = await fetchUserProfile(storedToken);

                if (userData) {
                    setUser(userData);
                    setIsAuthenticated(true);
                } else {
                    // Invalid token, clean up
                    logout();
                }
            } catch (err: any) {
                // Don't log out automatically on network errors
                if (navigator.onLine) {
                    logout();
                } else {
                    setError("Network is offline. Using cached authentication data.");
                }
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Refresh user data
    const refreshUserData = async (): Promise<void> => {
        if (!token || !isAuthenticated) {
            return;
        }

        try {
            const userData = await fetchUserProfile(token);
            if (userData) {
                setUser(userData);
            }
        } catch (err: any) {
            console.error("Failed to refresh user data:", err);
        }
    };

    const login = async (username: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            if (!navigator.onLine) {
                throw new Error("Network is offline. Please check your connection.");
            }

            const response = await apiService.auth.login(username, password);
            const { access_token, user: incomingUser } = response.data as { access_token: string; user: IncomingUser };

            localStorage.setItem("token", access_token);
            setToken(access_token);

            const transformedUser = transformIncomingUser(incomingUser);
            setUser(transformedUser);

            if (transformedUser) {
                setIsAuthenticated(true);
            } else {
                logout();
                throw new Error("Login succeeded but user data was invalid.");
            }
        } catch (err: any) {
            const errorMessage = !navigator.onLine
                ? "Network is offline. Please check your connection."
                : err.response?.status === 401
                ? "Invalid username or password"
                : err.response?.data?.message ?? "Failed to login. Please try again later.";

            setError(errorMessage);
            logout();
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (username: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            if (!navigator.onLine) {
                throw new Error("Network is offline. Please check your connection.");
            }

            await apiService.auth.register(username, password);
            // Registration successful, but don't login automatically
        } catch (err: any) {
            const errorMessage = !navigator.onLine
                ? "Network is offline. Please check your connection."
                : err.response?.status === 409
                ? "Username already exists"
                : err.response?.data?.message ?? "Failed to register. Please try again later.";

            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");

        // Reset auth state
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
    };

    const contextValue = React.useMemo<AuthContextType>(
        () => ({
            isAuthenticated,
            user,
            token,
            login,
            register,
            logout,
            loading,
            error,
            refreshUserData,
        }),
        [isAuthenticated, user, token, login, register, logout, loading, error, refreshUserData]
    );

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
