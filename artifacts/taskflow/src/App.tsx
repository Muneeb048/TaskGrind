import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Redirect, Route, Switch, useLocation, useParams } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  getGetCurrentUserQueryKey, getGetDashboardSummaryQueryKey, getGetProjectQueryKey, getListProjectsQueryKey,
  getListTasksQueryKey, getListTeamsQueryKey, useCreateProject, useCreateTask, useCreateTeam,
  useDeleteProject, useDeleteTask, useGetCurrentUser, useGetDashboardSummary, useGetProject,
  useInviteTeamMember, useListProjects, useListTasks, useListTeams, useLogin, useLogout,
  useSignup, useUpdateProfile, useUpdateProject, useUpdateTask, useUpdateTeamMember,
} from '@workspace/api-client-react';
import type { Project, Task, TaskStatus } from '@workspace/api-client-react';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Clock3, FolderKanban, Inbox, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings, Sparkles, Target, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const colors = ['#E9A93A', '#3D8A77', '#D66E5E', '#5875A8', '#A67C52'];
const initials = (name = '') => name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const fmtDate = (date?: string | null) => date ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date)) : 'No date';
const errText = (error: unknown) => (error as { message?: string })?.message || 'Something went wrong. Please try again.';

function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} · TaskGrind`;
    const meta = document.querySelector('meta[name="description"]') ?? document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', description);
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [title, description]);
}

function Logo({ dark = false }: { dark?: boolean }) {
  return <Link href="/" className={`flex items-center gap-2.5 font-display text-xl tracking-tight ${dark ? 'text-white' : 'text-foreground'}`} data-testid="link-logo">
    <span className="relative grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground shadow-sm"><ArrowRight size={18} strokeWidth={3} /></span>
    <span>Task<span className={dark ? 'text-accent' : 'text-secondary-foreground'}>Grind</span></span>
  </Link>;
}

function PublicHeader() {
  return <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6">
    <Logo />
    <nav className="order-3 flex w-full items-center justify-center gap-5 text-xs text-muted-foreground sm:gap-8 sm:text-sm md:order-none md:w-auto" aria-label="Main navigation">
      <Link href="/method" className="transition-colors hover:text-foreground" data-testid="link-method">The method</Link>
      <Link href="/pricing" className="transition-colors hover:text-foreground" data-testid="link-pricing">Pricing</Link>
      <Link href="/why-taskflow" className="transition-colors hover:text-foreground" data-testid="link-about">Why TaskGrind</Link>
    </nav>
    <div className="flex items-center gap-2">
      <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" data-testid="link-login">Sign in</Link>
      <Link href="/signup" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" data-testid="link-signup">Start free</Link>
    </div>
  </header>;
}

function PublicFooter() {
  return <footer className="bg-sidebar px-6 py-12 text-sidebar-foreground">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
      <Logo dark />
      <div className="flex items-center gap-5 text-sm text-sidebar-foreground/60">
        <Link href="/method" className="hover:text-sidebar-foreground">The method</Link>
        <Link href="/pricing" className="hover:text-sidebar-foreground">Pricing</Link>
        <Link href="/why-taskflow" className="hover:text-sidebar-foreground">Why TaskGrind</Link>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/40">© 2026 TaskGrind</p>
    </div>
  </footer>;
}

function PublicPage({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  usePageMeta(title, description);
  return <div className="min-h-[100dvh] bg-background text-foreground"><PublicHeader />{children}<PublicFooter /></div>;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  if (isLoading) return <div className="min-h-[100dvh] grid place-items-center bg-background"><div className="h-8 w-8 animate-pulse rounded-full bg-accent" /></div>;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function ProfileMenu({ user, dark = false }: { user?: { name: string; email: string; avatar?: string | null }; dark?: boolean }) {
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [menuOpen]);
  const signOut = () => logout.mutate(undefined, { onSuccess: () => { queryClient.clear(); window.location.href = '/'; } });
  const goTo = (href: string) => { setMenuOpen(false); setLocation(href); };
  return <div ref={menuRef} className={`relative ${dark ? 'w-full' : ''}`}>
      {dark ? <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-3 text-left outline-none transition-colors hover:bg-sidebar-accent/80 focus-visible:ring-2 focus-visible:ring-accent" aria-expanded={menuOpen} data-testid="button-sidebar-profile">
        <Avatar className="size-9 border border-sidebar-border"><AvatarImage src={user?.avatar ?? undefined} /><AvatarFallback className="bg-accent text-accent-foreground">{initials(user?.name)}</AvatarFallback></Avatar>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold" data-testid="text-sidebar-user">{user?.name}</span><span className="block truncate text-xs text-sidebar-foreground/60">{user?.email}</span></span>
        <ChevronDown className="size-4 text-sidebar-foreground/60" />
      </button> : <Button variant="ghost" size="icon" onClick={() => setMenuOpen((open) => !open)} className="rounded-full" aria-label="Open profile menu" aria-expanded={menuOpen} data-testid="button-navbar-profile">
        <Avatar className="size-8"><AvatarImage src={user?.avatar ?? undefined} /><AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{initials(user?.name)}</AvatarFallback></Avatar>
      </Button>}
      {menuOpen && <div role="menu" className={`absolute z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg ${dark ? 'left-0' : 'right-0'}`} data-testid="profile-menu">
        <div className="px-3 py-2.5"><p className="text-sm font-semibold">{user?.name || 'Your profile'}</p><p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p></div>
        <div className="my-1 h-px bg-muted" />
        <button type="button" role="menuitem" onClick={() => goTo('/settings')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted" data-testid="menu-profile-settings"><Settings size={16} /> Profile & settings</button>
        <button type="button" role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10" data-testid="menu-profile-signout"><LogOut size={16} /> Sign out</button>
      </div>}
    </div>;
}

function SearchDialog({ open, onOpenChange, projects }: { open: boolean; onOpenChange: (open: boolean) => void; projects: Project[] }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const quickLinks = [
    { label: 'Overview', description: 'See your workspace dashboard', href: '/dashboard' },
    { label: 'Teams', description: 'Manage people and permissions', href: '/teams' },
    { label: 'Settings', description: 'Update your profile and preferences', href: '/settings' },
  ];
  const normalized = query.trim().toLowerCase();
  const projectResults = projects.filter((project) => `${project.name} ${project.description || ''}`.toLowerCase().includes(normalized)).slice(0, 6);
  const quickResults = quickLinks.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  const go = (href: string) => { onOpenChange(false); setQuery(''); setLocation(href); };
  return <Dialog open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) setQuery(''); }}>
    <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
      <DialogHeader className="border-b border-border px-5 py-4">
        <DialogTitle className="flex items-center gap-2 font-display text-2xl"><Search size={19} className="text-secondary-foreground" /> Search workspace</DialogTitle>
      </DialogHeader>
      <div className="border-b border-border p-4"><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or workspace pages…" className="h-11 bg-muted/40" data-testid="input-global-search" /></div>
      <div className="max-h-[min(55vh,420px)] overflow-y-auto p-3">
        {quickResults.length > 0 && <div><p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Workspace</p>{quickResults.map((item) => <button key={item.href} type="button" onClick={() => go(item.href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted" data-testid={`search-result-${item.label.toLowerCase()}`}><span className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground"><LayoutDashboard size={15} /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span></button>)}</div>}
        {projectResults.length > 0 && <div className={quickResults.length > 0 ? 'mt-4' : ''}><p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Projects</p>{projectResults.map((project) => <button key={project.id} type="button" onClick={() => go(`/projects/${project.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted" data-testid={`search-result-project-${project.id}`}><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{project.name}</span><span className="block truncate text-xs text-muted-foreground">{project.description || `${project.taskCount} tasks in this project`}</span></span><ArrowRight size={15} className="ml-auto shrink-0 text-muted-foreground" /></button>)}</div>}
        {quickResults.length === 0 && projectResults.length === 0 && <div className="px-4 py-10 text-center"><Search size={22} className="mx-auto text-muted-foreground" /><p className="mt-3 font-semibold">No matches found</p><p className="mt-1 text-sm text-muted-foreground">Try a project name or a workspace page.</p></div>}
      </div>
    </DialogContent>
  </Dialog>;
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { data: projects = [] } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const [searchOpen, setSearchOpen] = useState(false);
  const nav = [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { href: '/teams', label: 'Teams', icon: Users }, { href: '/settings', label: 'Settings', icon: Settings }];
  return <div className="grain flex min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform md:relative md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <Logo dark />
      <div className="mt-12"><ProfileMenu user={user} dark /></div>
      <nav className="mt-9 space-y-1">
        <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/45">Workspace</p>
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${location === href ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={17} />{label}</Link>)}
      </nav>
      <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4"><Sparkles size={17} className="text-accent" /><p className="mt-3 text-sm font-semibold">Your week, in focus.</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">A little progress every day adds up.</p></div>
    </aside>
    {open && <button className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu" data-testid="button-close-menu" />}
    <main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:px-9"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} data-testid="button-open-menu"><Menu size={20} /></Button><div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><span className="font-mono text-[11px] uppercase tracking-[.16em]">Workspace</span><span>/</span><span className="text-foreground">{location === '/dashboard' ? 'Overview' : location.replace('/', '').replace('-', ' ')}</span></div><div className="ml-auto flex items-center gap-2"><Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setSearchOpen(true)} aria-label="Search workspace" data-testid="button-search"><Search size={18} /></Button><ProfileMenu user={user} /></div></header><div className="mx-auto max-w-[1500px] p-5 md:p-9">{children}</div><SearchDialog open={searchOpen} onOpenChange={setSearchOpen} projects={projects} /></main>
  </div>;
}

