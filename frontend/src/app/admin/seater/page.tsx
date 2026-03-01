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

    // Data Hook
    const { students, matrix, relationships } = useClassroomData(currentClassId, session, true);

    // Settings
    const [visMode, setVisMode] = useState<'visual' | 'instant'>('visual');
    const [popSize, setPopSize] = useState(100);
    const [mutationRate, setMutationRate] = useState(0.3);

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

                const distSq = Math.pow(t1.x - t2.x, 2) + Math.pow(t1.y - t2.y, 2);
                const dist = Math.sqrt(distSq);

                // SAFEGUARD: If user accidentally stacks tables on top of each other, prevent Infinity/NaN
                const safeDist = Math.max(dist, 0.8);

                // --- FRIEND PULL (+ Positive Relationships) ---
                // Base gravity: 1 / safeDist (At 1m: 1.0 | At 2m: 0.5 | At 5m: 0.2)
                let pullValue = 1 / safeDist;

                // ADJACENCY BONUS (Catches both 1.0m neighbors AND 1.41m diagonal neighbors)
                if (safeDist < 1.8) {
                    // At 1.0m: Bonus is 2.4. Total Multiplier = ~3.4
                    // At 1.4m: Bonus is 1.2. Total Multiplier = ~1.9
                    pullValue += (1.8 - safeDist) * 3;
                }

                pull[i][j] = pull[j][i] = pullValue;

                // --- ENEMY PUSH (Separation Needed) ---
                // At 0.8m (Overlap): Penalty ~1.75 (Harsher than ^2 which was 1.56)
                // At 1.0m (Touch):   Penalty 1.00
                // At 1.4m (Diag):    Penalty 0.43 (Lower than ^2 which was 0.50)
                // At 2.0m (Away):    Penalty 0.17 (Much lower than ^2 which was 0.25)
                push[i][j] = push[j][i] = 1 / Math.pow(safeDist, 2.5);
            }
        }
        return { pullMatrix: pull, pushMatrix: push };
    }, [tables, seatCoords]);

    // 2. Precompute student relationship matrix
    const relMatrix = useMemo(() => {
        const len = peopleCount;
        const mat = Array(len).fill(0).map(() => new Float32Array(len));

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const w1 = matrix[i]?.[j] || 0;
                const w2 = matrix[j]?.[i] || 0;
                // Combine their relationship weights
                mat[i][j] = mat[j][i] = w1 + w2;
            }
        }
        return mat;
    }, [peopleCount, matrix]);

    // 3. The Hot Loop: Now using continuous forces!
    const calculateFitness = useCallback((genome: number[]) => {
        let totalScore = 0;
        const len = genome.length;

        for (let i = 0; i < len; i++) {
            const studentA = genome[i];

            // Safety check against desynced lengths during React renders
            if (!pullMatrix[i]) continue;

            for (let j = i + 1; j < len; j++) {
                const studentB = genome[j];
                const weight = relMatrix[studentA]?.[studentB];

                if (weight > 0) {
                    // POSITIVE (+): Pull them together
                    totalScore += weight * pullMatrix[i][j];
                } else if (weight < 0) {
                    // NEGATIVE (-): Push them apart aggressively
                    totalScore += weight * pushMatrix[i][j];
                } else {
                    // NEUTRAL (0): The "Stranger Danger" penalty
                    // pushMatrix at 1.0m is 1.00. Multiplied by 2 = -2.0 penalty.
                    // pushMatrix at 1.4m is 0.50. Multiplied by 2 = -1.0 penalty.
                    // This creates a mild annoyance that forces the GA to keep shuffling
                    // students until it finds someone with a >0 relationship.
                    totalScore -= 2 * pushMatrix[i][j];
                }
            }
        }
        return totalScore;
    }, [relMatrix, pullMatrix, pushMatrix]);

    const mutate = useCallback((genome: number[], rate: number) => {
        const child = [...genome];
        if (Math.random() < rate) {
            const idxA = Math.floor(Math.random() * child.length);
            const idxB = Math.floor(Math.random() * child.length);
            [child[idxA], child[idxB]] = [child[idxB], child[idxA]];
        }
        return child;
    }, []);

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
        popSize, mutationRate, maxInstantGens: 5000, visualDelayMs: 100,
        createInitialPop, calculateFitness, mutate, crossover
    });

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
        const newTables = tables.filter(t => !selectedIds.includes(t.id));
        setTables(newTables);
        setSelectedIds([]);
        recordHistory(newTables);
        if (ga.isOptimizing) ga.stop();
    };

    const addTable = () => {
        const offset = tables.length * 0.1;
        const newTables = [...tables, { id: `t-${Date.now()}`, x: 2 + offset, y: 2 + offset, rotation: 0, colliding: false }];
        setTables(newTables);
        recordHistory(newTables);
    };

    const quickFill = () => {
        const count = peopleCount || 0;
        if (count === 0) return;

        // These MUST be multiples of GRID_SIZE (0.25)
        const TABLE_W = 1.0;  // Center-to-center for touching tables
        const AISLE = 1;   // 75cm walking space between pairs
        const ROW_H = 1.75;    // 1.5m between rows
        const OFFSET_X = 1.5; // Starting position
        const OFFSET_Y = 1.5;
        const PAIRS_PER_ROW = 4;

        const newTables = Array.from({ length: count }, (_, i) => {
            const pairIndex = Math.floor(i / 2);
            const row = Math.floor(pairIndex / PAIRS_PER_ROW);
            const colInRow = pairIndex % PAIRS_PER_ROW;
            const sideIndex = i % 2; // 0 for left, 1 for right

            // All math here results in multiples of 0.25
            const x = OFFSET_X + (colInRow * (TABLE_W * 2 + AISLE)) + (sideIndex * TABLE_W);
            const y = OFFSET_Y + (row * ROW_H);

            return {
                id: `t-${Date.now()}-${i}`,
                x, // Meter units
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
                // mathematically snap local coords before saving
                const snappedX = Math.round(node.x() / gap) * gap;
                const snappedY = Math.round(node.y() / gap) * gap;
                return { ...t, x: snappedX / SCALE, y: snappedY / SCALE, rotation: Math.round(node.rotation()) };
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
        newScale = Math.max(0.1, Math.min(newScale, 5)); // clamp zoom

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

    // Calculate dynamic physical scale based on zoom
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

    // Keep transformer aligned
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
                        <button onClick={addTable} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10"><Plus size={16} /> Table</button>
                        <button onClick={quickFill} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10"><Grip size={16} /> Fill</button>

                        <div className="flex ml-2 gap-1 border rounded-lg bg-neutral-500/5 p-1 shadow-sm">
                            <button onClick={() => handleZoomButton(-1)} className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"><ZoomOut size={16} /></button>
                            <button onClick={resetView} className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400" title="Reset View"><Maximize size={16} /></button>
                            <button onClick={() => handleZoomButton(1)} className="p-1.5 rounded-md hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"><ZoomIn size={16} /></button>
                        </div>

                        <button onClick={deleteSelected} disabled={selectedIds.length === 0} className="flex items-center gap-2 ml-2 text-red-500 border px-3 py-2 rounded-lg disabled:opacity-50 hover:bg-neutral-500/10 cursor-pointer"><Trash2 size={16} /></button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`hidden sm:flex px-3 py-2 rounded-lg border text-xs font-jetbrains-mono font-semibold ${
                            ga.bestScore === null ? 'border-neutral-500 text-neutral-500'
                                : ga.bestScore >= 0 ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'
                        }`}>
                            Score: {ga.bestScore !== null ? Math.round(ga.bestScore * 10) / 10 : '--'}
                        </div>

                        <div className={`px-3 py-2 rounded-lg border text-xs font-jetbrains-mono font-semibold ${!unfulfilled ? 'text-green-500 border-green-500' : 'text-orange-500 border-orange-500'}`}>
                            {tables.length}/{peopleCount}
                        </div>

                        <div className="flex items-center">
                            {!ga.isOptimizing ? (
                                <SubmitButton onClick={() => ga.start(visMode)} disabled={unfulfilled} className='rounded-lg font-semibold text-sm shadow-sm'>Run</SubmitButton>
                            ) : (
                                <SubmitButton onClick={ga.stop} className='rounded-lg font-semibold text-sm shadow-sm border-red-500! text-red-500!'>Stop</SubmitButton>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border p-4 rounded-xl">
                    <GASettings
                        mutationRate={mutationRate} setMutationRate={setMutationRate}
                        popSize={popSize} setPopSize={setPopSize}
                        visMode={visMode} setVisMode={setVisMode}
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
                                // Save pan position only if stage itself was dragged
                                if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() });
                            }}
                        >
                            <Layer>
                                <InfiniteGrid width={dimensions.width} height={dimensions.height} gap={GRID_SIZE * SCALE} color={C.grid} />

                                {(ga.isOptimizing || ga.bestScore !== null) && Object.entries(assignments).map(([tIdx1, sIdx1]) =>
                                    Object.entries(assignments).map(([tIdx2, sIdx2]) => {
                                        if (parseInt(tIdx1) >= parseInt(tIdx2)) return null;
                                        const s1 = seatCoords[parseInt(tIdx1)];
                                        const s2 = seatCoords[parseInt(tIdx2)];
                                        if (!s1 || !s2) return null;

                                        const sum = (matrix[sIdx1][sIdx2] || 0) + (matrix[sIdx2][sIdx1] || 0);
                                        if (Math.abs(sum) < 6) return null;

                                        return <Line key={`line-${tIdx1}-${tIdx2}`} points={[s1.x * SCALE, s1.y * SCALE, s2.x * SCALE, s2.y * SCALE]} stroke={sum > 0 ? C.linePos : C.lineNeg} strokeWidth={Math.min(5, Math.max(1, Math.abs(sum) / 100))} dash={sum < 0 ? [5, 5] : undefined} opacity={0.6} listening={false} />
                                    })
                                )}

                                {tables.map((table, tIndex) => {
                                    const sIdx = assignments[tIndex];
                                    const isAssigned = sIdx !== undefined;
                                    const isSelected = selectedIds.includes(table.id);
                                    const displayName = isAssigned ? (students[sIdx]?.name || "Unknown").split(' ')[0] : tIndex.toString();

                                    return (
                                        <Group
                                            key={table.id} id={table.id}
                                            x={table.x * SCALE} y={table.y * SCALE} rotation={table.rotation}
                                            draggable
                                            dragBoundFunc={(pos) => {
                                                // Convert absolute pos to local stage coords for flawless snapping
                                                const stage = stageRef.current;
                                                if (!stage) return pos;
                                                const localPos = stage.getAbsoluteTransform().copy().invert().point(pos);
                                                const gap = GRID_SIZE * SCALE;
                                                const snappedLocal = {
                                                    x: Math.round(localPos.x / gap) * gap,
                                                    y: Math.round(localPos.y / gap) * gap,
                                                };
                                                // Convert back to absolute
                                                return stage.getAbsoluteTransform().point(snappedLocal);
                                            }}
                                            onDragEnd={handleDragEnd} onTransformEnd={handleDragEnd}
                                            onClick={e => { e.cancelBubble = true; setSelectedIds(prev => e.evt.shiftKey ? prev.includes(table.id) ? prev.filter(i => i !== table.id) : [...prev, table.id] : [table.id])}}
                                        >
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
                                <Transformer ref={transformerRef} resizeEnabled={false} rotateEnabled={true} rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]} anchorCornerRadius={5} anchorSize={10} borderStroke={C.selected} borderStrokeWidth={2} anchorFill={C.selected} anchorStroke={C.tableFill} />
                            </Layer>
                        </Stage>
                    </div>

                    {/* Visual Scale HUD */}
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
                    topGenomes={ga.topGenomes}
                    renderGene={(studentIdx: number, tableIdx: number) => (
                        <div key={tableIdx} className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${(studentIdx * 137.5) % 360}, 60%, 55%)` }} title={students[studentIdx]?.name} />
                    )}
                />
            </div>
        </div>
    );
}