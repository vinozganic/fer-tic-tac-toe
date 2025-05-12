import AppRouter from "./AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import "./App.css";

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <AppRouter />
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
