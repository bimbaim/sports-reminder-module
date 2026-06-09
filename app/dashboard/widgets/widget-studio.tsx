"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, LayoutTemplate, CheckCheck, Monitor, Smartphone } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_mode?: string | null;
  custom_cta_text?: string | null;
};

type FormState = {
  primary_color: string;
  secondary_color: string;
  custom_cta_text: string;
  theme_mode: string;
};

// ---------------------------------------------------------------------------
// Inline Widget Preview Component
// ---------------------------------------------------------------------------
function WidgetPreview({ config, tenant }: { config: FormState; tenant: Tenant }) {
  const isDark = config.theme_mode === "dark";
  const bgColor = isDark ? "#0f172a" : config.secondary_color;
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const inputBg = isDark ? "#0f172a" : "#f8fafc";

  return (
    <div
      className="w-full h-full flex items-center justify-center p-6 transition-all duration-300"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300"
        style={{ backgroundColor: cardBg, borderColor }}
      >
        {/* Accent bar */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: config.primary_color }}
        />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ backgroundColor: config.primary_color }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: textColor }}>
                {tenant.name}
              </p>
              <p className="text-xs" style={{ color: mutedColor }}>
                Sports Reminders
              </p>
            </div>
          </div>

          {/* Mock fields */}
          {[
            { label: "Email Address", placeholder: "you@example.com" },
            { label: "WhatsApp Number", placeholder: "+1 234 567 8900" },
          ].map((field) => (
            <div key={field.label} className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: mutedColor }}>
                {field.label}
              </p>
              <div
                className="w-full h-9 rounded-lg border px-3 flex items-center text-xs transition-all"
                style={{
                  backgroundColor: inputBg,
                  borderColor,
                  color: mutedColor,
                }}
              >
                {field.placeholder}
              </div>
            </div>
          ))}

          {/* Sports checkboxes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: mutedColor }}>
              Favorite Sports
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Football", "UFC / MMA", "NBA", "Formula 1"].map((sport, i) => (
                <div key={sport} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: i === 0 ? config.primary_color : "transparent",
                      borderColor: i === 0 ? config.primary_color : borderColor,
                    }}
                  >
                    {i === 0 && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5l-.7.7L5 9.9l5.7-5.7L10 3z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: textColor }}>
                    {sport}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 shadow-md"
            style={{ backgroundColor: config.primary_color }}
          >
            {config.custom_cta_text || "Remind Me"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Widget Studio Component
// ---------------------------------------------------------------------------
export function WidgetStudio({ tenants }: { tenants: Tenant[] }) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    tenants.length > 0 ? tenants[0].id : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const [formData, setFormData] = useState<FormState>({
    primary_color: selectedTenant?.primary_color || "#6366f1",
    secondary_color: selectedTenant?.secondary_color || "#ffffff",
    custom_cta_text: selectedTenant?.custom_cta_text || "Remind Me",
    theme_mode: selectedTenant?.theme_mode || "light",
  });

  // Sync form state when tenant changes
  useEffect(() => {
    if (selectedTenant) {
      setFormData({
        primary_color: selectedTenant.primary_color || "#6366f1",
        secondary_color: selectedTenant.secondary_color || "#ffffff",
        custom_cta_text: selectedTenant.custom_cta_text || "Remind Me",
        theme_mode: selectedTenant.theme_mode || "light",
      });
    }
  }, [selectedTenantId]);

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

  const iframeSnippet = `<iframe src="https://yourdomain.com/embed/${selectedTenant?.slug}" width="1050" height="650" style="border:none; width:100%; max-width:100%;" allow="clipboard-write"></iframe>`;

  const copySnippet = async () => {
    await navigator.clipboard.writeText(iframeSnippet);
    setCopied(true);
    toast.success("Embed snippet copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (tenants.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-foreground">No tenants found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a tenant in the Tenant Manager first.
          </p>
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
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 font-mono text-xs px-3 py-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 inline-block animate-pulse" />
            Live Preview
          </Badge>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Split Screen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: Configuration Form */}
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
                  <Label htmlFor="custom_cta_text" className="text-sm font-medium">
                    Custom CTA Text
                  </Label>
                  <Input
                    id="custom_cta_text"
                    name="custom_cta_text"
                    value={formData.custom_cta_text}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, custom_cta_text: e.target.value }))
                    }
                    placeholder="e.g. Get Reminders, Sign Me Up"
                    className="font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    Text displayed on the submit button.
                  </p>
                </div>

                {/* Color Pickers */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color" className="text-sm font-medium">
                      Primary Color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <label
                        htmlFor="primary_color"
                        className="h-9 w-9 rounded-lg border-2 cursor-pointer flex-shrink-0 shadow-sm transition-transform hover:scale-105"
                        style={{
                          backgroundColor: formData.primary_color,
                          borderColor: formData.primary_color,
                        }}
                      />
                      <input
                        type="color"
                        id="primary_color"
                        name="primary_color"
                        value={formData.primary_color}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
                        }
                        className="sr-only"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
                        }
                        className="font-mono text-sm h-9"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color" className="text-sm font-medium">
                      Background Color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <label
                        htmlFor="secondary_color"
                        className="h-9 w-9 rounded-lg border-2 cursor-pointer flex-shrink-0 shadow-sm transition-transform hover:scale-105"
                        style={{
                          backgroundColor: formData.secondary_color,
                          borderColor: "#e2e8f0",
                        }}
                      />
                      <input
                        type="color"
                        id="secondary_color"
                        name="secondary_color"
                        value={formData.secondary_color}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
                        }
                        className="sr-only"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
                        }
                        className="font-mono text-sm h-9"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Theme Mode</Label>
                  <Select
                    value={formData.theme_mode}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, theme_mode: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Light Mode
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Dark Mode
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Hidden input so FormData picks up theme_mode */}
                  <input type="hidden" name="theme_mode" value={formData.theme_mode} />
                  <p className="text-xs text-muted-foreground">
                    Controls the widget background and text contrast.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm sticky top-6">
          {/* Mock browser chrome */}
          <div className="bg-muted/60 px-4 py-3 flex items-center gap-3 border-b">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-background rounded-md h-6 flex items-center px-3 border">
              <span className="text-xs font-mono text-muted-foreground truncate">
                yourdomain.com/embed/{selectedTenant?.slug}
              </span>
            </div>
          </div>

          {/* Preview area */}
          <div className="min-h-[500px]">
            {selectedTenant && (
              <WidgetPreview config={formData} tenant={selectedTenant} />
            )}
          </div>
        </div>
      </div>

      {/* ── Embed Code Block ── */}
      <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary" />
                Embed Code
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Paste this snippet into the pub's website HTML where you want the widget to appear.
              </CardDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={copySnippet}
              className="flex-shrink-0 font-semibold gap-2 transition-all"
            >
              {copied ? (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Snippet
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative group">
            <pre className="bg-zinc-950 text-zinc-300 p-5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-zinc-800 whitespace-pre-wrap break-all">
              <span className="text-zinc-500">{`<!-- Sports Reminder Widget for ${selectedTenant?.name} -->\n`}</span>
              <span className="text-sky-400">&lt;iframe</span>
              {" "}
              <span className="text-green-400">src</span>
              <span className="text-zinc-300">=</span>
              <span className="text-amber-300">{`"https://yourdomain.com/embed/${selectedTenant?.slug}"`}</span>
              {" "}
              <span className="text-green-400">width</span>
              <span className="text-zinc-300">=</span>
              <span className="text-amber-300">"1050"</span>
              {" "}
              <span className="text-green-400">height</span>
              <span className="text-zinc-300">=</span>
              <span className="text-amber-300">"650"</span>
              {"\n  "}
              <span className="text-green-400">style</span>
              <span className="text-zinc-300">=</span>
              <span className="text-amber-300">"border:none; width:100%; max-width:100%;"</span>
              {" "}
              <span className="text-green-400">allow</span>
              <span className="text-zinc-300">=</span>
              <span className="text-amber-300">"clipboard-write"</span>
              <span className="text-sky-400">&gt;&lt;/iframe&gt;</span>
            </pre>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The iframe automatically adapts to the container width. Replace{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">
              yourdomain.com
            </code>{" "}
            with your actual deployment domain before going live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
