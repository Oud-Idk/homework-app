import { useState, useRef, useCallback, useEffect } from 'react';

export type GAConfig = {
    popSize: number;
    mutationRate: number;
    elitismCount?: number;
    maxInstantGens?: number;
    visualDelayMs?: number;
    createInitialPop: (popSize: number) => number[][];
    calculateFitness: (genome: number[]) => number;
    mutate: (genome: number[], mutationRate: number) => number[];
    onComplete?: (bestGenome: number[]) => void;
};

export function useGeneticAlgorithm(config: GAConfig) {
    const {
        popSize, mutationRate, elitismCount = 5,
        maxInstantGens = 2000, visualDelayMs = 50,
        createInitialPop, calculateFitness, mutate, onComplete
    } = config;

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [generation, setGeneration] = useState(0);
    const [bestScore, setBestScore] = useState<number | null>(null);
    const [bestGenome, setBestGenome] = useState<number[]>([]);
    const [topGenomes, setTopGenomes] = useState<Array<{ genome: number[], score: number }>>([]);

    const populationRef = useRef<number[][]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isOptimizingRef = useRef(false);

    const evolve = useCallback((pop: number[][]) => {
        const scored = pop.map(g => ({ genome: g, score: calculateFitness(g) }));
        scored.sort((a, b) => b.score - a.score); // Highest score first

        const best = scored[0];
        const nextPop = scored.slice(0, elitismCount).map(s => s.genome);

        while (nextPop.length < popSize) {
            // Simple tournament / random selection
            const p1 = scored[Math.floor(Math.random() * (popSize / 2))].genome;
            const p2 = scored[Math.floor(Math.random() * (popSize / 2))].genome;

            // --- FIX: Order Crossover (OX1) to guarantee uniqueness ---
            const length = p1.length;
            const start = Math.floor(Math.random() * length);
            const end = Math.floor(Math.random() * length);
            const min = Math.min(start, end);
            const max = Math.max(start, end);

            const child = new Array(length).fill(-1);
            const used = new Set<number>();

            // 1. Copy a random contiguous slice from Parent 1
            for (let i = min; i <= max; i++) {
                child[i] = p1[i];
                used.add(p1[i]);
            }

            // 2. Fill the remaining spots with unused genes from Parent 2
            let p2Index = 0;
            for (let i = 0; i < length; i++) {
                if (child[i] === -1) {
                    // Skip genes we already took from Parent 1
                    while (used.has(p2[p2Index])) {
                        p2Index++;
                    }
                    child[i] = p2[p2Index];
                    used.add(p2[p2Index]);
                    p2Index++;
                }
            }
            // -----------------------------------------------------------

            // Mutation (Your existing swap mutation is already permutation-safe)
            nextPop.push(mutate(child, mutationRate));
        }

        return { nextPop, bestGenome: best.genome, bestScore: best.score, allScored: scored };
    }, [calculateFitness, mutate, popSize, mutationRate, elitismCount]);

    const runVisual = useCallback(() => {
        if (!isOptimizingRef.current) return;

        const res = evolve(populationRef.current);
        populationRef.current = res.nextPop;

        setBestGenome(res.bestGenome);
        setBestScore(res.bestScore);
        setTopGenomes(res.allScored.slice(0, 25));
        setGeneration(g => g + 1);

        timeoutRef.current = setTimeout(runVisual, visualDelayMs);
    }, [evolve, visualDelayMs]);

    const start = (mode: 'visual' | 'instant') => {
        populationRef.current = createInitialPop(popSize);
        isOptimizingRef.current = true;
        setIsOptimizing(true);
        setGeneration(0);

        if (mode === 'instant') {
            let pop = populationRef.current;
            let currentBestG = pop[0], currentBestS = -Infinity, finalScored: any[] = [];

            for (let i = 0; i < maxInstantGens; i++) {
                const res = evolve(pop);
                pop = res.nextPop;
                if (res.bestScore > currentBestS) {
                    currentBestG = res.bestGenome;
                    currentBestS = res.bestScore;
                }
                if (i === maxInstantGens - 1) finalScored = res.allScored;
            }

            setBestGenome(currentBestG);
            setBestScore(currentBestS);
            setTopGenomes(finalScored.slice(0, 25));
            setGeneration(maxInstantGens);

            stop();
            if (onComplete) onComplete(currentBestG);
        } else {
            runVisual();
        }
    };

    const stop = () => {
        isOptimizingRef.current = false;
        setIsOptimizing(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    useEffect(() => stop, []);

    return { start, stop, isOptimizing, generation, bestScore, bestGenome, topGenomes };
}