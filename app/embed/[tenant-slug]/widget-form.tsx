"use client";

import { useState, useEffect } from "react";
import { subscribeToTenant, getTeamsForLeagues, getEventsForSport } from "./actions";
import { cn } from "@/lib/utils";
import { LayoutTemplate, X, Loader2 } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  custom_cta_text?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  widget_settings?: any;
};

type SportSetting = {
  sport_slug: string;
  sport_name: string;
  have_leagues: boolean;
};

type MatchItem = {
  id: string;
  home_team: string;
  away_team: string;
  tournament_name: string;
  kickoff_time: string;
};

type LeagueItem = {
  id: number;
  name: string;
  sport_category: string;
  logo_url?: string | null;
};

type WidgetFormProps = {
  tenant: Tenant;
  allowedSports: SportSetting[];
  leagues: LeagueItem[];
};

const SPORT_EMOJI: Record<string, string> = {
  football: "⚽",
  basketball: "🏀",
  rugby: "🏉",
  tennis: "🎾",
  mma: "🥊",
  motorsports: "🏎️",
  "fifa-world-cup-2026": "🏆",
};

export function WidgetForm({ tenant, allowedSports, leagues }: WidgetFormProps) {
  const ws = tenant.widget_settings || {};
  
  const primary = ws.primary_color || tenant.primary_color || "#6366f1";
  const fontFamily = ws.font_family || tenant.font_family || "var(--font-inter), sans-serif";
  const fontSize = ws.font_size || tenant.font_size || "14px";
  const ctaText = ws.custom_cta_text || tenant.custom_cta_text || "Remind Me";
  const logoUrl = ws.logo_url || tenant.logo_url || null;
  const layoutVariant = ws.layout_variant || "inline";

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [isConsented, setIsConsented] = useState(false);
  const [consentError, setConsentError] = useState("");

  // Step 1: Sport state
  const [selectedSport, setSelectedSport] = useState<string>("");
  const selectedSportData = allowedSports.find(s => s.sport_slug === selectedSport);

  // Step 2: League Selection
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [availableLeagues, setAvailableLeagues] = useState<LeagueItem[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);

  // Step 3: Club/Event Selection
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<MatchItem[]>([]);
  const [loadingStage3, setLoadingStage3] = useState(false);

  // Effect for Stage 2 (Leagues)
  useEffect(() => {
    if (!selectedSport) {
      setAvailableLeagues([]);
      setSelectedLeague("");
      return;
    }

    const fetchLeagues = async () => {
      setLoadingLeagues(true);
      // Filter local leagues from props
      const filtered = leagues.filter(l => l.sport_category === selectedSport);
      setAvailableLeagues(filtered);
      setLoadingLeagues(false);
      
      // If we switched sports, reset league
      setSelectedLeague("");
    };

    fetchLeagues();
  }, [selectedSport, leagues]);

  // Effect for Stage 3 (Clubs or Events)
  useEffect(() => {
    if (!selectedLeague && selectedSportData?.have_leagues) {
      setAvailableClubs([]);
      setAvailableEvents([]);
      setSelectedClub("");
      return;
    }

    const fetchData = async () => {
      setLoadingStage3(true);
      
      if (selectedSportData?.have_leagues) {
        // Fetch teams/clubs for specific league
        try {
          const teams = await getTeamsForLeagues([parseInt(selectedLeague)]);
          setAvailableClubs(teams);
          setAvailableEvents([]);
        } catch (err) {
          console.error("Failed to load clubs:", err);
        }
      } else if (selectedSport) {
        // Standalone sport - fetch events directly
        const events = await getEventsForSport(selectedSport);
        setAvailableEvents(events);
        setAvailableClubs([]);
      }
      
      setLoadingStage3(false);
      setSelectedClub("");
    };

    fetchData();
  }, [selectedLeague, selectedSport, selectedSportData]);

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

    let hasError = false;
    if (eErr || wErr) hasError = true;

    if (!isConsented) {
      setConsentError("You must agree to receive WhatsApp notifications to subscribe.");
      hasError = true;
    } else {
      setConsentError("");
    }

    if (!selectedSport) {
      setMessage({ text: "Please select a sport.", type: "error" });
      hasError = true;
    }

    if (selectedSportData?.have_leagues && !selectedLeague) {
      setMessage({ text: "Please select a league.", type: "error" });
      hasError = true;
    }

    if (!selectedClub) {
      const label = selectedSportData?.have_leagues ? "club" : "event";
      setMessage({ text: `Please select a ${label}.`, type: "error" });
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    setMessage(null);

    const fd = new FormData();
    fd.append("email", email);
    fd.append("whatsapp_number", whatsapp);
    fd.append("is_consented", isConsented ? "true" : "false");
    fd.append("favorite_sports", selectedSport);
    
    if (selectedSportData?.have_leagues) {
      fd.append("favorite_leagues", selectedLeague);
      fd.append("favorite_teams", selectedClub);
    } else {
      fd.append("favorite_events", selectedClub);
    }

    const result = await subscribeToTenant(tenant.id, fd);

    setLoading(false);
    if (result.success) {
      setMessage({ text: "You're subscribed! We'll notify you before matches. 🎉", type: "success" });
      setEmail("");
      setWhatsapp("");
      setIsConsented(false);
      setSelectedSport("");
      setSelectedLeague("");
      setSelectedClub("");
    } else {
      setMessage({ text: result.error || "An error occurred.", type: "error" });
    }
  };

  const isSticky = layoutVariant === "sticky";

  const FormContent = (
    <div 
      className={cn(
        "w-full max-w-md mx-auto transition-all duration-300",
        isSticky ? "fixed bottom-24 right-6 z-[999999] origin-bottom-right" : "relative",
        isSticky && !isOpen ? "scale-90 opacity-0 pointer-events-none translate-y-4" : "scale-100 opacity-100 translate-y-0"
      )}
      style={{ fontFamily, fontSize }}
    >
      {/* Card Wrapper */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: primary }} />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-sm overflow-hidden"
              style={{ backgroundColor: primary }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
              ) : (
                tenant.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{tenant.name}</h2>
              <p className="text-xs text-slate-500">Get match reminders via WhatsApp & Email</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email & WhatsApp Fields */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="email">
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
                    emailError ? "border-red-400 focus:ring-2 focus:ring-red-200" : "border-slate-200 focus:ring-2 focus:ring-slate-100",
                  ].join(" ")}
                  style={!emailError ? { "--tw-ring-color": primary + "33" } as React.CSSProperties : {}}
                />
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="whatsapp">
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
                    whatsappError ? "border-red-400 focus:ring-2 focus:ring-red-200" : "border-slate-200 focus:ring-2 focus:ring-slate-100",
                  ].join(" ")}
                  style={!whatsappError ? { "--tw-ring-color": primary + "33" } as React.CSSProperties : {}}
                />
                {whatsappError && <p className="text-xs text-red-500">{whatsappError}</p>}
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={isConsented}
                  onChange={(e) => {
                    setIsConsented(e.target.checked);
                    setConsentError("");
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 transition-colors focus:ring-0 focus:ring-offset-0"
                  style={{ accentColor: primary }}
                />
                <span className="text-xs font-medium text-slate-600 leading-tight">
                  I agree to receive WhatsApp notifications related to upcoming sports matches.
                </span>
              </label>
              {consentError && <p className="text-xs text-red-500">{consentError}</p>}
            </div>

            <div className="h-px bg-slate-100 my-2" />

            {/* Stage 1: Sport Category (Dropdown) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cabang Olahragas <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none bg-slate-50 focus:ring-2 focus:ring-slate-100"
                style={{ "--tw-ring-color": primary + "33" } as React.CSSProperties}
              >
                <option value="">Pilih Olahraga...</option>
                {allowedSports.map((sport) => (
                  <option key={sport.sport_slug} value={sport.sport_slug}>
                    {SPORT_EMOJI[sport.sport_slug] || "🏆"} {sport.sport_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage 2: League Selection (only if sport has leagues) */}
            {selectedSport && selectedSportData?.have_leagues && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Pilih Liga <span className="text-red-500">*</span></span>
                  {loadingLeagues && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none bg-slate-50 focus:ring-2 focus:ring-slate-100"
                  style={{ "--tw-ring-color": primary + "33" } as React.CSSProperties}
                  disabled={loadingLeagues}
                >
                  <option value="">{loadingLeagues ? "Memuat Liga..." : "Pilih Liga..."}</option>
                  {availableLeagues.map((league) => (
                    <option key={league.id} value={league.id.toString()}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stage 3: Club or Event Selection */}
            {selectedSport && (selectedLeague || !selectedSportData?.have_leagues) && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>{selectedSportData?.have_leagues ? "Pilih Klub Utama" : "Pilih Event"} <span className="text-red-500">*</span></span>
                  {loadingStage3 && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </label>
                
                <select
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none bg-slate-50 focus:ring-2 focus:ring-slate-100"
                  style={{ "--tw-ring-color": primary + "33" } as React.CSSProperties}
                  disabled={loadingStage3}
                >
                  <option value="">
                    {loadingStage3 ? "Memuat Data..." : selectedSportData?.have_leagues ? "Pilih Klub..." : "Pilih Pertandingan..."}
                  </option>
                  
                  {selectedSportData?.have_leagues ? (
                    availableClubs.map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))
                  ) : (
                    availableEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.home_team} vs {event.away_team} ({event.tournament_name})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Status Message */}
            {message && (
              <div className={cn(
                "p-3 rounded-xl text-xs font-bold border animate-in zoom-in duration-300", 
                message.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
              )}>
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : ctaText}
            </button>
          </form>
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold opacity-70">Powered by Sports Reminder Module</p>
    </div>
  );

  return (
    <>
      {FormContent}
      
      {isSticky && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 z-[999999] animate-in fade-in zoom-in duration-300"
          style={{ backgroundColor: primary }}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <LayoutTemplate className="h-6 w-6" />
          )}
        </button>
      )}
    </>
  );
}
