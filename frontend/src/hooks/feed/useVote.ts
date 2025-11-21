"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Post } from '@/types';
import { reqToApi } from "@/lib/utils";

export const useVote = (post: Post) => {
    const { data: session } = useSession();
    const [voteState, setVoteState] = useState({
        score: post.score,
        userVote: post.userVote,
    });

    useEffect(() => {
        setVoteState({ score: post.score, userVote: post.userVote });
    }, [post.score, post.userVote]);

    const handleVote = async (newVote: 'up' | 'down') => {
        if (!session?.accessToken) return;

        const originalVoteState = { ...voteState };
        let optimisticVoteState: { score: number; userVote: "up" | "down" | null | undefined };
        const currentVote = voteState.userVote;

        if (newVote === currentVote) { // Undoing a vote
            optimisticVoteState = {
                score: voteState.score - (newVote === 'up' ? 1 : -1),
                userVote: null,
            };
        } else { // New vote or changing a vote
            const scoreAdjustment = (currentVote ? 2 : 1) * (newVote === 'up' ? 1 : -1);
            optimisticVoteState = {
                score: voteState.score + scoreAdjustment,
                userVote: newVote,
            };
        }

        setVoteState(optimisticVoteState); // Optimistic UI update

        try {
            const res = await reqToApi(`posts/${post._id}/vote`, session, "POST", {
                voteType: optimisticVoteState.userVote || "none",
            })

            if (!res.ok) throw new Error("Failed to cast vote");
            const data = await res.json();
            setVoteState(prev => ({ ...prev, score: data.score }));
        } catch (error) {
            console.error(error);
            setVoteState(originalVoteState); // Revert on failure
        }
    };

    return { ...voteState, handleVote };
};