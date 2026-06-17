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
import { Loader2, Trophy, Shield, Users } from "lucide-react";

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
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Tahap 1: Sport Selection */}
      <div className="space-y-2.5">
        <Label className="text-sm font-bold flex items-center gap-2 text-slate-800">
          <Trophy className="h-4 w-4 text-amber-500" />
          Tahap 1: Cabang Olahraga
          {loading.sports && renderLoader()}
        </Label>
        <Select value={selectedSport} onValueChange={handleSportChange}>
          <SelectTrigger className="w-full h-11 bg-white border-slate-200 transition-all focus:ring-2 focus:ring-amber-500/20">
            <SelectValue placeholder={loading.sports ? "Memuat Olahraga..." : "Pilih Cabang Olahraga..."} />
          </SelectTrigger>
          <SelectContent>
            {sports.map((sport) => (
              <SelectItem key={sport.slug} value={sport.slug}>
                {sport.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tahap 2: League Selection */}
      <div className="space-y-2.5">
        <Label className="text-sm font-bold flex items-center gap-2 text-slate-800">
          <Shield className="h-4 w-4 text-blue-500" />
          Tahap 2: Pilih Liga
          {loading.leagues && renderLoader()}
        </Label>
        <Select 
          value={selectedLeague} 
          onValueChange={handleLeagueChange}
          disabled={!selectedSport || loading.leagues}
        >
          <SelectTrigger className="w-full h-11 bg-white border-slate-200 transition-all focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:opacity-70">
            <SelectValue placeholder={
              !selectedSport ? "Pilih olahraga dulu..." : 
              loading.leagues ? "Memuat Liga..." : 
              leagues.length === 0 ? "Tidak ada liga tersedia" : 
              "Pilih Liga..."
            } />
          </SelectTrigger>
          <SelectContent>
            {leagues.map((league) => (
              <SelectItem key={league.id} value={league.id.toString()}>
                {league.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tahap 3: Club Selection */}
      <div className="space-y-2.5">
        <Label className="text-sm font-bold flex items-center gap-2 text-slate-800">
          <Users className="h-4 w-4 text-emerald-500" />
          Tahap 3: Pilih Klub Utama
          {loading.clubs && renderLoader()}
        </Label>
        <Select 
          value={selectedClub} 
          onValueChange={setSelectedClub}
          disabled={!selectedLeague || loading.clubs}
        >
          <SelectTrigger className="w-full h-11 bg-white border-slate-200 transition-all focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:opacity-70">
            <SelectValue placeholder={
              !selectedLeague ? "Pilih liga dulu..." : 
              loading.clubs ? "Mencari Klub..." : 
              clubs.length === 0 ? "Tidak ada klub ditemukan" : 
              "Pilih Klub..."
            } />
          </SelectTrigger>
          <SelectContent>
            {clubs.map((club) => (
              <SelectItem key={club} value={club}>
                {club}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
