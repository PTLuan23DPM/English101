import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface UsageInfo {
    limit: number;
    used: number;
    remaining: number;
    isAvailable: boolean;
}

interface UsageStatus {
    outline: UsageInfo;
    brainstorm: UsageInfo;
    thesis: UsageInfo;
    "language-pack": UsageInfo;
    rephrase: UsageInfo;
    expand: UsageInfo;
}

export function useWritingLLMUsage(taskId: string | null) {
    const { data: session } = useSession();
    const [usage, setUsage] = useState<UsageStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Reset usage when taskId changes or becomes null
        if (!session?.user || !taskId) {
            setUsage(null);
            setLoading(false);
            return;
        }

        // Reset loading state when taskId changes
        setLoading(true);
        setUsage(null);

        const fetchUsage = async () => {
            try {
                const response = await fetch("/api/writing/usage/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taskId }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsage(data);
                } else {
                    console.error("Failed to fetch usage:", response.status, response.statusText);
                }
            } catch (error) {
                console.error("Failed to fetch usage:", error);
                // Set default available state on error to prevent blocking
                setUsage(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUsage();
    }, [session?.user?.id, taskId]);

    const recordUsage = async (feature: string, metadata?: any) => {
        if (!session?.user || !taskId) {
            console.warn("Cannot record usage: no session or taskId");
            return;
        }

        try {
            const response = await fetch("/api/writing/usage/record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId,
                    feature,
                    metadata,
                }),
            });

            if (response.ok) {
                // Refresh usage status after a short delay to ensure DB is updated
                setTimeout(async () => {
                    try {
                        const usageResponse = await fetch("/api/writing/usage/check", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ taskId }),
                        });

                        if (usageResponse.ok) {
                            const data = await usageResponse.json();
                            setUsage(data);
                        }
                    } catch (error) {
                        console.error("Failed to refresh usage:", error);
                    }
                }, 500);
            }
        } catch (error) {
            console.error("Failed to record usage:", error);
        }
    };

    return {
        usage,
        loading,
        recordUsage,
        // Default to true if usage is not loaded yet (to prevent blocking UI)
        // But once loaded, respect the actual availability
        isAvailable: (feature: string) => {
            if (!usage) return true; // Allow usage while loading
            return usage[feature as keyof UsageStatus]?.isAvailable ?? true;
        },
        getRemaining: (feature: string) => usage?.[feature as keyof UsageStatus]?.remaining ?? 0,
        getLimit: (feature: string) => usage?.[feature as keyof UsageStatus]?.limit ?? 0,
        getUsed: (feature: string) => usage?.[feature as keyof UsageStatus]?.used ?? 0,
    };
}

