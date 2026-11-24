/** Payment modes accepted by the Razorpay POS "mode" field. "ALL" shows every enabled mode on the terminal. */
type PaymentMode = "ALL" | "CARD" | "UPI" | "BHARATQR" | "CASH" | (string & {});
type PaymentPhase = "idle"
/** start request in flight, no request id yet */
 | "starting"
/** request is on the terminal, polling status */
 | "waiting"
/** cancel sent, confirming with the terminal */
 | "cancelling"
/** customer already submitted the payment, cancel refused, waiting for the final result */
 | "finalizing" | "success" | "failed" | "cancelled" | "expired"
/** no response in time, the request was cancelled */
 | "timeout"
/** the result could not be confirmed. Do NOT start another payment */
 | "unknown"
/** the payment could not be started */
 | "error";
type PosError = {
    /** Razorpay/Ezetap code (EZETAP_...) or one of this package's own codes (NETWORK_ERROR, ...). */
    code: string;
    /** Safe, user-facing message. */
    message: string;
    /** true when showing "Try again" with the same input makes sense. */
    retryable: boolean;
};
type PaymentResult = {
    p2pRequestId: string;
    txnId?: string;
    amount?: number;
    mode?: string;
    cardLastFourDigit?: string;
    receiptUrl?: string;
    /** The externalRefNumber that was sent with the payment. */
    reference?: string;
};
type POSProxyConfig = {
    /** Base URL of your proxy backend, e.g. "https://erp.example.com". "" for same-origin. */
    url: string;
    /** Default "/api/start". */
    startEndpoint?: string;
    /** Default "/api/status". */
    statusEndpoint?: string;
    /** Default "/api/cancel". */
    cancelEndpoint?: string;
    /** How start/status/cancel send their fields. Default "form" (multipart FormData). */
    payloadFormat?: "form" | "json";
    /**
     * Your own session/auth headers (Authorization, X-Frappe-CSRF-Token, ...).
     * Never put terminal credentials here: appKey / username / deviceId belong on the proxy.
     */
    getHeaders?: () => HeadersInit | Promise<HeadersInit>;
    /** Set to "include" only when your proxy uses cookies AND its CORS allows credentials. */
    credentials?: RequestCredentials;
    /** Custom fetch (tests, axios adapters, ...). Defaults to globalThis.fetch. */
    fetch?: typeof fetch;
};
type POSTimingConfig = {
    /** Delay before the first status check. Default 30 000 ms (Razorpay best practice). */
    pollStartDelayMs?: number;
    /** Gap between status checks. Default 10 000 ms. */
    pollIntervalMs?: number;
    /** Cancel the request if it is still pending after this long. Default 150 000 ms. */
    timeoutMs?: number;
    /** How long to wait for the terminal to confirm a cancel. Default 30 000 ms. */
    cancelGraceMs?: number;
    /** How long to wait for the final result once the customer has already paid. Default 60 000 ms. */
    initiatedGraceMs?: number;
};
/**
 * Arguments for startPayment. Only `amount` and `reference` are required.
 * Terminal details (appKey, username, pushTo/deviceId, orgCode, ...) are never sent: they are
 * stripped even if you pass them. Extra keys are passed through to your proxy as strings.
 */
type StartArgs = {
    /** Amount in rupees, up to 2 decimals, greater than 0. */
    amount: number;
    /** Sent as externalRefNumber. Mandatory and must be unique per payment attempt. */
    reference: string;
    mode?: PaymentMode;
    /** Only for multi MID/TID setups. */
    accountLabel?: string;
    customerMobileNumber?: string;
    customerEmail?: string;
    customerName?: string;
    /** Max 50 characters (longer values are truncated). */
    description?: string;
    externalRefNumber2?: string;
    externalRefNumber3?: string;
    externalRefNumber4?: string;
    /** Sent as a JSON string, as Razorpay expects. */
    externalRefNumbers?: string[];
    [extra: string]: string | number | string[] | undefined;
};
type POSLabels = {
    pay: string;
    sending: string;
    cancel: string;
    cancelling: string;
    retry: string;
    checkStatus: string;
    newPayment: string;
    close: string;
};
type ButtonState = {
    show: boolean;
    disabled: boolean;
    loading: boolean;
    label: string;
};
type POSButtons = {
    pay: ButtonState;
    cancel: ButtonState;
    retry: ButtonState;
    checkStatus: ButtonState;
    newPayment: ButtonState;
};
type POSTone = "neutral" | "success" | "error" | "warning";
type UseRazorpayPOSBridgeOptions = {
    proxy: POSProxyConfig;
    timing?: POSTimingConfig;
    /** Override button labels (translations). */
    labels?: Partial<POSLabels>;
    /** Override user-facing error messages by code, e.g. { EZETAP_0000385: "Terminal offline" }. */
    messages?: Record<string, string>;
    /**
     * Resume an in-flight payment after a page refresh (uses sessionStorage). Default true.
     * Set to false to disable.
     */
    persist?: boolean;
    /**
     * sessionStorage key used by `persist`. Use a different key per payment slot if several
     * terminal payments can be on screen at once, e.g. `pos:${invoiceName}`.
     */
    sessionKey?: string;
    /** Called once when the payment is AUTHORIZED. */
    onSuccess?: (result: PaymentResult) => void;
    /** Called when a payment ends without success (failed, cancelled, expired, timeout, unknown, error). */
    onFailure?: (phase: PaymentPhase, error: PosError | null) => void;
};
type UseRazorpayPOSBridgeReturn = {
    phase: PaymentPhase;
    /** The message to show the cashier for the current state. May be "". */
    message: string;
    /** Short-lived, non-final problem (e.g. "Couldn't refresh the status. Retrying…"). */
    notice: string | null;
    error: PosError | null;
    /** The Razorpay p2pRequestId once the request is on the terminal. */
    requestId: string | null;
    /** Set when phase === "success". */
    result: PaymentResult | null;
    buttons: POSButtons;
    tone: POSTone;
    /** Tailwind text colour class for `tone`. */
    toneClass: string;
    /** starting | waiting | cancelling | finalizing */
    isBusy: boolean;
    /** isBusy or unknown: the parent must not allow Complete Order / Edit Cart / amount edits. */
    isLocked: boolean;
    /** isLocked or success: disable the amount input. */
    inputLocked: boolean;
    startPayment: (args: StartArgs) => Promise<void>;
    cancelPayment: () => Promise<void>;
    /** From "unknown": look at the status again. */
    checkStatus: () => Promise<void>;
    /** Start again with the previous arguments (optionally overridden, e.g. a fresh `reference`). */
    retry: (overrides?: Partial<StartArgs>) => void;
    /** Back to idle. Only works from a final state. */
    reset: () => void;
};

