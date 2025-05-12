import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import { useAuth } from "./contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-blue-100">
                <div className="text-center p-8 bg-white rounded-xl shadow-xl">
                    <svg
                        className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <p className="text-xl text-gray-700 font-medium">Loading...</p>
                    <p className="text-gray-500 mt-2">Please wait while we verify your authentication</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const AppRouter = () => {
    return (
        <Router>
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                        path="/lobby"
                        element={
                            <ProtectedRoute>
                                <LobbyPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/game/:gameId"
                        element={
                            <ProtectedRoute>
                                <GamePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/leaderboard"
                        element={
                            <ProtectedRoute>
                                <LeaderboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
};

export default AppRouter;
