import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Globe, ExternalLink, Timer, Eye, QrCode, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const linkPages = [
  { slug: "promo-ramadhan", brandName: "MyShop", title: "Ramadhan Mega Sale 2026 — Up to 70% Off!", ctaText: "Shop Now", clicks: 8142, views: 12300, hasCountdown: true, active: true },
  { slug: "launch-sneakers", brandName: "SneakPeak", title: "Limited Edition Sneakers Drop", ctaText: "Get Yours", clicks: 3120, views: 5600, hasCountdown: true, active: true },
  { slug: "app-download", brandName: "MyApp", title: "Download MyApp — The Best Productivity Tool", ctaText: "Install Now", clicks: 18900, views: 25600, hasCountdown: false, active: true },
  { slug: "discount-50", brandName: "MyBrand", title: "50% OFF Everything — Today Only", ctaText: "Claim Offer", clicks: 2100, views: 3800, hasCountdown: true, active: false },
];

export default function LinkPagesPage() {
  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Link Pages</h1><p className="text-sm text-muted-foreground">Micro landing pages that turn every link into a conversion engine.</p></div>
        <ButtonLink href="/links" size="sm" className="mt-2 sm:mt-0"><Plus className="size-4" /> Create Link Page</ButtonLink>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {linkPages.map((page) => (
          <Card key={page.slug} className={!page.active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary/10"><Globe className="size-5 text-primary" /></div>
                  <div><CardTitle className="text-base">{page.brandName}</CardTitle><CardDescription className="font-mono text-xs">/{page.slug}</CardDescription></div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={page.active} />
                  <DropdownMenu>
                    <DropdownMenuTrigger><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="mr-2 size-4" /> Edit Page</DropdownMenuItem>
                      <DropdownMenuItem><ExternalLink className="mr-2 size-4" /> Preview</DropdownMenuItem>
                      <DropdownMenuItem><Eye className="mr-2 size-4" /> View Analytics</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">{page.title}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ExternalLink className="size-3" />{page.ctaText}</span>
                {page.hasCountdown && <span className="flex items-center gap-1"><Timer className="size-3" />Countdown</span>}
                <span><QrCode className="inline size-3 mr-1" />QR</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/50 p-3">
                <div><p className="text-xs text-muted-foreground">Page Views</p><p className="text-lg font-bold tabular-nums">{page.views.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">CTA Clicks</p><p className="text-lg font-bold tabular-nums">{page.clicks.toLocaleString()}</p></div>
              </div>
              <div className="mt-2 flex gap-1"><Badge variant={page.active ? "default" : "secondary"}>{page.active ? "Active" : "Paused"}</Badge></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
