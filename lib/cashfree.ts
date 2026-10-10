// Cashfree hosted checkout (native SDK), wrapped as one awaitable call.
//
// The SDK only reports "the guest finished" (onVerify) or "it didn't go
// through" (onError). Neither is proof of payment — the caller must ask our
// backend, which checks the order with Cashfree, before showing a booking as
// paid. Only the short-lived payment session id reaches the app; Cashfree
// credentials stay on the server.
//
// react-native-cashfree-pg-sdk is a native module — required lazily so Expo Go
// and tests (where it isn't linked) still load the checkout screen.

export type CashfreeOutcome = "finished" | "cancelled" | "failed";

export function openCashfreeCheckout(
  paymentSessionId: string,
  orderId: string,
  mode: string | null | undefined,
): Promise<CashfreeOutcome> {
  let sdk: any;
  let contract: any;
  try {
    sdk = require("react-native-cashfree-pg-sdk");
    contract = require("cashfree-pg-api-contract");
  } catch {
    return Promise.reject(
      new Error("Payments need the latest Aangan Stay app. Please update the app and try again."),
    );
  }
  const service = sdk.CFPaymentGatewayService;

  return new Promise<CashfreeOutcome>((resolve, reject) => {
    const finish = (outcome: CashfreeOutcome) => {
      service.removeCallback();
      resolve(outcome);
    };
    try {
      service.removeCallback(); // drop any listener left by an earlier attempt
      service.setCallback({
        onVerify: () => finish("finished"),
        onError: (error: any) => {
          // Decide on the error code, never on the (reworded-at-will) message.
          finish(/cancel/i.test(String(error?.getCode?.() ?? "")) ? "cancelled" : "failed");
        },
      });
      const session = new contract.CFSession(
        paymentSessionId,
        orderId,
        mode === "production" ? contract.CFEnvironment.PRODUCTION : contract.CFEnvironment.SANDBOX,
      );
      service.doWebPayment(session);
    } catch {
      service.removeCallback();
      reject(new Error("Could not open the payment page. You have not been charged."));
    }
  });
}
