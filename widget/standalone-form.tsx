"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../lib/utils";
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

type StandaloneFormProps = {
  config: {
    tenant: Tenant;
    allowedSports: SportSetting[];
    leagues: LeagueItem[];
  };
  layout: string;
  baseUrl: string;
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
  { id: 1, label: "Olahraga" },
  { id: 2, label: "Liga & Klub" },
  { id: 3, label: "Kontakmu" },
];

export function StandaloneForm({ config, layout, baseUrl }: StandaloneFormProps) {
  const { tenant, allowedSports, leagues: initialLeagues } = config;
  const ws = tenant.widget_settings || {};

  const primary    = ws.primary_color    || tenant.primary_color    || "#6366f1";
  const fontFamily = ws.font_family      || tenant.font_family      || "sans-serif";
  const fontSize   = ws.font_size        || tenant.font_size        || "14px";
  const ctaText    = ws.custom_cta_text  || tenant.custom_cta_text  || "Ingatkan Saya";
  const logoUrl    = ws.logo_url         || tenant.logo_url         || null;
  const isSticky   = layout === "sticky";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isOpen, setIsOpen] = useState(false);

  const [selectedSport, setSelectedSport] = useState("");
  const [sportError, setSportError] = useState("");
  const selectedSportData = allowedSports.find(s => s.sport_slug === selectedSport);

  const [selectedLeague, setSelectedLeague]     = useState("");
  const [availableLeagues, setAvailableLeagues] = useState<LeagueItem[]>([]);
  const [loadingLeagues, setLoadingLeagues]     = useState(false);
  const [leagueError, setLeagueError]           = useState("");

  const [selectedClub, setSelectedClub]       = useState("");
  const [availableClubs, setAvailableClubs]   = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<MatchItem[]>([]);
  const [loadingStage3, setLoadingStage3]     = useState(false);
  const [clubError, setClubError]             = useState("");

  const [email, setEmail]           = useState("");
  const [emailError, setEmailError] = useState("");
  const [whatsapp, setWhatsapp]           = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [isConsented, setIsConsented]   = useState(false);
  const [consentError, setConsentError] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (selectedSport) {
      const filteredLeagues = initialLeagues.filter(l => l.sport_category === selectedSport);
      setAvailableLeagues(filteredLeagues);
    }
  }, [selectedSport, initialLeagues]);

  useEffect(() => {
    if (selectedLeague && selectedSportData?.have_leagues) {
      const fetchTeams = async () => {
        setLoadingStage3(true);
        try {
          const res = await fetch(`${baseUrl}/api/widget/matches?leagues=${selectedLeague}`);
          const data = await res.json();
          setAvailableClubs(data.teams || []);
        } finally {
          setLoadingStage3(false);
        }
      };
      fetchTeams();
    } else if (selectedSport && !selectedSportData?.have_leagues) {
      const fetchEvents = async () => {
        setLoadingStage3(true);
        try {
          const res = await fetch(`${baseUrl}/api/widget/matches?sport=${selectedSport}`);
          const data = await res.json();
          setAvailableEvents(data.matches || []);
        } finally {
          setLoadingStage3(false);
        }
      };
      fetchEvents();
    }
  }, [selectedLeague, selectedSport, selectedSportData, baseUrl]);

  const validateEmail = (val: string) => {
    if (!val) return "Email is required.";
    if (!/\S+@\S+\.\S+/.test(val)) return "Invalid email format.";
    return "";
  };

  const validateWhatsapp = (val: string) => {
    if (!val) return "WhatsApp number is required.";
    const clean = val.replace(/[\s\-\(\)\+]/g, "");
    if (clean.length < 10) return "Too short.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const wErr = validateWhatsapp(whatsapp);
    const cErr = !isConsented ? "You must agree to notifications." : "";

    setEmailError(eErr);
    setWhatsappError(wErr);
    setConsentError(cErr);

    if (eErr || wErr || cErr) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${baseUrl}/api/widget/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          email,
          whatsapp_number: whatsapp.replace(/[\s\-\(\)\+]/g, ""),
          is_consented: true,
          favorite_sports: [selectedSport],
          favorite_teams: selectedClub ? [selectedClub] : []
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Terima kasih! Kamu telah terdaftar." });
      } else {
        setMessage({ type: "error", text: data.error || "Gagal mendaftar." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Terjadi kesalahan server." });
    } finally {
      setLoading(false);
    }
  };

  const StepDot = ({ id }: { id: number }) => (
    <div
      className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all duration-300",
        step >= id
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-slate-200 bg-white text-slate-400"
      )}
      style={step >= id ? { borderColor: primary, backgroundColor: primary } : {}}
    >
      {step > id ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : id}
    </div>
  );

  const selectBase = "w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition-all disabled:opacity-50";
  const inputBase = (hasErr: boolean) => cn(
    "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all",
    hasErr
      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
      : "border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500"
  );

  const FormContent = (
    <div
      className={cn(
        "w-full max-w-[420px] bg-transparent transition-all duration-300 ease-out",
        isSticky && "fixed bottom-[90px] right-6 z-[999999]",
        isSticky && !isOpen
          ? "scale-90 opacity-0 pointer-events-none translate-y-4"
          : "scale-100 opacity-100 translate-y-0"
      )}
      style={{ fontFamily, fontSize, ["--primary" as string]: primary }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
        <div className="h-[3px] w-full" style={{ backgroundColor: primary }} />
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: primary }}>
              {logoUrl ? <img src={logoUrl} alt={tenant.name} className="w-full h-full object-cover" /> : <Bell className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-tight m-0">{tenant.name}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 m-0">Notifikasi pertandingan via WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center mb-5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1" : "0" }}>
                <div className="flex flex-col items-center gap-1">
                  <StepDot id={s.id} />
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: s.id <= step ? primary : "#94a3b8" }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="h-[1.5px] flex-1 mx-2 mb-4 transition-colors duration-300" style={{ backgroundColor: s.id < step ? primary : "#e2e8f0" }} />}
              </div>
            ))}
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-800" />
        </div>

        <div className="px-6 pt-5 pb-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-500 mb-4">Pilih cabang olahraga yang ingin kamu ikuti.</p>
              <div className="grid grid-cols-3 gap-2">
                {allowedSports.map(sport => {
                  const active = selectedSport === sport.sport_slug;
                  return (
                    <button key={sport.sport_slug} type="button" onClick={() => { setSelectedSport(sport.sport_slug); setSportError(""); }} className={cn("flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-[11px] font-medium transition-all", active ? "border-[var(--primary)] text-[var(--primary)]" : "border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100")} style={active ? { backgroundColor: `${primary}1a` } : {}}>
                      <span className="text-[24px]">{SPORT_EMOJI[sport.sport_slug] || "🏆"}</span>
                      <span>{sport.sport_name}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => selectedSport ? setStep(2) : setSportError("Pilih olahraga.")} className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white mt-4" style={{ backgroundColor: primary }}>Lanjut <ArrowRight className="w-4 h-4" /></button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pilih liga</label>
                <div className="relative">
                  <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)} className={selectBase}>
                    <option value="">Pilih liga...</option>
                    {availableLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{selectedSportData?.have_leagues ? "Klub utama" : "Pertandingan"}</label>
                <div className="relative">
                  <select value={selectedClub} onChange={e => setSelectedClub(e.target.value)} className={selectBase}>
                    <option value="">Pilih...</option>
                    {selectedSportData?.have_leagues 
                      ? availableClubs.map(c => <option key={c} value={c}>{c}</option>)
                      : availableEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.home_team} vs {ev.away_team}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep(1)} className="h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 bg-transparent flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Kembali</button>
                <button type="button" onClick={() => (selectedSportData?.have_leagues ? selectedLeague && selectedClub : selectedClub) ? setStep(3) : null} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white" style={{ backgroundColor: primary }}>Lanjut <ArrowRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500 uppercase">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputBase(!!emailError)} placeholder="kamu@email.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500 uppercase">WhatsApp</label>
                <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inputBase(!!whatsappError)} placeholder="+62..." />
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-[10px] border border-slate-200 bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={isConsented} onChange={e => setIsConsented(e.target.checked)} className="mt-1" />
                <span className="text-[12px] text-slate-600">Saya setuju menerima notifikasi WhatsApp.</span>
              </label>
              {message && <div className={cn("p-3 rounded-lg text-xs", message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{message.text}</div>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep(2)} className="h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 bg-transparent flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Kembali</button>
                <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white" style={{ backgroundColor: primary }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BellPlus className="w-4 h-4" /> {ctaText}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {FormContent}
      {isSticky && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white z-[999999]"
          style={{ backgroundColor: primary }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <LayoutTemplate className="h-6 w-6" />}
        </button>
      )}
    </>
  );
}
