"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BLOCKED_START_KEYS: () => BLOCKED_START_KEYS,
  DEFAULT_LABELS: () => DEFAULT_LABELS,
  DEFAULT_TIMING: () => DEFAULT_TIMING,
  ProxyError: () => ProxyError,
  buildStartFields: () => buildStartFields,
  default: () => useRazorpayPOSBridge_default,
  extractErrorCode: () => extractErrorCode,
  getPosButtons: () => getPosButtons,
  getTone: () => getTone,
  posRequest: () => posRequest,
  resolvePosError: () => resolvePosError,
  useRazorpayPOSBridge: () => useRazorpayPOSBridge
});
module.exports = __toCommonJS(index_exports);

// src/useRazorpayPOSBridge.ts
var import_react = require("react");

// src/config.ts
var DEFAULT_SESSION_KEY = "razorpay_pos_active_payment";
var DEFAULT_TIMING = {
  pollStartDelayMs: 3e4,
  pollIntervalMs: 1e4,
  timeoutMs: 15e4,
  cancelGraceMs: 3e4,
  initiatedGraceMs: 6e4
};
var DEFAULT_ENDPOINTS = {
  start: "/api/start",
  status: "/api/status",
  cancel: "/api/cancel"
};
var BLOCKED_START_KEYS = new Set(
  [
    "appKey",
    "username",
    "pushTo",
    "deviceId",
    "deviceSerial",
    "orgCode",
    "merchantCode",
    "mid",
    "tid"
  ].map((k) => k.toLowerCase())
);
var TICK_MS = 250;

// src/errors.ts
var ERRORS = {
  // ---- Start (Pay API), from the doc ----
  EZETAP_0000382: {
    message: "This terminal isn't recognised. Please contact support to check the terminal setup.",
    retryable: false
  },
  EZETAP_0000381: {
    message: "The terminal can't receive payment requests right now. Make sure it is switched on, connected to the internet and logged in, then try again.",
    retryable: true
  },
  EZETAP_0000384: {
    message: "The terminal couldn't be notified. Make sure it is switched on, connected to the internet and logged in, then try again.",
    retryable: true
  },
  EZETAP_0000385: {
    message: "The terminal is offline. Check its Wi-Fi or mobile data and make sure the POS app is logged in, then try again.",
    retryable: true
  },
  EZETAP_0000039: {
    message: "This payment amount isn't supported. Please check the amount.",
    retryable: false
  },
  EZETAP_0000050: {
    message: "The amount is above the allowed transaction limit. Please reduce it.",
    retryable: false
  },
  EZETAP_0000162: {
    message: "The amount is below the minimum allowed. Please increase it.",
    retryable: false
  },
  EZETAP_0000048: {
    message: "Tip collection isn't enabled for this terminal. Please contact support.",
    retryable: false
  },
  EZETAP_0000047: {
    message: "There is a problem with the tip amount. Please contact support.",
    retryable: false
  },
  EZETAP_0000148: {
    message: "This terminal isn't linked to this organisation. Please contact support.",
    retryable: false
  },
  EZETAP_0000387: {
    message: "The payment reference is missing. Please refresh the page and try again.",
    retryable: false
  },
  EZETAP_6000001: {
    message: "This payment mode isn't available on the terminal. Please contact support.",
    retryable: false
  },
  EZETAP_0000623: {
    message: "The terminal is busy with another payment. Complete or cancel it on the terminal, then try again.",
    retryable: true
  },
  // ---- Status / Cancel ----
  EZETAP_0000383: {
    message: "We couldn't find this payment request. Please try again.",
    retryable: true
  },
  EZETAP_0000609: {
    message: "This payment was already cancelled on the terminal.",
    retryable: true
  },
  EZETAP_0000607: {
    message: "Cancellation is already in progress on the terminal.",
    retryable: false
  },
  // Cancel is refused once the customer has submitted the payment on the device
  P2P_PAYMENT_INITIATED: {
    message: "The customer has already started paying on the terminal. Waiting for the final result.",
    retryable: false
  },
  // ---- Client-side / proxy codes (not from Razorpay) ----
  NETWORK_ERROR: {
    message: "Couldn't reach the payment service. Check your connection and try again.",
    retryable: true
  },
  UNAUTHORIZED: {
    message: "Your session has expired. Please sign in again.",
    retryable: false
  },
  SERVER_ERROR: {
    message: "The payment service ran into a problem. Please try again in a moment.",
    retryable: true
  },
  INVALID_AMOUNT: {
    message: "Enter a valid amount greater than 0 (up to 2 decimal places).",
    retryable: false
  },
  MISSING_REFERENCE: {
    message: "The payment reference is missing. Please refresh the page and try again.",
    retryable: false
  },
  TXN_FAILED: {
    message: "The payment failed on the terminal. No money was deducted. Please try again.",
    retryable: true
  },
  TXN_REVERSED: {
    message: "This payment was reversed (voided or refunded) and is not complete.",
    retryable: false
  },
  REVERSAL_PENDING: {
    message: "The payment couldn't be completed and is being reversed. If any amount was deducted, it will be refunded automatically.",
    retryable: true
  },
  STATUS_UNCONFIRMED: {
    message: "We couldn't confirm the payment result. Don't retry yet - check the terminal or the payment portal first.",
    retryable: false
  },
  UNKNOWN: {
    message: "Something went wrong. Please try again.",
    retryable: true
  }
};
var CODE_PATTERN = /(EZETAP_\d+|P2P_[A-Z_]+)/;
var extractErrorCode = (text) => text?.match(CODE_PATTERN)?.[1];
var resolvePosError = (code, fallbackMessage, overrides) => {
  const known = code ? ERRORS[code] : void 0;
  if (code && known) {
    return { code, message: overrides?.[code] ?? known.message, retryable: known.retryable };
  }
  if (code && overrides?.[code]) {
    return { code, message: overrides[code], retryable: true };
  }
  if (fallbackMessage) {
    return { code: code ?? "UNKNOWN", message: fallbackMessage, retryable: true };
  }
  if (code) {
    return {
      code,
      message: `The payment couldn't be completed (${code}). Please try again or contact support.`,
      retryable: true
    };
  }
  return { code: "UNKNOWN", message: overrides?.UNKNOWN ?? ERRORS.UNKNOWN.message, retryable: true };
};

