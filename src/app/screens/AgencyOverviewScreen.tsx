import { useApp } from '../context/AppContext';
import { 
  Building2, Download, Sparkles, Wallet, TrendingUp, CheckCircle, Briefcase, 
  ArrowRight, AlertTriangle, ArrowUpRight, ArrowDownRight, Lightbulb 
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, CartesianGrid, 
  XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie,
  RadialBarChart, RadialBar, Legend
} from 'recharts';
import PageWrapper from '../components/shared/PageWrapper';
import { useState } from 'react';

// Spend vs Conversions Trend Mock Data mapped to screenshot trajectory
const spendConversionsTrend = [
  { day: 'Mon', spend: 8.2, conv: 92 },
  { day: 'Tue', spend: 9.4, conv: 108 },
  { day: 'Wed', spend: 10.1, conv: 121 },
  { day: 'Thu', spend: 11.6, conv: 138 },
  { day: 'Fri', spend: 12.8, conv: 150 },
  { day: 'Sat', spend: 14.1, conv: 162 },
  { day: 'Sun', spend: 17.4, conv: 179 },
];

const channels = [
  { name: "Search",   roas: 3.4, fill: "var(--violet)" },
  { name: "Social",   roas: 2.8, fill: "var(--sky)" },
  { name: "Display",  roas: 1.9, fill: "var(--amber)" },
  { name: "Video",    roas: 2.3, fill: "var(--emerald)" },
  { name: "Native",   roas: 1.5, fill: "var(--rose)" },
];

const goals = [
  { name: "Reach",       value: 92, fill: "var(--violet)" },
  { name: "Engagement",  value: 78, fill: "var(--sky)" },
  { name: "Conversion",  value: 64, fill: "var(--emerald)" },
  { name: "Retention",   value: 51, fill: "var(--amber)" },
];

