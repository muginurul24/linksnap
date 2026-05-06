import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const qrCodes = [
  { slug: "promo-ramadhan", title: "Ramadhan Sale", scans: 1230, type: "Dynamic", format: "PNG + SVG" },
  { slug: "launch-sneakers", title: "Sneakers Drop", scans: 890, type: "Static", format: "PNG" },
  { slug: "app-download", title: "App Download", scans: 4521, type: "Dynamic", format: "PNG + SVG" },
  { slug: "menu-resto", title: "Restaurant Menu", scans: 234, type: "Static", format: "PNG" },
];

export default function QrCodesPage() {
  return (
    <>
      <div><h1 className="text-2xl font-bold tracking-tight">QR Codes</h1><p className="text-sm text-muted-foreground">Manage your generated QR codes. Dynamic QR codes can be edited anytime.</p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {qrCodes.map((qr) => (
          <Card key={qr.slug}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex aspect-square size-12 items-center justify-center rounded-lg border bg-muted"><QrCode className="size-6" /></div>
                  <div><CardTitle className="text-base">{qr.title}</CardTitle><CardDescription className="font-mono text-xs">/{qr.slug}</CardDescription></div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Download className="mr-2 size-4" /> Download PNG</DropdownMenuItem>
                    <DropdownMenuItem><Download className="mr-2 size-4" /> Download SVG</DropdownMenuItem>
                    <DropdownMenuItem><Edit className="mr-2 size-4" /> Edit URL</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3">
                <div><p className="text-xs text-muted-foreground">Scans</p><p className="text-lg font-bold tabular-nums">{qr.scans.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Format</p><p className="text-sm font-medium">{qr.format}</p></div>
              </div>
              <Badge variant={qr.type === "Dynamic" ? "default" : "secondary"}>{qr.type}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
