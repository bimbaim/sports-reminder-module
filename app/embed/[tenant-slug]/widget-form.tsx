"use client";

import { useState, useEffect } from "react";
import { subscribeToTenant, getTeamsForLeagues } from "./actions";

type Tenant = {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  custom_cta_text?: string | null;
};

type SportSetting = {
  sport_slug: string;
  sport_name: string;
  have_leagues: boolean;
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
  ufc: "🥊",
  nba: "🏀",
  f1: "🏎️",
  nrl: "🏉",
};

export function WidgetForm({ tenant, allowedSports, leagues }: WidgetFormProps) {
  const primary = tenant.primary_color || "#6366f1";

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [isConsented, setIsConsented] = useState(false);
  const [consentError, setConsentError] = useState("");

  // Step 1: Sports state
  const [selectedSports, setSelectedSports] = useState<string[]>(
    allowedSports.length === 1 ? [allowedSports[0].sport_slug] : []
  );

  // Step 2: Leagues state
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);

  // Step 3: Teams state (loaded dynamically based on selected leagues)
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter leagues based on selected sports
  const filteredLeagues = leagues.filter(l => selectedSports.includes(l.sport_category));

  // Determine if we should show the league selector
  // Show if any of the selected sports have have_leagues = true
  const showLeagueSelector = allowedSports
    .filter(s => selectedSports.includes(s.sport_slug))
    .some(s => s.have_leagues);

  // Fetch unique teams when selected leagues change
  useEffect(() => {
    setTeamSearch("");
    setIsDropdownOpen(false);

    // If we have selected sports that DON'T have leagues, we might want to fetch teams for those sports directly?
    // For now, let's stick to the leagues-based team fetching.
    
    if (selectedLeagues.length === 0) {
      setAvailableTeams([]);
      setSelectedTeams([]);
      return;
    }

    const loadTeams = async () => {
      setLoadingTeams(true);
      try {
        const teams = await getTeamsForLeagues(selectedLeagues);
        setAvailableTeams(teams);
        setSelectedTeams((prev) => prev.filter((t) => teams.includes(t)));
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, [selectedLeagues]);

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

  const toggleSport = (slug: string) => {
    setSelectedSports((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    // Clear leagues that are no longer in selected sports
    setSelectedLeagues(prev => prev.filter(lId => {
      const l = leagues.find(item => item.id === lId);
      return l && (selectedSports.includes(slug) ? l.sport_category !== slug : true); 
    }));
  };

  const toggleLeague = (id: number) => {
    setSelectedLeagues((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddTeam = (team: string) => {
    if (!selectedTeams.includes(team)) {
      setSelectedTeams([...selectedTeams, team]);
    }
    setTeamSearch("");
    setIsDropdownOpen(false);
  };

  const handleRemoveTeam = (team: string) => {
    setSelectedTeams(selectedTeams.filter((t) => t !== team));
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

    if (selectedSports.length === 0) {
      setMessage({ text: "Please select at least one sport.", type: "error" });
      hasError = true;
    }

    if (showLeagueSelector && selectedLeagues.length === 0) {
      setMessage({ text: "Please select at least one league to follow.", type: "error" });
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    setMessage(null);

    const fd = new FormData();
    fd.append("email", email);
    fd.append("whatsapp_number", whatsapp);
    fd.append("is_consented", isConsented ? "true" : "false");
    selectedSports.forEach((sport) => fd.append("favorite_sports", sport));
    fd.append("favorite_teams", selectedTeams.join(","));

    const result = await subscribeToTenant(tenant.id, fd);

    setLoading(false);
    if (result.success) {
      setMessage({ text: "You're subscribed! We'll notify you before matches. 🎉", type: "success" });
      setEmail("");
      setWhatsapp("");
      setIsConsented(false);
      setSelectedSports(allowedSports.length === 1 ? [allowedSports[0].sport_slug] : []);
      setSelectedLeagues([]);
      setSelectedTeams([]);
    } else {
      setMessage({ text: result.error || "An error occurred.", type: "error" });
    }
  };

  const filteredTeams = availableTeams.filter(
    (t) =>
      t.toLowerCase().includes(teamSearch.toLowerCase()) &&
      !selectedTeams.includes(t)
  );

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card Wrapper */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: primary }} />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-sm"
              style={{ backgroundColor: primary }}
            >
              {tenant.name.charAt(0).toUpperCase()}
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

            {/* Sport Selector (New Step) */}
            {allowedSports.length > 1 && (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Favorite Sports <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {allowedSports.map((sport) => {
                    const isActive = selectedSports.includes(sport.sport_slug);
                    return (
                      <button
                        key={sport.sport_slug}
                        type="button"
                        onClick={() => toggleSport(sport.sport_slug)}
                        className={[
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                          isActive 
                            ? "text-white border-transparent" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        ].join(" ")}
                        style={isActive ? { backgroundColor: primary } : {}}
                      >
                        <span>{SPORT_EMOJI[sport.sport_slug] || "🏆"}</span>
                        {sport.sport_name}
                        {isActive && <span className="ml-1 text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* League Selector - Only show if selected sports have leagues */}
            {showLeagueSelector && (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Leagues to Follow <span className="text-red-500">*</span>
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50 space-y-1 scrollbar-thin">
                  {filteredLeagues.length > 0 ? (
                    filteredLeagues.map((league) => {
                      const isChecked = selectedLeagues.includes(league.id);
                      return (
                        <button
                          type="button"
                          key={league.id}
                          onClick={() => toggleLeague(league.id)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm hover:bg-slate-100 transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                            style={{
                              backgroundColor: isChecked ? primary : "transparent",
                              borderColor: isChecked ? primary : "#cbd5e1",
                            }}
                          >
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={3}>
                                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-slate-700 font-medium truncate">{league.name}</span>
                          <span className="text-[9px] text-slate-400 uppercase ml-auto font-bold">{league.sport_category}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-400 p-2 text-center">Select a sport above to see leagues.</p>
                  )}
                </div>
              </div>
            )}

            {/* Team Selector - Show only if leagues are selected or if a standalone sport is selected */}
            {(selectedLeagues.length > 0 || (selectedSports.length > 0 && !showLeagueSelector)) && (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Favorite Teams</span>
                  {loadingTeams && <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />}
                </label>

                {selectedTeams.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 bg-slate-50 p-2 border border-slate-100 rounded-lg">
                    {selectedTeams.map((team) => (
                      <span key={team} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-700 bg-slate-200/70 border border-slate-300/50">
                        {team}
                        <button type="button" onClick={() => handleRemoveTeam(team)} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    placeholder={loadingTeams ? "Loading teams..." : "Search teams…"}
                    value={teamSearch}
                    disabled={loadingTeams || (showLeagueSelector && selectedLeagues.length === 0)}
                    onChange={(e) => { setTeamSearch(e.target.value); setIsDropdownOpen(true); }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none bg-slate-50 placeholder:text-slate-400"
                  />
                  {isDropdownOpen && teamSearch.trim() && (
                    <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1 scrollbar-thin">
                      {filteredTeams.length > 0 ? (
                        filteredTeams.map((team) => (
                          <button
                            type="button"
                            key={team}
                            onClick={() => handleAddTeam(team)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 font-medium"
                          >
                            {team}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 px-3 py-2 text-center">No matching teams.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Message */}
            {message && (
              <div className={["p-3 rounded-xl text-xs font-bold border", message.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"].join(" ")}>
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
              {loading ? "Subscribing…" : (tenant.custom_cta_text || "Remind Me")}
            </button>
          </form>
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-400 mt-4">Powered by Sports Reminder Module</p>
    </div>
  );
}
