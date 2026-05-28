"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { 
  Sparkles, 
  Upload, 
  Cpu, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  Thermometer, 
  Clock, 
  ShieldCheck,
  Layers,
  X,
  Home,
  History,
  MessageSquare,
  Camera,
  Check,
  ChevronDown,
  Search,
  Edit3,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CpuArchitecture } from "./ui/cpu-architecture";

// Interface for predefined fruits in the classification system
interface FruitSample {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  ripeness: number; // percentage
  ripenessStage: "Underripe" | "Ripe" | "Overripe" | "Optimal";
  freshness: number; // percentage
  brixLevel: number; // sugar scale
  bruiseIndex: number; // damage percentage
  storageTemp: string;
  shelfLife: string;
  exportQuality: boolean;
  notes: string;
}

const FRUIT_SAMPLES: FruitSample[] = [
  {
    id: "apple",
    name: "Honeycrisp Apple",
    scientificName: "Malus domestica",
    image: "/textures/apple.png",
    ripeness: 92,
    ripenessStage: "Optimal",
    freshness: 98,
    brixLevel: 13.5,
    bruiseIndex: 2,
    storageTemp: "0°C - 2°C",
    shelfLife: "14 Days",
    exportQuality: true,
    notes: "High pressure cell walls. Clean skin texture. High export readiness index."
  },
  {
    id: "banana",
    name: "Cavendish Banana",
    scientificName: "Musa acuminata",
    image: "/textures/banana.png",
    ripeness: 85,
    ripenessStage: "Ripe",
    freshness: 92,
    brixLevel: 15.2,
    bruiseIndex: 8,
    storageTemp: "13°C - 15°C",
    shelfLife: "6 Days",
    exportQuality: true,
    notes: "Minor localized brown freckling. High starch conversion sweet rating."
  },
  {
    id: "mango",
    name: "Alphonso Mango",
    scientificName: "Mangifera indica",
    image: "/textures/mango.png",
    ripeness: 88,
    ripenessStage: "Optimal",
    freshness: 95,
    brixLevel: 16.8,
    bruiseIndex: 5,
    storageTemp: "12°C - 14°C",
    shelfLife: "5 Days",
    exportQuality: true,
    notes: "Intense color pigments. Soft, aromatic pulp grading. Rich beta-carotene profile."
  },
  {
    id: "strawberry",
    name: "Darselect Strawberry",
    scientificName: "Fragaria × ananassa",
    image: "/textures/strawberry.png",
    ripeness: 94,
    ripenessStage: "Optimal",
    freshness: 96,
    brixLevel: 9.8,
    bruiseIndex: 3,
    storageTemp: "2°C - 4°C",
    shelfLife: "4 Days",
    exportQuality: true,
    notes: "Glistening skin surface. Uniform achene pattern. Perfect anthocyanin rating."
  },
  {
    id: "pineapple",
    name: "Smooth Cayenne Pineapple",
    scientificName: "Ananas comosus",
    image: "/textures/pineapple.png",
    ripeness: 78,
    ripenessStage: "Ripe",
    freshness: 89,
    brixLevel: 14.2,
    bruiseIndex: 12,
    storageTemp: "8°C - 10°C",
    shelfLife: "9 Days",
    exportQuality: false,
    notes: "Sturdy outer eyes. Medium-heavy crown. Good brix balance, slight surface dry nodes."
  }
];

// Rotating Placeholders list
const PLACEHOLDERS = [
  "Analyze fruit, e.g. 'Analyze Cavendish Banana'...",
  "Grade ripeness, e.g. 'Honeycrisp Apple quality'...",
  "Evaluate specimen, e.g. 'Freshness score of strawberry'...",
  "Run Brix index check, e.g. 'Carabao Mango sugar level'...",
  "Scan shelf life, e.g. 'Ananas Pineapple export'..."
];