function Landing() {
  usePageMeta('A calmer way to move', 'TaskGrind gives small teams a shared tempo — enough structure to keep moving, enough room to do your best work.');
  return <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground"><PublicHeader />
    <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 md:grid-cols-[1.05fr_.95fr] md:pb-32 md:pt-24"><div className="relative z-10 animate-drift-in"><p className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground"><span className="size-2 rounded-full bg-accent" /> A calmer way to move</p><h1 className="max-w-3xl font-display text-6xl leading-[.94] tracking-[-.05em] md:text-8xl">Good work<br /><span className="text-secondary-foreground">has a rhythm.</span></h1><p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground">TaskGrind gives small teams a shared tempo — enough structure to keep moving, enough room to do your best work.</p><div className="mt-10 flex flex-wrap gap-3"><Link href="/signup" className="group flex items-center gap-3 rounded-xl bg-accent px-5 py-3.5 font-semibold text-accent-foreground shadow-[4px_4px_0_hsl(var(--primary))] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_hsl(var(--primary))]" data-testid="link-hero-start">Make space for momentum <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link><Link href="/method" className="rounded-xl border border-border px-5 py-3.5 font-semibold hover:bg-muted" data-testid="link-hero-method">See how it works</Link></div><div className="mt-14 flex items-center gap-3 text-sm text-muted-foreground"><div className="flex -space-x-2"><span className="grid size-8 place-items-center rounded-full border-2 border-background bg-[#D66E5E] text-xs font-bold text-white">ML</span><span className="grid size-8 place-items-center rounded-full border-2 border-background bg-[#3D8A77] text-xs font-bold text-white">AK</span><span className="grid size-8 place-items-center rounded-full border-2 border-background bg-[#5875A8] text-xs font-bold text-white">JR</span></div><span>Built for teams who care how work feels.</span></div></div><div className="taskflow-grid relative min-h-[430px] rounded-[2rem] border border-border bg-card p-5 shadow-[12px_12px_0_hsl(var(--secondary))] animate-rise-in delay-2 md:min-h-[520px]"><div className="absolute -right-5 -top-5 grid size-20 rotate-12 place-items-center rounded-2xl bg-accent font-display text-2xl shadow-lg">→</div><div className="rounded-xl border border-border bg-background/90 p-4 shadow-lg backdrop-blur"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Monday / 09:42</p><p className="mt-1 font-display text-xl">Studio launch</p></div><MoreHorizontal size={18} className="text-muted-foreground" /></div><div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-secondary"><div className="h-full w-[68%] rounded-full bg-secondary-foreground" /></div><span className="font-mono text-xs">68%</span></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="font-mono text-[10px] uppercase tracking-wider">In motion</span><span className="size-2 rounded-full bg-accent" /></div><p className="mt-4 font-display text-4xl">12</p><p className="mt-1 text-xs text-muted-foreground">tasks this week</p></div><div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="font-mono text-[10px] uppercase tracking-wider">Clear wins</span><CheckCircle2 size={15} className="text-secondary-foreground" /></div><p className="mt-4 font-display text-4xl">08</p><p className="mt-1 text-xs text-muted-foreground">finished together</p></div></div><div className="absolute bottom-5 left-5 right-5 rounded-xl bg-sidebar p-4 text-sidebar-foreground shadow-xl"><p className="font-mono text-[10px] uppercase tracking-wider text-accent">A gentle nudge</p><p className="mt-2 text-sm">Three small wins are waiting in your board.</p></div></div></section>
    <section className="border-y border-border bg-secondary/30 px-6 py-24"><div className="mx-auto max-w-7xl"><p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">The TaskFlow method</p><div className="mt-8 grid gap-12 md:grid-cols-[.8fr_1.2fr]"><h2 className="max-w-lg font-display text-5xl leading-[.98] tracking-[-.04em] md:text-6xl">Clarity is a team sport.</h2><div className="grid gap-8 md:grid-cols-3"><div><span className="font-mono text-sm text-secondary-foreground">01</span><h3 className="mt-4 font-display text-2xl">See the whole</h3><p className="mt-3 leading-relaxed text-muted-foreground">One generous view of everything in motion, without the noise.</p></div><div><span className="font-mono text-sm text-secondary-foreground">02</span><h3 className="mt-4 font-display text-2xl">Choose the next</h3><p className="mt-3 leading-relaxed text-muted-foreground">Small, clear priorities keep the important work in front.</p></div><div><span className="font-mono text-sm text-secondary-foreground">03</span><h3 className="mt-4 font-display text-2xl">Move as one</h3><p className="mt-3 leading-relaxed text-muted-foreground">Everyone knows where to help, and when to celebrate.</p></div></div></div></div></section>
    <section className="mx-auto max-w-7xl px-6 py-24"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">Simple pricing</p><h2 className="mt-4 font-display text-5xl tracking-[-.04em]">Room to grow.</h2></div><p className="max-w-sm text-muted-foreground">Start with the essentials. Bring your whole crew when the time is right.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3"><Price name="Free" price="$0" copy="For small beginnings" features={['Unlimited tasks', '1 active project', 'Personal workspace']} /><Price name="Pro" price="$12" copy="For focused makers" accent features={['Unlimited projects', 'Team collaboration', 'Project insights']} /><Price name="Team" price="$24" copy="For teams in stride" features={['Everything in Pro', 'Unlimited teammates', 'Priority support']} /></div></section>
    <PublicFooter />
  </div>;
}
function Price({ name, price, copy, features, accent = false }: { name: string; price: string; copy: string; features: string[]; accent?: boolean }) { return <div className={`rounded-2xl border p-7 ${accent ? 'border-primary bg-primary text-primary-foreground shadow-[8px_8px_0_hsl(var(--accent))]' : 'border-border bg-card'}`}><div className="flex items-center justify-between"><h3 className="font-display text-2xl">{name}</h3>{accent && <Badge className="bg-accent text-accent-foreground">Most loved</Badge>}</div><p className={`mt-2 text-sm ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{copy}</p><p className="mt-8 font-display text-5xl">{price}<span className="font-sans text-sm font-normal opacity-60"> / month</span></p><ul className="mt-8 space-y-3 text-sm">{features.map((f) => <li key={f} className="flex items-center gap-2"><Check size={15} className="text-accent" /> {f}</li>)}</ul><Link href="/signup" className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold ${accent ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-secondary'}`} data-testid={`link-price-${name.toLowerCase()}`}>Choose {name}</Link></div>; }

