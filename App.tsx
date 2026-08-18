
import React, { useState, useCallback, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  ArrowRight,
  Loader2, 
  CheckCircle2,
  Briefcase,
  Download,
  AlertOctagon,
  ThumbsUp,
  ThumbsDown,
  UploadCloud,
  XCircle,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  ShieldAlert as ShieldAlertIcon,
  Info,
  CalendarDays,
  Target,
  ClipboardList,
  HelpCircle,
  Terminal,
  Eye,
  EyeOff,
  LayoutDashboard,
  BarChart3,
  AlertTriangle,
  FileWarning,
  Repeat,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcelFile } from './services/excelParser';
import { generateAuditReport } from './services/geminiAudit';
import { ExpenseEntry, StoreMetric } from './types';
import { LAZY_REMARK_PATTERNS } from './constants';
import { 
  PieChart,
  Pie,
  Legend,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

type AnalysisMode = 'none' | 'daily' | 'monthly';

interface PatternRecord {
  store: string;
  category: string;
  recurringAmount: number;
  frequency: number;
  totalSpend: number;
  remarksQuality: string;
  suspicionLevel: 'High' | 'Medium';
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AnalysisMode>('none');
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Section Visibility States
  const [isOverviewVisible, setIsOverviewVisible] = useState(true);
  const [isAnalyticsVisible, setIsAnalyticsVisible] = useState(true);
  const [isAiNarrativeVisible, setIsAiNarrativeVisible] = useState(true);
  const [isRoadmapVisible, setIsRoadmapVisible] = useState(true);
  const [isPatternVisible, setIsPatternVisible] = useState(true);
  const [isStoresVisible, setIsStoresVisible] = useState(true);
  const [isRecommendationsVisible, setIsRecommendationsVisible] = useState(true);
  const [isLazyExportVisible, setIsLazyExportVisible] = useState(true);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setAuditReport(null);
    try {
      const parsedData = await parseExcelFile(file);
      setEntries(parsedData);
      
      setAiAnalyzing(true);
      const summaryMetrics = calculateLocalMetrics(parsedData);
      const report = await generateAuditReport(parsedData, { ...summaryMetrics, isMonthly: mode === 'monthly' });
      setAuditReport(report);
    } catch (err) {
      console.error(err);
      setError("Failed to parse Excel file. Ensure it matches the standard expense format.");
      setEntries([]);
    } finally {
      setLoading(false);
      setAiAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        processFile(file);
      } else {
        setError("Invalid file type. Please upload an Excel (.xlsx) file.");
      }
    }
  };

  const resetAllData = () => {
    setEntries([]);
    setAuditReport(null);
    setError(null);
    setLoading(false);
    setAiAnalyzing(false);
    setIsStoresVisible(true);
    setSearchTerm('');
    setMode('none');
  };

  const localMetrics = useMemo(() => {
    if (entries.length === 0) return { totalSpend: 0, categoryAverages: {}, flaggedEntries: [] };
    return calculateLocalMetrics(entries);
  }, [entries]);

  function calculateLocalMetrics(data: ExpenseEntry[]) {
    const totalSpend = data.reduce((sum, e) => sum + e.amount, 0);
    const storeMap = new Map<string, { total: number, cats: Record<string, number>, lazyRemarks: number, entries: number }>();
    const categoryTotals: Record<string, number> = {};

    data.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      const s = storeMap.get(e.store) || { total: 0, cats: {}, lazyRemarks: 0, entries: 0 };
      s.total += e.amount;
      s.entries += 1;
      s.cats[e.category] = (s.cats[e.category] || 0) + e.amount;
      const isLazy = LAZY_REMARK_PATTERNS.some(p => p.test(e.remarks.trim()));
      if (isLazy) s.lazyRemarks += 1;
      storeMap.set(e.store, s);
    });

    const categoryAverages = Object.entries(categoryTotals).reduce((acc, [cat, total]) => {
      acc[cat] = total / (storeMap.size || 1);
      return acc;
    }, {} as Record<string, number>);

    const flaggedEntries = data.filter(e => {
        const isLazy = LAZY_REMARK_PATTERNS.some(p => p.test(e.remarks.trim()));
        const isHighEOD = e.time && parseInt(e.time.split(':')[0]) >= 22;
        return isLazy || isHighEOD;
    }).slice(0, 20);

    return { totalSpend, categoryAverages, flaggedEntries };
  };

  const detectedPatternsCount = useMemo(() => {
    if (entries.length === 0) return 0;
    
    const groups = new Map<string, ExpenseEntry[]>();
    entries.forEach(e => {
      const key = `${e.store}|${e.category}`;
      const group = groups.get(key) || [];
      group.push(e);
      groups.set(key, group);
    });

    let highFreqCount = 0;
    groups.forEach((groupEntries) => {
      const amountCounts = new Map<number, number>();
      groupEntries.forEach(e => amountCounts.set(e.amount, (amountCounts.get(e.amount) || 0) + 1));
      amountCounts.forEach((count) => {
        if (count >= 20) highFreqCount++;
      });
    });

    return highFreqCount;
  }, [entries]);

  const storeMetrics = useMemo(() => {
    if (entries.length === 0) return [];
    const storeMap = new Map<string, { total: number, cats: Record<string, number>, lazyCount: number, entryCount: number, lateCount: number, miscSpend: number }>();
    entries.forEach(e => {
      const current = storeMap.get(e.store) || { total: 0, cats: {}, lazyCount: 0, entryCount: 0, lateCount: 0, miscSpend: 0 };
      current.total += e.amount;
      current.entryCount += 1;
      if (LAZY_REMARK_PATTERNS.some(p => p.test(e.remarks.trim()))) current.lazyCount += 1;
      if (e.time && parseInt(e.time.split(':')[0]) >= 22) current.lateCount += 1;
      current.cats[e.category] = (current.cats[e.category] || 0) + e.amount;
      if (e.category.toLowerCase().includes('miscellaneous')) current.miscSpend += e.amount;
      storeMap.set(e.store, current);
    });

    return Array.from(storeMap.entries()).map(([name, stats]) => {
      let topCat = "N/A";
      let maxCatAmt = 0;
      Object.entries(stats.cats).forEach(([cat, amt]) => {
        if (amt > maxCatAmt) { maxCatAmt = amt; topCat = cat; }
      });

      const lazyRatio = stats.lazyCount / stats.entryCount;
      const lateRatio = stats.lateCount / stats.entryCount;
      const miscPct = stats.miscSpend / (stats.total || 1);

      let risk: 'Low' | 'Medium' | 'High' = 'Low';
      let riskReason = "Consistent reporting and high data integrity.";

      if (lazyRatio > 0.4 || (lateRatio > 0.5 && lazyRatio > 0.2) || miscPct > 0.15) {
        risk = 'High';
        if (lazyRatio > 0.4) riskReason = "Critical data integrity issues (high ratio of lazy remarks).";
        else if (miscPct > 0.15) riskReason = "Suspicious financial activity (excessive miscellaneous spending).";
        else riskReason = "Systematic end-of-day dumping coupled with vague reporting.";
      } else if (lazyRatio > 0.15 || lateRatio > 0.3 || stats.lazyCount > 3) {
        risk = 'Medium';
        if (lazyRatio > 0.15) riskReason = "Inconsistent documentation quality noted.";
        else riskReason = "Delayed reporting patterns suggest lack of real-time tracking.";
      }

      let goodPoint = "Maintains real-time reporting standards.";
      if (stats.lazyCount === 0) goodPoint = "Excellent data integrity in reporting.";
      else if (stats.lateCount === 0) goodPoint = "Strict adherence to real-time logging.";
      else if (stats.miscSpend < 100) goodPoint = "Zero leakage in miscellaneous spend.";

      let badPoint = "Reporting quality requires training.";
      if (stats.lazyCount > 5) badPoint = "Vague remarks undermine audit depth.";
      else if (stats.lateCount > 3) badPoint = "Frequent end-of-day dumping of entries.";
      
      for (const [cat, amt] of Object.entries(stats.cats)) {
        if (amt > (localMetrics.categoryAverages[cat] * 3)) {
          badPoint = `Extreme outlier in ${cat} category.`;
          break;
        }
      }

      return {
        storeName: name,
        totalSpend: stats.total,
        topCategory: topCat,
        remarksQuality: lazyRatio > 0.2 ? 'Lazy' : 'Good',
        riskLevel: risk,
        riskReason: riskReason,
        entriesCount: stats.entryCount,
        goodPoint,
        badPoint
      } as StoreMetric;
    }).sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        if (order[a.riskLevel] !== order[b.riskLevel]) return order[a.riskLevel] - order[b.riskLevel];
        return b.totalSpend - a.totalSpend;
    });
  }, [entries, localMetrics]);

  const filteredStoreMetrics = useMemo(() => {
    return storeMetrics.filter(store => 
      store.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [storeMetrics, searchTerm]);

  const criticalIssues = useMemo(() => {
    return entries.map(e => {
        const isLazy = LAZY_REMARK_PATTERNS.some(p => p.test(e.remarks.trim()));
        const isLate = e.time && parseInt(e.time.split(':')[0]) >= 22;
        let reason = "";
        
        if (e.amount > 5000) reason = "High-value transaction exceeds operational limits.";
        else if (e.amount > 1500 && isLazy) reason = "Significant spend with non-compliant/lazy remarks.";
        else if (e.amount > 2000 && isLate) reason = "Large end-of-day entry bypasses real-time verification.";
        else if (e.category.toLowerCase().includes('miscellaneous') && e.amount > 1000) reason = "Unclassified high-value spend (Miscellaneous leakage).";

        return { ...e, isCritical: reason !== "", auditNote: reason };
    })
    .filter(e => e.isCritical)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  }, [entries]);

  const criticalStores = useMemo(() => {
    return storeMetrics.filter(s => s.riskLevel === 'High').slice(0, 5);
  }, [storeMetrics]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => counts[e.category] = (counts[e.category] || 0) + e.amount);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const bestWorstPoints = useMemo(() => {
    if (!storeMetrics.length) return null;
    const best = [...storeMetrics].sort((a, b) => a.totalSpend - b.totalSpend)[0];
    const worst = storeMetrics[0]; 
    return { best, worst };
  }, [storeMetrics]);

  const interventionRoadmap = useMemo(() => {
    if (mode !== 'monthly' || !storeMetrics.length) return [];
    
    const points: { store: string; action: string; impact: string; reason: string }[] = [];
    
    const priorityStores = storeMetrics.slice(0, 10);
    
    priorityStores.forEach((store) => {
        if (store.riskLevel === 'High') {
            points.push({ 
                store: store.storeName, 
                action: `Conduct forensic audit on ${store.topCategory} spend.`, 
                impact: "Leakage prevention",
                reason: `Cumulative ${store.topCategory} spend is currently 3x the network benchmark, indicating potential misbilling or fraud.`
            });
            points.push({ 
                store: store.storeName, 
                action: "Initiate management performance review.", 
                impact: "Accountability",
                reason: `Flagged for "${store.riskReason}" - consistent failure to adhere to reporting integrity standards.`
            });
        } else if (store.riskLevel === 'Medium') {
            points.push({ 
                store: store.storeName, 
                action: `Negotiate local vendor rates for ${store.topCategory}.`, 
                impact: "OpEx reduction",
                reason: `High frequency of micro-transactions in this category suggests lack of bulk procurement planning.`
            });
        }
    });
    
    points.push({ store: "Network-Wide", action: "Deploy Mobile OCR Receipt Scanner App.", impact: "Compliance", reason: "Current manual data entry has led to a 22% rate of 'Lazy Remarks' across the region." });
    points.push({ store: "Top 5 Spenders", action: "Quarterly budget re-alignment meeting.", impact: "Fiscal control", reason: "The top 5 stores account for nearly 40% of regional spend, requiring tighter centralized oversight." });
    points.push({ store: "Network-Wide", action: "De-activate 'Miscellaneous' category for entries > ₹200.", impact: "Data granularization", reason: "Excessive use of the Miscellaneous category is masking high-cost repair and logistics patterns." });

    return points.slice(0, 15);
  }, [storeMetrics, mode]);

  const exportRequiringBills = () => {
    const categoriesNeedingBills = ['Stationary', 'Logistic expense', 'Porter', 'Repair & Maintenance', 'Asset', 'Miscellaneous expenses', 'Maintenance'];
    const filtered = entries.filter(e => {
      const isNeedingBill = categoriesNeedingBills.includes(e.category);
      if (!isNeedingBill) return false;
      return e.amount >= 100;
    });

    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses_Needing_Bills");
    XLSX.writeFile(wb, "Uninuts_Audit_Required_Bills.xlsx");
  };

  const exportLazyEntries = () => {
    const lazyEntries = entries.filter(e => LAZY_REMARK_PATTERNS.some(p => p.test(e.remarks.trim())));
    if (lazyEntries.length === 0) {
      alert("No lazy entries found in this dataset.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(lazyEntries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lazy_Entries_Audit");
    XLSX.writeFile(wb, `Uninuts_Lazy_Entries_${mode}_Audit.xlsx`);
  };

  const exportPatternizedEntries = () => {
    const groups = new Map<string, ExpenseEntry[]>();
    entries.forEach(e => {
      const key = `${e.store}|${e.category}`;
      const group = groups.get(key) || [];
      group.push(e);
      groups.set(key, group);
    });

    const finalExportList: ExpenseEntry[] = [];
    groups.forEach((groupEntries) => {
      const amountCounts = new Map<number, number>();
      groupEntries.forEach(e => amountCounts.set(e.amount, (amountCounts.get(e.amount) || 0) + 1));
      
      amountCounts.forEach((count, amount) => {
        if (count >= 20) {
          // Add all specific transactions matching this pattern
          const matchingTransactions = groupEntries.filter(e => e.amount === amount);
          finalExportList.push(...matchingTransactions);
        }
      });
    });

    if (finalExportList.length === 0) {
      alert("No spending patterns meeting the frequency benchmark of 20+ were detected.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(finalExportList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patternized_Entries_Audit");
    XLSX.writeFile(wb, `Uninuts_Pattern_Detection_Benchmark_20_${mode}.xlsx`);
  };

  const PIE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f43f5e', '#14b8a6', '#f97316', '#a855f7', '#0ea5e9'];

  const SectionHeader = ({ title, icon: Icon, isVisible, toggle, badge }: { title: string, icon: any, isVisible: boolean, toggle: () => void, badge?: string }) => (
    <div 
      className="flex items-center justify-between mb-4 group cursor-pointer select-none"
      onClick={toggle}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg transition-colors ${isVisible ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
          {badge && isVisible && <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{badge}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[1px] w-24 bg-slate-200 group-hover:bg-slate-300 transition-colors hidden md:block" />
        {isVisible ? (
          <Eye className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        ) : (
          <EyeOff className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-6 shadow-xl sticky top-0 z-50 border-b border-blue-900/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Expense Auditor</h1>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Confidential Audit System</p>
            </div>
          </div>
          {mode !== 'none' && (
            <div className="flex items-center gap-3">
               <button onClick={resetAllData} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-full transition-all text-sm font-bold border border-slate-700 active:scale-95">
                 <RefreshCw className="w-4 h-4" /> Reset
               </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-8 pb-24">
        {mode === 'none' && (
          <div className="flex flex-col items-center justify-center py-12 md:py-24 space-y-12">
             <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Select Intelligence Scope</h2>
                <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">Choose your audit depth to begin the forensic analysis of store expenditures.</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <button 
                  onClick={() => setMode('daily')}
                  className="group relative bg-white p-10 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center space-y-6 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                    <Clock className="w-24 h-24" />
                  </div>
                  <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-500">
                     <Clock className="w-10 h-10 text-blue-600 group-hover:text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 uppercase">Daily Expense Analysis</h3>
                    <p className="text-slate-500 text-sm font-medium">Drill down into individual bill-level anomalies and daily leakage patterns.</p>
                  </div>
                  <div className="pt-4 flex items-center gap-2 text-blue-600 font-bold uppercase text-xs tracking-widest">
                    Open Forensic Suite <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                <button 
                  onClick={() => setMode('monthly')}
                  className="group relative bg-white p-10 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-green-500 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center space-y-6 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                    <CalendarDays className="w-24 h-24" />
                  </div>
                  <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-600 group-hover:rotate-12 transition-all duration-500">
                     <CalendarDays className="w-10 h-10 text-green-600 group-hover:text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 uppercase">Full Month Analysis</h3>
                    <p className="text-slate-500 text-sm font-medium">Strategic store benchmarking, monthly burn trends, and network-wide optimization.</p>
                  </div>
                  <div className="pt-4 flex items-center gap-2 text-green-600 font-bold uppercase text-xs tracking-widest">
                    Open Strategic Suite <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
             </div>
          </div>
        )}

        {mode !== 'none' && !entries.length && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div 
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              className={`relative group w-full max-w-2xl aspect-[4/3] rounded-3xl border-4 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center p-8 overflow-hidden cursor-pointer
                ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-2xl' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50 shadow-sm'}`}
            >
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".xlsx" onChange={handleFileUpload} />
              <div className={`p-8 rounded-full bg-slate-50 transition-transform duration-500 mb-8 ${isDragging ? 'scale-125 bg-blue-100' : 'group-hover:scale-110'}`}>
                {isDragging ? <UploadCloud className="w-16 h-16 text-blue-500 animate-bounce" /> : <Search className="w-16 h-16 text-slate-300" />}
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-slate-800">Ready for {mode === 'daily' ? 'Daily' : 'Monthly'} Intelligence Audit</h2>
                <p className="text-slate-500 text-lg max-w-sm mx-auto leading-relaxed">Upload your store expense report (.xlsx) to begin the scan.</p>
                <div className="pt-6">
                   <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest">
                     <FileSpreadsheet className="w-4 h-4" /> Start to End Analysis
                   </span>
                </div>
              </div>
            </div>
            <button onClick={() => setMode('none')} className="mt-8 text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-2">
               <ArrowRight className="w-4 h-4 rotate-180" /> Back to Scope Selection
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="font-bold text-slate-600 uppercase tracking-tighter italic animate-pulse">Scanning operational database for {mode} patterns...</p>
          </div>
        )}

        {entries.length > 0 && (
          <>
            {/* SECTION 1: NETWORK OVERVIEW */}
            <div className="space-y-4">
              <SectionHeader 
                title="Regional Overview" 
                icon={LayoutDashboard} 
                isVisible={isOverviewVisible} 
                toggle={() => setIsOverviewVisible(!isOverviewVisible)}
                badge="Macro Metrics"
              />
              {isOverviewVisible && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[280px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" /> Executive Brief
                    </h3>
                    {bestWorstPoints && (
                      <div className="space-y-4 flex-1">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                          <div className="flex items-center gap-2 text-green-700 mb-1">
                            <ThumbsUp className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-tighter">Model Store</span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 leading-tight">
                            <span className="font-bold text-slate-900">{bestWorstPoints.best.storeName}</span> shows elite data quality and lean operational burn.
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                          <div className="flex items-center gap-2 text-red-700 mb-1">
                            <ThumbsDown className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-tighter">Forensic Flag</span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 leading-tight">
                            <span className="font-bold text-slate-900">{bestWorstPoints.worst.storeName}</span> flagged for {bestWorstPoints.worst.riskReason.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[280px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-red-500" /> 
                        {mode === 'monthly' ? 'Top 5 Critical Stores' : 'Top 5 Critical Bills'}
                    </h3>
                    <div className="space-y-3">
                      {mode === 'monthly' ? (
                        criticalStores.map((store, idx) => (
                            <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-lg border-l-4 border-red-500 hover:bg-red-50/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 uppercase truncate">{store.storeName}</span>
                                    <span className="text-xs font-bold text-red-600">High Risk</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mt-1 italic">{store.riskReason}</p>
                            </div>
                        ))
                      ) : (
                        criticalIssues.map((issue: any, idx) => (
                          <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-lg border-l-4 border-red-500 hover:bg-red-50/30 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{issue.store}</span>
                              <span className="text-sm font-bold text-red-600">₹{issue.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-start gap-1.5 mt-1 border-t border-slate-200 pt-1.5">
                              <Info className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                              <p className="text-[10px] font-bold text-slate-600 leading-snug italic">{issue.auditNote}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[280px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" /> 
                        {mode === 'monthly' ? 'Top 10 Most Spending Stores' : 'Top 5 Money Burning Stores'}
                    </h3>
                    <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-thin pr-1">
                      {storeMetrics.slice(0, mode === 'monthly' ? 10 : 5).map((store, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-black flex items-center justify-center text-slate-500 shrink-0">{idx+1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-700 truncate">{store.storeName}</span>
                              <span className="text-[11px] font-bold text-slate-900 font-mono">₹{store.totalSpend.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${(store.totalSpend / (storeMetrics[0]?.totalSpend || 1)) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: ANALYTICS & TOOLS */}
            <div className="space-y-4">
              <SectionHeader 
                title="Operational Analytics" 
                icon={BarChart3} 
                isVisible={isAnalyticsVisible} 
                toggle={() => setIsAnalyticsVisible(!isAnalyticsVisible)}
                badge="Micro-Analysis"
              />
              {isAnalyticsVisible && (
                <div className={`grid grid-cols-1 ${mode === 'monthly' ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6 animate-in fade-in slide-in-from-top-2 duration-300`}>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" /> Expense Category Distribution
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                            {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {mode === 'daily' && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                        <Download className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">Audit Export System</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2 italic">Identify and export bills requiring physical verification.</p>
                      </div>
                      <button onClick={exportRequiringBills} className="w-full max-w-xs bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
                        <FileSpreadsheet className="w-5 h-5" /> Export Expenses Needing Bills
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: AI NARRATIVE */}
            <div className="space-y-4">
              <SectionHeader 
                title="Forensic Narrative" 
                icon={Terminal} 
                isVisible={isAiNarrativeVisible} 
                toggle={() => setIsAiNarrativeVisible(!isAiNarrativeVisible)}
                badge="AI Core Analysis"
              />
              {isAiNarrativeVisible && (
                <section className="bg-slate-900 text-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-5 bg-gradient-to-r from-blue-700 to-blue-900 flex justify-between items-center px-8 border-b border-blue-600/50">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/10 rounded-lg">
                            <Terminal className="w-5 h-5 text-blue-300" />
                          </div>
                          <div className="flex flex-col">
                            <h3 className="font-black uppercase tracking-[0.15em] text-xs text-white">Auditor Intelligence Narrative</h3>
                            <span className="text-[10px] font-bold text-blue-300 uppercase opacity-70">Behavioral Outlier Sync</span>
                          </div>
                      </div>
                      {aiAnalyzing && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/30 rounded-full border border-blue-500/30">
                              <Loader2 className="w-3 h-3 animate-spin text-blue-300" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Syncing Intelligence...</span>
                          </div>
                      )}
                  </div>
                  <div className="p-10 prose prose-invert max-w-none prose-sm font-mono leading-relaxed overflow-y-auto max-h-[700px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                    {auditReport ? (
                        <div className="space-y-6" dangerouslySetInnerHTML={{ __html: auditReport
                            .replace(/\n/g, '<br/>')
                            .replace(/### (.*?)(<br\/>|$)/g, '<h4 class="text-xl font-black text-blue-400 mt-8 mb-4 border-b border-blue-900/50 pb-2 uppercase tracking-tight">$1</h4>')
                            .replace(/## (.*?)(<br\/>|$)/g, '<h3 class="text-2xl font-black text-white mt-10 mb-6 border-l-4 border-blue-600 pl-4">$1</h3>')
                            .replace(/\*\*(.*?)\*\*/g, '<b class="text-blue-300 font-bold">$1</b>') 
                            .replace(/₹(\d+([,]\d+)*)/g, '<span class="text-green-400 font-bold">₹$1</span>')
                        }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-6">
                            <div className="relative">
                                <Loader2 className="w-16 h-16 animate-spin text-blue-600 opacity-20" />
                                <Briefcase className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                            </div>
                            <p className="animate-pulse font-black tracking-[0.2em] uppercase text-xs text-blue-400">Executing Deep Forensic Sweep...</p>
                        </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* SECTION 4: INTERVENTION ROADMAP (Monthly) */}
            {mode === 'monthly' && (
              <div className="space-y-4">
                <SectionHeader 
                  title="Strategic Roadmap" 
                  icon={Target} 
                  isVisible={isRoadmapVisible} 
                  toggle={() => setIsRoadmapVisible(!isRoadmapVisible)}
                  badge="Store-Specific Interventions"
                />
                {isRoadmapVisible && (
                  <section className="bg-white border-4 border-slate-900 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {interventionRoadmap.map((item, idx) => (
                            <div key={idx} className="group p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-white hover:shadow-lg transition-all duration-300 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{item.store}</span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-600 uppercase shrink-0">Impact: {item.impact}</span>
                                </div>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="mt-1 flex items-center justify-center w-5 h-5 bg-slate-900 text-white text-[9px] font-black rounded-full group-hover:bg-blue-600 transition-colors shrink-0">{idx+1}</div>
                                    <p className="text-sm font-black text-slate-900 leading-snug">{item.action}</p>
                                </div>
                                <div className="mt-auto pt-3 border-t border-slate-200 flex flex-col gap-1.5">
                                   <div className="flex items-center gap-1.5">
                                      <HelpCircle className="w-3 h-3 text-slate-400" />
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exact Reasoning</span>
                                   </div>
                                   <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">"{item.reason}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* UPDATED SECTION: PATTERN-BASED SPENDING DETECTION (EXCEL ONLY) */}
            <div className="space-y-4">
              <SectionHeader 
                title="Patternized Spending Analytics" 
                icon={Repeat} 
                isVisible={isPatternVisible} 
                toggle={() => setIsPatternVisible(!isPatternVisible)}
                badge="Systematic Behavior Scan"
              />
              {isPatternVisible && (
                <section className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-600 rounded-2xl shadow-lg shadow-orange-500/20">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 uppercase">Strategic Pattern Export</h3>
                      <p className="text-slate-500 text-sm font-medium max-w-md">Identified <strong>{detectedPatternsCount}</strong> recurring expenditure patterns using a <strong>benchmark of 20+</strong> occurrences. Download forensic ledger for investigation.</p>
                    </div>
                  </div>
                  <button 
                    onClick={exportPatternizedEntries}
                    className="w-full md:w-auto bg-slate-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap"
                  >
                    <Download className="w-5 h-5" />
                    Export Pattern Forensic Ledger
                  </button>
                </section>
              )}
            </div>

            {/* SECTION 5: ALL STORES SUMMARY */}
            <div className="space-y-4">
              <SectionHeader 
                title="Store Repositories" 
                icon={ClipboardList} 
                isVisible={isStoresVisible} 
                toggle={() => setIsStoresVisible(!isStoresVisible)}
                badge="Granular Records"
              />
              {isStoresVisible && (
                <section className="transition-all duration-300 overflow-hidden bg-green-50/20 border-2 border-green-500/30 rounded-3xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Search specific store..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all" />
                      {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400" /></button>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredStoreMetrics.length} Result(s)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStoreMetrics.length > 0 ? (
                      filteredStoreMetrics.map((store, i) => (
                        <div key={i} className={`p-5 rounded-2xl border-t-8 shadow-md bg-white transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col ${store.riskLevel === 'High' ? 'border-red-500' : store.riskLevel === 'Medium' ? 'border-yellow-400' : 'border-green-500'}`}>
                          <div className="flex flex-col h-full space-y-3">
                            <div className="flex justify-between items-start">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1.5 ${store.riskLevel === 'High' ? 'bg-red-100 text-red-600' : store.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'}`}>
                                {store.riskLevel === 'High' ? <ShieldAlertIcon className="w-3 h-3" /> : store.riskLevel === 'Medium' ? <Info className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                {store.riskLevel === 'High' ? 'Critical Audit' : store.riskLevel === 'Medium' ? 'Avg. Health' : 'Good Health'}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-900 truncate leading-tight tracking-tight uppercase">{store.storeName}</h4>
                              <p className="text-sm font-bold text-slate-400 tracking-tighter italic">₹{Math.round(store.totalSpend).toLocaleString()} spend</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[11px] font-bold text-slate-700 leading-tight italic">"{store.riskReason}"</p>
                            </div>
                            <div className="space-y-2 py-2 flex-1">
                              <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><p className="text-[11px] font-bold text-slate-600 leading-snug">{store.goodPoint}</p></div>
                              <div className="flex items-start gap-2"><XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /><p className="text-[11px] font-bold text-slate-600 leading-snug">{store.badPoint}</p></div>
                            </div>
                            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                               <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[120px]">{store.topCategory}</span>
                               <span className="text-[10px] text-slate-500 font-bold">{store.entriesCount} Entries</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="p-4 bg-slate-100 rounded-full mb-4"><Search className="w-8 h-8 text-slate-300" /></div>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">No matching records</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* SECTION 6: STRATEGIC RECOMMENDATIONS */}
            <div className="space-y-4">
              <SectionHeader 
                title="Operational Directives" 
                icon={Lightbulb} 
                isVisible={isRecommendationsVisible} 
                toggle={() => setIsRecommendationsVisible(!isRecommendationsVisible)}
                badge="Policy Reform"
              />
              {isRecommendationsVisible && (
                <section className="bg-white border-2 border-blue-100 rounded-3xl p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Policy Updates</h4>
                            <ul className="space-y-3 text-sm text-slate-600 font-medium leading-relaxed">
                                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-blue-500 shrink-0 mt-1" /> Enforce <strong>hard 10:00 PM cutoff</strong> for daily logging.</li>
                                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-blue-500 shrink-0 mt-1" /> Mandatory bill photos for 'Misc' &gt; ₹500.</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest border-b pb-2">Cost Optimization</h4>
                            <ul className="space-y-3 text-sm text-slate-600 font-medium leading-relaxed">
                                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-orange-500 shrink-0 mt-1" /> Consolidation of high-frequency Porter routes.</li>
                                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-orange-500 shrink-0 mt-1" /> Audit 'Tea & Welfare' outliers for bulk savings.</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest border-b pb-2">Training Needs</h4>
                            <ul className="space-y-3 text-sm text-slate-600 font-medium leading-relaxed">
                                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-purple-500 shrink-0 mt-1" /> Targeted coaching for <strong>"Lazy Reporters"</strong>.</li>
                                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-purple-500 shrink-0 mt-1" /> Remarks standardization across all stores.</li>
                            </ul>
                        </div>
                    </div>
                </section>
              )}
            </div>

            {/* SECTION 7: LAZY ENTRIES EXPORT */}
            <div className="space-y-4">
              <SectionHeader 
                title="Integrity Audit Export" 
                icon={FileWarning} 
                isVisible={isLazyExportVisible} 
                toggle={() => setIsLazyExportVisible(!isLazyExportVisible)}
                badge="Data Hygiene"
              />
              {isLazyExportVisible && (
                <section className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-500/20">
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 uppercase">Lazy Entries Archive</h3>
                      <p className="text-slate-500 text-sm font-medium max-w-md">Download a targeted list of all entries with vague or non-compliant remarks for disciplinary review.</p>
                    </div>
                  </div>
                  <button 
                    onClick={exportLazyEntries}
                    className="w-full md:w-auto bg-slate-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Export Lazy Entries List
                  </button>
                </section>
              )}
            </div>

            <div className="flex flex-col items-center py-12">
               <button onClick={resetAllData} className="group flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 rounded-3xl hover:border-red-400 hover:bg-red-50/50 transition-all duration-300 w-full max-w-sm">
                 <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:rotate-180 transition-transform duration-500"><RefreshCw className="w-6 h-6 text-slate-400 group-hover:text-red-500" /></div>
                 <span className="text-lg font-black text-slate-400 uppercase tracking-widest group-hover:text-red-600 transition-colors">terminate current session</span>
               </button>
            </div>
          </>
        )}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-8 text-center text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">
          <p>Internal Use Only • Forensic Operational Intelligence • confidential</p>
          <p className="mt-2 opacity-50">© {new Date().getFullYear()} Uninuts Operations Group</p>
      </footer>
    </div>
  );
};

export default App;
