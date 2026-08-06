import { invoke } from "@tauri-apps/api/core";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowDownToLine, ArrowRight, BarChart3, Boxes, Check, ChevronDown,
  CircleHelp, Clock3, Download, ExternalLink, FolderOpen, Grid2X2,
  HardDrive, Home, Layers3, LoaderCircle, LogIn, Menu, MonitorUp, Package,
  PackageCheck, Palette, Play, RefreshCw, Search, Settings,
  SlidersHorizontal, UserRound, Wifi, WifiOff, X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type View = "home" | "discover" | "instances" | "account" | "settings";
type SortMode = "relevance" | "downloads" | "follows" | "newest" | "updated";
type ModrinthProject = {
  projectId: string; slug: string; title: string; description: string; author: string;
  iconUrl: string | null; downloads: number; categories: string[]; latestVersion: string | null;
  license: string; gallery: string[]; featuredGallery: string | null;
};
type ModrinthFile = { url: string; filename: string; primary: boolean; size: number };
type ModrinthVersion = {
  id: string; projectId: string; name: string; versionNumber: string; versionType: string;
  datePublished: string; downloads: number; gameVersions: string[]; loaders: string[]; files: ModrinthFile[];
};
type SearchResult = { hits: ModrinthProject[]; totalHits: number; offset: number; limit: number; elapsedMs: number };
type RuntimeStatus = { appVersion: string; platform: string; architecture: string; dataDirectory: string; microsoftClientConfigured: boolean };
type ProfileProject = { projectId: string; title: string; slug: string; versionId?: string; versionNumber?: string; filename?: string };
type ProfileManifest = { minecraftVersion: string; loader: string; projects: ProfileProject[] };
type InstanceSummary = { id: string; name: string; minecraftVersion: string; loader: string; versionId: string | null; installedAt: string | null; installed: boolean; modsCount: number; path: string };
type MicrosoftProfile = { id: string; name: string };
type AuthState = { status: "signedOut" | "waiting" | "signedIn" | "error"; profile: MicrosoftProfile | null; error: string | null };
type LaunchStage = "idle" | "profile" | "files" | "runtime" | "starting" | "ready";

const accents = ["#56dfc1", "#ff7549", "#8292ff", "#d5ef54", "#f1b94b"];
const PAGE_SIZE = 24;
const nav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "discover" as const, label: "Modrinth", icon: Grid2X2 },
  { id: "instances" as const, label: "Instanzen", icon: Boxes },
  { id: "account" as const, label: "Konto & Skin", icon: UserRound },
  { id: "settings" as const, label: "Einstellungen", icon: Settings },
];
const quickSearches = ["Freecam", "Performance", "Shader", "Minimap"];

