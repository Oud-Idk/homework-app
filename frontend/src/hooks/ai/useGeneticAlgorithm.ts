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
    crossover: (p1: number[], p2: number[]) => number[];
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
        scored.sort((a, b) => b.score - a.score);

        const best = scored[0];
        const nextPop = scored.slice(0, elitismCount).map(s => s.genome);

        while (nextPop.length < popSize) {
            const p1 = scored[Math.floor(Math.random() * (popSize / 2))].genome;
            const p2 = scored[Math.floor(Math.random() * (popSize / 2))].genome;

            const child = config.crossover(p1, p2);
            nextPop.push(mutate(child, mutationRate));
        }

        return { nextPop, bestGenome: best.genome, bestScore: best.score, allScored: scored };
    }, [calculateFitness, mutate, config.crossover, popSize, mutationRate, elitismCount]);

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
            // Calculate how many generations equals exactly 1% progress
            const chunkSize = Math.max(1, Math.floor(maxInstantGens / 100));

            const runInstantChunk = (currentGen: number, currentPop: number[][], currentBestG: number[], currentBestS: number) => {
                // Allows stopping midway via the Stop button
                if (!isOptimizingRef.current) return;

                const targetGen = Math.min(maxInstantGens, currentGen + chunkSize);
                let pop = currentPop;
                let bestG = currentBestG;
                let bestS = currentBestS;
                let finalScored: any[] = [];

                // Process exactly 1 chunk (1%)
                for (let i = currentGen; i < targetGen; i++) {
                    const res = evolve(pop);
                    pop = res.nextPop;
                    if (res.bestScore > bestS) {
                        bestG = res.bestGenome;
                        bestS = res.bestScore;
                    }
                    if (i === maxInstantGens - 1) finalScored = res.allScored;
                }

                // Update state to trigger React re-render of the progress bar
                populationRef.current = pop;
                setGeneration(targetGen);
                setBestGenome(bestG);
                setBestScore(bestS);

                if (targetGen < maxInstantGens) {
                    // Schedule next chunk, giving the browser time to paint UI
                    timeoutRef.current = setTimeout(() => runInstantChunk(targetGen, pop, bestG, bestS), 0);
                } else {
                    // Finished
                    setTopGenomes(finalScored.slice(0, 25));
                    stop();
                    if (onComplete) onComplete(bestG);
                }
            };

            // Kick off the first chunk
            runInstantChunk(0, populationRef.current, populationRef.current[0], -Infinity);
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