// src/client.ts
var ProxyError = class extends Error {
  constructor(code, opts = {}) {
    super(code);
    this.name = "ProxyError";
    this.code = code;
    this.realCode = opts.realCode;
    this.serverMessage = opts.serverMessage;
  }
};
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var isAbort = (e) => e?.name === "AbortError";
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var unwrap = (json) => isObject(json) && isObject(json.message) ? json.message : json;
var readFrappeMessage = (json) => {
  if (!isObject(json)) return void 0;
  try {
    const list = JSON.parse(String(json._server_messages || "[]"));
    if (Array.isArray(list) && list.length) return JSON.parse(list[0]).message;
  } catch {
  }
  return typeof json.message === "string" ? json.message : void 0;
};
var buildStartFields = (args) => {
  const { amount, reference, externalRefNumbers, description, ...rest } = args;
  const fields = {
    amount: amount.toFixed(2),
    externalRefNumber: reference.trim()
  };
  for (const [key, value] of Object.entries(rest)) {
    if (BLOCKED_START_KEYS.has(key.toLowerCase()) || value === void 0 || value === null) continue;
    const str = Array.isArray(value) ? JSON.stringify(value) : String(value).trim();
    if (str) fields[key] = str;
  }
  if (description?.trim()) fields.description = description.trim().slice(0, 50);
  if (externalRefNumbers?.length) fields.externalRefNumbers = JSON.stringify(externalRefNumbers);
  return fields;
};
var ENDPOINT_FIELD = {
  start: "startEndpoint",
  status: "statusEndpoint",
  cancel: "cancelEndpoint"
};
var posRequest = async (proxy, key, fields, signal) => {
  let endpoint = proxy[ENDPOINT_FIELD[key]] ?? DEFAULT_ENDPOINTS[key];
  if (!endpoint.startsWith("/")) endpoint = `/${endpoint}`;
  const url = `${proxy.url.replace(/\/+$/, "")}${endpoint}`;
  const headers = new Headers(proxy.getHeaders ? await proxy.getHeaders() : void 0);
  headers.set("Accept", "application/json");
  let body;
  if ((proxy.payloadFormat ?? "form") === "json") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(fields);
  } else {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    body = form;
  }
  const doFetch = proxy.fetch ?? globalThis.fetch.bind(globalThis);
  let res;
  try {
    res = await doFetch(url, {
      method: "POST",
      headers,
      credentials: proxy.credentials,
      body,
      signal
    });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new ProxyError("NETWORK_ERROR");
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
  }
  if (!res.ok) {
    const inner = unwrap(json);
    const text = readFrappeMessage(json);
    const code = (isObject(inner) ? inner.errorCode || inner.realCode : void 0) || extractErrorCode(text) || (res.status === 401 || res.status === 403 || res.status === 419 ? "UNAUTHORIZED" : res.status >= 500 ? "SERVER_ERROR" : "UNKNOWN");
    throw new ProxyError(String(code), {
      realCode: isObject(inner) && inner.realCode ? String(inner.realCode) : void 0,
      serverMessage: isObject(inner) && inner.errorMessage ? String(inner.errorMessage) : text
    });
  }
  const unwrapped = unwrap(json);
  if (!isObject(unwrapped)) throw new ProxyError("SERVER_ERROR");
  return unwrapped;
};
var saveSession = (key, requestId, startedAt) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ requestId, startedAt }));
  } catch {
  }
};
var clearSession = (key = DEFAULT_SESSION_KEY) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
  }
};
var readSession = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// src/ui.ts
var DEFAULT_LABELS = {
  pay: "Pay",
  sending: "Sending\u2026",
  cancel: "Cancel",
  cancelling: "Cancelling\u2026",
  retry: "Try again",
  checkStatus: "Check status",
  newPayment: "New payment",
  close: "Close"
};
var PHASE_TEXT = {
  idle: "",
  starting: "Sending payment request to the terminal\u2026",
  waiting: "Waiting for the customer to complete payment on the terminal\u2026",
  cancelling: "Cancelling on the terminal\u2026",
  finalizing: "The customer is already completing the payment on the terminal. Waiting for the final result\u2026",
  success: "Payment successful.",
  failed: "The payment failed. No money was deducted.",
  cancelled: "Payment cancelled.",
  expired: "The payment request expired. Please try again.",
  timeout: "No response from the terminal, so the request was cancelled. Please try again.",
  unknown: "",
  error: ""
};
var STATUS_DETAIL = {
  P2P_STATUS_QUEUED: "Payment request is on its way to the terminal\u2026",
  P2P_DEVICE_SENT: "Payment request sent to the terminal\u2026",
  P2P_DEVICE_RECEIVED: "Waiting for the customer to complete payment on the terminal\u2026"
};
var off = (label) => ({ show: false, disabled: false, loading: false, label });
var getPosButtons = (phase, retryable, labels = DEFAULT_LABELS) => {
  const pay = off(labels.pay);
  const cancel = off(labels.cancel);
  const retry = off(labels.retry);
  const checkStatus = off(labels.checkStatus);
  const newPayment = off(labels.newPayment);
  switch (phase) {
    case "idle":
      pay.show = true;
      break;
    case "starting":
      pay.show = true;
      pay.disabled = true;
      pay.loading = true;
      pay.label = labels.sending;
      cancel.show = true;
      cancel.disabled = true;
      break;
    case "waiting":
      cancel.show = true;
      break;
    case "cancelling":
      cancel.show = true;
      cancel.disabled = true;
      cancel.loading = true;
      cancel.label = labels.cancelling;
      break;
    case "failed":
    case "cancelled":
    case "expired":
    case "timeout":
      retry.show = true;
      break;
    case "error":
      if (retryable) {
        retry.show = true;
      } else {
        newPayment.show = true;
        newPayment.label = labels.close;
      }
      break;
    case "success":
      newPayment.show = true;
      break;
    case "unknown":
      checkStatus.show = true;
      break;
    case "finalizing":
      break;
  }
  return { pay, cancel, retry, checkStatus, newPayment };
};
var getTone = (phase) => {
  switch (phase) {
    case "success":
      return "success";
    case "failed":
    case "error":
    case "expired":
    case "timeout":
      return "error";
    case "unknown":
      return "warning";
    default:
      return "neutral";
  }
};
var TONE_CLASS = {
  neutral: "text-gray-700",
  success: "text-green-700",
  error: "text-red-600",
  warning: "text-amber-700"
};

