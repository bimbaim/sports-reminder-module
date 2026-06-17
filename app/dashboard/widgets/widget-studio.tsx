"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, LayoutTemplate, CheckCheck, Monitor, Smartphone, AlertCircle } from "lucide-react";
import { updateWidgetSettings } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tenant = {
  id: string;
  name: string;
  slug: string;
  public_token?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_mode?: string | null;
  custom_cta_text?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  widget_settings?: any;
};

type FormState = {
  primary_color: string;
  secondary_color: string;
  custom_cta_text: string;
  theme_mode: string;
  font_family: string;
  font_size: string;
  logo_url: string;
  layout_variant: string;
};

type SportOption = {
  id: string;
  label: string;
  have_leagues: boolean;
};

const FONT_OPTIONS = [
  { label: "Inter", value: "var(--font-inter), sans-serif" },
  { label: "Roboto", value: "var(--font-roboto), sans-serif" },
  { label: "Poppins", value: "var(--font-poppins), sans-serif" },
  { label: "Montserrat", value: "var(--font-montserrat), sans-serif" },
  { label: "System", value: "system-ui, sans-serif" },
];

const FONT_SIZE_OPTIONS = [
  { label: "Small (12px)", value: "12px" },
  { label: "Normal (14px)", value: "14px" },
  { label: "Medium (16px)", value: "16px" },
  { label: "Large (18px)", value: "18px" },
];

const SPORT_EMOJI: Record<string, string> = {
  football: "⚽",
  ufc: "🥊",
  nba: "🏀",
  f1: "🏎️",
  nrl: "🏉",
};

