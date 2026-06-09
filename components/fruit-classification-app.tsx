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
  Trash2,
  Scan,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CpuArchitecture } from "./ui/cpu-architecture";
import { detectFruit } from '@/lib/expert-system/logicEngine';
import { runDetection, runClassification, initOnnxSessions } from '@/lib/onnxEngine';
import { client } from '@gradio/client';

// Interface for predefined fruits in the classification system
interface FruitSample {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  originalImage?: string;
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
  const [yoloImageLoaded, setYoloImageLoaded] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [customResult, setCustomResult] = React.useState<FruitSample | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const [expertResult, setExpertResult] = React.useState<any>(null);
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
  const [savedFruits, setSavedFruits] = React.useState<Array<{ name: string; date: string; timestamp: number }>>([]);

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
      const savedFruitsData = localStorage.getItem("fruitvision_saved_fruits");
      if (savedFruitsData) {
        setSavedFruits(JSON.parse(savedFruitsData));
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

  React.useEffect(() => {
    try {
      if (savedFruits.length > 0) {
        localStorage.setItem("fruitvision_saved_fruits", JSON.stringify(savedFruits));
      } else {
        localStorage.removeItem("fruitvision_saved_fruits");
      }
    } catch (e) {
      console.error("Failed to save fruits", e);
    }
  }, [savedFruits]);
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
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isLiveScanning, setIsLiveScanning] = React.useState(false);
  const [liveClassResult, setLiveClassResult] = React.useState<{className: string, confidence: number} | null>(null);
  const animationRef = React.useRef<number | null>(null);
  
