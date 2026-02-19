"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Group, Layer, Line, Rect, Shape, Stage, Text, Transformer } from 'react-konva';
import { useTheme } from 'next-themes';
import { Eye, Grip, Maximize, Plus, Trash2, Zap } from 'lucide-react';
import { reqToApi } from "@/lib/utils";
import { Classroom, Relationship, User } from "@/types";
import { SearchableSelect } from "@/components/Selector/SearchableSelect";
import { useSession } from "next-auth/react";

// --- CONFIG ---
const SCALE = 100;      // 100px = 1m
const GRID_SIZE = 0.25; // 25cm snapping
const SEAT_OFFSET = 0.45;
const ELITISM_COUNT = 5;
const MAX_GENERATIONS_INSTANT = 5000;
const VISUAL_DELAY_MS = 100;

const InfiniteGrid = React.memo(({
    width,
    height,
    gap,
    color = "#ddd",
    radius = 1
}: {
    width: number,
    height: number,
    gap: number,
    color?: string,
    radius?: number
}) => {
    return (
        <Shape
            // Force the shape to stay at (0,0) relative to the layer
            x={0}
            y={0}
            sceneFunc={(context, shape) => {
                const stage = shape.getStage();
                if (!stage) return;

                const ctx = context as unknown as CanvasRenderingContext2D;

                // 1. Get Viewport in World Coordinates
                const transform = stage.getAbsoluteTransform().copy().invert();
                const topLeft = transform.point({ x: 0, y: 0 });
                const bottomRight = transform.point({ x: width, y: height });

                // 2. Add a generous buffer (e.g., 2 extra rows/cols) to prevent edge flickering
                const buffer = gap * 2;

                // 3. Calculate loop bounds locked to the grid
                // Math.floor ensures we snap to the grid line "left" or "above" the viewport
                const startX = Math.floor((topLeft.x - buffer) / gap) * gap;
                const endX = Math.floor((bottomRight.x + buffer) / gap) * gap;
                const startY = Math.floor((topLeft.y - buffer) / gap) * gap;
                const endY = Math.floor((bottomRight.y + buffer) / gap) * gap;

                ctx.fillStyle = color;
                ctx.beginPath(); // Start ONE path for all dots (performance boost)

                for (let x = startX; x < endX; x += gap) {
                    for (let y = startY; y < endY; y += gap) {
                        // Move to the dot position, draw the circle
                        // subpath ensures they don't connect with ugly lines
                        ctx.moveTo(x + radius, y);
                        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
                    }
                }

                ctx.fill(); // Fill all dots at once
            }}
            listening={false}
            perfectDrawEnabled={false}
        />
    );
});
InfiniteGrid.displayName = "InfiniteGrid";