// ---------------------------------------------------------------------------
// Inline Widget Preview Component
// ---------------------------------------------------------------------------
function WidgetPreview({
  config,
  tenant,
  allowedSports,
  availableSports,
}: {
  config: FormState;
  tenant: Tenant;
  allowedSports: string[];
  availableSports: SportOption[];
}) {
  const isDark = config.theme_mode === "dark";
  const bgColor    = isDark ? "#0f172a" : config.secondary_color;
  const cardBg     = isDark ? "#1e293b" : "#ffffff";
  const textColor  = isDark ? "#f1f5f9" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const inputBg    = isDark ? "#0f172a" : "#f8fafc";

  // Filter based on what's active in the studio
  const visibleSports = availableSports.filter((s) =>
    allowedSports.length === 0 || allowedSports.includes(s.id)
  );

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Determine if we should show the "Favorite Sports" step in preview
  const showSportsStep = visibleSports.length > 1;
  const showLeagueSelector = visibleSports.some(s => s.have_leagues);

  const isSticky = config.layout_variant === "sticky";

  const FormContent = (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300",
        isSticky && !isPreviewOpen ? "scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100"
      )}
      style={{ backgroundColor: cardBg, borderColor }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: config.primary_color }} />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: config.primary_color }}
          >
            {config.logo_url ? (
              <img src={config.logo_url} alt={tenant.name} className="w-full h-full object-cover" />
            ) : (
              tenant.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: textColor }}>
              {tenant.name}
            </p>
            <p className="text-xs" style={{ color: mutedColor }}>Sports Reminders</p>
          </div>
        </div>

        {/* Mock inputs */}
        {[
          { label: "Email Address", placeholder: "you@example.com" },
          { label: "WhatsApp Number", placeholder: "+62 812 3456 7890" },
        ].map((field) => (
          <div key={field.label} className="space-y-1.5">
            <p className="text-xs font-semibold" style={{ color: mutedColor }}>{field.label}</p>
            <div
              className="w-full h-9 rounded-lg border px-3 flex items-center text-xs"
              style={{ backgroundColor: inputBg, borderColor, color: mutedColor }}
            >
              {field.placeholder}
            </div>
          </div>
        ))}

        {/* Sports Selector Preview (Only if > 1) */}
        {showSportsStep && (
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: mutedColor }}>Favorite Sports</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleSports.map((sport, i) => (
                <div
                  key={sport.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold"
                  style={{ 
                    borderColor: i === 0 ? config.primary_color : borderColor, 
                    backgroundColor: i === 0 ? config.primary_color : "transparent",
                    color: i === 0 ? "#ffffff" : textColor
                  }}
                >
                  <span>{SPORT_EMOJI[sport.id] || "🏆"}</span>
                  {sport.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* League Selector Preview - Only if needed */}
        {showLeagueSelector && (
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: mutedColor }}>Select Leagues to Follow</p>
            <div className="space-y-1.5 border rounded-lg p-2 max-h-24 overflow-hidden" style={{ borderColor, backgroundColor: inputBg }}>
              {[1, 2].map((_, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] opacity-60">
                  <div className="w-3 h-3 rounded border" style={{ borderColor }} />
                  <div className="h-2 w-20 bg-slate-300 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 shadow-md"
          style={{ backgroundColor: config.primary_color }}
        >
          {config.custom_cta_text || "Remind Me"}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="w-full h-full flex items-center justify-center p-6 transition-all duration-300 relative"
      style={{ 
        backgroundColor: bgColor,
        fontFamily: config.font_family,
        fontSize: config.font_size
      }}
    >
      {isSticky ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center p-6">
            {FormContent}
          </div>
          <button
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-xl flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 z-50"
            style={{ backgroundColor: config.primary_color }}
          >
            {isPreviewOpen ? (
              <span className="text-xl font-bold">×</span>
            ) : (
              <LayoutTemplate className="h-6 w-6" />
            )}
          </button>
        </>
      ) : (
        FormContent
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Widget Studio Component
// ---------------------------------------------------------------------------
export function WidgetStudio({ tenants, availableSports }: { tenants: Tenant[], availableSports: SportOption[] }) {
  console.log("WidgetStudio Debug: availableSports received:", availableSports);

  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    tenants.length > 0 ? tenants[0].id : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [allowedSports, setAllowedSports] = useState<string[]>(availableSports.map(s => s.id));

  console.log("WidgetStudio Debug: allowedSports state:", allowedSports);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const getInitialData = (tenant: Tenant | undefined): FormState => {
    const ws = tenant?.widget_settings || {};
    return {
      primary_color: ws.primary_color || tenant?.primary_color || "#6366f1",
      secondary_color: ws.secondary_color || tenant?.secondary_color || "#ffffff",
      custom_cta_text: ws.custom_cta_text || tenant?.custom_cta_text || "Remind Me",
      theme_mode: ws.theme_mode || tenant?.theme_mode || "light",
      font_family: ws.font_family || tenant?.font_family || "var(--font-inter), sans-serif",
      font_size: ws.font_size || tenant?.font_size || "14px",
      logo_url: ws.logo_url || tenant?.logo_url || "",
      layout_variant: ws.layout_variant || "inline",
    };
  };

  const [formData, setFormData] = useState<FormState>(getInitialData(selectedTenant));

  useEffect(() => {
    if (selectedTenant) {
      setFormData(getInitialData(selectedTenant));
    }
  }, [selectedTenantId, selectedTenant]);

  // Sync allowed sports with available sports on load
  useEffect(() => {
    setAllowedSports(availableSports.map(s => s.id));
  }, [availableSports]);

  const toggleSport = (id: string) => {
    setAllowedSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    setIsSaving(true);
    const data = new FormData(e.currentTarget);
    const result = await updateWidgetSettings(selectedTenantId, data);
    setIsSaving(false);
    if (result.success) {
      toast.success("Widget settings saved successfully.");
    } else {
      toast.error(result.error);
    }
  };

  // Dynamic base URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
  const sportsParam = allowedSports.join(",");

  const scriptSnippet = `<script src="${baseUrl}/widget.js" data-token="${selectedTenant?.public_token || ""}" data-layout="${formData.layout_variant}" data-sports="${sportsParam}" defer></script>`;

  const copySnippet = async () => {
    await navigator.clipboard.writeText(scriptSnippet);
    setCopied(true);
    toast.success("Script snippet copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (tenants.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-foreground">No tenants found</p>
          <p className="text-sm text-muted-foreground mt-1">Create a tenant in the Tenant Manager first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            Widget Studio
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Configure branding and preview your embeddable subscriber intake form.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-mono text-xs px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 inline-block animate-pulse" />
            Live Preview
          </Badge>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Split Screen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: Config Form */}
        <div className="flex flex-col gap-5">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Branding Configuration</CardTitle>
              <CardDescription className="text-sm">
                Customize how the widget looks on{" "}
                <span className="font-medium text-foreground">{selectedTenant?.name}</span>'s site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-6">
                {/* CTA Text */}
                <div className="space-y-2">
                  <Label htmlFor="custom_cta_text" className="text-sm font-medium">Custom CTA Text</Label>
                  <Input
                    id="custom_cta_text"
                    name="custom_cta_text"
                    value={formData.custom_cta_text}
                    onChange={(e) => setFormData((p) => ({ ...p, custom_cta_text: e.target.value }))}
                    placeholder="e.g. Get Reminders, Sign Me Up"
                    className="font-medium"
                  />
                  <p className="text-xs text-muted-foreground">Text displayed on the submit button.</p>
                </div>

                {/* Logo Override */}
                <div className="space-y-2">
                  <Label htmlFor="logo_url" className="text-sm font-medium">Widget Logo Override</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData((p) => ({ ...p, logo_url: e.target.value }))}
                    placeholder="https://cdn.example.com/widget-logo.png"
                    className="font-medium"
                  />
                  <p className="text-xs text-muted-foreground">Optional: Override global tenant logo for this widget.</p>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-5">
                  {(["primary_color", "secondary_color"] as const).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className="text-sm font-medium">
                        {key === "primary_color" ? "Primary Color" : "Background Color"}
                      </Label>
                      <div className="flex items-center gap-2.5">
                        <label
                          htmlFor={key}
                          className="h-9 w-9 rounded-lg border-2 cursor-pointer flex-shrink-0 shadow-sm transition-transform hover:scale-105"
                          style={{
                            backgroundColor: formData[key],
                            borderColor: key === "primary_color" ? formData[key] : "#e2e8f0",
                          }}
                        />
                        <input
                          type="color"
                          id={key}
                          name={key}
                          value={formData[key]}
                          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                          className="sr-only"
                        />
                        <Input
                          value={formData[key]}
                          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                          className="font-mono text-sm h-9"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Theme Mode & Layout Variant */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Theme Mode</Label>
                    <Select
                      value={formData.theme_mode}
                      onValueChange={(val) => setFormData((p) => ({ ...p, theme_mode: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2"><Monitor className="h-4 w-4" />Light Mode</div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Dark Mode</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="theme_mode" value={formData.theme_mode} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Layout Variant</Label>
                    <Select
                      value={formData.layout_variant}
                      onValueChange={(val) => setFormData((p) => ({ ...p, layout_variant: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inline">
                          <div className="flex items-center gap-2">Inline</div>
                        </SelectItem>
                        <SelectItem value="sticky">
                          <div className="flex items-center gap-2">Sticky Popup</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="layout_variant" value={formData.layout_variant} />
                  </div>
                </div>

                {/* Typography Configuration */}
                <div className="grid grid-cols-2 gap-5 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Font Family</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(val) => setFormData((p) => ({ ...p, font_family: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="font_family" value={formData.font_family} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Base Font Size</Label>
                    <Select
                      value={formData.font_size}
                      onValueChange={(val) => setFormData((p) => ({ ...p, font_size: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="font_size" value={formData.font_size} />
                  </div>
                </div>

                <Button type="submit" className="w-full font-semibold" disabled={isSaving}>
                  {isSaving ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : "Save Configuration"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Allowed Sports Feeds */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Allowed Sports Feeds</CardTitle>
              <CardDescription className="text-sm">
                Select which sports subscribers can opt into. Reflected live in the snippet below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableSports.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {availableSports.map((sport) => {
                      const active = allowedSports.includes(sport.id);
                      return (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => toggleSport(sport.id)}
                          className={[
                            "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150 select-none",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
                          ].join(" ")}
                        >
                          <span>{SPORT_EMOJI[sport.id] || "🏆"}</span>
                          {sport.label}
                          {active && (
                            <span className="ml-0.5 text-primary-foreground/70 text-xs">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {allowedSports.length === 0 && (
                    <p className="text-xs text-destructive mt-3 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Select at least one sport feed for the widget to work.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Active:{" "}
                    <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
                      {allowedSports.length > 0 ? allowedSports.join(", ") : "none"}
                    </code>
                  </p>
                </>
              ) : (
                <div className="py-4 px-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                    <AlertCircle className="h-4 w-4" />
                    No Active Sports Found
                  </div>
                  <p className="text-xs leading-relaxed">
                    You haven't activated any sports yet. Go to the <strong>Settings</strong> page to configure and enable at least one sport feed (Football, NBA, Rugby, etc.) before you can use the widget.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm sticky top-6">
          <div className="bg-muted/60 px-4 py-3 flex items-center gap-3 border-b">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-background rounded-md h-6 flex items-center px-3 border">
              <span className="text-xs font-mono text-muted-foreground truncate">
                yourdomain.com/embed/verify?token={selectedTenant?.public_token}
                {allowedSports.length > 0 && allowedSports.length < availableSports.length
                  ? `&sports=${sportsParam}`
                  : ""}
              </span>
            </div>
          </div>
          <div className="min-h-[500px]">
            {selectedTenant && (
              <WidgetPreview
                config={formData}
                tenant={selectedTenant}
                allowedSports={allowedSports}
                availableSports={availableSports}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Script Snippet ── */}
      <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
...
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary" />
                Embed Code
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Paste this one-line snippet into the pub's website{" "}
                <code className="font-mono bg-muted px-1 rounded text-xs">&lt;head&gt;</code> or before{" "}
                <code className="font-mono bg-muted px-1 rounded text-xs">&lt;/body&gt;</code>.
              </CardDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={copySnippet}
              className="flex-shrink-0 font-semibold gap-2 transition-all"
            >
              {copied ? (
                <><CheckCheck className="h-4 w-4" />Copied!</>
              ) : (
                <><Copy className="h-4 w-4" />Copy Code</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-zinc-950 text-zinc-300 p-5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-zinc-800 whitespace-pre-wrap break-all">
            <span className="text-sky-400">&lt;script</span>
            {" "}
            <span className="text-green-400">src</span>
            <span className="text-zinc-300">=</span>
            <span className="text-amber-300">{`"${baseUrl}/widget.js"`}</span>
            {"\n  "}
            <span className="text-green-400">data-token</span>
            <span className="text-zinc-300">=</span>
            <span className="text-amber-300">{`"${selectedTenant?.public_token || ""}"`}</span>
            {"\n  "}
            <span className="text-green-400">data-layout</span>
            <span className="text-zinc-300">=</span>
            <span className="text-amber-300">{`"${formData.layout_variant}"`}</span>
            {"\n  "}
            <span className="text-green-400">data-sports</span>
            <span className="text-zinc-300">=</span>
            <span className="text-amber-300">{`"${sportsParam}"`}</span>
            {"\n  "}
            <span className="text-violet-400">defer</span>
            <span className="text-sky-400">&gt;&lt;/script&gt;</span>
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            The{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono">data-sports</code>{" "}
            attribute filters which sports checkboxes appear in the subscriber form.
            Change sport selections above to update the snippet instantly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
