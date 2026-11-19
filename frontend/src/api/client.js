import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("civicfix_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("civicfix_token");
      localStorage.removeItem("civicfix_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;