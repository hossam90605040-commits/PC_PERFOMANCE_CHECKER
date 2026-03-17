import React, { useState, useEffect, useRef } from 'react';
import { Search, Cpu, Monitor, Zap, CheckCircle2, XCircle, AlertCircle, BarChart3, Info, ChevronRight, Loader2, Database, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CPU_DATA, GPU_DATA, HardwareItem } from './data/hardware';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Game {
  id: number;
  name: string;
  background_image: string;
  platforms?: { requirements_en: { minimum: string; recommended: string } }[];
}

interface AnalysisResult {
  status: string;
  estimatedFps: number;
  explanation: string;
  cpuMatch?: string;
  gpuMatch?: string;
  ramMatch?: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  game: Game;
  cpu: HardwareItem;
  gpu: HardwareItem;
  ram: number;
  quality: string;
  resolution: string;
  result: AnalysisResult;
}

const translations = {
  en: {
    heroTitle: "PC Performance",
    heroTitleSpan: "Checker",
    heroSubtitle: "Analyze your hardware against thousands of games and get instant performance predictions.",
    configTitle: "PC Specifications",
    selectGame: "Select Game",
    gamePlaceholder: "Search for a game (e.g. Cyberpunk 2077)",
    processor: "Processor (CPU)",
    cpuPlaceholder: "e.g. Core i7-12700K",
    graphics: "Graphics Card (GPU)",
    gpuPlaceholder: "e.g. RTX 3060",
    ram: "System RAM",
    quality: "Target Quality",
    resolution: "Target Resolution",
    analyzeBtn: "Run Performance Check",
    analyzing: "Analyzing Hardware...",
    readyTitle: "Ready to Analyze",
    readyDesc: "Select a game and enter your PC specifications to see how it will perform.",
    fps: "FPS",
    estimatedAt: "Estimated at",
    settings: "Settings",
    summary: "Analysis Summary",
    clear: "Clear Results",
    errorSpecs: "Please select a game and your hardware specs.",
    popularTitle: "Popular Games",
    langBtn: "العربية",
    dir: "ltr" as const,
    hardwareMatch: "Matched",
    systemOnline: "System Online",
    minReq: "Minimum Requirements",
    recReq: "Recommended Requirements",
    noData: "No data available.",
    hwComparison: "Specifications Comparison",
    suggestedGames: "Suggested Games for your PC",
    footer: "© 2026 PC Performance Checker. Powered by RAWG & Gemini AI.",
    cpuScore: "CPU Performance",
    gpuScore: "GPU Performance",
    historyTitle: "Previous Analyses",
    historyEmpty: "No previous analyses yet.",
    viewResult: "View Result"
  },
  ar: {
    heroTitle: "اعرف قوة جهازك",
    heroTitleSpan: "للألعاب",
    heroSubtitle: "اختر اللعبة وأدخل مواصفات جهازك وشاهد الأداء المتوقع فوراً",
    configTitle: "مواصفات جهازك",
    selectGame: "اختر اللعبة",
    gamePlaceholder: "ابحث عن لعبة (مثال: Cyberpunk 2077)",
    processor: "المعالج (CPU)",
    cpuPlaceholder: "مثال: Core i7-12700K",
    graphics: "كرت الشاشة (GPU)",
    gpuPlaceholder: "مثال: RTX 3060",
    ram: "ذاكرة النظام",
    quality: "الجودة المطلوبة",
    resolution: "الدقة المطلوبة",
    analyzeBtn: "تحقق من الأداء",
    analyzing: "جاري تحليل العتاد...",
    readyTitle: "جاهز للتحليل",
    readyDesc: "اختر لعبة وأدخل مواصفات جهازك لترى كيف سيكون الأداء.",
    fps: "إطار",
    estimatedAt: "تقديري عند",
    settings: "إعدادات",
    summary: "ملخص التحليل",
    clear: "مسح النتائج",
    errorSpecs: "يرجى اختيار لعبة ومواصفات العتاد الخاصة بك.",
    popularTitle: "ألعاب شائعة",
    langBtn: "English",
    dir: "rtl" as const,
    hardwareMatch: "متوافق",
    systemOnline: "النظام متصل",
    minReq: "الحد الأدنى لمتطلبات التشغيل",
    recReq: "المتطلبات الموصى بها",
    noData: "لا توجد بيانات متاحة.",
    hwComparison: "مقارنة المواصفات",
    suggestedGames: "ألعاب مقترحة لجهازك",
    footer: "© 2026 فاحص أداء الحاسوب. بدعم من RAWG و Gemini AI.",
    cpuScore: "أداء المعالج",
    gpuScore: "أداء كرت الشاشة",
    historyTitle: "التحليلات السابقة",
    historyEmpty: "لا توجد تحليلات سابقة بعد.",
    viewResult: "عرض النتيجة"
  }
};

