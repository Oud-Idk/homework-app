import { User } from "@/types";
import { useState } from "react";

export function useGrouper(users: User[], numGroups: number, strategy: 'random' | 'balanced') {
    const [finalGroups, setFinalGroups] = useState<User[][]>([]);

    const shuffle = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const randomValues = new Uint32Array(1);
            window.crypto.getRandomValues(randomValues);
            const j = Math.floor((randomValues[0] / (0xffffffff + 1)) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const generate = () => {
        const result: User[][] = Array.from({ length: numGroups }, () => []);

        if (strategy === 'random') {
            const shuffled = shuffle(users);
            shuffled.forEach((user, i) => result[i % numGroups].push(user));
        } else {
            const males = shuffle(users.filter(u => u.gender === 'male'));
            const females = shuffle(users.filter(u => u.gender === 'female'));

            // Note: Students with gender 'other' or empty are currently excluded from
            // the 'balanced' strategy by this logic.

            let currentGroup = 0;
            [...males, ...females].forEach(u => {
                result[currentGroup % numGroups].push(u);
                currentGroup++;
            });
        }
        const humanizedResult = result.map(group => shuffle(group));
        setFinalGroups(humanizedResult);
    };

    return { finalGroups, generate, setFinalGroups };
}