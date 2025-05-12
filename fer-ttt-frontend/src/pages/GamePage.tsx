import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { PlayerSymbol, GameStatus, GameResult, MessageEvent, Position, Player } from "../types/gameTypes";

const GamePage = () => {
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState<MessageEvent[]>([]);
    const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [moveAnimation, setMoveAnimation] = useState<Position | null>(null);
    const [pendingMove, setPendingMove] = useState<Position | null>(null);
    const [winningLineAnimated, setWinningLineAnimated] = useState(false);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [disconnectedPlayerName, setDisconnectedPlayerName] = useState<string | null>(null);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [newMessageNotification, setNewMessageNotification] = useState(false);
    const [currentUserGameOutcome, setCurrentUserGameOutcome] = useState<"WIN" | "LOSS" | "DRAW" | null>(null);

    const messageContainerRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const { gameId } = useParams();
    const {
        currentGame,
        isConnected,
        error: socketError,
        lastMove,
        gameOver,
        winningLine,
        initialMessages,
        makeMove,
        sendMessage,
        leaveGame,
        clearGameState,
        clearInitialMessages,
    } = useSocket();
    const { user, refreshUserData } = useAuth();

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
        if (messages.length > 0) {
            setNewMessageNotification(true);
            const timer = setTimeout(() => setNewMessageNotification(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [messages]);

    useEffect(() => {
        if (socketError) {
            setErrorMessage(socketError);
            const timer = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [socketError]);

    useEffect(() => {
        if (initialMessages && initialMessages.length > 0) {
            console.log("Loading initial chat messages:", initialMessages);
            setMessages(initialMessages);
            clearInitialMessages();
        }
    }, [initialMessages, clearInitialMessages]);

    useEffect(() => {
        const socket = (window as any)._socket;
        if (!socket) return;

        const handleNewMessage = (data: MessageEvent) => {
            console.log("Received new message from opponent:", data);
            setMessages(prev => [...prev, data]);
        };
        socket.on("new_message", handleNewMessage);
        return () => {
            socket.off("new_message", handleNewMessage);
        };
    }, []);

    useEffect(() => {
        if (currentGame.gameState) {
            const xPlayer = currentGame.gameState.players.X;
            const oPlayer = currentGame.gameState.players.O;
            const disconnectedPlayer =
                (xPlayer && !xPlayer.isConnected ? xPlayer : null) ||
                (oPlayer && !oPlayer.isConnected ? oPlayer : null);
            if (disconnectedPlayer && disconnectedPlayer.userId !== user?.id.toString()) {
                setOpponentDisconnected(true);
                setDisconnectedPlayerName(disconnectedPlayer.username);
            } else {
                setOpponentDisconnected(false);
                setDisconnectedPlayerName(null);
            }
        } else {
            setOpponentDisconnected(false);
            setDisconnectedPlayerName(null);
        }
    }, [currentGame.gameState, user]);

    useEffect(() => {
        if (!isConnected || (!currentGame.gameId && !gameId)) {
            console.log("Redirecting to lobby due to disconnection or missing game ID.");
            if (!isConnected && currentGame.gameId) {
                clearGameState();
            }
            navigate("/lobby");
        }
    }, [isConnected, currentGame.gameId, gameId, navigate, clearGameState]);

    useEffect(() => {
        if (lastMove?.position) {
            setMoveAnimation(lastMove.position);
            const timer = setTimeout(() => setMoveAnimation(null), 1500);
            return () => clearTimeout(timer);
        }
    }, [lastMove]);

    useEffect(() => {
        if (currentGame.gameState?.status === GameStatus.WAITING) {
            setWaitingMessage(`Waiting for an opponent to join. Share the code: ${currentGame.gameCode}`);
        } else {
            setWaitingMessage(null);
        }
    }, [currentGame.gameState?.status, currentGame.gameCode]);

    useEffect(() => {
        if (pendingMove && currentGame.gameState?.board) {
            const moveMade = currentGame.gameState.board[pendingMove.row][pendingMove.col] !== null;
            if (moveMade) {
                setPendingMove(null);
            }
        }
    }, [currentGame.gameState?.board, pendingMove]);

    useEffect(() => {
        if (pendingMove) {
            const timeoutId = setTimeout(() => {
                if (pendingMove) {
                    setPendingMove(null);
                    setErrorMessage("Move request timed out. Please try again.");
                }
            }, 5000);
            return () => clearTimeout(timeoutId);
        }
    }, [pendingMove]);

    useEffect(() => {
        if (gameOver && winningLine && winningLine.length > 0) {
            setWinningLineAnimated(false);
            const timer = setTimeout(() => setWinningLineAnimated(true), 500);
            return () => clearTimeout(timer);
        } else {
            setWinningLineAnimated(false);
        }
    }, [gameOver, winningLine]);

    useEffect(() => {
        if (user && currentGame.gameState && currentGame.gameState.status === GameStatus.COMPLETED) {
            const { result, players } = currentGame.gameState;
            const userIdString = user.id.toString();

            if (result === GameResult.DRAW) {
                setCurrentUserGameOutcome("DRAW");
            } else if (
                (result === GameResult.X_WON && players.X?.userId === userIdString) ||
                (result === GameResult.O_WON && players.O?.userId === userIdString)
            ) {
                setCurrentUserGameOutcome("WIN");
            } else {
                // If it's not a draw and the current user didn't win, it's a loss,
                if (players.X?.userId === userIdString || players.O?.userId === userIdString) {
                    setCurrentUserGameOutcome("LOSS");
                } else {
                    // User is not a player in this completed game
                    setCurrentUserGameOutcome(null);
                }
            }
        } else if (currentGame.gameState?.status !== GameStatus.COMPLETED) {
            // Reset if game is not completed or game state changes
            setCurrentUserGameOutcome(null);
        }
    }, [currentGame.gameState, user]);

    const handleCellClick = (row: number, col: number) => {
        if (!isValidMove(row, col) || pendingMove || gameOver) {
            return;
        }
        setPendingMove({ row, col });
        makeMove(row, col).catch(err => {
            console.error("Failed to make move:", err);
            setErrorMessage(err.message || "Failed to make move.");
            setPendingMove(null);
        });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && !isSendingMessage && user && isConnected && currentGame.gameId && !gameOver) {
            setIsSendingMessage(true);
            const optimisticMessage: MessageEvent = {
                userId: user.id.toString(),
                username: user.username,
                message: newMessage,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, optimisticMessage]);

            const messageToSend = newMessage.trim();
            setNewMessage("");

            try {
                await sendMessage(messageToSend);
            } catch (error: any) {
                console.error("Failed to send message:", error);
                setErrorMessage(error.message || "Failed to send message. Please try again.");
                setMessages(prev => prev.filter(msg => msg.timestamp !== optimisticMessage.timestamp));
                setNewMessage(messageToSend);
            } finally {
                setIsSendingMessage(false);
            }
        }
    };

    const handleBackToLobby = async () => {
        if (
            currentGame.gameState &&
            (currentGame.gameState.status === GameStatus.IN_PROGRESS ||
                currentGame.gameState.status === GameStatus.WAITING)
        ) {
            try {
                console.log("Calling leaveGame before navigating to lobby...");
                await leaveGame();
                console.log("leaveGame finished.");
            } catch (error: any) {
                console.error("Error leaving game via socket:", error);
                setErrorMessage(error.message || "Could not notify server about leaving.");
            }
        } else {
            console.log("Game completed or no game state, navigating directly.");
        }

        try {
            await refreshUserData();
            console.log("User data refreshed.");
        } catch (refreshError) {
            console.error("Failed to refresh user data:", refreshError);
        }
        clearGameState();
        navigate("/lobby");
    };

    const copyGameCode = () => {
        if (currentGame.gameCode) {
            navigator.clipboard
                .writeText(currentGame.gameCode)
                .then(() => alert("Game code copied to clipboard!"))
                .catch(err => console.error("Failed to copy game code:", err));
        }
    };

    const isValidMove = (row: number, col: number): boolean => {
        if (!currentGame.gameState || currentGame.gameState.status !== GameStatus.IN_PROGRESS || !user || gameOver) {
            return false;
        }
        if (currentGame.gameState.board[row][col] !== null) {
            return false;
        }
        const userIdString = user.id.toString();
        const isPlayerX = currentGame.gameState.players.X?.userId === userIdString;
        const isPlayerO = currentGame.gameState.players.O?.userId === userIdString;
        return (
            (isPlayerX && currentGame.gameState.currentTurn === PlayerSymbol.X) ||
            (isPlayerO && currentGame.gameState.currentTurn === PlayerSymbol.O)
        );
    };

    const isWinningCell = (row: number, col: number): boolean => {
        return winningLine?.some(pos => pos.row === row && pos.col === col) ?? false;
    };

    const isLastMoveCell = (row: number, col: number): boolean => {
        return lastMove?.position?.row === row && lastMove?.position?.col === col;
    };

    const formatMessageTime = (timestamp: string): string => {
        try {
            return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (e) {
            return "Invalid Date";
        }
    };

    const renderCell = (row: number, col: number) => {
        const content = currentGame.gameState?.board?.[row]?.[col] ?? null;
        const isWinning = isWinningCell(row, col);
        const isLast = isLastMoveCell(row, col);
        const isAnimating = moveAnimation?.row === row && moveAnimation?.col === col;
        const isPending = pendingMove?.row === row && pendingMove?.col === col;
        const canClick = isValidMove(row, col) && !pendingMove && !gameOver;
        let cellClasses =
            "w-full h-[5.9rem] text-4xl font-bold border-2 border-gray-400 rounded-lg flex items-center justify-center transition-all duration-300";
        if (content === null && !isPending && canClick)
            cellClasses += " hover:bg-indigo-500 cursor-pointer !text-gray-600";
        if (content !== null || isPending || !canClick) cellClasses += " cursor-not-allowed";
        if (isWinning && winningLineAnimated) cellClasses += " bg-green-400 scale-110 shadow-lg";
        else if (isWinning) cellClasses += " bg-green-200";
        else if (isLast) cellClasses += " bg-indigo-500";
        if (isPending) cellClasses += " bg-gray-200";
        if (isAnimating) cellClasses += " animate-pulse";
        return (
            <button
                key={`cell-${row}-${col}`}
                className={cellClasses}
                onClick={() => handleCellClick(row, col)}
                disabled={!canClick}
                aria-label={`Cell ${row},${col}`}
            >
                {isPending ? (
                    <div className="w-6 h-6 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                ) : (
                    content && (
                        <span className={isWinning && winningLineAnimated ? "animate-bounce" : ""}>{content}</span>
                    )
                )}
            </button>
        );
    };

    const getStatusMessage = (): string => {
        if (!currentGame.gameState) return "Connecting to game...";
        if (pendingMove) return "Making move...";

        switch (currentGame.gameState.status) {
            case GameStatus.WAITING:
                return "Waiting for opponent...";
            case GameStatus.IN_PROGRESS: {
                if (!user) return "Game in progress";
                const userIdString = user.id.toString();
                const isMyTurn =
                    currentGame.gameState.currentTurn &&
                    ((currentGame.gameState.players.X?.userId === userIdString &&
                        currentGame.gameState.currentTurn === PlayerSymbol.X) ||
                        (currentGame.gameState.players.O?.userId === userIdString &&
                            currentGame.gameState.currentTurn === PlayerSymbol.O));
                return isMyTurn ? "Your turn" : "Opponent's turn";
            }
            case GameStatus.COMPLETED: {
                if (currentUserGameOutcome === "WIN") return "You Won! 🎉";
                if (currentUserGameOutcome === "LOSS") return "You Lost 😢";
                if (currentUserGameOutcome === "DRAW") return "Game Over: It's a Draw!";

                if (currentGame.gameState.result === GameResult.DRAW) return "Game Over: Draw!";
                if (currentGame.gameState.result === GameResult.X_WON)
                    return `Game Over: ${currentGame.gameState.players.X?.username ?? "X"} Wins!`;
                if (currentGame.gameState.result === GameResult.O_WON)
                    return `Game Over: ${currentGame.gameState.players.O?.username ?? "O"} Wins!`;
                return "Game Over";
            }
            default:
                return "Unknown game state";
        }
    };

    const getLastMoveMessage = () => {
        if (!lastMove?.username || !lastMove?.position || !currentGame.gameState?.board) return null;
        const isCurrentUserMove = user && lastMove.userId === user.id.toString();
        const symbol = currentGame.gameState.board[lastMove.position.row][lastMove.position.col];
        if (!symbol) return null;
        return (
            <div className="center !absolute bottom-[0.7rem] text-sm text-gray-600 mt-2">
                {isCurrentUserMove ? "You" : lastMove.username} placed {symbol} at [{lastMove.position.row},{" "}
                {lastMove.position.col}]
            </div>
        );
    };

    const getPlayerInfo = (symbol: PlayerSymbol) => {
        if (!currentGame.gameState) return <div className="text-gray-500">Waiting...</div>;
        const player = currentGame.gameState.players[symbol];
        if (!player) return <div className="text-gray-500">Waiting for player...</div>;
        const isPlayerTurn =
            currentGame.gameState.status === GameStatus.IN_PROGRESS && currentGame.gameState.currentTurn === symbol;
        const isCurrentUser = user && player.userId === user.id.toString();
        return (
            <div className={`flex items-center p-1 ${isPlayerTurn ? "bg-yellow-100 rounded font-semibold" : ""}`}>
                <div
                    className={`w-3 h-3 rounded-full mr-2 ${player.isConnected ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span className={isCurrentUser ? "!text-blue-600" : " text-gray-600"}>
                    {isCurrentUser ? "You" : player.username}
                </span>
                <span className="ml-1 text-gray-600">({symbol})</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-100 p-6">
            <div className="max-w-[80%] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-8 bg-white rounded-xl p-6 shadow-lg min-h-[80px]">
                    {" "}
                    {/* Added min-height */}
                    {/* Alert Area */}
                    <div className="w-full sm:w-auto mb-4 sm:mb-0 flex-grow mr-4">
                        {" "}
                        {/* Made this area grow */}
                        {errorMessage && (
                            <div className="bg-red-50 border border-red-300 text-red-700 p-2 mb-2 rounded-md shadow-sm text-sm">
                                <p>{errorMessage}</p>
                            </div>
                        )}
                        {waitingMessage && (
                            <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 p-2 mb-2 rounded-md shadow-sm text-sm">
                                <p>{waitingMessage}</p>
                            </div>
                        )}
                        {opponentDisconnected && (
                            <div className="bg-orange-50 border border-orange-300 text-orange-700 p-2 mb-2 rounded-md shadow-sm text-sm">
                                <p>{disconnectedPlayerName} has disconnected.</p>
                            </div>
                        )}
                        {/* Placeholder if no alerts */}
                        {!errorMessage && !waitingMessage && !opponentDisconnected && (
                            <div className="h-full flex items-center text-lg font-bold text-indigo-600">
                                Game In Progress
                            </div>
                        )}
                    </div>
                    {/* Game Code */}
                    {currentGame.gameCode && (
                        <div className="text-sm text-gray-700 bg-indigo-50 px-4 py-2 rounded-lg flex items-center shadow-sm self-start">
                            {" "}
                            {/* Align self start */}
                            <span className="mr-2">Game Code:</span>
                            <b className="text-indigo-700 tracking-wider">{currentGame.gameCode}</b>
                            <button
                                onClick={copyGameCode}
                                className="ml-3 text-indigo-500 hover:text-indigo-700 transition-colors"
                                title="Copy game code"
                            >
                                Copy
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    {/* Game Area */}
                    <div className="lg:col-span-2">
                        {/* Player Info and Status */}
                        <div className="bg-white shadow-lg rounded-xl p-6 mb-6 !h-[20%]">
                            <div className="flex justify-between items-center mb-4">
                                {getPlayerInfo(PlayerSymbol.X)}
                                <div className="text-center font-bold text-gray-400 text-sm px-3 py-1 bg-gray-100 rounded-full">
                                    VS
                                </div>
                                {getPlayerInfo(PlayerSymbol.O)}
                            </div>
                            <div
                                className={`text-center text-xl font-bold mb-2 p-3 rounded-lg shadow-md transition-all duration-300 ease-in-out
                                    ${
                                        currentUserGameOutcome === "WIN"
                                            ? "bg-green-500 text-white transform scale-105"
                                            : currentUserGameOutcome === "LOSS"
                                            ? "bg-red-500 text-white transform scale-105"
                                            : currentUserGameOutcome === "DRAW"
                                            ? "bg-yellow-400 text-gray-800"
                                            : currentGame.gameState?.status === GameStatus.WAITING
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-indigo-100 text-indigo-700" // Default for in-progress, connecting etc.
                                    }`}
                            >
                                {getStatusMessage()}
                            </div>
                        </div>

                        {/* Game Board */}
                        {currentGame.gameState ? (
                            <div className="relative flex justify-center items-center bg-white rounded-xl shadow-lg p-6 !h-[68%]">
                                <div
                                    className={`relative grid grid-cols-3 gap-2 w-80 h-80 mx-auto rounded-lg p-2 !bg-indigo-600 shadow-lg ${
                                        gameOver ? "opacity-30 cursor-not-allowed" : ""
                                    }`}
                                >
                                    {renderCell(0, 0)}
                                    {renderCell(0, 1)}
                                    {renderCell(0, 2)}
                                    {renderCell(1, 0)}
                                    {renderCell(1, 1)}
                                    {renderCell(1, 2)}
                                    {renderCell(2, 0)}
                                    {renderCell(2, 1)}
                                    {renderCell(2, 2)}
                                </div>
                                {getLastMoveMessage()}
                            </div>
                        ) : (
                            <div className="flex justify-center items-center h-96 text-gray-500 bg-white rounded-xl shadow-lg">
                                {/* Removed loading SVG */}
                                Loading Game...
                            </div>
                        )}

                        {/* Back Button */}
                        <div className="mt-6 text-center">
                            <button
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center shadow-md mx-auto"
                                onClick={handleBackToLobby}
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
                            </button>
                        </div>
                    </div>

                    {/* Game Chat */}
                    <div
                        className={`bg-white shadow-lg rounded-xl p-6 flex flex-col !h-[100%] lg:h-auto lg:max-h-[70vh] ${
                            newMessageNotification
                                ? "ring-2 ring-blue-400 ring-offset-2 transition-all"
                                : "transition-all"
                        }`}
                    >
                        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                            <h2 className="text-xl font-semibold text-indigo-700">Game Chat</h2>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {messages.length} messages
                            </span>
                        </div>
                        <div
                            ref={messageContainerRef}
                            className="flex-grow border border-gray-200 rounded-lg p-3 mb-4 overflow-y-auto bg-gray-50 text-sm space-y-3"
                        >
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-400 italic">
                                    No messages yet. Start chatting!
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={`msg-${idx}-${msg.timestamp}`}
                                        className={`flex ${
                                            msg.userId === user?.id.toString() ? "justify-end" : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[80%] inline-block py-2 px-4 rounded-xl ${
                                                msg.userId === user?.id.toString()
                                                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                                    : "bg-gray-200 text-gray-800"
                                            }`}
                                        >
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="font-semibold text-xs">
                                                    {msg.userId === user?.id.toString() ? "You" : msg.username}
                                                </span>
                                                <span
                                                    className={`text-xs ml-2 ${
                                                        msg.userId === user?.id.toString()
                                                            ? "text-indigo-100"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {formatMessageTime(msg.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-sm break-words">{msg.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className="mt-auto">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className="flex-grow px-4 py-2 border border-gray-300 !text-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-sm transition-shadow"
                                    placeholder="Type a message..."
                                    disabled={!isConnected || !currentGame.gameId || isSendingMessage || gameOver}
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    disabled={
                                        !isConnected ||
                                        !currentGame.gameId ||
                                        !newMessage.trim() ||
                                        isSendingMessage ||
                                        gameOver
                                    }
                                    aria-label="Send message"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 transform rotate-90"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamePage;
