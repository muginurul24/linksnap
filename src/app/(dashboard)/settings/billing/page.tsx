import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Building } from "lucide-react";

const plans = [
  {
    name: "Free", price: "$0", period: "forever", icon: Zap,
    description: "Perfect for getting started.", features: ["25 short links", "3 Link Pages", "2 Smart Rules per link", "10 QR codes", "30-day analytics", "Basic support"], current: true,
  },
  {
    name: "Pro", price: "$8", period: "per month", icon: Sparkles, highlighted: true,
    description: "For power marketers and growing businesses.", features: ["500 short links", "50 Link Pages", "5 Smart Rules per link", "100 QR codes", "180-day analytics", "10 campaigns", "UTM auto-builder", "A/B split testing", "Link scheduler", "API access (500 req/hr)", "Custom branding", "Priority support"], current: false,
  },
  {
    name: "Business", price: "$19", period: "per month", icon: Building,
    description: "For teams and agencies at scale.", features: ["Unlimited short links", "Unlimited Link Pages", "Unlimited Smart Rules", "500 QR codes", "365-day analytics", "Unlimited campaigns", "Unlimited A/B variants", "Webhook callbacks", "API access (5000 req/hr)", "Export PDF + API"], current: false,
  },
];

export default function BillingPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and billing details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
          <CardDescription>You are on the Free plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Free Plan</p>
                <p className="text-xs text-muted-foreground">25 links · 3 Link Pages · 10 QR codes</p>
              </div>
            </div>
            <Badge>Active</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.highlighted ? "border-primary shadow-lg ring-1 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <plan.icon className="size-5 text-primary" />
                <CardTitle>{plan.name}</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/{plan.period}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                disabled={plan.current}
              >
                {plan.current ? "Current Plan" : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
