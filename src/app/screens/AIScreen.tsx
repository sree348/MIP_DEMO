import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Trash2, Send, Cpu, Lightbulb, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageWrapper from '../components/shared/PageWrapper';
import { apiService } from '../../services/api.service';
import WidgetRenderer, { formatInr, formatRoas } from '../components/shared/WidgetRenderer';
import { getAlerts, getConnectedPlatforms, getPerformanceSummary, getRecommendations } from '../../services/insights.service';
import { toast } from 'sonner';

const QUICK_CHIPS = [
  "Show me my top 5 campaigns by spend last 30 days",
  "Which campaign had the worst CPC?",
  "How has my Meta spend trended over the last 30 days?",
  "Show me all my active campaigns with clicks and impressions",
  "What is my total spend and average CPC this month?"
];

function getCampaignHealthMetrics(c: any, score: number) {
  // Extract values
  const spend = Number(c.spend || c.amount_spent || 0);
  const clicks = Number(c.clicks || 0);
  const impressions = Number(c.impressions || 0);
  const conversions = Number(c.conversions || c.conv || 0);
  const frequency = Number(c.frequency || 0);
  const cpc = clicks > 0 ? spend / clicks : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const roas = spend > 0 ? (c.actionValue || (c.roas ? c.roas * spend : 0)) / spend : 0;

  // 1. Budget Waste: Zero conversions with high spend above ₹5000
  if (conversions === 0 && spend > 5000) {
    return {
      topIssue: 'Budget Waste',
      recommendation: `Zero conversions recorded despite ₹${spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent. Pause campaign immediately to save budget.`,
      priority: 'critical',
      badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-500'
    };
  }

  // 2. Frequency above 4.0 = critical. Pause immediately. Above 3.0 = warning. Below 3.0 is healthy.
  if (frequency > 4.0) {
    return {
      topIssue: 'High Fatigue',
      recommendation: `Ad frequency has reached a critical level of ${frequency.toFixed(2)}. Pause this campaign immediately to avoid creative saturation.`,
      priority: 'critical',
      badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-500'
    };
  }
  if (frequency > 3.0) {
    return {
      topIssue: 'Ad Fatigue',
      recommendation: `Ad frequency is high at ${frequency.toFixed(2)}. Rotate your creative assets and refresh audiences soon to maintain CTR.`,
      priority: 'warning',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-500'
    };
  }

  // 3. CPC above ₹80 is critical
  if (cpc > 80) {
    return {
      topIssue: 'Critical CPC',
      recommendation: `CPC is extremely high at ₹${cpc.toFixed(2)} (well above the ₹80 Indian benchmark). Refine audience targeting and improve creative hooks.`,
      priority: 'critical',
      badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-500'
    };
  }

  // 4. ROAS below 2.0 = underperforming
  if (roas > 0 && roas < 2.0) {
    return {
      topIssue: 'Low ROAS',
      recommendation: `ROAS is underperforming at ${roas.toFixed(2)}x (target is 2.0x+). Review landing page conversion rate and offer positioning.`,
      priority: 'warning',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-500'
    };
  }

  // 5. CTR below 0.5% = creative fatigue
  if (ctr > 0 && ctr < 0.5) {
    return {
      topIssue: 'Low CTR',
      recommendation: `CTR is sluggish at ${ctr.toFixed(2)}% (under the 0.5% creative fatigue line). Refresh your ad creatives and headlines immediately.`,
      priority: 'warning',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-500'
    };
  }

  // 6. Healthy Opportunities to scale
  if (roas >= 4.0) {
    return {
      topIssue: 'Scale ROAS',
      recommendation: `Outstanding ROAS of ${roas.toFixed(2)}x. Scale campaign budget by 20-30% immediately to capture more high-value leads.`,
      priority: 'success',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
    };
  }

  if (ctr >= 2.0) {
    return {
      topIssue: 'Scale CTR',
      recommendation: `Impressive CTR at ${ctr.toFixed(2)}% shows superb relevance. Increase daily budget to unlock higher conversion volume.`,
      priority: 'success',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
    };
  }

  // 7. General Custom Recommendations - Never a static fallback string!
  if (score >= 70) {
    return {
      topIssue: 'Healthy Performance',
      recommendation: `Solid health score of ${score}/100 driven by a highly efficient CPC of ₹${cpc.toFixed(2)} and a strong CTR of ${ctr.toFixed(2)}%. Maintain current pacing.`,
      priority: 'success',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
    };
  }

  if (score >= 40) {
    return {
      topIssue: 'Moderate Health',
      recommendation: `Moderate health of ${score}/100. Spend is ₹${spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} with conversions at ${conversions}. Optimize CTR and CPC to hit 70+.`,
      priority: 'warning',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-500'
    };
  }

  return {
    topIssue: 'Poor Health',
    recommendation: `Critical health score of ${score}/100. Driven by low CTR (${ctr.toFixed(2)}%) or frequency fatigue (${frequency.toFixed(2)}). Implement budget reallocation.`,
    priority: 'critical',
    badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-500'
  };
}


