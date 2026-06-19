"use client";

import { useState, useEffect } from "react";
import { subscribeToTenant, getTeamsForLeagues, getEventsForSport } from "./actions";
import { cn } from "@/lib/utils";
import {
  LayoutTemplate, X, Loader2,
  Bell, BellPlus, Mail, Phone, Trophy, Shirt, Check, ArrowRight, ArrowLeft,
} from "lucide-react";

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

const STEPS = [
  { id: 1, label: "Sport" },
  { id: 2, label: "League & Club" },
  { id: 3, label: "Your Contact" },
];

export function WidgetForm({ tenant, allowedSports, leagues }: WidgetFormProps) {
  const ws = tenant.widget_settings || {};

  const primary    = ws.primary_color    || tenant.primary_color    || "#6366f1";
  const fontFamily = ws.font_family      || tenant.font_family      || "var(--font-inter), sans-serif";
  const fontSize   = ws.font_size        || tenant.font_size        || "14px";
  const ctaText    = ws.custom_cta_text  || tenant.custom_cta_text  || "Remind Me";
  const logoUrl    = ws.logo_url         || tenant.logo_url         || null;
  const layoutVariant = ws.layout_variant || "inline";

  // ── stepper ──────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── sticky toggle ─────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);

  // ── step 1: sport ─────────────────────────────────────────
  const [selectedSport, setSelectedSport] = useState("");
  const [sportError, setSportError] = useState("");
  const selectedSportData = allowedSports.find(s => s.sport_slug === selectedSport);

  // ── step 2: league & club/event ───────────────────────────
  const [selectedLeague, setSelectedLeague]     = useState("");
  const [availableLeagues, setAvailableLeagues] = useState<LeagueItem[]>([]);
  const [loadingLeagues, setLoadingLeagues]     = useState(false);
  const [leagueError, setLeagueError]           = useState("");

  const [selectedClub, setSelectedClub]       = useState("");
  const [availableClubs, setAvailableClubs]   = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<MatchItem[]>([]);
  const [loadingStage3, setLoadingStage3]     = useState(false);
  const [clubError, setClubError]             = useState("");

  // ── step 3: contact ───────────────────────────────────────
  const [email, setEmail]           = useState("");
  const [whatsapp, setWhatsapp]     = useState("");
  const [isConsented, setIsConsented] = useState(false);
  const [emailError, setEmailError]   = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [consentError, setConsentError]   = useState("");

  // ── submission ────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<{ text: string; type: "success" | "error" } | null>(null);

  // fetch leagues when sport changes
  useEffect(() => {
    if (!selectedSport) { setAvailableLeagues([]); setSelectedLeague(""); return; }
    setLoadingLeagues(true);
    setAvailableLeagues(leagues.filter(l => l.sport_category === selectedSport));
    setSelectedLeague("");
    setSelectedClub("");
    setLoadingLeagues(false);
  }, [selectedSport, leagues]);

  // fetch clubs/events when league changes (or sport changes for league-less sports)
  useEffect(() => {
    if (!selectedLeague && selectedSportData?.have_leagues) {
      setAvailableClubs([]); setAvailableEvents([]); setSelectedClub(""); return;
    }
    const run = async () => {
      setLoadingStage3(true);
      if (selectedSportData?.have_leagues && selectedLeague) {
        try {
          const teams = await getTeamsForLeagues([parseInt(selectedLeague)]);
          setAvailableClubs(teams); setAvailableEvents([]);
        } catch { console.error("Failed to load clubs"); }
      } else if (selectedSport && !selectedSportData?.have_leagues) {
        const events = await getEventsForSport(selectedSport);
        setAvailableEvents(events); setAvailableClubs([]);
      }
      setLoadingStage3(false); setSelectedClub("");
    };
    run();
  }, [selectedLeague, selectedSport, selectedSportData]);

  // ── validators ────────────────────────────────────────────
  const validateEmail = (v: string) => {
    if (!v) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address.";
    return "";
  };
  const validateWhatsapp = (v: string) => {
    if (!v) return "WhatsApp number is required.";
    if (!/^\+?[0-9\s\-]{7,20}$/.test(v)) return "Please enter a valid number (e.g. +1 234 567 8900).";
    return "";
  };

  // ── step navigation ───────────────────────────────────────
  const goNext1 = () => {
    if (!selectedSport) { setSportError("Please select a sport."); return; }
    setSportError(""); setStep(2);
  };

  const goNext2 = () => {
    let ok = true;
    if (selectedSportData?.have_leagues && !selectedLeague) {
      setLeagueError("Please select a league."); ok = false;
    } else { setLeagueError(""); }
    if (!selectedClub) {
      setClubError(`Please select a ${selectedSportData?.have_leagues ? "club" : "match"}.`);
      ok = false;
    } else { setClubError(""); }
    if (ok) setStep(3);
  };

  // ── final submit ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const wErr = validateWhatsapp(whatsapp);
    setEmailError(eErr); setWhatsappError(wErr);
    let hasError = !!(eErr || wErr);
    if (!isConsented) { setConsentError("Please check the consent box to continue."); hasError = true; }
    else { setConsentError(""); }
    if (hasError) return;

    setLoading(true); setMessage(null);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("whatsapp_number", whatsapp);
    fd.append("is_consented", "true");
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
      setMessage({ text: "You're all set! We'll remind you before each match kicks off.", type: "success" });
      setEmail(""); setWhatsapp(""); setIsConsented(false);
      setSelectedSport(""); setSelectedLeague(""); setSelectedClub("");
      setStep(1);
    } else {
      setMessage({ text: result.error || "Something went wrong. Please try again.", type: "error" });
    }
  };

  // ── shared styles ─────────────────────────────────────────
  const inputBase = (hasError: boolean) =>
    cn(
      "w-full h-10 rounded-[10px] border px-3 text-sm bg-slate-50 dark:bg-slate-800 outline-none transition-all",
      "text-slate-900 dark:text-slate-100 placeholder:text-slate-400",
      hasError
        ? "border-red-400 focus:ring-[3px] focus:ring-red-200 dark:focus:ring-red-900"
        : "border-slate-200 dark:border-slate-700 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
    );

  const selectBase = cn(
    "w-full h-10 rounded-[10px] border px-3 pr-9 text-sm appearance-none bg-slate-50 dark:bg-slate-800 outline-none transition-all cursor-pointer",
    "text-slate-900 dark:text-slate-100",
    "border-slate-200 dark:border-slate-700 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
  );

  const isSticky = layoutVariant === "sticky";

  // ── stepper dot ───────────────────────────────────────────
  const StepDot = ({ id }: { id: number }) => {
    const done    = id < step;
    const current = id === step;
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium transition-all duration-200"
        style={
          done || current
            ? { backgroundColor: primary, color: "#fff" }
            : { backgroundColor: "transparent", border: "1.5px solid #cbd5e1", color: "#94a3b8" }
        }
      >
        {done ? <Check className="w-3.5 h-3.5" /> : id}
      </div>
    );
  };

  // ── form content ──────────────────────────────────────────
  const FormContent = (
    <div
      className={cn(
        "w-full max-w-md mx-auto transition-all duration-300",
        isSticky ? "fixed bottom-24 right-6 z-[999999] origin-bottom-right" : "relative",
        isSticky && !isOpen
          ? "scale-90 opacity-0 pointer-events-none translate-y-4"
          : "scale-100 opacity-100 translate-y-0"
      )}
      style={{ fontFamily, fontSize, ["--primary" as string]: primary }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">

        {/* accent bar */}
        <div className="h-[3px] w-full" style={{ backgroundColor: primary }} />

        {/* header */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: primary }}
            >
              {logoUrl
                ? <img src={logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                : <Bell className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-tight m-0">{tenant.name}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 m-0">Match notifications via WhatsApp &amp; Email</p>
            </div>
          </div>

          {/* stepper track */}
          <div className="flex items-center mb-5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1" : "0" }}>
                <div className="flex flex-col items-center gap-1">
                  <StepDot id={s.id} />
                  <span
                    className="text-[10px] font-medium whitespace-nowrap"
                    style={{ color: s.id <= step ? primary : "#94a3b8" }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="h-[1.5px] flex-1 mx-2 mb-4 transition-colors duration-300"
                    style={{ backgroundColor: s.id < step ? primary : "#e2e8f0" }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />
        </div>

        {/* panels */}
        <div className="px-6 pt-5 pb-6">

          {/* ── STEP 1: Sport ── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">
                Select the sport you would like to follow.
              </p>
              <div className="grid grid-cols-3 gap-2 mb-1">
                {allowedSports.map(sport => {
                  const active = selectedSport === sport.sport_slug;
                  return (
                    <button
                      key={sport.sport_slug}
                      type="button"
                      onClick={() => { setSelectedSport(sport.sport_slug); setSportError(""); }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-[11px] font-medium transition-all",
                        active
                          ? "border-[var(--primary)] text-[var(--primary)]"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                      style={active ? { backgroundColor: `color-mix(in srgb, ${primary} 10%, transparent)` } : {}}
                    >
                      <span className="text-[24px] leading-none">{SPORT_EMOJI[sport.sport_slug] || "🏆"}</span>
                      <span>{sport.sport_name}</span>
                    </button>
                  );
                })}
              </div>
              {sportError && <p className="text-[12px] text-red-500 mb-3">{sportError}</p>}
              <button
                type="button"
                onClick={goNext1}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.985] mt-4"
                style={{ backgroundColor: primary }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: League & Club/Event ── */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200 space-y-4">
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                Select your preferred league and {selectedSportData?.have_leagues ? "club" : "match"}.
              </p>

              {/* League (only for league-based sports) */}
              {selectedSportData?.have_leagues && (
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[.06em]">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" aria-hidden />
                      Select league <span className="text-red-500">*</span>
                    </span>
                    {loadingLeagues && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLeague}
                      onChange={e => { setSelectedLeague(e.target.value); setLeagueError(""); }}
                      disabled={loadingLeagues}
                      className={selectBase}
                    >
                      <option value="">{loadingLeagues ? "Loading leagues..." : "Select a league..."}</option>
                      {availableLeagues.map(l => (
                        <option key={l.id} value={l.id.toString()}>{l.name}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                  </div>
                  {leagueError && <p className="text-[12px] text-red-500">{leagueError}</p>}
                </div>
              )}

              {/* Club or Event */}
              {(selectedLeague || !selectedSportData?.have_leagues) && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[.06em]">
                    <span className="flex items-center gap-1.5">
                      <Shirt className="w-3.5 h-3.5" aria-hidden />
                      {selectedSportData?.have_leagues ? "Favourite club" : "Select a match"} <span className="text-red-500">*</span>
                    </span>
                    {loadingStage3 && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedClub}
                      onChange={e => { setSelectedClub(e.target.value); setClubError(""); }}
                      disabled={loadingStage3}
                      className={selectBase}
                    >
                      <option value="">
                        {loadingStage3 ? "Loading..." : selectedSportData?.have_leagues ? "Select a club..." : "Select a match..."}
                      </option>
                      {selectedSportData?.have_leagues
                        ? availableClubs.map(c => <option key={c} value={c}>{c}</option>)
                        : availableEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>
                              {ev.home_team} vs {ev.away_team} ({ev.tournament_name})
                            </option>
                          ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                  </div>
                  {clubError && <p className="text-[12px] text-red-500">{clubError}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={goNext2}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.985]"
                  style={{ backgroundColor: primary }}
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Contact ── */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">
                Enter your contact details to receive match notifications.
              </p>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wf-email"
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[.06em]"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden />
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="wf-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                    onBlur={() => setEmailError(validateEmail(email))}
                    placeholder="you@example.com"
                    className={inputBase(!!emailError)}
                  />
                  {emailError && <p className="text-[12px] text-red-500">{emailError}</p>}
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wf-whatsapp"
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[.06em]"
                  >
                    <Phone className="w-3.5 h-3.5" aria-hidden />
                    WhatsApp number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="wf-whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={e => { setWhatsapp(e.target.value); setWhatsappError(""); }}
                    onBlur={() => setWhatsappError(validateWhatsapp(whatsapp))}
                    placeholder="+62 812 3456 7890"
                    className={inputBase(!!whatsappError)}
                  />
                  {whatsappError && <p className="text-[12px] text-red-500">{whatsappError}</p>}
                </div>

                {/* Consent */}
                <div className="space-y-1">
                  <label
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-[10px] border cursor-pointer transition-colors",
                      consentError
                        ? "border-red-300 bg-red-50 dark:bg-red-950/30"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isConsented}
                      onChange={e => { setIsConsented(e.target.checked); setConsentError(""); }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 flex-shrink-0 focus:ring-0 focus:ring-offset-0"
                      style={{ accentColor: primary }}
                    />
                    <span className="text-[12px] leading-[1.55] text-slate-600 dark:text-slate-400">
                      I agree to receive WhatsApp notifications about upcoming sports matches.
                    </span>
                  </label>
                  {consentError && <p className="text-[12px] text-red-500">{consentError}</p>}
                </div>

                {/* Status message */}
                {message && (
                  <div
                    className={cn(
                      "p-3 rounded-[10px] border text-[12px] font-medium animate-in zoom-in duration-200",
                      message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                    )}
                  >
                    {message.text}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primary }}
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><BellPlus className="w-4 h-4" aria-hidden />{ctaText}</>}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-3.5 uppercase tracking-[.08em] font-medium opacity-70">
        Powered by Sports Reminder Module
      </p>
    </div>
  );

  return (
    <>
      {FormContent}
      {isSticky && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 z-[999999] animate-in fade-in zoom-in duration-300"
          style={{ backgroundColor: primary }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <LayoutTemplate className="h-6 w-6" />}
        </button>
      )}
    </>
  );
}