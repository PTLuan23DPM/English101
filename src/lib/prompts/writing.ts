/**
 * Prompt templates for Writing LLM features
 */

export const SYSTEM_INSTRUCTIONS = {
  SCORING: `You are an expert IELTS/TOEFL writing examiner with years of experience in assessing academic writing. Your task is to evaluate student writing according to official IELTS/TOEFL scoring criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
- Be fair, consistent, and constructive in your assessment
- Provide specific, actionable feedback for each criterion
- Use a 0-10 scale for scoring (where 10 is excellent and 0 is no attempt)
- Consider the task requirements and student's CEFR level when scoring
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  OUTLINE: `You are an expert IELTS/TOEFL writing tutor. Generate clear, well-structured essay outlines appropriate for the student's level.
- Follow the specified essay type structure
- Use vocabulary appropriate for the CEFR level
- Provide specific, actionable points
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  BRAINSTORM: `You are a creative writing coach. Help students brainstorm ideas with concrete examples.
- Generate relevant, specific ideas for the topic
- Provide realistic examples and evidence
- Consider counterarguments where appropriate
- Keep suggestions appropriate for the student's level
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  LANGUAGE_PACK: `You are a language resources specialist. Provide level-appropriate language resources.
- Select phrases and vocabulary for the specified CEFR level
- Include discourse markers appropriate for the essay type
- Provide collocations and useful expressions
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  REPHRASE: `You are a paraphrasing expert. Rephrase text according to the target level and style.
- Maintain the original meaning
- Adjust complexity for the target CEFR level
- Apply the requested style (simple/academic/formal)
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  HINTS: `You are a grammar and coherence coach. Identify issues but let students fix them.
- Point out grammar errors without correcting them
- Suggest coherence improvements
- Explain WHY something might be wrong
- Encourage learning, don't just give answers
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  THESIS: `You are a thesis statement specialist. Generate strong, clear thesis statements.
- Create thesis statements appropriate for the level
- Ensure they address the prompt directly
- Provide multiple options with different approaches
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  EXPANDER: `You are a sentence development coach. Help students expand their ideas.
- Suggest ways to add depth (reason/example/contrast)
- Keep suggestions at the appropriate level
- Provide concrete, specific expansions
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  SUMMARIZE: `You are a feedback specialist. Summarize the student's writing objectively.
- Identify the main points the student made
- Assess if they stayed on topic
- Provide constructive feedback
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,

  NEXT_TASK: `You are an adaptive learning specialist. Recommend the next appropriate task.
- Consider the student's current level and performance
- Identify areas for improvement
- Suggest a task that addresses weaknesses
- CRITICAL: Return ONLY valid JSON. Do not include any explanatory text before or after the JSON. The response must be parseable as JSON.`,
};

export function buildOutlinePrompt(level: string, type: string, topic: string): string {
  return `Generate an essay outline for the following:

CEFR Level: ${level}
Essay Type: ${type}
Topic: ${topic}

Requirements:
1. Introduction (hook, background, thesis with 2-3 main points)
2. Body paragraphs (2-3, each with topic sentence, supporting details, examples)
3. Conclusion (restate thesis, summarize, final thought)

Return a JSON object with this structure:
{
  "outline": [
    {"section": "Introduction", "points": ["hook suggestion", "background info", "thesis statement"]},
    {"section": "Body 1", "points": ["topic sentence", "supporting detail 1", "example"]},
    {"section": "Body 2", "points": ["topic sentence", "supporting detail 1", "example"]},
    {"section": "Conclusion", "points": ["restate thesis", "summarize main points", "final thought"]}
  ],
  "thesisOptions": ["Option 1", "Option 2", "Option 3"]
}`;
}

export function buildBrainstormPrompt(level: string, type: string, topic: string): string {
  return `Brainstorm ideas for the following writing task:

CEFR Level: ${level}
Essay Type: ${type}
Topic: ${topic}

Provide:
1. Main ideas (3-5 key points to discuss)
2. Concrete examples for each idea
3. Counterpoints or alternative perspectives (if relevant)

Return a JSON object with this structure:
{
  "ideas": [
    {"point": "Main idea 1", "explanation": "Why this matters"},
    {"point": "Main idea 2", "explanation": "Why this matters"}
  ],
  "examples": [
    {"idea": "Main idea 1", "example": "Specific concrete example"},
    {"idea": "Main idea 2", "example": "Specific concrete example"}
  ],
  "counterpoints": ["Alternative view 1", "Alternative view 2"]
}`;
}

export function buildLanguagePackPrompt(level: string, type: string): string {
  return `Provide language resources for ${level} level writing, ${type} essay type.

Include:
1. Useful phrases and expressions (10-15)
2. Discourse markers appropriate for ${type} essays
3. Collocations commonly used in this type of writing
4. Sentence starters

Return a JSON object with this structure:
{
  "phrases": ["phrase 1", "phrase 2", ...],
  "discourseMarkers": {
    "contrast": ["however", "on the other hand", ...],
    "addition": ["moreover", "furthermore", ...],
    "cause": ["therefore", "as a result", ...],
    "example": ["for instance", "such as", ...]
  },
  "collocations": ["collocation 1", "collocation 2", ...],
  "sentenceStarters": ["To begin with,", "It is widely believed that,", ...]
}`;
}

export function buildRephrasePrompt(
  text: string,
  style: "simple" | "academic" | "formal",
  targetLevel: string
): string {
  const styleMap = {
    simple: "simpler, more straightforward language (A2-B1 level)",
    academic: "academic, scholarly language (B2-C1 level)",
    formal: "formal, sophisticated language (C1+ level)",
  };

  // Escape text to prevent JSON issues: escape quotes, newlines, and backslashes
  // Limit to 150 chars to ensure we have enough tokens for the response
  const escapedText = text
    .replace(/\\/g, "\\\\")  // Escape backslashes first
    .replace(/"/g, '\\"')     // Escape double quotes
    .replace(/\n/g, "\\n")    // Escape newlines
    .replace(/\r/g, "\\r")    // Escape carriage returns
    .replace(/\t/g, "\\t")    // Escape tabs
    .substring(0, 150);       // Limit length to prevent MAX_TOKENS issues

  return `Rephrase the following text in 3 different ways using ${styleMap[style]}:

Original text: "${escapedText}"
Target CEFR level: ${targetLevel}
Style: ${style}

Maintain the original meaning but adjust the complexity and vocabulary for the target level.

CRITICAL INSTRUCTIONS:
1. Keep rephrased text BRIEF and CONCISE (max 100 words per option to avoid token limits)
2. Keep notes VERY SHORT (max 30 words per note)
3. All string values MUST be properly escaped in JSON
4. Replace all double quotes (") inside strings with \\"
5. Replace all newlines (\\n) inside strings with spaces
6. Replace all backslashes (\\) inside strings with \\\\
7. Return COMPLETE JSON - do not truncate the response

Return a JSON object with this EXACT structure:
{
  "options": [
    {"text": "Brief rephrased version 1", "notes": "Short explanation"},
    {"text": "Brief rephrased version 2", "notes": "Short explanation"},
    {"text": "Brief rephrased version 3", "notes": "Short explanation"}
  ]
}`;
}

export function buildHintsPrompt(text: string, level: string): string {
  return `Analyze the following text and provide grammar and coherence hints (DO NOT fix the text directly):

Text: "${text}"
Writer's Level: ${level}

Identify:
1. Grammar issues (verb tense, subject-verb agreement, articles, prepositions)
2. Coherence issues (logical flow, transitions, paragraph unity)
3. Provide hints and explanations, not direct corrections

Return a JSON object with this structure:
{
  "grammarHints": [
    {"location": "sentence/phrase", "issue": "what's wrong", "hint": "how to fix it", "explanation": "why it's wrong"}
  ],
  "coherenceHints": [
    {"location": "paragraph X", "issue": "coherence problem", "suggestion": "how to improve", "example": "example of better flow"}
  ]
}`;
}

export function buildThesisPrompt(level: string, type: string, topic: string, stance?: string): string {
  const stanceText = stance ? `The writer's stance: ${stance}` : "No specific stance required";

  // Escape topic and stance to prevent JSON issues
  const escapedTopic = topic.replace(/"/g, '\\"').replace(/\n/g, " ").substring(0, 200);
  const escapedStance = stance ? stance.replace(/"/g, '\\"').replace(/\n/g, " ").substring(0, 100) : "";

  return `Generate 3 thesis statement options for:

CEFR Level: ${level}
Essay Type: ${type}
Topic: ${escapedTopic}
${escapedStance ? `The writer's stance: ${escapedStance}` : "No specific stance required"}

Each thesis should:
- Clearly state the main argument
- Include 2-3 main points to be discussed
- Be appropriate for ${level} level writing
- Match the ${type} essay structure
- Use clear, direct language without unnecessary quotation marks

CRITICAL INSTRUCTIONS FOR JSON FORMAT:
- All string values MUST be properly escaped
- Replace all double quotes (") inside strings with \\"
- Replace all newlines (\\n) inside strings with spaces
- Keep thesis statements concise (max 150 words each)
- Keep mainPoints concise (max 20 words each)
- Keep approach descriptions concise (max 50 words each)

Return a JSON object with this EXACT structure:
{
  "options": [
    {
      "thesis": "Thesis statement 1 (properly escaped, no unescaped quotes)",
      "mainPoints": ["Point 1", "Point 2", "Point 3"],
      "approach": "Description of approach"
    },
    {
      "thesis": "Thesis statement 2 (properly escaped, no unescaped quotes)",
      "mainPoints": ["Point 1", "Point 2"],
      "approach": "Description of approach"
    },
    {
      "thesis": "Thesis statement 3 (properly escaped, no unescaped quotes)",
      "mainPoints": ["Point 1", "Point 2", "Point 3"],
      "approach": "Description of approach"
    }
  ]
}

IMPORTANT:
- Do NOT include any explanatory text before or after the JSON
- Do NOT use single quotes in place of double quotes
- All quotes inside strings MUST be escaped with \\"
- Return ONLY the JSON object, nothing else
- Ensure all brackets and braces are properly matched
- Keep all text fields concise to avoid truncation`;
}

export function buildExpandPrompt(sentence: string, mode: "reason" | "example" | "contrast"): string {
  const modeInstructions = {
    reason: "Provide a reason or explanation for why this statement is true",
    example: "Provide a concrete, specific example that illustrates this point",
    contrast: "Provide a contrasting view or counterpoint to this statement",
  };

  return `Expand the following sentence by ${modeInstructions[mode]}:

Original sentence: "${sentence}"
Expansion mode: ${mode}

Provide 2-3 expansion options that naturally follow the original sentence.

Return a JSON object with this structure:
{
  "expansions": [
    {"text": "Expansion 1", "explanation": "Why this works"},
    {"text": "Expansion 2", "explanation": "Why this works"},
    {"text": "Expansion 3", "explanation": "Why this works"}
  ]
}`;
}

export function buildSummarizePrompt(text: string, topic: string): string {
  // Truncate text if too long to avoid token limits
  const maxTextLength = 2000;
  const truncatedText = text.length > maxTextLength
    ? text.substring(0, maxTextLength) + "... (text truncated)"
    : text;

  return `Summarize the following essay and assess if it stays on topic:

Essay text: "${truncatedText.replace(/"/g, '\\"')}"
Original topic: "${topic.replace(/"/g, '\\"')}"

Provide:
1. Main points the writer made
2. Overall coherence and organization
3. On-topic score (0-10) with explanation
4. Brief constructive feedback

CRITICAL: You must return a valid JSON object with this EXACT structure:
{
  "summary": "Brief summary of what the writer discussed (keep it concise, max 200 words)",
  "mainPoints": ["Point 1", "Point 2", "Point 3"],
  "onTopicScore": 8,
  "onTopicExplanation": "Why this score (keep it concise, max 100 words)",
  "feedback": "Constructive feedback on organization and focus (keep it concise, max 150 words)"
}

IMPORTANT: 
- All string values must be properly escaped and closed
- Keep all text fields concise to avoid truncation
- Return ONLY the JSON object, no additional text before or after
- Ensure all quotes are properly escaped within strings`;
}

export function buildNextTaskPrompt(
  userId: string,
  level: string,
  lastScore: number,
  errorProfile: {
    taskResponse?: number;
    coherence?: number;
    lexical?: number;
    grammar?: number;
  },
  scoringFeedback?: {
    taskResponse?: string[];
    coherence?: string[];
    lexical?: string[];
    grammar?: string[];
  }
): string {
  // Find weakest area
  const weakestArea = Object.entries(errorProfile).sort((a, b) => a[1]! - b[1]!)[0];

  // Build concise feedback summary - truncate long feedback to prevent token limit issues
  const truncateFeedback = (feedbackArray: string[] | undefined, maxLength: number = 100): string => {
    if (!feedbackArray || feedbackArray.length === 0) return "No specific feedback";
    const joined = feedbackArray.slice(0, 2).join("; ");
    return joined.length > maxLength ? joined.substring(0, maxLength) + "..." : joined;
  };

  const feedbackSummary = scoringFeedback ? `
Scoring Feedback (Key Points):
${errorProfile.taskResponse !== undefined ? `- Task Response (${errorProfile.taskResponse}/10): ${truncateFeedback(scoringFeedback.taskResponse, 80)}` : ""}
${errorProfile.coherence !== undefined ? `- Coherence (${errorProfile.coherence}/10): ${truncateFeedback(scoringFeedback.coherence, 80)}` : ""}
${errorProfile.lexical !== undefined ? `- Lexical (${errorProfile.lexical}/10): ${truncateFeedback(scoringFeedback.lexical, 80)}` : ""}
${errorProfile.grammar !== undefined ? `- Grammar (${errorProfile.grammar}/10): ${truncateFeedback(scoringFeedback.grammar, 80)}` : ""}
` : "";

  return `Recommend the next writing task for this student:

Current Level: ${level}
Last Score: ${lastScore}/10
Weakest Area: ${weakestArea ? `${weakestArea[0]} (score: ${weakestArea[1]})` : "No data"}

Error Profile:
- Task Response: ${errorProfile.taskResponse ?? "N/A"}
- Coherence: ${errorProfile.coherence ?? "N/A"}
- Lexical Resource: ${errorProfile.lexical ?? "N/A"}
- Grammar: ${errorProfile.grammar ?? "N/A"}
${feedbackSummary}

Based on this, recommend:
1. Task type that addresses the weakness
2. Appropriate difficulty level (same/easier/harder)
3. Specific focus areas
4. Detailed feedback on performance (what went well, what needs improvement)

CRITICAL: You must return a valid JSON object with this EXACT structure:
{
  "recommendedTask": {
    "type": "Essay type (e.g., Opinion Essay, Compare and Contrast, Cause and Effect)",
    "level": "CEFR level (e.g., A2, B1, B2, C1)",
    "focusAreas": ["Area 1", "Area 2", "Area 3"],
    "reasoning": "A clear explanation of why this task is appropriate (2-3 sentences, keep concise)"
  },
  "specificSuggestions": ["Suggestion 1 (concise)", "Suggestion 2 (concise)", "Suggestion 3 (concise)"],
  "feedback": {
    "strengths": ["Strength 1 (brief)", "Strength 2 (brief)"],
    "weaknesses": ["Weakness 1 (brief)", "Weakness 2 (brief)"],
    "overallComment": "Overall feedback (2-3 sentences, concise and encouraging)"
  }
}

IMPORTANT: 
- The "recommendedTask" object is REQUIRED and must not be null or missing
- All fields in "recommendedTask" are REQUIRED
- "focusAreas" must be an array with at least 2 items (keep items concise, max 3 words each)
- "specificSuggestions" must be an array with at least 2 items (keep items concise, max 15 words each)
- "feedback" object is REQUIRED with "strengths", "weaknesses", and "overallComment"
- "strengths" and "weaknesses" must be arrays with at least 2 items each (keep items concise, max 20 words each)
- "overallComment" must be a string (2-3 sentences, max 150 words total)
- Keep ALL text fields CONCISE to avoid token limit issues
- Return ONLY the JSON object, no additional text before or after`;
}

export function buildScoringPrompt(
  text: string,
  prompt: string,
  task?: {
    id?: string;
    type?: string;
    level?: string;
    targetWords?: string;
  } | null
): string {
  // Parse target words if provided
  let minWords = 150;
  let maxWords = 250;
  if (task?.targetWords) {
    const wordMatch = task.targetWords.match(/(\d+)-(\d+)/);
    if (wordMatch) {
      minWords = parseInt(wordMatch[1]);
      maxWords = parseInt(wordMatch[2]);
    }
  }

  const taskInfo = task
    ? `
Task Type: ${task.type || "General Essay"}
CEFR Level: ${task.level || "B2"}
Target Word Count: ${task.targetWords || `${minWords}-${maxWords} words`}
`
    : "";

  const promptInfo = prompt
    ? `
Original Prompt/Topic: "${prompt.substring(0, 500)}"
`
    : "";

  // Truncate text if too long (but keep enough for good assessment)
  const maxTextLength = 4000;
  const truncatedText = text.length > maxTextLength
    ? text.substring(0, maxTextLength) + "... (text truncated for assessment)"
    : text;

  return `Evaluate the following student writing according to IELTS/TOEFL scoring criteria (0-10 scale for each criterion):

Student's Essay:
"${truncatedText.replace(/"/g, '\\"')}"
${taskInfo}${promptInfo}
Scoring Criteria:

1. TASK RESPONSE (0-10):
   - How well does the response address the task/prompt?
   - Does it fully answer all parts of the question?
   - Are ideas relevant, clear, and well-developed?
   - Is there a clear position/opinion (if required)?
   - Does it meet word count requirements? (Target: ${minWords}-${maxWords} words)

2. COHERENCE & COHESION (0-10):
   - Is the essay well-organized with clear paragraphs?
   - Is there logical progression of ideas?
   - Are linking words and transitions used effectively?
   - Is there appropriate paragraphing?

3. LEXICAL RESOURCE (0-10):
   - Is vocabulary varied and appropriate?
   - Is there good use of collocations and idiomatic expressions?
   - Is word choice accurate and natural?
   - Are there spelling errors?
   - Is vocabulary appropriate for ${task?.level || "B2"} level?

4. GRAMMATICAL RANGE & ACCURACY (0-10):
   - Is there a variety of sentence structures?
   - Are complex sentences used appropriately?
   - Is grammar accurate?
   - Are there frequent errors that affect understanding?
   - Is punctuation correct?

Scoring Guidelines:
- 9-10: Excellent (native-like or near-native)
- 7-8: Good (clear communication with minor errors)
- 5-6: Competent (adequate communication with some errors)
- 3-4: Limited (difficult to understand, many errors)
- 1-2: Very Limited (minimal communication)
- 0: No attempt or completely irrelevant

