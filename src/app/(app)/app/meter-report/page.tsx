import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getX402ServerEnv, usdToUsdcMicros } from "@/lib/env/x402";
import { PaidMeterReportCard } from "@/features/x402/PaidMeterReportCard";

export default function MeterReportPage() {
  try {
    const env = getX402ServerEnv();
    const maxValue = usdToUsdcMicros(env.X402_PRICE_USD);

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Premium Meter Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay-per-request access protected by x402 (HTTP 402).
          </p>
        </div>

        <PaidMeterReportCard
          endpoint="/api/paid/meter-report"
          network={env.X402_NETWORK}
          payTo={env.X402_PAY_TO_ADDRESS}
          priceUsd={env.X402_PRICE_USD}
          maxValue={maxValue}
        />
      </div>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Premium Meter Report</h1>
        <Card>
          <CardHeader>
            <CardTitle>x402 not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Set x402 environment variables in <code className="font-mono">.env.local</code>{" "}
              to enable paid requests.
            </p>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">
              {message}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }
}

