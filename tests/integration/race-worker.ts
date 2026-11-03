/**
 * Runs confirmPayment in a separate Node process (its own SQLite connection), like a
 * second server instance. Usage: tsx race-worker.ts <orderId> <amount> <startAtEpochMs>
 */
import { createPrismaClient } from "@/lib/db";
import { confirmPayment } from "@/lib/services/orders";

const [orderId, amount, startAt] = process.argv.slice(2);
const client = createPrismaClient();

async function main() {
  await client.$queryRawUnsafe("SELECT 1"); // open the connection before the start line
  const wait = Number(startAt) - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const result = await confirmPayment(
    orderId!,
    { status: "success", providerRef: `demo_worker_${process.pid}`, amount: Number(amount), isDemo: true, provider: "DEMO" },
    new Date(),
    client,
  );
  process.stdout.write(`\nRESULT:${JSON.stringify(result)}\n`);
}

main()
  .catch((error) => {
    process.stdout.write(`\nRESULT:${JSON.stringify({ status: "error", message: String(error) })}\n`);
    process.exitCode = 1;
  })
  .finally(() => client.$disconnect());
