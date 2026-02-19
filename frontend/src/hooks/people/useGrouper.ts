import {Student} from "@/types";
import {useState} from "react";

export function useGrouper(students: Student[], numGroups: number, strategy: 'random' | 'balanced') {
    const [finalGroups, setFinalGroups] = useState<Student[][]>([]);

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
        const result: Student[][] = Array.from({ length: numGroups }, () => []);

        if (strategy === 'random') {
            const shuffled = shuffle(students);
            shuffled.forEach((student, i) => result[i % numGroups].push(student));
        } else {
            const males = shuffle(students.filter(s => s.gender === 'male'));
            const females = shuffle(students.filter(s => s.gender === 'female'));
            let currentGroup = 0;
            [...males, ...females].forEach(s => {
                result[currentGroup % numGroups].push(s);
                currentGroup++;
            });
        }
        const humanizedResult = result.map(group => shuffle(group));
        setFinalGroups(humanizedResult);
    };

    return { finalGroups, generate, setFinalGroups };
}