function Logo({ small = false }: { small?: boolean }) {
  return <img className={`brand-logo ${small ? "small" : ""}`} src="/frostwalker-logo.svg" alt="" />;
}
function compactNumber(value: number) {
  return new Intl.NumberFormat("de-CH", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
function formattedDate(value: string) {
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function Sidebar({ view, setView, onHelp }: { view: View; setView: (view: View) => void; onHelp: () => void }) {
  return <aside className="sidebar">
    <button className="brand pressable" onClick={() => setView("home")}><Logo small /><span>FrostWalker</span></button>
    <nav aria-label="Hauptnavigation">
      <span className="nav-title">Launcher</span>
      {nav.map(({ id, label, icon: Icon }) => <button key={id} className={`pressable ${view === id ? "active" : ""}`} onClick={() => setView(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>)}
    </nav>
    <div className="side-bottom">
      <button className="pressable" onClick={onHelp}><CircleHelp size={18} /><span>Hilfe & Status</span></button>
      <div className="build-pill"><span /> Native Alpha 0.3</div>
    </div>
  </aside>;
}

function App() {
  const [view, setView] = useState<View>("home");
  const [accent, setAccent] = useState(() => localStorage.getItem("frostwalker-accent") || accents[0]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("downloads");
  const [projects, setProjects] = useState<ModrinthProject[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [profile, setProfile] = useState<ProfileManifest | null>(null);
  const [instances, setInstances] = useState<InstanceSummary[]>([]);
  const [auth, setAuth] = useState<AuthState>({ status: "signedOut", profile: null, error: null });
  const [borderless, setBorderless] = useState(() => localStorage.getItem("frostwalker-borderless") !== "false");
  const [profileMode, setProfileMode] = useState(() => localStorage.getItem("frostwalker-profile") || "Balanced");
  const [showPalette, setShowPalette] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [popularOnly, setPopularOnly] = useState(false);
  const [openSourceOnly, setOpenSourceOnly] = useState(false);
  const [toast, setToast] = useState("");
  const [launchStage, setLaunchStage] = useState<LaunchStage>("idle");
  const [skinDraft, setSkinDraft] = useState("MHF_Alex");
  const [statsRange, setStatsRange] = useState("30d");
  const [selectedProject, setSelectedProject] = useState<ModrinthProject | null>(null);
  const [versions, setVersions] = useState<ModrinthVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [installingVersion, setInstallingVersion] = useState("");
  const [preparing, setPreparing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const refreshInstances = useCallback(async () => {
    try { setInstances(await invoke<InstanceSummary[]>("list_instances")); }
    catch (reason) { setError(String(reason)); }
  }, []);

  const searchProjects = useCallback(async (term: string, nextOffset = 0, append = false, nextSort = sort) => {
    const request = ++requestRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    if (!append) setError("");
    try {
      const result = await invoke<SearchResult>("search_modrinth", { query: term, limit: PAGE_SIZE, offset: nextOffset, index: nextSort });
      if (request !== requestRef.current) return;
      setProjects((current) => append ? [...current, ...result.hits.filter((hit) => !current.some((item) => item.projectId === hit.projectId))] : result.hits);
      setTotalHits(result.totalHits); setLatency(result.elapsedMs);
    } catch (reason) { if (request === requestRef.current) setError(String(reason)); }
    finally { if (request === requestRef.current) { setLoading(false); setLoadingMore(false); } }
  }, [sort]);

  useEffect(() => {
    Promise.all([
      invoke<RuntimeStatus>("runtime_status"), invoke<ProfileManifest>("get_profile"),
      invoke<InstanceSummary[]>("list_instances"), invoke<AuthState>("restore_microsoft_account"),
    ]).then(([status, savedProfile, savedInstances, savedAuth]) => {
      setRuntime(status); setProfile(savedProfile); setInstances(savedInstances); setAuth(savedAuth);
    }).catch((reason) => setError(String(reason)));
    searchProjects("", 0, false, "downloads");
  }, []);

  useEffect(() => {
    if (view !== "discover") return;
    const timeout = window.setTimeout(() => searchProjects(query, 0, false, sort), 260);
    return () => window.clearTimeout(timeout);
  }, [query, sort, view]);

  useEffect(() => {
    if (view !== "discover" || !loadMoreRef.current || !scrollRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading && !loadingMore && projects.length < totalHits) searchProjects(query, projects.length, true, sort);
    }, { root: scrollRef.current, rootMargin: "700px 0px" });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [view, loading, loadingMore, projects.length, totalHits, query, sort, searchProjects]);

  useEffect(() => {
    if (auth.status !== "waiting") return;
    const interval = window.setInterval(async () => {
      const next = await invoke<AuthState>("microsoft_login_status");
      setAuth(next);
      if (next.status === "signedIn") notify(`Willkommen, ${next.profile?.name}`);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [auth.status, notify]);

  useEffect(() => { localStorage.setItem("frostwalker-accent", accent); }, [accent]);
  useEffect(() => { localStorage.setItem("frostwalker-borderless", String(borderless)); }, [borderless]);
  useEffect(() => { localStorage.setItem("frostwalker-profile", profileMode); }, [profileMode]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setShowMenu(false); setShowPalette(false); setShowFilters(false); setShowHelp(false); setSelectedProject(null); } };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, []);

  async function toggleProject(project: ModrinthProject) {
    const existing = profile?.projects.some((item) => item.projectId === project.projectId);
    try {
      const next = await invoke<ProfileManifest>(existing ? "remove_project_from_profile" : "add_project_to_profile", existing
        ? { projectId: project.projectId }
        : { projectId: project.projectId, title: project.title, slug: project.slug });
      setProfile(next); notify(existing ? `${project.title} entfernt` : `${project.title} vorgemerkt`); refreshInstances();
    } catch (reason) { setError(String(reason)); }
  }

  async function openProject(project: ModrinthProject) {
    setSelectedProject(project); setVersions([]); setVersionsLoading(true);
    try { setVersions(await invoke<ModrinthVersion[]>("list_project_versions", { projectId: project.projectId })); }
    catch (reason) { setError(String(reason)); }
    finally { setVersionsLoading(false); }
  }

  async function installVersion(project: ModrinthProject, version: ModrinthVersion) {
    setInstallingVersion(version.id);
    try {
      const next = await invoke<ProfileManifest>("install_project_version", { projectId: project.projectId, title: project.title, slug: project.slug, version });
      setProfile(next); notify(`${project.title} ${version.versionNumber} installiert`); refreshInstances();
    } catch (reason) { setError(String(reason)); }
    finally { setInstallingVersion(""); }
  }

  async function beginLogin() {
    try {
      const start = await invoke<{ loginUrl: string }>("begin_microsoft_login");
      setAuth({ status: "waiting", profile: null, error: null });
      await openUrl(start.loginUrl);
    } catch (reason) { setAuth({ status: "error", profile: null, error: String(reason) }); }
  }

  async function prepareInstance() {
    setPreparing(true); setError("");
    try {
      const prepared = await invoke<InstanceSummary>("prepare_instance");
      setInstances([prepared]); notify("Instanz ist startbereit");
    } catch (reason) { setError(String(reason)); }
    finally { setPreparing(false); }
  }

  async function startGame() {
    if (auth.status !== "signedIn") { setView("account"); notify("Verbinde zuerst dein Microsoft-Konto."); return; }
    setLaunchStage("profile"); setError("");
    const timers = [
      window.setTimeout(() => setLaunchStage("files"), 500),
      window.setTimeout(() => setLaunchStage("runtime"), 1200),
      window.setTimeout(() => setLaunchStage("starting"), 2200),
    ];
    try {
      const result = await invoke<{ pid: number; instancePath: string }>("launch_minecraft");
      setLaunchStage("ready"); notify(`Minecraft läuft · Prozess ${result.pid}`); refreshInstances();
      window.setTimeout(() => setLaunchStage("idle"), 1400);
    } catch (reason) { setLaunchStage("idle"); setError(String(reason)); notify("Start fehlgeschlagen – Details sind sichtbar."); }
    finally { timers.forEach(window.clearTimeout); }
  }

  const filteredProjects = useMemo(() => projects.filter((project) => {
    if (popularOnly && project.downloads < 100_000) return false;
    if (openSourceOnly && /all-rights-reserved|license-ref/i.test(project.license)) return false;
    return true;
  }), [projects, popularOnly, openSourceOnly]);
  const featured = useMemo(() => projects.slice(0, 3), [projects]);
  const skinName = auth.profile?.name || skinDraft || "MHF_Alex";
  const skinUrl = `https://render.crafty.gg/3d/full/${encodeURIComponent(skinName)}?width=520&height=620&x=-18&z=24&shadow=true`;
  const headUrl = `https://render.crafty.gg/3d/head/${encodeURIComponent(skinName)}`;
  const activeInstance = instances[0];

  return <div className="app" style={{ "--accent": accent } as React.CSSProperties}>
    <Sidebar view={view} setView={setView} onHelp={() => setShowHelp(true)} />
    <section className="app-body">
      <header className="topbar">
        <button className={`connection pressable ${error ? "offline" : ""}`} onClick={() => searchProjects(query, 0, false, sort)} title="Verbindung erneut prüfen">
          {error ? <WifiOff size={14} /> : <Wifi size={14} />}{error ? "Erneut verbinden" : latency === null ? "Verbinde…" : `Modrinth · ${latency} ms`}
        </button>
        <div className="top-actions">
          <div className="popover-anchor">
            <button className="icon-button pressable" aria-label="Akzentfarbe" onClick={() => { setShowPalette(!showPalette); setShowMenu(false); }}><Palette size={18} /></button>
            {showPalette && <div className="palette-popover surface-pop"><strong>Akzentfarbe</strong><div>{accents.map((color) => <button className="pressable" key={color} aria-label={color} onClick={() => { setAccent(color); setShowPalette(false); }} style={{ background: color }} />)}</div></div>}
          </div>
          <div className="popover-anchor">
            <button className="icon-button pressable" aria-label="Menü" onClick={() => { setShowMenu(!showMenu); setShowPalette(false); }}><Menu size={18} /></button>
            {showMenu && <div className="quick-menu surface-pop"><span>Direkt öffnen</span>{nav.map(({ id, label, icon: Icon }) => <button className="pressable" key={id} onClick={() => { setView(id); setShowMenu(false); }}><Icon size={16} />{label}<ArrowRight size={14} /></button>)}</div>}
          </div>
        </div>
      </header>

      <div className="view-scroll" ref={scrollRef} key={view}>
        {view === "home" && <main className="content home-view page-enter">
          <section className="page-head stagger"><div><span className="eyebrow">FrostWalker Desktop</span><h1>Bereit, wenn du es bist.</h1><p>Dein Minecraft. Schneller, ruhiger, persönlicher.</p></div><button className="account-chip pressable" onClick={() => setView("account")}><img src={headUrl} onError={(event) => { event.currentTarget.src = "/default-alex-head.png"; }} alt="" /><span>{auth.profile?.name || "Microsoft verbinden"}</span></button></section>
          <section className="hero-grid stagger">
            <article className="play-card elevated"><div className="voxel-sky"><i /><i /><i /><i /></div><div className="rings"><i /><i /><i /></div><div className="play-copy"><span className="dark-pill"><span /> {activeInstance?.installed ? "Startbereit" : "Einrichtung nötig"}</span><h2>Spielen ohne<br />Wartezeit.</h2><p>Fabric {profile?.minecraftVersion} · {profile?.projects.length || 0} Mods</p><div><button className="primary-button pressable" onClick={startGame}><Play size={17} fill="currentColor" /> Minecraft starten</button><button className="round-button pressable" onClick={() => setView("instances")} aria-label="Instanzen"><Boxes size={18} /></button></div></div><div className="skin-stage"><div className="skin-shadow" /><img src={skinUrl} onError={(event) => { event.currentTarget.src = "/default-alex.png"; }} alt={`${skinName} Minecraft-Skin`} /></div></article>
            <aside className="status-card elevated"><div className="card-title"><div><span className="eyebrow">Dein Schnellstart</span><h3>Was noch fehlt.</h3></div><Zap size={19} /></div><div className="readiness"><div className={`readiness-ring ${activeInstance?.installed && auth.status === "signedIn" ? "complete" : ""}`}><strong>{Number(Boolean(activeInstance?.installed)) + Number(auth.status === "signedIn")}</strong><span>/ 2</span></div><div><strong>{activeInstance?.installed && auth.status === "signedIn" ? "Alles startbereit" : "Fast geschafft"}</strong><small>FrostWalker führt dich durch den Rest.</small></div></div><div className="status-lines"><button className="pressable" onClick={() => setView("instances")}><span><PackageCheck size={16} /></span><p><strong>{activeInstance?.installed ? "Instanz bereit" : "Minecraft installieren"}</strong><small>{activeInstance?.installed ? `${activeInstance.modsCount} Mods im Ordner` : "Einmalig Dateien vorbereiten"}</small></p>{activeInstance?.installed ? <Check size={15} /> : <ArrowRight size={15} />}</button><button className="pressable" onClick={() => setView("account")}><span><UserRound size={16} /></span><p><strong>{auth.status === "signedIn" ? auth.profile?.name : "Microsoft verbinden"}</strong><small>{auth.status === "signedIn" ? "Konto ist spielbereit" : "Für Lizenz und deinen Skin"}</small></p>{auth.status === "signedIn" ? <Check size={15} /> : <ArrowRight size={15} />}</button></div></aside>
          </section>
          <section className="section-head stagger"><div><span className="eyebrow">Live von Modrinth</span><h2>Für dein Profil.</h2></div><button className="text-button pressable" onClick={() => setView("discover")}>Alle entdecken <ArrowRight size={16} /></button></section>
          <section className="featured-grid stagger">{featured.map((project) => <button key={project.projectId} className="featured-card pressable elevated" onClick={() => { setSelectedProject(project); setView("discover"); openProject(project); }}>{project.featuredGallery && <img className="featured-banner" src={project.featuredGallery} alt="" />}<ProjectIcon project={project} /><span><strong>{project.title}</strong><small>{compactNumber(project.downloads)} Downloads</small></span><ArrowRight size={17} /></button>)}</section>
        </main>}

        {view === "discover" && <main className="content discover-view page-enter">
          <section className="page-head stagger"><div><span className="eyebrow">Modrinth · Live & vorgeladen</span><h1>Deine Welt, deine Regeln.</h1><p>Tippen genügt – FrostWalker sucht automatisch.</p></div><button className="compat-pill pressable" onClick={() => setShowFilters(true)}><SlidersHorizontal size={16} /> Smart Filter</button></section>
          <div className="search-row stagger"><label className="search elevated"><Search size={20} /><input aria-label="Modrinth durchsuchen" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Freecam, Sodium, Shader …" />{loading && <LoaderCircle className="spin" size={17} />}{query && !loading && <button className="pressable clear-search" onClick={() => setQuery("")} aria-label="Suche leeren"><X size={15} /></button>}</label><label className="sort-select elevated"><span>Sortierung</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="relevance">Relevanz</option><option value="downloads">Downloads</option><option value="follows">Follower</option><option value="updated">Zuletzt aktualisiert</option><option value="newest">Neueste</option></select><ChevronDown size={16} /></label></div>
          <div className="quick-searches stagger">{quickSearches.map((item) => <button key={item} className={`pressable ${query.toLowerCase() === item.toLowerCase() ? "active" : ""}`} onClick={() => setQuery(item)}>{item}</button>)}</div>
          <div className="results-meta stagger"><span>{loading ? "Suche läuft…" : `${filteredProjects.length} geladen · ${totalHits.toLocaleString("de-CH")} Treffer`}</span><span>{popularOnly && "Beliebt · "}{openSourceOnly && "Open Source · "}{sort === "downloads" ? "meistgeladen" : sort}</span></div>
          {error && <ErrorCard error={error} retry={() => searchProjects(query, 0, false, sort)} />}
          <section className="project-grid stagger">{filteredProjects.map((project) => <article className="project-card elevated" key={project.projectId}><ProjectBanner project={project} onOpen={() => openProject(project)} /><div className="project-top"><ProjectIcon project={project} /><button className={`add-button pressable ${profile?.projects.some((item) => item.projectId === project.projectId) ? "added" : ""}`} onClick={() => toggleProject(project)}>{profile?.projects.some((item) => item.projectId === project.projectId) ? <Check size={15} /> : <ArrowDownToLine size={15} />}</button></div><button className="project-copy pressable" onClick={() => openProject(project)}><h3>{project.title}</h3><p>{project.description || "Ein Modrinth-Projekt für dein persönliches FrostWalker-Profil."}</p></button><div className="project-meta"><span><Download size={13} /> {compactNumber(project.downloads)}</span><span>{project.license}</span><button className="pressable" onClick={() => openProject(project)}>Versionen <ArrowRight size={13} /></button></div></article>)}</section>
          {!loading && filteredProjects.length === 0 && <div className="empty-state"><Layers3 size={28} /><h3>Keine Treffer mit diesen Filtern</h3><button className="pressable" onClick={() => { setPopularOnly(false); setOpenSourceOnly(false); }}>Filter zurücksetzen</button></div>}
          <div className="load-more" ref={loadMoreRef}>{loadingMore ? <><LoaderCircle className="spin" size={18} /> Weitere Projekte werden vorgeladen</> : projects.length < totalHits ? "Beim Scrollen lädt FrostWalker automatisch weiter" : projects.length > 0 ? "Alles geladen" : ""}</div>
        </main>}

        {view === "instances" && <main className="content instances-view page-enter">
          <section className="page-head stagger"><div><span className="eyebrow">Dein Spielprofil</span><h1>Eine Instanz. Alles drin.</h1><p>FrostWalker hält Minecraft, Fabric und deine Mods gemeinsam an einem klaren Ort.</p></div><button className="primary-button pressable" onClick={prepareInstance} disabled={preparing}>{preparing ? <LoaderCircle className="spin" size={17} /> : activeInstance?.installed ? <RefreshCw size={17} /> : <Download size={17} />}{activeInstance?.installed ? "Installation prüfen" : "Minecraft vorbereiten"}</button></section>
          {error && <ErrorCard error={error} retry={prepareInstance} />}
          <section className="instance-grid stagger">{instances.map((instance) => <article className="instance-card elevated" key={instance.id}><div className="instance-art"><div className="block-stack"><i /><i /><i /></div><Logo small /></div><div className="instance-copy"><span className={`state-pill ${instance.installed ? "ready" : ""}`}><i />{instance.installed ? "Startbereit" : "Nicht installiert"}</span><h2>{instance.name}</h2><p>{instance.loader} · Minecraft {instance.minecraftVersion}</p><div className="instance-stats"><span><Package size={16} /><strong>{instance.modsCount}</strong><small>Mods</small></span><span><HardDrive size={16} /><strong>{instance.versionId ? "Lokal" : "—"}</strong><small>Dateien</small></span><span><Clock3 size={16} /><strong>{instance.installedAt ? formattedDate(instance.installedAt) : "Noch nie"}</strong><small>Installiert</small></span></div><div className="instance-actions"><button className="primary-button pressable" onClick={startGame}><Play size={16} /> Starten</button><button className="secondary-button pressable" onClick={() => openPath(instance.path)}><FolderOpen size={16} /> Ordner öffnen</button><button className="icon-button pressable" aria-label="Instanz prüfen" onClick={prepareInstance}><RefreshCw size={16} /></button></div></div></article>)}</section>
          <section className="downloaded-list elevated stagger"><div className="card-title"><div><span className="eyebrow">Installierte Inhalte</span><h3>Mods & Versionen</h3></div><span>{profile?.projects.filter((item) => item.filename).length || 0} lokal</span></div>{profile?.projects.length ? profile.projects.map((item) => <div className="downloaded-row" key={item.projectId}><span className="mini-cube"><Package size={15} /></span><p><strong>{item.title}</strong><small>{item.filename || "Vorgemerkt – Version noch auswählen"}</small></p><span>{item.versionNumber || "—"}</span><button className="icon-button pressable" aria-label={`${item.title} auf Modrinth öffnen`} onClick={() => openUrl(`https://modrinth.com/mod/${item.slug}`)}><ExternalLink size={15} /></button></div>) : <div className="empty-inline">Noch keine Mods installiert. Entdecke dein erstes Projekt auf Modrinth.</div>}</section>
        </main>}

        {view === "account" && <main className="content account-view page-enter">
          <section className="page-head stagger"><div><span className="eyebrow">Microsoft & Skin</span><h1>{auth.profile?.name || "Das bist du."}</h1><p>Dein offizielles Minecraft-Konto und dein Spieler in 3D.</p></div>{auth.status === "signedIn" ? <button className="account-chip pressable" onClick={async () => setAuth(await invoke<AuthState>("logout_microsoft"))}><img src={headUrl} alt="" /><span>Abmelden</span></button> : <button className="primary-button pressable" onClick={beginLogin} disabled={!runtime?.microsoftClientConfigured || auth.status === "waiting"}>{auth.status === "waiting" ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}{auth.status === "waiting" ? "Browser-Anmeldung läuft" : "Mit Microsoft anmelden"}</button>}</section>
          {auth.error && <ErrorCard error={auth.error} retry={beginLogin} />}
          <section className="skin-room stagger"><article className="skin-preview elevated" onPointerMove={(event) => { if (event.pointerType === "touch") return; const rect = event.currentTarget.getBoundingClientRect(); const x = ((event.clientX - rect.left) / rect.width - .5) * 12; const y = ((event.clientY - rect.top) / rect.height - .5) * -10; const model = event.currentTarget.querySelector<HTMLElement>(".skin-avatar-tilt"); if (model) model.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`; }} onPointerLeave={(event) => { const model = event.currentTarget.querySelector<HTMLElement>(".skin-avatar-tilt"); if (model) model.style.transform = "rotateX(0deg) rotateY(0deg)"; }}><div className="studio-light" /><div className="studio-lines" /><div className="studio-orbit" /><div className="skin-platform" /><i className="skin-cube one" /><i className="skin-cube two" /><i className="skin-cube three" /><div className="skin-avatar-tilt"><div className="skin-avatar-float"><img src={skinUrl} onError={(event) => { event.currentTarget.src = "/default-alex.png"; }} alt={`${skinName} in interaktivem 3D`} /></div></div><span className="render-tag"><span /> Interaktives 3D · Crafty</span><span className="skin-hint">Bewege den Cursor</span></article><article className="player-panel elevated"><img src={headUrl} onError={(event) => { event.currentTarget.src = "/default-alex-head.png"; }} alt="Spielerkopf" /><span className="eyebrow">Aktiver Spieler</span><h2>{skinName}</h2><p>{auth.status === "signedIn" ? "Minecraft-Konto verbunden. Dein echter Skin wird verwendet." : "Vorschau ohne Anmeldung. Verbinde Microsoft für deinen echten Skin."}</p>{auth.status !== "signedIn" && <form onSubmit={(event) => { event.preventDefault(); notify("Skin-Vorschau aktualisiert"); }}><input value={skinDraft} onChange={(event) => setSkinDraft(event.target.value)} aria-label="Minecraft-Spielername" /><button className="pressable" type="submit"><RefreshCw size={15} /></button></form>}<button className="secondary-button pressable" onClick={() => openUrl("https://www.minecraft.net/msaprofile/mygames/editskin")}><ExternalLink size={15} /> Skin bei Minecraft ändern</button></article><article className="activity-card elevated"><div className="card-title"><div><span className="eyebrow">Spielzeit</span><h3>Deine Aktivität</h3></div><BarChart3 size={19} /></div><div className="segment compact">{["7d", "30d", "90d"].map((range) => <button key={range} className={`pressable ${statsRange === range ? "active" : ""}`} onClick={() => setStatsRange(range)}>{range}</button>)}</div><div className="activity-total"><strong>{statsRange === "7d" ? "4.8" : statsRange === "30d" ? "18.4" : "51.2"} h</strong><span>lokal gespielt</span></div><div className="contribution-grid">{Array.from({ length: 70 }, (_, index) => <i key={index} style={{ opacity: .16 + ((index * 7) % 10) / 12 }} />)}</div></article></section>
        </main>}

        {view === "settings" && <main className="content settings-view page-enter"><section className="page-head stagger"><div><span className="eyebrow">Sofort anpassbar</span><h1>Dein FrostWalker.</h1><p>Jede Änderung wirkt live und bleibt auf diesem Gerät.</p></div></section><section className="settings-layout stagger"><article className="setting-card elevated"><div className="setting-heading"><span className="setting-icon"><Zap size={19} /></span><div><h3>Performance-Profil</h3><p>Passende Standardwerte für deinen Rechner.</p></div></div><div className="segment">{["Quiet", "Balanced", "Maximum"].map((mode) => <button key={mode} className={`pressable ${profileMode === mode ? "active" : ""}`} onClick={() => setProfileMode(mode)}>{mode}</button>)}</div></article><article className="setting-card elevated"><div className="setting-heading"><span className="setting-icon"><MonitorUp size={19} /></span><div><h3>Schnelles Alt-Tab</h3><p>Borderless Fullscreen für neue Instanzen.</p></div></div><button className={`toggle pressable ${borderless ? "on" : ""}`} onClick={() => setBorderless(!borderless)} aria-label="Borderless Fullscreen"><i /></button></article><article className="setting-card elevated"><div className="setting-heading"><span className="setting-icon"><Palette size={19} /></span><div><h3>Akzentfarbe</h3><p>Dein Stil, ohne die Oberfläche zu überladen.</p></div></div><div className="color-row">{accents.map((color) => <button className={`pressable ${accent === color ? "active" : ""}`} key={color} onClick={() => setAccent(color)} style={{ background: color }} />)}</div></article><article className="setting-card system-card elevated"><div className="setting-heading"><span className="setting-icon"><HardDrive size={19} /></span><div><h3>Lokale Daten</h3><p>{runtime?.dataDirectory || "Datenordner wird ermittelt…"}</p></div></div><button className="secondary-button pressable" disabled={!runtime} onClick={() => runtime && openPath(runtime.dataDirectory)}><FolderOpen size={15} /> Im Finder öffnen</button></article></section></main>}
      </div>
    </section>

    {showFilters && <div className="scrim" onMouseDown={() => setShowFilters(false)}><aside className="filter-drawer elevated" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">Smart Filter</span><h2>Nur was passt.</h2></div><button className="icon-button pressable" onClick={() => setShowFilters(false)}><X size={18} /></button></div><label className="filter-option"><span><strong>Beliebte Projekte</strong><small>Mindestens 100.000 Downloads</small></span><input type="checkbox" checked={popularOnly} onChange={(event) => setPopularOnly(event.target.checked)} /></label><label className="filter-option"><span><strong>Open Source</strong><small>Proprietäre Lizenzen ausblenden</small></span><input type="checkbox" checked={openSourceOnly} onChange={(event) => setOpenSourceOnly(event.target.checked)} /></label><button className="primary-button pressable" onClick={() => setShowFilters(false)}>Filter anwenden <ArrowRight size={16} /></button></aside></div>}
    {selectedProject && <ProjectDrawer project={selectedProject} versions={versions} loading={versionsLoading} installing={installingVersion} installed={profile?.projects.find((item) => item.projectId === selectedProject.projectId)} onInstall={installVersion} onClose={() => setSelectedProject(null)} onOpen={() => openUrl(`https://modrinth.com/mod/${selectedProject.slug}`)} />}
    {showHelp && <div className="scrim center" onMouseDown={() => setShowHelp(false)}><section className="help-modal elevated" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button pressable" onClick={() => setShowHelp(false)}><X size={18} /></button><Logo /><span className="eyebrow">FrostWalker {runtime?.appVersion}</span><h2>Native Launcher Status</h2><div className="help-status"><p><Wifi size={16} /><span><strong>Modrinth API</strong><small>{latency ? `${latency} ms` : "wird geprüft"}</small></span></p><p><LogIn size={16} /><span><strong>Microsoft OAuth</strong><small>{auth.status === "signedIn" ? `Verbunden als ${auth.profile?.name}` : runtime?.microsoftClientConfigured ? "Bereit zur Anmeldung" : "Client-ID fehlt im Build"}</small></span></p><p><PackageCheck size={16} /><span><strong>Minecraft Core</strong><small>{activeInstance?.installed ? "Fabric-Instanz installiert" : "bereit zur Installation"}</small></span></p></div></section></div>}
    {launchStage !== "idle" && <LaunchOverlay stage={launchStage} skinUrl={skinUrl} onClose={() => setLaunchStage("idle")} />}
    {toast && <div className="toast"><Check size={16} /><span>{toast}</span></div>}
  </div>;
}

function ProjectDrawer({ project, versions, loading, installing, installed, onInstall, onClose, onOpen }: { project: ModrinthProject; versions: ModrinthVersion[]; loading: boolean; installing: string; installed?: ProfileProject; onInstall: (project: ModrinthProject, version: ModrinthVersion) => void; onClose: () => void; onOpen: () => void }) {
  const banner = project.featuredGallery || project.gallery[0];
  return <div className="scrim" onMouseDown={onClose}><aside className="project-drawer elevated" onMouseDown={(event) => event.stopPropagation()}>{banner ? <div className="drawer-banner"><img src={banner} alt="" /><button className="icon-button pressable" onClick={onClose}><X size={18} /></button></div> : <button className="drawer-close icon-button pressable" onClick={onClose}><X size={18} /></button>}<div className="project-drawer-head"><ProjectIcon project={project} /><div><span className="eyebrow">von {project.author}</span><h2>{project.title}</h2><p>{project.description}</p></div></div><div className="drawer-stats"><span><Download size={15} /> {compactNumber(project.downloads)}</span><span>{project.license}</span><button className="pressable" onClick={onOpen}>Modrinth <ExternalLink size={13} /></button></div><div className="versions-head"><div><span className="eyebrow">Fabric · Minecraft 1.21.11</span><h3>Verfügbare Versionen</h3></div>{installed?.versionNumber && <span className="installed-version"><Check size={13} /> {installed.versionNumber}</span>}</div><div className="version-list">{loading ? <div className="version-loading"><LoaderCircle className="spin" /> Versionen werden geladen</div> : versions.length ? versions.slice(0, 12).map((version) => <div className="version-row" key={version.id}><span className={`release-dot ${version.versionType}`} /><p><strong>{version.versionNumber}</strong><small>{formattedDate(version.datePublished)} · {compactNumber(version.downloads)} Downloads</small></p><span>{version.versionType}</span><button className={`pressable ${installed?.versionId === version.id ? "installed" : ""}`} disabled={Boolean(installing) || installed?.versionId === version.id} onClick={() => onInstall(project, version)}>{installing === version.id ? <LoaderCircle className="spin" size={15} /> : installed?.versionId === version.id ? <Check size={15} /> : <Download size={15} />}{installed?.versionId === version.id ? "Installiert" : "Installieren"}</button></div>) : <div className="empty-inline">Keine kompatible Fabric-Version gefunden.</div>}</div></aside></div>;
}

function LaunchOverlay({ stage, skinUrl, onClose }: { stage: LaunchStage; skinUrl: string; onClose: () => void }) {
  const stages = [{ id: "profile", label: "Profil prüfen" }, { id: "files", label: "Spieldateien & Mods" }, { id: "runtime", label: "Java-Laufzeit" }, { id: "starting", label: "Minecraft-Prozess" }, { id: "ready", label: "Bereit" }];
  const index = stages.findIndex((item) => item.id === stage);
  return <div className="launch-overlay"><div className="launch-world"><i /><i /><i /><i /><i /></div><button className="launch-close pressable" aria-label="Start schließen" onClick={onClose}><X size={18} /></button><div className="launch-logo"><Logo /></div><div className="launch-character"><div className="launch-glow" /><img src={skinUrl} onError={(event) => { event.currentTarget.src = "/default-alex.png"; }} alt="Minecraft-Skin startet" /></div><section className="launch-panel elevated"><span className="eyebrow">Echter FrostWalker-Start</span><h2>{stage === "ready" ? "Deine Welt wartet." : "Minecraft wird vorbereitet."}</h2><div className="launch-steps">{stages.map((item, itemIndex) => <div key={item.id} className={`${itemIndex < index ? "done" : ""} ${itemIndex === index ? "current" : ""}`}><span>{itemIndex <= index ? <Check size={14} /> : itemIndex + 1}</span><strong>{item.label}</strong></div>)}</div><div className="launch-progress"><i style={{ width: `${((index + 1) / stages.length) * 100}%` }} /></div><p>{stage === "ready" ? "Minecraft läuft jetzt als eigener Prozess." : "Beim ersten Start werden offizielle Dateien einmalig geladen."}</p></section></div>;
}

function ErrorCard({ error, retry }: { error: string; retry: () => void }) {
  const needsMinecraftApproval = error.includes("Entwicklerprogramm") || error.includes("Invalid app registration");
  return <div className="error-card"><WifiOff size={18} /><span><strong>Das hat noch nicht geklappt</strong><small>{error}</small></span><div className="error-actions">{needsMinecraftApproval && <button className="pressable" onClick={() => openUrl("https://developer.microsoft.com/games/publish")}>Freigabe ansehen <ExternalLink size={13} /></button>}<button className="pressable" onClick={retry}>Erneut</button></div></div>;
}
function ProjectBanner({ project, onOpen }: { project: ModrinthProject; onOpen: () => void }) {
  const banner = project.featuredGallery || project.gallery[0];
  return <button className={`project-banner pressable ${banner ? "has-image" : "fallback"}`} onClick={onOpen} aria-label={`${project.title} öffnen`}>
    {banner ? <img src={banner} alt="" /> : <><span className="fallback-grid" /><Logo small /><span className="fallback-copy"><small>{project.categories[0] || "Fabric Mod"}</small><strong>{project.title.slice(0, 2).toUpperCase()}</strong></span><i /></>}
  </button>;
}
function ProjectIcon({ project }: { project: ModrinthProject }) {
  const [failed, setFailed] = useState(false);
  if (!project.iconUrl || failed) return <span className="project-icon fallback">{project.title.slice(0, 2).toUpperCase()}</span>;
  return <span className="project-icon"><img src={project.iconUrl} alt="" onError={() => setFailed(true)} /></span>;
}

export default App;
