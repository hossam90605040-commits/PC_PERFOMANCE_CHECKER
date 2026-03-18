import React, { useState, useEffect, useRef } from 'react';
import { Search, Cpu, Monitor, Zap, CheckCircle2, XCircle, AlertCircle, BarChart3, Info, ChevronRight, Loader2, Database, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CPU_DATA, GPU_DATA, HardwareItem } from './data/hardware';
import { GoogleGenAI, Type } from "@google/genai";

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
  const [config, setConfig] = useState<{ hasRawgKey: boolean; hasGeminiKey: boolean } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Fetch config and popular games on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        setConfig(configData);

        const res = await fetch('/api/games/search?q=popular');
        const data = await res.json();
        setPopularGames(data.slice(0, 4));

        // Load history
        const savedHistory = localStorage.getItem('gamespec_history');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    localStorage.setItem('gamespec_history', JSON.stringify(history));
  }, [history]);

  // Fetch game details and requirements when a game is selected
  useEffect(() => {
    if (!selectedGame) {
      setGameRequirements(null);
      return;
    }

    const fetchGameDetails = async () => {
      setIsGameDetailsLoading(true);
      try {
        const res = await fetch(`https://api.rawg.io/api/games/${selectedGame.id}?key=${import.meta.env.VITE_RAWG_API_KEY}`);
        const data = await res.json();
        const rawReqs = data.platforms?.find((p: any) => p.platform.slug === 'pc')?.requirements_en || {
          minimum: "No specific requirements found.",
          recommended: "No specific requirements found."
        };
        
        // Set initial requirements immediately for speed
        setGameRequirements({
          minimum: rawReqs.minimum.replace(/Minimum:|Minimum/gi, '').trim(),
          recommended: rawReqs.recommended.replace(/Recommended:|Recommended/gi, '').trim()
        });
      } catch (err) {
        console.error("Error fetching game details:", err);
      } finally {
        setIsGameDetailsLoading(false);
      }
    };

    fetchGameDetails();
  }, [selectedGame]);

  // Autocomplete for Games
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (gameSearch.length > 2 && !selectedGame) {
        setIsGameLoading(true);
        try {
          const res = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(gameSearch)}&key=${import.meta.env.VITE_RAWG_API_KEY}`);
          const data = await res.json();
          setGameSuggestions(data);
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
    setResult(null);

    try {
      const requirements = gameRequirements || {
        minimum: "No specific requirements found.",
        recommended: "No specific requirements found."
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
        // If the key is missing or still the placeholder, we'll try to proceed 
        // but the SDK will likely throw a better error if the platform hasn't injected it.
        // However, to be safe and follow guidelines, we'll just use it.
      }

      const ai = new GoogleGenAI({ apiKey: apiKey as string });

      // Analysis Prompt
      const analysisPrompt = `
        Analyze if a PC can run a game based on the requirements and user specs at ${targetResolution} ${targetQuality} settings.
        
        Game Requirements:
        ${JSON.stringify(requirements)}
        
        User PC Specs:
        CPU: ${selectedCpu.name} (Benchmark Score: ${selectedCpu.score})
        GPU: ${selectedGpu.name} (Benchmark Score: ${selectedGpu.score})
        RAM: ${ram}GB
        
        Target Resolution: ${targetResolution}
        Target Settings: ${targetQuality}
        
        Classify the performance as one of: "Runs High", "Runs Medium", "Runs Low", "Will Not Run".
        Also estimate the FPS at ${targetResolution} resolution with ${targetQuality} settings.
        Provide a brief explanation for the result in ${lang === 'ar' ? 'Arabic' : 'English'}.
        
        Return the result in JSON format.
      `;

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, description: "Performance classification" },
              estimatedFps: { type: Type.NUMBER, description: "Estimated FPS" },
              explanation: { type: Type.STRING, description: "Brief explanation" },
              cpuMatch: { type: Type.STRING, description: "How CPU compares" },
              gpuMatch: { type: Type.STRING, description: "How GPU compares" },
              ramMatch: { type: Type.STRING, description: "How RAM compares" }
            },
            required: ["status", "estimatedFps", "explanation"]
          }
        }
      });

      const analysisData = JSON.parse(analysisResponse.text);
      setResult(analysisData);

      // Save to history
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
      setHistory(prev => [historyItem, ...prev].slice(0, 10)); // Keep last 10

      // Suggestions Prompt
      const suggestionsPrompt = `
        Based on these PC specs:
        CPU: ${selectedCpu.name} (Score: ${selectedCpu.score})
        GPU: ${selectedGpu.name} (Score: ${selectedGpu.score})
        RAM: ${ram}GB
        
        Suggest 6 popular PC games that would run smoothly (at least 60 FPS on Medium/High settings) on this hardware.
        Return the result as a JSON array of strings (game names only).
      `;

      const suggestionsResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: suggestionsPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const suggestionsData = JSON.parse(suggestionsResponse.text);
      setSuggestedGames(suggestionsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during analysis.");
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
      {/* Language Switcher */}
      <div className={`fixed top-6 ${lang === 'ar' ? 'left-6' : 'right-6'} z-50`}>
        <button 
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="px-4 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-2xl"
        >
          {t.langBtn}
        </button>
      </div>

      {/* Hero Section */}
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
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 text-lg max-w-2xl mx-auto font-medium"
          >
            {t.heroSubtitle}
          </motion.p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-20 -mt-12 relative z-20">
        {config && !config.hasRawgKey && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-amber-400">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">RAWG API Key is missing. Please add it to your environment variables to enable game search.</p>
            </div>
            <a href="https://rawg.io/apidocs" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-widest hover:underline">Get Key</a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500" />
                {t.configTitle}
              </h2>

              <div className="space-y-8">
                {/* Game Search */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.selectGame}</label>
                  <div className="relative group">
                    <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors`} />
                    <input 
                      type="text"
                      placeholder={t.gamePlaceholder}
                      className={`w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg`}
                      value={selectedGame ? selectedGame.name : gameSearch}
                      onChange={(e) => {
                        setGameSearch(e.target.value);
                        setSelectedGame(null);
                        setResult(null);
                      }}
                    />
                    {isGameLoading && <Loader2 className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin`} />}
                  </div>
                  
                  <AnimatePresence>
                    {gameSuggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                      >
                        {gameSuggestions.map(game => (
                          <button
                            key={game.id}
                            onClick={() => {
                              setSelectedGame(game);
                              setGameSuggestions([]);
                              setGameSearch('');
                            }}
                            className="w-full flex items-center gap-4 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                          >
                            <img src={game.background_image} className="w-16 h-10 object-cover rounded-lg" alt={game.name} referrerPolicy="no-referrer" />
                            <span className="font-bold">{game.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CPU Search */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.processor}</label>
                    <div className="relative group">
                      <Cpu className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors`} />
                      <input 
                        type="text"
                        placeholder={t.cpuPlaceholder}
                        className={`w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all`}
                        value={selectedCpu ? selectedCpu.name : cpuSearch}
                        onChange={(e) => {
                          setCpuSearch(e.target.value);
                          setSelectedCpu(null);
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {cpuSuggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        >
                          {cpuSuggestions.map(cpu => (
                            <button
                              key={cpu.name}
                              onClick={() => {
                                setSelectedCpu(cpu);
                                setCpuSuggestions([]);
                                setCpuSearch('');
                              }}
                              className="w-full p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 font-medium"
                            >
                              {cpu.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* GPU Search */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.graphics}</label>
                    <div className="relative group">
                      <Monitor className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors`} />
                      <input 
                        type="text"
                        placeholder={t.gpuPlaceholder}
                        className={`w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all`}
                        value={selectedGpu ? selectedGpu.name : gpuSearch}
                        onChange={(e) => {
                          setGpuSearch(e.target.value);
                          setSelectedGpu(null);
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {gpuSuggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        >
                          {gpuSuggestions.map(gpu => (
                            <button
                              key={gpu.name}
                              onClick={() => {
                                setSelectedGpu(gpu);
                                setGpuSuggestions([]);
                                setGpuSearch('');
                              }}
                              className="w-full p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 font-medium"
                            >
                              {gpu.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* RAM Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.ram}</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="4" 
                      max="64" 
                      step="4"
                      value={ram}
                      onChange={(e) => setRam(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2 font-black text-indigo-400 min-w-[80px] text-center">
                      {ram} {lang === 'ar' ? 'جيجابايت' : 'GB'}
                    </div>
                  </div>
                </div>

                {/* Quality Selection */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.quality}</label>
                  {isGameDetailsLoading && (
                    <div className="absolute right-0 top-0">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => setTargetQuality(q)}
                        className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all border truncate ${
                          targetQuality === q 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Selection */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">{t.resolution}</label>
                  {isGameDetailsLoading && (
                    <div className="absolute right-0 top-0">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableResolutions.map((r) => (
                      <button
                        key={r}
                        onClick={() => setTargetResolution(r)}
                        className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all border truncate ${
                          targetResolution === r 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      {t.analyzing}
                    </>
                  ) : (
                    <>
                      {t.analyzeBtn}
                      <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${lang === 'ar' ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full bg-zinc-900/30 border border-white/5 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                    <BarChart3 className="w-10 h-10 text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-400">{t.readyTitle}</h3>
                  <p className="text-zinc-500 text-sm max-w-xs">
                    {t.readyDesc}
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8"
                >
                  <div className="text-center space-y-4">
                    <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full border font-black uppercase tracking-widest text-sm ${getStatusColor(result.status)}`}>
                      {result.status === 'Will Not Run' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {result.status}
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-6xl font-black tracking-tighter text-white">
                        {result.estimatedFps} <span className="text-2xl text-zinc-500 uppercase">{t.fps}</span>
                      </h3>
                      <p className="text-zinc-400 font-medium italic">{t.estimatedAt} {targetResolution} {targetQuality} {t.settings}</p>
                    </div>

                    <button 
                      onClick={() => {
                        setResult(null);
                        setSuggestedGames([]);
                      }}
                      className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                    >
                      {t.clear}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        {t.summary}
                      </h4>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <HardwareMatch label={lang === 'ar' ? "المعالج" : "CPU"} match={result.cpuMatch || t.hardwareMatch} />
                      <HardwareMatch label={lang === 'ar' ? "كرت الشاشة" : "GPU"} match={result.gpuMatch || t.hardwareMatch} />
                      <HardwareMatch label={lang === 'ar' ? "الرام" : "RAM"} match={result.ramMatch || t.hardwareMatch} />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <h4 className="text-sm font-bold mb-4">{t.hwComparison}</h4>
                    <div className="space-y-4">
                      <ProgressBar label={t.cpuScore} value={selectedCpu?.score || 0} max={62000} />
                      <ProgressBar label={t.gpuScore} value={selectedGpu?.score || 0} max={39000} />
                    </div>
                  </div>

                  {suggestedGames.length > 0 && (
                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        {t.suggestedGames}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {suggestedGames.map(game => (
                          <span key={game} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs font-medium text-zinc-400">
                            {game}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              {t.historyTitle}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map(item => (
                <button 
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 hover:border-indigo-500/50 transition-all text-left flex items-center gap-4 group"
                >
                  <img 
                    src={item.game.background_image} 
                    className="w-16 h-16 object-cover rounded-xl opacity-80 group-hover:opacity-100 transition-opacity" 
                    alt={item.game.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-white">{item.game.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                      {new Date(item.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusColor(item.result.status)}`}>
                        {item.result.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-zinc-600 group-hover:text-indigo-500 transition-colors ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Popular Games Section */}
        {!selectedGame && popularGames.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              {t.popularTitle}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularGames.map(game => (
                <button 
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all"
                >
                  <img 
                    src={game.background_image} 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" 
                    alt={game.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <p className="text-sm font-bold leading-tight group-hover:text-indigo-400 transition-colors">{game.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Requirements Section */}
        {selectedGame && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 space-y-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-white/5" />
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-zinc-700">Requirements</h2>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              {/* Minimum Requirements */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 sm:p-8 hover:border-zinc-800 transition-colors min-h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-500" />
                  {t.minReq}
                </h3>
                
                <div className="flex-1">
                  {gameRequirements?.minStructured ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RequirementItem icon={<Cpu className="w-4 h-4" />} label="CPU" value={gameRequirements.minStructured.cpu} />
                      <RequirementItem icon={<Monitor className="w-4 h-4" />} label="GPU" value={gameRequirements.minStructured.gpu} />
                      <RequirementItem icon={<Zap className="w-4 h-4" />} label="RAM" value={gameRequirements.minStructured.ram} />
                      <RequirementItem icon={<Database className="w-4 h-4" />} label="Storage" value={gameRequirements.minStructured.storage} />
                      <RequirementItem icon={<Settings className="w-4 h-4" />} label="OS" value={gameRequirements.minStructured.os} className="sm:col-span-2" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-zinc-500 text-sm whitespace-pre-line leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                        {gameRequirements?.minimum || t.noData}
                      </div>
                      {isGameDetailsLoading && (
                        <div className="flex items-center gap-2 text-xs text-indigo-400/60 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Structuring data...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Requirements */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 sm:p-8 hover:border-indigo-500/20 transition-colors min-h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-6 text-indigo-400/80 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  {t.recReq}
                </h3>
                
                <div className="flex-1">
                  {gameRequirements?.recStructured ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RequirementItem icon={<Cpu className="w-4 h-4" />} label="CPU" value={gameRequirements.recStructured.cpu} />
                      <RequirementItem icon={<Monitor className="w-4 h-4" />} label="GPU" value={gameRequirements.recStructured.gpu} />
                      <RequirementItem icon={<Zap className="w-4 h-4" />} label="RAM" value={gameRequirements.recStructured.ram} />
                      <RequirementItem icon={<Database className="w-4 h-4" />} label="Storage" value={gameRequirements.recStructured.storage} />
                      <RequirementItem icon={<Settings className="w-4 h-4" />} label="OS" value={gameRequirements.recStructured.os} className="sm:col-span-2" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-zinc-500 text-sm whitespace-pre-line leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                        {gameRequirements?.recommended || t.noData}
                      </div>
                      {isGameDetailsLoading && (
                        <div className="flex items-center gap-2 text-xs text-indigo-400/60 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Structuring data...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
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
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        />
      </div>
    </div>
  );
}

