"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  toggleSportActive,
  updateSportCredentials,
  syncSportData,
  type SportSetting,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Settings,
  Globe,
  Key,
  Activity,
  Edit,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SPORT_EMOJI: Record<string, string> = {
  football: "⚽",
  ufc: "🥊",
  nba: "🏀",
  f1: "🏎️",
};

function maskKey(key: string): string {
  if (!key) return "Not configured";
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 16)) + key.slice(-4);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditCredentialsDialog({
  setting,
  onUpdated,
}: {
  setting: SportSetting;
  onUpdated: (s: SportSetting) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateSportCredentials(setting.id, fd);
    setSaving(false);

    if (result.success) {
      toast.success("Settings updated successfully.");
      onUpdated({
        ...setting,
        api_base_url: fd.get("api_base_url")?.toString() || "",
        api_key: fd.get("api_key")?.toString() || "",
      });
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="text-xl">{SPORT_EMOJI[setting.sport_key] || "🏟️"}</span>
            {setting.sport_name}
          </DialogTitle>
          <DialogDescription>
            Update the API endpoint and authentication key for this sport feed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Sport Name (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Sport</Label>
            <Input value={setting.sport_name} disabled className="bg-muted/50 font-medium" />
          </div>

          {/* API Base URL */}
          <div className="space-y-2">
            <Label htmlFor="api_base_url" className="text-sm font-medium">
              <Globe className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
              API Base URL
            </Label>
            <Input
              id="api_base_url"
              name="api_base_url"
              type="url"
              defaultValue={setting.api_base_url}
              placeholder="https://v3.football.api-sports.io"
              className="font-mono text-sm"
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key" className="text-sm font-medium">
              <Key className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
              API Key
            </Label>
            <Input
              id="api_key"
              name="api_key"
              type="password"
              defaultValue={setting.api_key}
              placeholder="Enter your API key"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Your key is stored securely and never exposed to the client.
            </p>
          </div>

          <Button type="submit" className="w-full font-semibold" disabled={saving}>
            {saving ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              "Save Credentials"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sport Card ──────────────────────────────────────────────────────────────

function SportCard({
  setting,
  onUpdated,
}: {
  setting: SportSetting;
  onUpdated: (s: SportSetting) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [local, setLocal] = useState(setting);

  const emoji = SPORT_EMOJI[local.sport_key] || "🏟️";
  const hasCredentials = !!local.api_base_url && !!local.api_key;

  const handleToggle = async () => {
    const prev = local.is_active;
    setLocal((s) => ({ ...s, is_active: !prev }));
    const result = await toggleSportActive(local.id, prev);
    if (result.success) {
      toast.success(`${local.sport_name} ${!prev ? "activated" : "deactivated"}.`);
    } else {
      toast.error(result.error);
      setLocal((s) => ({ ...s, is_active: prev }));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncSportData(local.id);
    setSyncing(false);

    if (result.success) {
      toast.success(result.message || "Sync completed.");
      setLocal((s) => ({ ...s, last_synced_at: new Date().toISOString() }));
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdated = (updated: SportSetting) => {
    setLocal(updated);
    onUpdated(updated);
  };

  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Top accent */}
      <div
        className="h-1 w-full"
        style={{
          backgroundColor: local.is_active ? "#22c55e" : "#e2e8f0",
        }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted/80 flex items-center justify-center text-xl">
              {emoji}
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {local.sport_name}
                {local.is_active ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0">
                    Inactive
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs font-mono mt-0.5">
                {local.sport_key}
              </CardDescription>
            </div>
          </div>

          <Switch
            checked={local.is_active}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Host */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="h-3 w-3" />
            API Host
          </div>
          <p className="text-sm font-mono text-foreground truncate">
            {local.api_base_url || (
              <span className="text-muted-foreground italic">Not configured</span>
            )}
          </p>
        </div>

        {/* API Key (masked) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Key className="h-3 w-3" />
            API Key
          </div>
          <p className="text-sm font-mono text-foreground">
            {local.api_key ? (
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                {maskKey(local.api_key)}
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1.5 font-sans">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Not configured
              </span>
            )}
          </p>
        </div>

        {/* Last Synced */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Activity className="h-3 w-3" />
            Last Synced
          </div>
          <p className="text-sm text-foreground">
            {formatDate(local.last_synced_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <EditCredentialsDialog setting={local} onUpdated={handleUpdated} />

          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold"
            disabled={syncing || !hasCredentials}
            onClick={handleSync}
          >
            {syncing ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Syncing...</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5" />Sync Now</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SettingsClient({ initialSettings }: { initialSettings: SportSetting[] }) {
  const [settings, setSettings] = useState(initialSettings);

  const handleUpdated = (updated: SportSetting) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  if (settings.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No sport feeds configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Run the <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">sport_settings.sql</code> migration in your Supabase SQL Editor to seed the default sports.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Header />

      {/* Stats summary */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="font-mono text-xs px-3 py-1">
          {settings.length} sport{settings.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-3 py-1">
          {settings.filter((s) => s.is_active).length} active
        </Badge>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-3 py-1">
          {settings.filter((s) => !s.api_key).length} missing key
        </Badge>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {settings.map((s) => (
          <SportCard key={s.id} setting={s} onUpdated={handleUpdated} />
        ))}
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
        <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        Global Sport Settings
      </h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Configure API credentials and manage data ingestion for each sport category.
      </p>
    </div>
  );
}
