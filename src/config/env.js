const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const ensureLeadingSlash = (value) => (value.startsWith("/") ? value : `/${value}`);

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  return trimTrailingSlash(value.trim());
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || "");

const appUrlFromEnv = normalizeBaseUrl(import.meta.env.VITE_APP_URL || "");
const appUrlFromWindow =
  typeof window !== "undefined" ? normalizeBaseUrl(window.location.origin) : "";

// Always prefer the runtime host to avoid accidental production redirects during local testing.
export const APP_BASE_URL = appUrlFromWindow || appUrlFromEnv;

export const getApiUrl = (path = "") => {
  if (!path) {
    return API_BASE_URL;
  }

  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${ensureLeadingSlash(path)}`;
};

export const getAppUrl = (path = "") => {
  if (!path) {
    return APP_BASE_URL;
  }

  if (!APP_BASE_URL) {
    return path;
  }

  return `${APP_BASE_URL}${ensureLeadingSlash(path)}`;
};
