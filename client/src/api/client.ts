const BASE: string = import.meta.env.VITE_API_URL ?? '/api';

const ACCESS_KEY = 'vp_access_token';
const REFRESH_KEY = 'vp_refresh_token';

export const tokens = {
    get access() {
        return localStorage.getItem(ACCESS_KEY);
    },
    get refresh() {
        return localStorage.getItem(REFRESH_KEY);
    },
    set(access: string, refresh: string) {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
    },
    clear() {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },
};

export class ApiError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

interface Options {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
}

async function execute(path: string, { method = 'GET', body, auth = false, headers = {} }: Options) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(auth && tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
            ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { res, json };
}

// Refresh tokens rotate on the server, so concurrent refreshes would break each other. Share one.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
    const refreshToken = tokens.refresh;
    if (!refreshToken) return Promise.resolve(false);
    if (!refreshing) {
        refreshing = execute('/auth/refresh', { method: 'POST', body: { refreshToken } })
            .then(({ res, json }) => {
                if (!res.ok || !json?.success) return false;
                tokens.set(json.data.accessToken, json.data.refreshToken);
                return true;
            })
            .catch(() => false)
            .finally(() => {
                refreshing = null;
            });
    }
    return refreshing;
}

function endSession() {
    tokens.clear();
    window.dispatchEvent(new Event('vp:logout'));
}

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
    let { res, json } = await execute(path, options);

    // Only token problems trigger a refresh. A 401 like "wrong password" is a normal error.
    if (options.auth && res.status === 401) {
        if (['TOKEN_INVALID', 'NO_TOKEN'].includes(json?.code)) {
            if (await refreshSession()) ({ res, json } = await execute(path, options));
            else endSession();
        } else if (json?.code === 'ACCOUNT_INVALID') {
            endSession();
        }
    }

    if (!res.ok || !json?.success) {
        throw new ApiError(
            res.status,
            json?.message ?? 'Could not reach the server. Check your connection and try again.',
            json?.code
        );
    }
    return json.data as T;
}