export default function AgencyOverviewScreen() {
  const { campaigns, dashboards, setSelectedClientId, setActiveView } = useApp();
  const { CLIENTS: clients } = useApp() as any;

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Dynamic calculations from live campaigns
  const totalSpend = campaigns.reduce((s: number, c: any) => s + c.spend, 0);
  const totalConv = campaigns.reduce((s: number, c: any) => s + c.conv, 0);
  const avgRoas = campaigns.length ? (campaigns.reduce((s: number, c: any) => s + c.roas, 0) / campaigns.length) : 0;
  const criticalCount = campaigns.filter((c: any) => c.status === 'critical').length;

  const clientStats = clients.map((client: any) => {
    const cc = campaigns.filter((c: any) => c.clientId === client.id);
    const cd = dashboards.filter((d: any) => d.clientId === client.id);
    return {
      ...client,
      spend: cc.reduce((s: number, c: any) => s + c.spend, 0),
      roas: cc.length ? (cc.reduce((s: number, c: any) => s + c.roas, 0) / cc.length) : 0,
      conv: cc.reduce((s: number, c: any) => s + c.conv, 0),
      activeCampaigns: cc.filter((c: any) => c.active).length,
      totalCampaigns: cc.length,
      dashboardCount: cd.length,
      criticals: cc.filter((c: any) => c.status === 'critical').length,
      warnings: cc.filter((c: any) => c.status === 'at_risk' || cc.status === 'warning').length,
    };
  });

  const onSelectClient = (id: string) => {
    setSelectedClientId(id);
    setActiveView('campaigns');
  };

  // Pie chart data for Platform Mix
  const pieData = [
    { name: 'Meta Ads', value: 53.2, share: 64, color: 'var(--indigo)' },
    { name: 'Google Ads', value: 21.0, share: 25, color: 'var(--emerald)' },
    { name: 'LinkedIn Ads', value: 5.9, share: 7, color: 'var(--violet)' },
    { name: 'TikTok Ads', value: 3.5, share: 4, color: 'var(--pink)' }
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Agency Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Venpep Agency · {clients.length} active client{clients.length === 1 ? '' : 's'} · May 26, 2026
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2 cursor-pointer shadow-sm">
            <Download className="size-4 text-muted-foreground" /> Agency Report
          </button>
          <button onClick={() => setActiveView('ai')} className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 cursor-pointer border-0">
            <Sparkles className="size-4" /> AI Summary
          </button>
        </div>
      </div>

      {/* Critical alert bar (if any) */}
      {criticalCount > 0 && (
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-rose flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-950">{criticalCount} campaigns need immediate attention</p>
            <p className="text-xs text-rose-700/80 mt-0.5">CAI Mahindra has campaigns with creative fatigue detected (frequency above 3.0).</p>
          </div>
          <button onClick={() => { setSelectedClientId('cai_mahindra'); setActiveView('campaigns'); }} className="flex-shrink-0 h-8 px-3 bg-rose-650 hover:bg-rose-700 text-white border-0 rounded-lg text-xs font-semibold transition-colors cursor-pointer">View Issues</button>
        </div>
      )}

      {/* Bento KPIs (Matching the lovable structure) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Wallet} variant="violet" value="₹83.6K" label="Total Agency Spend" detail="All campaigns combined" delta="+14.2%" />
        <KpiCard icon={TrendingUp} variant="sky" value="2.4×" label="Blended ROAS" detail="Across all accounts" delta="+6.8%" />
        <KpiCard icon={CheckCircle} variant="emerald" value="850" label="Total Conversions" detail="All campaigns" delta="+19.1%" />
        <KpiCard icon={Building2} variant="amber" value={String(clients.length)} label="Active Clients" detail={`${clients.length} account managed`} delta="Active" />
      </div>

      {/* Main charts row */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
        {/* Spend vs Conversions Area Graph */}
        <Panel
          title="Spend vs Conversions Trend"
          subtitle="Weekly performance overview"
          action={
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 select-none">
              {(['7d', '30d', '90d'] as const).map(preset => (
                <button
                  key={preset}
                  onClick={() => setTimeRange(preset)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer border-0 ${
                    timeRange === preset ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground bg-transparent'
                  }`}
                >
                  {preset.toUpperCase()}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={spendConversionsTrend} margin={{ top: 10, right: 8, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSpend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--violet)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gConv" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipCard />} cursor={{ stroke: "var(--violet)", strokeOpacity: 0.2 }} />
                <Area type="monotone" dataKey="spend" name="Spend (₹K)" stroke="var(--violet)" strokeWidth={2.5} fill="url(#gSpend)" />
                <Area type="monotone" dataKey="conv" name="Conversions" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#gConv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 pt-3 text-xs text-muted-foreground border-t border-border mt-3">
            <span className="flex items-center gap-2"><span className="h-1.5 w-3.5 rounded-full" style={{ background: "var(--violet)" }} /> Amount Spent</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-3.5 rounded-full" style={{ background: "var(--emerald)" }} /> Conversions</span>
          </div>
        </Panel>

        {/* Platform Mix Donut Card */}
        <Panel title="Platform Mix" subtitle="Spend distribution">
          <div className="grid grid-cols-1 gap-4">
            <div className="h-40 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="share"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke="var(--card)"
                    strokeWidth={3}
                  >
                    {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip content={<TooltipCard />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 pt-2">
              {pieData.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      <span className="font-semibold text-foreground/80">{p.name}</span>
                    </span>
                    <span className="font-num text-xs tabular-nums text-foreground/90">
                      <span className="font-bold">₹{p.value}K</span>{" "}
                      <span className="text-muted-foreground font-normal">({p.share}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${p.share}%`, background: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Secondary row */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Channel ROAS */}
        <Panel title="ROAS by Channel" subtitle="Return on ad spend per channel">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={channels} margin={{ top: 10, right: 8, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipCard />} cursor={{ fill: "var(--surface-2)" }} />
                <Bar dataKey="roas" radius={[6, 6, 0, 0]}>
                  {channels.map((c, i) => <Cell key={i} fill={c.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Goal Completion Radial */}
        <Panel title="Goal Completion" subtitle="Progress across key objectives">
          <div className="h-64">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="25%" outerRadius="100%" data={goals} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: "var(--surface-2)" }} dataKey="value" cornerRadius={6} />
                <Legend
                  iconSize={8}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }}
                />
                <Tooltip content={<TooltipCard />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Client Accounts Directory */}
      <div className="mt-6">
        <Panel
          title="Client Accounts"
          subtitle={`${clients.length} active client${clients.length === 1 ? '' : 's'}`}
          action={
            <button onClick={() => setActiveView('clients')} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-transparent border-0 cursor-pointer">
              View all <ArrowRight className="size-3.5" />
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clientStats.map((clientItem: any) => (
              <div 
                key={clientItem.id}
                onClick={() => onSelectClient(clientItem.id)}
                className="block rounded-2xl border border-border bg-surface-2/40 p-5 transition-all hover:border-primary/40 hover:shadow-card cursor-pointer group"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${clientItem.color || 'bg-gradient-rose'} text-sm font-bold text-white shadow-md`}>
                    {clientItem.avatar || clientItem.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">{clientItem.name}</div>
                    <div className="text-xs text-muted-foreground">{clientItem.industry}</div>
                  </div>
                  <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                    clientItem.status === 'healthy' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    <span className={`size-1.5 rounded-full ${clientItem.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {clientItem.status === 'healthy' ? 'Healthy' : 'Needs attention'}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4 select-none">
                  <Stat label="Spend" value={formatCurrency(clientItem.spend)} />
                  <Stat label="Avg ROAS" value={`${clientItem.roas.toFixed(1)}×`} accent="amber" />
                  <Stat label="Conversions" value={clientItem.conv} />
                  <Stat label="Campaigns" value={`${clientItem.activeCampaigns}/${clientItem.totalCampaigns}`} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
                  <span>✓ {clientItem.accountManager}</span>
                  <span>·</span>
                  <span>{clientItem.dashboardCount} dashboard{clientItem.dashboardCount === 1 ? '' : 's'}</span>
                  <span className="ml-auto font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Manage <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPER COMPONENTS AIGNED TO LOVABLE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════
function KpiCard({
  icon: Icon, value, label, detail, delta, variant = "violet", positive = true,
}: {
  icon: any;
  value: string;
  label: string;
  detail: string;
  delta: string;
  variant?: "violet" | "emerald" | "sky" | "amber" | "rose";
  positive?: boolean;
}) {
  const variantStyles = {
    violet:  { bg: "bg-gradient-primary",  chip: "bg-violet-50 text-violet-700" },
    emerald: { bg: "bg-gradient-emerald", chip: "bg-emerald-50 text-emerald-700" },
    sky:     { bg: "bg-gradient-sky",     chip: "bg-sky-50 text-sky-700" },
    amber:   { bg: "bg-gradient-amber",   chip: "bg-amber-50 text-amber-700" },
    rose:    { bg: "bg-gradient-rose",    chip: "bg-rose-50 text-rose-700" },
  };
  const v = variantStyles[variant];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg select-none">
      <div className="absolute -right-12 -top-12 size-36 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20 pointer-events-none" >
        <div className={`size-full rounded-full ${v.bg}`} />
      </div>
      <div className="relative flex items-start justify-between">
        <div className={`grid size-11 place-items-center rounded-xl text-white shadow-md ${v.bg}`}>
          <Icon className="size-5" strokeWidth={2.4} />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}>
          {positive ? <ArrowUpRight className="size-3 stroke-[2.5px]" /> : <ArrowDownRight className="size-3 stroke-[2.5px]" />}
          {delta}
        </span>
      </div>
      <div className="relative mt-5 font-num text-[1.95rem] font-semibold tracking-tight leading-none tabular-nums text-foreground">{value}</div>
      <div className="relative mt-2 text-sm font-medium text-foreground/80">{label}</div>
      <div className="relative mt-0.5 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function Panel({
  title, subtitle, action, children, className = "",
}: {
  title: string;
  subtitle?: string;
  action?: any;
  children: any;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card ${className}`}>
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, suffix, accent }: { label: string; value: string; suffix?: string; accent?: "amber" }) {
  return (
    <div className="bg-card p-4">
      <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="font-num text-lg font-semibold tabular-nums text-foreground" style={accent === "amber" ? { color: "var(--orange)" } : undefined}>
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function TooltipCard({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg z-50">
      {label && <div className="mb-1 text-[11px] font-semibold text-muted-foreground">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="font-medium text-foreground">{p.name}:</span>
          <span className="font-semibold font-num tabular-nums text-foreground">{typeof p.value === 'number' && p.name.includes('Spend') ? `₹${p.value.toFixed(1)}K` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}
