import { Link } from "react-router-dom";

const HomePage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-600 mb-2">FER Tic-Tac-Toe</h1>
                    <p className="text-gray-600 mb-8">Welcome to the ultimate online Tic-Tac-Toe experience!</p>

                    <div className="relative mb-12">
                        <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                            {[..."XOX", ..."OXO", ..."XOX"].map((symbol, index) => (
                                <div
                                    key={index}
                                    className={`h-16 w-16 flex items-center justify-center text-2xl font-bold rounded-md border-2 border-gray-300 
                                    ${symbol === "X" ? "text-blue-500" : "text-red-500"}`}
                                >
                                    {symbol}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        to="/login"
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white text-center rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300 font-medium"
                    >
                        Login
                    </Link>
                    <Link
                        to="/register"
                        className="flex-1 px-6 py-3 bg-green-600 text-white text-center rounded-lg shadow-md hover:bg-green-700 transition-colors duration-300 font-medium"
                    >
                        Register
                    </Link>
                </div>

                <div className="text-center text-gray-500 text-sm mt-8">
                    Play against friends, track your stats, and climb the leaderboard!
                </div>
            </div>
        </div>
    );
};

export default HomePage;
