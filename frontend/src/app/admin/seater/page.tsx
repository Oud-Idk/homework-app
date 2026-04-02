"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Group, Layer, Line, Rect, Shape, Stage, Text, Transformer } from 'react-konva';
import { useTheme } from 'next-themes';
import { Grip, Maximize, Plus, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { useSession } from "next-auth/react";
import { Classroom } from "@/types";
import { reqToApi } from "@/lib/utils";

import { useClassroomData } from '@/hooks/ai/useClassroomData';
import { useGeneticAlgorithm } from '@/hooks/ai/useGeneticAlgorithm';
import { SearchableSelect } from "@/components/Selector/SearchableSelect";
import { GASettings } from '@/components/GA/GASettings';
import { OptimizationLog } from '@/components/GA/OptimizationLog';
import SubmitButton from "@/components/SubmitButton";

const SCALE = 100;      // 100px = 1m
const GRID_SIZE = 0.25; // 25cm snapping
const SEAT_OFFSET = 0.45;

const InfiniteGrid = React.memo(({ width, height, gap, color = "#ddd", radius = 1 }: any) => {
    return (
        <Shape
            x={0} y={0}
            sceneFunc={(context, shape) => {
                const stage = shape.getStage();
                if (!stage) return;
                const ctx = context as unknown as CanvasRenderingContext2D;
                const transform = stage.getAbsoluteTransform().copy().invert();
                const tl = transform.point({ x: 0, y: 0 });
                const br = transform.point({ x: width, y: height });
                const buffer = gap * 2;
                const startX = Math.floor((tl.x - buffer) / gap) * gap;
                const endX = Math.floor((br.x + buffer) / gap) * gap;
                const startY = Math.floor((tl.y - buffer) / gap) * gap;
                const endY = Math.floor((br.y + buffer) / gap) * gap;

                ctx.fillStyle = color;
                ctx.beginPath();
                for (let x = startX; x < endX; x += gap) {
                    for (let y = startY; y < endY; y += gap) {
                        ctx.moveTo(x + radius, y);
                        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
                    }
                }
                ctx.fill();
            }}
            listening={false} perfectDrawEnabled={false}
        />
    );
});
InfiniteGrid.displayName = "InfiniteGrid";

export default function SeatingOptimizer() {
    const { resolvedTheme } = useTheme();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const adaptiveTracker = useRef({
        generation: 0,
        bestFitness: -Infinity,
        stagnation: 0,
        mutationsThisGen: 0
    });

    const isDark = mounted && resolvedTheme === 'dark';

    const C = {
        grid: isDark ? "#484848" : "#e5e5e5",
        tableFill: isDark ? "#000000" : "#ffffff",
        tableStroke: isDark ? "#ffffff" : "#000000",
        chair: isDark ? "#404040" : "#d4d4d4",
        textLight: isDark ? "#737373" : "#a3a3a3",
        selected: "#3b82f6", colliding: "#ef4444", linePos: "#10b981", lineNeg: "#ef4444"
    };

    // State
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [currentClassId, setCurrentClassId] = useState<string>("");
    const [tables, setTables] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [history, setHistory] = useState<any[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);

    // Zoom & Pan State
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Keyboard Tracking for Ctrl Snapping
    const isCtrlPressed = useRef(false);

    // Data Hook
    const { students, matrix, relationships } = useClassroomData(currentClassId, session, true);

    // Settings
    const [visMode, setVisMode] = useState<'visual' | 'instant'>('visual');
    const [popSize, setPopSize] = useState(100);
    const [mutationRate, setMutationRate] = useState(0.3);
    const [maxGenerations, setMaxGenerations] = useState(2000);

    const peopleCount = students.length;
    const unfulfilled = tables.length !== peopleCount || peopleCount === 0;

    // Load classes only on mount
    useEffect(() => {
        reqToApi("class").then(r => r.json()).then(c => setClasses(c)).catch(console.error);
    }, []);

    // Resize observer
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            setDimensions({ width: Math.round(entries[0].contentRect.width), height: Math.round(entries[0].contentRect.height) });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [mounted]);

    // Global Key Bindings
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.metaKey) isCtrlPressed.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control' || !e.metaKey) isCtrlPressed.current = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Seat Coords Tracker
    const seatCoords = useMemo(() => {
        return tables.map(t => {
            const rad = t.rotation * (Math.PI / 180);
            return { x: t.x - SEAT_OFFSET * Math.sin(rad), y: t.y + SEAT_OFFSET * Math.cos(rad) };
        });
    }, [tables]);

    const { pullMatrix, pushMatrix } = useMemo(() => {
        const len = tables.length;
        const pull = Array(len).fill(0).map(() => new Float32Array(len));
        const push = Array(len).fill(0).map(() => new Float32Array(len));

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const t1 = seatCoords[i];
                const t2 = seatCoords[j];
                if (!t1 || !t2) continue;

                const dist = Math.sqrt(Math.pow(t1.x - t2.x, 2) + Math.pow(t1.y - t2.y, 2));

                const distNorm = Math.max(dist, 0.8);

                pull[i][j] = pull[j][i] = (2 / (Math.pow(distNorm, 2.2))) - Math.pow(0.08 * distNorm, 0.7);
                push[i][j] = push[j][i] = Math.max(0, (2.5 / (distNorm  * distNorm)) - 0.4)
            }
        }
        return { pullMatrix: pull, pushMatrix: push };
    }, [tables, seatCoords]);

    const relMatrix = useMemo(() => {
        const len = peopleCount;
        const mat = Array(len).fill(0).map(() => new Float32Array(len));

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const w1 = matrix[i]?.[j] || 0;
                const w2 = matrix[j]?.[i] || 0;
                mat[i][j] = mat[j][i] = w1 + w2;
            }
        }
        return mat;
    }, [peopleCount, matrix]);

    const calculateFitness = useCallback((genome: number[]) => {
        let totalScore = 0;
        const len = genome.length;

        for (let i = 0; i < len; i++) {
            const studentA = genome[i];
            if (!pullMatrix[i]) continue;

            for (let j = i + 1; j < len; j++) {
                const studentB = genome[j];
                const weight = relMatrix[studentA]?.[studentB];

                if (weight > 0) {
                    totalScore += weight * pullMatrix[i][j];
                } else if (weight < 0) {
                    totalScore += weight * pushMatrix[i][j];
                }
            }
        }

        if (totalScore > adaptiveTracker.current.bestFitness) {
            adaptiveTracker.current.bestFitness = totalScore;
            adaptiveTracker.current.stagnation = 0;
        }

        return totalScore;
    }, [relMatrix, pullMatrix, pushMatrix]);

    const mutate = useCallback((genome: number[], baselineRate: number) => {
        const tracker = adaptiveTracker.current;

        // 1. Advance our internal generation tracker
        tracker.mutationsThisGen++;
        if (tracker.mutationsThisGen >= popSize) {
            tracker.generation++;
            tracker.stagnation++; // Assume stagnation; calculateFitness will reset this to 0 if we improve
            tracker.mutationsThisGen = 0;
        }

        // 2. Strategy 3 Logic: Best of Both Worlds
        const MAX_RATE = 4.0;
        const MIN_RATE = Math.max(0.1, baselineRate); // The UI slider determines the minimum floor
        const DECAY = 0.015; // Slow decay (optimized for your 2000 maxGens)

        // Calculate standard exponential cooling rate
        let currentRate = MIN_RATE + (MAX_RATE - MIN_RATE) * Math.exp(-DECAY * tracker.generation);

        // If stuck for 30+ generations, trigger a "mini-quake" hypermutation to escape the local minimum
        if (tracker.stagnation > 30) {
            currentRate = Math.min(MAX_RATE, currentRate * 3); // Triple the rate, capped at MAX_RATE
        }

        // 3. Apply the actual mutation using the adaptive rate
        const child = [...genome];
        const length = child.length;
        const prob = currentRate / length;

        for (let i = 0; i < length; i++) {
            if (Math.random() < prob) {
                const swapIdx = Math.floor(Math.random() * length);
                // Swapping with self optimization
                if (i !== swapIdx) {
                    const temp = child[i];
                    child[i] = child[swapIdx];
                    child[swapIdx] = temp;
                }
            }
        }

        return child;
    }, [popSize])

    const createInitialPop = useCallback((size: number) => {
        const indices = Array.from({ length: peopleCount }, (_, i) => i);
        return Array.from({ length: size }, () => [...indices].sort(() => Math.random() - 0.5));
    }, [peopleCount]);

    const crossover = useCallback((p1: number[], p2: number[]) => {
        const length = p1.length;
        const start = Math.floor(Math.random() * length);
        const end = Math.floor(Math.random() * length);
        const min = Math.min(start, end);
        const max = Math.max(start, end);

        const child = new Array(length).fill(-1);
        const used = new Set<number>();

        for (let i = min; i <= max; i++) {
            child[i] = p1[i];
            used.add(p1[i]);
        }

        let p2Index = 0;
        for (let i = 0; i < length; i++) {
            if (child[i] === -1) {
                while (used.has(p2[p2Index])) p2Index++;
                child[i] = p2[p2Index];
                used.add(p2[p2Index]);
                p2Index++;
            }
        }
        return child;
    }, []);

    const ga = useGeneticAlgorithm({
        popSize, mutationRate, maxInstantGens: maxGenerations, visualDelayMs: 50,
        createInitialPop, calculateFitness, mutate, crossover
    });

    useEffect(() => {
        if (ga.isOptimizing) {
            adaptiveTracker.current = {
                generation: 0,
                bestFitness: -Infinity,
                stagnation: 0,
                mutationsThisGen: 0
            };
        }
    }, [ga.isOptimizing]);

    // Reactive Score: Live updates when you drag a table (matrices recalculate instantly)
    const currentScore = useMemo(() => {
        if (!ga.bestGenome || ga.bestGenome.length === 0 || tables.length === 0) return null;
        return calculateFitness(ga.bestGenome);
    }, [ga.bestGenome, calculateFitness, tables]);

    const progressPercent = useMemo(() => {
        if (!ga.isOptimizing || visMode === 'visual') return 0;
        return Math.min(100, Math.round((ga.generation / maxGenerations) * 100));
    }, [ga.generation, maxGenerations, ga.isOptimizing, visMode]);

    // Extract top contributing/damaging connections from the current layout
    const connectionScores = useMemo(() => {
        if (!ga.bestGenome || tables.length === 0 || peopleCount === 0) return { positives: [], negatives: [] };

        const genome = ga.bestGenome;
        const len = genome.length;
        const connections = [];

        for (let i = 0; i < len; i++) {
            const studentA = genome[i];
            if (!pullMatrix[i]) continue;

            for (let j = i + 1; j < len; j++) {
                const studentB = genome[j];
                const weight = relMatrix[studentA]?.[studentB] || 0;

                if (weight === 0) continue;

                let score = 0;
                if (weight > 0) {
                    score = weight * pullMatrix[i][j];
                } else if (weight < 0) {
                    score = weight * pushMatrix[i][j];
                }

                if (Math.abs(score) > 0.01) { // Filter out microscopic scores
                    connections.push({
                        studentA,
                        studentB,
                        tableA: i,    // Capture table index for the canvas line
                        tableB: j,    // Capture table index for the canvas line
                        weight,       // Raw relationship weight for line styling
                        nameA: students[studentA]?.name.split(' ')[0] || 'Unknown',
                        nameB: students[studentB]?.name.split(' ')[0] || 'Unknown',
                        score
                    });
                }
            }
        }

        // Sort Highest positive score first
        const positives = connections
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8); // Top 8 contributors

        // Sort Lowest negative score first (most damaging)
        const negatives = connections
            .filter(c => c.score < 0)
            .sort((a, b) => a.score - b.score)
            .slice(0, 8); // Top 8 offenders

        return { positives, negatives };
    }, [ga.bestGenome, pullMatrix, pushMatrix, relMatrix, students, tables.length, peopleCount]);

    const assignments = useMemo(() => {
        const map: Record<number, number> = {};
        if (ga.bestGenome) ga.bestGenome.forEach((studentIdx, tableIdx) => {
            if (tableIdx < tables.length) map[tableIdx] = studentIdx;
        });
        return map;
    }, [ga.bestGenome, tables.length]);

    // --- Canvas Actions & Handlers ---
    const recordHistory = (newTables: any[]) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newTables);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const deleteSelected = () => {
        if (ga.isOptimizing) return;
        const newTables = tables.filter(t => !selectedIds.includes(t.id));
        setTables(newTables);
        setSelectedIds([]);
        recordHistory(newTables);
        if (ga.isOptimizing) ga.stop();
    };

    const addTable = () => {
        if (ga.isOptimizing) return;
        const offset = tables.length * 0.1;
        const newTables = [...tables, { id: `t-${Date.now()}`, x: 2 + offset, y: 2 + offset, rotation: 0, colliding: false }];
        setTables(newTables);
        recordHistory(newTables);
    };

    const quickFill = () => {
        if (ga.isOptimizing) return;
        const count = peopleCount || 0;
        if (count === 0) return;

        const TABLE_W = 1.0;
        const AISLE = .75;
        const ROW_H = 1.75;
        const OFFSET_X = 1.5;
        const OFFSET_Y = 1.5;
        const PAIRS_PER_ROW = 4;

        const newTables = Array.from({ length: count }, (_, i) => {
            const pairIndex = Math.floor(i / 2);
            const row = Math.floor(pairIndex / PAIRS_PER_ROW);
            const colInRow = pairIndex % PAIRS_PER_ROW;
            const sideIndex = i % 2;

            const x = OFFSET_X + (colInRow * (TABLE_W * 2 + AISLE)) + (sideIndex * TABLE_W);
            const y = OFFSET_Y + (row * ROW_H);

            return {
                id: `t-${Date.now()}-${i}`,
                x,
                y,
                rotation: 0,
                colliding: false
            };
        });

        setTables(newTables);
        recordHistory(newTables);
        setSelectedIds([]);
    };

    const handleDragEnd = () => {
        const nodes = transformerRef.current.nodes();
        const gap = GRID_SIZE * SCALE;

        const newTables = tables.map(t => {
            const node = nodes.find((n: any) => n.id() === t.id) || stageRef.current.findOne('#' + t.id);
            if (node) {
                let newX = node.x() / SCALE;
                let newY = node.y() / SCALE;

                // Only snap to grid on drop if Ctrl is held down
                if (isCtrlPressed.current) {
                    newX = Math.round(node.x() / gap) * gap / SCALE;
                    newY = Math.round(node.y() / gap) * gap / SCALE;
                }

                return { ...t, x: newX, y: newY, rotation: Math.round(node.rotation()) };
            }
            return t;
        });

        if (JSON.stringify(newTables) !== JSON.stringify(tables)) {
            setTables(newTables);
            recordHistory(newTables);
        }
    };

    // --- Zoom & Pan Logic ---
    const handleWheel = useCallback((e: any) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const scaleBy = 1.1;
        const oldScale = stageScale;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stagePos.x) / oldScale,
            y: (pointer.y - stagePos.y) / oldScale,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(0.1, Math.min(newScale, 5));

        setStageScale(newScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    }, [stageScale, stagePos]);

    const handleZoomButton = (direction: 1 | -1) => {
        const scaleBy = 1.2;
        const oldScale = stageScale;
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(0.1, Math.min(newScale, 5));

        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        const centerPointTo = {
            x: (centerX - stagePos.x) / oldScale,
            y: (centerY - stagePos.y) / oldScale,
        };

        setStageScale(newScale);
        setStagePos({
            x: centerX - centerPointTo.x * newScale,
            y: centerY - centerPointTo.y * newScale,
        });
    };

    const resetView = () => {
        setStageScale(1);
        setStagePos({ x: 0, y: 0 });
    };

    const scaleProps = useMemo(() => {
        let m = 1;
        let p = SCALE * stageScale;
        if (p > 250) m = 0.5;
        if (p > 500) m = 0.25;
        if (p < 50) m = 2;
        if (p < 25) m = 5;
        if (p < 10) m = 10;
        return { meters: m, pixels: p * m };
    }, [stageScale]);

    useEffect(() => {
        if (!transformerRef.current || !stageRef.current) return;
        transformerRef.current.nodes(selectedIds.map(id => stageRef.current.findOne('#' + id)));
        transformerRef.current.getLayer().batchDraw();
    }, [selectedIds, tables]);

    const onChangeClass = (id: string) => {
        setCurrentClassId(id);
        ga.stop();
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-row h-full select-none transition-colors duration-200">
            <div className="flex-1 flex flex-col gap-6 h-full">
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl shadow-sm border transition-colors duration-200">
                    <div className="flex gap-2">
                        <button onClick={addTable} disabled={ga.isOptimizing} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Plus size={16} /> Table
                        </button>
                        <button onClick={quickFill} disabled={ga.isOptimizing} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Grip size={16} /> Fill
                        </button>

                        <div className="flex ml-2 gap-1 border rounded-lg bg-neutral-500/5 p-1 shadow-sm">
                            <button onClick={() => handleZoomButton(-1)} className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"><ZoomOut size={16} /></button>
                            <button onClick={resetView} className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400" title="Reset View"><Maximize size={16} /></button>
                            <button onClick={() => handleZoomButton(1)} className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"><ZoomIn size={16} /></button>
                        </div>

                        <button onClick={deleteSelected} disabled={selectedIds.length === 0 || ga.isOptimizing} className="flex items-center gap-2 ml-2 text-red-500 border px-3 py-2 rounded-lg disabled:opacity-50 hover:bg-neutral-500/10 cursor-pointer disabled:cursor-not-allowed">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Score Display */}
                        <div className={`hidden sm:flex px-3 py-2 rounded-lg border text-xs font-jetbrains-mono font-semibold ${
                            currentScore === null ? 'border-neutral-500 text-neutral-500'
                                : currentScore >= 0 ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'
                        }`}>
                            Score: {currentScore !== null ? Math.round(currentScore * 10) / 10 : '--'}
                        </div>

                        {/* Seat Count */}
                        <div className={`px-3 py-2 rounded-lg border text-xs font-jetbrains-mono font-semibold ${!unfulfilled ? 'text-green-500 border-green-500' : 'text-orange-500 border-orange-500'}`}>
                            {tables.length}/{peopleCount}
                        </div>

                        {/* RUN BUTTON AREA */}
                        <div className="flex items-center w-32 justify-end">
                            {!ga.isOptimizing ? (
                                <SubmitButton
                                    onClick={() => ga.start(visMode)}
                                    disabled={unfulfilled}
                                    className='w-full rounded-lg font-semibold text-sm shadow-sm'
                                >
                                    {visMode === 'instant' ? `Run (${maxGenerations})` : 'Run Visual'}
                                </SubmitButton>
                            ) : (
                                <SubmitButton
                                    onClick={ga.stop}
                                    className='w-full rounded-lg font-semibold text-sm shadow-sm border-red-500! text-red-500! relative overflow-hidden'
                                >
                                    {visMode === 'instant' ? (
                                        <>
                                            {/* Progress Background */}
                                            <div
                                                className="absolute inset-0 bg-red-100 dark:bg-red-900/30 transition-all duration-200 ease-linear"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                            {/* Text */}
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {progressPercent}% <span className="opacity-50 text-[10px]">Stop</span>
                                            </span>
                                        </>
                                    ) : (
                                        "Stop"
                                    )}
                                </SubmitButton>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border p-4 rounded-xl">
                    <GASettings
                        mutationRate={mutationRate} setMutationRate={setMutationRate}
                        popSize={popSize} setPopSize={setPopSize}
                        visMode={visMode} setVisMode={setVisMode}
                        setMaxGenerations={setMaxGenerations}
                        iconStyle="lucide"
                    />
                </div>

                <div ref={containerRef} className="flex-1 border relative rounded-xl overflow-hidden transition-colors duration-200">
                    <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
                        <Stage
                            width={dimensions.width} height={dimensions.height}
                            ref={stageRef}
                            draggable
                            scaleX={stageScale} scaleY={stageScale}
                            x={stagePos.x} y={stagePos.y}
                            onWheel={handleWheel}
                            onMouseDown={e => e.target === e.target.getStage() && setSelectedIds([])}
                            onDragEnd={e => {
                                if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() });
                            }}
                        >
                            <Layer>
                                {/* 1. BOTTOM: The Background Grid */}
                                <InfiniteGrid width={dimensions.width} height={dimensions.height} gap={GRID_SIZE * SCALE} color={C.grid} />

                                {/* 2. MIDDLE: The Tables (Moved up so lines draw over them) */}
                                {tables.map((table, tIndex) => {
                                    const sIdx = assignments[tIndex];
                                    const isAssigned = sIdx !== undefined;
                                    const isSelected = selectedIds.includes(table.id);
                                    const displayName = isAssigned ? (students[sIdx]?.name || "Unknown").split(' ')[0] : tIndex.toString();

                                    return (
                                        <Group
                                            key={table.id} id={table.id}
                                            x={table.x * SCALE} y={table.y * SCALE} rotation={table.rotation}
                                            draggable={!ga.isOptimizing}
                                            dragBoundFunc={(pos) => {
                                                // (Your existing snap logic...)
                                                if (!isCtrlPressed.current) return pos;
                                                const stage = stageRef.current;
                                                if (!stage) return pos;
                                                const localPos = stage.getAbsoluteTransform().copy().invert().point(pos);
                                                const gap = GRID_SIZE * SCALE;
                                                return stage.getAbsoluteTransform().point({
                                                    x: Math.round(localPos.x / gap) * gap,
                                                    y: Math.round(localPos.y / gap) * gap,
                                                });
                                            }}
                                            onDragEnd={handleDragEnd} onTransformEnd={handleDragEnd}
                                            onClick={e => { e.cancelBubble = true; setSelectedIds(prev => e.evt.shiftKey ? prev.includes(table.id) ? prev.filter(i => i !== table.id) : [...prev, table.id] : [table.id])}}
                                        >
                                            {/* (Your Table Graphics Rects/Text...) */}
                                            <Rect x={-50} y={-50} width={100} height={100} fill={C.tableFill} stroke={table.colliding ? C.colliding : isSelected ? C.selected : C.tableStroke} strokeWidth={isSelected ? 3 : 2} cornerRadius={8} />
                                            <Group y={SEAT_OFFSET * SCALE}>
                                                <Rect x={-20} y={0} width={40} height={12} fill={C.chair} cornerRadius={2} />
                                                {isAssigned ? (
                                                    <Group y={15}>
                                                        <Rect x={-40} y={-12} width={80} height={24} fill={isDark ? "#000" : "#fff"} cornerRadius={6} stroke={isDark ? "#fff" : "#000"} strokeWidth={2} shadowColor="black" shadowBlur={2} shadowOpacity={0.2} />
                                                        <Text text={displayName} fontSize={12} fontStyle="bold" fill={isDark ? "#fff" : "#000"} x={-40} y={-6} width={80} align="center" ellipsis={true} wrap="none" />
                                                    </Group>
                                                ) : (
                                                    <Text text={displayName} fontSize={14} fill={C.textLight} fontStyle="bold" x={-4} y={5} />
                                                )}
                                            </Group>
                                        </Group>
                                    );
                                })}

                                {/* 3. TOP: The Connection Lines (Now drawn last = appears on top) */}
                                {(ga.isOptimizing || currentScore !== null) &&
                                    [...connectionScores.positives, ...connectionScores.negatives].map((conn, idx) => {
                                        const s1 = seatCoords[conn.tableA];
                                        const s2 = seatCoords[conn.tableB];
                                        if (!s1 || !s2) return null;

                                        return (
                                            <Line
                                                key={`line-${conn.tableA}-${conn.tableB}-${idx}`}
                                                points={[s1.x * SCALE, s1.y * SCALE, s2.x * SCALE, s2.y * SCALE]}

                                                // Color based on score sign (Positive vs Negative impact)
                                                stroke={conn.score > 0 ? C.linePos : C.lineNeg}

                                                // Thickness based on relationship strength
                                                strokeWidth={Math.min(2, Math.max(1, Math.abs(conn.weight) / 2500))}

                                                // Dashed if they are enemies (even if score is technically 0/neutral)
                                                dash={conn.weight < 0 ? [10, 10] : undefined}

                                                opacity={0.8}
                                                listening={false} // Crucial: Clicks pass through the line to the table below
                                            />
                                        );
                                    })
                                }

                                <Transformer ref={transformerRef} resizeEnabled={false} rotateEnabled={true} rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]} anchorCornerRadius={5} anchorSize={10} borderStroke={C.selected} borderStrokeWidth={2} anchorFill={C.selected} anchorStroke={C.tableFill} />
                            </Layer>
                        </Stage>
                    </div>

                    <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-lg shadow-sm pointer-events-none flex items-center gap-4 transition-all duration-200">
                        <div className="text-xs font-jetbrains-mono text-neutral-600 dark:text-neutral-400 font-semibold w-10 text-right">
                            {Math.round(stageScale * 100)}%
                        </div>
                        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-600"></div>
                        <div className="flex flex-col items-center gap-1 min-w-12.5">
                            <div
                                className="h-1 border-x-2 border-neutral-800 dark:border-neutral-200 bg-neutral-800 dark:bg-neutral-200 transition-all duration-200 ease-out origin-left"
                                style={{ width: `${scaleProps.pixels}px` }}
                            />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider leading-none">
                                {scaleProps.meters}m
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-xl shadow-sm border shrink-0 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Relationship Matrix</h3>
                        <SearchableSelect<Classroom, string> items={classes} value={currentClassId} onChange={onChangeClass} getLabel={c => c.name} getValue={c => c._id} />
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {students.length > 0 ? `Loaded ${students.length} students & ${relationships?.length || 0} relationships.` : `Select a class to load student data.`}
                    </div>
                </div>
            </div>

            <div className="pl-4 md:block hidden">
                <OptimizationLog
                    generation={ga.generation}
                    connections={connectionScores}
                />
            </div>
        </div>
    );
}