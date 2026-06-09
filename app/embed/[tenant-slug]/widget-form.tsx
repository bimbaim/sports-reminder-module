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

type LeagueItem = {
  id: number;
  name: string;
  sport_category: string;
  logo_url?: string | null;
};

type WidgetFormProps = {
  tenant: Tenant;
  allowedSports: string[];
  leagues: LeagueItem[];
};

export function WidgetForm({ tenant, allowedSports, leagues }: WidgetFormProps) {
  const primary = tenant.primary_color || "#6366f1";

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  // Step 1: Leagues state
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);

  // Step 2: Teams state (loaded dynamically based on selected leagues)
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch unique teams when selected leagues change
  useEffect(() => {
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
        // Deselect any teams that are no longer available
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
    if (eErr || wErr) return;

    if (selectedLeagues.length === 0) {
      setMessage({ text: "Please select at least one league to follow.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Derive sport categories from selected leagues
    const selectedSportsSet = new Set<string>();
    selectedLeagues.forEach((lId) => {
      const match = leagues.find((l) => l.id === lId);
      if (match) selectedSportsSet.add(match.sport_category);
    });
    const selectedSports = Array.from(selectedSportsSet);

    const fd = new FormData();
    fd.append("email", email);
    fd.append("whatsapp_number", whatsapp);
    selectedSports.forEach((sport) => fd.append("favorite_sports", sport));
    fd.append("favorite_teams", selectedTeams.join(","));

    const result = await subscribeToTenant(tenant.id, fd);

    setLoading(false);
    if (result.success) {
      setMessage({ text: "You're subscribed! We'll notify you before matches. 🎉", type: "success" });
      setEmail("");
      setWhatsapp("");
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
            {/* Email Field */}
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
                  emailError
                    ? "border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:ring-2 focus:ring-slate-100",
                ].join(" ")}
                style={!emailError ? { "--tw-ring-color": primary + "33" } as React.CSSProperties : {}}
              />
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            </div>

            {/* WhatsApp Field */}
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
                  whatsappError
                    ? "border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200 focus:ring-2 focus:ring-slate-100",
                ].join(" ")}
                style={!whatsappError ? { "--tw-ring-color": primary + "33" } as React.CSSProperties : {}}
              />
              {whatsappError && <p className="text-xs text-red-500">{whatsappError}</p>}
            </div>

            {/* League Selector (Step 1) */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Leagues to Follow <span className="text-red-500">*</span>
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 space-y-1.5 scrollbar-thin">
                {leagues.length > 0 ? (
                  leagues.map((league) => {
                    const isChecked = selectedLeagues.includes(league.id);
                    return (
                      <button
                        type="button"
                        key={league.id}
                        onClick={() => toggleLeague(league.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-sm hover:bg-slate-100 transition-colors"
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
                        {league.logo_url && (
                          <img
                            src={league.logo_url}
                            alt=""
                            className="w-4 h-4 rounded-full object-contain bg-white"
                          />
                        )}
                        <span className="text-slate-700 font-medium truncate">{league.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase ml-auto font-semibold">{league.sport_category}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 p-2 text-center">No leagues available for your filters.</p>
                )}
              </div>
            </div>

            {/* Team Selector (Step 2) */}
            {selectedLeagues.length > 0 && (
              <div className="space-y-2.5 transition-all duration-300">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Favorite Teams to Follow</span>
                  {loadingTeams && (
                    <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />
                  )}
                </label>

                {/* Team Tag Container */}
                {selectedTeams.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 bg-slate-50 p-2 border border-slate-100 rounded-lg">
                    {selectedTeams.map((team) => (
                      <span
                        key={team}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold text-slate-700 bg-slate-200/70 border border-slate-300/50"
                      >
                        {team}
                        <button
                          type="button"
                          onClick={() => handleRemoveTeam(team)}
                          className="hover:text-red-500 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Auto-complete Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={loadingTeams ? "Loading teams..." : "Type or search teams…"}
                    value={teamSearch}
                    disabled={loadingTeams || availableTeams.length === 0}
                    onChange={(e) => {
                      setTeamSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none bg-slate-50 placeholder:text-slate-400 disabled:opacity-50"
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
                        <p className="text-xs text-slate-400 px-3 py-2 text-center">No matching teams found.</p>
                      )}
                    </div>
                  )}
                </div>

                {availableTeams.length === 0 && !loadingTeams && (
                  <p className="text-[11px] text-slate-400">
                    No active teams/competitors cached for the selected leagues.
                  </p>
                )}
              </div>
            )}

            {/* Error or Success Message */}
            {message && (
              <div
                className={[
                  "p-3 rounded-xl text-xs font-semibold border",
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200",
                ].join(" ")}
              >
                {message.text}
              </div>
            )}

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />
                  Subscribing…
                </span>
              ) : (
                tenant.custom_cta_text || "Remind Me"
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-3.5">
        Powered by Sports Reminder Module. You can unsubscribe at any time.
      </p>
    </div>
  );
}
