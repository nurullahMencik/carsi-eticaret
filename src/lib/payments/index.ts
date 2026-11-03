import { DemoProvider } from "./demo";
import { IYZICO_SANDBOX_URL, IyzicoProvider } from "./iyzico";
import type { PaymentProvider, PaymentProviderId } from "./types";

export type ActiveProviderInfo = { id: PaymentProviderId; sandbox: boolean };

/** iyzico is used only when both keys are configured; otherwise the demo provider. */
export function activeProviderId(env: NodeJS.ProcessEnv = process.env): PaymentProviderId {
  return env.IYZICO_API_KEY?.trim() && env.IYZICO_SECRET_KEY?.trim() ? "IYZICO" : "DEMO";
}

export function getIyzicoProvider(env: NodeJS.ProcessEnv = process.env): IyzicoProvider | null {
  if (activeProviderId(env) !== "IYZICO") return null;
  return new IyzicoProvider({
    apiKey: env.IYZICO_API_KEY!.trim(),
    secretKey: env.IYZICO_SECRET_KEY!.trim(),
    baseUrl: env.IYZICO_BASE_URL?.trim() || IYZICO_SANDBOX_URL,
  });
}

export const demoProvider = new DemoProvider();

export function getProvider(id: PaymentProviderId, env: NodeJS.ProcessEnv = process.env): PaymentProvider {
  if (id === "IYZICO") {
    const iyzico = getIyzicoProvider(env);
    if (!iyzico) throw new Error("iyzico is not configured");
    return iyzico;
  }
  return demoProvider;
}

export function getActiveProvider(env: NodeJS.ProcessEnv = process.env): PaymentProvider {
  return getProvider(activeProviderId(env), env);
}
