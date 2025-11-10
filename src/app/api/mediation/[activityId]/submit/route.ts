import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface AnswerSubmission {
    questionId: string;
    chosenIds: string[];
    answerText?: string;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ activityId: string }> }
) {
    try {
        const { activityId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { answers, startTime } = await req.json() as {
            answers: AnswerSubmission[];
            startTime: string;
        };

        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                questions: {
                    include: {
                        choices: true,
                        answers: true,
                    },
                },
            },
        });

        if (!activity) {
            return NextResponse.json({ error: "Activity not found" }, { status: 404 });
        }

        // Create attempt
        const attempt = await prisma.attempt.create({
            data: {
                userId: user.id,
                activityId: activity.id,
                startedAt: new Date(startTime),
                submittedAt: new Date(),
                status: 'submitted',
            },
        });

        // For mediation activities, we might need manual grading or AI feedback
        // For now, just record the submissions
        let totalScore = 0;
        const gradedAnswers = [];

        for (const answer of answers) {
            const question = activity.questions.find((q) => q.id === answer.questionId);
            if (!question) continue;

            // Create submission (may need manual/AI grading later)
            await prisma.submission.create({
                data: {
                    attemptId: attempt.id,
                    userId: user.id,
                    questionId: question.id,
                    chosenIds: answer.chosenIds,
                    answerText: answer.answerText,
                    isCorrect: null, // Pending grading
                    score: null,
                },
            });

            gradedAnswers.push({
                questionId: question.id,
                feedback: "Your response has been submitted. Feedback will be available soon.",
            });
        }

        // Update attempt
        await prisma.attempt.update({
            where: { id: attempt.id },
            data: {
                score: totalScore,
                status: 'submitted',
            },
        });

        return NextResponse.json({
            attemptId: attempt.id,
            totalScore,
            maxScore: activity.maxScore,
            percentage: activity.maxScore ? Math.round((totalScore / activity.maxScore) * 100) : 0,
            answers: gradedAnswers,
            message: "Your mediation task has been submitted successfully. Feedback will be provided soon.",
        });
    } catch (error) {
        console.error("Error submitting mediation activity:", error);
        return NextResponse.json(
            { error: "Failed to submit activity" },
            { status: 500 }
        );
    }
}

