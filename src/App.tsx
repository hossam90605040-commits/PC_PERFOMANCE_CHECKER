import React, { useState, useEffect } from 'react';
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
  const [lang, setLang] = useState<'en' | 'ar'>('en');
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
  const [availableQualities, setAvailableQualities] = useState<string[]>(['Low', 'Medium', 'High', 'Ultra']);
  const [availableResolutions, setAvailableResolutions] = useState<string[]>(['720p', '1080p', '1440p', '4K']);
  const [gameRequirements, setGameRequirements] = useState<{ 
    minimum: string; 
    recommended: string;
    minStructured?: { cpu: string; gpu: string; ram: string; storage: string; os: string };
    recStructured?: { cpu: string; gpu: string; ram: string; storage: string; os: string };
  } | null>(null);
  const [isGameDetailsLoading, setIsGameDetailsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [suggestedGames, setSuggestedGames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isGameLoading, setIsGameLoading] = useState(false);
  const [popularGames, setPopularGames] = useState<Game[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=4&ordering=-added`);
        const data = await res.json();
        setPopularGames(data.results || []);

        const savedHistory = localStorage.getItem('gamespec_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    localStorage.setItem('gamespec_history', JSON.stringify(history));
  }, [history]);

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

        const initialMin = rawReqs.minimum.replace(/Minimum:|Minimum/gi, '').trim();
        const initialRec = rawReqs.recommended.replace(/Recommended:|Recommended/gi, '').trim();

        setGameRequirements({ minimum: initialMin, recommended: initialRec });

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `For the game "${selectedGame.name}", provide: 1. Graphics presets, 2. Resolutions, 3. Structured PC requirements (CPU, GPU, RAM, Storage, OS). JSON format only.`;
          
          const response = await model.generateContent(prompt);
          // هنا تكملة منطق معالجة الـ AI الخاص بك...
        }
      } catch (err) {
        console.error("Error fetching game details:", err);
      } finally {
        setIsGameDetailsLoading(false);
      }
    };
    fetchGameDetails();
  }, [selectedGame]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (gameSearch.length > 2 && !selectedGame) {
        setIsGameLoading(true);
        try {
          const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameSearch)}&page_size=5`);
          const data = await res.json();
          setGameSuggestions(data.results || []);
        } catch (err) {
          console.error(err);
        } finally {
          setIsGameLoading(false);
        }
      } else {
        setGameSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [gameSearch, selectedGame]);

  // Autocomplete for CPU
  useEffect(() => {
    if (cpuSearch.length > 1 && !selectedCpu) {
      const filtered = CPU_DATA.filter(item => 
        item.name.toLowerCase().includes(cpuSearch.toLowerCase())
      ).slice(0, 5);
      setCpuSuggestions(filtered);
    } else {
      setCpuSuggestions([]);
    }
  }, [cpuSearch, selectedCpu]);

  // Autocomplete for GPU
  useEffect(() => {
    if (gpuSearch.length > 1 && !selectedGpu) {
      const filtered = GPU_DATA.filter(item => 
        item.name.toLowerCase().includes(gpuSearch.toLowerCase())
      ).slice(0, 5);
      setGpuSuggestions(filtered);
    } else {
      setGpuSuggestions([]);
    }
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
      if (!apiKey) throw new Error("Gemini API key is missing");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const analysisPrompt = `Analyze performance for ${selectedGame.name} on CPU: ${selectedCpu.name}, GPU: ${selectedGpu.name}, RAM: ${ram}GB at ${targetResolution} ${targetQuality}. Return JSON.`;
      const result = await model.generateContent(analysisPrompt);
      const analysisData = JSON.parse(result.response.text());
      setResult(analysisData);
      
      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        game: selectedGame,
        cpu: selectedCpu,
        gpu: selectedGpu,
        ram,
        quality: targetQuality,
        resolution: targetResolution,
        result: analysisData
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Runs High': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'Runs Medium': return 'text-sky-400 border-sky-400/30 bg-sky-400/10';
      case 'Runs Low': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'Will Not Run': return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setSelectedGame(item.game);
    setSelectedCpu(item.cpu);
    setSelectedGpu(item.gpu);
    setRam(item.ram);
    setTargetQuality(item.quality);
    setTargetResolution(item.resolution);
    setResult(item.result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 font-sans selection:bg-indigo-500/30" dir={t.dir}>
      <div className={`fixed top-6 ${lang === 'ar' ? 'left-6' : 'right-6'} z-50`}>
        <button 
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="px-4 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-2xl"
        >
          {t.langBtn}
        </button>
      </div>

      <div className="relative h-[40vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src={selectedGame?.background_image || "https://picsum.photos/seed/gaming/1920/1080?blur=4"} 
            className="w-full h-full object-cover opacity-30 scale-105 transition-all duration-1000"
            alt="Background"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0c]/80 to-[#0a0a0c]" />
        </div>
        <div className="relative z-10 text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic mb-4"
          >
            {t.heroTitle} <span className="text-indigo-500">{t.heroTitleSpan}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-zinc-400 text-lg max-w-2xl mx-auto font-medium">{t.heroSubtitle}</motion.p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-20 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-500" />{t.configTitle}</h2>
              <div className="space-y-8">
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.selectGame}</label>
                  <div className="relative group">
                    <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors`} />
                    <input 
                      type="text"
                      placeholder={t.gamePlaceholder}
                      className={`w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg`}
                      value={selectedGame ? selectedGame.name : gameSearch}
                      onChange={(e) => { setGameSearch(e.target.value); setSelectedGame(null); setResult(null); }}
                    />
                    {isGameLoading && <Loader2 className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin`} />}
                  </div>
                  <AnimatePresence>
                    {gameSuggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        {gameSuggestions.map(game => (
                          <button key={game.id} onClick={() => { setSelectedGame(game); setGameSuggestions([]); setGameSearch(''); }} className="w-full flex items-center gap-4 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                            <img src={game.background_image} className="w-16 h-10 object-cover rounded-lg" alt={game.name} referrerPolicy="no-referrer" />
                            <span className="font-bold">{game.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.processor}</label>
                    <div className="relative group">
                      <Cpu className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors`} />
                      <input 
                        type="text" placeholder={t.cpuPlaceholder}
                        className={`w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all`}
                        value={selectedCpu ? selectedCpu.name : cpuSearch}
                        onChange={(e) => { setCpuSearch(e.target.value); setSelectedCpu(null); }}
                      />
                    </div>
                    {cpuSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        {cpuSuggestions.map(cpu => (
                          <button key={cpu.name} onClick={() => { setSelectedCpu(cpu); setCpuSuggestions([]); setCpuSearch(''); }} className="w-full p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 font-medium">{cpu.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.graphics}</label>
                    <div className="relative group">
                      <Monitor className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors`} />
                      <input 
                        type="text" placeholder={t.gpuPlaceholder}
                        className={`w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all`}
                        value={selectedGpu ? selectedGpu.name : gpuSearch}
                        onChange={(e) => { setGpuSearch(e.target.value); setSelectedGpu(null); }}
                      />
                    </div>
                    {gpuSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        {gpuSuggestions.map(gpu => (
                          <button key={gpu.name} onClick={() => { setSelectedGpu(gpu); setGpuSuggestions([]); setGpuSearch(''); }} className="w-full p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 font-medium">{gpu.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.ram}</label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="4" max="64" step="4" value={ram} onChange={(e) => setRam(parseInt(e.target.value))} className="flex-1 accent-indigo-500" />
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2 font-black text-indigo-400 min-w-[80px] text-center">{ram} {lang === 'ar' ? 'جيجابايت' : 'GB'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.quality}</label>
                    <select value={targetQuality} onChange={(e) => setTargetQuality(e.target.value)} className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                      {availableQualities.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.resolution}</label>
                    <select value={targetResolution} onChange={(e) => setTargetResolution(e.target.value)} className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                      {availableResolutions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400"><AlertCircle className="w-5 h-5" /><p className="text-sm font-medium">{error}</p></div>}

                <button 
                  onClick={handleAnalyze} disabled={isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <><Loader2 className="w-6 h-6 animate-spin" />{t.analyzing}</> : <>{t.analyzeBtn}<ChevronRight className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} /></>}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            {!result ? (
              <div className="h-full bg-zinc-900/30 border border-white/5 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-10 h-10 text-zinc-600 mb-4" />
                <h3 className="text-xl font-bold text-zinc-400">{t.readyTitle}</h3>
                <p className="text-zinc-500 text-sm max-w-xs">{t.readyDesc}</p>
              </div>
            ) : (
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
                <div className="text-center space-y-4">
                  <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full border font-black uppercase tracking-widest text-sm ${getStatusColor(result.status)}`}>
                    {result.status === 'Will Not Run' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {result.status}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-6xl font-black tracking-tighter text-white">{result.estimatedFps} <span className="text-2xl text-zinc-500 uppercase">{t.fps}</span></h3>
                    <p className="text-zinc-400 font-medium italic">{t.estimatedAt} {targetResolution} {targetQuality}</p>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2"><Info className="w-3 h-3" />{t.summary}</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">{result.explanation}</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <HardwareMatch label={lang === 'ar' ? "المعالج" : "CPU"} match={result.cpuMatch || t.hardwareMatch} />
                  <HardwareMatch label={lang === 'ar' ? "كرت الشاشة" : "GPU"} match={result.gpuMatch || t.hardwareMatch} />
                  <HardwareMatch label={lang === 'ar' ? "الرام" : "RAM"} match={result.ramMatch || t.hardwareMatch} />
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedGame && (
          <div className="mt-12 space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-zinc-700 text-center uppercase">Requirements</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8">
                <h3 className="text-lg font-bold mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-500" />{t.minReq}</h3>
                <div className="text-zinc-500 text-sm whitespace-pre-line leading-relaxed">{gameRequirements?.minimum || t.noData}</div>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8">
                <h3 className="text-lg font-bold mb-6 text-indigo-400/80 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" />{t.recReq}</h3>
                <div className="text-zinc-500 text-sm whitespace-pre-line leading-relaxed">{gameRequirements?.recommended || t.noData}</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-white/5 text-center text-zinc-600 text-sm">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}

function RequirementItem({ icon, label, value, className = "" }: { icon: React.ReactNode, label: string, value: string, className?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors ${className}`}>
      <div className="mt-0.5 text-indigo-400 opacity-70 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">{label}</p>
        <p className="text-xs font-medium text-zinc-300 break-words leading-tight">{value}</p>
      </div>
    </div>
  );
}

function HardwareMatch({ label, match }: { label: string, match: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-300">{match}</span>
    </div>
  );
}

function ProgressBar({ label, value, max }: { label: string, value: number, max: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
        <span className="text-zinc-500">{label}</span>
        <span className="text-indigo-400">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-indigo-500" />
      </div>
    </div>
  );
}