function MethodPage() {
  return <PublicPage title="The method" description="See how TaskFlow turns scattered work into a calm, shared rhythm for small teams.">
    <main>
      <section className="border-b border-border bg-secondary/30 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">The TaskGrind method</p>
          <div className="mt-7 grid gap-10 md:grid-cols-[1fr_.8fr] md:items-end">
            <h1 className="max-w-4xl font-display text-6xl leading-[.95] tracking-[-.05em] md:text-8xl">Make progress<br /><span className="text-secondary-foreground">feel possible.</span></h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">TaskFlow is built around a simple idea: teams do their best work when the next step is visible, shared, and small enough to start.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['01', 'See the whole', 'Bring projects, tasks, and team context into one generous view. Less hunting means more attention for the work itself.'],
            ['02', 'Choose the next', 'Turn a big ambition into a short list of clear moves. Priorities stay visible without turning the day into a spreadsheet.'],
            ['03', 'Move as one', 'Give everyone the same rhythm: ownership is clear, handoffs are lighter, and finished work gets noticed.'],
          ].map(([number, title, copy]) => <Card key={number} className="border-border/70 bg-card shadow-none">
            <CardContent className="p-7">
              <span className="font-mono text-sm text-secondary-foreground">{number}</span>
              <h2 className="mt-12 font-display text-3xl tracking-[-.03em]">{title}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">{copy}</p>
            </CardContent>
          </Card>)}
        </div>
        <div className="mt-20 grid gap-10 rounded-[2rem] bg-sidebar p-8 text-sidebar-foreground md:grid-cols-[.8fr_1.2fr] md:p-12">
          <div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">A weekly rhythm</p><h2 className="mt-5 font-display text-4xl leading-tight">Enough structure to start. Enough space to think.</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Set the focus', 'Make the move', 'Mark the win'].map((label, index) => <div key={label} className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-5"><span className="font-mono text-xs text-accent">0{index + 1}</span><p className="mt-10 font-semibold">{label}</p><p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/60">{['Choose what matters this week.', 'Keep the next action easy to find.', 'Close the loop together.'][index]}</p></div>)}
          </div>
        </div>
        <div className="mt-20 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8"><p className="font-display text-2xl">Ready to find your rhythm?</p><Link href="/signup" className="group flex items-center gap-3 rounded-xl bg-accent px-5 py-3.5 font-semibold text-accent-foreground shadow-[4px_4px_0_hsl(var(--primary))]">Start free <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link></div>
      </section>
    </main>
  </PublicPage>;
}

