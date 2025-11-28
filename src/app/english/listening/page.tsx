"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ListeningTask {
  id: string;
  icon: string;
  title: string;
  type: string;
  level: string;
  description: string;
  duration: string;
  speakers: string;
  accent: string;
  questions: number;
  tags: string[];
  recommended?: boolean;
  attempts: number;
  color: string;
}

interface KeyVocabulary {
  word: string;
  meaning: string;
  ipa?: string;
}

interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface GapSegment {
  id: string;
  before: string;
  after: string;
  answer: string;
  timestamp: number;
  difficulty: "easy" | "hard";
}

interface LessonDetail {
  audioUrl: string;
  vocabulary: KeyVocabulary[];
  transcript: TranscriptLine[];
  dictation: GapSegment[];
  gistPrompt: string;
  detailPrompt: string;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type GapStatus = "blank" | "correct" | "near" | "wrong";

const LESSON_DETAILS: Record<string, LessonDetail> = {
  "conv-restaurant": {
    audioUrl:
      "https://cdn.pixabay.com/download/audio/2022/03/15/audio_0af9394f0d.mp3?filename=english-lesson-11274.mp3",
    vocabulary: [
      { word: "reservation", meaning: "booking a table in advance", ipa: "/ˌrɛzəˈveɪʃən/" },
      { word: "appetizers", meaning: "small dishes before the main course", ipa: "/ˈæpɪˌtaɪzərz/" },
      { word: "recommendation", meaning: "a suggested choice", ipa: "/ˌrɛkəˌmɛnˈdeɪʃən/" },
      { word: "complimentary", meaning: "provided for free", ipa: "/ˌkɑmpləˈmɛntri/" },
      { word: "vegetarian", meaning: "without meat or fish", ipa: "/ˌvɛʤəˈtɛriən/" },
    ],
    transcript: [
      {
        id: "t1",
        speaker: "Waiter",
        text: "Good evening! Welcome to our restaurant. Do you have a reservation?",
        start: 5,
        end: 11,
      },
      {
        id: "t2",
        speaker: "Customer",
        text: "Hi! It's just me tonight. Could I get a table for one by the window?",
        start: 12,
        end: 18,
      },
      {
        id: "t3",
        speaker: "Waiter",
        text: "Of course. Here's our menu. Today's specials are handwritten at the top.",
        start: 19,
        end: 24,
      },
      {
        id: "t4",
        speaker: "Customer",
        text: "Thanks! What appetizer would you recommend?",
        start: 25,
        end: 30,
      },
      {
        id: "t5",
        speaker: "Waiter",
        text: "The roasted tomato soup is popular, and the bruschetta is complimentary tonight.",
        start: 31,
        end: 39,
      },
      {
        id: "t6",
        speaker: "Customer",
        text: "Great! I'll take the soup and the grilled salmon for my main course.",
        start: 40,
        end: 48,
      },
    ],
    dictation: [
      {
        id: "g1",
        before: "Good evening! Welcome to our restaurant. Do you have a",
        after: "?",
        answer: "reservation",
        timestamp: 6,
        difficulty: "easy",
      },
      {
        id: "g2",
        before: "Today's specials are",
        after: "at the top.",
        answer: "handwritten",
        timestamp: 21,
        difficulty: "hard",
      },
      {
        id: "g3",
        before: "The roasted tomato soup is popular, and the",
        after: "is complimentary tonight.",
        answer: "bruschetta",
        timestamp: 34,
        difficulty: "hard",
      },
      {
        id: "g4",
        before: "Great! I'll take the soup and the",
        after: "for my main course.",
        answer: "grilled salmon",
        timestamp: 42,
        difficulty: "easy",
      },
    ],
    gistPrompt:
      "First listen: capture 2-3 bullet points about the context before revealing the transcript.",
    detailPrompt:
      "Second listen: fill the inline blanks while using the Replay -5s shortcut whenever needed.",
  },
  default: {
    audioUrl:
      "https://cdn.pixabay.com/download/audio/2022/03/15/audio_0af9394f0d.mp3?filename=english-lesson-11274.mp3",
    vocabulary: [
      { word: "context", meaning: "surrounding situation" },
      { word: "highlight", meaning: "emphasize or light up" },
      { word: "dictation", meaning: "write exactly what you hear" },
    ],
    transcript: [
      {
        id: "d1",
        speaker: "Speaker",
        text: "This is a placeholder transcript. Please update lesson data.",
        start: 0,
        end: 5,
      },
    ],
    dictation: [
      {
        id: "d-gap-1",
        before: "This is a",
        after: "transcript.",
        answer: "placeholder",
        timestamp: 1,
        difficulty: "easy",
      },
    ],
    gistPrompt: "First listen: focus on the big picture.",
    detailPrompt: "Second listen: fill every missing word inline.",
  },
};

const LISTENING_TASKS: ListeningTask[] = [
  {
    id: "conv-restaurant",
      icon: "",
      title: "At the Restaurant",
    type: "Conversation",
      level: "A2",
    description: "Customer and waiter talk through ordering dinner.",
    duration: "4:10",
      speakers: "2 speakers",
      accent: "American",
    questions: 6,
      tags: ["Dining", "Daily Life"],
    recommended: true,
    attempts: 0,
      color: "blue",
    },
    {
    id: "conv-job-interview",
      icon: "",
      title: "Job Interview Practice",
    type: "Conversation",
      level: "B1",
    description: "Formal interview between employer and candidate",
    duration: "4:15",
      speakers: "2 speakers",
      accent: "British",
    questions: 10,
      tags: ["Business", "Career"],
    recommended: true,
    attempts: 0,
    color: "blue",
  },
  {
    id: "conv-doctor",
    icon: "",
    title: "Doctor's Appointment",
    type: "Conversation",
    level: "A2",
    description: "Patient talking to doctor about symptoms",
    duration: "3:20",
    speakers: "2 speakers",
    accent: "🇺🇸 American",
    questions: 8,
    tags: ["Healthcare", "Daily Life"],
    attempts: 0,
    color: "blue",
  },
  {
    id: "conv-shopping",
    icon: "",
    title: "Shopping for Clothes",
    type: "Conversation",
    level: "A2",
    description: "Customer asking for help in a clothing store",
    duration: "3:00",
    speakers: "2 speakers",
    accent: "Australian",
    questions: 7,
    tags: ["Shopping", "Daily Life"],
    attempts: 0,
    color: "blue",
  },
  {
    id: "podcast-tech",
      icon: "",
    title: "Technology Trends 2024",
    type: "Podcast",
      level: "C1",
    description: "Discussion about AI and future technology",
    duration: "12:00",
      speakers: "3 speakers",
      accent: "Mixed accents",
    questions: 15,
      tags: ["Technology", "AI", "Future"],
    recommended: true,
    attempts: 0,
    color: "green",
  },
  {
    id: "podcast-reading",
    icon: "",
    title: "The Reading Corner",
    type: "Podcast",
    level: "B2",
    description: "Authors discussing their latest books",
    duration: "18:30",
    speakers: "2 speakers",
    accent: "🇬🇧 British",
    questions: 12,
    tags: ["Literature", "Culture"],
    attempts: 0,
    color: "green",
  },
  {
    id: "podcast-health",
    icon: "",
    title: "Health & Wellness",
    type: "Podcast",
    level: "B2",
    description: "Expert advice on maintaining a healthy lifestyle",
    duration: "15:45",
    speakers: "2 speakers",
    accent: "🇺🇸 American",
    questions: 12,
    tags: ["Health", "Lifestyle"],
    attempts: 0,
    color: "green",
  },
  {
    id: "news-climate",
    icon: "",
    title: "Global Climate Summit",
    type: "News Report",
    level: "B2",
    description: "Latest news on environmental policies",
    duration: "5:45",
    speakers: "News anchor",
    accent: "🇺🇸 American",
    questions: 8,
    tags: ["Environment", "Politics"],
    attempts: 0,
    color: "purple",
  },
  {
    id: "news-market",
    icon: "",
    title: "Stock Market Update",
    type: "News Report",
    level: "C1",
    description: "Analysis of today's market movements",
    duration: "6:20",
    speakers: "Financial analyst",
    accent: "🇬🇧 British",
    questions: 10,
    tags: ["Finance", "Economy"],
    attempts: 0,
    color: "purple",
  },
  {
    id: "news-sports",
    icon: "",
    title: "Sports Headlines",
    type: "News Report",
    level: "B1",
    description: "Recap of the week's major sporting events",
    duration: "4:30",
    speakers: "Sports reporter",
    accent: "🇬🇧 British",
    questions: 7,
    tags: ["Sports", "News"],
    attempts: 0,
    color: "purple",
  },
  {
    id: "lecture-physics",
    icon: "",
    title: "Introduction to Quantum Physics",
    type: "Lecture",
    level: "C2",
    description: "Basic principles and applications",
    duration: "25:00",
    speakers: "Professor",
    accent: "🇺🇸 American",
    questions: 20,
    tags: ["Science", "Physics", "Academic"],
    attempts: 0,
    color: "teal",
  },
  {
    id: "lecture-art",
    icon: "",
    title: "Renaissance Art History",
    type: "Lecture",
    level: "B2",
    description: "Evolution of art during the Renaissance period",
    duration: "15:30",
    speakers: "Art historian",
    accent: "🇬🇧 British",
    questions: 12,
    tags: ["History", "Art", "Culture"],
    attempts: 0,
    color: "teal",
  },
  {
    id: "lecture-economics",
    icon: "",
    title: "Introduction to Economics",
    type: "Lecture",
    level: "B2",
    description: "Basic economic principles and market behavior",
    duration: "20:00",
    speakers: "Professor",
    accent: "🇺🇸 American",
    questions: 15,
    tags: ["Economics", "Business", "Academic"],
    attempts: 0,
    color: "teal",
  },
];

const speedOptions = [0.8, 1, 1.2];
const SPEED_LABELS = speedOptions.map((speed) => `${speed.toFixed(1)}x`);
const SPEED_LABELS_INLINE = SPEED_LABELS.join(" / ");

const formatTime = (seconds: number) => {
  if (Number.isNaN(seconds)) {
    return "0:00";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Improved answer classification with better tolerance for variations
 */
const classifyAnswer = (attemptRaw: string, correctRaw: string): GapStatus => {
  const attempt = attemptRaw.trim().toLowerCase();
  const correct = correctRaw.trim().toLowerCase();
  
  if (!attempt) return "blank";
  
  // Exact match
  if (attempt === correct) return "correct";
  
  // Remove punctuation and extra spaces for comparison
  const normalize = (str: string) => str.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  const normalizedAttempt = normalize(attempt);
  const normalizedCorrect = normalize(correct);
  
  if (normalizedAttempt === normalizedCorrect) return "correct";
  
  // Check for plural/singular variations
  const attemptBase = normalizedAttempt.replace(/s$/, "");
  const correctBase = normalizedCorrect.replace(/s$/, "");
  if (attemptBase === normalizedCorrect || normalizedAttempt === correctBase) return "near";
  if (attemptBase === correctBase && attemptBase.length > 0) return "near";
  
  // Check for common spelling variations (ed/ing endings)
  if (normalizedAttempt.replace(/ed$/, "") === normalizedCorrect.replace(/ed$/, "")) return "near";
  if (normalizedAttempt.replace(/ing$/, "") === normalizedCorrect.replace(/ing$/, "")) return "near";
  
  // Levenshtein distance - more lenient for longer words
  const distance = levenshtein(normalizedAttempt, normalizedCorrect);
  const maxDistance = normalizedCorrect.length <= 4 ? 1 : Math.max(1, Math.floor(normalizedCorrect.length / 4));
  
  if (distance <= maxDistance) {
    // Additional check: if the attempt contains the correct word or vice versa
    if (normalizedAttempt.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedAttempt)) {
      return "near";
    }
    return "near";
  }
  
  return "wrong";
};

export default function ListeningPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<ListeningTask | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [tasks, setTasks] = useState<ListeningTask[]>(LISTENING_TASKS);
  const [lessons, setLessons] = useState<Record<string, LessonDetail>>(LESSON_DETAILS);
  const [loading, setLoading] = useState(false);
  const [loadingLesson, setLoadingLesson] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [learningMode, setLearningMode] = useState(false);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [shadowingActive, setShadowingActive] = useState(false);
  const [shadowingIndex, setShadowingIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const gapRefs = useRef<HTMLInputElement[]>([]);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load lessons from API
  useEffect(() => {
    const loadLessons = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/listening/lessons");
        if (response.ok) {
          const data = await response.json();
          const loadedTasks: ListeningTask[] = data.lessons.map((lesson: any) => ({
            id: lesson.id,
            icon: getIconForLevel(lesson.level),
            title: lesson.title, // Use title from API (cleaned from filename)
            type: lesson.category || "General",
            level: mapLevel(lesson.level),
            description: lesson.hasTranscript 
              ? `${lesson.segmentCount} segments with full transcript`
              : `${lesson.segmentCount} segments`,
            duration: formatTime(lesson.duration || 0),
            speakers: "Multiple",
            accent: "American",
            questions: lesson.segmentCount,
            tags: lesson.category ? [lesson.category] : ["General"],
            attempts: 0,
            color: getColorForLevel(lesson.level),
            recommended: lesson.hasTranscript, // Mark lessons with transcripts as recommended
          }));

          // Don't load all lesson details upfront - load on demand when selected
          // This improves performance and reduces initial load time
          const loadedLessons: Record<string, LessonDetail> = {};

          // Sort loaded tasks: Beginner -> Intermediate -> Advanced
          const levelOrder = { "A1-A2": 1, "B1-B2": 2, "C1-C2": 3 };
          const sortedLoadedTasks = loadedTasks.sort((a, b) => {
            const aLevel = levelOrder[a.level as keyof typeof levelOrder] || 999;
            const bLevel = levelOrder[b.level as keyof typeof levelOrder] || 999;
            if (aLevel !== bLevel) return aLevel - bLevel;
            return a.title.localeCompare(b.title);
          });
          
          // Combine: hardcoded tasks first, then loaded tasks sorted by level
          const sortedTasks = [...LISTENING_TASKS, ...sortedLoadedTasks];
          setTasks(sortedTasks);
          setLessons({ ...LESSON_DETAILS, ...loadedLessons });
        }
      } catch (error) {
        console.error("Error loading lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLessons();
  }, []);

  // Load lesson details when a task is selected
  useEffect(() => {
    const loadLessonDetail = async () => {
      if (!selectedTask || lessons[selectedTask.id]) return;
      
      setLoadingLesson(true);
      try {
        const detailResponse = await fetch(`/api/listening/lessons/${selectedTask.id}`);
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          setLessons((prev) => ({
            ...prev,
            [selectedTask.id]: {
              audioUrl: detailData.audioUrl,
              vocabulary: detailData.vocabulary || [],
              transcript: detailData.segments.map((seg: any, idx: number) => ({
                id: seg.id || `t${idx}`,
                speaker: "Speaker",
                text: seg.text,
                start: seg.start,
                end: seg.end,
              })),
              dictation: detailData.dictation || [],
              gistPrompt: "First listen: capture the main ideas.",
              detailPrompt: "Second listen: fill the gaps.",
            },
          }));
        }
      } catch (error) {
        console.error(`Error loading lesson ${selectedTask.id}:`, error);
      } finally {
        setLoadingLesson(false);
      }
    };

    loadLessonDetail();
  }, [selectedTask, lessons]);

  const activeLesson = useMemo(() => {
    if (!selectedTask) return lessons.default || LESSON_DETAILS.default;
    return lessons[selectedTask.id] ?? lessons.default ?? LESSON_DETAILS.default;
  }, [selectedTask, lessons]);

  // Group tasks by level for better organization
  const groupedTasks = useMemo(() => {
    const filtered = filterType === "All types"
      ? tasks
      : tasks.filter((task) => task.type === filterType);
    
    const groups: Record<string, ListeningTask[]> = {
      "Beginner (A1-A2)": [],
      "Intermediate (B1-B2)": [],
      "Advanced (C1-C2)": [],
      "Other": [],
    };
    
    filtered.forEach((task) => {
      if (task.level === "A1-A2" || task.level.startsWith("A")) {
        groups["Beginner (A1-A2)"].push(task);
      } else if (task.level === "B1-B2" || task.level.startsWith("B")) {
        groups["Intermediate (B1-B2)"].push(task);
      } else if (task.level === "C1-C2" || task.level.startsWith("C")) {
        groups["Advanced (C1-C2)"].push(task);
      } else {
        groups["Other"].push(task);
      }
    });
    
    return groups;
  }, [tasks, filterType]);

  const filteredTasks =
    filterType === "All types"
      ? tasks
      : tasks.filter((task) => task.type === filterType);

  const uniqueTypes = useMemo(
    () => ["All types", ...Array.from(new Set(tasks.map((t) => t.type)))],
    [tasks],
  );

  // Helper functions
  const getIconForLevel = (level: string) => {
    return "";
  };

  const mapLevel = (level: string) => {
    if (level === "Beginner") return "A1-A2";
    if (level === "Intermediate") return "B1-B2";
    if (level === "Advanced") return "C1-C2";
    return "A1";
  };

  const getColorForLevel = (level: string) => {
    if (level === "Beginner") return "green";
    if (level === "Intermediate") return "blue";
    if (level === "Advanced") return "purple";
    return "blue";
  };

  const speakWord = useCallback((word: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.9;
    u.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const handleReplay = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
  }, []);

  const seekAndPlay = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    void audioRef.current.play();
  }, []);

