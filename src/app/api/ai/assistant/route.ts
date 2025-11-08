import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { message } = await req.json();

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // Simple rule-based assistant for now
        // In production, integrate with OpenAI/Claude API
        const response = generateResponse(message);

        return NextResponse.json({
            response,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("AI Assistant error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

function generateResponse(message: string): string {
    const lowerMessage = message.toLowerCase().trim();

    // Grammar help
    if (lowerMessage.includes("grammar") || lowerMessage.includes("grammatical")) {
        return "I can help with grammar! Here are some common areas:\n\n" +
            "• **Tenses**: Use present simple for habits, past simple for completed actions, present perfect for experiences.\n" +
            "• **Articles**: Use 'a/an' for general, 'the' for specific.\n" +
            "• **Prepositions**: 'in' for months/seasons, 'on' for days, 'at' for times.\n\n" +
            "What specific grammar topic would you like help with?";
    }

    // Vocabulary help
    if (lowerMessage.includes("vocabulary") || lowerMessage.includes("word") || lowerMessage.includes("meaning")) {
        return "I can help with vocabulary! Here are some tips:\n\n" +
            "• **Context**: Try to understand words from the context of the sentence.\n" +
            "• **Word families**: Learn related words together (e.g., happy, happiness, happily).\n" +
            "• **Collocations**: Learn which words go together (e.g., 'make a decision', not 'do a decision').\n\n" +
            "What word or topic would you like to explore?";
    }

    // Writing help
    if (lowerMessage.includes("writing") || lowerMessage.includes("essay") || lowerMessage.includes("paragraph")) {
        return "I can help with writing! Here are some tips:\n\n" +
            "• **Structure**: Introduction → Body paragraphs → Conclusion\n" +
            "• **Coherence**: Use linking words (however, therefore, furthermore)\n" +
            "• **Variety**: Vary sentence length and structure\n" +
            "• **Clarity**: Be clear and concise\n\n" +
            "Would you like help with a specific writing task?";
    }

    // Pronunciation help
    if (lowerMessage.includes("pronunciation") || lowerMessage.includes("pronounce")) {
        return "I can help with pronunciation! Here are some tips:\n\n" +
            "• **Listen**: Pay attention to native speakers\n" +
            "• **Practice**: Repeat words and phrases\n" +
            "• **Stress**: Learn word stress patterns\n" +
            "• **Intonation**: Practice rising and falling tones\n\n" +
            "What would you like to practice?";
    }

    // Greetings
    if (lowerMessage.match(/^(hi|hello|hey|greetings)/)) {
        return "Hello! I'm your AI English assistant. I can help you with:\n\n" +
            "• Grammar questions\n" +
            "• Vocabulary explanations\n" +
            "• Writing tips and feedback\n" +
            "• Pronunciation guidance\n\n" +
            "What would you like help with today?";
    }

    // Default response
    return "I'm here to help you learn English! I can assist with:\n\n" +
        "• **Grammar**: Ask about tenses, articles, prepositions, etc.\n" +
        "• **Vocabulary**: Get word meanings, synonyms, and usage examples\n" +
        "• **Writing**: Get tips for essays, emails, and other writing tasks\n" +
        "• **Pronunciation**: Learn about stress, intonation, and sounds\n\n" +
        "Try asking: 'Help me with grammar' or 'What does [word] mean?'";
}

