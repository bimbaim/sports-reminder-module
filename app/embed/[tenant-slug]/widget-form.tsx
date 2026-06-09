"use client";

import { useState } from "react";
import { subscribeToTenant } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function WidgetForm({ tenant }: { tenant: any }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [teams, setTeams] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.append("favorite_teams", teams);

    const result = await subscribeToTenant(tenant.id, formData);

    if (result.success) {
      setMessage({ text: "Successfully subscribed! We'll notify you.", type: "success" });
      (e.target as HTMLFormElement).reset();
      setTeams("");
    } else {
      setMessage({ text: result.error || "An error occurred.", type: "error" });
    }
    setLoading(false);
  };

  const cssVars = {
    "--brand-primary": tenant.primary_color || "#0066FF",
    "--brand-secondary": tenant.secondary_color || "#ffffff",
  } as React.CSSProperties;

  return (
    <div 
      style={cssVars} 
      className="bg-card w-full max-w-md mx-auto rounded-xl shadow-lg border border-border overflow-hidden"
    >
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: "var(--brand-primary)" }}
      />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          {tenant.logo_url && (
            <img 
              src={tenant.logo_url} 
              alt={tenant.name} 
              className="w-12 h-12 rounded-full object-cover border"
            />
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground leading-tight">{tenant.name}</h2>
            <p className="text-sm text-muted-foreground">Sports Reminders</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="you@example.com"
              className="focus-visible:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input 
              id="whatsapp" 
              name="whatsapp_number" 
              type="tel" 
              required 
              placeholder="+1234567890"
              className="focus-visible:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="space-y-3">
            <Label>Favorite Sports</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "football", label: "Football (Soccer)" },
                { id: "ufc", label: "UFC / MMA" },
                { id: "nba", label: "NBA Basketball" },
                { id: "f1", label: "Formula 1" },
              ].map((sport) => (
                <div key={sport.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`sport-${sport.id}`} 
                    name="favorite_sports" 
                    value={sport.id} 
                    className="data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
                  />
                  <Label htmlFor={`sport-${sport.id}`} className="font-normal cursor-pointer">
                    {sport.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teams">Favorite Teams / Fighters</Label>
            <Input 
              id="teams" 
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
              placeholder="e.g. Real Madrid, Jon Jones (comma separated)"
              className="focus-visible:ring-[var(--brand-primary)]"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full font-bold text-white shadow-md transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {loading ? "Subscribing..." : (tenant.custom_cta_text || "Remind Me")}
          </Button>
        </form>
      </div>
    </div>
  );
}
