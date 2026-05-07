"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowUpRight, ArrowDownRight, Link2, MousePointerClick, Megaphone, QrCode, Plus, ExternalLink, Copy, BarChart3, Trash2, MoreHorizontal } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statsCards = [
  { title: "Total Links", value: "1,234", change: "+12.5%", trend: "up" as const, icon: Link2 },
  { title: "Clicks Today", value: "8,921", change: "+23.1%", trend: "up" as const, icon: MousePointerClick },
  { title: "Active Campaigns", value: "5", change: "+2 this week", trend: "up" as const, icon: Megaphone },
  { title: "QR Scans", value: "3,012", change: "-3.2%", trend: "down" as const, icon: QrCode },
];

const clickData = [
  { date: "Apr 29", clicks: 1200 }, { date: "Apr 30", clicks: 1450 },
  { date: "May 1", clicks: 980 }, { date: "May 2", clicks: 2100 },
  { date: "May 3", clicks: 1800 }, { date: "May 4", clicks: 2400 },
  { date: "May 5", clicks: 3100 }, { date: "May 6", clicks: 8921 },
];

const topCountries = [
  { country: "Indonesia", clicks: 4521 }, { country: "Malaysia", clicks: 1230 },
  { country: "Singapore", clicks: 890 }, { country: "United States", clicks: 780 },
  { country: "India", clicks: 500 },
];

const recentLinks = [
  { slug: "promo-ramadhan", destination: "https://shopee.co.id/promo-ramadhan", clicks: 2341, created: "2 days ago" },
  { slug: "launch-sneakers", destination: "https://tokopedia.com/sneakers-launch", clicks: 1890, created: "3 days ago", hasPage: true },
  { slug: "ig-linktree", destination: "https://instagram.com/mystore", clicks: 567, created: "1 week ago" },
  { slug: "discount-50", destination: "https://mybrand.id/discount?code=LAUNCH50", clicks: 443, created: "1 week ago", hasPage: true },
  { slug: "webinar-signup", destination: "https://zoom.us/webinar/register/xyz", clicks: 89, created: "2 weeks ago" },
];

export default function DashboardOverview() {
  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here&apos;s your link performance overview.</p>
        </div>
        <ButtonLink href="/links/new" size="sm" className="mt-2 sm:mt-0">
          <Plus className="size-4" /> Create Link
        </ButtonLink>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 flex items-center text-xs text-muted-foreground">
                {stat.trend === "up" ? <ArrowUpRight className="mr-1 size-3 text-emerald-500" /> : <ArrowDownRight className="mr-1 size-3 text-rose-500" />}
                <span className={stat.trend === "up" ? "text-emerald-500" : "text-rose-500"}>{stat.change}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Click Trend (7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{ clicks: { label: "Clicks", color: "hsl(var(--primary))" } }} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clickData}>
                  <defs><linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="date" className="text-xs" /><YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#clickGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Countries</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{ clicks: { label: "Clicks", color: "hsl(var(--chart-1))" } }} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCountries} layout="vertical" margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" /><YAxis type="category" dataKey="country" className="text-xs" width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="clicks" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Links</CardTitle>
          <ButtonLink href="/links" variant="outline" size="sm">View All</ButtonLink>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Link</TableHead><TableHead className="hidden md:table-cell">Destination</TableHead><TableHead className="hidden sm:table-cell">Features</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="hidden lg:table-cell">Created</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {recentLinks.map((link) => (
                <TableRow key={link.slug}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center"><Link2 className="size-4 text-primary" /></div>
                      <div><p className="font-mono text-sm font-medium">/{link.slug}</p><p className="text-xs text-muted-foreground">www.justqiu.cloud/{link.slug}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><p className="max-w-[200px] truncate text-sm text-muted-foreground">{link.destination}</p></TableCell>
                  <TableCell className="hidden sm:table-cell">{link.hasPage && <Badge variant="secondary" className="text-xs">Link Page</Badge>}</TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">{link.clicks.toLocaleString()}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{link.created}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><ExternalLink className="mr-2 size-4" /> Open</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="mr-2 size-4" /> Copy URL</DropdownMenuItem>
                        <DropdownMenuItem><BarChart3 className="mr-2 size-4" /> Analytics</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