const RAWG_API_KEY = "454dc988e8f541819e5c1973f82380b6";

export default function App() {
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const t = translations[lang];
  
  const [gameSearch, setGameSearch] = useState('');
  const [gameSuggestions, setGameSuggestions] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [cpuSearch, setCpuSearch] = useState('');
  const [cpuSuggestions, setCpuSuggestions] = useState<HardwareItem[]>([]);
  const [selectedCpu, setSelectedCpu] = useState<HardwareItem | null>(null);
  const [gpuSearch, setGpuSearch] = useState('');
  const [gpuSuggestions, setGpuSuggestions] = useState<HardwareItem[]>([]);
  const [selectedGpu, setSelectedGpu] = useState<HardwareItem | null>(null);
  const [ram, setRam] = useState<number>(8);
  const [targetQuality, setTargetQuality] = useState('Medium');
  const [targetResolution, setTargetResolution] = useState('1080p');
  const [gameRequirements, setGameRequirements] = useState<{ minimum: string; recommended: string } | null>(null);
  const [isGameDetailsLoading, setIsGameDetailsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [popularGames, setPopularGames] = useState<Game[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=4&ordering=-added`);
        const data = await res.json();
        setPopularGames(data.results || []);
        const savedHistory = localStorage.getItem('gamespec_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
      } catch (err) { console.error(err); }
    };
    fetchInitialData();
  }, []);

  // Search Games Effect (Corrected for Netlify)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (gameSearch.length > 2 && !selectedGame) {
        setIsGameLoading(true);
        try {
          const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameSearch)}&page_size=5`);
          const data = await res.json();
          setGameSuggestions(data.results || []);
        } catch (err) { console.error(err); } finally { setIsGameLoading(false); }
      } else { setGameSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [gameSearch, selectedGame]);

  // Fetch Details Effect (Corrected for Netlify)
  useEffect(() => {
    if (!selectedGame) {
      setGameRequirements(null);
      return;
    }
    const fetchGameDetails = async () => {
      setIsGameDetailsLoading(true);
      try {
        const res = await fetch(`https://api.rawg.io/api/games/${selectedGame.id}?key=${RAWG_API_KEY}`);
        const data = await res.json();
        const pcPlatform = data.platforms?.find((p: any) => p.platform.slug === 'pc');
        const rawReqs = pcPlatform?.requirements_en || {
          minimum: "No specific requirements found.",
          recommended: "No specific requirements found."
        };
        setGameRequirements({
          minimum: rawReqs.minimum?.replace(/Minimum:|Minimum/gi, '').trim() || "Not available",
          recommended: rawReqs.recommended?.replace(/Recommended:|Recommended/gi, '').trim() || "Not available"
        });
      } catch (err) { console.error(err); } finally { setIsGameDetailsLoading(false); }
    };
    fetchGameDetails();
  }, [selectedGame]);

  // Hardware Autocomplete
  useEffect(() => {
    if (cpuSearch.length > 1 && !selectedCpu) {
      setCpuSuggestions(CPU_DATA.filter(item => item.name.toLowerCase().includes(cpuSearch.toLowerCase())).slice(0, 5));
    } else { setCpuSuggestions([]); }
  }, [cpuSearch, selectedCpu]);

  useEffect(() => {
    if (gpuSearch.length > 1 && !selectedGpu) {
      setGpuSuggestions(GPU_DATA.filter(item => item.name.toLowerCase().includes(gpuSearch.toLowerCase())).slice(0, 5));
    } else { setGpuSuggestions([]); }
  }, [gpuSearch, selectedGpu]);

  const handleAnalyze = async () => {
    if (!selectedGame || !selectedCpu || !selectedGpu) {
      setError(t.errorSpecs);
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is missing in Netlify settings");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze if this PC can run ${selectedGame.name}:
      CPU: ${selectedCpu.name}
      GPU: ${selectedGpu.name}
      RAM: ${ram}GB
      Target: ${targetResolution} at ${targetQuality} quality.
      Return ONLY a JSON object with: status (Runs High, Runs Medium, Runs Low, Will Not Run), estimatedFps (number), explanation (string), cpuMatch (string), gpuMatch (string), ramMatch (string).`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, '');
      const analysisData = JSON.parse(text);
      
      setResult(analysisData);
      setHistory(prev => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        game: selectedGame,
        cpu: selectedCpu,
        gpu: selectedGpu,
        ram,
        quality: targetQuality,
        resolution: targetResolution,
        result: analysisData
      }, ...prev].slice(0, 5));
    } catch (err: any) {
      setError("AI Analysis failed. Please check your API key.");
      console.error(err);
    } finally { setIsAnalyzing(false); }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('High')) return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    if (status.includes('Medium')) return 'text-sky-400 border-sky-400/30 bg-sky-400/10';
    if (status.includes('Low')) return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 font-sans selection:bg-indigo-500/30" dir={t.dir}>
      {/* Language Toggle */}
      <div className={`fixed top-6 ${lang === 'ar' ? 'left-6' : 'right-6'} z-50`}>
        <button 
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="px-4 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-2xl"
        >
          {t.langBtn}
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative h-[45vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={selectedGame?.background_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070"} 
            className="w-full h-full object-cover opacity-30 scale-105 transition-all duration-1000"
            alt="Background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0c]/80 to-[#0a0a0c]" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              AI Powered Hardware Analysis
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic mb-6 leading-none">
              {t.heroTitle} <span className="text-indigo-500">{t.heroTitleSpan}</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              {t.heroSubtitle}
            </p>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-24 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-indigo-500" />
                  </div>
                  {t.configTitle}
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t.systemOnline}
                </div>
              </div>

              <div className="space-y-8">
                {/* Game Search */}
                <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 ml-1">{t.selectGame}</label>
                  <div className="relative group">
                    <Search className={`absolute ${lang === 'ar' ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors`} />
                    <input 
                      type="text"
                      placeholder={t.gamePlaceholder}
                      className={`w-full bg-zinc-800/40 border border-white/5 rounded-2xl py-5 ${lang === 'ar' ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-lg font-medium placeholder:text-zinc-700`}
                      value={selectedGame ? selectedGame.name : gameSearch}
                      onChange={(e) => { setGameSearch(e.target.value); setSelectedGame(null); setResult(null); }}
                    />
                    {isGameLoading && <Loader2 className={`absolute ${lang === 'ar' ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin`} />}
                  </div>
                  <AnimatePresence>
                    {gameSuggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 left-0 right-0 mt-3 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        {gameSuggestions.map(game => (
                          <button key={game.id} onClick={() => { setSelectedGame(game); setGameSuggestions([]); setGameSearch(''); }} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                            <img src={game.background_image} className="w-20 h-12 object-cover rounded-lg shadow-lg" alt={game.name} />
                            <span className="font-bold text-zinc-200">{game.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CPU & GPU Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 ml-1">{t.processor}</label>
                    <div className="relative group">
                      <Cpu className={`absolute ${lang === 'ar' ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors`} />
                      <input 
                        type="text" placeholder={t.cpuPlaceholder}
                        className={`w-full bg-zinc-800/40 border border-white/5 rounded-2xl py-5 ${lang === 'ar' ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-medium placeholder:text-zinc-700`}
                        value={selectedCpu ? selectedCpu.name : cpuSearch}
                        onChange={(e) => { setCpuSearch(e.target.value); setSelectedCpu(null); }}
                      />
                    </div>
                    {cpuSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-3 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        {cpuSuggestions.map(cpu => (
                          <button key={cpu.name} onClick={() => { setSelectedCpu(cpu); setCpuSuggestions([]); setCpuSearch(''); }} className="w-full p-5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 font-bold text-zinc-300">{cpu.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 ml-1">{t.graphics}</label>
                    <div className="relative group">
                      <Monitor className={`absolute ${lang === 'ar' ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors`} />
                      <input 
                        type="text" placeholder={t.gpuPlaceholder}
                        className={`w-full bg-zinc-800/40 border border-white/5 rounded-2xl py-5 ${lang === 'ar' ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-medium placeholder:text-zinc-700`}
                        value={selectedGpu ? selectedGpu.name : gpuSearch}
                        onChange={(e) => { setGpuSearch(e.target.value); setSelectedGpu(null); }}
                      />
                    </div>
                    {gpuSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-3 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        {gpuSuggestions.map(gpu => (
                          <button key={gpu.name} onClick={() => { setSelectedGpu(gpu); setGpuSuggestions([]); setGpuSearch(''); }} className="w-full p-5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 font-bold text-zinc-300">{gpu.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RAM Slider */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-center mb-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t.ram}</label>
                    <div className="px-4 py-1.5 rounded-xl bg-indigo-500 text-white font-black text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                      {ram} GB
                    </div>
                  </div>
                  <input 
                    type="range" min="4" max="64" step="4" 
                    value={ram} onChange={(e) => setRam(parseInt(e.target.value))} 
                    className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500" 
                  />
                  <div className="flex justify-between mt-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    <span>4GB</span>
                    <span>64GB</span>
                  </div>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">{t.quality}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Low', 'Medium', 'High', 'Ultra'].map(q => (
                        <button 
                          key={q} onClick={() => setTargetQuality(q)}
                          className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${targetQuality === q ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' : 'bg-zinc-800/40 border-white/5 text-zinc-500 hover:bg-zinc-800'}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">{t.resolution}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['720p', '1080p', '1440p', '4K'].map(r => (
                        <button 
                          key={r} onClick={() => setTargetResolution(r)}
                          className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${targetResolution === r ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' : 'bg-zinc-800/40 border-white/5 text-zinc-500 hover:bg-zinc-800'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                  </motion.div>
                )}

                <button 
                  onClick={handleAnalyze} disabled={isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-black uppercase tracking-[0.2em] py-6 rounded-2xl transition-all flex items-center justify-center gap-3 group relative overflow-hidden shadow-[0_10px_40px_rgba(79,70,229,0.3)]"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-6 h-6 animate-spin" />{t.analyzing}</>
                  ) : (
                    <>
                      {t.analyzeBtn}
                      <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${lang === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div 
                  key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full bg-zinc-900/20 border-2 border-dashed border-white/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-6">
                    <BarChart3 className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-zinc-400 mb-3">{t.readyTitle}</h3>
                  <p className="text-zinc-600 text-sm max-w-[250px] font-medium leading-relaxed">{t.readyDesc}</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-10 sticky top-8"
                >
                  <div className="text-center space-y-6">
                    <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border font-black uppercase tracking-[0.15em] text-xs shadow-lg ${getStatusColor(result.status)}`}>
                      {result.status === 'Will Not Run' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {result.status}
                    </div>
                    <div className="space-y-2">
                      <div className="text-8xl font-black tracking-tighter text-white leading-none">
                        {result.estimatedFps}
                      </div>
                      <div className="text-zinc-500 font-black uppercase tracking-[0.3em] text-sm">{t.fps}</div>
                      <p className="text-zinc-500 font-bold italic pt-2">{t.estimatedAt} {targetResolution} @ {targetQuality}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4 flex items-center gap-2">
                        <Info className="w-3 h-3" /> {t.summary}
                      </h4>
                      <p className="text-zinc-300 text-sm leading-relaxed font-medium italic">"{result.explanation}"</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <HardwareMatch label={t.processor} match={result.cpuMatch || t.hardwareMatch} />
                      <HardwareMatch label={t.graphics} match={result.gpuMatch || t.hardwareMatch} />
                      <HardwareMatch label={t.ram} match={result.ramMatch || t.hardwareMatch} />
                    </div>
                  </div>

                  <button 
                    onClick={() => setResult(null)}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {t.clear}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Previous History */}
            {history.length > 0 && !result && (
              <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-600 mb-6 flex items-center gap-2">
                  <Database className="w-4 h-4" /> {t.historyTitle}
                </h3>
                <div className="space-y-4">
                  {history.map(item => (
                    <button 
                      key={item.id} onClick={() => { setSelectedGame(item.game); setSelectedCpu(item.cpu); setSelectedGpu(item.gpu); setRam(item.ram); setTargetQuality(item.quality); setTargetResolution(item.resolution); setResult(item.result); }}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                    >
                      <img src={item.game.background_image} className="w-12 h-12 object-cover rounded-xl opacity-50 group-hover:opacity-100 transition-opacity" alt="" />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-zinc-300">{item.game.name}</div>
                        <div className="text-[10px] text-zinc-600 font-bold uppercase">{item.result.status} • {item.result.estimatedFps} FPS</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Requirements Section */}
        {selectedGame && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-20 space-y-10">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic text-zinc-800 leading-none">Requirements</h2>
              <div className="h-1 w-20 bg-zinc-900 rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <AlertCircle className="w-32 h-32" />
                </div>
                <h3 className="text-lg font-black mb-8 text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  {t.minReq}
                </h3>
                {isGameDetailsLoading ? (
                  <div className="flex items-center gap-3 text-zinc-600 font-bold uppercase text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading requirements...
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm font-medium whitespace-pre-line leading-relaxed italic">
                    {gameRequirements?.minimum || t.noData}
                  </div>
                )}
              </div>

              <div className="bg-indigo-500/5 backdrop-blur-md border border-indigo-500/10 rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <CheckCircle2 className="w-32 h-32 text-indigo-500" />
                </div>
                <h3 className="text-lg font-black mb-8 text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  {t.recReq}
                </h3>
                {isGameDetailsLoading ? (
                  <div className="flex items-center gap-3 text-indigo-400/50 font-bold uppercase text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading requirements...
                  </div>
                ) : (
                  <div className="text-zinc-400 text-sm font-medium whitespace-pre-line leading-relaxed italic">
                    {gameRequirements?.recommended || t.noData}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-8">
          <div className="text-4xl font-black tracking-tighter uppercase italic opacity-20">
            {t.heroTitle} <span className="text-indigo-500">{t.heroTitleSpan}</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
            <a href="#" className="hover:text-indigo-500 transition-colors">Twitter</a>
            <a href="#" className="hover:text-indigo-500 transition-colors">Discord</a>
            <a href="#" className="hover:text-indigo-500 transition-colors">Github</a>
          </div>
          <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-[0.2em]">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}

function HardwareMatch({ label, match }: { label: string, match: string }) {
  const isMatch = match.toLowerCase().includes('match') || match.toLowerCase().includes('متوافق') || match.toLowerCase().includes('high') || match.toLowerCase().includes('medium');
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-500 transition-colors">{label}</span>
      <span className={`text-xs font-black uppercase tracking-widest ${isMatch ? 'text-indigo-400' : 'text-zinc-400'}`}>{match}</span>
    </div>
  );
}