import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface LocationState {
    message?: string;
}

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const { login, error, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for success message from registration
    useEffect(() => {
        const state = location.state as LocationState;
        if (state?.message) {
            setSuccessMessage(state.message);
            // Clear the location state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setSuccessMessage("");

        try {
            await login(username, password);
            navigate("/lobby");
        } catch (err: any) {
            setFormError(err.response?.data?.message || "Login failed. Please check your credentials.");
            console.error("Login error:", err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-indigo-600">Login</h1>
                    <p className="text-gray-600 mt-2">Welcome back! Please sign in to continue</p>
                </div>

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
                        <div className="flex items-center">
                            <svg
                                className="h-5 w-5 text-green-500 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p>{successMessage}</p>
                        </div>
                    </div>
                )}

                {(formError || error) && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                        <div className="flex items-center">
                            <svg
                                className="h-5 w-5 text-red-500 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            <p>{formError || error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="!text-gray-600 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="Your username"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="!text-gray-600 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="Your password"
                            required
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full flex justify-center items-center px-4 py-3 text-white rounded-lg ${
                            loading ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700"
                        } transition-colors duration-300`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                                Logging in...
                            </>
                        ) : (
                            "Login"
                        )}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <p className="text-gray-600">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="text-indigo-600 font-medium hover:text-indigo-500 transition-colors"
                        >
                            Register
                        </Link>
                    </p>
                </div>
                <div className="mt-4 text-center">
                    <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
