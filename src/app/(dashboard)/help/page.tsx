import { LifeBuoy, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";

const faqs = [
  {
    answer:
      "Plan limits are enforced automatically when you create links, Link Pages, campaigns, QR codes, API keys, or automation rules.",
    question: "How do plan limits work?",
  },
  {
    answer:
      "Use the billing page to start a PayGate checkout. The plan badge updates after payment settlement is synced.",
    question: "How do I upgrade my plan?",
  },
  {
    answer:
      "Open Settings to update profile, password, notification preferences, 2FA, email, and account deletion options.",
    question: "Where do I manage account security?",
  },
  {
    answer:
      "API keys are available on paid plans from Settings > API Keys, and API documentation is available from the dashboard sidebar.",
    question: "Where do I find API access?",
  },
];

export default function HelpPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help</h1>
        <p className="text-sm text-muted-foreground">
          Find answers and contact support for account or product issues.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {faqs.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-4 text-primary" />
                  {item.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LifeBuoy className="size-4 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Include your account email and the link, campaign, or order ID involved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ButtonLink
                className="w-full"
                href="mailto:support@justqiu.cloud"
                variant="default"
              >
                <Mail className="size-4" />
                Email Support
              </ButtonLink>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                Typical response time is one business day.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Security Reports
              </CardTitle>
              <CardDescription>
                Report suspected abuse, account compromise, or payment issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ButtonLink
                className="w-full"
                href="mailto:security@justqiu.cloud"
                variant="outline"
              >
                Contact Security
              </ButtonLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
