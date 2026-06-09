"use client";

import { useState } from "react";
import { subscribeToTenant } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tenant = {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  custom_cta_text?: string | null;
};

type SportConfig = {
  id: string;
  label: string;
  emoji: string;
  subLabel: string;
  placeholder: string;
};

const SPORT_CONFIGS: SportConfig[] = [
  {
    id: "football",
    label: "Football (Soccer)",
    emoji: "⚽",
    subLabel: "Favorite Football Clubs",
    placeholder: "e.g. Man United, Real Madrid, Barcelona",
  },
  {
    id: "ufc",
    label: "UFC / MMA",
    emoji: "🥊",
    subLabel: "Favorite Athletes / Fighters",
    placeholder: "e.g. Jon Jones, Islam Makhachev, Conor McGregor",
  },
  {
    id: "nba",
    label: "NBA Basketball",
    emoji: "🏀",
    subLabel: "Favorite NBA Teams",
    placeholder: "e.g. Lakers, Golden State Warriors, Chicago Bulls",
  },
  {
    id: "f1",
    label: "Formula 1",
    emoji: "🏎️",
    subLabel: "Favorite F1 Teams / Drivers",
    placeholder: "e.g. Ferrari, Max Verstappen, Lewis Hamilton",
  },
];

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
  primary,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  primary: string;
}) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const items = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !tags.includes(s));
    if (items.length) onChange([...tags, ...items]);
    setInput("");
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div
      className="min-h-[42px] w-full rounded-lg border bg-white px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 transition-all"
      style={{ "--ring-color": primary } as React.CSSProperties}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: primary }}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 opacity-70 hover:opacity-100 leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
          }
          if (e.key === "Backspace" && !input && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? placeholder : "Add more…"}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-slate-400"
      />
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function WidgetForm({
  tenant,
  allowedSports,
}: {
  tenant: Tenant;
  allowedSports: string[];
}) {
  const primary = tenant.primary_color || "#6366f1";

  const visibleSports = SPORT_CONFIGS.filter((s) => allowedSports.includes(s.id));

  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [email, setEmail]       = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailError, setEmailError]     = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  // sport → checked
  const [checkedSports, setCheckedSports] = useState<Record<string, boolean>>({});
  // sport → tags array
  const [sportTags, setSportTags] = useState<Record<string, string[]>>({});

  const toggleSport = (id: string) => {
    setCheckedSports((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) setSportTags((t) => ({ ...t, [id]: [] }));
      return next;
    });
  };

  const validateEmail = (v: string) => {
    if (!v) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
    return "";
  };

  const validateWhatsapp = (v: string) => {
    if (!v) return "WhatsApp number is required.";
    if (!/^\+?[0-9\s\-]{7,20}$/.test(v)) return "Enter a valid phone number (e.g. +62 812 3456 7890).";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const eErr = validateEmail(email);
    const wErr = validateWhatsapp(whatsapp);
    setEmailError(eErr);
    setWhatsappError(wErr);
    if (eErr || wErr) return;

    setLoading(true);
    setMessage(null);

    const selectedSports = visibleSports
      .filter((s) => checkedSports[s.id])
      .map((s) => s.id);

    // Collect all tags across all checked sports
    const allTeams = selectedSports.flatMap((id) => sportTags[id] || []);

    const fd = new FormData();
    fd.append("email", email);
    fd.append("whatsapp_number", whatsapp);
    selectedSports.forEach((s) => fd.append("favorite_sports", s));
    fd.append("favorite_teams", allTeams.join(","));

    const result = await subscribeToTenant(tenant.id, fd);

    setLoading(false);
    if (result.success) {
      setMessage({ text: "You're subscribed! We'll notify you before matches. 🎉", type: "success" });
      setEmail("");
      setWhatsapp("");
      setCheckedSports({});
      setSportTags({});
    } else {
      setMessage({ text: result.error || "An error occurred.", type: "error" });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: primary }} />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-7">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-sm"
              style={{ backgroundColor: primary }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{tenant.name}</h2>
              <p className="text-sm text-slate-500">Get match reminders via WhatsApp & Email</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                onBlur={() => setEmailError(validateEmail(email))}
                placeholder="you@example.com"
                className={[
                  "w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all bg-slate-50",
                  emailError
                    ? "border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:ring-2",
                ].join(" ")}
                style={!emailError ? { "--tw-ring-color": primary + "55" } as React.CSSProperties : {}}
              />
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="whatsapp">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setWhatsappError(""); }}
                onBlur={() => setWhatsappError(validateWhatsapp(whatsapp))}
                placeholder="+62 812 3456 7890"
                className={[
                  "w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all bg-slate-50",
                  whatsappError
                    ? "border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:ring-2",
                ].join(" ")}
                style={!whatsappError ? { "--tw-ring-color": primary + "55" } as React.CSSProperties : {}}
              />
              {whatsappError && <p className="text-xs text-red-500">{whatsappError}</p>}
            </div>

            {/* Sports + conditional sub-fields */}
            {visibleSports.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Favorite Sports{" "}
                  <span className="font-normal text-slate-400 text-xs">(select all that apply)</span>
                </p>

                <div className="space-y-2">
                  {visibleSports.map((sport) => {
                    const isChecked = !!checkedSports[sport.id];
                    return (
                      <div key={sport.id} className="rounded-xl border border-slate-200 overflow-hidden transition-all duration-200">
                        {/* Sport toggle row */}
                        <button
                          type="button"
                          onClick={() => toggleSport(sport.id)}
                          className={[
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            isChecked ? "bg-slate-50" : "bg-white hover:bg-slate-50/70",
                          ].join(" ")}
                        >
                          {/* Custom checkbox */}
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                            style={{
                              backgroundColor: isChecked ? primary : "transparent",
                              borderColor: isChecked ? primary : "#cbd5e1",
                            }}
                          >
                            {isChecked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-lg">{sport.emoji}</span>
                          <span className="text-sm font-medium text-slate-800">{sport.label}</span>
                        </button>

                        {/* Conditional sub-field */}
                        <div
                          className={[
                            "overflow-hidden transition-all duration-300 ease-in-out",
                            isChecked ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
                          ].join(" ")}
                        >
                          <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              {sport.subLabel}{" "}
                              <span className="font-normal text-slate-400">(press Enter or comma to add)</span>
                            </p>
                            <TagInput
                              tags={sportTags[sport.id] || []}
                              onChange={(tags) => setSportTags((prev) => ({ ...prev, [sport.id]: tags }))}
                              placeholder={sport.placeholder}
                              primary={primary}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div
                className={[
                  "p-3.5 rounded-xl text-sm font-medium border",
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200",
                ].join(" ")}
              >
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Subscribing…
                </span>
              ) : (
                tenant.custom_cta_text || "Remind Me"
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        You can unsubscribe at any time. No spam.
      </p>
    </div>
  );
}
