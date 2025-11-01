"use client";

import { useState } from "react";

interface ReadingTask {
  id: string;
  icon: string;
  title: string;
  type: string;
  level: string;
  description: string;
  readMins: number;
  words: number;
  questions: number;
  tags: string[];
  recommended?: boolean;
  attempts: number;
  color: string;
  body: string[];
  vocab: Array<{ word: string; def: string; example: string }>;
  questionList: Array<{
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
  }>;
}

const READING_TASKS: ReadingTask[] = [
  // Short Stories
  {
    id: "story-friendship",
    icon: "📖",
    title: "The Power of Friendship",
    type: "Short Story",
    level: "A2",
    description: "A heartwarming story about two friends who help each other through difficult times.",
    readMins: 5,
    words: 320,
    questions: 6,
    tags: ["Fiction", "Life Lessons"],
    recommended: true,
    attempts: 0,
    color: "blue",
    body: [
      "Sarah and Emma had been best friends since elementary school. They did everything together - from studying for exams to exploring their neighborhood on weekends.",
      "One day, Sarah's family faced financial difficulties. Her parents couldn't afford to send her on the school trip that everyone was excited about. Sarah felt sad and embarrassed.",
      "Emma noticed her friend's sadness. Without telling anyone, Emma started doing extra chores and saved her allowance for three months. On the day before the trip, she gave Sarah an envelope with enough money for the journey.",
      "Sarah was so moved by her friend's kindness that she started crying. 'I can't accept this,' she said. But Emma insisted, 'That's what friends are for. We'll make memories together.'",
    ],
    vocab: [
      { word: "elementary school", def: "primary school; grades 1-6", example: "I learned to read in elementary school." },
      { word: "allowance", def: "money given regularly to a child", example: "My weekly allowance is $10." },
      { word: "moved", def: "emotionally affected", example: "I was moved by her kindness." },
    ],
    questionList: [
      {
        id: "q1",
        text: "How long had Sarah and Emma been friends?",
        options: [
          "Since high school",
          "Since elementary school",
          "For one year",
          "They just met"
        ],
        correctIndex: 1,
      },
      {
        id: "q2",
        text: "Why was Sarah sad?",
        options: [
          "She failed an exam",
          "Emma was moving away",
          "Her family couldn't afford the school trip",
          "She lost her homework"
        ],
        correctIndex: 2,
      },
    ],
  },
  // News Articles
  {
    id: "news-green-energy",
    icon: "🌱",
    title: "Green Energy Revolution",
    type: "News Article",
    level: "B1",
    description: "Solar and wind energy are changing how we power our homes and businesses.",
    readMins: 6,
    words: 420,
    questions: 8,
    tags: ["Environment", "Technology", "Current Affairs"],
    recommended: true,
    attempts: 0,
    color: "green",
    body: [
      "The world is experiencing a green energy revolution. Solar panels and wind turbines are becoming common sights in many countries as nations work to reduce their carbon emissions.",
      "In 2024, renewable energy sources generated more than 30% of the world's electricity for the first time. This milestone shows that clean energy is no longer just a dream but a reality.",
      "Germany leads Europe in solar energy production, with over 2 million homes powered by rooftop solar panels. Meanwhile, Denmark gets nearly half of its electricity from wind power.",
      "Experts predict that by 2030, renewable energy will be cheaper than fossil fuels in almost every market worldwide. This shift will not only help the environment but also create millions of new jobs.",
    ],
    vocab: [
      { word: "milestone", def: "an important achievement or event", example: "Graduating was a milestone in my life." },
      { word: "rooftop", def: "the top surface of a building", example: "We installed solar panels on our rooftop." },
      { word: "fossil fuels", def: "coal, oil, and natural gas", example: "We need to reduce our dependence on fossil fuels." },
    ],
    questionList: [
      {
        id: "q1",
        text: "What percentage of world electricity came from renewable sources in 2024?",
        options: ["More than 30%", "Less than 10%", "Exactly 50%", "About 20%"],
        correctIndex: 0,
      },
    ],
  },
  // Academic Texts
  {
    id: "academic-psychology",
    icon: "🧠",
    title: "Understanding Memory",
    type: "Academic Text",
    level: "B2",
    description: "How human memory works and why we forget things.",
    readMins: 8,
    words: 540,
    questions: 10,
    tags: ["Psychology", "Science", "Academic"],
    attempts: 0,
    color: "purple",
    body: [
      "Human memory is a complex system that allows us to encode, store, and retrieve information. Understanding how memory works helps us learn more effectively and remember important information.",
      "There are three main types of memory: sensory memory, short-term memory, and long-term memory. Sensory memory lasts only a few seconds and captures immediate sensory information. Short-term memory can hold information for about 20-30 seconds. Long-term memory can store information for years or even a lifetime.",
      "Forgetting is a natural part of memory. Scientists have discovered that we forget information for several reasons. The 'decay theory' suggests that memories fade over time if not used. The 'interference theory' proposes that new information can interfere with old memories.",
    ],
    vocab: [
      { word: "encode", def: "convert information into a form for storage", example: "The brain encodes visual information differently than sounds." },
      { word: "retrieve", def: "get back stored information", example: "I couldn't retrieve his name from memory." },
      { word: "interference", def: "something that blocks or disrupts", example: "There was interference with the signal." },
    ],
    questionList: [
      {
        id: "q1",
        text: "How long does short-term memory typically last?",
        options: ["A few seconds", "20-30 seconds", "Several hours", "Days"],
        correctIndex: 1,
      },
    ],
  },
  // Essays & Opinions
  {
    id: "opinion-social-media",
    icon: "📱",
    title: "Social Media: Blessing or Curse?",
    type: "Opinion Essay",
    level: "C1",
    description: "An analysis of how social media affects modern society and relationships.",
    readMins: 10,
    words: 650,
    questions: 12,
    tags: ["Society", "Technology", "Opinion"],
    attempts: 0,
    color: "indigo",
    body: [
      "Social media has fundamentally transformed how we communicate, share information, and perceive the world around us. While it offers unprecedented connectivity, it also raises concerns about privacy, mental health, and the quality of human relationships.",
      "Proponents argue that social media democratizes information and gives voice to those previously unheard. A small business owner can reach global audiences without massive advertising budgets. Activists can organize movements and raise awareness about important causes instantly.",
      "However, critics point to the 'echo chamber' effect where algorithms show us content that reinforces our existing beliefs. This can lead to polarization and make it harder to have constructive dialogue across different viewpoints.",
    ],
    vocab: [
      { word: "unprecedented", def: "never done or known before", example: "The pandemic brought unprecedented challenges." },
      { word: "democratizes", def: "makes accessible to everyone", example: "The internet democratizes knowledge." },
      { word: "polarization", def: "division into two opposing groups", example: "Political polarization is increasing." },
    ],
    questionList: [
      {
        id: "q1",
        text: "What is the 'echo chamber' effect?",
        options: [
          "Sound reflection in rooms",
          "Algorithms showing content that reinforces existing beliefs",
          "People talking loudly online",
          "Sharing posts repeatedly"
        ],
        correctIndex: 1,
      },
    ],
  },
  // Practical Texts
  {
    id: "practical-recipe",
    icon: "🍳",
    title: "How to Make Perfect Pancakes",
    type: "Practical Guide",
    level: "A2",
    description: "Step-by-step instructions for making delicious pancakes at home.",
    readMins: 4,
    words: 280,
    questions: 5,
    tags: ["Cooking", "Instructions", "Daily Life"],
    recommended: true,
    attempts: 0,
    color: "amber",
    body: [
      "Making perfect pancakes is easier than you think! With just a few simple ingredients and these step-by-step instructions, you'll be making fluffy, delicious pancakes in no time.",
      "Ingredients: 1 cup flour, 2 tablespoons sugar, 2 teaspoons baking powder, 1/2 teaspoon salt, 1 cup milk, 1 egg, 2 tablespoons melted butter.",
      "Instructions: First, mix the dry ingredients (flour, sugar, baking powder, and salt) in a large bowl. In another bowl, whisk together the milk, egg, and melted butter. Pour the wet ingredients into the dry ingredients and stir gently until just combined. Don't overmix - a few lumps are okay!",
      "Heat a pan over medium heat and add a little butter. Pour 1/4 cup of batter for each pancake. Cook until bubbles form on the surface, then flip and cook until golden brown. Serve hot with your favorite toppings!",
    ],
    vocab: [
      { word: "fluffy", def: "light and soft", example: "The cake was fluffy and delicious." },
      { word: "whisk", def: "mix quickly with a tool or fork", example: "Whisk the eggs until smooth." },
      { word: "batter", def: "mixture of flour, liquid, etc. for cooking", example: "Pour the batter into the pan." },
    ],
    questionList: [
      {
        id: "q1",
        text: "What should you do if the batter has a few lumps?",
        options: [
          "Start over",
          "Keep mixing for 10 minutes",
          "It's okay, don't overmix",
          "Add more milk"
        ],
        correctIndex: 2,
      },
    ],
  },
];