function PricingPage() {
  return <PublicPage title="Pricing" description="Simple TaskFlow plans for small beginnings, focused makers, and teams in stride.">
    <main>
      <section className="border-b border-border px-6 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">Simple pricing</p>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-8">
            <h1 className="max-w-3xl font-display text-6xl leading-[.95] tracking-[-.05em] md:text-8xl">Room<br /><span className="text-secondary-foreground">to grow.</span></h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">Start with the essentials. Upgrade when your team needs more room, not more complexity.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-4 md:grid-cols-3">
          <Price name="Free" price="$0" copy="For small beginnings" features={['Unlimited tasks', '1 active project', 'Personal workspace']} />
          <Price name="Pro" price="$12" copy="For focused makers" accent features={['Unlimited projects', 'Team collaboration', 'Project insights']} />
          <Price name="Team" price="$24" copy="For teams in stride" features={['Everything in Pro', 'Unlimited teammates', 'Priority support']} />
        </div>
        <div className="mt-16 grid gap-4 border-y border-border py-10 text-sm md:grid-cols-3">
          <div><p className="font-semibold">No hidden surprises</p><p className="mt-2 leading-relaxed text-muted-foreground">Your plan is clear from day one. No setup fees, no long-term contract.</p></div>
          <div><p className="font-semibold">Start at your pace</p><p className="mt-2 leading-relaxed text-muted-foreground">Every plan starts with a free workspace so you can feel the difference before committing.</p></div>
          <div><p className="font-semibold">Built for momentum</p><p className="mt-2 leading-relaxed text-muted-foreground">Move up when your team needs more collaborators, projects, and support.</p></div>
        </div>
        <div className="mt-16 rounded-[2rem] bg-secondary/50 px-6 py-12 text-center md:px-12"><p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">Start with the essentials</p><h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl tracking-[-.04em] md:text-5xl">A calmer workspace is one click away.</h2><Link href="/signup" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground">Create your free workspace <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  </PublicPage>;
}

