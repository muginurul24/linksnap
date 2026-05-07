import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Megaphone, TrendingUp, Calendar, BarChart3, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const campaigns = [
  { name: "Ramadhan Mega Sale", slug: "ramadhan-2026", links: 12, totalClicks: 45210, startDate: "2026-04-01", endDate: "2026-05-01", active: true, utmSource: "instagram" },
  { name: "Product Launch Q2", slug: "launch-q2-2026", links: 8, totalClicks: 12890, startDate: "2026-05-01", endDate: "2026-06-30", active: true, utmSource: "twitter" },
  { name: "Newsletter Growth", slug: "newsletter-growth", links: 5, totalClicks: 3200, startDate: "2026-03-15", endDate: "2026-04-15", active: false, utmSource: "email" },
];

export default function CampaignsPage() {
  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Campaigns</h1><p className="text-sm text-muted-foreground">Group links into campaigns with auto UTM and unified analytics.</p></div>
        <ButtonLink href="/campaigns/new" size="sm" className="mt-2 sm:mt-0"><Plus className="size-4" /> New Campaign</ButtonLink>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((camp) => (
          <Card key={camp.slug} className={!camp.active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-chart-2/10"><Megaphone className="size-5 text-chart-2" /></div>
                  <div><CardTitle className="text-base">{camp.name}</CardTitle><CardDescription className="text-xs">{camp.links} links</CardDescription></div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Edit className="mr-2 size-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem><BarChart3 className="mr-2 size-4" /> Analytics</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3">
                <div><p className="text-xs text-muted-foreground">Total Clicks</p><p className="text-lg font-bold tabular-nums">{camp.totalClicks.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Avg/Link</p><p className="text-lg font-bold tabular-nums">{Math.round(camp.totalClicks / camp.links).toLocaleString()}</p></div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1"><Calendar className="size-3" />{camp.startDate} → {camp.endDate}</p>
                <p className="flex items-center gap-1"><TrendingUp className="size-3" />source={camp.utmSource}</p>
              </div>
              <div className="mt-3"><Badge variant={camp.active ? "default" : "secondary"}>{camp.active ? "Active" : "Ended"}</Badge></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