export default function ReadingPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<ReadingTask | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  // Filter tasks by type
  const filteredTasks = filterType === "All types" 
    ? READING_TASKS 
    : READING_TASKS.filter(task => task.type === filterType);

  const uniqueTypes = ["All types", ...Array.from(new Set(READING_TASKS.map(t => t.type)))];

  const decFont = () => setFontScale((n) => Math.max(0.8, +(n - 0.1).toFixed(2)));
  const incFont = () => setFontScale((n) => Math.min(1.5, +(n + 0.1).toFixed(2)));

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmitAnswers = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!selectedTask) return 0;
    let correct = 0;
    selectedTask.questionList.forEach((q) => {
      if (answers[q.id] === q.correctIndex) correct++;
    });
    return Math.round((correct / selectedTask.questionList.length) * 100);
  };

  // Article reading view
  if (selectedTask) {
    const currentQ = selectedTask.questionList[currentQuestion];
    const totalQuestions = selectedTask.questionList.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;

    return (
      <div className="dashboard-content">
        <section className="reader">
          {/* Left: Article Content */}
          <div className="reader-main card">
            <div className="toolbar">
              <button 
                className="btn sm"
                onClick={() => {
                  setSelectedTask(null);
                  setAnswers({});
                  setShowResults(false);
                  setCurrentQuestion(0);
                }}
              >
                ← Back to List
              </button>
              <button className="btn sm">🔊 Text-to-Speech</button>
              <button className="btn sm">🔖 Dictionary</button>
              <div className="spacer" />
              <div className="font-controls">
                <button className="btn sm" onClick={decFont}>A-</button>
                <button className="btn sm" onClick={incFont}>A+</button>
              </div>
              <button className="btn sm">🔖 Bookmark</button>
            </div>
            
            <div className="progress">
              <div className="fill" style={{ width: `100%` }} />
            </div>

            <div className="reading" style={{ fontSize: `${fontScale}rem` }}>
              <h2>{selectedTask.title}</h2>
              {selectedTask.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <div className="vocab-section card soft">
                <h4>📚 Vocabulary</h4>
                {selectedTask.vocab.map((v) => (
                  <div key={v.word} className="vocab-row">
                    <div>
                      <div className="w">{v.word}</div>
                      <div className="d">{v.def}</div>
                      <div className="example" style={{ fontSize: "13px", fontStyle: "italic", color: "#6b7280", marginTop: "4px" }}>
                        Example: {v.example}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        className="btn xs"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${v.word}`);
                            if (response.ok) {
                              const data = await response.json();
                              const audioUrl = data[0]?.phonetics?.find((p: any) => p.audio)?.audio;
                              if (audioUrl) {
                                const audio = new Audio(audioUrl);
                                audio.play();
                              }
                            }
                          } catch (e) {
                            console.error("Audio error:", e);
                          }
                        }}
                        title="Play pronunciation"
                      >
                        🔊
                      </button>
                      <button className="btn xs">+ Add to List</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Questions */}
          <aside className="reader-side card">
            <h3>Comprehension Questions</h3>
            
            {!showResults ? (
              <>
                <div className="progress" style={{ marginBottom: "16px" }}>
                  <div className="fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="qcard">
                  <div className="qhead">
                    <span>Question {currentQuestion + 1} of {totalQuestions}</span>
                    <span className="muted">Multiple Choice</span>
                  </div>
                  <div className="qtext">{currentQ.text}</div>
                  <div className="opts">
                    {currentQ.options.map((option, i) => (
                      <label key={i} className="opt">
                        <input
                          type="radio"
                          name={`q${currentQuestion}`}
                          checked={answers[currentQ.id] === i}
                          onChange={() => handleAnswerSelect(currentQ.id, i)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <div className="qactions">
                    <button
                      className="btn btn--outline"
                      disabled={currentQuestion === 0}
                      onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
                    >
                      Previous
                    </button>
                    {currentQuestion < totalQuestions - 1 ? (
                      <button
                        className="btn btn--primary"
                        onClick={() => setCurrentQuestion((q) => q + 1)}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        className="btn btn--primary"
                        onClick={handleSubmitAnswers}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="results-card">
                <div className="success-icon" style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {calculateScore() >= 70 ? "🎉" : "📝"}
                </div>
                <h3>Your Score</h3>
                <div style={{ fontSize: "48px", fontWeight: "bold", color: "var(--dash-accent)", marginBottom: "16px" }}>
                  {calculateScore()}%
                </div>
                <p className="muted">
                  You got {Object.keys(answers).filter(k => answers[k] === selectedTask.questionList.find(q => q.id === k)?.correctIndex).length} out of {totalQuestions} questions correct!
                </p>
                <button
                  className="btn btn--primary w-full"
                  style={{ marginTop: "20px" }}
                  onClick={() => {
                    setSelectedTask(null);
                    setAnswers({});
                    setShowResults(false);
                    setCurrentQuestion(0);
                  }}
                >
                  Try Another Article
                </button>
              </div>
            )}
          </aside>
        </section>
      </div>
    );
  }

  // Task selection view
  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <section className="card page-head">
        <div className="page-intro">
          <h1>📚 Reading Practice</h1>
          <p className="muted">Enhance your reading comprehension and vocabulary</p>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-val">12</span>
            <span className="stat-lbl">Articles Read</span>
          </div>
          <div className="stat">
            <span className="stat-val">156</span>
            <span className="stat-lbl">Vocabulary Learned</span>
          </div>
          <div className="stat">
            <span className="stat-val">85%</span>
            <span className="stat-lbl">Avg Score</span>
          </div>
        </div>
      </section>

      {/* Filter dropdown */}
      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label htmlFor="type-filter" style={{ fontWeight: 600 }}>
            Filter by type:
          </label>
          <select
            id="type-filter"
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: "250px" }}
          >
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <span className="muted" style={{ marginLeft: "auto" }}>
            {filteredTasks.length} article{filteredTasks.length !== 1 ? "s" : ""} available
          </span>
        </div>
      </div>

      {/* Task Cards Grid */}
      <section className="card">
        <h3 className="section-title" style={{ marginBottom: "20px" }}>
          Choose a Reading Task
        </h3>
        <div className="task-grid">
          {filteredTasks.map((task) => (
            <div key={task.id} className={`task-card task-card-${task.color}`}>
              {task.recommended && (
                <div className="task-badge">
                  <span>⭐ Recommended</span>
                </div>
              )}
              
              <div className="task-icon">{task.icon}</div>
              
              <div className="task-content">
                <h4 className="task-title">{task.title}</h4>
                <span className={`task-type ${task.color}`}>{task.type}</span>
                <p className="muted" style={{ fontSize: "13px", marginTop: "8px" }}>
                  {task.description}
                </p>
              </div>

              <div className="task-meta">
                <span className="chip">{task.level} Level</span>
                <span className="chip">🕐 {task.readMins} min</span>
                <span className="chip">{task.words} words</span>
                <span className="chip">🧠 {task.questions} Qs</span>
              </div>

              <div className="tags" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                {task.tags.map((tag) => (
                  <span key={tag} className="tag" style={{ fontSize: "11px", padding: "3px 8px" }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="task-status">
                {task.attempts > 0 ? (
                  <span className="status-text">{task.attempts} attempt{task.attempts !== 1 ? "s" : ""}</span>
                ) : (
                  <span className="status-text muted">No attempts yet</span>
                )}
              </div>

              <button
                className="btn primary w-full"
                onClick={() => setSelectedTask(task)}
              >
                ▶ Start Reading
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
