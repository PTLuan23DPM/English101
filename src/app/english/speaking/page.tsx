"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SPEAKING_TASKS, SpeakingTask } from "./data/speakingTasks";

export default function SpeakingPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<SpeakingTask | null>(null);
  const [listening, setListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [transcript, setTranscript] = useState("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "checking">("prompt");
  const [micError, setMicError] = useState<string>("");
  const [conversation, setConversation] = useState<string[]>([]);
  const [conversationSegments, setConversationSegments] = useState<Array<{speaker: string; text: string; start?: number; end?: number}>>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  
  // New features: Mode selection
  const [practiceMode, setPracticeMode] = useState<"read" | "roleplay" | "shadowing" | "dubbing">("read");
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [rolePlayScore, setRolePlayScore] = useState<number | null>(null);
  const [shadowingMode, setShadowingMode] = useState<"blind" | "text">("text");
  const [dubbingDifficulty, setDubbingDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [scoringResult, setScoringResult] = useState<any>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [activityCompleted, setActivityCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set());
  const audioChunksRef = useRef<Blob[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("All levels");

  // Filter tasks by type, level, and search
  const filteredTasks = useMemo(() => {
    return SPEAKING_TASKS.filter(task => {
      const matchesType = filterType === "All types" || task.type === filterType;
      const matchesLevel = levelFilter === "All levels" || task.level === levelFilter;
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesLevel && matchesSearch;
    });
  }, [filterType, levelFilter, searchTerm]);

  const uniqueTypes = ["All types", ...Array.from(new Set(SPEAKING_TASKS.map(t => t.type)))];
  const uniqueLevels = ["All levels", ...Array.from(new Set(SPEAKING_TASKS.map(t => t.level)))];

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Load conversation when task is selected
  useEffect(() => {
    if (selectedTask) {
      loadConversation(selectedTask.id);
    } else {
      setConversation([]);
      setConversationSegments([]);
      setCurrentLineIndex(null);
    }
  }, [selectedTask]);

  // Auto-scroll to current line in Read-Along mode
  useEffect(() => {
    if (practiceMode === "read" && currentLineIndex !== null) {
      const element = document.querySelector(`[data-line-index="${currentLineIndex}"]`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [currentLineIndex, practiceMode]);

  const loadConversation = async (taskId: string) => {
    setLoadingConversation(true);
    try {
      // Map task IDs to JSON filenames (new format)
      const filenameMap: Record<string, string> = {
        "conv-budget-cuts": "1_Budget_Cuts_speaking.json",
        "conv-interview": "2_The_Interview_speaking.json",
        "conv-he-said-she-said": "3_He_Said_-_She_Said_speaking.json",
        "conv-circus": "4_Run_Away_With_the_Circus!_speaking.json",
        "conv-vacation": "5_Greatest_Vacation_of_All_Time_speaking.json",
        "conv-float": "6_Will_It_Float_speaking.json",
        "conv-tour-guide": "7_Tip_Your_Tour_Guide_speaking.json",
        "conv-pets": "8_Pets_Are_Family,_Too!_speaking.json",
      };

      const filename = filenameMap[taskId];
      if (!filename) {
        console.warn(`No conversation file found for task: ${taskId}`);
        setConversation([]);
        setConversationSegments([]);
        return;
      }

      // Fetch from API
      const response = await fetch(`/api/speaking/conversation?file=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation || []);
        setConversationSegments(data.segments || []);
        
        // Set audio URL if filename is available
        if (data.filename) {
          const audioPath = `/api/speaking/audio/${encodeURIComponent(data.filename)}`;
          setAudioUrl(audioPath);
        }
      } else {
        console.error("Failed to load conversation");
        setConversation([]);
        setConversationSegments([]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      setConversation([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const checkMicrophonePermission = async () => {
    setMicPermission("checking");
    try {
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(permissionStatus.state as "granted" | "denied" | "prompt");
        
        permissionStatus.onchange = () => {
          setMicPermission(permissionStatus.state as "granted" | "denied" | "prompt");
        };
      } else {
        setMicPermission("prompt");
      }
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      setMicPermission("prompt");
    }
  };

  const requestMicrophoneAccess = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      setMicError("");
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone access error:", error);
      const errorObj = error as { name?: string };
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setMicPermission("denied");
        setMicError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (errorObj.name === 'NotFoundError') {
        setMicError("No microphone found. Please connect a microphone and try again.");
      } else {
        setMicError("Could not access microphone. Please check your device settings.");
      }
      return false;
    }
  };

  // Timer for recording
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const mmss = useMemo(() => {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [elapsed]);

  const toggleListen = async (segmentIndex?: number) => {
    if (!selectedTask || !audioUrl) return;
    
    if (listening) {
      // Pause audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setListening(false);
    } else {
      // Play audio
      try {
        // Create audio element if not exists
        if (!audioRef.current) {
          audioRef.current = new Audio(audioUrl);
          audioRef.current.addEventListener("ended", () => {
            setListening(false);
          });
          audioRef.current.addEventListener("error", (e) => {
            console.error("Audio playback error:", e);
            setListening(false);
          });
        } else {
          audioRef.current.src = audioUrl;
        }
        
        // If segment index is provided and segment has timestamps, play that segment
        if (segmentIndex !== undefined && conversationSegments[segmentIndex]) {
          const segment = conversationSegments[segmentIndex];
          if (segment.start !== undefined && segment.end !== undefined) {
            const segmentStart = segment.start;
            const segmentEnd = segment.end;
            audioRef.current.currentTime = segmentStart;
            // Listen for timeupdate to pause at segment end
            const checkEnd = () => {
              if (audioRef.current && segmentEnd !== undefined && audioRef.current.currentTime >= segmentEnd) {
                audioRef.current.pause();
                audioRef.current.removeEventListener("timeupdate", checkEnd);
                setListening(false);
              }
            };
            audioRef.current.addEventListener("timeupdate", checkEnd);
          }
        }
        
        await audioRef.current.play();
        setListening(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setListening(false);
      }
    }
  };
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  const startRec = async () => {
    if (micPermission !== "granted") {
      const hasAccess = await requestMicrophoneAccess();
      if (!hasAccess) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Recording stopped, audio blob size:", audioBlob.size);
        
        // Score the recording based on current mode
        await scoreRecording(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    setElapsed(0);
    setRecording(true);
      setMicError("");
    } catch (error) {
      console.error("Recording error:", error);
      setMicError("Failed to start recording. Please check your microphone.");
    }
  };

  const scoreRecording = async (audioBlob: Blob) => {
    setIsScoring(true);
    try {
      let referenceText = "";
      let mode = "roleplay";
      
      // Get reference text based on current mode
      if (practiceMode === "roleplay" && selectedCharacter && conversationSegments[currentTurnIndex]) {
        const currentSegment = conversationSegments[currentTurnIndex];
        if (currentSegment.speaker === selectedCharacter) {
          referenceText = currentSegment.text;
          mode = "roleplay";
        }
      } else if (practiceMode === "shadowing" && conversationSegments[currentLineIndex || 0]) {
        referenceText = conversationSegments[currentLineIndex || 0].text;
        mode = "shadowing";
      } else if (practiceMode === "dubbing" && conversationSegments[currentLineIndex || 0]) {
        referenceText = conversationSegments[currentLineIndex || 0].text;
        mode = "dubbing";
      }
      
      if (!referenceText) {
        setIsScoring(false);
        return;
      }
      
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("referenceText", referenceText);
      formData.append("mode", mode);
      
      console.log("Sending scoring request:", { 
        mode, 
        referenceTextLength: referenceText.length,
        audioSize: audioBlob.size 
      });
      
      let response: Response;
      try {
        response = await fetch("/api/speaking/score", {
          method: "POST",
          body: formData,
        });
      } catch (fetchError) {
        console.error("Fetch failed:", fetchError);
        setScoringResult({
          error: "Network error",
          details: "Failed to connect to scoring service. Please check your connection."
        });
        return;
      }
      
      console.log("Response status:", response.status, response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        try {
          const result = await response.json();
          console.log("Scoring result:", result);
          setScoringResult(result);
          
          // Update transcript from result
          if (result.transcription) {
            setTranscript(result.transcription);
          }
          
          // Set score based on mode
          const score = result.score_10 || result.overall_score || 0;
          if (practiceMode === "roleplay") {
            setRolePlayScore(score);
          }
          
          // Note: User can manually advance to next line using the "Next Line" button
          
          // Activity is considered complete when there's a valid score
          if (score > 0 && !result.error) {
            // Activity can be completed
          }
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          setScoringResult({
            error: "Invalid response",
            details: "The server returned an invalid response format."
          });
        }
      } else {
        // Try to get error message
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = "";
        
        try {
          const contentType = response.headers.get("content-type");
          console.log("Error response content-type:", contentType);
          
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            console.log("Error response JSON:", errorData);
            errorMessage = errorData.error || errorMessage;
            errorDetails = errorData.details || "";
          } else {
            const errorText = await response.text();
            console.log("Error response text:", errorText);
            
            if (errorText) {
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
                errorDetails = errorData.details || "";
              } catch {
                // If not JSON, use text as error message
                errorMessage = errorText || errorMessage;
              }
            }
          }
        } catch (e) {
          console.error("Error reading error response:", e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          errorDetails = "Could not read error details from server";
        }
        
        console.error("Scoring error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          details: errorDetails
        });
        
        // Show user-friendly error message
        setScoringResult({
          error: errorMessage,
          details: errorDetails || (response.status === 503 
            ? "Please start the Python speaking service on port 5002" 
            : response.status === 400
            ? "Invalid request. Please check your recording and try again."
            : "Please try again")
        });
      }
    } catch (error) {
      console.error("Error scoring:", error);
    } finally {
      setIsScoring(false);
    }
  };

  const stopRec = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };
  
  const retry = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setElapsed(0);
    setTranscript("");
    setMicError("");
    setScoringResult(null);
    setRolePlayScore(null);
    setActivityCompleted(false);
    audioChunksRef.current = [];
  };

  const completeActivity = async () => {
    if (!selectedTask || !scoringResult || scoringResult.error) return;
    
    setIsCompleting(true);
    try {
      const score = scoringResult.score_10 || scoringResult.overall_score || 0;
      
      // Save completion to database
      const response = await fetch("/api/speaking/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          score: score,
          mode: practiceMode,
          transcription: scoringResult.transcription || transcript,
          contentAccuracy: scoringResult.content_accuracy,
          pronunciationScore: scoringResult.pronunciation_score,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActivityCompleted(true);
        toast.success("Activity completed successfully!", {
          description: `Your score: ${score}/10`,
        });
        
        // Wait a bit then go back to task selection
        setTimeout(() => {
          setSelectedTask(null);
          setRecording(false);
          setTranscript("");
          setElapsed(0);
          setScoringResult(null);
          setRolePlayScore(null);
          setSelectedCharacter("");
          setCurrentTurnIndex(0);
          setCurrentLineIndex(null);
          setPracticeMode("read");
          setActivityCompleted(false);
        }, 1500);
      } else {
        console.error("Failed to complete activity:", response.status);
        toast.error("Failed to complete activity", {
          description: "Please try again later.",
        });
      }
    } catch (error) {
      console.error("Error completing activity:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Check if activity can be completed (has valid score)
  const canCompleteActivity = useMemo(() => {
    if (!scoringResult || scoringResult.error) return false;
    const score = scoringResult.score_10 || scoringResult.overall_score || 0;
    return score > 0 && !activityCompleted;
  }, [scoringResult, activityCompleted]);

  // Task detail view
  if (selectedTask) {
  return (
      <div className="dashboard-content">
        {/* Back button and header */}
      <section 
        className="card"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          color: "#0f172a",
          border: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: "260px" }}>
            <button 
              className="btn sm" 
              onClick={() => {
                setSelectedTask(null);
                setRecording(false);
                setTranscript("");
                setElapsed(0);
                setScoringResult(null);
                setRolePlayScore(null);
                setSelectedCharacter("");
                setCurrentTurnIndex(0);
                setCurrentLineIndex(null);
                setPracticeMode("read");
              }}
              style={{ background: "rgba(255,255,255,0.9)", color: "#0f172a" }}
            >
              Back to Tasks
            </button>
            <h1 style={{ fontSize: "2rem", marginTop: "12px", color: "#0f172a" }}>
              {selectedTask.title}
            </h1>
            <p style={{ fontSize: "1rem", marginBottom: "12px", color: "#1e293b" }}>
              {selectedTask.prompt.substring(0, 100)}{selectedTask.prompt.length > 100 ? "..." : ""}
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className="chip" style={{ background: "rgba(255,255,255,0.9)", color: "#0f172a" }}>
                {selectedTask.level}
              </span>
              <span className="chip" style={{ background: "rgba(255,255,255,0.9)", color: "#0f172a" }}>
                {selectedTask.type}
              </span>
              <span className="chip" style={{ background: "rgba(255,255,255,0.9)", color: "#0f172a" }}>
                {selectedTask.timeLimit}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: "12px",
              minWidth: "260px",
            }}
          >
            <StatsCard label="Practice Modes" value="4" />
            <StatsCard 
              label="Current Score" 
              value={scoringResult?.score_10 || scoringResult?.overall_score 
                ? `${scoringResult.score_10 || scoringResult.overall_score}/10` 
                : "—"} 
            />
            <StatsCard label="Skill Focus" value="Pronunciation • Fluency" />
          </div>
        </div>
      </section>

      {/* Practice Mode Selector */}
      <div className="card soft" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <strong>Practice Mode</strong>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className={`btn ${practiceMode === "read" ? "" : "outline"}`}
            onClick={() => setPracticeMode("read")}
          >
            Read Along
          </button>
          <button
            className={`btn ${practiceMode === "roleplay" ? "" : "outline"}`}
            onClick={() => setPracticeMode("roleplay")}
          >
            Interactive Role-Play
          </button>
          <button
            className={`btn ${practiceMode === "shadowing" ? "" : "outline"}`}
            onClick={() => setPracticeMode("shadowing")}
          >
            Shadowing
          </button>
          <button
            className={`btn ${practiceMode === "dubbing" ? "" : "outline"}`}
            onClick={() => setPracticeMode("dubbing")}
          >
            Dubbing Challenge
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Left column */}
        <section
          className="card"
          style={{
            flex: 1,
            minWidth: "min(640px, 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Prompt */}
          <div className="card soft">
            <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>Task Description</h3>
            <p style={{ lineHeight: 1.6, marginBottom: "12px" }}>{selectedTask.prompt}</p>
            </div>

          {/* Interactive Role-Play Mode */}
          {practiceMode === "roleplay" && conversationSegments.length > 0 && (
            <div>
              <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Interactive Role-Play</h3>
              <p className="muted" style={{ marginBottom: "16px", fontSize: "1rem", lineHeight: 1.4 }}>
                Choose a character and practice conversation turn-taking
              </p>
              {!selectedCharacter ? (
                <div>
                  <p className="muted" style={{ marginBottom: "16px" }}>
                    Choose a character to play. The system will play the other characters.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from(new Set(conversationSegments.map(s => s.speaker))).filter(s => s && !s.includes("Bot")).map((speaker) => (
                      <button
                        key={speaker}
                        className="btn outline"
                        onClick={() => {
                          setSelectedCharacter(speaker);
                          setCurrentTurnIndex(0);
                        }}
                      >
                        Play as {speaker}
                      </button>
                    ))}
            </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <p className="muted">You are playing as <strong>{selectedCharacter}</strong></p>
                    <button className="btn outline" onClick={() => { setSelectedCharacter(""); setCurrentTurnIndex(0); setRolePlayScore(null); }}>
                      Change Character
                    </button>
                  </div>

                  {/* Current turn display */}
                  {conversationSegments[currentTurnIndex] && (
                    <div style={{ 
                      padding: "20px", 
                      background: conversationSegments[currentTurnIndex].speaker === selectedCharacter ? "#eff6ff" : "#f0fdf4",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      border: `2px solid ${conversationSegments[currentTurnIndex].speaker === selectedCharacter ? "#2563eb" : "#22c55e"}`
                    }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", marginBottom: "8px" }}>
                        {conversationSegments[currentTurnIndex].speaker === selectedCharacter ? "Your Turn" : "System's Turn"}
                      </div>
                      <div style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
                        <strong>{conversationSegments[currentTurnIndex].speaker}:</strong> {conversationSegments[currentTurnIndex].text}
                      </div>
                      {conversationSegments[currentTurnIndex].speaker === selectedCharacter && (
                        <div style={{ marginTop: "16px" }}>
                          <p className="muted" style={{ marginBottom: "8px" }}>Read this line and record:</p>
                          <div style={{ padding: "12px", background: "#fff", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                            {conversationSegments[currentTurnIndex].text}
                          </div>
                          {isScoring && (
                            <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "6px", marginBottom: "12px", textAlign: "center" }}>
                              Scoring your recording...
                            </div>
                          )}
                          {scoringResult?.error && !isScoring && (
                            <div style={{ padding: "12px", background: "#fee2e2", borderRadius: "6px", marginBottom: "12px", color: "#991b1b" }}>
                              <strong>Error:</strong> {scoringResult.error}
                              {scoringResult.details && (
                                <div style={{ marginTop: "4px", fontSize: "0.85rem" }}>{scoringResult.details}</div>
                              )}
                            </div>
                          )}
                          {rolePlayScore !== null && !isScoring && !scoringResult?.error && (
                            <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px", marginBottom: "12px", border: "1px solid #86efac" }}>
                              <div style={{ marginBottom: "12px" }}>
                                <strong style={{ fontSize: "1.1rem", color: "#16a34a" }}>Score: {rolePlayScore}/10</strong>
                                {scoringResult && (
                                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "12px", borderTop: "1px solid #bbf7d0" }}>
                                    <div>
                                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Content</div>
                                      <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#16a34a" }}>
                                        {scoringResult.content_accuracy?.toFixed(1) || 0}%
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Pronunciation</div>
                                      <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#16a34a" }}>
                                        {scoringResult.pronunciation_score?.toFixed(1) || 0}%
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
              <button
                            className={`btn ${recording ? "outline" : "primary"}`}
                            onClick={recording ? stopRec : startRec}
                            disabled={micPermission === "checking"}
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "8px",
                              fontWeight: 600,
                              padding: "12px 24px"
                            }}
                          >
                            {recording ? (
                              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor"/>
                                </svg>
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <circle cx="8" cy="8" r="6" fill="currentColor"/>
                                </svg>
                                Start Recording
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn outline"
                      onClick={() => {
                        if (currentTurnIndex > 0) {
                          setCurrentTurnIndex(currentTurnIndex - 1);
                          setRolePlayScore(null);
                        }
                      }}
                      disabled={currentTurnIndex === 0}
                    >
                      ← Previous
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        if (currentTurnIndex < conversationSegments.length - 1) {
                          setCurrentTurnIndex(currentTurnIndex + 1);
                          setRolePlayScore(null);
                        }
                      }}
                      disabled={currentTurnIndex === conversationSegments.length - 1}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shadowing Mode */}
          {practiceMode === "shadowing" && conversationSegments.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Shadowing Practice</h3>
                  <p className="muted" style={{ fontSize: "1rem", lineHeight: 1.4 }}>
                    Practice pronunciation and rhythm by repeating after the audio
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="muted" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                    Progress
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    {currentLineIndex !== null ? `${(currentLineIndex || 0) + 1} / ${conversationSegments.length}` : "—"}
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Mode:</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className={`btn ${shadowingMode === "blind" ? "primary" : "outline"}`}
                    onClick={() => setShadowingMode("blind")}
                  >
                    Blind Shadowing (No Text)
                  </button>
                  <button
                    className={`btn ${shadowingMode === "text" ? "primary" : "outline"}`}
                    onClick={() => setShadowingMode("text")}
                  >
                    Text Shadowing
                  </button>
                </div>
              </div>
              
              {currentLineIndex === null && (
                <div style={{ padding: "20px", background: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <p className="muted" style={{ marginBottom: "16px" }}>
                    Click "Start" to begin shadowing practice
                  </p>
                  <button
                    className="btn primary"
                    onClick={() => setCurrentLineIndex(0)}
                  >
                    Start Shadowing
                  </button>
                </div>
              )}
              
              {currentLineIndex !== null && conversationSegments[currentLineIndex] && (
                <div>
                  <div style={{ padding: "20px", background: "#f9fafb", borderRadius: "8px", marginBottom: "16px" }}>
                    {shadowingMode === "text" && (
                      <div style={{ marginBottom: "12px" }}>
                        <strong>{conversationSegments[currentLineIndex].speaker}:</strong>
                        <div style={{ fontSize: "1.1rem", marginTop: "8px" }}>
                          {conversationSegments[currentLineIndex].text}
                        </div>
                      </div>
                    )}
                    <p className="muted" style={{ marginBottom: "12px" }}>
                      {shadowingMode === "blind" 
                        ? "Listen to the audio and repeat it without looking at the text."
                        : "Read the text while listening, then repeat it with the same rhythm and intonation."}
                    </p>
                    <button
                      className={`btn ${listening ? "outline" : "primary"}`}
                      onClick={() => toggleListen(currentLineIndex !== null ? currentLineIndex : undefined)}
                      disabled={!audioUrl}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                  {listening ? (
                    <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                      <rect x="9" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                          </svg>
                          Pause
                    </>
                  ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4L12 8L6 12V4Z" fill="currentColor"/>
                          </svg>
                          {currentLineIndex !== null ? "Play This Line" : "Play Audio"}
                        </>
                      )}
                    </button>
                    <button
                      className={`btn ${recording ? "outline" : "primary"}`}
                      onClick={recording ? stopRec : startRec}
                      disabled={micPermission === "checking"}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        fontWeight: 600,
                        padding: "12px 24px"
                      }}
                    >
                      {recording ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor"/>
                </svg>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" fill="currentColor"/>
                          </svg>
                          Start Recording
                        </>
                      )}
              </button>
                  </div>
                  
                  {isScoring && (
                    <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "6px", marginTop: "12px", textAlign: "center" }}>
                      Scoring your shadowing...
              </div>
                  )}
                  {scoringResult && !isScoring && practiceMode === "shadowing" && (
                    <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px", marginTop: "16px", border: "1px solid #86efac" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <strong style={{ fontSize: "1.1rem", color: "#16a34a" }}>
                          Score: {scoringResult.score_10 || scoringResult.overall_score || 0}/10
                        </strong>
                        <button
                          className="btn xs outline"
                          onClick={() => {
                            if (currentLineIndex !== null && currentLineIndex < conversationSegments.length - 1) {
                              setCurrentLineIndex((currentLineIndex || 0) + 1);
                              setScoringResult(null);
                            }
                          }}
                          disabled={currentLineIndex === conversationSegments.length - 1}
                        >
                          Next Line →
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #bbf7d0" }}>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Content Accuracy</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#16a34a" }}>
                            {scoringResult.content_accuracy?.toFixed(1) || 0}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Pronunciation</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#16a34a" }}>
                            {scoringResult.pronunciation_score?.toFixed(1) || 0}%
                          </div>
                        </div>
                      </div>
                      {scoringResult.transcription && (
                        <div style={{ marginTop: "12px", padding: "12px", background: "#fff", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Your speech:</div>
                          <div style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{scoringResult.transcription}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!scoringResult && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "space-between" }}>
                      <button
                        className="btn outline"
                        onClick={() => {
                          if (currentLineIndex !== null && currentLineIndex > 0) {
                            setCurrentLineIndex(currentLineIndex - 1);
                            setScoringResult(null);
                          }
                        }}
                        disabled={currentLineIndex === 0}
                      >
                        ← Previous Line
                      </button>
                      <button
                        className="btn outline"
                        onClick={() => {
                          if (currentLineIndex !== null && currentLineIndex < conversationSegments.length - 1) {
                            setCurrentLineIndex(currentLineIndex + 1);
                            setScoringResult(null);
                          }
                        }}
                        disabled={currentLineIndex === conversationSegments.length - 1}
                      >
                        Next Line →
                      </button>
            </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dubbing Challenge Mode */}
          {practiceMode === "dubbing" && conversationSegments.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Dubbing Challenge</h3>
                  <p className="muted" style={{ fontSize: "1rem", lineHeight: 1.4 }}>
                    Match the timing and rhythm of the original dialogue
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="muted" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                    Progress
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    {currentLineIndex !== null ? `${(currentLineIndex || 0) + 1} / ${conversationSegments.length}` : "—"}
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Difficulty:</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className={`btn ${dubbingDifficulty === "easy" ? "primary" : "outline"}`}
                    onClick={() => setDubbingDifficulty("easy")}
                  >
                    Easy (Full Text)
                  </button>
                  <button
                    className={`btn ${dubbingDifficulty === "medium" ? "primary" : "outline"}`}
                    onClick={() => setDubbingDifficulty("medium")}
                  >
                    Medium (Gap-Fill)
                  </button>
                  <button
                    className={`btn ${dubbingDifficulty === "hard" ? "primary" : "outline"}`}
                    onClick={() => setDubbingDifficulty("hard")}
                  >
                    Hard (Keywords Only)
                  </button>
                </div>
              </div>
              
              {currentLineIndex === null && (
                <div style={{ padding: "20px", background: "#fef3c7", borderRadius: "8px", textAlign: "center" }}>
                  <p className="muted" style={{ marginBottom: "16px" }}>
                    Click "Start" to begin dubbing challenge
                  </p>
                  <button
                    className="btn primary"
                    onClick={() => setCurrentLineIndex(0)}
                  >
                    Start Dubbing
                  </button>
                </div>
              )}
              
              {currentLineIndex !== null && conversationSegments[currentLineIndex] && (
                <div>
                  <div style={{ padding: "20px", background: "#fef3c7", borderRadius: "8px", marginBottom: "16px" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <strong>{conversationSegments[currentLineIndex].speaker}:</strong>
                    </div>
                    <div style={{ 
                      fontSize: dubbingDifficulty === "hard" ? "1.1rem" : "1.2rem", 
                      lineHeight: "1.8", 
                      marginBottom: "16px",
                      padding: "16px",
                      background: dubbingDifficulty === "easy" ? "#f0fdf4" : dubbingDifficulty === "medium" ? "#fef3c7" : "#fee2e2",
                      borderRadius: "8px",
                      border: `2px solid ${dubbingDifficulty === "easy" ? "#86efac" : dubbingDifficulty === "medium" ? "#fbbf24" : "#f87171"}`
                    }}>
                      {dubbingDifficulty === "easy" ? (
                        <div style={{ color: "#166534" }}>
                          {conversationSegments[currentLineIndex].text}
                        </div>
                      ) : dubbingDifficulty === "medium" ? (
                        // Gap-fill: replace important words (nouns, verbs, adjectives) with blanks
                        (() => {
                          const words = conversationSegments[currentLineIndex].text.split(" ");
                          const importantIndices = new Set<number>();
                          // Mark every 2nd-3rd word as gap (but skip very short words)
                          words.forEach((word, i) => {
                            const cleanWord = word.replace(/[.,!?;:]/g, '');
                            if (cleanWord.length > 3 && (i + 1) % 3 === 0) {
                              importantIndices.add(i);
                            }
                          });
                          return words.map((word, i) => 
                            importantIndices.has(i) ? (
                              <span key={i} style={{ 
                                borderBottom: "3px solid #f59e0b", 
                                padding: "0 8px", 
                                minWidth: "80px", 
                                display: "inline-block",
                                fontWeight: 600,
                                color: "#92400e"
                              }}>
                                {"____"}
                              </span>
                            ) : (
                              <span key={i} style={{ color: "#92400e" }}> {word}</span>
                            )
                          );
                        })()
                      ) : (
                        // Hard: show only first letter of each word + keywords
                        <div style={{ color: "#991b1b" }}>
                          {conversationSegments[currentLineIndex].text
                            .split(" ")
                            .map((word, i) => {
                              const cleanWord = word.replace(/[.,!?;:]/g, '');
                              // Show full word for important words (every 4th word or words > 5 chars)
                              if (i % 4 === 0 || cleanWord.length > 5) {
                                return <span key={i} style={{ fontWeight: 600 }}>{word} </span>;
                              }
                              // Show first letter + dots for others
                              return <span key={i} className="muted">{cleanWord[0]}... </span>;
                            })}
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "12px",
                      marginBottom: "12px",
                      padding: "8px 12px",
                      background: "#f8fafc",
                      borderRadius: "6px"
                    }}>
                      <span className="muted" style={{ fontSize: "0.9rem" }}>
                        {dubbingDifficulty === "easy" && "Read the full text while matching the timing"}
                        {dubbingDifficulty === "medium" && "Fill in the blanks while speaking"}
                        {dubbingDifficulty === "hard" && "Use keywords to reconstruct the full sentence"}
                      </span>
                    </div>
                    <p className="muted" style={{ marginBottom: "12px" }}>
                      Speak this line in the time shown. Match the rhythm and timing!
                    </p>
                    <button
                      className={`btn ${listening ? "outline" : "primary"}`}
                      onClick={() => toggleListen(currentLineIndex !== null ? currentLineIndex : undefined)}
                      disabled={!audioUrl}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      {listening ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="5" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                            <rect x="9" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4L12 8L6 12V4Z" fill="currentColor"/>
                          </svg>
                          {currentLineIndex !== null ? "Play This Line" : "Play Reference"}
                        </>
                      )}
                    </button>
                    <button
                      className={`btn ${recording ? "outline" : "primary"}`}
                      onClick={recording ? stopRec : startRec}
                      disabled={micPermission === "checking"}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        fontWeight: 600,
                        padding: "12px 24px"
                      }}
                    >
                      {recording ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor"/>
                          </svg>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" fill="currentColor"/>
                          </svg>
                          Start Recording
                        </>
                      )}
                    </button>
                  </div>
                  
                  {isScoring && (
                    <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "6px", marginTop: "12px", textAlign: "center" }}>
                      Scoring your dubbing...
                    </div>
                  )}
                  {scoringResult && !isScoring && practiceMode === "dubbing" && (
                    <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px", marginTop: "16px", border: "1px solid #86efac" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <strong style={{ fontSize: "1.1rem", color: "#16a34a" }}>
                          Score: {scoringResult.score_10 || scoringResult.overall_score || 0}/10
                        </strong>
                        <button
                          className="btn xs outline"
                          onClick={() => {
                            if (currentLineIndex !== null && currentLineIndex < conversationSegments.length - 1) {
                              setCurrentLineIndex(currentLineIndex + 1);
                              setScoringResult(null);
                            }
                          }}
                          disabled={currentLineIndex === conversationSegments.length - 1}
                        >
                          Next Line →
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #bbf7d0" }}>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Content Accuracy</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#16a34a" }}>
                            {scoringResult.content_accuracy?.toFixed(1) || 0}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Pronunciation</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#16a34a" }}>
                            {scoringResult.pronunciation_score?.toFixed(1) || 0}%
                          </div>
                        </div>
                      </div>
                      {scoringResult.transcription && (
                        <div style={{ marginTop: "12px", padding: "12px", background: "#fff", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Your speech:</div>
                          <div style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{scoringResult.transcription}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!scoringResult && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "space-between" }}>
                      <button
                        className="btn outline"
                        onClick={() => {
                          if (currentLineIndex !== null && currentLineIndex > 0) {
                            setCurrentLineIndex(currentLineIndex - 1);
                            setScoringResult(null);
                          }
                        }}
                        disabled={currentLineIndex === 0}
                      >
                        ← Previous Line
                      </button>
                      <button
                        className="btn outline"
                        onClick={() => {
                          if (currentLineIndex !== null && currentLineIndex < conversationSegments.length - 1) {
                            setCurrentLineIndex(currentLineIndex + 1);
                            setScoringResult(null);
                          }
                        }}
                        disabled={currentLineIndex === conversationSegments.length - 1}
                      >
                        Next Line →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conversation Text - Main Content (Read Along Mode) */}
          {practiceMode === "read" && loadingConversation && (
            <div style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
              Loading conversation...
            </div>
          )}

          {practiceMode === "read" && (conversationSegments.length > 0 || conversation.length > 0) && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Read Along</h3>
                  <p className="muted" style={{ fontSize: "1rem", lineHeight: 1.4 }}>
                    Read along with the conversation. Click on a line to highlight it as you read.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    className="btn outline"
                    onClick={() => {
                      if (currentLineIndex !== null && currentLineIndex > 0) {
                        setCurrentLineIndex(currentLineIndex - 1);
                      } else {
                        setCurrentLineIndex(0);
                      }
                    }}
                    disabled={conversationSegments.length === 0}
                  >
                    ← Previous
                  </button>
                  <span className="muted" style={{ fontSize: "0.9rem" }}>
                    {currentLineIndex !== null ? `${(currentLineIndex || 0) + 1} / ${conversationSegments.length || conversation.length}` : "—"}
                  </span>
                  <button
                    className="btn outline"
                    onClick={() => {
                      const maxIndex = (conversationSegments.length || conversation.length) - 1;
                      if (currentLineIndex !== null && currentLineIndex < maxIndex) {
                        setCurrentLineIndex(currentLineIndex + 1);
                      } else if (currentLineIndex === null) {
                        setCurrentLineIndex(0);
                      }
                    }}
                    disabled={conversationSegments.length === 0}
                  >
                    Next →
                  </button>
                </div>
              </div>
              <div
                ref={(el) => {
                  if (el && currentLineIndex !== null) {
                    const lineEl = el.children[currentLineIndex || 0] as HTMLElement;
                    if (lineEl) {
                      lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }
                }}
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  padding: "20px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "1rem",
                  lineHeight: 1.6,
                }}
              >
                {((conversationSegments.length > 0 ? conversationSegments : conversation.map((text) => ({ speaker: "", text })))).map((item, index) => {
                  const isActive = currentLineIndex === index;
                  // Check if any highlighted words are in this line
                  const hasHighlightedWord = Array.from(highlightedWords).some(word => {
                    const regex = new RegExp(`\\b${word}\\b`, 'i');
                    return regex.test(item.text);
                  });
                  
                  return (
                    <div
                      key={index}
                      data-line-index={index}
                      onClick={() => {
                        setCurrentLineIndex(index);
                        // Auto-scroll to this line
                        setTimeout(() => {
                          const element = document.querySelector(`[data-line-index="${index}"]`);
                          element?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 100);
                      }}
                      style={{
                        padding: "14px 18px",
                        marginBottom: "10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        backgroundColor: isActive ? "#eff6ff" : (hasHighlightedWord ? "#fffbeb" : "transparent"),
                        borderLeft: isActive ? "4px solid #2563eb" : (hasHighlightedWord ? "4px solid #fbbf24" : "4px solid transparent"),
                        fontSize: "1rem",
                        lineHeight: "1.7",
                        border: isActive ? "1px solid #bfdbfe" : (hasHighlightedWord ? "1px solid #fde68a" : "1px solid transparent"),
                        boxShadow: isActive ? "0 2px 4px rgba(37, 99, 235, 0.1)" : (hasHighlightedWord ? "0 2px 4px rgba(251, 191, 36, 0.1)" : "none"),
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = hasHighlightedWord ? "#fef3c7" : "#f8fafc";
                          e.currentTarget.style.borderColor = hasHighlightedWord ? "#fcd34d" : "#e2e8f0";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = hasHighlightedWord ? "#fffbeb" : "transparent";
                          e.currentTarget.style.borderColor = hasHighlightedWord ? "#fde68a" : "transparent";
                        }
                      }}
                    >
                      {item.speaker && (
                        <span style={{ 
                          fontWeight: 700, 
                          color: isActive ? "#1e40af" : "#3b82f6",
                          marginRight: "12px",
                          display: "inline-block",
                          minWidth: "120px",
                          fontSize: "0.95rem",
                          textTransform: "none",
                        }}>
                          {item.speaker}:
                        </span>
                      )}
                      <span 
                        style={{ color: isActive ? "#1e293b" : "#475569" }}
                        dangerouslySetInnerHTML={{ 
                          __html: highlightedWords.size > 0 
                            ? Array.from(highlightedWords).reduce((text, word) => {
                                const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
                                return text.replace(regex, '<mark style="background-color: #fef08a; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</mark>');
                              }, item.text)
                            : item.text
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Listen example */}
          <div className="card soft">
            <h4 style={{ marginBottom: "8px" }}>Listen to Example</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                className={`btn ${listening ? "outline" : "primary"}`}
                onClick={() => toggleListen()}
                disabled={!audioUrl}
                aria-label="Play example"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {listening ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                      <rect x="9" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L12 8L6 12V4Z" fill="currentColor"/>
                    </svg>
                    Play
                  </>
                )}
              </button>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                Listen to the conversation before practicing
              </span>
            </div>
          </div>

          {/* Recording */}
          <div>
            <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Your Recording</h3>
            <p className="muted" style={{ marginBottom: "16px", fontSize: "1rem", lineHeight: 1.4 }}>
              Record your speech and get instant AI feedback
            </p>
              
              {/* Microphone Status */}
              {micPermission === "checking" && (
                <div style={{ padding: "16px", background: "#f1f5f9", borderRadius: "8px", marginBottom: "16px" }}>
                  Checking microphone access...
                </div>
              )}
              {micPermission === "denied" && (
                <div style={{ padding: "16px", background: "#fee2e2", borderRadius: "8px", marginBottom: "16px", color: "#991b1b" }}>
                  <strong>Microphone access denied.</strong> Please allow microphone access in your browser settings and refresh the page.
                </div>
              )}
              {micPermission === "prompt" && !recording && (
                <div style={{ padding: "16px", background: "#fef3c7", borderRadius: "8px", marginBottom: "16px", color: "#92400e" }}>
                  <strong>Microphone permission required.</strong> Click the record button to enable microphone access.
                </div>
              )}
              {micError && (
                <div style={{ padding: "16px", background: "#fee2e2", borderRadius: "8px", marginBottom: "16px", color: "#991b1b" }}>
                  {micError}
                </div>
              )}

            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "16px",
              alignItems: "center"
            }}>
              <button
                className={`btn ${recording ? "outline" : "primary"}`}
                onClick={recording ? stopRec : startRec}
                aria-label={recording ? "Stop Recording" : "Start Recording"}
                  disabled={micPermission === "checking"}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  padding: "16px 32px",
                  minWidth: "200px",
                  justifyContent: "center"
                }}
              >
                {recording ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="5" width="6" height="6" rx="1.5" fill="currentColor"/>
                    </svg>
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="currentColor"/>
                    </svg>
                    Start Recording
                  </>
                )}
              </button>
              {recording && (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "#ef4444"
                }}>
                  <div className="mono" style={{ fontFamily: "monospace" }}>{mmss}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center" }}>
                <button 
                  className="btn outline" 
                  onClick={retry} 
                  disabled={micPermission === "checking" || recording}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.65 2.35C12.2 0.9 10.2 0 8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C11.73 16 14.84 13.45 15.73 10H13.65C12.83 12.33 10.61 14 8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C9.66 2 11.14 2.69 12.22 3.78L10 6H16V0L13.65 2.35Z" fill="currentColor"/>
                    </svg>
                  <span>Reset</span>
                  </button>
                <button 
                  className="btn primary" 
                  onClick={stopRec} 
                  disabled={!recording}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  <span>Analyze</span>
                  </button>
                </div>
            </div>
          </div>

            {/* Transcript */}
          <div className="card soft">
              <h4 style={{ marginBottom: "8px" }}>Your Transcript</h4>
              <div style={{ 
                padding: "16px", 
                background: "#f9fafb", 
                borderRadius: "8px",
                minHeight: "100px",
                color: transcript ? "inherit" : "#64748b",
                lineHeight: 1.6
              }}>
                {transcript || (scoringResult?.transcription) || "Your speech will appear here after recording..."}
              </div>
              {scoringResult && (practiceMode === "read" || !practiceMode) && (
                <div style={{ marginTop: "16px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                  <div style={{ fontSize: "32px", fontWeight: "bold", textAlign: "center", marginBottom: "8px", color: "#16a34a" }}>
                    {scoringResult.score_10 || scoringResult.overall_score || 0}/10
                  </div>
                  <p className="small muted" style={{ textAlign: "center", marginBottom: "12px" }}>
                    {scoringResult.grade === "Excellent" && "Excellent pronunciation and fluency!"}
                    {scoringResult.grade === "Good" && "Good performance! Keep practicing."}
                    {scoringResult.grade === "Fair" && "Fair performance. Focus on pronunciation."}
                    {scoringResult.grade === "Poor" && "Keep practicing to improve your speaking."}
                    {!scoringResult.grade && "Great effort! Keep practicing."}
                  </p>
                  {scoringResult.content_accuracy && (
                    <div style={{ marginTop: "12px", fontSize: "0.9rem", display: "flex", justifyContent: "space-around", paddingTop: "12px", borderTop: "1px solid #bbf7d0" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#16a34a" }}>Content</div>
                        <div style={{ fontSize: "1.1rem" }}>{scoringResult.content_accuracy.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#16a34a" }}>Pronunciation</div>
                        <div style={{ fontSize: "1.1rem" }}>{scoringResult.pronunciation_score?.toFixed(1) || 0}%</div>
                      </div>
            </div>
              )}
        </div>
              )}
          </div>
        </section>

        {/* Right column - Sticky sidebar */}
        <aside
          className="card"
          style={{
            width: "520px",
            maxWidth: "min(520px, 100%)",
            flex: "0 0 520px",
            position: "sticky",
            top: "96px",
            alignSelf: "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
          }}
        >
          {/* Vocabulary */}
          <div className="card soft">
            <h4 style={{ marginBottom: "8px" }}>Key Vocabulary</h4>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedTask.vocab.map(({ word, ipa }) => {
                  const isHighlighted = highlightedWords.has(word);
                  return (
                <div key={word} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong 
                      style={{ 
                        cursor: "pointer",
                        color: isHighlighted ? "#2563eb" : "inherit",
                        backgroundColor: isHighlighted ? "#eff6ff" : "transparent",
                        padding: isHighlighted ? "4px 8px" : "0",
                        borderRadius: isHighlighted ? "4px" : "0",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => {
                        const newHighlighted = new Set(highlightedWords);
                        if (isHighlighted) {
                          newHighlighted.delete(word);
                        } else {
                          newHighlighted.add(word);
                        }
                        setHighlightedWords(newHighlighted);
                      }}
                      title="Click to highlight this word in the conversation"
                    >
                      {word}
                    </strong>
                      <button 
                      className="btn xs"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                            if (response.ok) {
                              const data = await response.json();
                              interface PhoneticData { audio?: string; }
                              const audioUrl = data[0]?.phonetics?.find((p: PhoneticData) => p.audio)?.audio;
                              if (audioUrl) {
                                const audio = new Audio(audioUrl);
                                audio.play();
                              } else {
                                alert("No audio available for this word");
                              }
                            }
                          } catch (e) {
                            console.error("Dictionary API error:", e);
                          }
                        }}
                        title="Play pronunciation"
                      >
                      Play
                      </button>
                  </div>
                  {ipa && <span className="muted" style={{ fontSize: "0.9rem" }}>{ipa}</span>}
                </div>
                  );
                })}
            </div>
          </div>

          {/* Phrases */}
          <div className="card soft">
            <h4 style={{ marginBottom: "8px" }}>Useful Phrases</h4>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedTask.phrases.map((p, i) => (
                <div key={i} style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{p}</div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="card soft">
            <h4 style={{ marginBottom: "8px" }}>Speaking Tips</h4>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedTask.tips.map((t, i) => (
                <div key={i} style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>• {t}</div>
              ))}
            </div>
          </div>
        </aside>
        </div>

        {/* Complete Activity Button - At the bottom of the page */}
        {canCompleteActivity && (
          <section className="card" style={{ marginTop: "24px" }}>
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: "16px",
              padding: "24px"
            }}>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Ready to Complete?</h3>
                <p className="muted" style={{ fontSize: "1rem" }}>
                  You've completed the speaking activity. Click below to save your progress.
                </p>
              </div>
              <button
                className="btn primary"
                onClick={completeActivity}
                disabled={isCompleting || activityCompleted}
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: 600,
                  padding: "16px 32px",
                  fontSize: "1.1rem",
                  minWidth: "200px"
                }}
              >
                {isCompleting ? (
                  <>
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="43.98" strokeDashoffset="10.99" strokeLinecap="round"/>
                    </svg>
                    Completing...
                  </>
                ) : activityCompleted ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Activity Completed
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L8 14M2 8L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Complete Activity
                  </>
                )}
              </button>
              {activityCompleted && (
                <div style={{ 
                  padding: "16px 24px", 
                  background: "#dcfce7", 
                  borderRadius: "8px", 
                  textAlign: "center", 
                  color: "#166534",
                  fontWeight: 500,
                  fontSize: "1rem"
                }}>
                  ✓ Activity completed successfully!
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  // Task selection view
  return (
    <div className="dashboard-content">
      {/* Page header */}
      <section className="card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <h1 style={{ marginBottom: "4px" }}>Speaking Practice</h1>
          <p className="muted">
            Practice speaking and improve your pronunciation and fluency
          </p>
        </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              minWidth: "260px",
            }}
          >
            <StatsCard label="Tasks" value={SPEAKING_TASKS.length.toString()} />
            <StatsCard label="Avg. length" value="~3 min" />
            <StatsCard label="Skill focus" value="Pronunciation • Fluency • Expression" />
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <section
        className="card"
        style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
      >
        <input
          type="text"
          placeholder="Search by title or topic…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input"
          style={{ flex: 1, minWidth: "220px" }}
        />
          <select
          className="select"
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          style={{ minWidth: "160px" }}
        >
          {uniqueLevels.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
        <select
            className="select"
            value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          style={{ minWidth: "200px" }}
          >
            {uniqueTypes.map((type) => (
            <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
      </section>

      {/* Task Cards Grid */}
      <section
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "16px",
        }}
      >
          {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onSelect={() => {
              setSelectedTask(task);
            }}
          />
        ))}
        {!filteredTasks.length && (
          <div className="card soft" style={{ gridColumn: "1/-1" }}>
            No tasks found matching your filters.
                </div>
              )}
      </section>
                </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        padding: "12px 16px",
        background: "rgba(255,255,255,0.4)",
        minWidth: "140px",
      }}
    >
      <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>{label}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#ffffff" }}>{value}</div>
              </div>
  );
}

function TaskCard({
  task,
  onSelect,
}: {
  task: SpeakingTask;
  onSelect: () => void;
}) {
  return (
    <div className="card soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">{task.level}</span>
        {task.recommended && (
          <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>
            Recommended
          </span>
                )}
              </div>
      <div>
        <h3 style={{ marginBottom: "4px" }}>{task.title}</h3>
        <p className="muted" style={{ marginBottom: "8px" }}>
          {task.prompt.substring(0, 100)}{task.prompt.length > 100 ? "..." : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span className="tag">{task.type}</span>
          <span className="tag">{task.timeLimit}</span>
            </div>
        </div>
      <div style={{ display: "flex", gap: "8px", fontSize: "0.9rem" }}>
        <span>{task.timeLimit}</span>
        {task.attempts > 0 && <span>{task.attempts} attempt{task.attempts !== 1 ? "s" : ""}</span>}
      </div>
      <button className="btn primary" onClick={onSelect}>
        Start Practice
      </button>
    </div>
  );
}