export default function FruitClassificationApp() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");
  const [selectedFruit, setSelectedFruit] = React.useState<FruitSample | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [scanStep, setScanStep] = React.useState(0);
  const [customResult, setCustomResult] = React.useState<FruitSample | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState<"classification" | "detection">("classification");
  const [showModelDropdown, setShowModelDropdown] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("generate");
  const [showSavedModal, setShowSavedModal] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isNavHovered, setIsNavHovered] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [recentSearches, setRecentSearches] = React.useState<Array<{
    id: string;
    q: string;
    timestamp?: number;
    date?: string; // Legacy support
    contextFruit?: FruitSample;
  }>>([]);

  const formatTimeAgo = (ts?: number, legacyDate?: string) => {
    if (!ts) return legacyDate || "Just now";
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  // Load from local storage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("fruitvision_chat_history");
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  }, []);

  // Save to local storage whenever it changes
  React.useEffect(() => {
    try {
      if (recentSearches.length > 0) {
        localStorage.setItem("fruitvision_chat_history", JSON.stringify(recentSearches));
      } else {
        localStorage.removeItem("fruitvision_chat_history");
      }
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [recentSearches]);
  const isCollapsed = isScrolled && !isNavHovered;


  const handleNewChat = () => {
    setSelectedFruit(null);
    setCustomResult(null);
    setScanning(false);
    setPrompt("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [placeholderIndex, setPlaceholderIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Hyperspectral Camera Viewfinder states
  const [showCameraModal, setShowCameraModal] = React.useState(false);
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setCameraStream(stream);
      // Wait for ref to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: unknown) {
      console.warn("Webcam access failed, using premium scanner simulator overlay:", err);
      setCameraError("Camera device not connected. Displaying Fruit Vision AI Hyperspectral Viewfinder Simulator...");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const handleCapture = () => {
    // Select a random sample to simulate snapshot scan completion!
    // eslint-disable-next-line react-hooks/purity
    const randomIdx = Math.floor(Math.random() * FRUIT_SAMPLES.length);
    const randomSample = FRUIT_SAMPLES[randomIdx];
    handleSelectSample(randomSample);
    stopCamera();
    
    setTimeout(() => {
      document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tabId === "generate") {
      document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
    } else if (tabId === "saved") {
      setShowSavedModal(true);
    } else if (tabId === "feedback") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  const executeQuery = (queryText: string, restoreContext?: FruitSample) => {
    if (!queryText.trim()) return;
    setPrompt(queryText);

    const currentContext = restoreContext || customResult || selectedFruit || null;

    // Save to history cache
    const queryToSave = queryText.trim();
    setRecentSearches(prev => {
      // Avoid exact consecutive duplicates
      if (prev.length > 0 && prev[0].q.toLowerCase() === queryToSave.toLowerCase()) {
        return prev;
      }
      const newSearch = {
        id: Date.now().toString(),
        q: queryToSave,
        timestamp: Date.now(),
        ...(currentContext && { contextFruit: currentContext })
      };
      return [newSearch, ...prev].slice(0, 20); // Keep up to 20 recent searches
    });

    // Reset scanner states
    setScanStep(0);
    setScanning(true);

    if (restoreContext) {
       // Exact Restoration
       if (restoreContext.id === "custom-upload") {
         setCustomResult(restoreContext);
         setSelectedFruit(null);
       } else {
         setSelectedFruit(restoreContext);
         setCustomResult(null);
       }
    } else {
       // Normal Text Search (if no context exists)
       if (!currentContext) {
         const query = queryText.toLowerCase();
         let matchedSample = FRUIT_SAMPLES[0]; // Honeycrisp Apple
         if (query.includes("banana")) {
           matchedSample = FRUIT_SAMPLES[1];
         } else if (query.includes("mango")) {
           matchedSample = FRUIT_SAMPLES[2];
         } else if (query.includes("straw") || query.includes("berry")) {
           matchedSample = FRUIT_SAMPLES[3];
         } else if (query.includes("pineapple") || query.includes("pine")) {
           matchedSample = FRUIT_SAMPLES[4];
         }
         setSelectedFruit(matchedSample);
         setCustomResult(null);
       }
    }

    // Smooth scroll to diagnostic console
    setTimeout(() => {
      document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(prompt);
  };

  const isDark = theme === "dark";

  // Mouse position tracking for parallax effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for buttery transition physics
  const springConfig = { damping: 30, stiffness: 90 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized position relative to window center (-0.5 to 0.5)
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Scroll listener and Scroll Spy section tracker
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 40);

      // Scroll Spy detection logic
      const scannerEl = document.getElementById("scanner");
      if (scannerEl) {
        const scannerTop = scannerEl.offsetTop - 350;
        const pageHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        // If near bottom of the page, active is feedback
        if (scrollPos + windowHeight >= pageHeight - 150) {
          setActiveTab("feedback");
        }
        // If scrolled past scanner top threshold
        else if (scrollPos >= scannerTop) {
          setActiveTab("generate");
        }
        // Otherwise, we are at the top (home)
        else {
          setActiveTab("home");
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Background blobs shift further for depth
  const bgX = useTransform(smoothMouseX, [-0.5, 0.5], [-35, 35]);
  const bgY = useTransform(smoothMouseY, [-0.5, 0.5], [-35, 35]);

  // Main text shifts slightly in opposite direction
  const textX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  const textY = useTransform(smoothMouseY, [-0.5, 0.5], [-10, 10]);

  // 3D Card Hover Tilt States
  const [consoleTilt, setConsoleTilt] = React.useState({ x: 0, y: 0 });
  const [dashboardTilt, setDashboardTilt] = React.useState({ x: 0, y: 0 });

  const handleConsoleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setConsoleTilt({ x: x * 10, y: -y * 10 }); // Max 10 deg tilt
  };

  const handleDashboardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setDashboardTilt({ x: x * 10, y: -y * 10 });
  };

  // Simulate scanning pipeline progress
  React.useEffect(() => {
    if (!scanning) return;

    const timers = [
      setTimeout(() => setScanStep(1), 600),
      setTimeout(() => setScanStep(2), 1200),
      setTimeout(() => setScanStep(3), 1800),
      setTimeout(() => {
        setScanStep(4);
        setScanning(false);


      }, 2500)
    ];

    return () => timers.forEach(t => clearTimeout(t));
  }, [scanning, selectedFruit, customResult]);

  const handleSelectSample = (sample: FruitSample) => {
    if (scanning) return;
    setCustomResult(null);
    setSelectedFruit(sample);
    setScanStep(0);
    setScanning(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (scanning) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFruit(null);
      
      // Seed a random mock result for custom uploads
      const seedFruit: FruitSample = {
        id: "custom-upload",
        name: "Wild Organics Variety",
        scientificName: "Fructus indeterminatus",
        image: reader.result as string,
        ripeness: Math.floor(Math.random() * 20) + 75,
        ripenessStage: "Optimal",
        freshness: Math.floor(Math.random() * 10) + 88,
        brixLevel: parseFloat((Math.random() * 4 + 11).toFixed(1)),
        bruiseIndex: Math.floor(Math.random() * 10),
        storageTemp: "4°C - 6°C",
        shelfLife: "7 Days",
        exportQuality: Math.random() > 0.3,
        notes: "Uploaded specimen detected. High cellular density. Minimal skin deformation observed."
      };
      
      setCustomResult(seedFruit);
      setScanStep(0);
      setScanning(true);
    };
    reader.readAsDataURL(file);
  };

  const activeData = customResult || selectedFruit;

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden transition-colors duration-500 font-sans",
      isDark ? "bg-[#030308] text-slate-100" : "bg-[#f8fafc] text-slate-900"
    )}>
      <style dangerouslySetInnerHTML={{__html: `
        body, html {
          background-color: ${isDark ? "#030308" : "#f8fafc"};
          overscroll-behavior-y: none;
        }
      `}} />
      
      {/* Morphing Glowing Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          style={{ x: bgX, y: bgY }}
          className={cn(
            "absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-40 transition-colors duration-1000",
            isDark ? "bg-fuchsia-900/30" : "bg-purple-200"
          )} 
        />
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [30, -30]), y: useTransform(smoothMouseY, [-0.5, 0.5], [30, -30]) }}
          className={cn(
            "absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[160px] opacity-35 transition-colors duration-1000",
            isDark ? "bg-emerald-950/30" : "bg-emerald-100"
          )} 
        />
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]), y: useTransform(smoothMouseY, [-0.5, 0.5], [20, -20]) }}
          className={cn(
            "absolute top-[40%] right-[15%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 transition-colors duration-1000",
            isDark ? "bg-amber-950/20" : "bg-amber-100"
          )} 
        />
      </div>

      {/* Interactive Floating Fruit Particles - Restrained to Hero portion */}
      <div className="absolute top-0 left-[48px] right-0 h-[680px] pointer-events-none overflow-hidden z-10 hidden lg:block">
        {/* Fruit 1: Apple */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-20, 20]) }}
          animate={{ opacity: isDark ? 0.35 : 0.75 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[12%] left-[4%] text-5xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            🍎
          </motion.div>
        </motion.div>

        {/* Fruit 2: Banana */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [30, -30]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-15, 15]) }}
          animate={{ opacity: isDark ? 0.30 : 0.70 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[45%] left-[8%] text-4xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, -12, 12, 0] }}
            transition={{ duration: 10, delay: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            🍌
          </motion.div>
        </motion.div>

        {/* Fruit 3: Mango */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-15, 15]), y: useTransform(smoothMouseY, [-0.5, 0.5], [30, -30]) }}
          animate={{ opacity: isDark ? 0.35 : 0.75 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[15%] right-[6%] text-5xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 7, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
          >
            🥭
          </motion.div>
        </motion.div>

        {/* Fruit 4: Strawberry */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [25, -25]), y: useTransform(smoothMouseY, [-0.5, 0.5], [25, -25]) }}
          animate={{ opacity: isDark ? 0.40 : 0.80 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[50%] right-[10%] text-3xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [0, 15, -15, 0] }}
            transition={{ duration: 6, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            🍓
          </motion.div>
        </motion.div>

        {/* Fruit 5: Pineapple */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-35, 35]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-20, 20]) }}
          animate={{ opacity: isDark ? 0.25 : 0.65 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[32%] right-[3%] text-6xl select-none filter blur-[1px] pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -25, 0], rotate: [0, -6, 6, 0] }}
            transition={{ duration: 12, delay: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            🍍
          </motion.div>
        </motion.div>

        {/* Fruit 6: Orange */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [15, -15]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-25, 25]) }}
          animate={{ opacity: isDark ? 0.30 : 0.70 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[22%] left-[14%] text-4xl select-none filter blur-[0.5px] pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 12, -12, 0] }}
            transition={{ duration: 9, delay: 0.7, repeat: Infinity, ease: "easeInOut" }}
          >
            🍊
          </motion.div>
        </motion.div>

        {/* Fruit 7: Grapes */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-25, 25]), y: useTransform(smoothMouseY, [-0.5, 0.5], [15, -15]) }}
          animate={{ opacity: isDark ? 0.25 : 0.65 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[55%] left-[22%] text-3xl select-none filter blur-[1.5px] pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -22, 0], rotate: [0, -8, 8, 0] }}
            transition={{ duration: 11, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            🍇
          </motion.div>
        </motion.div>

        {/* Fruit 8: Cherry */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [20, -20]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-20, 20]) }}
          animate={{ opacity: isDark ? 0.35 : 0.75 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[25%] right-[16%] text-3xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -16, 0], rotate: [0, 14, -14, 0] }}
            transition={{ duration: 8, delay: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            🍒
          </motion.div>
        </motion.div>

        {/* Fruit 9: Lemon */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-15, 15]), y: useTransform(smoothMouseY, [-0.5, 0.5], [15, -15]) }}
          animate={{ opacity: isDark ? 0.28 : 0.68 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[32%] left-[2%] text-3xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 7, delay: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            🍋
          </motion.div>
        </motion.div>

        {/* Fruit 10: Kiwi */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [10, -10]), y: useTransform(smoothMouseY, [-0.5, 0.5], [20, -20]) }}
          animate={{ opacity: isDark ? 0.32 : 0.72 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[62%] right-[22%] text-2xl select-none pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 9, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}
          >
            🥝
          </motion.div>
        </motion.div>

        {/* Fruit 11: Peach */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]), y: useTransform(smoothMouseY, [-0.5, 0.5], [20, -20]) }}
          animate={{ opacity: isDark ? 0.20 : 0.60 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[10%] left-[18%] text-4xl select-none filter blur-[2px] pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 10, delay: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            🍑
          </motion.div>
        </motion.div>

        {/* Fruit 12: Melon */}
        <motion.div 
          style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [25, -25]), y: useTransform(smoothMouseY, [-0.5, 0.5], [-10, 10]) }}
          animate={{ opacity: isDark ? 0.15 : 0.55 }}
          transition={{ opacity: { duration: 0.3 } }}
          className="absolute top-[8%] right-[12%] text-5xl select-none filter blur-[3px] pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -24, 0], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 13, delay: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            🍈
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Header */}
      <div 
        onMouseEnter={() => setIsNavHovered(true)}
        onMouseLeave={() => setIsNavHovered(false)}
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-auto max-w-[95%] overflow-visible transition-all duration-300 origin-top",
          isScrolled ? "top-10 scale-[0.92]" : "top-20 scale-100"
        )}
      >
        <div className={cn(
          "rounded-full border backdrop-blur-xl transition-all duration-300 shadow-[0_16px_48px_0_rgba(0,0,0,0.18)] flex items-center justify-between overflow-visible",
          isCollapsed
            ? (isDark ? "bg-[#030308]/95 border-white/20 p-1 pl-2.5 pr-1.5 gap-0.5" : "bg-white/95 border-slate-300/80 p-1 pl-2.5 pr-1.5 gap-0.5")
            : (isScrolled
                ? (isDark ? "bg-[#030308]/90 border-white/20 p-1.5 pl-3.5 pr-2 gap-1" : "bg-white/90 border-slate-300/80 p-1.5 pl-3.5 pr-2 gap-1")
                : (isDark ? "bg-[#030308]/75 border-white/10 p-2.5 pl-4 pr-3 gap-1.5" : "bg-white/75 border-slate-200 p-2.5 pl-4 pr-3 gap-1.5")
              )
        )}>
          {/* Logo Brand */}
          <div className={cn(
            "flex items-center select-none transition-all duration-300",
            isCollapsed ? "gap-0 pl-1 pr-1 scale-95" : (isScrolled ? "gap-1.5 pl-2 pr-1 scale-95" : "gap-2 pl-3 pr-1.5 scale-100")
          )}>
            <div className="shrink-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* Stem */}
                <path d="M12 6V3.5" />
                {/* Leaf */}
                <path d="M12 6c2-2 4.5-2.5 5.5-2.5-0.5 2.5-2.5 4.5-5.5 5" fill="currentColor" />
                {/* Fruit Body */}
                <path d="M12 6.5c-4 0-7 2.5-7 6.5s3 7 7 7 7-3 7-7-3-6.5-7-6.5z" fill="currentColor" fillOpacity="0.2" />
                {/* Scanning Iris center circle */}
                <circle cx="12" cy="13" r="2.5" className="stroke-rose-500 dark:stroke-rose-400" strokeWidth="1.5" />
              </svg>
            </div>
            <span className={cn(
              "font-extrabold text-lg tracking-tight transition-all duration-300 origin-left overflow-hidden whitespace-nowrap",
              isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[150px] opacity-100 ml-2"
            )}>
              Fruit Vision
            </span>
          </div>
          
          {/* Vertical divider (hides when collapsed) */}
          <div className={cn(
            "h-6 bg-slate-200 dark:bg-white/10 transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 scale-x-0 mx-0" : "opacity-100 w-[1px] scale-x-100 mx-1"
          )} />
          
          {/* Navigation tabs */}
          <nav className={cn(
            "flex items-center overflow-visible transition-all duration-300",
            isCollapsed ? "gap-0.5 px-0.5" : "gap-1 px-1.5"
          )}>
            {[
              { id: "home", label: "Home", icon: Home },
              { id: "generate", label: "Generate", icon: Cpu },
              { id: "saved", label: "Saved", icon: History },
              { id: "feedback", label: "Feedback", icon: MessageSquare }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "rounded-full text-sm font-bold transition-all duration-300 relative cursor-pointer overflow-visible flex items-center justify-center gap-1.5",
                    isCollapsed ? "p-1.5 px-2" : (isScrolled ? "px-3 py-1.5" : "px-4 py-2"),
                    activeTab === tab.id 
                      ? "text-rose-500 dark:text-rose-300" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                  title={tab.label}
                >
                  <IconComponent className={cn(
                    "w-4 h-4 transition-all duration-300 shrink-0",
                    isCollapsed ? "scale-110 opacity-100" : (isScrolled ? "scale-100 opacity-90" : "scale-100 opacity-80")
                  )} />
                  <span className={cn(
                    "transition-all duration-300 origin-left overflow-hidden whitespace-nowrap",
                    isCollapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"
                  )}>
                    {tab.label}
                  </span>
                  
                  {activeTab === tab.id && (
                    <>
                      {/* Active background pill */}
                      <motion.div
                        layoutId="activeTabBg"
                        className={cn(
                          "absolute inset-0 rounded-full -z-10",
                          isDark 
                            ? "bg-rose-500/10 border border-rose-500/20" 
                            : "bg-rose-50 border border-rose-100/50"
                        )}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                      
                      {/* Active indicator Fruit Basket & connector */}
                      <div className={cn(
                        "absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none overflow-visible transition-all duration-300",
                        isScrolled ? "-top-10" : "-top-12"
                      )}>
                        {/* Floating Fruit Basket */}
                        <motion.div
                          layoutId="topIndicatorBasket"
                          className="text-4xl select-none filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] flex items-center justify-center overflow-visible"
                        >
                          🧺
                        </motion.div>
                        
                        {/* Diamond point connector */}
                        <motion.div
                          layoutId="topIndicatorDiamond"
                          className={cn(
                            "w-2.5 h-2.5 rotate-45 -mt-[4px] border-l border-t z-20",
                            isDark 
                              ? "bg-rose-950 border-rose-500/20" 
                              : "bg-rose-50 border-rose-100/50"
                          )}
                          transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        />
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </nav>
          
          {/* Vertical divider (hides when collapsed) */}
          <div className={cn(
            "h-6 bg-slate-200 dark:bg-white/10 transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 scale-x-0 mx-0" : "opacity-100 w-[1px] scale-x-100 mx-1"
          )} />

          {/* Theme Toggle Switch */}
          <div className={cn(
            "flex items-center justify-center transition-all duration-300",
            isCollapsed ? "pl-0.5 pr-1.5 scale-90" : (isScrolled ? "pl-1 pr-2.5 scale-95" : "pl-1.5 pr-4 scale-100")
          )}>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "relative rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95",
                isScrolled ? "w-9 h-9" : "w-10 h-10"
              )}
              title={isDark ? "Switch to Light Mode (Green Grapes)" : "Switch to Dark Mode (Dark Grapes)"}
            >
              <motion.div
                key={theme}
                initial={{ scale: 0.8, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotate: 30 }}
                transition={{ duration: 0.25 }}
                className="w-9 h-9 flex items-center justify-center"
              >
                {isDark ? (
                  // Dark Grapes SVG (purple/indigo bunch)
                  <svg className="w-9 h-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {/* Stem & Leaf */}
                    <path d="M12 6c0-2 2-3 3-3-0.5 1-1 2.5-3 3zM12 6V4" className="stroke-indigo-400 fill-indigo-400" />
                    {/* Grape bunch circles */}
                    <circle cx="10" cy="9" r="2.2" className="fill-indigo-500 stroke-indigo-600" />
                    <circle cx="14" cy="9" r="2.2" className="fill-indigo-500 stroke-indigo-600" />
                    <circle cx="12" cy="12" r="2.2" className="fill-indigo-500 stroke-indigo-600" />
                    <circle cx="9" cy="12" r="1.9" className="fill-indigo-500 stroke-indigo-600" />
                    <circle cx="15" cy="12" r="1.9" className="fill-indigo-500 stroke-indigo-600" />
                    <circle cx="12" cy="15" r="2.2" className="fill-indigo-500 stroke-indigo-600" />
                  </svg>
                ) : (
                  // Green Grapes SVG (emerald bunch)
                  <svg className="w-9 h-9 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {/* Stem & Leaf */}
                    <path d="M12 6c0-2 2-3 3-3-0.5 1-1 2.5-3 3zM12 6V4" className="stroke-emerald-600 fill-emerald-600" />
                    {/* Grape bunch circles */}
                    <circle cx="10" cy="9" r="2.2" className="fill-emerald-400 stroke-emerald-500" />
                    <circle cx="14" cy="9" r="2.2" className="fill-emerald-400 stroke-emerald-500" />
                    <circle cx="12" cy="12" r="2.2" className="fill-emerald-400 stroke-emerald-500" />
                    <circle cx="9" cy="12" r="1.9" className="fill-emerald-400 stroke-emerald-500" />
                    <circle cx="15" cy="12" r="1.9" className="fill-emerald-400 stroke-emerald-500" />
                    <circle cx="12" cy="15" r="2.2" className="fill-emerald-400 stroke-emerald-500" />
                  </svg>
                )}
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Ultra Minimal Left Sidebar (Gemini Style) */}
      <div className={cn(
        "fixed left-0 top-0 bottom-0 z-50 w-[48px] flex flex-col items-center py-4 transition-colors",
        isDark ? "bg-[#131314]" : "bg-slate-50 border-r border-slate-200"
      )}>
        {/* Top: Custom App Logo (Fruit Vision) */}
        <div className="mb-6 mt-1 cursor-pointer hover:scale-110 transition-transform" title="Fruit Vision AI">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
            {/* Outer circle */}
            <circle cx="12" cy="15" r="7" stroke="#00df81" strokeWidth="2.5" />
            
            {/* Stem */}
            <path d="M11 8V3.5" stroke="#00df81" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Leaf */}
            <path d="M11 5.5 Q 16 2 17.5 4.5 Q 18 8 12.5 8 Z" fill="#00df81" />
            
            {/* Inner ring */}
            <circle cx="12" cy="15" r="2.5" stroke="#ff5a79" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Middle: Tool Actions */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* New Chat / Edit */}
          <button 
            onClick={handleNewChat}
            className={cn(
              "w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all cursor-pointer",
              isDark ? "text-[#a8c7fa] hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"
            )}
            title="New Diagnosis"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          {/* Search */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className={cn(
              "w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all cursor-pointer",
              isDark ? "text-[#a8c7fa] hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" /> {/* Spacer */}


      </div>

      {/* Strict Framing Wrapper */}
      <div className="flex-1 w-[calc(100%-48px)] ml-[48px] flex flex-col min-h-screen">
        {/* Main Container */}
        <main className={cn(
          "relative z-10 w-full max-w-7xl mx-auto px-6 pt-48 pb-12 flex flex-col gap-16 transition-all duration-300 flex-1"
        )}>
        
        {/* Animated Hero Section */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-6">

          <motion.h1 
            style={{ x: textX, y: textY }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-balance"
          >
            Fruit Expert <br />
            <span className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 bg-clip-text text-transparent">
              Classification System
            </span>
          </motion.h1>

          <motion.p
            style={{ x: useTransform(smoothMouseX, [-0.5, 0.5], [6, -6]), y: useTransform(smoothMouseY, [-0.5, 0.5], [6, -6]) }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className={cn(
              "text-base sm:text-lg leading-relaxed text-balance max-w-2xl",
              isDark ? "text-slate-400" : "text-slate-600"
            )}
          >
            Instantly grade freshness, compute brix index metrics, and evaluate exact ripeness stages using computer vision and hyperspectral color analytics.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="w-full max-w-2xl mt-6"
          >
            <form 
              onSubmit={handlePromptSubmit}
              className="relative w-full animate-fade-in"
            >
              <div className={cn(
                "flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border backdrop-blur-md transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500/30 relative",
                isDark 
                  ? "bg-[#0b0c17]/60 border-white/5 focus-within:border-emerald-500/25" 
                  : "bg-white border-slate-200 focus-within:border-emerald-500/40 shadow-lg shadow-slate-100"
              )}>
                {/* Model Selector Button & Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center gap-1.5 justify-center pl-3 pr-2.5 py-1.5 rounded-xl transition-all cursor-pointer hover:bg-emerald-500/10 active:scale-95 group"
                    title="Select AI Model"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors" />
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                      {selectedModel}
                    </span>
                    <ChevronDown className="w-4 h-4 text-emerald-500/50 dark:text-emerald-400/50 group-hover:text-emerald-500 transition-colors" />
                  </button>

                  <AnimatePresence>
                    {showModelDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowModelDropdown(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className={cn(
                            "absolute bottom-full left-0 mb-3 w-[280px] rounded-[24px] border backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.3)] z-50 overflow-hidden flex flex-col p-2",
                            isDark ? "bg-[#0f111a]/95 border-white/10" : "bg-white/95 border-slate-200"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModel("classification");
                              setShowModelDropdown(false);
                            }}
                            className={cn(
                              "relative flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all cursor-pointer group outline-none",
                              selectedModel === "classification" 
                                ? (isDark ? "bg-emerald-500/10" : "bg-emerald-50")
                                : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50")
                            )}
                          >
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                              {selectedModel === "classification" && <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                            </div>
                            <div className="flex-1">
                              <div className={cn(
                                "text-sm font-semibold mb-0.5",
                                isDark ? "text-slate-100" : "text-slate-800"
                              )}>
                                Classification
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Standard ripeness grading
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModel("detection");
                              setShowModelDropdown(false);
                            }}
                            className={cn(
                              "relative flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all cursor-pointer group outline-none",
                              selectedModel === "detection" 
                                ? (isDark ? "bg-emerald-500/10" : "bg-emerald-50")
                                : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50")
                            )}
                          >
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                              {selectedModel === "detection" && <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={cn(
                                  "text-sm font-semibold",
                                  isDark ? "text-slate-100" : "text-slate-800"
                                )}>
                                  Detection
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                                  New
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Multi-fruit bounding boxes
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Dynamic animated placeholder & input wrapper */}
                <div className="relative flex-1 flex items-center min-h-[36px]">
                  <AnimatePresence mode="wait">
                    {!prompt && (
                      <motion.span
                        key={placeholderIndex}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 0.5 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="absolute left-0 w-[95%] text-sm pointer-events-none select-none text-slate-500 dark:text-slate-400 truncate"
                      >
                        {PLACEHOLDERS[placeholderIndex]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none border-none text-slate-800 dark:text-slate-100 z-10"
                  />
                </div>
                
                {/* Borderless Camera Capture Trigger Button */}
                <button 
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer shrink-0 hover:scale-110 active:scale-95 text-slate-400 hover:text-emerald-500 dark:text-slate-500 dark:hover:text-emerald-400"
                  title="Capture specimen using camera"
                >
                  <Camera className="w-5 h-5 transition-colors" />
                </button>

                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-amber-500 text-white hover:from-emerald-600 hover:to-amber-600 transition-colors shadow-md cursor-pointer shrink-0"
                >
                  Analyze
                </button>
              </div>
            </form>
          </motion.div>
        </section>

        {/* Diagnostic Interactive Scanner Console */}
        <section id="scanner" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - Console Scanner Inputs */}
          <motion.div 
            style={{ 
              transformStyle: "preserve-3d",
              transform: `perspective(1000px) rotateX(${consoleTilt.y}deg) rotateY(${consoleTilt.x}deg)`,
              transition: scanning ? "none" : "transform 0.15s ease-out"
            }}
            onMouseMove={handleConsoleMouseMove}
            onMouseLeave={() => setConsoleTilt({ x: 0, y: 0 })}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            <div className={cn(
              "p-6 rounded-3xl border backdrop-blur-xl transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)]",
              isDark 
                ? "bg-[#0b0c17]/50 border-white/[0.08] hover:border-white/[0.12] hover:bg-[#0b0c17]/60" 
                : "bg-white/40 border-white/30 hover:border-white/50 hover:bg-white/50 shadow-slate-200/50"
            )}>
              <h2 className="text-xl font-bold tracking-tight mb-2">Specimen Input Console</h2>
              <p className={cn("text-xs mb-6", isDark ? "text-slate-400" : "text-slate-500")}>
                Drop an image or select a ready fruit specimen profile to run instant AI grading scans.
              </p>

              {/* Upload Drop Zone / Image Display */}
              <div className="relative group">
                <div className={cn(
                  "relative border-2 border-dashed rounded-2xl h-[280px] flex flex-col items-center justify-center overflow-hidden transition-all duration-300",
                  scanning ? "border-amber-500/30" : "border-slate-700/30 group-hover:border-emerald-500/40",
                  isDark ? "bg-[#030308]/40" : "bg-slate-50/50"
                )}>
                  
                  {/* File Selector */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    disabled={scanning}
                  />

                  {activeData ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black/10">
                      {/* Image render */}
                      {/* Since we don't have real full files locally, we map standard placeholders or custom base64 */}
                      <div className="w-full h-full flex items-center justify-center p-4">
                        {/* Render standard vector graphic representation of the fruit */}
                        <div className={cn(
                          "w-48 h-48 rounded-full blur-[10px] opacity-15 absolute",
                          activeData.id === "apple" && "bg-red-500",
                          activeData.id === "banana" && "bg-yellow-400",
                          activeData.id === "mango" && "bg-amber-400",
                          activeData.id === "strawberry" && "bg-rose-500",
                          activeData.id === "pineapple" && "bg-orange-400",
                          activeData.id === "custom-upload" && "bg-purple-500"
                        )} />
                        
                        <div className="flex flex-col items-center justify-center text-center z-10 p-6">
                          {activeData.id === "custom-upload" ? (
                            <Upload className="w-16 h-16 text-emerald-400 mb-2" />
                          ) : (
                            <span className="text-8xl mb-2 select-none filter drop-shadow-md">
                              {activeData.id === "apple" && "🍎"}
                              {activeData.id === "banana" && "🍌"}
                              {activeData.id === "mango" && "🥭"}
                              {activeData.id === "strawberry" && "🍓"}
                              {activeData.id === "pineapple" && "🍍"}
                            </span>
                          )}
                          <p className="font-bold text-lg">{activeData.name}</p>
                          <p className="text-xs font-mono opacity-60 italic">{activeData.scientificName}</p>
                        </div>
                      </div>

                      {/* Scanning Laser Beam Effect */}
                      <AnimatePresence>
                        {scanning && (
                          <motion.div 
                            initial={{ top: "0%" }}
                            animate={{ top: "98%" }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 z-10"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center p-6 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Drag and drop file here, or click to upload</p>
                        <p className="text-xs opacity-50 mt-1">Supports PNG, JPG, or agricultural raw formats</p>
                      </div>
                    </div>
                  )}

                  {/* Overlaid scanning state banner */}
                  <AnimatePresence>
                    {scanning && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center"
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mb-4" />
                        <h4 className="font-mono text-xs uppercase tracking-widest text-emerald-400 mb-1">SCANNING IN PROGRESS</h4>
                        <div className="h-6 overflow-hidden">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={scanStep}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="text-xs font-mono text-slate-300"
                            >
                              {scanStep === 0 && "Initializing scanner laser arrays..."}
                              {scanStep === 1 && "Analyzing surface pigments & color channels..."}
                              {scanStep === 2 && "Checking texture patterns & bruise indicators..."}
                              {scanStep === 3 && "Estimating brix index & chemical values..."}
                              {scanStep === 4 && "Finalizing grading matrices..."}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Results Dashboard */}
          <motion.div 
            style={{ 
              transformStyle: "preserve-3d",
              transform: `perspective(1000px) rotateX(${dashboardTilt.y}deg) rotateY(${dashboardTilt.x}deg)`,
              transition: scanning ? "none" : "transform 0.15s ease-out"
            }}
            onMouseMove={handleDashboardMouseMove}
            onMouseLeave={() => setDashboardTilt({ x: 0, y: 0 })}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            <AnimatePresence mode="wait">
              {activeData && !scanning ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)]",
                    isDark 
                      ? "bg-[#0b0c17]/50 border-white/[0.08] hover:border-white/[0.12]" 
                      : "bg-white/40 border-white/30 hover:border-white/50 shadow-slate-200/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold">{activeData.name}</h3>
                      <p className="text-xs font-mono opacity-50 italic">{activeData.scientificName}</p>
                    </div>
                    {activeData.exportQuality ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> EXPORT READY
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> DOMESTIC ONLY
                      </span>
                    )}
                  </div>

                  {/* Circular Ripeness Gauge Chart */}
                  <div className="flex flex-col items-center justify-center p-4 border-b border-dashed border-slate-700/20 mb-6">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Gray track ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke={isDark ? "#ffffff" : "#0f172a"}
                          strokeWidth="8"
                          fill="transparent"
                          className="opacity-10"
                        />
                        {/* Progress ring with gradient coloring */}
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="url(#gradientRipeness)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={263.89}
                          initial={{ strokeDashoffset: 263.89 }}
                          animate={{ strokeDashoffset: 263.89 - (263.89 * activeData.ripeness) / 100 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradientRipeness" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="50%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f87171" />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Concentric text */}
                      <div className="absolute text-center">
                        <span className="text-3xl font-black tracking-tight">{activeData.ripeness}%</span>
                        <p className="text-[10px] font-bold tracking-widest opacity-60 uppercase mt-0.5">{activeData.ripenessStage}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono opacity-50 mt-3 text-center">RIPENESS INDEX METRIC</span>
                  </div>

                  {/* Visual Parameters Lists */}
                  <div className="flex flex-col gap-4 mb-6">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Freshness Rating</span>
                        <span className="text-emerald-400">{activeData.freshness}%</span>
                      </div>
                      <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-100")}>
                        <motion.div 
                          className="h-full bg-emerald-400 rounded-full" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${activeData.freshness}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Brix Sugar Concentration</span>
                        <span className="text-amber-400">{activeData.brixLevel} °Bx</span>
                      </div>
                      <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-100")}>
                        <motion.div 
                          className="h-full bg-amber-400 rounded-full" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${(activeData.brixLevel / 20) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Bruise & Tissue Damage Index</span>
                        <span className="text-rose-400">{activeData.bruiseIndex}%</span>
                      </div>
                      <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-100")}>
                        <motion.div 
                          className="h-full bg-rose-400 rounded-full" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${activeData.bruiseIndex}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Storage Details */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={cn("p-3 rounded-xl border flex gap-3 items-center", isDark ? "bg-[#030308]/40 border-white/5" : "bg-slate-50 border-slate-200")}>
                      <Thermometer className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-[10px] opacity-50 font-mono">STORAGE TEMP</p>
                        <p className="text-xs font-bold">{activeData.storageTemp}</p>
                      </div>
                    </div>

                    <div className={cn("p-3 rounded-xl border flex gap-3 items-center", isDark ? "bg-[#030308]/40 border-white/5" : "bg-slate-50 border-slate-200")}>
                      <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[10px] opacity-50 font-mono">SHELF LIFE</p>
                        <p className="text-xs font-bold">{activeData.shelfLife}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes Panel */}
                  <div className={cn("p-4 rounded-xl border flex gap-3", isDark ? "bg-[#030308]/20 border-white/5" : "bg-slate-50 border-slate-200")}>
                    <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold mb-0.5">Agronomy Report Notes</p>
                      <p className="text-[11px] opacity-75 leading-normal">{activeData.notes}</p>
                    </div>
                  </div>

                </motion.div>
              ) : (
                <div className={cn(
                  "p-8 rounded-[32px] border flex flex-col items-center justify-center min-h-[480px] backdrop-blur-xl transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] relative overflow-hidden",
                  isDark 
                    ? "bg-[#0b0c17]/50 border-white/[0.08]" 
                    : "bg-white/40 border-white/30 shadow-slate-200/50"
                )}>
                  {/* Subtle Background Glow for CPU */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  {/* The CPU Architecture Component */}
                  <div className="w-full max-w-[340px] aspect-[2/1] flex items-center justify-center mb-8 relative z-10">
                    <CpuArchitecture text="CORE" className="w-full h-full drop-shadow-xl opacity-80 hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1 relative z-10">Awaiting Specimen Diagnostics</h3>
                  <p className="text-xs opacity-50 max-w-[280px] text-center relative z-10">
                    Select a specimen sample or upload a photo to populate the AI ripeness dashboard instantly.
                  </p>
                </div>
              )}
            </AnimatePresence>
            </motion.div>

        </section>

        {/* Feature Highlights Showcase */}
        <section className="flex flex-col gap-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Key Analytical Core</h2>
            <p className={cn("text-xs mt-2", isDark ? "text-slate-400" : "text-slate-500")}>
              Fruit Vision AI integrates three diagnostic engines to monitor visual and quality changes.
            </p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              className={cn(
                "p-6 rounded-2xl border flex flex-col gap-3 transition-all duration-500 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] hover:scale-[1.02]",
                isDark 
                  ? "bg-[#0b0c17]/50 border-white/[0.08] hover:border-white/[0.12] hover:bg-[#0b0c17]/60" 
                  : "bg-white/40 border-white/30 hover:border-white/50 hover:bg-white/50 hover:shadow-lg hover:shadow-slate-200/50"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Hyperspectral Skin Profiling</h3>
              <p className="text-xs opacity-70 leading-normal">
                Analyzes skin pigments across multiple wavelength segments to detect subsurface bruises and tissue decay invisible to the naked eye.
              </p>
            </motion.div>

            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              className={cn(
                "p-6 rounded-2xl border flex flex-col gap-3 transition-all duration-500 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] hover:scale-[1.02]",
                isDark 
                  ? "bg-[#0b0c17]/50 border-white/[0.08] hover:border-white/[0.12] hover:bg-[#0b0c17]/60" 
                  : "bg-white/40 border-white/30 hover:border-white/50 hover:bg-white/50 hover:shadow-lg hover:shadow-slate-200/50"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Starch-Sugar Shift Engine</h3>
              <p className="text-xs opacity-70 leading-normal">
                Estimates estimated fruit Brix levels based on shape deformation, skin coloring distribution, and cell turgidity metrics.
              </p>
            </motion.div>

            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              className={cn(
                "p-6 rounded-2xl border flex flex-col gap-3 transition-all duration-500 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] hover:scale-[1.02]",
                isDark 
                  ? "bg-[#0b0c17]/50 border-white/[0.08] hover:border-white/[0.12] hover:bg-[#0b0c17]/60" 
                  : "bg-white/40 border-white/30 hover:border-white/50 hover:bg-white/50 hover:shadow-lg hover:shadow-slate-200/50"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Neural Ripeness Classifier</h3>
              <p className="text-xs opacity-70 leading-normal">
                Uses customized residual neural networks trained on over 250,000 agricultural fruit datasets to match ripeness standards.
              </p>
            </motion.div>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className={cn(
        "border-t py-12 mt-16 transition-colors duration-300 relative z-10 overflow-hidden",
        isDark ? "bg-[#030308]/90 border-white/5" : "bg-white border-slate-200"
      )}>
        {/* Animated Background Tree Graphic */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-100 dark:opacity-40 pointer-events-none">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fall-bounce-1 {
              0% { transform: translateY(0px); opacity: 0; animation-timing-function: ease-in; }
              10% { opacity: 1; }
              50% { transform: translateY(145px); animation-timing-function: ease-out; }
              65% { transform: translateY(125px); animation-timing-function: ease-in; }
              80% { transform: translateY(145px); opacity: 1; }
              95% { transform: translateY(145px); opacity: 1; }
              100% { transform: translateY(145px); opacity: 0; }
            }
            @keyframes fall-bounce-2 {
              0% { transform: translateY(0px); opacity: 0; animation-timing-function: ease-in; }
              10% { opacity: 1; }
              45% { transform: translateY(125px); animation-timing-function: ease-out; }
              60% { transform: translateY(110px); animation-timing-function: ease-in; }
              75% { transform: translateY(125px); opacity: 1; }
              90% { transform: translateY(125px); opacity: 1; }
              100% { transform: translateY(125px); opacity: 0; }
            }
            .anim-fall-1 { animation: fall-bounce-1 6s infinite; }
            .anim-fall-2 { animation: fall-bounce-2 7.5s infinite 2.5s; }
          `}} />
          <svg width="400" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Trunk & Branches */}
            <path d="M143 200 C143 140 148 110 150 110 C152 110 157 140 157 200 Z" fill={isDark ? "#27272a" : "#94a3b8"} />
            <path d="M150 110 Q 120 90 90 60 M150 110 Q 180 90 210 60 M150 110 L 150 40 M120 90 Q 100 70 100 50 M180 90 Q 200 70 200 50" stroke={isDark ? "#27272a" : "#94a3b8"} strokeWidth="6" strokeLinecap="round" />
            
            {/* Leaves Canopy (Abstract overlapping circles) */}
            <circle cx="150" cy="50" r="55" fill={isDark ? "#10b981" : "#059669"} className={isDark ? "opacity-20" : "opacity-60"} />
            <circle cx="100" cy="65" r="45" fill={isDark ? "#059669" : "#047857"} className={isDark ? "opacity-20" : "opacity-60"} />
            <circle cx="200" cy="65" r="45" fill={isDark ? "#047857" : "#064e3b"} className={isDark ? "opacity-20" : "opacity-60"} />
            
            {/* Fruits (Apples & Oranges) */}
            <g className="opacity-100 drop-shadow-md">
              <circle cx="150" cy="30" r="6" fill="#ff4757" className="animate-pulse" style={{ animationDelay: "0ms" }} />
              <circle cx="110" cy="55" r="5.5" fill="#ffbe76" className="animate-pulse" style={{ animationDelay: "500ms" }} />
              <circle cx="140" cy="75" r="5" fill="#ffbe76" className="animate-pulse" style={{ animationDelay: "1500ms" }} />
              <circle cx="90" cy="75" r="4.5" fill="#ff4757" className="animate-pulse" style={{ animationDelay: "2500ms" }} />
              <circle cx="165" cy="65" r="4" fill="#ffbe76" className="animate-pulse" style={{ animationDelay: "3000ms" }} />
              
              {/* Falling Fruits */}
              <circle cx="185" cy="45" r="6" fill="#ff4757" className="anim-fall-1" />
              <circle cx="205" cy="70" r="5.5" fill="#ff4757" className="anim-fall-2" />
            </g>

            {/* Fallen Scattered Fruits */}
            <g className="opacity-90 drop-shadow-sm">
               <circle cx="120" cy="195" r="5" fill="#ff4757" />
               <circle cx="135" cy="198" r="4" fill="#ffbe76" />
               <circle cx="180" cy="196" r="6" fill="#ff4757" />
               <circle cx="165" cy="199" r="4.5" fill="#ffbe76" />
               <circle cx="95" cy="197" r="5" fill="#ff4757" />
               <circle cx="210" cy="198" r="5" fill="#ffbe76" />
            </g>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3 bg-white/5 dark:bg-black/20 p-2 pr-4 rounded-xl backdrop-blur-md border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-center mr-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                <circle cx="12" cy="15" r="7" stroke="#00df81" strokeWidth="2.5" />
                <path d="M11 8V3.5" stroke="#00df81" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M11 5.5 Q 16 2 17.5 4.5 Q 18 8 12.5 8 Z" fill="#00df81" />
                <circle cx="12" cy="15" r="2.5" stroke="#ff5a79" strokeWidth="2.5" />
              </svg>
            </div>
            <span className="font-extrabold text-xs tracking-wider uppercase">FRUIT VISION AI</span>
          </div>

          <p className="text-[11px] opacity-70 font-mono text-center md:text-right bg-white/5 dark:bg-black/20 px-4 py-2 rounded-lg backdrop-blur-md border border-slate-200 dark:border-white/10">
            Made with passion by Souvik Ghosh and Soyam Bhalotia
          </p>
        </div>
      </footer>
      </div>
      {/* Saved Specimens Modal */}
      <AnimatePresence>
        {showSavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSavedModal(false);
                setActiveTab("generate");
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={cn(
                "relative w-full max-w-md p-6 rounded-3xl border backdrop-blur-xl shadow-[0_24px_50px_rgba(0,0,0,0.25)] overflow-hidden z-10",
                isDark 
                  ? "bg-[#0b0c17]/90 border-white/10 text-white" 
                  : "bg-white/95 border-slate-200 text-slate-800"
              )}
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setShowSavedModal(false);
                  setActiveTab("generate");
                }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-lg tracking-tight mb-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Saved Specimens
              </h3>
              <p className="text-xs opacity-50 mb-6">Grades, Freshness and Ripeness certificates recorded on local nodes.</p>

              {/* Items List */}
              <div className="flex flex-col gap-3">
                {[
                  { name: "Honeycrisp Apple 🍎", date: "Today, 10:24 AM", score: "92% Fresh", grade: "Export Optimal" },
                  { name: "Cavendish Banana 🍌", date: "Yesterday, 3:15 PM", score: "85% Ripe", grade: "Domestic Grade" },
                  { name: "Alphonso Mango 🥭", date: "May 26, 4:40 PM", score: "88% Optimal", grade: "Export Optimal" }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between transition-all duration-300",
                      isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-100"
                    )}
                  >
                    <div>
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <p className="text-[10px] opacity-40 mt-0.5">{item.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400 block">{item.score}</span>
                      <span className="text-[10px] opacity-50 block">{item.grade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Chat History Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
            {/* Backdrop blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={cn(
                "relative w-full max-w-2xl p-4 rounded-[24px] border backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.3)] overflow-hidden z-10 flex flex-col gap-4",
                isDark 
                  ? "bg-[#1e1f20]/95 border-white/10 text-white" 
                  : "bg-white/95 border-slate-200 text-slate-800"
              )}
            >
              {/* Search Input Area */}
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                isDark ? "bg-black/20 border-white/5 focus-within:border-emerald-500/50" : "bg-slate-50 border-slate-200 focus-within:border-emerald-500/50"
              )}>
                <Search className={cn("w-5 h-5", isDark ? "text-slate-400" : "text-slate-500")} />
                <input 
                  type="text"
                  placeholder="Search chat history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-slate-500"
                  autoFocus
                />
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-500/20 transition-colors"
                >
                  <X className="w-4 h-4 opacity-50" />
                </button>
              </div>

              {/* Recent History / Results */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 pb-2">
                <div className="flex items-center justify-between px-2 mt-2 mb-1">
                  <div className="text-[10px] font-bold tracking-wider uppercase opacity-40">Recent Searches</div>
                  {recentSearches.length > 0 && (
                    <button 
                      onClick={() => setRecentSearches([])}
                      className="text-[10px] font-bold text-red-500 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      CLEAR ALL
                    </button>
                  )}
                </div>
                
                {recentSearches.filter(item => item.q.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all duration-200 group",
                      isDark ? "hover:bg-white/5" : "hover:bg-slate-100"
                    )}
                  >
                    <button 
                      onClick={() => {
                        executeQuery(item.q, item.contextFruit);
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      {item.contextFruit?.image ? (
                        <div className="w-6 h-6 shrink-0 rounded-md overflow-hidden bg-white/10 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.contextFruit.image} alt="thumbnail" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <History className={cn("w-4 h-4 shrink-0", isDark ? "text-slate-400" : "text-slate-500")} />
                      )}
                      <span className="text-sm font-medium truncate">{item.q}</span>
                    </button>
                    <div className="flex items-center gap-3 pl-2">
                      <span className="text-[10px] opacity-40 group-hover:hidden shrink-0">{formatTimeAgo(item.timestamp, item.date)}</span>
                      <button 
                        onClick={() => setRecentSearches(prev => prev.filter(i => i.id !== item.id))}
                        className="hidden group-hover:flex p-1.5 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors opacity-60 hover:opacity-100"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {searchQuery && recentSearches.filter(item => item.q.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="py-8 text-center opacity-50 text-sm">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                )}

                {!searchQuery && recentSearches.length === 0 && (
                  <div className="py-8 text-center opacity-50 text-sm">
                    No recent searches.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hyperspectral Camera Viewfinder Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={stopCamera}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={cn(
                "relative w-full max-w-lg p-6 rounded-[32px] border shadow-[0_24px_50px_rgba(0,0,0,0.4)] overflow-hidden z-10",
                isDark 
                  ? "bg-[#0b0c17]/95 border-white/10 text-white" 
                  : "bg-white/95 border-slate-200 text-slate-800"
              )}
            >
              {/* Close Button */}
              <button 
                onClick={stopCamera}
                className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer z-20 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-lg tracking-tight mb-1 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" /> Fruit Vision Hyperspectral Camera
              </h3>
              <p className="text-xs opacity-50 mb-4">Aim viewfinder at the specimen fruit for spectral scanning analysis.</p>

              {/* Viewfinder Frame */}
              <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-white/10 shadow-inner flex items-center justify-center mb-5">
                {cameraStream ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Fallback Mock Scanner Viewfinder Grid Animation
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05050a]">
                    {/* Pulsing scanning lines */}
                    <div className="absolute inset-0 border-[2px] border-emerald-500/10 m-6 rounded-xl overflow-hidden">
                      <motion.div 
                        animate={{ top: ["0%", "100%", "0%"] }} 
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent left-0" 
                      />
                    </div>

                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                      className="relative w-28 h-28 border border-emerald-500/30 rounded-full flex items-center justify-center"
                    >
                      <div className="w-24 h-24 border border-dashed border-emerald-500/20 rounded-full flex items-center justify-center">
                        <div className="w-10 h-10 border border-emerald-500/40 rounded-full bg-emerald-500/5" />
                      </div>
                      {/* Crosshairs */}
                      <div className="absolute w-4 h-[1px] bg-emerald-400 left-[-8px]" />
                      <div className="absolute w-4 h-[1px] bg-emerald-400 right-[-8px]" />
                      <div className="absolute w-[1px] h-4 bg-emerald-400 top-[-8px]" />
                      <div className="absolute w-[1px] h-4 bg-emerald-400 bottom-[-8px]" />
                    </motion.div>

                    {/* HUD metrics overlay */}
                    <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[9px] font-mono text-emerald-400/70 select-none">
                      <div className="flex flex-col gap-0.5">
                        <span>LIDAR DIST: 0.35m</span>
                        <span>IR GAIN: 18.5dB</span>
                      </div>
                      <div className="text-right flex flex-col gap-0.5">
                        <span>TARGET: ACQUIRED</span>
                        <span>SPECTRAL GRID: OK</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Laser crosshair watermark overlaid on top of video stream */}
                {cameraStream && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-24 h-24 border border-rose-500/40 rounded-full flex items-center justify-center animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-rose-500/60" />
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="text-[11px] font-mono text-amber-500/80 bg-amber-500/10 p-3 rounded-xl mb-4 leading-relaxed border border-amber-500/15">
                  {cameraError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Capture Specimen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
