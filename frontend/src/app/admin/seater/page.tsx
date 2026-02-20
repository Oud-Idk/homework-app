"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Group, Layer, Line, Rect, Shape, Stage, Text, Transformer } from 'react-konva';
import { useTheme } from 'next-themes';
import { Grip, Maximize, Plus, Trash2 } from 'lucide-react';
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

    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Data Hook (Added relationships here so it doesn't error out below)
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

    // Resize observer (FIX 3: Works in tandem with absolute wrapper below)
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

    // --- Genetic Algorithm Configuration ---
    const calculateFitness = useCallback((genome: number[]) => {
        let totalScore = 0;
        for (let i = 0; i < genome.length; i++) {
            for (let j = i + 1; j < genome.length; j++) {
                if (!seatCoords[i] || !seatCoords[j]) continue;

                const distSq = Math.pow(seatCoords[i].x - seatCoords[j].x, 2) + Math.pow(seatCoords[i].y - seatCoords[j].y, 2);
                if (distSq > 16) continue; // Ignore far interactions

                const w1 = matrix[genome[i]][genome[j]] || 0;
                const w2 = matrix[genome[j]][genome[i]] || 0;
                let affinity = (w1 < 0 || w2 < 0) ? Math.min(w1, w2) * 20 : w1 + w2;

                totalScore += affinity / Math.max(distSq, 0.1);
            }
        }
        return totalScore;
    }, [matrix, seatCoords]);

    const mutate = useCallback((genome: number[], rate: number) => {
        const child = [...genome];
        if (Math.random() < rate) {
            const idxA = Math.floor(Math.random() * child.length);
            const idxB = Math.floor(Math.random() * child.length);
            [child[idxA], child[idxB]] = [child[idxB], child[idxA]]; // Swap to keep uniqueness
        }
        return child;
    }, []);

    const createInitialPop = useCallback((size: number) => {
        const indices = Array.from({ length: peopleCount }, (_, i) => i);
        return Array.from({ length: size }, () => [...indices].sort(() => Math.random() - 0.5));
    }, [peopleCount]);

    const ga = useGeneticAlgorithm({
        popSize, mutationRate, maxInstantGens: 5000, visualDelayMs: 100,
        createInitialPop, calculateFitness, mutate
    });

    // Generate quick assignments map mapping TableIndex -> StudentIndex
    const assignments = useMemo(() => {
        const map: Record<number, number> = {};
        if (ga.bestGenome) ga.bestGenome.forEach((studentIdx, tableIdx) => {
            if (tableIdx < tables.length) map[tableIdx] = studentIdx;
        });
        return map;
    }, [ga.bestGenome, tables.length]);

    // History and Canvas Actions
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
        const newTables = Array.from({ length: count }, (_, i) => ({
            id: `t-${Date.now()}-${i}`,
            x: 1.5 + ((i % 5) * 1.5), y: 1.5 + (Math.floor(i / 5) * 1.5),
            rotation: 0, colliding: false
        }));
        setTables(newTables);
        recordHistory(newTables);
        setSelectedIds([]);
    }

    const resetView = () => stageRef.current?.to({ x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.3 });

    const handleDragEnd = () => {
        const nodes = transformerRef.current.nodes();
        const newTables = tables.map(t => {
            const node = nodes.find((n: any) => n.id() === t.id) || stageRef.current.findOne('#' + t.id);
            return node ? { ...t, x: node.x() / SCALE, y: node.y() / SCALE, rotation: node.rotation() } : t;
        });
        if (JSON.stringify(newTables) !== JSON.stringify(tables)) {
            setTables(newTables);
            recordHistory(newTables);
        }
    };

    // Keep transformer aligned
    useEffect(() => {
        if (!transformerRef.current || !stageRef.current) return;
        transformerRef.current.nodes(selectedIds.map(id => stageRef.current.findOne('#' + id)));
        transformerRef.current.getLayer().batchDraw();
    }, [selectedIds, tables]);

    // Auto-stop optimizer on class change
    const onChangeClass = (id: string) => {
        setCurrentClassId(id);
        ga.stop();
    }

    if (!mounted) return null;

    return (
        <div className="flex flex-row h-full select-none transition-colors duration-200">
            <div className="flex-1 flex flex-col  gap-6 h-full">
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl shadow-sm border transition-colors duration-200">
                    <div className="flex gap-2">
                        <button onClick={addTable} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10"><Plus size={16} /> Table</button>
                        <button onClick={quickFill} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10"><Grip size={16} /> Fill</button>
                        <button onClick={resetView} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium shadow-sm cursor-pointer hover:bg-neutral-500/10"><Maximize size={16} /></button>
                        <button onClick={deleteSelected} disabled={selectedIds.length === 0} className="flex items-center gap-2 text-red-500 border px-3 py-2 rounded-lg disabled:opacity-50 hover:bg-neutral-500/10 cursor-pointer"><Trash2 size={16} /></button>
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

                <div ref={containerRef} className="flex-1 border relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-200">
                    <div className="absolute inset-0">
                        <Stage width={dimensions.width} height={dimensions.height} ref={stageRef} draggable onMouseDown={e => e.target === e.target.getStage() && setSelectedIds([])}>
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

                                        {/* FIX 2: Use table indexes for lines to guarantee absolute uniqueness */}
                                        return <Line key={`line-${tIdx1}-${tIdx2}`} points={[s1.x * SCALE, s1.y * SCALE, s2.x * SCALE, s2.y * SCALE]} stroke={sum > 0 ? C.linePos : C.lineNeg} strokeWidth={Math.max(1, Math.abs(sum) / 100)} dash={sum < 0 ? [5, 5] : undefined} opacity={0.6} listening={false} />
                                    })
                                )}

                                {tables.map((table, tIndex) => {
                                    const sIdx = assignments[tIndex];
                                    const isAssigned = sIdx !== undefined;
                                    const isSelected = selectedIds.includes(table.id);
                                    const displayName = isAssigned ? (students[sIdx]?.name || "Unknown").split(' ')[0] : tIndex.toString();

                                    return (
                                        <Group key={table.id} id={table.id} x={table.x * SCALE} y={table.y * SCALE} rotation={table.rotation} draggable onDragEnd={handleDragEnd} onTransformEnd={handleDragEnd} onClick={e => { e.cancelBubble = true; setSelectedIds(prev => e.evt.shiftKey ? prev.includes(table.id) ? prev.filter(i => i !== table.id) : [...prev, table.id] : [table.id])}}>
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