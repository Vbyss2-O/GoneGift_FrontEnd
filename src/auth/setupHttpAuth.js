import axios from "axios";
import { supabase } from "../Layout/Death/supabaseClient";
import { API_BASE_URL } from "../config/env";

const INVALID_BEARER_REGEX = /^Bearer\s*(null|undefined)?\s*$/i;

let axiosInterceptorInitialized = false;
let fetchInterceptorInitialized = false;
let cachedAccessToken = null;

const isApiRequest = (url) => {
  if (!url) {
    return false;
  }

  const normalizedUrl = url.trim();
  if (normalizedUrl.startsWith("/")) {
    return true;
  }

  if (!API_BASE_URL) {
    return false;
  }

  return normalizedUrl.startsWith(API_BASE_URL);
};

const readAccessToken = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error reading auth session:", error.message);
      cachedAccessToken = null;
      return null;
    }

    cachedAccessToken = session?.access_token || null;
    return cachedAccessToken;
  } catch (error) {
    console.error("Unexpected auth session error:", error);
    cachedAccessToken = null;
    return null;
  }
};

const syncTokenFromAuthState = () => {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token || null;
  });
};

const setupAxiosInterceptor = () => {
  if (axiosInterceptorInitialized) {
    return;
  }

  axios.interceptors.request.use(
    async (config) => {
      const requestUrl = typeof config.url === "string" ? config.url : "";
      if (!isApiRequest(requestUrl)) {
        return config;
      }

      const headers = config.headers || {};
      const token = cachedAccessToken || (await readAccessToken());

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        const existingAuth = headers.Authorization || headers.authorization;
        if (
          typeof existingAuth === "string" &&
          INVALID_BEARER_REGEX.test(existingAuth.trim())
        ) {
          delete headers.Authorization;
          delete headers.authorization;
        }
      }

      config.headers = headers;
      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInterceptorInitialized = true;
};

const setupFetchInterceptor = () => {
  if (fetchInterceptorInitialized || typeof window === "undefined") {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input instanceof Request
        ? input.url
        : "";

    if (!isApiRequest(requestUrl)) {
      return originalFetch(input, init);
    }

    const token = cachedAccessToken || (await readAccessToken());

    const incomingHeaders =
      init.headers || (input instanceof Request ? input.headers : undefined);
    const headers = new Headers(incomingHeaders);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      const existingAuth = headers.get("Authorization");
      if (
        typeof existingAuth === "string" &&
        INVALID_BEARER_REGEX.test(existingAuth.trim())
      ) {
        headers.delete("Authorization");
      }
    }

    const nextInit = {
      ...init,
      headers,
    };

    if (input instanceof Request) {
      const nextRequest = new Request(input, nextInit);
      return originalFetch(nextRequest);
    }

    return originalFetch(input, nextInit);
  };

  fetchInterceptorInitialized = true;
};

export const setupHttpAuth = () => {
  syncTokenFromAuthState();
  setupAxiosInterceptor();
  setupFetchInterceptor();
};
