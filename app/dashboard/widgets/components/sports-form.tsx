"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Trophy, Shield, Users, CheckCircle2, ChevronRight } from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Sport {
  slug: string;
  name: string;
  have_leagues: boolean;
}

interface League {
  id: number;
  name: string;
}

interface SportsFormProps {
  onConfigurationChange: (config: { sport: string; league: string; club: string }) => void;
  initialValues?: { sport: string; league: string; club: string };
  // availableSports is kept for compatibility but the component now fetches its own data
  availableSports?: any[]; 
}

// ─── Service Layer (OOP Approach) ───────────────────────────────────────────

/**
 * SportsDataService handles all database interactions for the sports hierarchy.
 * Following an OOP approach to encapsulate Supabase logic.
 */
class SportsDataService {
  private supabase = createClient();

  /**
   * Tahap 1: Ambil data dari tabel sport_categories
   */
  async getSports(): Promise<Sport[]> {
    const { data, error } = await this.supabase
      .from("sport_categories")
      .select("slug, name, have_leagues")
      .order("name", { ascending: true });

    if (error) {
      console.error("SportsDataService: Error fetching sports", error);
      throw error;
    }
    return data || [];
  }

  /**
   * Tahap 2: Ambil data dari tabel leagues berdasarkan sport_category (slug)
   */
  async getLeagues(sportSlug: string): Promise<League[]> {
    const { data, error } = await this.supabase
      .from("leagues")
      .select("id, name")
      .eq("sport_category", sportSlug)
      .order("name", { ascending: true });

    if (error) {
      console.error("SportsDataService: Error fetching leagues", error);
      throw error;
    }
    return data || [];
  }

