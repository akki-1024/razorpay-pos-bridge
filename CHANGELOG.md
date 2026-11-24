# Changelog

## 1.1.0

First release of this module. (`1.0.0` and `0.0.0-stage` were published and unpublished earlier, and npm never lets a version number be reused, so this starts at 1.1.0.)

- `useRazorpayPOSBridge` hook: start, status polling and cancel through your own proxy.
- Follows Razorpay's best practices: first status check at 30s, every 10s, cancel at 150s. A payment is successful only when `status === "AUTHORIZED"`.
- Phases and per-state button logic (`buttons`, `isLocked`, `inputLocked`).
- User-facing messages for every documented error code, plus `EZETAP_0000609`, `EZETAP_0000607`, `P2P_PAYMENT_INITIATED` and `REVERSAL_PENDING`.
- `payloadFormat: "form" | "json"`; terminal credentials (`appKey`, `username`, `pushTo`, ...) are never sent.
- Resume after a page refresh (`persist`, `sessionKey`).
