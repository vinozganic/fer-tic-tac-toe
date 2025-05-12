import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

const LobbyPage = () => {
    const [gameCode, setGameCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const { user, logout } = useAuth();
    const { isConnected, error: socketError, startGame, joinGame, currentGame, clearGameState } = useSocket();

    const navigate = useNavigate();

    // Clear any existing game state when entering the lobby
    useEffect(() => {
        clearGameState();
    }, []);

    // Navigate to game when game state is available
    useEffect(() => {
        if (currentGame.gameId) {
            navigate(`/game/${currentGame.gameId}`);
        }
    }, [currentGame.gameId, navigate]);

    // Update error message when socket error changes
    useEffect(() => {
        if (socketError) {
            setErrorMessage(socketError);
            setTimeout(() => setErrorMessage(""), 5000);
        }
    }, [socketError]);

    const handleStartGame = () => {
        if (!isConnected) {
            setErrorMessage("Socket not connected. Please try again.");
            return;
        }

        setSuccessMessage("Creating new game...");
        startGame();
    };

    const handleJoinGame = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected) {
            setErrorMessage("Socket not connected. Please try again.");
            return;
        }

        if (!gameCode) {
            setErrorMessage("Please enter a game code");
            return;
        }

        setSuccessMessage(`Joining game ${gameCode}...`);
        joinGame(gameCode);
    };

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-100 p-6">
            <div className="max-w-[80%] mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white rounded-xl p-6 shadow-md">
                    <h1 className="text-3xl font-bold text-indigo-600 mb-4 md:mb-0">Game Lobby</h1>
                    {user && (
                        <div className="!text-gray-600 bg-indigo-50 px-6 py-3 rounded-lg flex flex-col md:flex-row items-center">
                            <div className="flex items-center mb-2 md:mb-0 md:mr-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold mr-2">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold">{user.username}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="mr-3 text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">
                                    <span className="font-bold">{user.wins}</span> wins
                                </div>
                                <div className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-800">
                                    <span className="font-bold">{user.losses}</span> losses
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Connection status */}
                <div className="flex items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
                    <div className={`h-3 w-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span className={`text-sm ${isConnected ? "text-green-700" : "text-red-700"}`}>
                        {isConnected ? "Connected to game server" : "Disconnected from game server"}
                    </span>
                </div>

                {/* Error and success messages */}
                {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
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
                            <p>{errorMessage}</p>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-lg shadow-sm">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 mx-auto bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mb-4">
                                <svg
                                    className="h-8 w-8 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Start New Game</h2>
                            <p className="text-gray-600 mb-6">Create a new game and invite a friend to play</p>
                        </div>
                        <button
                            onClick={handleStartGame}
                            className={`w-full px-6 py-4 text-lg font-medium text-white rounded-lg shadow-md
                                ${
                                    isConnected
                                        ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200"
                                        : "bg-gray-400 cursor-not-allowed"
                                } transition-all duration-300`}
                            disabled={!isConnected}
                        >
                            Start New Game
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <svg
                                    className="h-8 w-8 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Game</h2>
                            <p className="text-gray-600 mb-6">Enter a game code to join an existing game</p>
                        </div>
                        <form onSubmit={handleJoinGame} className="space-y-4">
                            <div>
                                <label htmlFor="gameCode" className="sr-only">
                                    Game Code
                                </label>
                                <input
                                    type="text"
                                    id="gameCode"
                                    value={gameCode}
                                    onChange={e => setGameCode(e.target.value.toUpperCase())}
                                    className="!text-gray-600 w-full px-5 py-4 text-center text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition-colors"
                                    placeholder="ENTER CODE"
                                    maxLength={6}
                                    required
                                    disabled={!isConnected}
                                />
                            </div>
                            <button
                                type="submit"
                                className={`w-full px-6 py-4 text-lg font-medium text-white rounded-lg shadow-md
                                    ${
                                        isConnected && gameCode
                                            ? "bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-200"
                                            : "bg-gray-400 cursor-not-allowed"
                                    } transition-all duration-300`}
                                disabled={!isConnected || !gameCode}
                            >
                                Join Game
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md">
                    <Link
                        to="/leaderboard"
                        className="w-full md:w-auto px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300 flex items-center justify-center"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                        View Leaderboard
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full md:w-auto px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-300 flex items-center justify-center"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LobbyPage;
