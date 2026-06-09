"use client";

import { useState, useEffect } from "react";
import { createTenant, deleteTenant, toggleTenantStatus, updateTenantBranding } from "./actions";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Edit,
  Plus,
  Trash2,
  Users,
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Palette,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

// ─── New Tenant Sheet ────────────────────────────────────────────────────────

function NewTenantSheet({ onCreated }: { onCreated: (tenant: any) => void }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Auto-generate slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  const reset = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const result = await createTenant(fd);

    setIsSubmitting(false);
    if (result.success && result.tenant) {
      toast.success(`"${result.tenant.name}" has been added.`);
      onCreated(result.tenant);
      setOpen(false);
      reset();
    } else {
      toast.error(result.error ?? "Something went wrong.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          New Tenant
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Add New Tenant
          </SheetTitle>
          <SheetDescription>
            Create a pub profile. Required fields are marked with an asterisk&nbsp;(*).
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Identity ── */}
          <SectionHeading icon={Building2} label="Identity" />

          <div className="space-y-2">
            <Label htmlFor="name">
              Pub Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. The Crown & Anchor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              URL Slug <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-0 rounded-lg border focus-within:ring-2 focus-within:ring-ring overflow-hidden">
              <span className="bg-muted px-3 text-sm text-muted-foreground border-r h-9 flex items-center flex-shrink-0 font-mono">
                /embed/
              </span>
              <input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="crown-anchor"
                className="flex-1 h-9 px-3 text-sm font-mono bg-background outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generated from the pub name. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <Separator />

          {/* ── Location ── */}
          <SectionHeading icon={MapPin} label="Location" />

          <div className="space-y-2">
            <Label htmlFor="address">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input id="address" name="address" required placeholder="123 High Street" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input id="city" name="city" required placeholder="London" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / County</Label>
              <Input id="state" name="state" placeholder="Greater London" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input id="postal_code" name="postal_code" placeholder="EC1A 1BB" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maps_url">Google Maps URL</Label>
              <Input id="maps_url" name="maps_url" type="url" placeholder="https://maps.google.com/..." />
            </div>
          </div>

          <Separator />

          {/* ── Contact ── */}
          <SectionHeading icon={Phone} label="Contact" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input id="contact_email" name="contact_email" type="email" placeholder="pub@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone</Label>
              <Input id="phone_number" name="phone_number" type="tel" placeholder="+44 20 1234 5678" />
            </div>
          </div>

          <Separator />

          {/* ── Branding ── */}
          <SectionHeading icon={Palette} label="Branding" />

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input id="logo_url" name="logo_url" type="url" placeholder="https://cdn.example.com/logo.png" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  id="primary_color"
                  name="primary_color"
                  defaultValue="#6366f1"
                  className="h-9 w-9 p-1 rounded-md border cursor-pointer flex-shrink-0"
                />
                <span className="text-sm font-mono text-muted-foreground">#6366f1</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Background Color</Label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  id="secondary_color"
                  name="secondary_color"
                  defaultValue="#ffffff"
                  className="h-9 w-9 p-1 rounded-md border cursor-pointer flex-shrink-0"
                />
                <span className="text-sm font-mono text-muted-foreground">#ffffff</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom_cta_text">CTA Button Text</Label>
            <Input
              id="custom_cta_text"
              name="custom_cta_text"
              defaultValue="Remind Me"
              placeholder="e.g. Get Reminders, Sign Me Up"
            />
          </div>

          <Separator />

          <Button type="submit" className="w-full font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Tenant"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────

function DeleteTenantDialog({ tenant, onDeleted }: { tenant: any; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTenant(tenant.id);
    setIsDeleting(false);
    if (result.success) {
      toast.success(`"${tenant.name}" has been removed.`);
      onDeleted(tenant.id);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-lg">Delete "{tenant.name}"?</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            This will permanently delete the tenant and all associated subscribers and notification
            logs. <strong className="text-foreground">This action cannot be undone.</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-semibold"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TenantClient({ initialTenants }: { initialTenants: any[] }) {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [tenants, setTenants] = useState(initialTenants);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCity = t.city.toLowerCase().includes(cityFilter.toLowerCase());
    return matchesSearch && matchesCity;
  });

  const handleTenantCreated = (tenant: any) => {
    setTenants((prev) => [tenant, ...prev]);
  };

  const handleTenantDeleted = (id: string) => {
    setTenants((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !currentStatus } : t))
    );
    const result = await toggleTenantStatus(id, currentStatus);
    if (result.success) {
      toast.success("Status updated.");
    } else {
      toast.error(result.error);
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: currentStatus } : t))
      );
    }
  };

  const handleUpdateBranding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTenant) return;

    const formData = new FormData(e.currentTarget);
    const result = await updateTenantBranding(editingTenant.id, formData);

    if (result.success) {
      toast.success("Branding updated.");
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingTenant.id
            ? {
                ...t,
                primary_color: formData.get("primary_color"),
                secondary_color: formData.get("secondary_color"),
                logo_url: formData.get("logo_url"),
                theme_mode: formData.get("theme_mode"),
                custom_cta_text: formData.get("custom_cta_text"),
              }
            : t
        )
      );
      setEditingTenant(null);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Tenant Manager
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Manage your network of pubs and customize their branding.
          </p>
        </div>
        <NewTenantSheet onCreated={handleTenantCreated} />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-[260px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          placeholder="Filter by city..."
          className="w-full md:w-[180px]"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-mono">
            {filteredTenants.length} tenant{filteredTenants.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* ── Table ── */}
      {tenants.length === 0 ? (
        // ── Empty State ──
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No tenants yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add your first pub to get started. Each tenant gets its own embeddable widget and
              branding profile.
            </p>
            <NewTenantSheet onCreated={handleTenantCreated} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[64px]">Logo</TableHead>
                <TableHead>Pub Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.length > 0 ? (
                filteredTenants.map((t) => (
                  <TableRow key={t.id} className="group">
                    {/* Logo */}
                    <TableCell>
                      <div
                        className="w-10 h-10 rounded-lg border flex items-center justify-center overflow-hidden text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: t.primary_color || "#6366f1" }}
                      >
                        {t.logo_url ? (
                          <img
                            src={t.logo_url}
                            alt={t.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          t.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </TableCell>

                    {/* Name + slug */}
                    <TableCell>
                      <p className="font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        /embed/{t.slug}
                      </p>
                    </TableCell>

                    {/* City */}
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {t.city}
                        {t.state ? `, ${t.state}` : ""}
                      </div>
                    </TableCell>

                    {/* Status toggle */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={t.is_active}
                          onCheckedChange={() => handleToggle(t.id, t.is_active)}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {t.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Edit Branding */}
                        <Dialog
                          open={editingTenant?.id === t.id}
                          onOpenChange={(isOpen) =>
                            isOpen ? setEditingTenant(t) : setEditingTenant(null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                              <Edit className="h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Branding — {t.name}</DialogTitle>
                              <DialogDescription>
                                Update the visual identity for this tenant's widget.
                              </DialogDescription>
                            </DialogHeader>
                            {editingTenant && editingTenant.id === t.id && (
                              <form onSubmit={handleUpdateBranding} className="space-y-4 pt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="logo_url">Logo URL</Label>
                                  <Input
                                    id="logo_url"
                                    name="logo_url"
                                    defaultValue={t.logo_url || ""}
                                    placeholder="https://..."
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="primary_color">Primary Color</Label>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="color"
                                        id="primary_color"
                                        name="primary_color"
                                        defaultValue={t.primary_color || "#6366f1"}
                                        className="h-9 w-9 p-1 rounded-md border cursor-pointer"
                                      />
                                      <span className="text-sm font-mono text-muted-foreground">
                                        {t.primary_color || "#6366f1"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="secondary_color">Background Color</Label>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="color"
                                        id="secondary_color"
                                        name="secondary_color"
                                        defaultValue={t.secondary_color || "#ffffff"}
                                        className="h-9 w-9 p-1 rounded-md border cursor-pointer"
                                      />
                                      <span className="text-sm font-mono text-muted-foreground">
                                        {t.secondary_color || "#ffffff"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="custom_cta_text">CTA Button Text</Label>
                                  <Input
                                    id="custom_cta_text"
                                    name="custom_cta_text"
                                    defaultValue={t.custom_cta_text || "Remind Me"}
                                    placeholder="e.g. Get Reminders"
                                  />
                                </div>
                                <Button type="submit" className="w-full font-semibold mt-2">
                                  Save Changes
                                </Button>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Delete */}
                        <DeleteTenantDialog tenant={t} onDeleted={handleTenantDeleted} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No tenants match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