  // Initialize ONNX on mount
  React.useEffect(() => {
    initOnnxSessions().catch(console.error);
  }, []);

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
    setIsLiveScanning(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const toggleLiveScan = () => {
    setIsLiveScanning(prev => !prev);
  };

  // Inference Loop
  React.useEffect(() => {
    if (!isLiveScanning || !videoRef.current || !canvasRef.current || !cameraStream) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setLiveClassResult(null);
      return;
    }

    let isProcessing = false;

    const loop = async () => {
      if (!isProcessing && videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        isProcessing = true;
        
        try {
          if (selectedModel === "detection") {
             const boxes = await runDetection(videoRef.current, canvasRef.current);
             const ctx = canvasRef.current.getContext('2d');
             if (ctx) {
                 ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                 boxes.forEach(box => {
                     // Draw Box
                     ctx.strokeStyle = '#34d399'; // Emerald 400
                     ctx.lineWidth = 3;
                     ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
                     
                     // Draw Background for text
                     ctx.fillStyle = '#34d399';
                     const text = `${box.className} ${(box.confidence * 100).toFixed(0)}%`;
                     ctx.font = 'bold 16px Inter, sans-serif';
                     const textWidth = ctx.measureText(text).width;
                     ctx.fillRect(box.x1, box.y1 - 24, textWidth + 8, 24);
                     
                     // Draw Text
                     ctx.fillStyle = '#000000';
                     ctx.fillText(text, box.x1 + 4, box.y1 - 6);
                 });
             }
          } else {
             const result = await runClassification(videoRef.current);
             setLiveClassResult(result);
             const ctx = canvasRef.current.getContext('2d');
             if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // clear boxes if any
          }
        } catch (err) {
          console.error("Inference Error:", err);
        } finally {
          isProcessing = false;
        }
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLiveScanning, selectedModel, cameraStream]);

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
    } else if (tabId === "info") {
      document.getElementById("info")?.scrollIntoView({ behavior: "smooth" });
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
       // Normal Text Search
       setCustomResult(null);
       setSelectedFruit(null);
       const aiResult = detectFruit(queryText);
       
       // Simulate inference delay
       setTimeout(() => {
         setExpertResult(aiResult);
       }, 1200);
    }
    
    // Stop scanner after UI animation finishes
    setTimeout(() => {
      setScanning(false);
    }, 2500);

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
        
        // If near bottom of the page, active is info
        if (scrollPos + windowHeight >= pageHeight - 150) {
          setActiveTab("info");
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
    setTimeout(() => {
      setScanning(false);
    }, 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (scanning) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value to allow re-uploading the same file reliably
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setSelectedFruit(null);
      const base64Image = reader.result as string;
      
      const seedFruit: FruitSample = {
        id: "custom-upload",
        name: "Detecting...",
        scientificName: "Analyzing...",
        image: base64Image,
        originalImage: base64Image,
        ripeness: Math.floor(Math.random() * 20) + 75,
        ripenessStage: "Optimal",
        freshness: Math.floor(Math.random() * 10) + 88,
        brixLevel: parseFloat((Math.random() * 4 + 11).toFixed(1)),
        bruiseIndex: Math.floor(Math.random() * 10),
        storageTemp: "4°C - 6°C",
        shelfLife: "7 Days",
        exportQuality: Math.random() > 0.3,
        notes: "Scanning with AI Model..."
      };
      
      setExpertResult({
        fruit: "Thinking...",
        confidence: 0,
        score: 0,
        topMatches: [],
        recommendation: "Awaiting AI inference..."
      });
      
      setCustomResult(seedFruit);
      setScanStep(0);
      setScanning(true);
      setYoloImageLoaded(false);

      try {
        const spaceName = selectedModel === "detection" ? "souvikvos/fruitvision-detector" : "souvikvos/fruitvision-classifier";
        const endpoint = selectedModel === "detection" ? "/detect_fruits" : "/classify_fruit";
        
        // Connect directly to HF Space from browser (bypassing Vercel 10s timeout)
        const app = await client(spaceName);
        const predictionResult = await app.predict(endpoint, [file as File]);
        
        const result = { success: true, data: predictionResult.data as any[] };
        
        if (result.success && result.data && result.data.length > 0) {
            let detectedName = "Unknown";
            let yoloConfidence = 0;
            let resultImageUrl = base64Image;

            if (selectedModel === "detection" && result.data.length >= 2) {
                const imageOutput = result.data[0];
                if (imageOutput && imageOutput.url) resultImageUrl = imageOutput.url;

                const textOutput = result.data[1];
                if (typeof textOutput === "string") {
                    const match = textOutput.match(/•\s*([a-zA-Z\s]+)\s*\(([0-9.]+)%\)/);
                    if (match) {
                        detectedName = match[1].trim();
                        yoloConfidence = parseFloat(match[2]);
                    } else {
                        detectedName = textOutput.replace(/[^a-zA-Z\s]/g, '').trim() || "Unknown";
                        yoloConfidence = 85;
                    }
                } else if (typeof textOutput === "object" && textOutput !== null) {
                    if ('label' in textOutput) {
                        detectedName = (textOutput as any).label;
                    } else {
                        detectedName = "Fruit Detected"; 
                        yoloConfidence = 90;
                    }
                }
            } else {
                const prediction = result.data[0];
                if (typeof prediction === "string") {
                    detectedName = prediction;
                    const fruitMatch = prediction.match(/Fruit:\s*([a-zA-Z\s]+)/i);
                    const confMatch = prediction.match(/Confidence:\s*([0-9.]+)/i);
                    if (fruitMatch) detectedName = fruitMatch[1].trim();
                    if (confMatch) yoloConfidence = parseFloat(confMatch[1]);
                } else if (prediction?.label) {
                    detectedName = prediction.label;
                    if (prediction.confidence !== undefined) yoloConfidence = prediction.confidence <= 1 ? prediction.confidence * 100 : prediction.confidence;
                } else if (Array.isArray(prediction) && prediction[0]?.label) {
                    detectedName = prediction[0].label;
                    if (prediction[0].confidence !== undefined) yoloConfidence = prediction[0].confidence <= 1 ? prediction[0].confidence * 100 : prediction[0].confidence;
                } else if (prediction?.confidences && prediction.confidences.length > 0) {
                    detectedName = prediction.confidences[0].label;
                    if (prediction.confidences[0].confidence !== undefined) yoloConfidence = prediction.confidences[0].confidence <= 1 ? prediction.confidences[0].confidence * 100 : prediction.confidences[0].confidence;
                } else {
                    detectedName = typeof prediction === 'object' ? "Detected Object" : String(prediction);
                }
                
                if (yoloConfidence === 0 && typeof prediction === 'object' && prediction !== null) {
                    const obj = Array.isArray(prediction) ? prediction[0] : prediction;
                    if (obj?.score !== undefined) yoloConfidence = obj.score <= 1 ? obj.score * 100 : obj.score;
                }
            }
            
            const aiResult = detectFruit(detectedName);
            setExpertResult(aiResult);
            
            setCustomResult(prev => prev ? { 
              ...prev, 
              image: resultImageUrl,
              originalImage: base64Image,
              name: detectedName, 
              scientificName: `Confirmed by ${selectedModel === "detection" ? "YOLOv8" : "AI Classifier"}`, 
              notes: "AI Inference complete.",
              ripeness: yoloConfidence > 0 ? yoloConfidence : 0 
            } : null);
        } else {
            setCustomResult(prev => prev ? { ...prev, name: "Classification Failed", scientificName: "Check API Token", originalImage: base64Image } : null);
            setExpertResult(null);
        }
      } catch (err) {
        setCustomResult(prev => prev ? { ...prev, name: "Network Error", scientificName: "Server Unreachable", originalImage: base64Image } : null);
        setExpertResult(null);
      } finally {
        setScanning(false);
      }
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
              isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[150px] opacity-100 ml-2 hidden sm:block"
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
              { id: "info", label: "Model Info", icon: Info }
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
                    "hidden md:inline-block transition-all duration-300 origin-left overflow-hidden whitespace-nowrap",
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
                              setCustomResult(null);
                              setExpertResult(null);
                              setSelectedFruit(null);
                              setPrompt("");
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
                              setCustomResult(null);
                              setExpertResult(null);
                              setSelectedFruit(null);
                              setPrompt("");
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
                    ref={fileInputRef}
                    accept="image/*"
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    disabled={scanning}
                  />

                  {/* Always show the simple Upload Box UI */}
                  <div className="w-full h-full relative flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center p-6 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Upload Specimen Image</p>
                        <p className="text-xs opacity-50 mt-1">Supports PNG, JPG, or agricultural raw formats</p>
                      </div>
                    </div>

                    {/* Scanning Laser Beam Effect */}
                    {scanning && (
                      <motion.div 
                        initial={{ top: "0%" }}
                        animate={{ top: "98%" }}
                        transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 z-30 pointer-events-none"
                      />
                    )}
                  </div>

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
            {customResult && !scanning && selectedModel === "detection" ? (
                // --- NEW DETECTION SIDE-BY-SIDE UI ---
                <motion.div
                  key="detection-layout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] flex flex-col gap-6",
                    isDark 
                      ? "bg-[#0b0c17]/50 border-white/[0.08]" 
                      : "bg-white/40 border-white/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Scan className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-bold">Detection Results</h3>
                  </div>
                  
                  {/* Side-by-Side Images */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-mono opacity-60 uppercase text-center">Input Specimen</p>
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative border border-white/10 shadow-lg bg-black/40">
                        <img 
                          src={customResult.originalImage || customResult.image} 
                          alt="Original Specimen" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-mono opacity-60 uppercase text-center text-emerald-400">YOLOv8 Output</p>
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)] bg-black/40">
                        {/* Placeholder while loading */}
                        {!yoloImageLoaded && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0c17]/80 z-10">
                            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mb-3" />
                            <p className="text-[10px] font-mono text-emerald-400/70 uppercase">Receiving YOLOv8 Output...</p>
                          </div>
                        )}
                        <motion.img 
                          src={customResult.image} 
                          alt="Detected Specimen" 
                          className="w-full h-full object-cover relative z-0"
                          initial={{ filter: "blur(20px)", scale: 1.1, opacity: 0 }}
                          animate={yoloImageLoaded ? { filter: "blur(0px)", scale: 1, opacity: 1 } : { filter: "blur(20px)", scale: 1.1, opacity: 0 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          onLoad={() => setYoloImageLoaded(true)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-2">
                    <p className="text-xs font-mono opacity-70 uppercase mb-1">Primary Detection Match</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-black capitalize tracking-tight text-emerald-400">{customResult.name}</p>
                      {(customResult.ripeness || 0) > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-mono opacity-60 uppercase text-emerald-400">Confidence</p>
                          <p className="text-xl font-bold text-emerald-400 tracking-tight">{Math.round(customResult.ripeness)}%</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const sample = customResult || selectedFruit;
                      if (!sample) return;
                      const newItem = {
                        name: `${sample.name || "Unknown Fruit"} ✅`,
                        date: new Date().toLocaleDateString() + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        timestamp: Date.now()
                      };
                      setSavedFruits(prev => {
                        if (prev.some(p => p.name === newItem.name && p.timestamp === newItem.timestamp)) return prev;
                        return [newItem, ...prev];
                      });
                      setShowSavedModal(true);
                    }}
                    className={cn("w-full py-3 mt-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2",
                      isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    <Save className="w-4 h-4" /> Save Result to Dashboard
                  </button>
                </motion.div>
              ) : (customResult || selectedFruit) && !scanning ? (
                // --- IMAGE UPLOAD / CLASSIC CLASSIFICATION LAYOUT ---
                <motion.div
                  key="image-upload-layout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] flex flex-col gap-6",
                    isDark 
                      ? "bg-[#0b0c17]/50 border-white/[0.08]" 
                      : "bg-white/40 border-white/30"
                  )}
                >
                  {(customResult || selectedFruit)?.image && (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden relative border border-white/10 shadow-lg bg-black/40">
                      <motion.img 
                        src={(customResult || selectedFruit)?.image} 
                        alt="Specimen" 
                        className="w-full h-full object-cover"
                        initial={{ filter: "blur(24px)", scale: 1.1, opacity: 0 }}
                        animate={{ filter: "blur(0px)", scale: 1, opacity: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                      />
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono tracking-widest text-white flex items-center gap-1.5 shadow-xl">
                        <Scan className="w-3 h-3 text-emerald-400" /> SCANNED SPECIMEN
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{(customResult || selectedFruit)?.name || "Unknown"}</h3>
                      <p className="text-xs font-mono opacity-50 italic">{(customResult || selectedFruit)?.scientificName || "AI Detected Species"}</p>
                    </div>
                    {((customResult || selectedFruit)?.ripeness || 0) > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] font-mono opacity-60 uppercase text-emerald-400">Confidence</p>
                        <p className="text-2xl font-black text-emerald-400 tracking-tight">
                          {Math.round((customResult || selectedFruit)?.ripeness || 0)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {expertResult?.topMatches && expertResult.topMatches.length > 0 && (
                    <div className="bg-white/5 dark:bg-black/20 rounded-xl p-3 border border-indigo-500/10">
                      <p className="text-[10px] font-mono opacity-60 uppercase mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Top AI Matches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {expertResult.topMatches.map((match: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1 rounded-md text-xs">
                            <span className="font-semibold capitalize">{match.fruit}</span>
                            <span className="opacity-50 text-[10px]">{match.score} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expertResult?.recommendation && (
                    <div className={cn("border rounded-xl p-3 flex gap-3", isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200/60")}>
                      <div className="text-xl">💡</div>
                      <div>
                        <p className={cn("text-[10px] font-mono opacity-60 uppercase mb-0.5", isDark ? "text-amber-400" : "text-amber-700")}>Agronomy Recommendation</p>
                        <p className={cn("text-xs font-medium leading-relaxed", isDark ? "text-amber-200" : "text-amber-900")}>
                          {expertResult.recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const sample = customResult || selectedFruit;
                      if (!sample) return;
                      const newItem = {
                        name: `${sample.name || "Unknown Fruit"} ✅`,
                        date: new Date().toLocaleDateString() + ", " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        timestamp: Date.now()
                      };
                      setSavedFruits(prev => {
                        if (prev.some(p => p.name === newItem.name && p.timestamp === newItem.timestamp)) return prev;
                        return [newItem, ...prev];
                      });
                      setShowSavedModal(true);
                    }}
                    className={cn("w-full py-3 mt-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2",
                      isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    <Save className="w-4 h-4" /> Save Result to Dashboard
                  </button>
                </motion.div>
              ) : expertResult && !scanning && !customResult ? (
                // --- TEXT PROMPT LAYOUT (COMPACT SYMBOLIC AI CARD) ---
                <motion.div
                  key="text-prompt-layout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className={cn(
                    "p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden transition-all duration-500 shadow-xl",
                    isDark 
                      ? "bg-indigo-950/20 border-indigo-500/20" 
                      : "bg-indigo-50 border-indigo-200"
                  )}
                >
                  <div className="flex items-center gap-2 mb-6 border-b border-indigo-500/20 pb-4">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h4 className="font-bold text-lg text-indigo-500 dark:text-indigo-300 tracking-tight">Symbolic AI Output</h4>
                      <p className="text-[10px] font-mono opacity-60 uppercase">Text Analysis Result</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-[11px] font-mono opacity-60 uppercase mb-1">Primary Match</p>
                      <p className="text-3xl font-black capitalize tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                        {expertResult.fruit ? expertResult.fruit : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-mono opacity-60 uppercase mb-1">Confidence Limit</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black">{expertResult.confidence}%</span>
                      </div>
                      <div className={cn("w-full h-1.5 rounded-full mt-2", isDark ? "bg-indigo-900/50" : "bg-indigo-200")}>
                        <motion.div 
                          className="h-full bg-indigo-500 rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${expertResult.confidence}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>

                  {expertResult.topMatches && expertResult.topMatches.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-mono opacity-60 uppercase mb-3 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Keyword Scoring Breakdown
                      </p>
                      <div className="flex flex-col gap-2">
                        {expertResult.topMatches.map((match: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-indigo-500/10 px-3 py-2 rounded-lg text-sm border border-indigo-500/10">
                            <span className="font-semibold capitalize">{match.fruit}</span>
                            <span className="font-mono text-xs opacity-75">{match.score} points</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={cn("border rounded-2xl p-4 flex gap-4", isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200/60")}>
                    <div className="text-2xl mt-1">💡</div>
                    <div>
                      <p className={cn("text-xs font-bold uppercase mb-1 tracking-wider", isDark ? "text-amber-400" : "text-amber-700")}>Expert Recommendation</p>
                      <p className={cn("text-sm font-medium leading-relaxed", isDark ? "text-amber-200" : "text-amber-900")}>
                        {expertResult.recommendation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // --- EMPTY / SCANNING STATE ---
                <div className={cn(
                  "p-8 rounded-[32px] border flex flex-col items-center justify-center min-h-[480px] backdrop-blur-xl transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] relative overflow-hidden",
                  isDark ? "bg-[#0b0c17]/50 border-white/[0.08]" : "bg-white/40 border-white/30 shadow-slate-200/50"
                )}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                  <div className="w-full max-w-[340px] aspect-[2/1] flex items-center justify-center mb-8 relative z-10">
                    <CpuArchitecture text={scanning ? "PROCESSING" : "CORE"} className={cn("w-full h-full drop-shadow-xl transition-all duration-500", scanning ? "opacity-100 scale-105" : "opacity-80 hover:opacity-100")} />
                  </div>
                  <h3 className="font-bold text-lg mb-1 relative z-10">{scanning ? "Analyzing Specimen..." : "Awaiting Specimen Diagnostics"}</h3>
                  <p className="text-xs opacity-50 max-w-[280px] text-center relative z-10">
                    {scanning ? "Neural engines are processing visual and text parameters." : "Select a specimen sample or upload a photo to populate the AI ripeness dashboard instantly."}
                  </p>
                </div>
              )}
            </motion.div>

        </section>

        {/* Model Information Showcase */}
        <section id="info" className="flex flex-col gap-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Model Specifications</h2>
            <p className={cn("text-xs mt-2 font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
              Fruit Vision is powered by three specialized artificial intelligence engines working in tandem. 
              <br/>
              <span className="text-emerald-500 dark:text-emerald-400 font-bold">We will be adding support for more fruits in the upcoming future!</span>
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
            {/* Classification Model */}
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
              <h3 className="font-bold text-sm">Image Classification Engine</h3>
              <p className="text-xs opacity-70 leading-normal mb-2">
                Our primary neural network used for identifying uploaded photos and tracking via live camera feed.
              </p>
              <div className="mt-auto inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg w-fit text-xs font-bold border border-emerald-500/20">
                Trained on 40+ Fruits
              </div>
            </motion.div>

            {/* Detection Model */}
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
                <Scan className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Real-Time Detection YOLO</h3>
              <p className="text-xs opacity-70 leading-normal mb-2">
                A blazing-fast YOLOv8 object detection model that instantly draws bounding boxes around multiple fruits at once.
              </p>
              <div className="mt-auto inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg w-fit text-xs font-bold border border-amber-500/20">
                Trained on 6 Fruits
              </div>
            </motion.div>

            {/* Symbolic AI */}
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
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Symbolic Logic AI Engine</h3>
              <p className="text-xs opacity-70 leading-normal mb-2">
                A rule-based expert system that analyzes descriptive text inputs to deduce the fruit using specific characteristics.
              </p>
              <div className="mt-auto inline-flex items-center gap-2 bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-lg w-fit text-xs font-bold border border-rose-500/20">
                Trained on 50 Fruits
              </div>
            </motion.div>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className={cn(
        "border-t py-28 mt-24 transition-colors duration-300 relative z-10 overflow-hidden",
        isDark ? "bg-[#030308]/90 border-white/5" : "bg-white border-slate-200"
      )}>
        {/* Full-width Grass Pattern */}
        <div className="absolute bottom-0 left-0 w-full h-16 pointer-events-none z-0">
          <svg width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <pattern id="grass-pattern" x="0" y="0" width="80" height="64" patternUnits="userSpaceOnUse">
                {/* Back Layer (Darker, Thinner, Shorter) */}
                <g className={isDark ? "opacity-20" : "opacity-30"}>
                  <path d="M2 64 Q 5 58 1 54" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1" fill="none" strokeLinecap="round" />
                  <path d="M8 64 Q 8 57 12 52" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M15 64 Q 10 58 18 55" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1" fill="none" strokeLinecap="round" />
                  <path d="M22 64 Q 25 55 20 50" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M30 64 Q 28 58 35 53" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1" fill="none" strokeLinecap="round" />
                  <path d="M38 64 Q 42 56 37 51" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M45 64 Q 45 55 50 52" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1" fill="none" strokeLinecap="round" />
                  <path d="M55 64 Q 50 58 58 55" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M62 64 Q 65 54 60 49" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M70 64 Q 68 58 75 55" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1" fill="none" strokeLinecap="round" />
                  <path d="M78 64 Q 78 55 82 50" stroke={isDark ? "#059669" : "#047857"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </g>
                {/* Front Layer (Lighter, Thicker, Taller) */}
                <g className={isDark ? "opacity-40" : "opacity-70"}>
                  <path d="M0 64 Q 5 56 4 48" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M10 64 Q 5 58 15 50" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M18 64 Q 22 55 16 47" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M26 64 Q 24 58 30 52" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M35 64 Q 40 54 32 46" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M42 64 Q 38 56 48 50" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M50 64 Q 55 58 52 48" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M60 64 Q 58 54 65 47" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M68 64 Q 72 58 66 52" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M75 64 Q 70 56 78 48" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </g>
              </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#grass-pattern)" />
          </svg>
        </div>

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

          {/* Dev 1: Souvik (Apple attached to left branch) */}
          <a 
            href="https://github.com/souvikvos" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group absolute flex items-center justify-center pointer-events-auto"
            style={{ left: "113px", top: "45px" }}
          >
            <div className="absolute inset-0 bg-rose-500/30 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-white to-rose-50 dark:from-slate-800 dark:to-slate-900 border-2 border-rose-200 dark:border-rose-900/50 flex items-center justify-center shadow-sm group-hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all duration-300 group-hover:-translate-y-2 group-hover:border-rose-400 z-10 animate-[bounce_3s_infinite_ease-in-out]">
              <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12 drop-shadow-sm">🍎</span>
            </div>
            <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:-translate-y-0 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-3 py-2 rounded-xl text-xs whitespace-nowrap font-bold shadow-xl shadow-rose-500/20 pointer-events-none flex items-center gap-2 z-20 border border-rose-400/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              Souvik Ghosh
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-600 rotate-45 border-b border-r border-rose-400/50" />
            </div>
          </a>

          {/* Dev 2: Soyam (Orange attached to right branch) */}
          <a 
            href="https://github.com/yo-soyam" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group absolute flex items-center justify-center pointer-events-auto"
            style={{ left: "246px", top: "45px" }}
          >
            <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 border-2 border-orange-200 dark:border-orange-900/50 flex items-center justify-center shadow-sm group-hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all duration-300 group-hover:-translate-y-2 group-hover:border-orange-400 z-10 animate-[bounce_3.5s_infinite_ease-in-out]">
              <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12 drop-shadow-sm">🍊</span>
            </div>
            <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:-translate-y-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-xl text-xs whitespace-nowrap font-bold shadow-xl shadow-orange-500/20 pointer-events-none flex items-center gap-2 z-20 border border-orange-400/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              Soyam Bhalotia
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-600 rotate-45 border-b border-r border-orange-400/50" />
            </div>
          </a>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 pointer-events-none">
          <div className="flex items-center gap-3 bg-white/5 dark:bg-black/20 p-2 pr-4 rounded-xl backdrop-blur-md border border-slate-200 dark:border-white/10 pointer-events-auto">
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

          <div className="text-[11px] opacity-70 font-mono text-center md:text-right bg-white/5 dark:bg-black/20 px-4 py-2 rounded-lg backdrop-blur-md border border-slate-200 dark:border-white/10 pointer-events-auto">
            Made with passion by Souvik Ghosh and Soyam Bhalotia
          </div>
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
              <p className="text-xs opacity-50 mb-6">Specimens recorded on local nodes.</p>

              {/* Items List */}
              <div className="flex flex-col gap-3">
                {savedFruits.length > 0 ? savedFruits.map((item, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between transition-all duration-300",
                      isDark ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    )}
                  >
                    <div>
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <p className="text-[10px] opacity-40 mt-0.5">{item.date}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center opacity-50 text-sm">
                    No specimens saved yet. Run an analysis and click "Save Result".
                  </div>
                )}
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
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full max-w-xl p-7 rounded-[32px] border overflow-hidden z-10 shadow-[0_0_80px_-15px_rgba(52,211,153,0.15)] backdrop-blur-2xl",
                isDark 
                  ? "bg-[#0b0c17]/80 border-emerald-500/20 text-white ring-1 ring-white/5" 
                  : "bg-white/90 border-emerald-500/20 text-slate-800 ring-1 ring-black/5"
              )}
            >
              {/* Close Button */}
              <button 
                onClick={stopCamera}
                className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer z-20 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-2xl tracking-tight mb-1 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl ring-1 ring-emerald-500/20">
                  <Camera className="w-5 h-5 text-emerald-400" /> 
                </div>
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                  Fruit Vision Camera
                </span>
              </h3>
              <p className="text-sm opacity-60 mb-6 font-medium pl-12">Initialize live AI tracking to scan specimen.</p>

              {/* Viewfinder Frame */}
              <div className="relative aspect-video w-full rounded-[24px] bg-black overflow-hidden border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.1)] flex items-center justify-center mb-6 ring-1 ring-white/5">
                {cameraStream ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={480}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    
                    {/* Live Classification HUD Overlay */}
                    {isLiveScanning && selectedModel === "classification" && liveClassResult && (
                      <div className="absolute top-4 left-4 right-4 flex justify-center">
                        <div className="bg-black/70 backdrop-blur-md border border-emerald-500/30 px-6 py-3 rounded-2xl flex flex-col items-center shadow-lg">
                           <span className="text-white font-extrabold text-xl tracking-tight drop-shadow-md">
                             {liveClassResult.className}
                           </span>
                           <span className="text-emerald-400 font-mono text-xs font-bold mt-1">
                             CONFIDENCE: {(liveClassResult.confidence * 100).toFixed(1)}%
                           </span>
                        </div>
                      </div>
                    )}
                  </>
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

                {/* Sci-Fi Reticle Watermark overlaid on top of video stream */}
                {cameraStream && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-screen opacity-60">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                      className="relative w-48 h-48 border border-emerald-500/30 rounded-full flex items-center justify-center"
                    >
                      <div className="w-40 h-40 border border-dashed border-emerald-500/40 rounded-full animate-pulse flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                      </div>
                      
                      {/* Targeting Brackets */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-500/80" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-500/80" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-500/80" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-500/80" />
                    </motion.div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="text-[11px] font-mono text-amber-500/80 bg-amber-500/10 p-3 rounded-xl mb-4 leading-relaxed border border-amber-500/15">
                  {cameraError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {cameraStream && (
                  <button
                    onClick={toggleLiveScan}
                    className={cn(
                      "w-full py-4 px-6 rounded-2xl text-sm font-extrabold text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 overflow-hidden relative group",
                      isLiveScanning 
                        ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30" 
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                    <Scan className={cn("w-5 h-5", isLiveScanning && "animate-pulse")} />
                    {isLiveScanning ? "STOP LIVE TRACKING" : "START LIVE TRACKING"}
                  </button>
                )}
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={stopCamera}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 dark:bg-black/20 backdrop-blur-md cursor-pointer"
                  >
                    Close Camera
                  </button>
                  <button
                    onClick={handleCapture}
                    disabled={isLiveScanning}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md"
                  >
                    <Camera className="w-4 h-4" />
                    Snapshot Mock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