function WhyTaskFlowPage() {
  return <PublicPage title="Why TaskGrind" description="TaskGrind helps small teams stay clear, focused, and in motion without adding more noise.">
    <main>
      <section className="border-b border-border bg-sidebar px-6 py-20 text-sidebar-foreground md:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Why TaskGrind</p>
          <div className="mt-7 grid gap-10 md:grid-cols-[1fr_.8fr] md:items-end">
            <h1 className="max-w-4xl font-display text-6xl leading-[.95] tracking-[-.05em] md:text-8xl">Work better<br /><span className="text-accent">together.</span></h1>
            <p className="max-w-md text-lg leading-relaxed text-sidebar-foreground/65">The best project tool is the one your team actually wants to open. TaskGrind keeps the useful parts and leaves the noise behind.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2">
          <div><p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">Less overhead</p><h2 className="mt-5 font-display text-4xl leading-tight md:text-5xl">Your tool should make the work lighter.</h2><p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">TaskFlow gives your team a shared source of truth without forcing every idea into a workflow. Create a project, choose the next task, and keep moving.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Clear by default', 'A focused dashboard keeps the important work in view.'],
              ['Friendly to teams', 'Roles, invitations, and ownership make collaboration feel natural.'],
              ['Useful every day', 'Kanban boards turn planning into a visible, satisfying rhythm.'],
              ['Room for your style', 'A calm interface leaves space for your team’s way of working.'],
            ].map(([title, copy]) => <div key={title} className="rounded-2xl border border-border bg-card p-6"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Check size={17} /></span><h3 className="mt-7 font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></div>)}
          </div>
        </div>
        <div className="mt-20 border-y border-border py-12 md:py-16"><div className="grid gap-8 md:grid-cols-3"><div><p className="font-display text-5xl text-secondary-foreground">01</p><p className="mt-4 font-semibold">Small teams, first</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Made for the people doing the work, not just reporting on it.</p></div><div><p className="font-display text-5xl text-secondary-foreground">02</p><p className="mt-4 font-semibold">Progress you can feel</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A little momentum is easier to build when everyone can see it.</p></div><div><p className="font-display text-5xl text-secondary-foreground">03</p><p className="mt-4 font-semibold">Less noise, more signal</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">The right amount of structure helps good work stay good.</p></div></div></div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-accent p-8 text-accent-foreground md:p-12"><div><p className="font-mono text-xs uppercase tracking-[.2em]">A better workday starts here</p><h2 className="mt-4 font-display text-4xl tracking-[-.04em] md:text-5xl">Make room for momentum.</h2></div><Link href="/signup" className="group flex items-center gap-3 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground">Start free <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link></div>
      </section>
    </main>
  </PublicPage>;
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [, setLocation] = useLocation(); const { toast } = useToast(); const mutation = mode === 'login' ? useLogin() : useSignup(); const [form, setForm] = useState({ name: '', email: '', password: '' });
  const submit = (e: FormEvent): void => { e.preventDefault(); if (!form.email || !form.password || (mode === 'signup' && !form.name)) { toast({ title: 'A few details are missing', description: 'Fill out the fields to continue.' }); return; } mutation.mutate({ data: mode === 'login' ? { email: form.email, password: form.password } : form }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }); setLocation('/dashboard'); }, onError: (error) => toast({ title: 'Could not continue', description: errText(error), variant: 'destructive' }) }); };
  return <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[.95fr_1.05fr]"><div className="hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col"><Logo dark /><div className="mt-auto max-w-md"><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Make room for good work</p><h1 className="mt-5 font-display text-6xl leading-[.95] tracking-[-.04em]">A clear board<br />changes the day.</h1><p className="mt-6 text-lg leading-relaxed text-sidebar-foreground/65">TaskFlow is the shared space between a good idea and the moment it ships.</p></div><p className="mt-auto pt-24 font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/40">Small teams · Big momentum</p></div><div className="flex flex-col px-6 py-8 md:px-16"><div className="lg:hidden"><Logo /></div><div className="m-auto w-full max-w-md py-12"><p className="font-mono text-xs uppercase tracking-[.2em] text-secondary-foreground">{mode === 'login' ? 'Welcome back' : 'Start a new rhythm'}</p><h2 className="mt-4 font-display text-5xl tracking-[-.04em]">{mode === 'login' ? 'Good to see you.' : 'Let’s get moving.'}</h2><p className="mt-4 text-muted-foreground">{mode === 'login' ? 'Pick up exactly where you left off.' : 'Your team’s clearest workday starts here.'}</p><form className="mt-10 space-y-5" onSubmit={submit}>{mode === 'signup' && <Field label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Maya Lin" test="input-name" /> }<Field label="Email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@company.com" test="input-email" /><Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="8 characters minimum" test="input-password" /><Button className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending} data-testid="button-auth-submit">{mutation.isPending ? 'Opening your workspace…' : mode === 'login' ? 'Sign in' : 'Create workspace'} <ArrowRight size={17} /></Button></form><p className="mt-7 text-center text-sm text-muted-foreground">{mode === 'login' ? 'New to TaskFlow? ' : 'Already have a workspace? '}<Link href={mode === 'login' ? '/signup' : '/login'} className="font-semibold text-foreground underline underline-offset-4" data-testid="link-auth-switch">{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p></div></div></div>;
}
function Field({ label, value, onChange, placeholder, type = 'text', test }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; test: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 bg-card" data-testid={test} /></div>; }

function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-secondary-foreground">{eyebrow}</p><h1 className="mt-3 font-display text-4xl tracking-[-.04em] md:text-5xl">{title}</h1></div>{action}</div>; }
function Dashboard() {
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } }); const { data: summary, isLoading: sumLoading, isError: sumError } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } }); const { data: projects = [], isLoading: projectsLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } }); const [dialog, setDialog] = useState(false);
  const completed = summary?.completedTasks || 0; const total = summary?.totalTasks || 0; const progress = total ? Math.round(completed / total * 100) : 0;
  const statCards: { label: string; value: number; Icon: LucideIcon; sub: string }[] = [
    { label: 'Projects', value: summary?.totalProjects ?? 0, Icon: FolderKanban, sub: 'in your workspace' },
    { label: 'All tasks', value: total, Icon: Target, sub: 'across every project' },
    { label: 'In progress', value: summary?.inProgressTasks ?? 0, Icon: Clock3, sub: 'moving right now' },
    { label: 'Completed', value: completed, Icon: CheckCircle2, sub: `${progress}% of all tasks` },
  ];
  return <Shell><PageTitle eyebrow={`Good morning, ${user?.name?.split(' ')[0] || 'there'}`} title="Your workspace" action={<Button className="gap-2 bg-primary text-primary-foreground" onClick={() => setDialog(true)} data-testid="button-new-project"><Plus size={17} /> New project</Button>} /><div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(({ label, value, Icon, sub }, i) => <Card key={label} className="animate-rise-in border-border/70 bg-card shadow-none" style={{ animationDelay: `${i * 70}ms` }}><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><span className="rounded-lg bg-secondary p-2 text-secondary-foreground"><Icon size={16} /></span></div><p className="mt-7 font-display text-4xl" data-testid={`stat-${label.toLowerCase().replace(' ', '-')}`}>{sumLoading ? '—' : value}</p><p className="mt-1 text-xs text-muted-foreground">{sub}</p></CardContent></Card>)}</div><div className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><Card className="border-border/70 shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="font-display text-2xl">Projects in motion</CardTitle><p className="mt-1 text-sm text-muted-foreground">A pulse check across your work.</p></div><Link href="/dashboard" className="text-sm font-semibold text-secondary-foreground" data-testid="link-all-projects">View all</Link></CardHeader><CardContent className="space-y-2">{projectsLoading ? [1, 2, 3].map((x) => <div key={x} className="h-16 animate-pulse rounded-xl bg-muted" />) : projects.length ? projects.slice(0, 5).map((project) => <ProjectRow key={project.id} project={project} />) : <Empty title="No projects yet" copy="Start a project and give your team a place to begin." action={<Button onClick={() => setDialog(true)} data-testid="button-empty-project">Create first project</Button>} />}</CardContent></Card><Card className="border-border/70 shadow-none"><CardHeader><CardTitle className="font-display text-2xl">Recent tasks</CardTitle><p className="mt-1 text-sm text-muted-foreground">The latest little wins.</p></CardHeader><CardContent>{sumError ? <ErrorState /> : summary?.recentTasks?.length ? <div className="space-y-4">{summary.recentTasks.slice(0, 5).map((task) => <RecentTask key={task.id} task={task} />)}</div> : <Empty title="A blank slate" copy="Your next task is a good place to start." />}</CardContent></Card></div><ProjectDialog open={dialog} onOpenChange={setDialog} /></Shell>;
}
function ProjectRow({ project }: { project: Project }) { const percent = project.taskCount ? Math.round(project.completedTaskCount / project.taskCount * 100) : 0; return <Link href={`/projects/${project.id}`} className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/60" data-testid={`card-project-${project.id}`}><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{project.name}</p><span className="font-mono text-[10px] text-muted-foreground">{percent}%</span></div><div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-secondary-foreground transition-all" style={{ width: `${percent}%` }} /></div></div><ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>; }
function RecentTask({ task }: { task: Task }) { return <div className="flex items-start gap-3"><span className={`mt-1 size-2.5 rounded-full ${task.status === 'done' ? 'bg-secondary-foreground' : task.priority === 'high' ? 'bg-destructive' : 'bg-accent'}`} /><div className="min-w-0"><p className={`truncate text-sm font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{fmtDate(task.createdAt)} · {task.status.replace('_', ' ')}</p></div></div>; }
function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) { return <div className="flex flex-col items-center justify-center py-12 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Inbox size={20} /></span><p className="mt-4 font-display text-xl">{title}</p><p className="mt-2 max-w-xs text-sm text-muted-foreground">{copy}</p>{action && <div className="mt-5">{action}</div>}</div>; }
function ErrorState() { return <div className="py-10 text-center"><p className="font-semibold">Couldn’t load this view</p><p className="mt-1 text-sm text-muted-foreground">Try refreshing in a moment.</p></div>; }

function ProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) { const create = useCreateProject(); const { toast } = useToast(); const [form, setForm] = useState({ name: '', description: '', color: colors[0] }); const submit = () => { if (!form.name.trim()) return; create.mutate({ data: form }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); onOpenChange(false); setForm({ name: '', description: '', color: colors[0] }); toast({ title: 'Project created', description: 'A new space for good work.' }); }, onError: (e) => toast({ title: 'Could not create project', description: errText(e), variant: 'destructive' }) }); }; return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl">New project</DialogTitle></DialogHeader><div className="space-y-4 pt-3"><Field label="Project name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Website refresh" test="input-project-name" /><div className="space-y-2"><Label>What are you working toward?</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short note for the team…" data-testid="input-project-description" /></div><div className="space-y-2"><Label>Project color</Label><div className="flex gap-2">{colors.map((color) => <button key={color} type="button" className={`size-8 rounded-full border-2 ${form.color === color ? 'border-foreground ring-2 ring-accent ring-offset-2' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })} data-testid={`button-project-color-${color.slice(1)}`} />)}</div></div><Button className="w-full bg-primary text-primary-foreground" onClick={submit} disabled={create.isPending} data-testid="button-create-project">{create.isPending ? 'Creating…' : 'Create project'}</Button></div></DialogContent></Dialog>; }

