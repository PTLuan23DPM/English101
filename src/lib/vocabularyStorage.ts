const VOCAB_STORAGE_KEY = "english101:saved-vocabulary";
export const VOCAB_UPDATED_EVENT = "english101:vocab-updated";

export interface SavedVocabEntry {
  id: string;
  word: string;
  partOfSpeech?: string;
  phonetic?: string;
  audioUrl?: string;
  meaning: string;
  example?: string;
  note?: string;
  createdAt: string;
}

export interface AddVocabularyPayload {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  phonetic?: string;
  audioUrl?: string;
  example?: string;
  note?: string;
}

const isBrowser = () => typeof window !== "undefined";

export function getSavedVocabulary(): SavedVocabEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(VOCAB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry) => entry && entry.word && entry.id);
    }
    return [];
  } catch (error) {
    console.error("Failed to parse vocabulary storage:", error);
    return [];
  }
}

export function saveVocabulary(entries: SavedVocabEntry[]): SavedVocabEntry[] {
  if (!isBrowser()) return entries;
  try {
    window.localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(entries));
    const event = new CustomEvent(VOCAB_UPDATED_EVENT, { detail: entries });
    window.dispatchEvent(event);
  } catch (error) {
    console.error("Failed to persist vocabulary:", error);
  }
  return entries;
}

export function addVocabularyEntry(payload: AddVocabularyPayload) {
  if (!isBrowser()) {
    return { added: false as const, reason: "unavailable" as const };
  }

  const word = payload.word?.trim();
  const meaning = payload.meaning?.trim();

  if (!word || !meaning) {
    return { added: false as const, reason: "invalid" as const };
  }

  const current = getSavedVocabulary();
  const exists = current.some(
    (entry) => entry.word.toLowerCase() === word.toLowerCase()
  );

  if (exists) {
    return { added: false as const, reason: "duplicate" as const };
  }

  const entry: SavedVocabEntry = {
    id: `${word.toLowerCase()}-${Date.now()}`,
    word,
    meaning,
    partOfSpeech: payload.partOfSpeech,
    phonetic: payload.phonetic,
    audioUrl: payload.audioUrl,
    example: payload.example,
    note: payload.note,
    createdAt: new Date().toISOString(),
  };

  const updated = saveVocabulary([entry, ...current]);
  return { added: true as const, entry, entries: updated };
}

export function removeVocabularyEntry(id: string) {
  if (!isBrowser()) {
    return { removed: false as const };
  }

  const current = getSavedVocabulary();
  const updated = current.filter((entry) => entry.id !== id);

  if (updated.length === current.length) {
    return { removed: false as const };
  }

  saveVocabulary(updated);
  return { removed: true as const, entries: updated };
}


