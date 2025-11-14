/**
 * LLM Retry Utility
 * Helper function for retrying LLM API calls with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number) => void;
}

/**
 * Fetch with automatic retry for 503 errors
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If successful or not a 503 error, return immediately
      if (response.ok || response.status !== 503) {
        return response;
      }

      // Handle 503 errors with retry
      if (response.status === 503) {
        const errorData = await response.json().catch(() => ({ error: "Service unavailable" }));
        
        // Check if we should retry
        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          
          if (onRetry) {
            onRetry(attempt + 1, delay);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        } else {
          // Max retries reached, throw error
          throw new Error(
            errorData.error?.message || 
            "Service is temporarily overloaded. Please try again in a few moments."
          );
        }
      }

      // For other non-OK responses, return as-is
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's a 503 error and we haven't exhausted retries, continue
      if (
        (lastError.message.includes("503") || 
         lastError.message.includes("overloaded") ||
         lastError.message.includes("unavailable")) &&
        attempt < maxRetries
      ) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        if (onRetry) {
          onRetry(attempt + 1, delay);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or max retries reached, throw
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Failed to fetch");
}

/**
 * Handle LLM API errors with user-friendly messages
 */
export function handleLLMError(error: unknown, featureName: string = "feature"): {
  title: string;
  description: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // 503 / Overloaded errors
  if (
    errorMessage.includes("503") ||
    errorMessage.includes("overloaded") ||
    errorMessage.includes("temporarily unavailable") ||
    errorMessage.includes("unavailable")
  ) {
    return {
      title: "Service temporarily unavailable",
      description: "The AI service is currently overloaded. Please wait 10-30 seconds and try again.",
    };
  }
  
  // API key errors
  if (
    errorMessage.includes("Gemini API is not configured") ||
    errorMessage.includes("GEMINI_API_KEY") ||
    errorMessage.includes("API key")
  ) {
    return {
      title: "Gemini API not configured",
      description: "Please add GEMINI_API_KEY to your .env.local file and restart the server.",
    };
  }
  
  // Token/truncation errors
  if (
    errorMessage.includes("MAX_TOKENS") ||
    errorMessage.includes("truncated") ||
    errorMessage.includes("token limit") ||
    errorMessage.includes("too long")
  ) {
    return {
      title: "Text too long",
      description: `The text is too long for ${featureName}. Please use shorter text and try again.`,
    };
  }
  
  // Missing input errors
  if (
    errorMessage.includes("level") ||
    errorMessage.includes("type") ||
    errorMessage.includes("topic") ||
    errorMessage.includes("text") ||
    errorMessage.includes("sentence") ||
    errorMessage.includes("selectedText")
  ) {
    return {
      title: "Missing information",
      description: `This feature requires additional information. Please check your input and try again.`,
    };
  }
  
  // Parse errors
  if (errorMessage.includes("Failed to parse") || errorMessage.includes("parse")) {
    return {
      title: `Failed to ${featureName}`,
      description: "Unable to process the AI response. Please try again with different input.",
    };
  }
  
  // Generic error
  return {
    title: `Failed to ${featureName}`,
    description: errorMessage,
  };
}