function ProjectDetail() {
  const params = useParams<{ projectId: string }>(); const projectId = Number(params.projectId); const { data: project, isLoading: loadingProject } = useGetProject(projectId, { query: { queryKey: getGetProjectQueryKey(projectId) } }); const { data: tasks = [], isLoading: loadingTasks } = useListTasks(projectId, { query: { queryKey: getListTasksQueryKey(projectId) } }); const [taskDialog, setTaskDialog] = useState(false); const [selected, setSelected] = useState<Task | null>(null); const updateProject = useUpdateProject(); const deleteProject = useDeleteProject(); const { toast } = useToast(); const grouped = useMemo(() => ({ todo: tasks.filter((t) => t.status === 'todo'), in_progress: tasks.filter((t) => t.status === 'in_progress'), done: tasks.filter((t) => t.status === 'done') }), [tasks]); if (loadingProject) return <Shell><div className="h-40 animate-pulse rounded-2xl bg-muted" /></Shell>; if (!project) return <Shell><ErrorState /></Shell>; return <Shell><div className="flex flex-wrap items-start justify-between gap-5"><div><Link href="/dashboard" className="text-sm font-semibold text-secondary-foreground" data-testid="link-back-dashboard">← Back to overview</Link><div className="mt-5 flex items-center gap-3"><span className="size-4 rounded-full" style={{ backgroundColor: project.color }} /><h1 className="font-display text-4xl tracking-[-.04em]">{project.name}</h1></div><p className="mt-2 max-w-2xl text-muted-foreground">{project.description || 'A focused place for the team to make progress.'}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => updateProject.mutate({ projectId, data: { status: project.status === 'active' ? 'archived' : 'active' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) }) })} data-testid="button-toggle-archive">{project.status === 'active' ? 'Archive project' : 'Restore project'}</Button><Button className="gap-2 bg-primary text-primary-foreground" onClick={() => { setSelected(null); setTaskDialog(true); }} data-testid="button-new-task"><Plus size={17} /> Add task</Button></div></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Card className="border-border/70 shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Progress</p><p className="mt-2 font-display text-3xl">{project.taskCount ? Math.round(project.completedTaskCount / project.taskCount * 100) : 0}%</p><Progress className="mt-4 h-1.5" value={project.taskCount ? project.completedTaskCount / project.taskCount * 100 : 0} /></CardContent></Card><Card className="border-border/70 shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Tasks</p><p className="mt-2 font-display text-3xl">{project.taskCount}</p><p className="mt-1 text-xs text-muted-foreground">{project.completedTaskCount} completed</p></CardContent></Card><Card className="border-border/70 shadow-none"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Collaborators</p><p className="mt-2 font-display text-3xl">{project.memberCount}</p><p className="mt-1 text-xs text-muted-foreground">people on this project</p></CardContent></Card></div><div className="mt-10 grid gap-4 xl:grid-cols-3">{(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => <KanbanColumn key={status} status={status} tasks={grouped[status]} loading={loadingTasks} onAdd={() => { setSelected(null); setTaskDialog(true); }} onEdit={(task) => { setSelected(task); setTaskDialog(true); }} />)}</div><TaskDialog open={taskDialog} onOpenChange={setTaskDialog} projectId={projectId} task={selected} /></Shell>;
}
function KanbanColumn({ status, tasks, loading, onAdd, onEdit }: { status: TaskStatus; tasks: Task[]; loading: boolean; onAdd: () => void; onEdit: (task: Task) => void }) { const labels = { todo: 'To do', in_progress: 'In progress', done: 'Done' }; const dots = { todo: 'bg-muted-foreground', in_progress: 'bg-accent', done: 'bg-secondary-foreground' }; return <div className="min-h-80 rounded-2xl border border-border/70 bg-muted/35 p-3"><div className="flex items-center justify-between px-2 py-2"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${dots[status]}`} /><h2 className="font-semibold">{labels[status]}</h2><span className="font-mono text-[10px] text-muted-foreground">{tasks.length}</span></div><Button variant="ghost" size="icon" className="size-7" onClick={onAdd} data-testid={`button-add-${status}`}><Plus size={15} /></Button></div><div className="mt-2 space-y-2">{loading ? [1, 2].map((x) => <div key={x} className="h-28 animate-pulse rounded-xl bg-card" />) : tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} onClick={() => onEdit(task)} />) : <div className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">Nothing here yet</div>}</div></div>; }
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) { return <button onClick={onClick} className="group w-full rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-secondary-foreground/50 hover:shadow-md" data-testid={`card-task-${task.id}`}><div className="flex items-start justify-between gap-3"><p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p><MoreHorizontal size={16} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div>{task.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>}<div className="mt-4 flex items-center justify-between gap-2"><Badge variant="outline" className={`text-[10px] ${task.priority === 'high' ? 'border-destructive/50 text-destructive' : task.priority === 'medium' ? 'border-accent/70 text-foreground' : 'text-muted-foreground'}`}>{task.priority}</Badge>{task.dueDate && <span className="font-mono text-[10px] text-muted-foreground">{fmtDate(task.dueDate)}</span>}</div></button>; }
function TaskDialog({ open, onOpenChange, projectId, task }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: number; task: Task | null }) { const create = useCreateTask(); const update = useUpdateTask(); const remove = useDeleteTask(); const { toast } = useToast(); const [form, setForm] = useState({ title: '', description: '', status: 'todo' as TaskStatus, priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' }); useEffect(() => { setForm(task ? { title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate?.slice(0, 10) || '' } : { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' }); }, [task, open]); const save = () => { if (!form.title.trim()) return; const data = { ...form, dueDate: form.dueDate || null }; const options = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) }); queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) }); onOpenChange(false); toast({ title: task ? 'Task updated' : 'Task added', description: 'The board is up to date.' }); }, onError: (e: unknown) => toast({ title: 'Could not save task', description: errText(e), variant: 'destructive' }) }; if (task) update.mutate({ taskId: task.id, data }, options); else create.mutate({ projectId, data }, options); }; const removeTask = () => { if (!task) return; remove.mutate({ taskId: task.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) }); queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) }); onOpenChange(false); toast({ title: 'Task removed' }); } }); }; return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl">{task ? 'Edit task' : 'New task'}</DialogTitle></DialogHeader><div className="space-y-4 pt-3"><Field label="Task title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="What needs to happen?" test="input-task-title" /><div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add context for your team…" data-testid="input-task-description" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}><SelectTrigger data-testid="select-task-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todo">To do</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as 'low' | 'medium' | 'high' })}><SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div></div><div className="space-y-2"><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} data-testid="input-task-due-date" /></div><div className="flex gap-2">{task && <Button type="button" variant="outline" className="text-destructive" onClick={removeTask} data-testid="button-delete-task">Delete</Button>}<Button className="flex-1 bg-primary text-primary-foreground" onClick={save} disabled={create.isPending || update.isPending} data-testid="button-save-task">{create.isPending || update.isPending ? 'Saving…' : task ? 'Save changes' : 'Add task'}</Button></div></div></DialogContent></Dialog>; }

function Teams() { const { data: teams = [], isLoading } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } }); const create = useCreateTeam(); const invite = useInviteTeamMember(); const updateRole = useUpdateTeamMember(); const { toast } = useToast(); const [teamId, setTeamId] = useState<number | null>(null); const [teamName, setTeamName] = useState(''); const [inviteEmail, setInviteEmail] = useState(''); const team = teams.find((t) => t.id === teamId) || teams[0]; useEffect(() => { if (!teamId && teams[0]) setTeamId(teams[0].id); }, [teams, teamId]); const addTeam = () => { if (!teamName.trim()) return; create.mutate({ data: { name: teamName } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() }); setTeamName(''); toast({ title: 'Team created' }); } }); }; const sendInvite = () => { if (!team || !inviteEmail.trim()) return; invite.mutate({ teamId: team.id, data: { email: inviteEmail, role: 'member' } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() }); setInviteEmail(''); toast({ title: 'Invitation sent' }); } }); }; return <Shell><PageTitle eyebrow="People and permissions" title="Teams" action={<div className="flex gap-2"><Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="New team name" className="w-44 bg-card" data-testid="input-team-name" /><Button onClick={addTeam} className="gap-2 bg-primary text-primary-foreground" data-testid="button-create-team"><Plus size={17} /> Create</Button></div>} /><div className="mt-10 grid gap-6 lg:grid-cols-[.65fr_1.35fr]">{<Card className="border-border/70 shadow-none"><CardHeader><CardTitle className="font-display text-2xl">Your teams</CardTitle></CardHeader><CardContent>{isLoading ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : teams.length ? <div className="space-y-2">{teams.map((t) => <button key={t.id} onClick={() => setTeamId(t.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${team?.id === t.id ? 'bg-secondary' : 'hover:bg-muted'}`} data-testid={`button-team-${t.id}`}><span className="grid size-9 place-items-center rounded-lg bg-sidebar text-accent"><Users size={16} /></span><span className="flex-1"><span className="block font-semibold">{t.name}</span><span className="text-xs text-muted-foreground">{t.memberCount} members</span></span><ArrowRight size={15} className="text-muted-foreground" /></button>)}</div> : <Empty title="Build your crew" copy="Create a team to start inviting collaborators." />}</CardContent></Card>}<Card className="border-border/70 shadow-none">{team ? <><CardHeader><div className="flex flex-wrap items-center justify-between gap-4"><div><CardTitle className="font-display text-2xl">{team.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{team.memberCount} people, one shared direction.</p></div><div className="flex gap-2"><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@email.com" className="w-48 bg-card" data-testid="input-invite-email" /><Button onClick={sendInvite} className="gap-2 bg-accent text-accent-foreground" data-testid="button-invite-member"><Plus size={16} /> Invite</Button></div></div></CardHeader><CardContent><div className="space-y-1">{team.members.map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted"><Avatar className="size-9"><AvatarImage src={member.avatar} /><AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{initials(member.name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.name}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div><Badge variant="outline" className="hidden sm:inline-flex">{member.status}</Badge><Select value={member.role} onValueChange={(role) => updateRole.mutate({ teamId: team.id, userId: member.userId, data: { role: role as 'admin' | 'member' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() }) })}><SelectTrigger className="w-28" disabled={member.role === 'owner'} data-testid={`select-role-${member.userId}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent></Select></div>)}</div></CardContent></> : <Empty title="Choose a team" copy="Your team members will appear here." />}</Card></div></Shell>; }

function SettingsPage() { const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } }); const update = useUpdateProfile(); const { toast } = useToast(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); useEffect(() => { if (user) { setName(user.name); setEmail(user.email); } }, [user]); const save = () => update.mutate({ data: { name, email } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }); toast({ title: 'Profile saved', description: 'Your workspace knows you a little better.' }); }, onError: (e) => toast({ title: 'Could not save profile', description: errText(e), variant: 'destructive' }) }); return <Shell><PageTitle eyebrow="Your preferences" title="Settings" /><div className="mt-10 max-w-3xl space-y-6"><Card className="border-border/70 shadow-none"><CardHeader><CardTitle className="font-display text-2xl">Profile</CardTitle><p className="text-sm text-muted-foreground">How your name appears across TaskGrind.</p></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2 flex items-center gap-4"><Avatar className="size-16"><AvatarImage src={user?.avatar} /><AvatarFallback className="bg-secondary text-secondary-foreground text-lg">{initials(user?.name)}</AvatarFallback></Avatar><div><p className="font-semibold">{user?.name}</p><p className="text-sm text-muted-foreground">Profile photo is managed by your workspace.</p></div></div><Field label="Full name" value={name} onChange={setName} placeholder="Your name" test="input-settings-name" /><Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" test="input-settings-email" /><div className="sm:col-span-2"><Button onClick={save} disabled={update.isPending} className="bg-primary text-primary-foreground" data-testid="button-save-profile">{update.isPending ? 'Saving…' : 'Save profile'}</Button></div></CardContent></Card><Card className="border-border/70 shadow-none"><CardHeader><CardTitle className="font-display text-2xl">Billing</CardTitle><p className="text-sm text-muted-foreground">Plans are intentionally simple. You’re currently on the Free plan.</p></CardHeader><CardContent><div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-secondary/60 p-4"><div><p className="font-semibold">Free workspace</p><p className="mt-1 text-sm text-muted-foreground">Unlimited clarity for starting teams.</p></div><Button variant="outline" disabled data-testid="button-manage-billing">Manage billing</Button></div></CardContent></Card></div></Shell>; }

function AppRouter() { return <Switch><Route path="/" component={Landing} /><Route path="/method" component={MethodPage} /><Route path="/pricing" component={PricingPage} /><Route path="/why-taskflow" component={WhyTaskFlowPage} /><Route path="/login"><AuthPage mode="login" /></Route><Route path="/signup"><AuthPage mode="signup" /></Route><Route path="/dashboard"><AuthGate><Dashboard /></AuthGate></Route><Route path="/projects/:projectId"><AuthGate><ProjectDetail /></AuthGate></Route><Route path="/teams"><AuthGate><Teams /></AuthGate></Route><Route path="/settings"><AuthGate><SettingsPage /></AuthGate></Route><Route component={NotFound} /></Switch>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><AppRouter /><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;