  /**
   * Tahap 3: Ambil data dari tabel matches untuk mengekstrak klub unik
   * Note: Menggunakan kolom competitor_a dan competitor_b sesuai skema database aktif.
   */
  async getClubsFromMatches(leagueId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("matches")
      .select("competitor_a, competitor_b")
      .eq("league_id", parseInt(leagueId))
      .limit(500);

    if (error) {
      console.error("SportsDataService: Error fetching clubs from matches", error);
      throw error;
    }
    
    // Ekstrak nama klub unik (home_team & away_team)
    const clubSet = new Set<string>();
    data?.forEach(match => {
      if (match.competitor_a) clubSet.add(match.competitor_a);
      if (match.competitor_b) clubSet.add(match.competitor_b);
    });

    return Array.from(clubSet).sort();
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * SportsForm - Formulir konfigurasi tiga tahap berurutan secara dinamis.
 * Alur: Sport Selection → League Selection → Club Selection
 */
export function SportsForm({ 
  onConfigurationChange,
  initialValues 
}: SportsFormProps) {
  // Service instance memoized for the component lifecycle
  const service = useMemo(() => new SportsDataService(), []);

  // ─── State ───

  // Selection states
  const [selectedSport, setSelectedSport] = useState<string>(initialValues?.sport || "");
  const [selectedLeague, setSelectedLeague] = useState<string>(initialValues?.league || "");
  const [selectedClub, setSelectedClub] = useState<string>(initialValues?.club || "");

  // Ref to track last notified config to prevent infinite loops if parent re-renders
  const lastNotifiedRef = useRef("");

  // Data states
  const [sports, setSports] = useState<Sport[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [clubs, setClubs] = useState<string[]>([]);

  // Loading states
  const [loading, setLoading] = useState({
    sports: false,
    leagues: false,
    clubs: false
  });

  // ─── Effects (Hierarchy Logic) ───

  // 1. Load Sports on mount
  useEffect(() => {
    const initSports = async () => {
      setLoading(prev => ({ ...prev, sports: true }));
      try {
        const data = await service.getSports();
        setSports(data);
      } catch (err) {
        // Error logged in service
      } finally {
        setLoading(prev => ({ ...prev, sports: false }));
      }
    };
    initSports();
  }, [service]);

  // 2. Load Leagues when selectedSport changes
  useEffect(() => {
    if (!selectedSport) {
      setLeagues([]);
      return;
    }

    const loadLeagues = async () => {
      setLoading(prev => ({ ...prev, leagues: true }));
      try {
        const data = await service.getLeagues(selectedSport);
        setLeagues(data);
        
        // Validation: If initial league doesn't exist in new leagues, reset it
        if (selectedLeague && !data.find(l => l.id.toString() === selectedLeague)) {
          setSelectedLeague("");
          setSelectedClub("");
        }
      } catch (err) {
        // Error logged in service
      } finally {
        setLoading(prev => ({ ...prev, leagues: false }));
      }
    };

    loadLeagues();
  }, [selectedSport, service]);

  // 3. Load Clubs when selectedLeague changes
  useEffect(() => {
    if (!selectedLeague) {
      setClubs([]);
      return;
    }

    const loadClubs = async () => {
      setLoading(prev => ({ ...prev, clubs: true }));
      try {
        const data = await service.getClubsFromMatches(selectedLeague);
        setClubs(data);
        
        // Validation: If initial club doesn't exist in new clubs, reset it
        if (selectedClub && !data.includes(selectedClub)) {
          setSelectedClub("");
        }
      } catch (err) {
        // Error logged in service
      } finally {
        setLoading(prev => ({ ...prev, clubs: false }));
      }
    };

    loadClubs();
  }, [selectedLeague, service]);

  // 4. Propagate changes back to parent
  useEffect(() => {
    const configKey = `${selectedSport}-${selectedLeague}-${selectedClub}`;
    if (lastNotifiedRef.current === configKey) return;

    lastNotifiedRef.current = configKey;
    onConfigurationChange({
      sport: selectedSport,
      league: selectedLeague,
      club: selectedClub
    });
  }, [selectedSport, selectedLeague, selectedClub, onConfigurationChange]);

  // ─── Handlers ───

  const handleSportChange = (val: string) => {
    setSelectedSport(val);
    setSelectedLeague(""); // Hierarchical Reset
    setSelectedClub("");
    setLeagues([]);
    setClubs([]);
  };

  const handleLeagueChange = (val: string) => {
    setSelectedLeague(val);
    setSelectedClub(""); // Hierarchical Reset
    setClubs([]);
  };

  // ─── UI Helpers ───

  const renderLoader = () => (
    <Loader2 className="h-4 w-4 animate-spin text-white/70 ml-auto" />
  );

  // Stage completion indicators
  const isStage1Complete = !!selectedSport;
  const isStage2Complete = !!selectedLeague;
  const isStage3Complete = !!selectedClub;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="mb-8 space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
          Konfigurasi Olahraga
        </h2>
        <p className="text-sm text-slate-600">Pilih olahraga, liga, dan klub utama Anda</p>
        
        {/* Progress Bar */}
        <div className="flex gap-1 mt-4">
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${isStage1Complete ? 'bg-amber-500' : 'bg-slate-200'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${isStage2Complete ? 'bg-blue-500' : 'bg-slate-200'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${isStage3Complete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        </div>
      </div>

      {/* Form Cards Container */}
      <div className="space-y-4">
        
        {/* Tahap 1: Sport Selection */}
        <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
          isStage1Complete 
            ? 'border-amber-300 bg-gradient-to-br from-amber-50/80 to-orange-50/80 shadow-lg shadow-amber-200/30' 
            : 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-md'
        }`}>
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2.5 text-slate-800 cursor-default">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <span>Tahap 1: Cabang Olahraga</span>
                {isStage1Complete && <CheckCircle2 className="h-4 w-4 text-amber-600 ml-auto" />}
              </Label>
              {loading.sports && renderLoader()}
            </div>

            <Select value={selectedSport} onValueChange={handleSportChange}>
              <SelectTrigger className={`w-full h-11 border-2 transition-all duration-200 rounded-lg font-medium ${
                isStage1Complete
                  ? 'border-amber-300 bg-white/80 text-amber-900'
                  : 'border-slate-200 bg-white hover:border-amber-300 focus:border-amber-500'
              } focus:ring-0 focus:ring-offset-0 shadow-sm hover:shadow-md`}>
                <SelectValue placeholder={loading.sports ? "Memuat Olahraga..." : "Pilih Cabang Olahraga..."} />
              </SelectTrigger>
              <SelectContent className="border-slate-200 shadow-xl">
                {sports.map((sport) => (
                  <SelectItem key={sport.slug} value={sport.slug} className="font-medium cursor-pointer">
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Connector Arrow */}
        {isStage1Complete && (
          <div className="flex justify-center -my-2 relative z-10">
            <div className="p-2 rounded-full bg-gradient-to-r from-amber-500 to-blue-500 shadow-lg animate-bounce">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {/* Tahap 2: League Selection */}
        <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
          isStage2Complete 
            ? 'border-blue-300 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 shadow-lg shadow-blue-200/30' 
            : selectedSport
            ? 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
            : 'border-slate-100 bg-slate-50/50'
        }`}>
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-500" />
          
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className={`text-sm font-bold flex items-center gap-2.5 cursor-default transition-opacity ${
                selectedSport ? 'text-slate-800 opacity-100' : 'text-slate-400 opacity-60'
              }`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  isStage2Complete
                    ? 'bg-gradient-to-br from-blue-400 to-cyan-500'
                    : selectedSport
                    ? 'bg-gradient-to-br from-blue-300 to-cyan-400'
                    : 'bg-slate-200'
                }`}>
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span>Tahap 2: Pilih Liga</span>
                {isStage2Complete && <CheckCircle2 className="h-4 w-4 text-blue-600 ml-auto" />}
              </Label>
              {loading.leagues && renderLoader()}
            </div>

            <Select 
              value={selectedLeague} 
              onValueChange={handleLeagueChange}
              disabled={!selectedSport || loading.leagues}
            >
              <SelectTrigger className={`w-full h-11 border-2 transition-all duration-200 rounded-lg font-medium ${
                isStage2Complete
                  ? 'border-blue-300 bg-white/80 text-blue-900'
                  : selectedSport
                  ? 'border-slate-200 bg-white hover:border-blue-300 focus:border-blue-500'
                  : 'border-slate-100 bg-slate-50 cursor-not-allowed'
              } focus:ring-0 focus:ring-offset-0 shadow-sm hover:shadow-md disabled:hover:shadow-none disabled:opacity-60`}>
                <SelectValue placeholder={
                  !selectedSport ? "Pilih olahraga dulu..." : 
                  loading.leagues ? "Memuat Liga..." : 
                  leagues.length === 0 ? "Tidak ada liga tersedia" : 
                  "Pilih Liga..."
                } />
              </SelectTrigger>
              <SelectContent className="border-slate-200 shadow-xl">
                {leagues.map((league) => (
                  <SelectItem key={league.id} value={league.id.toString()} className="font-medium cursor-pointer">
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Connector Arrow */}
        {isStage2Complete && (
          <div className="flex justify-center -my-2 relative z-10">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 shadow-lg animate-bounce" style={{ animationDelay: '0.1s' }}>
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {/* Tahap 3: Club Selection */}
        <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
          isStage3Complete 
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 shadow-lg shadow-emerald-200/30' 
            : selectedLeague
            ? 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md'
            : 'border-slate-100 bg-slate-50/50'
        }`}>
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className={`text-sm font-bold flex items-center gap-2.5 cursor-default transition-opacity ${
                selectedLeague ? 'text-slate-800 opacity-100' : 'text-slate-400 opacity-60'
              }`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  isStage3Complete
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                    : selectedLeague
                    ? 'bg-gradient-to-br from-emerald-300 to-teal-400'
                    : 'bg-slate-200'
                }`}>
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span>Tahap 3: Pilih Klub Utama</span>
                {isStage3Complete && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
              </Label>
              {loading.clubs && renderLoader()}
            </div>

            <Select 
              value={selectedClub} 
              onValueChange={setSelectedClub}
              disabled={!selectedLeague || loading.clubs}
            >
              <SelectTrigger className={`w-full h-11 border-2 transition-all duration-200 rounded-lg font-medium ${
                isStage3Complete
                  ? 'border-emerald-300 bg-white/80 text-emerald-900'
                  : selectedLeague
                  ? 'border-slate-200 bg-white hover:border-emerald-300 focus:border-emerald-500'
                  : 'border-slate-100 bg-slate-50 cursor-not-allowed'
              } focus:ring-0 focus:ring-offset-0 shadow-sm hover:shadow-md disabled:hover:shadow-none disabled:opacity-60`}>
                <SelectValue placeholder={
                  !selectedLeague ? "Pilih liga dulu..." : 
                  loading.clubs ? "Mencari Klub..." : 
                  clubs.length === 0 ? "Tidak ada klub ditemukan" : 
                  "Pilih Klub..."
                } />
              </SelectTrigger>
              <SelectContent className="border-slate-200 shadow-xl">
                {clubs.map((club) => (
                  <SelectItem key={club} value={club} className="font-medium cursor-pointer">
                    {club}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>

      {/* Completion Summary */}
      {isStage3Complete && (
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Konfigurasi Lengkap!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Semua tahap telah berhasil dikonfigurasi</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}