CRITICAL: You must return a valid JSON object with this EXACT structure:
{
  "score_10": 7.5,
  "overall_score": 75,
  "detailed_scores": {
    "task_response": {
      "score": 7.5,
      "feedback": [
        "The essay addresses the main points of the prompt",
        "Ideas are generally relevant but could be more developed",
        "Word count is within acceptable range"
      ]
    },
    "coherence_cohesion": {
      "score": 8.0,
      "feedback": [
        "Good paragraph structure with clear introduction and conclusion",
        "Effective use of linking words like 'however' and 'therefore'",
        "Logical flow of ideas throughout the essay"
      ]
    },
    "lexical_resource": {
      "score": 7.0,
      "feedback": [
        "Adequate vocabulary range with some appropriate word choices",
        "Minor spelling errors in words like 'recieve' (should be 'receive')",
        "Could benefit from more varied and sophisticated vocabulary"
      ]
    },
    "grammatical_range": {
      "score": 7.5,
      "feedback": [
        "Good mix of simple and complex sentence structures",
        "Most grammar is accurate with occasional errors",
        "Effective use of relative clauses and conditional structures"
      ]
    }
  },
  "statistics": {
    "words": 180,
    "characters": 950,
    "sentences": 12,
    "paragraphs": 4,
    "unique_words": 120
  },
  "strengths": [
    "Clear thesis statement",
    "Good use of examples",
    "Effective paragraph structure"
  ],
  "weaknesses": [
    "Could develop ideas more deeply",
    "Some vocabulary repetition",
    "Minor grammar errors in complex sentences"
  ],
  "recommendations": [
    "Try to use more varied vocabulary to express similar ideas",
    "Focus on developing each paragraph with more specific examples",
    "Practice using more complex grammatical structures"
  ]
}

IMPORTANT:
- All scores must be numbers between 0 and 10
- "score_10" is the overall average of the 4 criteria scores
- "overall_score" is score_10 * 10 (for 100-point scale compatibility)
- "feedback" arrays should contain 3-5 specific, actionable feedback points per criterion
- "strengths" and "weaknesses" should each have 2-4 items
- "recommendations" should have 2-4 actionable suggestions
- All string values must be properly escaped
- Return ONLY the JSON object, no additional text before or after
- Be specific and constructive in all feedback`;
}