declare const useRazorpayPOSBridge: (options: UseRazorpayPOSBridgeOptions) => UseRazorpayPOSBridgeReturn;

/** Pull a Razorpay/Ezetap code out of free text (e.g. a Frappe error message). */
declare const extractErrorCode: (text?: string | null) => string | undefined;
/**
 * Map any code to a user-safe error.
 * `fallbackMessage` is only used for codes this package doesn't know (e.g. card-decline codes like
 * EZETAP_1000003 whose server message is already customer-friendly).
 * `overrides` replaces the message for a code.
 */
declare const resolvePosError: (code?: string | null, fallbackMessage?: string | null, overrides?: Record<string, string>) => PosError;

declare const DEFAULT_LABELS: POSLabels;
/**
 * Which buttons to show in each phase.
 *
 *  idle        Pay
 *  starting    Pay (loading) + Cancel (disabled until the request id exists)
 *  waiting     Cancel
 *  cancelling  Cancel (loading)
 *  finalizing  none (the customer already paid on the terminal: only wait)
 *  failed / cancelled / expired / timeout / retryable error   Try again
 *  success / non-retryable error                               New payment / Close
 *  unknown     Check status only (never allow a second charge while the result is unconfirmed)
 */
declare const getPosButtons: (phase: PaymentPhase, retryable: boolean, labels?: POSLabels) => POSButtons;
declare const getTone: (phase: PaymentPhase) => POSTone;

type EndpointKey = "start" | "status" | "cancel";
type Body = Record<string, any>;
declare class ProxyError extends Error {
    /** errorCode from the response (or one of this package's own codes). */
    readonly code: string;
    /** realCode from the response, e.g. P2P_PAYMENT_INITIATED. */
    readonly realCode?: string;
    readonly serverMessage?: string;
    constructor(code: string, opts?: {
        realCode?: string;
        serverMessage?: string;
    });
}
/** Build the flat string fields sent to the proxy for "start". Sensitive keys are always dropped. */
declare const buildStartFields: (args: StartArgs) => Record<string, string>;
/** POST fields to the proxy and return the unwrapped JSON body. Throws ProxyError on HTTP / network errors. */
declare const posRequest: (proxy: POSProxyConfig, key: EndpointKey, fields: Record<string, string>, signal?: AbortSignal) => Promise<Body>;

/** Razorpay best practice: first status check at 30s, every 10s, cancel at 150s. */
declare const DEFAULT_TIMING: Required<POSTimingConfig>;
/**
 * Terminal / credential fields that must never leave the browser even if a caller passes them.
 * Compared case-insensitively.
 */
declare const BLOCKED_START_KEYS: ReadonlySet<string>;

export { BLOCKED_START_KEYS, type ButtonState, DEFAULT_LABELS, DEFAULT_TIMING, type POSButtons, type POSLabels, type POSProxyConfig, type POSTimingConfig, type POSTone, type PaymentMode, type PaymentPhase, type PaymentResult, type PosError, ProxyError, type StartArgs, type UseRazorpayPOSBridgeOptions, type UseRazorpayPOSBridgeReturn, buildStartFields, useRazorpayPOSBridge as default, extractErrorCode, getPosButtons, getTone, posRequest, resolvePosError, useRazorpayPOSBridge };
