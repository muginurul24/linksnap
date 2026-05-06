import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ButtonLink } from "@/components/ui/button-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, ExternalLink, Copy, BarChart3, Trash2, MoreHorizontal, Globe, QrCode, Edit } from "lucide-react";

const links = [
  { slug: "promo-ramadhan", destination: "https://shopee.co.id/promo-ramadhan", clicks: 2341, active: true, hasPage: true, hasRules: true },
  { slug: "launch-sneakers", destination: "https://tokopedia.com/sneakers-launch", clicks: 1890, active: true, hasPage: true, hasRules: false },
  { slug: "ig-linktree", destination: "https://instagram.com/mystore", clicks: 567, active: true, hasPage: false, hasRules: false },
  { slug: "discount-50", destination: "https://mybrand.id/discount?code=LAUNCH50", clicks: 443, active: false, hasPage: true, hasRules: false },
  { slug: "webinar-signup", destination: "https://zoom.us/webinar/register/xyz", clicks: 89, active: true, hasPage: false, hasRules: false },
  { slug: "app-download", destination: "https://play.google.com/store/apps/details?id=myapp", clicks: 3210, active: true, hasPage: true, hasRules: true },
  { slug: "free-ebook", destination: "https://mybrand.id/ebook-marketing-2026", clicks: 654, active: true, hasPage: false, hasRules: false },
  { slug: "youtube-channel", destination: "https://youtube.com/@mybrand", clicks: 1200, active: true, hasPage: false, hasRules: false },
];

export default function LinksPage() {
  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">My Links</h1><p className="text-sm text-muted-foreground">Manage your short links, smart rules, and link pages.</p></div>
        <ButtonLink href="/links/new" size="sm" className="mt-2 sm:mt-0"><Plus className="size-4" /> Create Link</ButtonLink>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input placeholder="Search by slug or destination..." className="pl-9" /></div>
        <Button variant="outline" size="icon"><Filter className="size-4" /></Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Link</TableHead><TableHead className="hidden md:table-cell">Destination</TableHead><TableHead className="hidden sm:table-cell">Features</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="hidden lg:table-cell">Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.slug} className={!link.active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><QrCode className="size-4 text-primary" /></div>
                    <div className="min-w-0"><p className="font-mono text-sm font-medium truncate">/{link.slug}</p><p className="text-xs text-muted-foreground truncate">linksnap.id/{link.slug}</p></div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell"><p className="max-w-[250px] truncate text-sm text-muted-foreground">{link.destination}</p></TableCell>
                <TableCell className="hidden sm:table-cell"><div className="flex gap-1 flex-wrap">{link.hasPage && <Badge variant="secondary" className="text-xs"><Globe className="mr-1 size-3" />Page</Badge>}{link.hasRules && <Badge variant="secondary" className="text-xs">🔀 Rules</Badge>}</div></TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">{link.clicks.toLocaleString()}</TableCell>
                <TableCell className="hidden lg:table-cell"><Badge variant={link.active ? "default" : "secondary"}>{link.active ? "Active" : "Paused"}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem><Edit className="mr-2 size-4" /> Edit</DropdownMenuItem>
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
      </CardContent></Card>
    </>
  );
}
