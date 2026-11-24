# razorpay-pos-bridge

A React hook that takes a payment on a **Razorpay POS terminal** (Ezetap POS Bridge `p2padapter`): start, status polling and cancel, all through **your own backend proxy**. The terminal credentials (`appKey`, `username`, device id) stay on your server and never reach the browser.

- Works with any backend that proxies Razorpay: Frappe/ERPNext, Laravel, Node, anything.
- Accepts the proxy's **raw Razorpay response** (also unwraps Frappe's `{ "message": {...} }`).
- UI-agnostic: it gives you state, messages and "which buttons to show". You bring the markup (Tailwind, Ant Design, plain HTML...).
- No runtime dependencies. Peer dependency: `react >= 17`. ESM + CJS + TypeScript types.

---

## Contents

1. [What it provides](#what-it-provides)
2. [Install](#install)
3. [Quick start](#quick-start)
4. [Hook API](#hook-api)
5. [Start / Status / Cancel: what they send](#start--status--cancel-what-they-send)
6. [What your proxy backend must return](#what-your-proxy-backend-must-return)
7. [Phases and buttons](#phases-and-buttons)
8. [Error codes](#error-codes)
9. [Timing](#timing)
10. [Security](#security)
11. [Testing without a terminal](#testing-without-a-terminal)
12. [Going live](#going-live)
13. [Troubleshooting](#troubleshooting)
14. [Publishing this package](#publishing-this-package)

---

## What it provides

| Feature | Details |
| --- | --- |
| Start, status, cancel | `startPayment`, automatic polling, `cancelPayment`, `checkStatus`, `retry`, `reset` |
| Razorpay best practice timing | first status check at 30s, then every 10s, auto-cancel at 150s (all configurable) |
| Correct success rule | paid **only** when `status === "AUTHORIZED"` |
| Every documented error code | friendly messages for all codes in the Razorpay doc, plus `EZETAP_0000609`, `EZETAP_0000607`, `P2P_PAYMENT_INITIATED`, `REVERSAL_PENDING`; unknown codes fall back to the server message |
| Button logic | `buttons.pay / cancel / retry / checkStatus / newPayment` with `show`, `disabled`, `loading`, `label` for each phase |
| Locking | `isLocked` / `inputLocked` so the parent can block "Complete Order", "Edit cart" and the amount input while the terminal is busy |
| Safe unknown state | if the result cannot be confirmed, a second charge is **blocked** until the cashier checks the status |
| Cancel edge cases | cancel refused after the customer paid (`P2P_PAYMENT_INITIATED`), duplicate cancel, already cancelled |
| Payment modes | `mode`: `ALL`, `CARD`, `UPI`, `BHARATQR`, `CASH` |
| JSON or FormData | `payloadFormat: "json" \| "form"` |
| Credential stripping | `appKey`, `username`, `pushTo`, `deviceId`, ... are removed from the request even if you pass them |
| Resume after refresh | an in-flight payment continues after a page reload (sessionStorage) |
| Labels and messages | override button labels and any error message (translations) |
| Callbacks | `onSuccess(result)`, `onFailure(phase, error)` |
| Types | full TypeScript types |

---

## Install

```bash
npm install razorpay-pos-bridge
```

---

## Quick start

A complete example is in [`examples/PosTerminalPay.jsx`](examples/PosTerminalPay.jsx).

```jsx
import { useRazorpayPOSBridge } from "razorpay-pos-bridge";

const proxy = {
  url: "https://erp.example.com",       // your backend ("" for same origin)
  startEndpoint: "/api/payment/start",
  statusEndpoint: "/api/payment/status",
  cancelEndpoint: "/api/payment/cancel",
  payloadFormat: "json",                // or "form"
  // Your own login/session only. Never terminal credentials.
  getHeaders: () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
};

export default function TerminalPay({ invoice, amount, onPaid }) {
  const pos = useRazorpayPOSBridge({
    proxy,
    sessionKey: `pos:${invoice}`,          // one resumable payment per invoice
    onSuccess: (result) => onPaid(result), // result.txnId, result.amount, ...
  });
  const { buttons: b } = pos;

  // Razorpay needs a UNIQUE externalRefNumber for every attempt.
  const pay = () =>
    pos.startPayment({
      amount,
      reference: `${invoice}-${Date.now()}`,
      externalRefNumber2: invoice,   // keeps your invoice number searchable at Razorpay
      mode: "CARD",
    });

  return (
    <div>
      {b.pay.show && <button onClick={pay} disabled={b.pay.disabled}>{b.pay.label}</button>}
      {b.cancel.show && <button onClick={pos.cancelPayment} disabled={b.cancel.disabled}>{b.cancel.label}</button>}
      {b.retry.show && <button onClick={pay}>{b.retry.label}</button>}
      {b.checkStatus.show && <button onClick={pos.checkStatus}>{b.checkStatus.label}</button>}
      {b.newPayment.show && <button onClick={pos.reset}>{b.newPayment.label}</button>}

      {pos.message && <p className={pos.toneClass}>{pos.message}</p>}
      {pos.notice && <p>{pos.notice}</p>}
    </div>
  );
}
```

### Block the rest of the screen while the terminal is busy

```jsx
<button disabled={pos.isLocked}>Complete order</button>
<button disabled={pos.isLocked}>Edit cart</button>
<input value={amount} disabled={pos.inputLocked} />
```

### Retrying with a new amount

`retry()` re-sends the **same** arguments (same amount, same reference). If the amount changed, or Razorpay rejected the reference as a duplicate, call `startPayment` again with fresh values (as `pay` above does) or pass overrides:

```jsx
pos.retry({ amount: 450, reference: `${invoice}-${Date.now()}` });
```

### Ant Design / Tailwind

The hook returns no markup, so use your own components, for example `<Button loading={b.pay.loading} disabled={b.pay.disabled}>`. `pos.toneClass` is a Tailwind text colour class (`text-green-700`, `text-red-600`, ...); `pos.tone` is `"neutral" | "success" | "error" | "warning"` if you prefer to map it yourself.

---

## Hook API

```ts
const pos = useRazorpayPOSBridge(options);
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `proxy.url` | `string` | required | Base URL of your backend. `""` for same origin. |
| `proxy.startEndpoint` | `string` | `/api/start` | Path of your start route. |
| `proxy.statusEndpoint` | `string` | `/api/status` | Path of your status route. |
| `proxy.cancelEndpoint` | `string` | `/api/cancel` | Path of your cancel route. |
| `proxy.payloadFormat` | `"form" \| "json"` | `"form"` | `form` sends multipart `FormData`; `json` sends a JSON body. |
| `proxy.getHeaders` | `() => HeadersInit \| Promise<HeadersInit>` | none | Your session/auth headers (`Authorization`, `X-Frappe-CSRF-Token`, ...). |
| `proxy.credentials` | `RequestCredentials` | browser default | Use `"include"` only when you rely on cookies and your CORS allows it. |
| `proxy.fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch (tests, adapters). |
| `timing.pollStartDelayMs` | `number` | `30000` | Delay before the first status check. |
| `timing.pollIntervalMs` | `number` | `10000` | Gap between status checks. |
| `timing.timeoutMs` | `number` | `150000` | Cancel the request if it is still pending after this long. |
| `timing.cancelGraceMs` | `number` | `30000` | How long to wait for the terminal to confirm a cancel. |
| `timing.initiatedGraceMs` | `number` | `60000` | How long to wait for the final result once the customer has already paid. |
| `labels` | `Partial<POSLabels>` | English | Override button labels: `pay, sending, cancel, cancelling, retry, checkStatus, newPayment, close`. |
| `messages` | `Record<string,string>` | none | Override the message of any error code, e.g. `{ EZETAP_0000385: "Terminal offline" }`. |
| `persist` | `boolean` | `true` | Resume an in-flight payment after a page refresh. |
| `sessionKey` | `string` | `razorpay_pos_active_payment` | sessionStorage key. Use one per payment slot, e.g. `pos:${invoice}`. |
| `onSuccess` | `(result) => void` | none | Called once when the payment is `AUTHORIZED`. |
| `onFailure` | `(phase, error) => void` | none | Called when a payment ends without success. |

### Return value

| Field | Type | Description |
| --- | --- | --- |
| `phase` | `PaymentPhase` | See [Phases and buttons](#phases-and-buttons). |
| `message` | `string` | Text to show the cashier for this state (may be `""`). |
| `notice` | `string \| null` | Short, non-final problem, e.g. "Couldn't refresh the status. Retrying…". |
| `error` | `{ code, message, retryable } \| null` | Last error. `code` is for logging. |
| `requestId` | `string \| null` | Razorpay `p2pRequestId` once the request is on the terminal. |
| `result` | `PaymentResult \| null` | Set on success: `{ p2pRequestId, txnId, amount, mode, cardLastFourDigit, receiptUrl, reference }`. |
| `buttons` | `POSButtons` | `{ pay, cancel, retry, checkStatus, newPayment }`, each `{ show, disabled, loading, label }`. |
| `tone` / `toneClass` | | Colour hint for `message`. |
| `isBusy` | `boolean` | `starting`, `waiting`, `cancelling` or `finalizing`. |
| `isLocked` | `boolean` | `isBusy` **or** `unknown`. Block Complete Order / Edit Cart while true. |
| `inputLocked` | `boolean` | `isLocked` or `success`. Disable the amount input. |
| `startPayment(args)` | `Promise<void>` | Start a payment. Ignored while a payment is in progress or `unknown`. |
| `cancelPayment()` | `Promise<void>` | Cancel the current request (only in `waiting`). |
| `checkStatus()` | `Promise<void>` | From `unknown`: look at the status again. |
| `retry(overrides?)` | `void` | Start again with the previous arguments (optionally overridden). |
| `reset()` | `void` | Back to `idle`. Works only from a final state. |

Also exported: `resolvePosError`, `extractErrorCode`, `getPosButtons`, `getTone`, `DEFAULT_LABELS`, `DEFAULT_TIMING`, `BLOCKED_START_KEYS`, `buildStartFields`, `posRequest`, `ProxyError` and all types.

---

## Start / Status / Cancel: what they send

There are two hops. The **browser → your proxy** hop is what this package sends. The **proxy → Razorpay** hop is what your proxy sends (it adds the credentials).

### Start: `startPayment(args)`

| Arg | Required | Type | Sent to proxy as | Notes |
| --- | --- | --- | --- | --- |
| `amount` | yes | number | `amount` = `"100.00"` | Rupees, > 0, max 2 decimals. Always sent as a 2-decimal string. |
| `reference` | yes | string | `externalRefNumber` | **Must be unique per attempt** (Razorpay rejects duplicates). Use `${invoice}-${Date.now()}`. |
| `mode` | no | `ALL \| CARD \| UPI \| BHARATQR \| CASH` | `mode` | Razorpay requires a mode. If you omit it, your proxy should default to `ALL`. |
| `accountLabel` | no | string | `accountLabel` | Only for multi MID/TID setups. |
| `customerMobileNumber` | no | string | `customerMobileNumber` | |
| `customerEmail` | no | string | `customerEmail` | |
| `customerName` | no | string | `customerName` | |
| `description` | no | string | `description` | Truncated to 50 characters. |
| `externalRefNumber2/3/4` | no | string | same name | Extra references. Put your invoice number in `externalRefNumber2`. |
| `externalRefNumbers` | no | string[] | `externalRefNumbers` = JSON string | e.g. `'["a","b"]'`. Your proxy must `JSON.parse` it. |
| any other key | no | string / number | same name | Passed through as a string. |

**Never sent** (stripped even if you pass them): `appKey`, `username`, `pushTo`, `deviceId`, `deviceSerial`, `orgCode`, `merchantCode`, `mid`, `tid`.

Example request body (`payloadFormat: "json"`):

```json
{
  "amount": "890.00",
  "externalRefNumber": "ACC-PSINV-2026-00078-1763870000000",
  "mode": "CARD",
  "externalRefNumber2": "ACC-PSINV-2026-00078",
  "description": "POS Invoice ACC-PSINV-2026-00078"
}
```

With `payloadFormat: "form"` the same keys go as multipart form fields.

Proxy → Razorpay `POST {host}/api/3.0/p2padapter/pay`:

```json
{
  "appKey": "<from env>",
  "username": "<from env>",
  "amount": "890.00",
  "externalRefNumber": "ACC-PSINV-2026-00078-1763870000000",
  "mode": "CARD",
  "pushTo": { "deviceId": "<from env>" },
  "externalRefNumber2": "ACC-PSINV-2026-00078",
  "description": "POS Invoice ACC-PSINV-2026-00078"
}
```

### Status: automatic (and `checkStatus()`)

| Sent to proxy | Type | Notes |
| --- | --- | --- |
| `p2p_request_id` | string | The `p2pRequestId` returned by start. |

Proxy → Razorpay `POST .../p2padapter/status`: `{ appKey, username, origP2pRequestId: <p2p_request_id> }`.

### Cancel: `cancelPayment()` (and the automatic cancel at timeout)

| Sent to proxy | Type | Notes |
| --- | --- | --- |
| `p2p_request_id` | string | The `p2pRequestId` returned by start. |

Proxy → Razorpay `POST .../p2padapter/cancel`: `{ appKey, username, origP2pRequestId: <p2p_request_id>, pushTo: { deviceId } }`.

### Summary

| Call | Frontend → proxy | Proxy → Razorpay |
| --- | --- | --- |
| Start | `amount`, `externalRefNumber`, optional fields | + `appKey`, `username`, `pushTo.deviceId`, default `mode` |
| Status | `p2p_request_id` | `origP2pRequestId` + `appKey`, `username` |
| Cancel | `p2p_request_id` | `origP2pRequestId` + `appKey`, `username`, `pushTo` |

All three are `POST`. Every request also carries `Accept: application/json` and whatever `getHeaders()` returns.

---

## What your proxy backend must return

Return **Razorpay's own response** (after removing sensitive fields, see below). The hook reads only the fields in the tables, so extra fields are ignored. A Frappe `{ "message": { ... } }` wrapper is unwrapped automatically.

### Start response

| Field | When | Meaning |
| --- | --- | --- |
| `success` | always | `true` or `false` |
| `p2pRequestId` | on success | **Required** on success. The hook stores it and polls with it. Missing → "Something went wrong". |
| `errorCode` | on failure | e.g. `EZETAP_0000385` → mapped to a friendly message |
| `errorMessage` | on failure | Optional. Only used for codes the package does not know |
| `realCode` | optional | Also checked when matching codes |

Success: `{ "success": true, "p2pRequestId": "260108094553123E020043271" }`

Failure (HTTP 200 or an error status, both work): `{ "success": false, "errorCode": "EZETAP_0000385", "errorMessage": "Device is offline" }`

The hook treats the start as failed when `success === false` **or** `errorCode` is present.

### Status response

| Field | Meaning |
| --- | --- |
| `status` | The payment state. **`AUTHORIZED` is the only success.** Others: `FAILED`, `EXPIRED`, `REVERSAL_PENDING`, `VOIDED`, `REFUNDED`; anything else counts as still pending |
| `messageCode` | `P2P_STATUS_QUEUED`, `P2P_DEVICE_SENT`, `P2P_DEVICE_RECEIVED`, `P2P_DEVICE_TXN_DONE`, `P2P_STATUS_UNKNOWN`, `P2P_STATUS_IN_EXPIRED`, `P2P_DEVICE_CANCELED`, `P2P_STATUS_IN_CANCELED_FROM_EXTERNAL_SYSTEM` |
| `success` | `false` with an `errorCode` and no `status` means the lookup itself failed |
| `errorCode`, `errorMessage` | e.g. on a declined card: `status: "FAILED"` plus `errorCode` / `errorMessage` |
| `txnId` | Razorpay transaction id (put it in `reference_no`) |
| `amount` | Confirmed amount, used for `result.amount` |
| `mode` / `paymentMode` | Used for `result.mode` |
| `cardLastFourDigit` | Optional |
| `receiptUrl` | Optional |
| `externalRefNumber` | Echoed back as `result.reference` |

How each status is handled:

| What the proxy returns | Hook result |
| --- | --- |
| `status: "AUTHORIZED"` | `success` (calls `onSuccess`) |
| `status: "FAILED"` (+ optional `errorCode`) | `failed`, retryable. Shows the mapped message, or the server message for unknown codes |
| `status: "EXPIRED"` or `messageCode: "P2P_STATUS_IN_EXPIRED"` | `expired` |
| `status: "REVERSAL_PENDING"` | `failed` with a "being reversed" message, retryable |
| `status: "VOIDED"` / `"REFUNDED"` | `failed` ("reversed") |
| no `status`, `messageCode` = `P2P_DEVICE_CANCELED` or `P2P_STATUS_IN_CANCELED_FROM_EXTERNAL_SYSTEM` | `cancelled` (or `timeout` if the hook sent the cancel) |
| `success:false` + `EZETAP_0000609` | `cancelled` / `timeout` (already skipped) |
| `success:false` + `EZETAP_0000383` | `error`, "couldn't find this payment request" |
| `success:false` + any other code, no `status` | keeps polling (shows a notice). The hook never ends in a state that would allow a second charge |
| anything else (`QUEUED`, `DEVICE_SENT`, `DEVICE_RECEIVED`, `STATUS_UNKNOWN`, ...) | keeps waiting |

### Cancel response

| Field | Meaning |
| --- | --- |
| `success` | `true` = cancel accepted. The hook then confirms with a status call |
| `errorCode` / `realCode` | `P2P_PAYMENT_INITIATED` → customer already paying, hook goes to `finalizing` and waits. `EZETAP_0000609` → already cancelled. `EZETAP_0000607` → cancel already in progress (treated as accepted) |
| `errorMessage` | Optional |

### HTTP status codes

| Your proxy answers | Hook behaviour |
| --- | --- |
| `200` with Razorpay's JSON | read as above |
| `4xx/5xx` **with** `errorCode` / `realCode` in the JSON | that code is used (so `422 { "errorCode": "EZETAP_0000039" }` works) |
| `4xx/5xx` with a Frappe `_server_messages` or `message` string that contains a code like `EZETAP_0000385` | the code is extracted from the text |
| `401`, `403`, `419` without a code | `UNAUTHORIZED` ("session expired") |
| `5xx` without a code | `SERVER_ERROR` |
| `200` but not a JSON object | `SERVER_ERROR` |
| network failure | `NETWORK_ERROR` |

During polling, a transient network/server error never ends the payment: the hook keeps polling until its deadline.

### Remove sensitive fields before you respond

Whitelist the fields you return. Razorpay's raw response contains terminal and merchant details that the browser should not see. Keep these on the server: `deviceSerial`, `mid`, `tid`, `merchantCode`, `orgCode`, `sessionKey`, `username`, `formattedPan`, `latitude`, `longitude`.

The safe whitelist (this is what the Express example uses):

- Start: `success, errorCode, errorMessage, realCode, p2pRequestId`
- Status: `success, messageCode, message, errorCode, errorMessage, realCode, status, p2pRequestId, txnId, amount, mode, paymentMode, cardLastFourDigit, receiptUrl, externalRefNumber`
- Cancel: `success, errorCode, errorMessage, realCode, origP2pRequestId`

### Proxy checklist

1. Authenticate every route (your session, JWT, Frappe login, Laravel Sanctum, ...). Answer `401` when not logged in.
2. Read `amount` and `externalRefNumber` from the body (JSON **and** multipart, if you want to support both).
3. Reject a missing/invalid amount or reference **before** calling Razorpay.
4. Add `appKey`, `username`, `pushTo.deviceId` from environment variables. **Ignore** any such fields sent by the client.
5. Default `mode` to `ALL`.
6. `JSON.parse` `externalRefNumbers` if present.
7. Call `/api/3.0/p2padapter/{pay,status,cancel}` and return the response through the whitelist above.
8. When Razorpay is unreachable, answer `502` with `{ "success": false, "errorCode": "SERVER_ERROR" }`.
9. On the final "complete order" call, **verify the payment on the server** by calling Razorpay `status` with the stored `p2pRequestId`. Do not trust a flag from the browser. If you compare amounts, compare against `amount` from that status response.

Working proxies: [`examples/express-proxy/server.mjs`](examples/express-proxy/server.mjs) (tested against the mock) and sketches for Frappe and Laravel in [`docs/frappe-and-laravel.md`](docs/frappe-and-laravel.md) (not run against a real Frappe/Laravel app).

---

## Phases and buttons

| Phase | Meaning | Buttons shown |
| --- | --- | --- |
| `idle` | Nothing in progress | **Pay** |
| `starting` | Start request in flight | Pay (loading), Cancel (disabled until the request id exists) |
| `waiting` | Request is on the terminal, polling | **Cancel** |
| `cancelling` | Cancel sent, confirming | Cancel (loading, disabled) |
| `finalizing` | Customer already paid, cancel refused, waiting for the result | none |
| `success` | `AUTHORIZED` | **New payment** |
| `failed` | Declined / failed / reversal pending | **Try again** |
| `cancelled` | Cancelled | **Try again** |
| `expired` | Request expired | **Try again** |
| `timeout` | No response, request cancelled by the hook | **Try again** |
| `unknown` | Result could not be confirmed | **Check status** only (no second charge) |
| `error` | Could not start | **Try again** if retryable, else **Close** (`newPayment` button with the `close` label) |

`isLocked` is true in `starting`, `waiting`, `cancelling`, `finalizing` **and** `unknown`.

---

## Error codes

From the Razorpay POS doc (messages are customer-safe; the raw code stays in `error.code`):

| Code | Message (short) | Retry |
| --- | --- | --- |
| `EZETAP_0000382` | Terminal not recognised | no |
| `EZETAP_0000381` | Terminal can't receive requests (on, online, logged in?) | yes |
| `EZETAP_0000384` | Terminal couldn't be notified | yes |
| `EZETAP_0000385` | Terminal offline | yes |
| `EZETAP_0000039` | Amount not supported | no |
| `EZETAP_0000050` | Above transaction limit | no |
| `EZETAP_0000162` | Below minimum amount | no |
| `EZETAP_0000048` / `EZETAP_0000047` | Tip not enabled / tip problem | no |
| `EZETAP_0000148` | Terminal not linked to this organisation | no |
| `EZETAP_0000387` | Payment reference missing | no |
| `EZETAP_6000001` | Payment mode not available on the terminal | no |
| `EZETAP_0000623` | Terminal busy with another payment | yes |
| `EZETAP_0000383` | Payment request not found | yes |
| `EZETAP_0000609` | Already cancelled on the terminal | yes |
| `EZETAP_0000607` | Cancellation already in progress | no |
| `P2P_PAYMENT_INITIATED` | Customer already paying, waiting for result | no |
| `REVERSAL_PENDING` | Being reversed, refunded automatically | yes |
| Any other `EZETAP_*` (e.g. card declines) | The server's `errorMessage` is shown | yes |

Package codes: `NETWORK_ERROR`, `UNAUTHORIZED`, `SERVER_ERROR`, `INVALID_AMOUNT`, `MISSING_REFERENCE`, `TXN_FAILED`, `TXN_REVERSED`, `STATUS_UNCONFIRMED`, `UNKNOWN`.

Change a message:

```js
useRazorpayPOSBridge({ proxy, messages: { EZETAP_0000385: "Terminal is offline. Call IT." } });
```

---

## Timing

Follows Razorpay's guidance: first status check **30 s** after start, then every **10 s**, and cancel the request if nothing has happened by **150 s**. After the hook sends a timeout cancel it waits up to 30 s for confirmation; if the terminal never confirms, the phase becomes `unknown` and a second charge stays blocked.

Shorten them only for testing:

```js
useRazorpayPOSBridge({ proxy, timing: { pollStartDelayMs: 5000, pollIntervalMs: 3000, timeoutMs: 60000 } });
```

---

## Security

- The browser sends only the payment details. `appKey`, `username`, `pushTo` and device ids are blocked in the client and must be added **only** by your proxy.
- `getHeaders` is for **your** session auth only.
- The proxy must authenticate every call and must whitelist its response (see above).
- The hook decides what to show the cashier. It does not decide what is *paid*. Verify the payment again on your server when you complete the order.
- Use a unique `reference` per attempt. Reusing one makes Razorpay reject the request.
- Resume-after-refresh stores only the `p2pRequestId` and the start time in `sessionStorage`.

---

## Testing without a terminal

Razorpay demo amounts (demo host `demo.ezetap.com`): for example `410` never completes (timeout), `505` is "do not honor", `531` is declined. See the Razorpay doc for the full list.

A local fake Ezetap is included:

```bash
cd examples/express-proxy
npm install
npm run mock                          # fake Ezetap on :4010
EZETAP_BASE_URL=http://localhost:4010 EZETAP_APP_KEY=x EZETAP_USERNAME=x \
EZETAP_DEVICE_ID=dev1 npm start       # proxy on :5000
```

Mock behaviour: amount `410` never completes, `505` is declined, every other amount is `AUTHORIZED` after about 5 seconds, and device id `offline` returns `EZETAP_0000385`.

Package tests: `npm test`.

---

## Going live

1. Get the production `appKey`, `username` and device id from Razorpay.
2. Set the proxy environment: `EZETAP_BASE_URL=https://www.ezetap.com` (production) instead of `https://demo.ezetap.com`.
3. Run one real small payment on the terminal and check: success, cancel, and a decline.
4. Make sure the proxy verifies the status again at "complete order".
5. Restrict CORS to your own frontend origin.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Something went wrong" right after Pay | Start response has no `p2pRequestId` (check the proxy's whitelist and field names) |
| Stuck on "Waiting…" | Status response has no `status` / `messageCode`, or the proxy renames `status`. Return Razorpay's fields as they are |
| `EZETAP_0000387` / duplicate reference | Reusing `externalRefNumber`. Use a new `reference` per attempt |
| Retry sends the old amount | `retry()` reuses old arguments. Call `startPayment` with the new amount or `retry({ amount })` |
| "Your session has expired" | Proxy answered 401/403/419. Check `getHeaders` |
| CORS error | Allow your frontend origin and `Authorization` header on the proxy; `OPTIONS` must return 204 |
| Backend says the amount doesn't match (`0.0`) | Your server-side verification looks up the wrong record. Verify with Razorpay `status` using the stored `p2pRequestId` |

---

License: MIT.