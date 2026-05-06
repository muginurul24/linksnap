"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, Calendar } from "lucide-react";

const dailyClicks = [
  { date: "May 1", clicks: 980 },  { date: "May 2", clicks: 2100 },
  { date: "May 3", clicks: 1800 },  { date: "May 4", clicks: 2400 },
  { date: "May 5", clicks: 3100 },  { date: "May 6", clicks: 8921 },
];

const deviceData = [
  { name: "Mobile", value: 65, color: "hsl(var(--chart-1))" },
  { name: "Desktop", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Tablet", value: 10, color: "hsl(var(--chart-3))" },
];

const referrerData = [
  { source: "Direct", clicks: 4521 }, { source: "Instagram", clicks: 2310 },
  { source: "WhatsApp", clicks: 1890 }, { source: "Twitter", clicks: 890 },
  { source: "Facebook", clicks: 560 }, { source: "Email", clicks: 340 },
];

export default function AnalyticsPage() {
  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Deep dive into your link performance data.</p>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 size-4" /> Last 7 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 size-4" /> Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="referrers">Referrers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Click Trend</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ clicks: { label: "Clicks", color: "hsl(var(--primary))" } }} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyClicks}>
                    <defs>
                      <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#analyticsGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Device Distribution</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Share" } }} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={80} outerRadius={140} paddingAngle={5} dataKey="value">
                      {deviceData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrers" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top Referrers</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ clicks: { label: "Clicks", color: "hsl(var(--chart-1))" } }} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={referrerData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="source" className="text-xs" width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clicks" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