// src/useRazorpayPOSBridge.ts
var ALREADY_SKIPPED = ["EZETAP_0000609", "P2P_ALREADY_SKIPPED_ON_USER_END"];
var DUPLICATE_CANCEL = ["EZETAP_0000607", "P2P_DUPLICATE_CANCEL_REQUEST"];
var PAYMENT_INITIATED = ["P2P_PAYMENT_INITIATED"];
var LOOKUP_NOT_FOUND = "EZETAP_0000383";
var CANCELLED_CODES = /* @__PURE__ */ new Set([
  "P2P_DEVICE_CANCELED",
  "P2P_STATUS_IN_CANCELED_FROM_EXTERNAL_SYSTEM"
]);
var TERMINAL = /* @__PURE__ */ new Set([
  "success",
  "failed",
  "cancelled",
  "expired",
  "timeout",
  "error"
]);
var IN_FLIGHT = /* @__PURE__ */ new Set([
  "starting",
  "waiting",
  "cancelling",
  "finalizing"
]);
var matches = (codes, wanted) => codes.some((c) => !!c && wanted.includes(c));
var errorCodes = (b) => [b.errorCode, b.realCode];
var primaryCode = (b) => b.errorCode || b.realCode || void 0;
var useRazorpayPOSBridge = (options) => {
  const [phase, setPhase] = (0, import_react.useState)("idle");
  const [error, setError] = (0, import_react.useState)(null);
  const [detail, setDetail] = (0, import_react.useState)(null);
  const [notice, setNotice] = (0, import_react.useState)(null);
  const [requestId, setRequestId] = (0, import_react.useState)(null);
  const [result, setResult] = (0, import_react.useState)(null);
  const cfgRef = (0, import_react.useRef)(options);
  cfgRef.current = options;
  const getTiming = (0, import_react.useCallback)(() => ({ ...DEFAULT_TIMING, ...cfgRef.current.timing }), []);
  const storageKey = () => cfgRef.current.sessionKey ?? DEFAULT_SESSION_KEY;
  const persistOn = () => cfgRef.current.persist !== false;
  const err = (0, import_react.useCallback)(
    (code, fallback) => resolvePosError(code, fallback, cfgRef.current.messages),
    []
  );
  const phaseRef = (0, import_react.useRef)("idle");
  const genRef = (0, import_react.useRef)(0);
  const startedAtRef = (0, import_react.useRef)(0);
  const deadlineRef = (0, import_react.useRef)(0);
  const nextCheckAtRef = (0, import_react.useRef)(0);
  const cancelSentRef = (0, import_react.useRef)(false);
  const timedOutRef = (0, import_react.useRef)(false);
  const lastArgsRef = (0, import_react.useRef)(null);
  const abortRef = (0, import_react.useRef)(null);
  const getSignal = () => {
    if (!abortRef.current || abortRef.current.signal.aborted) {
      abortRef.current = new AbortController();
    }
    return abortRef.current.signal;
  };
  const go = (0, import_react.useCallback)((p) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);
  const finish = (0, import_react.useCallback)(
    (next, e = null, res = null) => {
      genRef.current++;
      if (persistOn()) clearSession(storageKey());
      go(next);
      setError(e);
      setDetail(null);
      setNotice(null);
      setResult(res);
      if (next !== "success") cfgRef.current.onFailure?.(next, e);
    },
    [go]
  );
  const call = (0, import_react.useCallback)(
    (key, fields) => posRequest(cfgRef.current.proxy, key, fields, getSignal()),
    []
  );
  const applyStatus = (0, import_react.useCallback)(
    (body, id) => {
      if (TERMINAL.has(phaseRef.current)) return true;
      const status = String(body.status ?? "").toUpperCase();
      const messageCode = String(body.messageCode ?? "");
      if (body.success === false && (body.errorCode || body.realCode) && !status) {
        if (matches(errorCodes(body), ALREADY_SKIPPED)) {
          finish(timedOutRef.current ? "timeout" : "cancelled");
          return true;
        }
        if (body.errorCode === LOOKUP_NOT_FOUND) {
          finish("error", err(LOOKUP_NOT_FOUND));
          return true;
        }
        setNotice("Couldn't refresh the status. Retrying\u2026");
        return false;
      }
      if (status === "AUTHORIZED") {
        const amount = Number(body.amount);
        const res = {
          p2pRequestId: id,
          txnId: body.txnId || void 0,
          amount: Number.isFinite(amount) && body.amount !== "" ? amount : void 0,
          mode: body.mode || body.paymentMode || void 0,
          cardLastFourDigit: body.cardLastFourDigit || void 0,
          receiptUrl: body.receiptUrl || void 0,
          reference: body.externalRefNumber || void 0
        };
        finish("success", null, res);
        cfgRef.current.onSuccess?.(res);
        return true;
      }
      if (status === "FAILED") {
        const code = body.errorCode;
        finish("failed", code ? err(code, body.errorMessage) : err("TXN_FAILED"));
        return true;
      }
      if (status === "EXPIRED" || messageCode === "P2P_STATUS_IN_EXPIRED") {
        finish("expired");
        return true;
      }
      if (status === "REVERSAL_PENDING") {
        finish("failed", err("REVERSAL_PENDING"));
        return true;
      }
      if (status === "VOIDED" || status === "REFUNDED") {
        finish("failed", err("TXN_REVERSED"));
        return true;
      }
      if (!status && CANCELLED_CODES.has(messageCode)) {
        finish(timedOutRef.current ? "timeout" : "cancelled");
        return true;
      }
      if (phaseRef.current === "waiting" || phaseRef.current === "starting") {
        go("waiting");
        setDetail(STATUS_DETAIL[messageCode] ?? null);
      }
      return false;
    },
    [finish, go, err]
  );
  const checkOnce = (0, import_react.useCallback)(
    async (id) => {
      try {
        const body = await call("status", { p2p_request_id: id });
        return applyStatus(body, id);
      } catch (e) {
        if (!isAbort(e)) setNotice("Couldn't refresh the status. Retrying\u2026");
        return false;
      }
    },
    [call, applyStatus]
  );
  const sendCancel = (0, import_react.useCallback)(
    async (id, reason) => {
      const markCancelSent = () => {
        cancelSentRef.current = true;
        if (reason === "timeout") timedOutRef.current = true;
        deadlineRef.current = Math.max(deadlineRef.current, Date.now() + getTiming().cancelGraceMs);
        nextCheckAtRef.current = Math.min(nextCheckAtRef.current, Date.now() + 2e3);
        if (!TERMINAL.has(phaseRef.current)) {
          go("cancelling");
          setDetail(reason === "timeout" ? "No response from the terminal. Cancelling the request\u2026" : null);
        }
      };
      let codes;
      try {
        const body = await call("cancel", { p2p_request_id: id });
        if (body.success !== false && !body.errorCode) {
          markCancelSent();
          return "ok";
        }
        codes = errorCodes(body);
      } catch (e) {
        if (isAbort(e)) return "failed";
        codes = e instanceof ProxyError ? [e.code, e.realCode] : ["UNKNOWN"];
      }
      if (matches(codes, ALREADY_SKIPPED)) {
        finish(reason === "timeout" ? "timeout" : "cancelled");
        return "done";
      }
      if (matches(codes, DUPLICATE_CANCEL)) {
        markCancelSent();
        return "ok";
      }
      if (matches(codes, PAYMENT_INITIATED)) {
        cancelSentRef.current = true;
        deadlineRef.current = Date.now() + getTiming().initiatedGraceMs;
        nextCheckAtRef.current = Math.min(nextCheckAtRef.current, Date.now() + 2e3);
        if (!TERMINAL.has(phaseRef.current)) go("finalizing");
        return "initiated";
      }
      if (reason === "user") setNotice(err(codes.find(Boolean)).message);
      return "failed";
    },
    [call, finish, go, err, getTiming]
  );
  const poll = (0, import_react.useCallback)(
    async (id) => {
      const gen = ++genRef.current;
      const alive = () => genRef.current === gen;
      nextCheckAtRef.current = startedAtRef.current + getTiming().pollStartDelayMs;
      while (alive()) {
        const now = Date.now();
        if (now >= deadlineRef.current) {
          if (cancelSentRef.current) {
            finish("unknown", err("STATUS_UNCONFIRMED"));
            return;
          }
          const outcome = await sendCancel(id, "timeout");
          if (!alive()) return;
          if (outcome === "failed") {
            finish("unknown", err("STATUS_UNCONFIRMED"));
            return;
          }
          continue;
        }
        if (now < nextCheckAtRef.current) {
          await sleep(Math.min(TICK_MS, nextCheckAtRef.current - now, deadlineRef.current - now));
          continue;
        }
        nextCheckAtRef.current = Date.now() + getTiming().pollIntervalMs;
        try {
          const body = await call("status", { p2p_request_id: id });
          if (!alive()) return;
          setNotice(null);
          if (applyStatus(body, id)) return;
        } catch (e) {
          if (isAbort(e)) return;
        }
      }
    },
    [call, applyStatus, sendCancel, finish, err, getTiming]
  );
  const startPayment = (0, import_react.useCallback)(
    async (args) => {
      if (IN_FLIGHT.has(phaseRef.current) || phaseRef.current === "unknown") return;
      const { amount, reference } = args;
      const validAmount = Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) / 100 === amount;
      if (!validAmount) {
        setError(err("INVALID_AMOUNT"));
        return;
      }
      if (!reference?.trim()) {
        setError(err("MISSING_REFERENCE"));
        return;
      }
      lastArgsRef.current = args;
      cancelSentRef.current = false;
      timedOutRef.current = false;
      setError(null);
      setNotice(null);
      setDetail(null);
      setResult(null);
      setRequestId(null);
      go("starting");
      try {
        const body = await call("start", buildStartFields(args));
        if (body.success === false || body.errorCode) {
          throw new ProxyError(primaryCode(body) ?? "UNKNOWN", { realCode: body.realCode });
        }
        const id = body.p2pRequestId || void 0;
        if (!id) throw new ProxyError("UNKNOWN");
        startedAtRef.current = Date.now();
        deadlineRef.current = startedAtRef.current + getTiming().timeoutMs;
        if (persistOn()) saveSession(storageKey(), id, startedAtRef.current);
        setRequestId(id);
        go("waiting");
        void poll(id);
      } catch (e) {
        if (isAbort(e)) return;
        finish("error", err(e instanceof ProxyError ? e.code : "UNKNOWN"));
      }
    },
    [call, poll, finish, go, err, getTiming]
  );
  const cancelPayment = (0, import_react.useCallback)(async () => {
    const id = requestId;
    if (!id || phaseRef.current !== "waiting") return;
    setNotice(null);
    go("cancelling");
    const outcome = await sendCancel(id, "user");
    if (TERMINAL.has(phaseRef.current) || outcome === "done") return;
    if (outcome === "failed") {
      go("waiting");
      return;
    }
    await checkOnce(id);
  }, [requestId, sendCancel, checkOnce, go]);
  const checkStatus = (0, import_react.useCallback)(async () => {
    const id = requestId;
    if (!id || phaseRef.current !== "unknown") return;
    setNotice(null);
    if (await checkOnce(id)) return;
    deadlineRef.current = Date.now() + 6e4;
    go(cancelSentRef.current ? "cancelling" : "waiting");
    setError(null);
    void poll(id);
  }, [requestId, checkOnce, poll, go]);
  const retry = (0, import_react.useCallback)(
    (overrides) => {
      if (lastArgsRef.current) void startPayment({ ...lastArgsRef.current, ...overrides });
    },
    [startPayment]
  );
  const reset = (0, import_react.useCallback)(() => {
    if (IN_FLIGHT.has(phaseRef.current) || phaseRef.current === "unknown") return;
    genRef.current++;
    if (persistOn()) clearSession(storageKey());
    lastArgsRef.current = null;
    go("idle");
    setError(null);
    setDetail(null);
    setNotice(null);
    setResult(null);
    setRequestId(null);
  }, [go]);
  (0, import_react.useEffect)(() => {
    if (persistOn()) {
      const s = readSession(storageKey());
      const t = getTiming();
      if (s?.requestId && s.startedAt && Date.now() - s.startedAt < t.timeoutMs + 5 * 6e4) {
        startedAtRef.current = s.startedAt;
        deadlineRef.current = s.startedAt + t.timeoutMs;
        cancelSentRef.current = false;
        timedOutRef.current = false;
        setRequestId(s.requestId);
        go("waiting");
        void poll(s.requestId);
      } else if (s) {
        clearSession(storageKey());
      }
    }
    return () => {
      genRef.current++;
      abortRef.current?.abort();
    };
  }, [poll, go, getTiming]);
  const labels = (0, import_react.useMemo)(() => ({ ...DEFAULT_LABELS, ...options.labels }), [options.labels]);
  const buttons = (0, import_react.useMemo)(
    () => getPosButtons(phase, !!error?.retryable, labels),
    [phase, error, labels]
  );
  const isBusy = IN_FLIGHT.has(phase);
  const isLocked = isBusy || phase === "unknown";
  const tone = getTone(phase);
  return {
    phase,
    message: error?.message ?? detail ?? PHASE_TEXT[phase],
    notice,
    error,
    requestId,
    result,
    buttons,
    tone,
    toneClass: TONE_CLASS[tone],
    isBusy,
    isLocked,
    inputLocked: isLocked || phase === "success",
    startPayment,
    cancelPayment,
    checkStatus,
    retry,
    reset
  };
};
var useRazorpayPOSBridge_default = useRazorpayPOSBridge;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BLOCKED_START_KEYS,
  DEFAULT_LABELS,
  DEFAULT_TIMING,
  ProxyError,
  buildStartFields,
  extractErrorCode,
  getPosButtons,
  getTone,
  posRequest,
  resolvePosError,
  useRazorpayPOSBridge
});
//# sourceMappingURL=index.cjs.map