export default function AIScreen() {
  const { scopedCampaigns: campaigns, activeClient, integrations, activeView } = useApp();
  const { CLIENTS: clients } = useApp() as any;

  const tenantId = activeClient?.id || 'agency';

  // Stats Card Calculations
  const connectedPlatforms = getConnectedPlatforms(integrations);
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || c.amount_spent || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || c.conv || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + ((c.roas || 0) * (c.spend || c.amount_spent || 0)), 0);
  const blendedRoas = totalConversions === 0 || totalSpend === 0 ? null : (totalRevenue / totalSpend);
  const alerts = getAlerts(campaigns, clients);
  // Top Stats Calculations
  const budgetAtRisk = campaigns
    .filter(c => (c.conversions || c.conv || 0) === 0)
    .reduce((sum, c) => sum + (c.spend || c.amount_spent || 0), 0);
  const scaleOpportunity = campaigns.reduce((sum, c) => {
    const spend = Number(c.spend || c.amount_spent || 0);
    const clicks = Number(c.clicks || 0);
    const impressions = Number(c.impressions || 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return ctr >= 2 ? sum + spend : sum;
  }, 0);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // AI Brain Specific States
  const [insights, setInsights] = useState<any[]>([]);
  const [brainScores, setBrainScores] = useState<any[]>([]);
  const [isSyncingBrain, setIsSyncingBrain] = useState(false);
  const [isLoadingBrain, setIsLoadingBrain] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll utility
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Fetch AI Brain Scores and Insights
  const fetchBrainData = async () => {
    setIsLoadingBrain(true);
    try {
      const [insightsData, scoresData] = await Promise.all([
        apiService.getBrainInsights(tenantId),
        apiService.getBrainScores(tenantId)
      ]);
      setInsights(insightsData || []);
      setBrainScores(scoresData || []);
    } catch (err) {
      console.error("Error fetching AI Brain data:", err);
    } finally {
      setIsLoadingBrain(false);
    }
  };

  useEffect(() => {
    if (activeView === 'ai') {
      fetchBrainData();
    }
  }, [tenantId, activeView]);

  // Run or Trigger AI Brain Analysis manually
  const handleSyncBrain = async () => {
    setIsSyncingBrain(true);
    try {
      await apiService.triggerBrainSync(tenantId);
      await fetchBrainData();
      toast.success("AI Brain sync completed and performance scores updated!");
    } catch (err) {
      console.error("Failed to sync AI Brain:", err);
      toast.error("Failed to run AI Brain analysis.");
    } finally {
      setIsSyncingBrain(false);
    }
  };

  // Load chat history from the DB on mount or client change
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await apiService.getChatHistory(tenantId);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Initialize with a friendly welcome message if no history exists
          setMessages([
            {
              role: 'assistant',
              content: activeClient
                ? `Hello! I'm your AI analytics assistant for **${activeClient.name}**. I've reviewed your campaign performance metrics and have full insights ready.\n\nWhat would you like to explore today?`
                : `Hello! I'm your AI marketing analyst for Venpep Agency. I've compiled campaign intelligence across your client accounts and have insights ready.\n\nWhat would you like to explore today?`,
              createdAt: new Date().toISOString(),
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        // Fallback to initial message
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I'm your AI analytics assistant. Ask me anything about your campaigns.`,
            createdAt: new Date().toISOString(),
          }
        ]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [tenantId, activeClient]);

  // Submit Prompt Handler
  const handleSend = async (text?: string) => {
    const promptText = text || input;
    if (!promptText.trim()) return;

    // Append user message immediately
    const userMsg = {
      role: 'user',
      content: promptText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Gather full conversation history
      const cleanHistory = messages.map(({ role, content }) => ({ role, content }));

      // API Request to get visual widget and insight
      const response = await apiService.chat(promptText, tenantId, cleanHistory, {
        campaigns,
        clients,
        integrations,
      });

      setIsTyping(false);
      
      const assistantMsg = {
        role: 'assistant',
        content: response.insight || 'Here is the requested data:',
        widget: response.widget,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat submit failed:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error querying the analytics layer. Please ensure the backend server and Groq API keys are configured correctly.',
        createdAt: new Date().toISOString(),
      }]);
    }
  };

  // Clear Chat History Handler
  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear this conversation history?')) return;
    
    try {
      await apiService.clearChatHistory(tenantId);
      setMessages([
        {
          role: 'assistant',
          content: activeClient
            ? `Conversation history cleared. What would you like to explore next for **${activeClient.name}**?`
            : `Conversation history cleared. What would you like to explore next?`,
          createdAt: new Date().toISOString(),
        }
      ]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (activeView === 'ai') {
    return (
      <PageWrapper>
        <div className="flex-1 overflow-y-auto px-1 flex flex-col font-sans max-w-7xl mx-auto w-full space-y-6 pb-8 select-none">
          
          {/* Header Block */}
          <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-primary text-white shadow-glow">
                <Cpu className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">AI Brain Strategy</h1>
                  {activeClient && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-400">
                      <span className="size-1.5 rounded-full bg-indigo-500" /> {activeClient.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Deep performance insights, health scoring, and autonomous recommendations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncBrain}
                disabled={isSyncingBrain}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-primary text-white hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${isSyncingBrain ? 'animate-spin' : ''}`} />
                {isSyncingBrain ? 'Running Strategy Analysis...' : 'Re-run AI Analysis'}
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 select-none">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Strategic Mode
              </span>
            </div>
          </div>

          {/* Top Stats Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col">
            <div className="text-xs font-extrabold uppercase text-muted-foreground">Budget at risk</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground">{formatInr(budgetAtRisk)}</div>
            <div className="text-[10px] text-muted-foreground">Zero‑conversion spend</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col">
            <div className="text-xs font-extrabold uppercase text-muted-foreground">Needs attention</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground">{insights.filter(i => i.priority === 'warning').length}</div>
            <div className="text-[10px] text-muted-foreground">Warning insights</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col">
            <div className="text-xs font-extrabold uppercase text-muted-foreground">Scale opportunity</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground">{formatInr(scaleOpportunity)}</div>
            <div className="text-[10px] text-muted-foreground">High‑CTR spend</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col">
            <div className="text-xs font-extrabold uppercase text-muted-foreground">Active insights</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground">{insights.length}</div>
            <div className="text-[10px] text-muted-foreground">Total AI insights</div>
          </div>
        </div>
        {/* Campaign Health Section */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Campaign Portfolio Health</h2>
                <p className="text-xs text-muted-foreground">Live health index calculated using Indian campaign benchmarks (ROAS, CTR, frequency, and CPC)</p>
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                Weighted scoring
              </span>
            </div>

            {isLoadingBrain ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="size-6 text-indigo-500 animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">Calculating portfolio scores...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground font-semibold">
                No live campaigns found. Please connect your Meta Ads integration.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-2">Campaign Name</th>
                      <th className="py-3 px-2 text-center w-28">Health Score</th>
                      <th className="py-3 px-2 text-center w-24">Trend</th>
                      <th className="py-3 px-2 w-44">Top Issue Badge</th>
                      <th className="py-3 px-2">AI Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {campaigns.map((c: any) => {
                      const dbScore = brainScores.find(bs => bs.campaignName === c.name || bs.campaignName === c.campaignName);
                      
                      const spend = Number(c.spend || c.amount_spent || 0);
                      const clicks = Number(c.clicks || 0);
                      const impressions = Number(c.impressions || 0);
                      const conversions = Number(c.conversions || c.conv || 0);
                      const frequency = Number(c.frequency || 0);
                      const cpc = clicks > 0 ? spend / clicks : 0;
                      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                      const roas = spend > 0 ? (c.actionValue || (c.roas ? c.roas * spend : 0)) / spend : 0;

                      const cpcTerm = cpc > 0 ? (1 / cpc) * 20 : 0;
                      const rawScore = (roas * 25) + (ctr * 15) + cpcTerm - (frequency * 10);
                      const fallbackScore = Math.max(0, Math.min(100, Math.round(rawScore)));
                      
                      const score = dbScore ? dbScore.score : fallbackScore;
                      const trend = dbScore ? dbScore.trend : 'stable';
                      
                      const healthInfo = getCampaignHealthMetrics(c, score);

                      
                      const radius = 14;
                      const strokeWidth = 3.5;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (score / 100) * circumference;
                      
                      let strokeColorClass = 'text-emerald-500';
                      if (score < 40) strokeColorClass = 'text-rose-500';
                      else if (score < 70) strokeColorClass = 'text-amber-500';

                      return (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-2">
                            <div className="font-bold text-[13px] leading-[1.3] text-foreground break-words" title={c.name}>
                              {c.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-secondary rounded font-medium">{c.platform || 'Meta'}</span>
                              <span>Spend: {formatInr(spend)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-2">
                            <div className="flex justify-center">
                              <div className="relative flex items-center justify-center w-10 h-10 select-none">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r={radius}
                                    className="text-slate-100 dark:text-slate-800"
                                    strokeWidth={strokeWidth}
                                    stroke="currentColor"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r={radius}
                                    className={strokeColorClass}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                  />
                                </svg>
                                <span className="absolute text-[10px] font-extrabold text-foreground">
                                  {score}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-2">
                            <div className="flex justify-center">
                              {trend === 'up' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  <TrendingUp className="size-3" /> ▲
                                </span>
                              )}
                              {trend === 'down' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                  <TrendingDown className="size-3" /> ▼
                                </span>
                              )}
                              {trend === 'stable' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded">
                                  <span>■</span> Stable
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${healthInfo.badgeColor}`}>
                              {healthInfo.topIssue}
                            </span>
                          </td>
                          <td className="py-3.5 px-2">
                            <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                              {healthInfo.recommendation}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Strategist Insights section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Specific AI Recommendations & Anomaly Detections</h2>
                <p className="text-xs text-muted-foreground">Granular campaign opportunities generated by the marketing strategist brain</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">5 active insights</span>
            </div>

            {isLoadingBrain ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-44 rounded-2xl border border-border bg-card p-5 animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-10 bg-muted rounded w-full" />
                    <div className="h-8 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : insights.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Lightbulb className="size-8 mx-auto text-indigo-400 mb-2 animate-bounce" />
                <h3 className="font-bold text-foreground text-sm">No analysis insights generated yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Click "Re-run AI Analysis" above to analyze live campaign data and produce tailored strategist insights.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight) => {
                  let borderClass = '';
                  let bgGradient = '';
                  let icon = null;
                  let badgeClass = '';
                  if (insight.priority === 'critical') {
                    borderClass = 'border-l-rose-500';
                    bgGradient = 'from-rose-500/5 to-transparent';
                    icon = <ShieldAlert className="size-4 text-rose-500" />;
                    badgeClass = 'bg-rose-500/10 border-rose-500/20 text-rose-500';
                  } else if (insight.priority === 'warning') {
                    borderClass = 'border-l-amber-500';
                    bgGradient = 'from-amber-500/5 to-transparent';
                    icon = <AlertTriangle className="size-4 text-amber-500" />;
                    badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                  } else if (insight.type === 'opportunity') {
                    borderClass = 'border-l-emerald-500';
                    bgGradient = 'from-emerald-500/5 to-transparent';
                    icon = <Zap className="size-4 text-emerald-500" />;
                    badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
                  }

                  return (
                    <div
                      key={insight.id}
                      className={`rounded-2xl border border-border border-l-4 ${borderClass} bg-card bg-gradient-to-br ${bgGradient} p-5 shadow-sm hover:shadow-card transition-all flex flex-col justify-between space-y-4`}
                    >
                      <div>
                        {/* Title Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-card border border-border shadow-sm shrink-0">
                              {icon}
                            </div>
                            <h3 className="text-[13px] font-bold text-foreground leading-[1.3] break-words whitespace-normal">
                              {insight.title}
                            </h3>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide shrink-0 ${badgeClass}`}>
                            {insight.priority}
                          </span>
                        </div>

                        {/* Campaign tag */}
                        <div className="text-[10px] font-bold text-muted-foreground mt-2 inline-block px-2 py-0.5 rounded bg-secondary">
                          Campaign: {insight.campaignName}
                        </div>

                        {/* Body Description */}
                        <p className="text-xs text-foreground/80 leading-relaxed font-medium mt-3 text-justify">
                          {insight.body}
                        </p>
                      </div>

                      {/* Footer suggested action callout */}
                      <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Suggested Action</div>
                          <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mt-0.5">
                            {insight.suggestedAction}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 select-none">
                          <span className="text-[10px] font-extrabold text-muted-foreground">Confidence: {Math.round(insight.confidence * 100)}%</span>
                          <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-border">
                            <div
                              className="h-full bg-gradient-primary rounded-full"
                              style={{ width: `${insight.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </PageWrapper>
    );
  }


  return (
    <PageWrapper>
      <div className="h-[calc(100vh-6.5rem)] flex flex-col font-sans max-w-7xl mx-auto w-full">
        
        {/* Title Header Block */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-primary text-white shadow-glow">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">AI Campaign Analysis</h1>
                {activeClient && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-400">
                    <span className="size-1.5 rounded-full bg-indigo-500" /> {activeClient.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Ask analytics questions and receive real-time generated SQL and charts</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 select-none">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Live Connection
          </span>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0 select-none">
          {[
            { label: "Connected Sources", val: String(connectedPlatforms.length), subtitle: connectedPlatforms.map(p => p.name).join(', ') || 'None connected' },
            { label: "Spend Analysed", val: formatInr(totalSpend), subtitle: `${campaigns.length} campaigns active` },
            { label: "Open Alerts", val: String(alerts.length), subtitle: `${alerts.filter((a: any) => a.critical).length || 0} critical attention` },
          ].map((k, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-border/80 transition-all flex flex-col justify-between">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className="mt-1.5 font-display text-xl font-extrabold text-foreground">{k.val}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground truncate">{k.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Main Conversational Panel */}
        <div className="flex-1 rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-sm min-h-0">
          
          {/* Messages Body */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <AnimatePresence initial={false}>
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <RefreshCw className="size-6 text-indigo-500 animate-spin" />
                  <span className="text-xs font-semibold text-muted-foreground">Loading history...</span>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={msg.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm font-bold text-xs ${
                        isUser 
                          ? 'bg-secondary text-foreground' 
                          : 'bg-gradient-primary text-white shadow-glow'
                      }`}>
                        {isUser ? 'PM' : <Sparkles className="size-4" />}
                      </div>

                      {/* Content Bubble */}
                      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isUser 
                            ? 'bg-gradient-primary text-white shadow-glow rounded-tr-none' 
                            : 'bg-muted/40 border border-border/80 text-foreground rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-line break-words text-justify">
                            {msg.content.split('**').map((part: string, idx: number) => 
                              idx % 2 === 0 ? part : <strong key={idx} className="font-extrabold">{part}</strong>
                            )}
                          </p>
                        </div>

                        {/* If Assistant contains widget data, render it */}
                        {!isUser && msg.widget && (
                          <div className="w-full mt-2 min-w-[320px] max-w-full">
                            <WidgetRenderer widget={msg.widget} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {/* Bouncing Typing Indicator */}
            {isTyping && (
              <div className="flex gap-4">
                <div className="size-8 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow text-white">
                  <Sparkles className="size-4" />
                </div>
                <div className="bg-muted/40 border border-border/80 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 shadow-sm">
                  {[0, 0.15, 0.3].map((delay, index) => (
                    <motion.span
                      key={index}
                      variants={{
                        initial: { y: 0 },
                        animate: { y: -5 }
                      }}
                      initial="initial"
                      animate="animate"
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                        delay
                      }}
                      className="size-1.5 bg-indigo-500 rounded-full"
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1.5 font-bold uppercase tracking-widest">Generating SQL & Charts...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Footer Input Bar */}
          <div className="border-t border-border p-4 bg-muted/10 flex-shrink-0">
            {/* Quick chips if conversation is starting */}
            {messages.length <= 1 && !isTyping && (
              <div className="mb-4">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Try quick prompt shortcuts</div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {QUICK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip)}
                      className="text-xs px-3 py-1.5 border border-border bg-card hover:border-indigo-500/40 rounded-full hover:shadow-sm cursor-pointer transition-all text-foreground/80 hover:text-foreground font-semibold"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form Pill */}
            <div className="flex items-end gap-3 bg-card border border-border rounded-xl p-2 shadow-sm">
              <button
                onClick={handleClearHistory}
                title="Clear Conversation History"
                className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all flex-shrink-0 border-0 bg-transparent"
              >
                <Trash2 className="size-5" />
              </button>
              
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeClient ? `Ask me about ${activeClient.name}'s performance data (e.g. spend, ROAS, click trend)...` : "Ask me anything about client campaign databases..."}
                rows={1}
                className="flex-1 max-h-20 min-h-[2.25rem] bg-transparent border-0 focus:ring-0 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground py-2.5 px-1 resize-none font-sans"
              />

              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="size-9 rounded-lg bg-gradient-primary text-white flex items-center justify-center hover:shadow-glow disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed cursor-pointer transition-all border-0 shrink-0"
              >
                <Send className="size-4" />
              </button>
            </div>
            <div className="text-[9px] text-muted-foreground mt-2 text-center select-none font-medium">
              Press <kbd className="font-mono bg-muted border border-border px-1 py-0.5 rounded text-[8px] font-bold">Ctrl + Enter</kbd> to submit query
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