export default function SeatingOptimizer() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { data: session } = useSession();

    useEffect(() => { setMounted(true); }, []);

    const isDark = mounted && resolvedTheme === 'dark';

    const C = {
        grid: isDark ? "#484848" : "#e5e5e5",
        tableFill: isDark ? "#000000" : "#ffffff",
        tableStroke: isDark ? "#ffffff" : "#000000",
        tableShadow: "#000000",
        chair: isDark ? "#404040" : "#d4d4d4",
        text: isDark ? "#d4d4d4" : "#404040",
        textLight: isDark ? "#737373" : "#a3a3a3",
        selected: "#3b82f6",
        colliding: "#ef4444",
        linePos: "#10b981",
        lineNeg: "#ef4444"
    };

    // --- STATE ---
    const [tables, setTables] = useState<any[]>([]);
    const [seatCoords, setSeatCoords] = useState<{ x: number, y: number }[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const [mutationRate, setMutationRate] = useState(0.3);
    const [popSize, setPopSize] = useState(100);
    const [visualize, setVisualize] = useState(true);

    // Maps Table Index -> Student Index in the `students` array
    const [assignments, setAssignments] = useState<Record<number, number>>({});

    // DB Data
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [currentClassId, setCurrentClassId] = useState<string>("");
    const [students, setStudents] = useState<User[]>([]);
    const [relationshipMatrix, setRelationshipMatrix] = useState<number[][]>([]);
    const [relationships, setRelationships] = useState<Relationship[]>([]);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [currentScore, setCurrentScore] = useState<number | null>(null);
    const [generation, setGeneration] = useState(0);
    const [topGenomes, setTopGenomes] = useState<Array<{ genome: number[], score: number }>>([]);

    const [history, setHistory] = useState<any[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);

    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    // Genome is a permutation of indices [0, 1, 2, ... students.length]
    const populationRef = useRef<number[][]>([]);
    const requestRef = useRef<number>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const peopleCount = students.length;
    const unfulfilled = tables.length !== peopleCount || peopleCount === 0;

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            const { width, height } = entries[0].contentRect;
            // FIX: Round to integer to prevent sub-pixel blurring
            setDimensions({ width: Math.round(width), height: Math.round(height) });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [mounted]);

    const getPersonColor = (index: number) => {
        // Use the ID to generate a consistent color, or just the index
        if (!students[index]) return "#ccc";
        const hue = (index * 137.508) % 360;
        return `hsl(${hue}, ${isDark ? '60%' : '60%'}, ${isDark ? '60%' : '55%'})`;
    };

    const getPersonName = (index: number) => {
        return students[index]?.name || "Unknown";
    };

    useEffect(() => {
        const coords = tables.map(t => {
            const rad = t.rotation * (Math.PI / 180);
            const ox = -SEAT_OFFSET * Math.sin(rad);
            const oy = SEAT_OFFSET * Math.cos(rad);
            return { x: t.x + ox, y: t.y + oy };
        });
        setSeatCoords(coords);
        if (isOptimizing) stopOptimizer();
    }, [tables]);

    // --- DATA LOADING ---

    // 1. Load Classes on Mount
    useEffect(() => {
        const fetchData = async () => {
            const classesRes = await reqToApi("class")
            const classes = await classesRes.json() as Classroom[];
            setClasses(classes);
        }
        fetchData().catch(e => console.error(e));
    }, []);

    // 2. Handle Class Selection
    const onChangeClass = async (classId: string) => {
        setCurrentClassId(classId);
        stopOptimizer();
        setAssignments({});
        setCurrentScore(null);
        setTopGenomes([]);

        try {
            // Fetch Students (The snippet implies this endpoint returns User[] for a class)
            const classRes = await reqToApi(`class/${classId}`, session);
            const loadedStudents = await classRes.json() as User[];
            setStudents(loadedStudents);

            // Fetch Relationships
            const relationshipRes = await reqToApi(`relationship/class/${classId}`, session);
            const loadedRelationships = await relationshipRes.json() as Relationship[];
            setRelationships(loadedRelationships);

            // Build Matrix
            processDataToMatrix(loadedStudents, loadedRelationships);

        } catch (e) {
            console.error("Failed to load class data", e);
        }
    }

    // 3. Convert List of Objects to Matrix for Algorithm
    const processDataToMatrix = (users: User[], rels: Relationship[]) => {
        const n = users.length;
        // Create NxN matrix filled with 0
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

        // Map _id -> Index for O(1) lookup
        const idMap: Record<string, number> = {};
        users.forEach((u, i) => { idMap[u._id] = i; });

        rels.forEach(r => {
            const fromIdx = idMap[r.fromStudent._id];
            const toIdx = idMap[r.toStudent._id];

            // Only add if both students are in the current list
            if (fromIdx !== undefined && toIdx !== undefined) {
                matrix[fromIdx][toIdx] = r.weight;
            }
        });

        setRelationshipMatrix(matrix);
    };


    // --- HISTORY / UTILS ---

    useEffect(() => {
        setTables(prev => {
            const updates = prev.map(t => {
                const isColliding = checkAnyCollision(t, prev);
                return t.colliding !== isColliding ? { ...t, colliding: isColliding } : t;
            });
            if (updates.every((t, i) => t === prev[i])) return prev;
            return updates;
        });
    }, [tables.map(t => `${t.x},${t.y},${t.rotation}`).join('|')]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo();
                else handleUndo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.length > 0) deleteSelected();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, historyStep, selectedIds]);

    const recordHistory = (newTablesState: any[]) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newTablesState);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyStep === 0) return;
        stopOptimizer();
        const prevStep = historyStep - 1;
        setTables(history[prevStep]);
        setHistoryStep(prevStep);
    };

    const handleRedo = () => {
        if (historyStep === history.length - 1) return;
        stopOptimizer();
        const nextStep = historyStep + 1;
        setTables(history[nextStep]);
        setHistoryStep(nextStep);
    };

    const deleteSelected = () => {
        const newTables = tables.filter(t => !selectedIds.includes(t.id));
        setTables(newTables);
        setSelectedIds([]);
        recordHistory(newTables);
        setAssignments({});
        setCurrentScore(null);
    };

    const resetView = () => {
        if (stageRef.current) {
            stageRef.current.to({ x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.3 });
        }
    };

    // --- ALGORITHM ---

    const calculateFitness = (genome: number[]) => {
        let totalScore = 0;
        // genome[i] is the student index sitting at table i
        for (let i = 0; i < genome.length; i++) {
            for (let j = i + 1; j < genome.length; j++) {
                const p1Index = genome[i];
                const p2Index = genome[j];

                // If tables don't exist for these students, skip
                if (!seatCoords[i] || !seatCoords[j]) continue;

                const dx = seatCoords[i].x - seatCoords[j].x;
                const dy = seatCoords[i].y - seatCoords[j].y;
                const distSq = (dx * dx) + (dy * dy);

                // Optimization: Ignore interactions > 4 meters away
                if (distSq > 16) continue;

                const safeDistSq = Math.max(distSq, 0.1);

                // Look up weights in the generated matrix
                const w1 = relationshipMatrix[p1Index][p2Index];
                const w2 = relationshipMatrix[p2Index][p1Index];

                // Logic: If either hates the other (negative), amplify the penalty closer they are
                // If they like each other, reward proximity
                let affinity = (w1 < 0 || w2 < 0) ? Math.min(w1, w2) * 20 : w1 + w2;

                totalScore += affinity / safeDistSq;
            }
        }
        return totalScore;
    };

    const processGeneration = (currentPop: number[][]) => {
        const scoredPop = currentPop.map(genome => ({ genome, score: calculateFitness(genome) }));
        scoredPop.sort((a, b) => b.score - a.score);

        const nextPop = scoredPop.slice(0, ELITISM_COUNT).map(s => s.genome);

        while (nextPop.length < popSize) {
            const parent = scoredPop[Math.floor(Math.random() * (popSize / 2))].genome;
            const child = [...parent];
            if (Math.random() < mutationRate) {
                const idxA = Math.floor(Math.random() * child.length);
                const idxB = Math.floor(Math.random() * child.length);
                [child[idxA], child[idxB]] = [child[idxB], child[idxA]];
            }
            nextPop.push(child);
        }
        return { nextPop, bestGenome: scoredPop[0].genome, bestScore: scoredPop[0].score, allScored: scoredPop };
    };

    const startOptimizer = () => {
        if (unfulfilled) return;
        // Genome represents indices of the students array
        const indices = Array.from({ length: peopleCount }, (_, i) => i);

        populationRef.current = Array.from({ length: popSize }, () => {
            return [...indices].sort(() => Math.random() - 0.5);
        });

        setIsOptimizing(true);
        setGeneration(0);
        visualize ? runVisualStep() : runInstantSolver();
    };

    const stopOptimizer = () => {
        setIsOptimizing(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const runVisualStep = () => {
        const { nextPop, bestGenome, bestScore, allScored } = processGeneration(populationRef.current);
        populationRef.current = nextPop;
        updateAssignments(bestGenome, bestScore);
        setTopGenomes(allScored.slice(0, 25));
        setGeneration(g => g + 1);
        timeoutRef.current = setTimeout(() => {
            requestRef.current = requestAnimationFrame(runVisualStep);
        }, VISUAL_DELAY_MS);
    };

    const runInstantSolver = () => {
        let pop = populationRef.current;
        let bestGenome = pop[0];
        let bestScore = -Infinity;
        let finalScored: any[] = [];

        for (let i = 0; i < MAX_GENERATIONS_INSTANT; i++) {
            const result = processGeneration(pop);
            pop = result.nextPop;
            if (result.bestScore > bestScore) {
                bestScore = result.bestScore;
                bestGenome = result.bestGenome;
            }
            if (i === MAX_GENERATIONS_INSTANT - 1) finalScored = result.allScored;
        }
        populationRef.current = pop;
        updateAssignments(bestGenome, bestScore);
        setTopGenomes(finalScored.slice(0, 25));
        setGeneration(MAX_GENERATIONS_INSTANT);
        setIsOptimizing(false);
    };

    const updateAssignments = (genome: number[], score: number) => {
        const newAssign: Record<number, number> = {};
        // tableIndex -> studentIndex
        genome.forEach((studentIndex, tableIndex) => {
            if (tableIndex < tables.length) newAssign[tableIndex] = studentIndex;
        });
        setAssignments(newAssign);
        setCurrentScore(Math.round(score * 10) / 10);
    };

    const checkAnyCollision = (target: any, allTables: any[]) => {
        const HIT_RADIUS = (SCALE / 2) - 5;
        for (let other of allTables) {
            if (other.id === target.id) continue;
            const dx = (target.x * SCALE) - (other.x * SCALE);
            const dy = (target.y * SCALE) - (other.y * SCALE);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (HIT_RADIUS * 2)) return true;
        }
        return false;
    };

    const addTable = () => {
        const id = `t-${Date.now()}`;
        const offset = tables.length * 0.1;
        const newTables = [...tables, { id, x: 2 + offset, y: 2 + offset, rotation: 0, colliding: false }];
        setTables(newTables);
        recordHistory(newTables);
        setCurrentScore(null);
    };

    const quickFill = () => {
        const count = peopleCount > 0 ? peopleCount : 0; // Default if no class loaded
        const newTables = [];
        for (let i = 0; i < count; i++) {
            const col = i % 5;
            const row = Math.floor(i / 5);
            newTables.push({ id: `t-${Date.now()}-${i}`, x: 1.5 + (col * 1.5), y: 1.5 + (row * 1.5), rotation: 0, colliding: false });
        }
        setTables(newTables);
        recordHistory(newTables);
        setCurrentScore(null);
        setSelectedIds([]);
    }

    const handleDragEnd = () => {
        const nodes = transformerRef.current.nodes();
        const newTables = tables.map(t => {
            const node = nodes.find((n: any) => n.id() === t.id);
            if (node) return { ...t, x: node.x() / SCALE, y: node.y() / SCALE, rotation: node.rotation() };
            const singleNode = stageRef.current.findOne('#' + t.id);
            if (singleNode && (singleNode.x() / SCALE !== t.x || singleNode.y() / SCALE !== t.y)) {
                return { ...t, x: singleNode.x() / SCALE, y: singleNode.y() / SCALE, rotation: singleNode.rotation() };
            }
            return t;
        });
        if (JSON.stringify(newTables) !== JSON.stringify(tables)) {
            setTables(newTables);
            recordHistory(newTables);
        }
    };

    useEffect(() => {
        if (!transformerRef.current || !stageRef.current) return;
        const nodes = selectedIds.map(id => stageRef.current.findOne('#' + id));
        transformerRef.current.nodes(nodes);
        transformerRef.current.getLayer().batchDraw();
    }, [selectedIds, tables]);

    if (!mounted) return null;

    return (
        <div className="flex flex-row h-full overflow-hidden font-sans select-none transition-colors duration-200">
            {/* LEFT PANEL */}
            <div className="flex-1 flex flex-col pr-4 gap-6 h-full">
                {/* TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl shadow-sm border transition-colors duration-200">
                    <div className="flex gap-2">
                        <button onClick={addTable} className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition shadow-sm">
                            <Plus size={16} /> Table
                        </button>
                        <button onClick={quickFill} className="flex items-center gap-2 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition shadow-sm">
                            <Grip size={16} /> Fill
                        </button>
                        <button onClick={resetView} title="Reset View" className="flex items-center justify-center w-10 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition shadow-sm">
                            <Maximize size={16} />
                        </button>
                        <button
                            onClick={deleteSelected}
                            disabled={selectedIds.length === 0}
                            className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="hidden md:block h-8 w-px bg-neutral-200 dark:bg-neutral-700" />

                    <div className="flex gap-6">
                        <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wide">
                                <span>Mutate</span> <span>{Math.round(mutationRate * 100)}%</span>
                            </div>
                            <input type="range" min="0.01" max="1.0" step="0.01" value={mutationRate} onChange={e => setMutationRate(parseFloat(e.target.value))} className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
                        </div>
                        <div className="flex flex-col gap-1 w-28">
                            <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wide">
                                <span>Pop Size</span> <span>{popSize}</span>
                            </div>
                            <input type="range" min="10" max="500" step="10" value={popSize} onChange={e => setPopSize(parseInt(e.target.value))} className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Visual Toggle */}
                        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                            <button onClick={() => setVisualize(true)} className={`p-1.5 rounded-md transition-all ${visualize ? 'bg-white dark:bg-neutral-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-neutral-400 hover:text-neutral-600'}`}><Eye size={16} /></button>
                            <button onClick={() => setVisualize(false)} className={`p-1.5 rounded-md transition-all ${!visualize ? 'bg-white dark:bg-neutral-600 shadow text-amber-600 dark:text-amber-300' : 'text-neutral-400 hover:text-neutral-600'}`}><Zap size={16} /></button>
                        </div>

                        {/* NEW: Fitness Score Label */}
                        <div className={`hidden sm:flex px-3 py-2 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                            currentScore === null
                                ? 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                                : currentScore >= 0
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                        }`}>
                            Score: {currentScore !== null ? currentScore : '--'}
                        </div>

                        {/* Table Count */}
                        <div className={`px-3 py-2 rounded-lg border text-xs font-mono font-semibold ${!unfulfilled ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/30'}`}>
                            {tables.length}/{peopleCount}
                        </div>

                        {/* Run Button */}
                        {!isOptimizing ? (
                            <button onClick={startOptimizer} disabled={unfulfilled} className={`px-5 py-2 rounded-lg font-semibold text-sm transition shadow-sm ${!unfulfilled ? 'bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-600 dark:border-neutral-700'}`}>Run</button>
                        ) : (
                            <button onClick={stopOptimizer} className="bg-white dark:bg-neutral-800 border-2 border-red-500 text-red-600 px-5 py-2 rounded-lg font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-sm text-sm">Stop</button>
                        )}
                    </div>
                </div>

                {/* CANVAS AREA */}
                <div ref={containerRef} className="flex-1 border relative rounded-xl overflow-hidden transition-colors duration-200 cursor-grab active:cursor-grabbing">
                    <div className="absolute inset-0">
                        <Stage
                            ref={stageRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            draggable
                            onDragStart={(e) => {
                                if (e.target === e.target.getStage()) {
                                    stageRef.current.container().style.cursor = 'grabbing';
                                }
                            }}
                            onDragEnd={() => {
                                stageRef.current.container().style.cursor = 'grab';
                            }}
                            onMouseDown={(e) => {
                                if (e.target === e.target.getStage()) {
                                    setSelectedIds([]);
                                }
                            }}
                        >
                            <Layer>
                                {/* Grid Dots */}
                                <InfiniteGrid
                                    width={dimensions.width}
                                    height={dimensions.height}
                                    gap={GRID_SIZE * SCALE}
                                    color={isDark ? "#333" : "#e5e5e5"}
                                    radius={1}
                                />

                                {(isOptimizing || currentScore !== null) && Object.entries(assignments).map(([tIdxStr, sIdx]) => {
                                    const tIdx = parseInt(tIdxStr);
                                    const s1 = seatCoords[tIdx];
                                    if (!s1) return null;

                                    // Iterate over all OTHER assignments
                                    return Object.entries(assignments).map(([tIdx2Str, sIdx2]) => {
                                        const tIdx2 = parseInt(tIdx2Str);
                                        // Avoid double drawing and self-check
                                        if (tIdx >= tIdx2) return null;

                                        const s2 = seatCoords[tIdx2];
                                        if (!s2) return null;

                                        const r1 = relationshipMatrix[sIdx][sIdx2] || 0;
                                        const r2 = relationshipMatrix[sIdx2][sIdx] || 0;
                                        const sum = r1 + r2;

                                        // Only draw strong relationships
                                        if (Math.abs(sum) < 6) return null;

                                        return (
                                            <Line
                                                key={`${sIdx}-${sIdx2}`}
                                                points={[s1.x * SCALE, s1.y * SCALE, s2.x * SCALE, s2.y * SCALE]}
                                                stroke={sum > 0 ? C.linePos : C.lineNeg}
                                                strokeWidth={Math.max(1, Math.abs(sum) / 100)}
                                                dash={sum < 0 ? [5, 5] : undefined}
                                                opacity={0.6}
                                                listening={false}
                                            />
                                        )
                                    })
                                })}

                                {tables.map((table, tIndex) => {
                                    const assignedStudentIndex = assignments[tIndex];
                                    const isAssigned = assignedStudentIndex !== undefined;
                                    const isSelected = selectedIds.includes(table.id);

                                    let displayName = tIndex.toString();

                                    if (isAssigned) {
                                        const fullName = getPersonName(assignedStudentIndex);
                                        displayName = fullName.split(' ')[0];
                                    }

                                    return (
                                        <Group
                                            key={table.id}
                                            id={table.id}
                                            x={table.x * SCALE}
                                            y={table.y * SCALE}
                                            rotation={table.rotation}
                                            draggable
                                            dragBoundFunc={(pos) => {
                                                const e = window.event as MouseEvent;
                                                if (e && (e.ctrlKey || e.metaKey)) {
                                                    return {
                                                        x: Math.round(pos.x / (GRID_SIZE * SCALE)) * (GRID_SIZE * SCALE),
                                                        y: Math.round(pos.y / (GRID_SIZE * SCALE)) * (GRID_SIZE * SCALE),
                                                    }
                                                }
                                                return pos;
                                            }}
                                            onDragEnd={handleDragEnd}
                                            onTransformEnd={handleDragEnd}
                                            onClick={(e) => {
                                                e.cancelBubble = true;
                                                const id = table.id;
                                                if (e.evt.shiftKey) {
                                                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                                                } else {
                                                    if (!selectedIds.includes(id)) setSelectedIds([id]);
                                                }
                                            }}
                                        >
                                            {/* Table Body */}
                                            <Rect
                                                x={-50}
                                                y={-50}
                                                width={100}
                                                height={100}
                                                fill={C.tableFill}
                                                stroke={table.colliding ? C.colliding : isSelected ? C.selected : C.tableStroke}
                                                strokeWidth={isSelected ? 3 : table.colliding ? 2 : 2}
                                                cornerRadius={8}
                                            />

                                            <Group y={SEAT_OFFSET * SCALE}>
                                                {/* Chair Back */}
                                                <Rect x={-20} y={0} width={40} height={12} fill={C.chair} cornerRadius={2} />

                                                {isAssigned ? (
                                                    // --- CHANGE 2: Replace Circle with Name Tag Rect ---
                                                    <Group y={15}>
                                                        {/* Name Tag Background */}
                                                        <Rect
                                                            x={-40}
                                                            y={-12}
                                                            width={80}
                                                            height={24}
                                                            fill={resolvedTheme === "dark" ? "#000" : "#fff"}
                                                            cornerRadius={6}
                                                            stroke={resolvedTheme === "dark" ? "#fff" : "#000"}
                                                            strokeWidth={2}
                                                            shadowColor="black"
                                                            shadowBlur={2}
                                                            shadowOpacity={0.2}
                                                        />
                                                        {/* First Name Text */}
                                                        <Text
                                                            text={displayName}
                                                            fontSize={12}
                                                            fontStyle="bold"
                                                            fill={resolvedTheme === "dark" ? "#fff" : "#000"}
                                                            x={-40}
                                                            y={-6}
                                                            width={80}
                                                            align="center"
                                                            ellipsis={true} // Adds ... if name is too long
                                                            wrap="none"
                                                        />
                                                    </Group>
                                                    // ---------------------------------------------------
                                                ) : (
                                                    <Text text={tIndex.toString()} fontSize={14} fill={C.textLight} fontStyle="bold" x={-4} y={5} />
                                                )}
                                            </Group>
                                        </Group>
                                    );
                                })}
                                <Transformer ref={transformerRef} resizeEnabled={false} rotateEnabled={true} rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]} anchorCornerRadius={5} anchorSize={10} borderStroke={C.selected} borderStrokeWidth={2} anchorFill={C.selected} anchorStroke={C.tableFill} />
                            </Layer>
                        </Stage>
                    </div>
                </div>

                <div className="p-4 rounded-xl shadow-sm border h-30 shrink-0 flex flex-col transition-colors duration-200">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Relationship Matrix</h3>
                        <SearchableSelect<Classroom, string> items={classes} value={currentClassId} onChange={onChangeClass} getLabel={c => c.name} getValue={c => c._id} />
                    </div>
                    {students.length > 0 ? (
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            Loaded <span className="font-bold">{students.length}</span> students & <span className="font-bold">{relationships.length}</span> relationships.
                        </div>
                    ) : (
                        <div className="text-xs text-neutral-400 italic">Select a class to load student data.</div>
                    )}
                </div>
            </div>

            {(visualize || topGenomes.length > 0) && (
                <div className="w-72 border shadow-xl rounded-xl flex flex-col z-20 transition-colors duration-200">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950 flex justify-between items-center">
                        <h2 className="font-bold text-neutral-700 dark:text-neutral-300 text-sm">Optimization Log</h2>
                        <span className="text-xs bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400 font-mono">Gen {generation}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                        <div className="grid grid-cols-[24px_40px_1fr] px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wide">
                            <div>#</div><div>Score</div><div>Arrangement</div>
                        </div>
                        {topGenomes.map((data, rank) => (
                            <div key={rank} className={`grid grid-cols-[24px_40px_1fr] items-center px-2 py-1.5 rounded border text-[10px] font-mono transition-colors ${rank < ELITISM_COUNT ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900/30' : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'}`}>
                                <div className={`font-bold ${rank < ELITISM_COUNT ? 'text-indigo-600' : 'text-neutral-400'}`}>{rank + 1}</div>
                                <div className={`font-bold ${data.score > 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(data.score)}</div>
                                <div className="flex flex-wrap gap-0.5">
                                    {data.genome.slice(0, 10).map((idx, gIdx) => (
                                        <div key={gIdx} className="w-2 h-2 rounded-full" style={{ backgroundColor: getPersonColor(idx) }} title={getPersonName(idx)} />
                                    ))}
                                    {data.genome.length > 10 && <span className="text-[8px] text-neutral-400">...</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}