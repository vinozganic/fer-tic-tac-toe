import axios, { AxiosError, AxiosResponse } from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Define custom error type for API errors
export class APIError extends Error {
    status: number;
    data: any;
    isNetworkError: boolean;
    isServerError: boolean;
    isAuthError: boolean;

    constructor(message: string, status: number = 0, data: any = null) {
        super(message);
        this.name = "APIError";
        this.status = status;
        this.data = data;
        this.isNetworkError = status === 0;
        this.isServerError = status >= 500;
        this.isAuthError = status === 401 || status === 403;
    }
}

// Axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000, // 10 sec
});

// Request interceptor to attach JWT token to authenticated requests
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors consistently
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError) => {
        // Network errors (no response from server)
        if (!error.response) {
            // Check if its due to network being offline
            if (!navigator.onLine) {
                return Promise.reject(new APIError("Network is offline. Please check your connection.", 0, null));
            }

            // Otherwise it's a general network error
            return Promise.reject(new APIError("Network error. Unable to connect to the server.", 0, null));
        }

        // Server errors (5xx)
        if (error.response.status >= 500) {
            return Promise.reject(
                new APIError("Server error. Please try again later.", error.response.status, error.response.data)
            );
        }

        // Authentication errors (401)
        if (error.response.status === 401) {
            // If token has expired and we're not on the login page
            if (window.location.pathname !== "/login") {
                // Clear the token
                localStorage.removeItem("token");

                // Redirect to login page with a message
                window.location.href = "/login?session=expired";

                return Promise.reject(
                    new APIError("Session expired. Please login again.", error.response.status, error.response.data)
                );
            }
        }

        // General client errors with proper messages
        const errorMessage = error.message || "An error occurred";
        return Promise.reject(new APIError(errorMessage, error.response?.status || 0, error.response?.data || null));
    }
);

// Helper for retrying requests
const retryRequest = async <T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = 3,
    delay: number = 1000
): Promise<AxiosResponse<T>> => {
    try {
        return await requestFn();
    } catch (error) {
        if (
            retries > 0 &&
            error instanceof APIError &&
            (error.isNetworkError || error.isServerError) &&
            navigator.onLine
        ) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryRequest(requestFn, retries - 1, delay * 1.5);
        }
        throw error;
    }
};

// API service with methods for interacting with the backend
export const apiService = {
    // Auth endpoints
    auth: {
        register: (username: string, password: string) => api.post("/auth/register", { username, password }),

        login: (username: string, password: string) => api.post("/auth/login", { username, password }),

        getProfile: () => retryRequest(() => api.get("/auth/profile")),
    },

    // Game endpoints
    game: {
        createGame: () => api.post("/game"),

        joinGame: (gameCode: string) => api.post(`/game/join`, { gameCode }),

        getGame: (gameId: string) => retryRequest(() => api.get(`/game/${gameId}`)),
    },

    // Leaderboard endpoint
    leaderboard: {
        getLeaderboard: (limit: number = 10) => retryRequest(() => api.get(`/leaderboard?limit=${limit}`)),
    },
};

export default api;
