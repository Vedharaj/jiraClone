import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:8080",
  timeout: 15000, // 15 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "An error occurred.";

    if (!error.response) {
      // Network failure, backend down, or timeout
      if (error.code === "ECONNABORTED") {
        message = "Request timed out. Please check your network and try again.";
      } else {
        message = "Could not reach the server. Please verify if the backend is running.";
      }
    } else {
      const status = error.response.status;
      const data = error.response.data;

      // Extract message from response if available
      const backendMessage = data?.message || (typeof data === "string" ? data : null);

      switch (status) {
        case 401:
          message = backendMessage || "Session expired. Please log in again.";
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            localStorage.removeItem("user");
            localStorage.removeItem("selectedProject");
            window.location.href = "/login";
          }
          break;
        case 403:
          message = backendMessage || "Access denied. You do not have permission for this action.";
          break;
        case 404:
          message = backendMessage || "The requested resource could not be found.";
          break;
        case 500:
          message = backendMessage || "Internal server error. Please try again later.";
          break;
        default:
          message = backendMessage || `Action failed (Status: ${status}).`;
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toast:error", { detail: message }));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