  const handleSpeedChange = (value: number) => {
    setPlaybackRate(value);
    if (audioRef.current) {
      audioRef.current.playbackRate = value;
      if ("preservesPitch" in audioRef.current) {
        // @ts-expect-error preservesPitch vendor prefix
        audioRef.current.preservesPitch = true;
      }
    }
  };

  const handleGapChange = (gapId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [gapId]: value }));
  };

  const evaluatedGaps = useMemo(() => {
    if (!submitted) return [];
    return activeLesson.dictation.map((segment) => {
      const attempt = answers[segment.id] ?? "";
      const status = classifyAnswer(attempt, segment.answer);
      return { ...segment, attempt, status };
    });
  }, [activeLesson.dictation, answers, submitted]);

  const gapStatusMap = useMemo(() => {
    const map: Record<string, GapStatus> = {};
    evaluatedGaps.forEach((gap) => {
      map[gap.id] = gap.status;
    });
    return map;
  }, [evaluatedGaps]);

  const correctCount = evaluatedGaps.filter((g) => g.status === "correct").length;
  const nearCount = evaluatedGaps.filter((g) => g.status === "near").length;
  const wrongCount = evaluatedGaps.filter((g) => g.status === "wrong").length;
  const blankCount = evaluatedGaps.filter((g) => g.status === "blank").length;
  const totalGaps = activeLesson.dictation.length;
  
  // Calculate accuracy: correct = 100%, near = 50%, wrong/blank = 0%
  const accuracy = totalGaps
    ? Math.round(((correctCount + nearCount * 0.5) / totalGaps) * 100)
    : 0;
  
  // Calculate score breakdown
  const scoreBreakdown = {
    correct: correctCount,
    near: nearCount,
    wrong: wrongCount,
    blank: blankCount,
    total: totalGaps,
    percentage: accuracy,
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const resetSession = () => {
    setAnswers({});
    setSubmitted(false);
    setShadowingActive(false);
    setShadowingIndex(0);
  };

  const startShadowing = () => {
    if (!audioRef.current) return;
    setShadowingActive(true);
    setShadowingIndex(0);
    audioRef.current.currentTime = activeLesson.transcript[0]?.start ?? 0;
    void audioRef.current.play();
  };

  const handleShadowingNext = () => {
    if (!audioRef.current) return;
    const nextIndex = shadowingIndex + 1;
    if (nextIndex >= activeLesson.transcript.length) {
      setShadowingActive(false);
        audioRef.current.pause();
      return;
    }
    setShadowingIndex(nextIndex);
    audioRef.current.currentTime = activeLesson.transcript[nextIndex].start;
    void audioRef.current.play();
  };

  const focusNextGap = (index: number) => {
    const nextRef = gapRefs.current[index + 1];
    if (nextRef) {
      nextRef.focus();
    }
  };

  useEffect(() => {
    if (!showPlayer) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleReplay();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleReplay, showPlayer]);

  useEffect(() => {
    if (!showPlayer || !audioRef.current) return;
    const audio = audioRef.current;
    audio.volume = volume / 100;
  }, [volume, showPlayer]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.load();
    setCurrentTime(0);
    setDuration(0);
  }, [activeLesson.audioUrl]);

  useEffect(() => {
    gapRefs.current = [];
    setAnswers({});
    setSubmitted(false);
    setLearningMode(false);
    setShadowingActive(false);
    setShadowingIndex(0);
    setActiveLineId(null);
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!showPlayer || !audioRef.current) return;
    const audio = audioRef.current;
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      const activeLine = activeLesson.transcript.find(
        (line) => audio.currentTime >= line.start && audio.currentTime <= line.end,
      );
      if (activeLine) {
        setActiveLineId(activeLine.id);
      }
      if (
        shadowingActive &&
        activeLesson.transcript[shadowingIndex] &&
        audio.currentTime >= activeLesson.transcript[shadowingIndex].end
      ) {
        audio.pause();
      }
    };
    const handleLoaded = () => setDuration(audio.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [activeLesson.transcript, shadowingActive, shadowingIndex, showPlayer]);

  useEffect(() => {
    if (!learningMode || !activeLineId) return;
    const target = transcriptRefs.current[activeLineId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [learningMode, activeLineId]);

  useEffect(() => {
    if (!showPlayer || !audioRef.current || !waveformRef.current) return;
    let animationId = 0;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    const canvas = waveformRef.current;
    const canvasCtx = canvas.getContext("2d");
    const init = async () => {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      source = audioCtx.createMediaElementSource(audioRef.current as HTMLMediaElement);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasCtx || !analyser) return;
        animationId = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.fillStyle = "#0f172a";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "#38bdf8";
        canvasCtx.beginPath();
        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) {
            canvasCtx.moveTo(x, y);
      } else {
            canvasCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      };
      draw();
    };

    void init();

    return () => {
      cancelAnimationFrame(animationId);
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioCtx) void audioCtx.close();
    };
  }, [showPlayer, selectedTask?.id]);

  const handleTranscriptClick = (start: number) => {
    seekAndPlay(start);
  };

  const renderGapInput = (segment: GapSegment, index: number) => {
    const status = submitted ? gapStatusMap[segment.id] : undefined;
    const userAnswer = answers[segment.id] ?? "";
    
    return (
      <span className="gap-segment">
        <span>{segment.before} </span>
        <span className="gap-input-wrapper">
          <input
            type="text"
            className={`gap-input ${status ? `gap-${status}` : ""}`}
            ref={(el) => {
              if (el) gapRefs.current[index] = el;
            }}
            value={userAnswer}
            onChange={(e) => handleGapChange(segment.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                focusNextGap(index);
              }
            }}
            disabled={submitted}
            style={{
              width: segment.difficulty === "easy" ? `${segment.answer.length + 2}ch` : "12ch",
            }}
            aria-label={`Fill the blank for ${segment.id}`}
            placeholder="answer"
          />
          {submitted && status && (
            <span className="gap-feedback-wrapper">
              {status === "correct" && (
                <span className="gap-feedback gap-correct">Correct</span>
              )}
              {status === "near" && (
                <span className="gap-feedback gap-near">
                  Almost: <strong>{segment.answer}</strong>
                </span>
              )}
              {status === "wrong" && (
                <span className="gap-feedback gap-wrong">
                  Correct: <strong>{segment.answer}</strong>
                </span>
              )}
              {status === "blank" && (
                <span className="gap-feedback gap-blank">
                  Answer: <strong>{segment.answer}</strong>
                </span>
              )}
            </span>
          )}
        </span>
        <span> {segment.after}</span>
      </span>
    );
  };

  const vocabularySection = (
    <div className="vocab-list">
      {activeLesson.vocabulary.slice(0, 5).map((vocab) => (
        <div
          key={vocab.word}
          className={`vocab-card ${hoveredWord === vocab.word ? "hovered" : ""}`}
          onMouseEnter={() => setHoveredWord(vocab.word)}
          onMouseLeave={() => setHoveredWord(null)}
          onFocus={() => setHoveredWord(vocab.word)}
          onBlur={() => setHoveredWord(null)}
          onClick={() =>
            setHoveredWord((prev) => (prev === vocab.word ? null : vocab.word))
          }
          tabIndex={0}
        >
          <div className="vocab-header">
            <span className="word">{vocab.word}</span>
            {vocab.ipa && <span className="ipa">{vocab.ipa}</span>}
            <button
              type="button"
              className="ghost-btn"
              onClick={(event) => {
                event.stopPropagation();
                speakWord(vocab.word);
              }}
            >
              Play
            </button>
          </div>
          <p className="meaning">{vocab.meaning}</p>
        </div>
      ))}
    </div>
  );

  if (showPlayer && selectedTask) {
    return (
      <div className="dashboard-content listening-player">
        {loadingLesson && (
          <div style={{ textAlign: "center", padding: "2rem", background: "#f8fafc", borderRadius: "12px", marginBottom: "1rem" }}>
            <p className="muted">Loading lesson details...</p>
          </div>
        )}
        <section className="card stage-head">
          <div className="stage-info">
              <p className="muted">
              {selectedTask.type} • {selectedTask.level} • {selectedTask.accent}
            </p>
            <h2 className="h2">{selectedTask.title}</h2>
            <p className="muted">{selectedTask.description}</p>
            <div className="stage-tags">
              <span className="chip ghost">Duration {selectedTask.duration}</span>
              <span className="chip ghost">{selectedTask.speakers}</span>
              <span className="chip ghost">{selectedTask.questions} questions</span>
              </div>
          </div>
          <div className="stage-side">
            <div className="stage-roadmap">
              {[
                { title: "Warm-up", desc: "Preview the tricky words" },
                { title: "Active Listening", desc: "Waveform + transcript control" },
                { title: "Review", desc: "Gap-fill, feedback, shadowing" },
              ].map((step, index) => (
                <div key={step.title} className="roadmap-step">
                  <span className="roadmap-index">{index + 1}</span>
                  <div>
                    <p className="roadmap-title">{step.title}</p>
                    <p className="roadmap-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="stage-head-actions">
              <button
                className="btn btn--outline"
                onClick={() => {
                  setShowPlayer(false);
                  setSelectedTask(null);
                  resetSession();
                }}
              >
                ← Back to Library
            </button>
            </div>
          </div>
        </section>

        <section className="card stage pre-listening">
          <header>
            <div>
              <p className="stage-label">Stage 1 · Pre-Listening</p>
              <h3>Key Vocabulary Warm-up</h3>
              </div>
            <span className="muted">Hover to reveal the meaning • Tap Play to hear it</span>
          </header>
          {vocabularySection}
          <div className="pre-instructions">
            <div>
              <strong>Step 1:</strong> Skim these highlighted words so the dialogue never feels shocking.
            </div>
            <div>
              <strong>Step 2:</strong> Set your preferred speed ({SPEED_LABELS_INLINE}) before you hit play.
            </div>
          </div>
        </section>

        <section className="card stage during-listening">
          <header>
            <div>
              <p className="stage-label">Stage 2 · During Listening</p>
              <h3>Smart Player + Interactive Transcript</h3>
            </div>
            <div className="during-actions">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={learningMode}
                  onChange={() => setLearningMode((prev) => !prev)}
                />
                <span>Interactive transcript (karaoke)</span>
              </label>
              <span className="shortcut-hint">Press ← to replay the last 5s</span>
            </div>
          </header>

          <div className="player-shell">
            <div className="player-main">
              <canvas ref={waveformRef} width={800} height={140} />
              <div className="player-controls">
                <button className="btn ghost" onClick={handleReplay}>
                  ⟲ Replay -5s
            </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    if (!audioRef.current) return;
                    if (isPlaying) {
                      audioRef.current.pause();
                    } else {
                      audioRef.current.play();
                    }
                  }}
                >
                  {isPlaying ? "Pause" : "Play"}
            </button>
                <span className="time mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <div className="speed-group">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      className={`chip ${playbackRate === speed ? "active" : ""}`}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed.toFixed(1)}x
            </button>
                  ))}
                </div>
                <label className="volume">
                  Play
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                  />
                </label>
                <audio
                  ref={audioRef}
                  src={activeLesson.audioUrl}
                  preload="metadata"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {learningMode ? (
              <div className="transcript-panel">
                {activeLesson.transcript.map((line) => (
                  <div
                    key={line.id}
                    ref={(el) => {
                      transcriptRefs.current[line.id] = el;
                    }}
                    className={`transcript-line ${
                      activeLineId === line.id ? "active" : ""
                    }`}
                    onClick={() => handleTranscriptClick(line.start)}
                  >
                    <div className="time-badge">{formatTime(line.start)}</div>
                    <div>
                      <strong>{line.speaker}:</strong>{" "}
                      <span>{line.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gist-card">
                <p className="muted">{activeLesson.gistPrompt}</p>
                <textarea placeholder="e.g. (1) Who is speaking? (2) Why are they talking? (3) Key decisions..." />
              </div>
            )}
          </div>
        </section>

        <section className="card stage dictation-stage">
          <header>
            <div>
              <p className="stage-label">Exercise Workspace</p>
              <h3>Inline Gap-Fill Challenge</h3>
              </div>
            <div className="dictation-actions">
              {!submitted && (
                <button className="btn secondary" onClick={handleSubmit}>
                  Submit answers
                </button>
              )}
              {submitted && (
                <button className="btn ghost" onClick={resetSession}>
                  Try again
                </button>
              )}
            </div>
          </header>
          <p className="muted">{activeLesson.detailPrompt}</p>
          <div className="dictation-text">
            {activeLesson.dictation.map((segment, index) => (
              <p key={segment.id} className="dictation-line">
                {renderGapInput(segment, index)}
              </p>
            ))}
            </div>
          </section>

        <section className="card stage post-listening">
          <header>
            <div>
              <p className="stage-label">Stage 3 · Post-Listening</p>
              <h3>Error review & shadowing lab</h3>
            </div>
            <span className="muted">
              Submit to unlock color-coded scoring and audio evidence.
            </span>
          </header>

          {submitted ? (
            <>
              <div className="score-band">
                <div className="score-pill">
                  <span className="score-value">{accuracy}%</span>
                  <span className="score-label">Accuracy</span>
              </div>
                <div className="score-breakdown">
                  <div className="score-item correct">
                    <span className="score-text">
                      <strong>{correctCount}</strong> Perfect
                    </span>
              </div>
                  <div className="score-item near">
                    <span className="score-text">
                      <strong>{nearCount}</strong> Almost
                    </span>
              </div>
                  <div className="score-item wrong">
                    <span className="score-text">
                      <strong>{wrongCount}</strong> Wrong
                    </span>
              </div>
                  {blankCount > 0 && (
                    <div className="score-item blank">
                      <span className="score-text">
                        <strong>{blankCount}</strong> Blank
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="error-list">
                {evaluatedGaps.length === 0 ? (
                  <div className="no-errors">
                    <p>No gaps to review. Please complete the dictation exercise first.</p>
                  </div>
                ) : (
                  <>
                    {/* Show incorrect answers first, then near-correct, then correct */}
                    {evaluatedGaps
                      .sort((a, b) => {
                        const order = { wrong: 0, near: 1, correct: 2, blank: 3 };
                        return (order[a.status] || 3) - (order[b.status] || 3);
                      })
                      .map((gap) => (
                        <button
                          key={gap.id}
                          type="button"
                          className={`error-row status-${gap.status}`}
                          onClick={() => handleTranscriptClick(gap.timestamp)}
                        >
                          <div className="error-content">
                            <div className="error-context">
                              <span className="context-before">{gap.before}</span>
                              <span className={`gap-word status-${gap.status}`}>
                                {gap.status === "correct" ? (
                                  <strong>{gap.attempt || gap.answer}</strong>
                                ) : gap.status === "near" ? (
                                  <>
                                    <s className="user-answer">{gap.attempt || "—"}</s>
                                    <span className="correct-answer"> → {gap.answer}</span>
                                  </>
                                ) : (
                                  <>
                                    <s className="user-answer">{gap.attempt || "—"}</s>
                                    <span className="correct-answer"> → {gap.answer}</span>
                                  </>
                                )}
                              </span>
                              <span className="context-after">{gap.after}</span>
                            </div>
                            <div className="error-details">
                              {gap.status === "correct" && (
                                <span className="status-badge correct">Perfect</span>
                              )}
                              {gap.status === "near" && (
                                <span className="status-badge near">Almost correct</span>
                              )}
                              {gap.status === "wrong" && (
                                <span className="status-badge wrong">Incorrect</span>
                              )}
                              {gap.status === "blank" && (
                                <span className="status-badge blank">Not answered</span>
                              )}
                              <span className="timestamp">@{formatTime(gap.timestamp)}</span>
                            </div>
                          </div>
                          <span className="evidence">
                            {gap.status !== "correct" && "Replay audio ▸"}
                            {gap.status === "correct" && "Correct"}
                          </span>
                </button>
                      ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="muted">
              Complete the dictation above and hit “Submit answers” to see instant feedback and jump-to-audio evidence.
            </p>
          )}

          <div className="shadowing">
            <div className="shadowing-head">
              <h4>Shadowing Mode</h4>
              {!shadowingActive ? (
                <button className="btn primary" disabled={!submitted} onClick={startShadowing}>
                  Start shadowing
                </button>
              ) : (
                <button className="btn ghost" onClick={handleShadowingNext}>
                  Next line ▸
                </button>
              )}
                    </div>
            <p className="muted">
              The system plays one sentence, pauses, and waits for your mimic. Tap any incorrect line above to hear the audio proof again.
            </p>
            {shadowingActive && (
              <div className="shadowing-line">
                <p>
                  <strong>{activeLesson.transcript[shadowingIndex]?.speaker}:</strong>{" "}
                  {activeLesson.transcript[shadowingIndex]?.text}
                </p>
                <textarea placeholder="Note what to improve: linking sounds, stress, rhythm..." />
                </div>
              )}
          </div>
            </section>

        <style jsx>{`
          .listening-player {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .stage-head {
            display: flex;
            justify-content: space-between;
            align-items: stretch;
            gap: 24px;
            background: radial-gradient(circle at top left, #f0f9ff, #ffffff);
            border: 1px solid #e0f2fe;
          }
          .stage-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .stage-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
          }
          .chip.ghost {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #0369a1;
          }
          .stage-side {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;
          }
          .stage-roadmap {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            border-radius: 12px;
            background: #0f172a;
            color: #e2e8f0;
            min-width: 240px;
          }
          .roadmap-step {
            display: flex;
            gap: 10px;
            align-items: center;
          }
          .roadmap-index {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            background: #38bdf8;
            color: #0f172a;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
          }
          .roadmap-title {
            font-weight: 600;
            margin: 0;
          }
          .roadmap-desc {
            margin: 0;
            font-size: 13px;
            color: #cbd5f5;
          }
          .stage {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .stage-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #38bdf8;
            margin-bottom: 4px;
          }
          .vocab-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
          }
          .vocab-card {
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #f8fafc;
            transition: border 0.2s, transform 0.2s;
          }
          .vocab-card.hovered {
            border-color: #38bdf8;
            transform: translateY(-2px);
          }
          .vocab-header {
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: space-between;
          }
          .vocab-header .word {
            font-weight: 600;
          }
          .vocab-header .ipa {
            font-size: 12px;
            color: #94a3b8;
          }
          .meaning {
            margin: 4px 0 0;
            color: #475569;
            font-size: 14px;
            opacity: 0;
            max-height: 0;
            overflow: hidden;
            transition: opacity 0.25s ease, max-height 0.25s ease;
          }
          .vocab-card.hovered .meaning {
            opacity: 1;
            max-height: 120px;
          }
          .ghost-btn {
            border: none;
            background: none;
            font-size: 16px;
            cursor: pointer;
          }
          .pre-instructions {
            display: grid;
            gap: 8px;
            background: #eef9ff;
            padding: 12px;
            border-radius: 10px;
            font-size: 14px;
            color: #0f172a;
          }
          .during-actions {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
          }
          .player-shell {
            display: grid;
            gap: 16px;
          }
          .player-main {
            background: #020617;
            border-radius: 16px;
            padding: 16px;
            color: #e2e8f0;
          }
          canvas {
            width: 100%;
            border-radius: 8px;
            background: #0f172a;
            margin-bottom: 16px;
          }
          .player-controls {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
          }
          .player-controls .chip {
            border: 1px solid #475569;
            background: transparent;
            color: #e2e8f0;
          }
          .player-controls .chip.active {
            background: #38bdf8;
            color: #0f172a;
            border-color: #38bdf8;
          }
          .transcript-panel {
            max-height: 260px;
            overflow-y: auto;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
          }
          .transcript-line {
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            gap: 12px;
          }
          .transcript-line.active {
            background: #e0f2fe;
          }
          .time-badge {
            min-width: 50px;
            font-family: "Roboto Mono", monospace;
            color: #475569;
          }
          .gist-card textarea,
          .shadowing-line textarea {
            width: 100%;
            min-height: 90px;
            border-radius: 12px;
            border: 1px solid #cbd5f5;
            padding: 12px;
            resize: vertical;
          }
          .dictation-text {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 8px;
          }
          .dictation-line {
            font-size: 17px;
            line-height: 1.8;
            color: #0f172a;
            padding: 10px 14px;
            border-radius: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .gap-segment {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            flex-wrap: wrap;
          }
          .gap-input-wrapper {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .gap-input {
            border-radius: 8px;
            border: 2px solid #bae6fd;
            background: #fff;
            padding: 6px 10px;
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            transition: border 0.2s, box-shadow 0.2s, transform 0.2s;
          }
          .gap-input:focus {
            outline: none;
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
            transform: translateY(-1px);
          }
          .gap-input.gap-correct {
            border-color: #22c55e;
            background: #ecfdf5;
            color: #166534;
          }
          .gap-input.gap-near {
            border-color: #f97316;
            background: #fff7ed;
            color: #9a3412;
          }
          .gap-input.gap-wrong {
            border-color: #ef4444;
            background: #fee2e2;
            color: #991b1b;
          }
          .gap-input.gap-blank {
            border-color: #94a3b8;
            background: #f1f5f9;
            color: #64748b;
          }
          .gap-input:disabled {
            cursor: not-allowed;
            opacity: 0.8;
          }
          .gap-feedback-wrapper {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            margin-top: 4px;
          }
          .gap-feedback {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
          }
          .gap-feedback.gap-correct {
            color: #166534;
            background: #dcfce7;
          }
          .gap-feedback.gap-near {
            color: #9a3412;
            background: #ffedd5;
          }
          .gap-feedback.gap-wrong {
            color: #991b1b;
            background: #fee2e2;
          }
          .gap-feedback.gap-blank {
            color: #475569;
            background: #f1f5f9;
          }
          .score-band {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 20px;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            border: 2px solid #e2e8f0;
          }
          .score-pill {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .score-value {
            font-size: 36px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1;
          }
          .score-label {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .score-breakdown {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          .score-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
          }
          .score-item.correct {
            background: #dcfce7;
            color: #166534;
          }
          .score-item.near {
            background: #ffedd5;
            color: #9a3412;
          }
          .score-item.wrong {
            background: #fee2e2;
            color: #991b1b;
          }
          .score-item.blank {
            background: #f1f5f9;
            color: #475569;
          }
          .score-icon {
            font-size: 16px;
            font-weight: 700;
          }
          .score-text {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .score-text strong {
            font-size: 18px;
            font-weight: 700;
          }
          .error-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 16px;
          }
          .no-errors {
            text-align: center;
            padding: 2rem;
            color: #64748b;
          }
          .error-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 16px;
            border-radius: 12px;
            border: 2px solid #e2e8f0;
            background: #fff;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          }
          .error-row:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .error-row.status-correct {
            border-color: #22c55e;
            background: #f0fdf4;
          }
          .error-row.status-near {
            border-color: #f97316;
            background: #fff7ed;
          }
          .error-row.status-wrong {
            border-color: #ef4444;
            background: #fef2f2;
          }
          .error-row.status-blank {
            border-color: #94a3b8;
            background: #f8fafc;
          }
          .error-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .error-context {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px;
            font-size: 15px;
            line-height: 1.6;
          }
          .context-before,
          .context-after {
            color: #64748b;
          }
          .gap-word {
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .gap-word.status-correct {
            color: #166534;
            background: #dcfce7;
          }
          .gap-word.status-near {
            color: #9a3412;
            background: #ffedd5;
          }
          .gap-word.status-wrong,
          .gap-word.status-blank {
            color: #991b1b;
            background: #fee2e2;
          }
          .user-answer {
            text-decoration: line-through;
            color: #991b1b;
            margin-right: 4px;
          }
          .correct-answer {
            color: #166534;
            font-weight: 600;
          }
          .error-details {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .status-badge {
            font-size: 12px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-badge.correct {
            background: #dcfce7;
            color: #166534;
          }
          .status-badge.near {
            background: #ffedd5;
            color: #9a3412;
          }
          .status-badge.wrong {
            background: #fee2e2;
            color: #991b1b;
          }
          .status-badge.blank {
            background: #f1f5f9;
            color: #475569;
          }
          .timestamp {
            font-size: 12px;
            color: #64748b;
            font-family: monospace;
          }
          .evidence {
            color: #0ea5e9;
            font-weight: 600;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          }
          .error-row.status-correct .evidence {
            color: #22c55e;
          }
          .shadowing {
            margin-top: 24px;
            border-top: 1px dashed #cbd5f5;
            padding-top: 16px;
          }
          .shadowing-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-content listening-landing">
      <section className="card hero-head">
        <div className="hero-copy">
          <p className="eyebrow">Immersive Listening Lab</p>
          <h1>Build confident ears, one story at a time</h1>
          <p>
            Curated audio journeys with pre-listening vocabulary, smart waveform controls, and inline
            dictation that flows straight into shadowing feedback.
          </p>
          <div className="hero-cta">
            <button
              className="btn primary"
              onClick={() => {
                setFilterType("Conversation");
              }}
            >
              Explore Conversations
            </button>
            <span className="muted">{filteredTasks.length} active lessons ready today</span>
        </div>
            </div>
        <div className="hero-stats">
          {[
            { label: "Lessons completed", value: "42", trend: "+8 this week" },
            { label: "Average accuracy", value: "86%", trend: "Goal ≥ 85%" },
            { label: "Replay hotkey", value: "←", trend: "Jump back 5s anytime" },
          ].map((stat) => (
            <div key={stat.label} className="hero-stat">
              <p className="hero-value">{stat.value}</p>
              <p className="hero-label">{stat.label}</p>
              <span>{stat.trend}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card filter-card">
        <div className="filter-header">
          <div>
            <p className="eyebrow">Browse by format</p>
            <h3>Pick a mode that fits your mood</h3>
          </div>
          <div className="filter-summary">
            <span className="muted">{filteredTasks.length} audio{filteredTasks.length !== 1 ? "s" : ""} match the filters</span>
          </div>
        </div>
        <div className="filter-chips">
            {uniqueTypes.map((type) => (
            <button
              key={type}
              className={`pill ${filterType === type ? "active" : ""}`}
              onClick={() => setFilterType(type)}
            >
                {type}
            </button>
            ))}
        </div>
      </section>

      <section className="card task-section">
        <div className="task-section-head">
          <div>
            <p className="eyebrow">Choose a Listening Task</p>
            <h3>Dive into real-life conversations, lectures, news, and more</h3>
          </div>
          <button className="btn ghost" onClick={() => setFilterType("All types")}>
            Reset filters
          </button>
        </div>
        {loading && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p className="muted">Loading lessons...</p>
          </div>
        )}
        {!loading && Object.entries(groupedTasks).map(([levelGroup, levelTasks]) => 
          levelTasks.length > 0 && (
            <div key={levelGroup} style={{ marginBottom: "2rem" }}>
              <h4 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
                {levelGroup} ({levelTasks.length} {levelTasks.length === 1 ? "lesson" : "lessons"})
              </h4>
        <div className="task-grid">
                {levelTasks.map((task) => (
            <div key={task.id} className={`task-card task-card-${task.color}`}>
              {task.recommended && (
                <div className="task-badge">
                  <span>Recommended</span>
                </div>
              )}
              
              <div className="task-header">
                <div className={`task-level-badge task-level-${task.level.toLowerCase()}`}>
                  {task.level}
                </div>
                <div className={`task-color-indicator task-color-${task.color}`} />
              </div>
              
              <div className="task-content">
                <h4 className="task-title">{task.title}</h4>
                <span className={`task-type ${task.color}`}>{task.type}</span>
                <p className="muted">
                  {task.description}
                </p>
              </div>

              <div className="task-meta">
                <span className="chip">{task.level} Level</span>
                <span className="chip">{task.duration}</span>
                <span className="chip">{task.speakers}</span>
                <span className="chip">{task.questions} Qs</span>
              </div>

              <div className="task-tags">
                {task.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="task-footer">
                <span className="accent">{task.accent}</span>
                <span className="status-text">
                  {task.attempts > 0 ? `${task.attempts} attempt${task.attempts !== 1 ? "s" : ""}` : "Brand new"}
                </span>
              </div>

              <button
                className="btn primary w-full"
                onClick={() => {
                  setSelectedTask(task);
                  setShowPlayer(true);
                }}
              >
                Start Listening
              </button>
            </div>
          ))}
        </div>
            </div>
          )
        )}
      </section>

      <style jsx>{`
        .listening-landing {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .hero-head {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          color: #e2e8f0;
          overflow: hidden;
        }
        .hero-copy h1 {
          margin: 8px 0;
          color: #f8fafc;
        }
        .hero-copy p {
          color: #cbd5f5;
          max-width: 460px;
        }
        .hero-cta {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .hero-stats {
          display: grid;
          gap: 12px;
        }
        .hero-stat {
          padding: 14px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(248, 250, 252, 0.08);
        }
        .hero-value {
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          color: #f8fafc;
        }
        .hero-label {
          margin: 0;
          color: #cbd5f5;
        }
        .hero-stat span {
          font-size: 13px;
          color: #94a3b8;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }
        .filter-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .filter-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 12px;
        }
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pill {
          border-radius: 999px;
          padding: 10px 18px;
          border: 1px solid #cbd5f5;
          background: #fff;
          color: #0f172a;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .pill.active {
          background: #0ea5e9;
          border-color: #0ea5e9;
          color: #fff;
          box-shadow: 0 10px 20px rgba(14, 165, 233, 0.25);
        }
        .task-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .task-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .task-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .task-card {
          position: relative;
          padding: 20px;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .task-content p {
          font-size: 14px;
          margin-top: 6px;
        }
        .task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .task-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .task-tags .tag {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
        }
        .task-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #475569;
        }
        .task-footer .accent {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
