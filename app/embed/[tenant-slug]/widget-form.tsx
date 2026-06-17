"use client";

import { useState, useEffect } from "react";
import { subscribeToTenant, getTeamsForLeagues, getEventsForSport } from "./actions";
import { cn } from "@/lib/utils";
import { LayoutTemplate, X, Loader2, CheckCircle2, ChevronRight, Mail, Phone, Zap } from "lucide-react";

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

  // Helper to determine step status
  const isEmailComplete = email && !validateEmail(email);
  const isWhatsappComplete = whatsapp && !validateWhatsapp(whatsapp);
  const isContactsComplete = isEmailComplete && isWhatsappComplete && isConsented;
  const isSportComplete = !!selectedSport;
  const isLeagueComplete = !selectedSportData?.have_leagues || !!selectedLeague;
  const isClubComplete = !!selectedClub;
  const isFormComplete = isContactsComplete && isSportComplete && isLeagueComplete && isClubComplete;

  const FormContent = (
    <div 
      className={cn(
        "w-full max-w-xl transition-all duration-300",
        isSticky ? "fixed bottom-24 right-6 z-[999999] origin-bottom-right" : "relative",
        isSticky && !isOpen ? "scale-90 opacity-0 pointer-events-none translate-y-4" : "scale-100 opacity-100 translate-y-0"
      )}
      style={{ fontFamily, fontSize }}
    >
      {/* Card Wrapper with Premium Design */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden backdrop-blur-sm">
        
        {/* Top Accent bar with gradient */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
          <div 
            className="absolute h-full w-1/3"
            style={{ 
              background: `linear-gradient(90deg, ${primary}, ${primary}dd)`,
              animation: 'shimmer 3s infinite'
            }}
          />
        </div>

        <div className="p-8 space-y-7">
          
          {/* ──── Header Section ──── */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-xl flex-shrink-0 shadow-lg overflow-hidden border-2 border-white relative"
                style={{ backgroundColor: primary }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="relative z-10">{tenant.name.charAt(0).toUpperCase()}</span>
                )}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundColor: primary }}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{tenant.name}</h2>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Get match reminders via WhatsApp & Email
                </p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="flex gap-1.5 pt-2">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${isContactsComplete ? 'bg-green-500' : email && whatsapp ? 'bg-yellow-500' : 'bg-slate-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${isSportComplete ? 'bg-blue-500' : 'bg-slate-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${isFormComplete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* ──── Section 1: Contact Information ──── */}
            <div className={cn(
              "rounded-2xl border-2 p-5 space-y-4 transition-all duration-300",
              isContactsComplete 
                ? "border-green-300 bg-green-50/50" 
                : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
            )}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="h-4 w-4" style={{ color: primary }} />
                  Contact Information
                </h3>
                {isContactsComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>

              <div className="space-y-3.5">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      onBlur={() => setEmailError(validateEmail(email))}
                      placeholder="you@example.com"
                      className={cn(
                        "w-full h-11 rounded-xl border-2 px-4 text-sm outline-none transition-all bg-white font-medium",
                        emailError 
                          ? "border-red-400 focus:ring-2 focus:ring-red-100" 
                          : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                        email && !emailError && "border-green-400"
                      )}
                      style={!emailError && email ? { "--tw-ring-color": primary + "20" } as React.CSSProperties : {}}
                    />
                    {email && !emailError && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {emailError && <p className="text-xs text-red-600 font-medium">{emailError}</p>}
                </div>

                {/* WhatsApp Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="whatsapp">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => { setWhatsapp(e.target.value); setWhatsappError(""); }}
                      onBlur={() => setWhatsappError(validateWhatsapp(whatsapp))}
                      placeholder="+62 812 3456 7890"
                      className={cn(
                        "w-full h-11 rounded-xl border-2 px-4 text-sm outline-none transition-all bg-white font-medium",
                        whatsappError 
                          ? "border-red-400 focus:ring-2 focus:ring-red-100" 
                          : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                        whatsapp && !whatsappError && "border-green-400"
                      )}
                      style={!whatsappError && whatsapp ? { "--tw-ring-color": primary + "20" } as React.CSSProperties : {}}
                    />
                    {whatsapp && !whatsappError && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {whatsappError && <p className="text-xs text-red-600 font-medium">{whatsappError}</p>}
                </div>

                {/* Consent Checkbox - Enhanced */}
                <div className="space-y-1.5 pt-2">
                  <label className={cn(
                    "flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-all",
                    isConsented ? "bg-green-50 border border-green-200" : "hover:bg-slate-100 border border-transparent"
                  )}>
                    <input
                      type="checkbox"
                      checked={isConsented}
                      onChange={(e) => {
                        setIsConsented(e.target.checked);
                        setConsentError("");
                      }}
                      className="mt-1 w-4 h-4 rounded border-slate-300 transition-colors focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      style={{ accentColor: primary }}
                    />
                    <span className="text-xs font-medium text-slate-600 leading-tight flex-1">
                      I agree to receive WhatsApp notifications related to upcoming sports matches.
                    </span>
                    {isConsented && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />}
                  </label>
                  {consentError && <p className="text-xs text-red-600 font-medium px-3">{consentError}</p>}
                </div>
              </div>
            </div>

            {/* ──── Section 2: Sport Selection ──── */}
            <div className={cn(
              "rounded-2xl border-2 p-5 space-y-4 transition-all duration-300",
              isSportComplete 
                ? "border-blue-300 bg-blue-50/50" 
                : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
            )}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  Sport Selection
                </h3>
                {isSportComplete && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Cabang Olahragas <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className={cn(
                    "w-full h-11 rounded-xl border-2 px-4 text-sm outline-none bg-white transition-all font-medium",
                    isSportComplete
                      ? "border-blue-400 bg-blue-50/30"
                      : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  )}
                  style={isSportComplete ? {} : { "--tw-ring-color": primary + "20" } as React.CSSProperties}
                >
                  <option value="">Pilih Olahraga...</option>
                  {allowedSports.map((sport) => (
                    <option key={sport.sport_slug} value={sport.sport_slug}>
                      {SPORT_EMOJI[sport.sport_slug] || "🏆"} {sport.sport_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ──── Section 3: League Selection ──── */}
            {selectedSport && selectedSportData?.have_leagues && (
              <div className="animate-in fade-in slide-in-from-top-3 duration-300">
                <div className={cn(
                  "rounded-2xl border-2 p-5 space-y-4 transition-all duration-300",
                  isLeagueComplete
                    ? "border-purple-300 bg-purple-50/50"
                    : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
                )}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
                      League Selection
                    </h3>
                    {isLeagueComplete && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                    {loadingLeagues && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Pilih Liga <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedLeague}
                      onChange={(e) => setSelectedLeague(e.target.value)}
                      className={cn(
                        "w-full h-11 rounded-xl border-2 px-4 text-sm outline-none bg-white transition-all font-medium",
                        isLeagueComplete
                          ? "border-purple-400 bg-purple-50/30"
                          : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                        loadingLeagues && "opacity-60 cursor-not-allowed"
                      )}
                      disabled={loadingLeagues}
                      style={isLeagueComplete ? {} : { "--tw-ring-color": primary + "20" } as React.CSSProperties}
                    >
                      <option value="">{loadingLeagues ? "Memuat Liga..." : "Pilih Liga..."}</option>
                      {availableLeagues.map((league) => (
                        <option key={league.id} value={league.id.toString()}>
                          {league.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ──── Section 4: Club/Event Selection ──── */}
            {selectedSport && (selectedLeague || !selectedSportData?.have_leagues) && (
              <div className="animate-in fade-in slide-in-from-top-3 duration-300">
                <div className={cn(
                  "rounded-2xl border-2 p-5 space-y-4 transition-all duration-300",
                  isClubComplete
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
                )}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-lg">👥</span>
                      {selectedSportData?.have_leagues ? "Team Selection" : "Match Selection"}
                    </h3>
                    {isClubComplete && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {loadingStage3 && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {selectedSportData?.have_leagues ? "Pilih Klub Utama" : "Pilih Event"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClub}
                      onChange={(e) => setSelectedClub(e.target.value)}
                      className={cn(
                        "w-full h-11 rounded-xl border-2 px-4 text-sm outline-none bg-white transition-all font-medium",
                        isClubComplete
                          ? "border-emerald-400 bg-emerald-50/30"
                          : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                        loadingStage3 && "opacity-60 cursor-not-allowed"
                      )}
                      disabled={loadingStage3}
                      style={isClubComplete ? {} : { "--tw-ring-color": primary + "20" } as React.CSSProperties}
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
                </div>
              </div>
            )}

            {/* Status Message - Enhanced */}
            {message && (
              <div className={cn(
                "p-4 rounded-xl text-sm font-bold border-2 animate-in zoom-in duration-300 flex items-start gap-3", 
                message.type === "success" 
                  ? "bg-green-50 text-green-800 border-green-300" 
                  : "bg-red-50 text-red-800 border-red-300"
              )}>
                {message.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <span className="text-lg flex-shrink-0">⚠️</span>
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Submit Button - Enhanced */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200",
                "hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
                loading && "flex items-center justify-center gap-2"
              )}
              style={{ backgroundColor: primary }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Subscribing...</span>
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {ctaText}
                  {!loading && <ChevronRight className="h-4 w-4" />}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-400 mt-5 uppercase tracking-widest font-bold opacity-70">
        ✨ Powered by Sports Reminder Module
      </p>
    </div>
  );

  return (
    <>
      {FormContent}
      
      {isSticky && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-all",
            "hover:scale-125 active:scale-95 z-[999999] animate-in fade-in zoom-in duration-300",
            "border-4 border-white"
          )}
          style={{ 
            backgroundColor: primary,
            boxShadow: `0 0 30px ${primary}40`
          }}
        >
          {isOpen ? (
            <X className="h-7 w-7" />
          ) : (
            <LayoutTemplate className="h-7 w-7" />
          )}
        </button>
      )}

      {/* Ambient glow effect for sticky button */}
      {isSticky && !isOpen && (
        <div 
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full blur-2xl opacity-30 animate-pulse z-[999998]"
          style={{ backgroundColor: primary }}
        />
      )}
    </>
  );
}