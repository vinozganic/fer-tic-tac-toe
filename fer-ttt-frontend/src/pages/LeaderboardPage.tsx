import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiService } from "../services/api";

type LeaderboardEntry = {
    rank: number;
    id: number;
    username: string;
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
};

const LeaderboardPage = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [limit, setLimit] = useState(10);

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.leaderboard.getLeaderboard(limit);
            setLeaderboard(response.data);
            setLoading(false);
        } catch (err: any) {
            console.error("Error fetching leaderboard:", err);
            setError(err.response?.data?.message ?? "Failed to load leaderboard data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [limit]);

    const handleRefresh = () => {
        fetchLeaderboard();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-100 p-6">
            <div className="max-w-[80%] mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white rounded-xl p-6 shadow-lg">
                    <div>
                        <h1 className="text-3xl font-bold text-indigo-600 mb-2">Leaderboard</h1>
                        <p className="text-gray-600">See who's at the top of the game!</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                        <div className="relative">
                            <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
                                Show Top Players
                            </label>
                            <select
                                id="limit"
                                value={limit}
                                onChange={e => setLimit(Number(e.target.value))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            >
                                <option value={5}>Top 5</option>
                                <option value={10}>Top 10</option>
                                <option value={20}>Top 20</option>
                                <option value={50}>Top 50</option>
                            </select>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="h-10 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-300 flex items-center mt-5"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin h-4 w-4 mr-2"
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
                                    Refreshing...
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                    Refresh
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
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
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {loading && !leaderboard.length ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-lg">
                        <svg
                            className="animate-spin h-12 w-12 text-indigo-600 mb-6"
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
                        <p className="text-lg text-gray-600">Loading leaderboard data...</p>
                    </div>
                ) : leaderboard.length === 0 && !loading ? (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl shadow-lg p-10 text-center">
                        <div className="inline-block p-3 rounded-full bg-yellow-100 mb-4">
                            <svg
                                className="h-10 w-10 text-yellow-700"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <p className="text-xl font-bold text-yellow-800 mb-2">No players found</p>
                        <p className="text-gray-600">Start playing games to appear on the leaderboard!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Rank
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Player
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Wins
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Losses
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Total Games
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Win Rate
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {leaderboard.map(entry => (
                                        <tr
                                            key={entry.id}
                                            className={`${
                                                entry.rank <= 3 ? "bg-gradient-to-r from-yellow-50 to-yellow-100" : ""
                                            } 
                                                       hover:bg-gray-50 transition-colors duration-150`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {entry.rank === 1 ? (
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-yellow-400 text-white font-bold shadow-md">
                                                            1
                                                        </div>
                                                        <div className="">
                                                            <svg
                                                                className="!ml-4 h-5 w-5 text-yellow-500"
                                                                fill="currentColor"
                                                                viewBox="-2 0 26 26"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M10 2a1 1 0 01.894.553l2.991 5.982 6.686.974a1 1 0 01.555 1.705l-4.833 4.708 1.14 6.648a1 1 0 01-1.45 1.054L10 20.591l-5.982 3.133a1 1 0 01-1.45-1.054l1.14-6.648-4.833-4.708a1 1 0 01.555-1.705l6.686-.974 2.991-5.982A1 1 0 0110 2z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                ) : entry.rank === 2 ? (
                                                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-300 text-gray-800 font-bold shadow-md">
                                                        2
                                                    </div>
                                                ) : entry.rank === 3 ? (
                                                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-yellow-700 text-white font-bold shadow-md">
                                                        3
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-600 font-medium ml-3">{entry.rank}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium mr-2">
                                                        {entry.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span
                                                        className={`font-medium ${
                                                            entry.rank <= 3 ? "text-gray-900" : "text-gray-700"
                                                        }`}
                                                    >
                                                        {entry.username}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-green-600 font-medium">{entry.wins}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-red-600">{entry.losses}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-medium text-gray-600">{entry.totalGames}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-20 bg-gray-200 rounded-full h-2.5 mr-2">
                                                        <div
                                                            className={`h-2.5 rounded-full ${
                                                                entry.winRate >= 70
                                                                    ? "bg-green-600"
                                                                    : entry.winRate >= 50
                                                                    ? "bg-blue-600"
                                                                    : entry.winRate >= 30
                                                                    ? "bg-yellow-600"
                                                                    : "bg-red-600"
                                                            }`}
                                                            style={{ width: `${Math.min(100, entry.winRate)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="font-medium text-gray-600">
                                                        {entry.winRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-center">
                    <Link
                        to="/lobby"
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center shadow-md"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                            />
                        </svg>
                        Back to Lobby
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardPage;
