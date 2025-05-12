import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RegisterPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [formError, setFormError] = useState("");
    const { register, error, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        // Basic validation
        if (password !== confirmPassword) {
            setFormError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setFormError("Password must be at least 6 characters");
            return;
        }

        try {
            await register(username, password);
            navigate("/login", { state: { message: "Registration successful! Please log in." } });
        } catch (err: any) {
            setFormError(err.response?.data?.message ?? "Registration failed. Please try again.");
            console.error("Registration error:", err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-green-600">Register</h1>
                    <p className="text-gray-600 mt-2">Create a new account to play Tic-Tac-Toe</p>
                </div>

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
                            className="!text-gray-600 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="Choose a username"
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
                            className="!text-gray-600 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="Create a password"
                            required
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1 ml-1">Password must be at least 6 characters</p>
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="!text-gray-600 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="Confirm your password"
                            required
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full flex justify-center items-center px-4 py-3 text-white rounded-lg ${
                            loading ? "bg-green-400 cursor-wait" : "bg-green-600 hover:bg-green-700"
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
                                Registering...
                            </>
                        ) : (
                            "Register"
                        )}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <p className="text-gray-600">
                        Already have an account?{" "}
                        <Link to="/login" className="text-green-600 font-medium hover:text-green-500 transition-colors">
                            Login
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

export default RegisterPage;
