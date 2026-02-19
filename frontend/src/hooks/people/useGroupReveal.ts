import {Student} from "@/types";
import {useEffect, useState} from "react";

const TAUNTS = [
    "Is this a group or a double date?",
    "Calculating 'will they, won't they' probability...",
    "Manifesting an awkward promposal...",
    "Adding a dash of unrequited pining...",
    "Wait, didn't they break up in the cafeteria?",
    "Is it hot in here, or is it just the tension?",
    "The 'accidental' hand-touching starts now.",
    "Setting the stage for a messy 'we need to talk' text.",
    "Scanning for mutual crushes... found one. Oops.",
    "Totally legit. I saw Cherise and Winston dating.",
    "The shipping community is going to lose their minds.",
    "Brace for 3 weeks of avoided eye contact.",
    "Sending them to the 'friend zone' in 3, 2, 1...",
    "Who's going to catch feelings and fail the midterm?",
    "Generating a Wattpad-worthy disaster...",
    "Adding the 'it's complicated' variable.",
    "If this were a rom-com, you'd be the comic relief.",
    "Calculating the speed of a 'u up?' message.",
    "Please don't hold hands during the presentation.",
    "Searching for someone with a secret Pinterest wedding board.",
    "Vincent x Jesselin?",
    "The drama begins. The heartbreak is free.",
    "Selecting the designated 'carrier' of the group...",
    "Adding a professional yapper to the mix.",
    "Searching for a brain cell... still searching...",
    "Is it the kid who always smells like onions?",
    "Calculating the inevitable drop in GPA...",
    "Finding the student who 'forgets' their laptop daily.",
    "Selecting the one who does 100% of the work.",
    "Ruining someone's social life in real-time.",
    "Adding a pinch of 'I didn't see the GroupMe notification'.",
    "Consulting the demons for a truly cursed pairing.",
    "The wheel of doom turns... and it hates you.",
    "Selecting the person most likely to go MIA for 3 weeks.",
    "Adding the student who thinks 'AI wrote this' is a valid defense.",
    "Brace for impact. This group is a dumpster fire.",
    "Is it legal to be this socially incompatible?",
    "Picking the sacrificial lamb for the Q&A session.",
    "Searching for a soul... none found. Moving on.",
    "Applying the 'C- average' filter to this group.",
    "Who's getting the short straw today?",
    "Calculating the exact moment this group chat gets muted."
];

export function useGroupReveal(finalGroups: Student[][], onFinish: () => void) {
    const [visibleGroups, setVisibleGroups] = useState<Student[][]>([]);
    const [activeGroupIdx, setActiveGroupIdx] = useState<number | null>(null);
    const [currentTaunt, setCurrentTaunt] = useState<string>('');

    useEffect(() => {
        if (finalGroups.length === 0) {
            setVisibleGroups([]);
            return;
        }

        const revealOrder: { student: Student, groupIdx: number }[] = [];
        const maxLen = Math.max(...finalGroups.map(g => g.length));
        for (let i = 0; i < maxLen; i++) {
            for (let j = 0; j < finalGroups.length; j++) {
                if (finalGroups[j][i]) revealOrder.push({ student: finalGroups[j][i], groupIdx: j });
            }
        }

        setVisibleGroups(Array.from({ length: finalGroups.length }, () => []));
        let currentIdx = 0;

        const processNext = () => {
            if (currentIdx >= revealOrder.length) {
                setActiveGroupIdx(null);
                onFinish();
                return;
            }

            const { student, groupIdx } = revealOrder[currentIdx];
            setActiveGroupIdx(groupIdx);
            setCurrentTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);

            // The "Very Human" delay
            setTimeout(() => {
                setVisibleGroups(prev => {
                    const next = [...prev];
                    next[groupIdx] = [...next[groupIdx], student];
                    return next;
                });
                currentIdx++;
                processNext();
            }, 1500);
        };

        processNext();
    }, [finalGroups]);

    return { visibleGroups, activeGroupIdx, currentTaunt };
}