'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Classroom, User } from '@/types';
import {
    UserGroupIcon, SparklesIcon, ArrowPathIcon, ExclamationTriangleIcon,
    HeartIcon, LockClosedIcon
} from '@heroicons/react/24/outline';

// Extracted Hooks & Components
import { useClassroomData } from '@/hooks/ai/useClassroomData';
import { useGeneticAlgorithm } from '@/hooks/ai/useGeneticAlgorithm';
import { useGrouper } from "@/hooks/people/useGrouper";
import { useGroupReveal } from "@/hooks/people/useGroupReveal";
import { SearchableSelect } from "@/components/Selector/SearchableSelect";
import { GASettings } from '@/components/GA/GASettings';
import { OptimizationLog } from '@/components/GA/OptimizationLog';
import SubmitButton from "@/components/SubmitButton";

export function GrouperClient({ classrooms }: { classrooms: Classroom[] }) {
    const { data: session, status } = useSession();
    const isAdmin = session?.user?.role === 'admin';

    // State
    const [selectedId, setSelectedId] = useState(classrooms[0]?._id || '');
    const [numGroups, setNumGroups] = useState(4);
    const [strategy, setStrategy] = useState<'random' | 'balanced' | 'relationship'>('random');
    const [isResolving, setIsResolving] = useState(false);
    const divRef = useRef<HTMLDivElement | null>(null);

    // Data Fetching Hook
    const { students, relationships, matrix, isLoadingData } = useClassroomData(selectedId, session, isAdmin);

    // Settings
    const [visMode, setVisMode] = useState<'visual' | 'instant'>('visual');
    const [popSize, setPopSize] = useState(100);
    const [mutationRate, setMutationRate] = useState(0.05);

    // Derived Logic
    const studentsMissingGender = students.filter(s => !s.gender);
    const isBalancedDisabled = studentsMissingGender.length > 0;
    const isRelDisabled = relationships.length === 0;

    useEffect(() => {
        if (isBalancedDisabled && strategy === 'balanced') setStrategy('random');
        if (!isAdmin && strategy === 'relationship') setStrategy('random');
    }, [isBalancedDisabled, strategy, isAdmin]);

    // --- Genetic Algorithm Configuration ---
    const calculateFitness = useCallback((genome: number[]) => {
        let score = 0;
        const groupCounts = new Array(numGroups).fill(0);

        for (let i = 0; i < genome.length; i++) {
            const g1 = genome[i];
            groupCounts[g1]++;

            for (let j = i + 1; j < genome.length; j++) {
                if (g1 === genome[j]) {
                    score += (matrix[i][j] || 0) + (matrix[j][i] || 0);
                }
            }
        }

        const idealSize = students.length / numGroups;
        const variance = groupCounts.reduce((acc, c) => acc + Math.pow(c - idealSize, 2), 0);
        return score - (variance * 50); // Penalize uneven groups
    }, [numGroups, students.length, matrix]);

    const mutate = useCallback((genome: number[], rate: number) => {
        const child = [...genome];
        if (Math.random() < rate) {
            const idx = Math.floor(Math.random() * child.length);
            child[idx] = Math.floor(Math.random() * numGroups);
        }
        return child;
    }, [numGroups]);

    const createInitialPop = useCallback((size: number) => {
        return Array.from({ length: size }, () =>
            Array.from({ length: students.length }, () => Math.floor(Math.random() * numGroups))
        );
    }, [students.length, numGroups]);

    const ga = useGeneticAlgorithm({
        popSize, mutationRate, maxInstantGens: 2000, visualDelayMs: 50,
        createInitialPop, calculateFitness, mutate,
        onComplete: () => setIsResolving(false)
    });

    // --- Standard Hooks ---
    const { finalGroups: standardGroups, generate: generateStandard } = useGrouper(
        students, numGroups, strategy === 'relationship' ? 'random' : strategy
    );
    const { visibleGroups: standardVisible, activeGroupIdx, currentTaunt } = useGroupReveal(
        standardGroups, () => setIsResolving(false)
    );

    // View Map formatting
    const currentBestGroups = useMemo(() => {
        if (ga.bestGenome.length === 0) return [];
        const groups: User[][] = Array.from({ length: numGroups }, () => []);
        ga.bestGenome.forEach((groupId, userIdx) => {
            if (groups[groupId]) groups[groupId].push(students[userIdx]);
        });
        return groups;
    }, [ga.bestGenome, numGroups, students]);

    const displayGroups = strategy === 'relationship'
        ? (currentBestGroups.length > 0 ? currentBestGroups : Array.from({ length: numGroups }, () => []))
        : standardVisible;

    const isBusy = isResolving || ga.isOptimizing;

    const handleGenerate = () => {
        setIsResolving(true);
        if (strategy === 'relationship' && isAdmin) {
            ga.start(visMode);
            if (visMode === 'instant') setTimeout(() => setIsResolving(false), 500);
        } else {
            generateStandard();
        }
    };

    const handleStop = () => {
        ga.stop();
        setIsResolving(false);
    };

    const getGroupColor = (idx: number) => `hsl(${(idx * 137.508) % 360}, 60%, 55%)`;

    return (
        /* Root handles standard 100% width/height of the parent component */
        <div className="flex flex-col md:flex-row gap-6 w-full h-full overflow-hidden">

            {/* Left/Main Column - Handles internal scroll */}
            <div className="flex-1 flex flex-col space-y-5 min-w-0 h-full overflow-y-auto pr-1 md:pr-2">

                {/* TOOLBAR - Wrapped robustly so it stacks inside narrow parents */}
                <div className="flex flex-wrap gap-4 p-4 lg:p-5 border rounded-2xl items-end shrink-0 w-full">

                    <div className="flex-1 min-w-40 shrink-0">
                        <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block">Classroom</label>
                        <SearchableSelect<Classroom, string>
                            items={classrooms}
                            value={selectedId}
                            onChange={(str) => setSelectedId(str)}
                            getLabel={c => c.name}
                            getValue={c => c._id}
                        />
                    </div>

                    <div className="w-20 shrink-0">
                        <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block">Groups</label>
                        <input
                            type="number"
                            value={numGroups}
                            onChange={(e) => setNumGroups(Number(e.target.value))}
                            className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-800 py-1 focus:outline-none text-sm"
                        />
                    </div>

                    <div className="flex-2 min-w-55 flex flex-col justify-end">
                        <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block">Strategy</label>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex flex-wrap border border-neutral-200 dark:border-neutral-800 p-1 rounded-md">
                                <button onClick={() => setStrategy('random')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${strategy === 'random' ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                    Random
                                </button>
                                <button
                                    onClick={() => !isBalancedDisabled && setStrategy('balanced')}
                                    disabled={isBalancedDisabled}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${strategy === 'balanced' ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white' : 'text-neutral-500'} ${isBalancedDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                                >
                                    Balanced
                                </button>
                                <button
                                    onClick={() => isAdmin && setStrategy('relationship')}
                                    disabled={!isAdmin}
                                    title={!isAdmin ? "Requires Admin Role" : ""}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors flex items-center gap-1 ${strategy === 'relationship' ? 'bg-white dark:bg-neutral-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-neutral-500'} ${!isAdmin ? 'opacity-30 cursor-not-allowed' : 'hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                                >
                                    {isAdmin ? <HeartIcon className="w-3 h-3" /> : <LockClosedIcon className="w-3 h-3" />}
                                    Relationship
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full sm:w-auto min-w-25 shrink-0">
                        {!isBusy ? (
                            <SubmitButton onClick={handleGenerate} disabled={isLoadingData || students.length === 0 || status === 'loading'} className='w-full rounded-lg font-semibold text-sm shadow-sm'>Run</SubmitButton>
                        ) : (
                            <SubmitButton onClick={handleStop} className='w-full rounded-lg font-semibold text-sm shadow-sm border-red-500! text-red-500!'>Stop</SubmitButton>
                        )}
                    </div>
                </div>

                {strategy === 'relationship' && isAdmin && (
                    <div className="border p-4 rounded-xl">
                        <GASettings
                            mutationRate={mutationRate} setMutationRate={setMutationRate}
                            popSize={popSize} setPopSize={setPopSize}
                            visMode={visMode} setVisMode={setVisMode}
                            iconStyle="hero"
                        />
                    </div>
                )}

                {isBalancedDisabled && strategy === 'random' && (
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl p-3 flex items-center gap-3 text-xs shrink-0">
                        <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 shrink-0" />
                        <span className="text-orange-800 dark:text-orange-200">
                            Balanced strategy unavailable. Missing genders for <span className="font-semibold">{studentsMissingGender.length}</span> students.
                        </span>
                    </div>
                )}

                {isRelDisabled && strategy === 'relationship' && isAdmin && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-xl p-3 flex items-center gap-3 text-xs shrink-0">
                        <ExclamationTriangleIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                        <span className="text-indigo-800 dark:text-indigo-200">
                            No relationships found. Results will be random. Go to the relationship matrix to add data.
                        </span>
                    </div>
                )}

                <div className="flex-1 w-full pb-6">
                    {/* auto-fit Grid: Automatically determines columns purely based on parent width */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                        {displayGroups.map((group, idx) => {
                            const estimatedHeight = (group?.length || 0) * ((divRef.current?.offsetHeight ?? 20) + 14);

                            return (
                                <div key={idx} className="border rounded-2xl overflow-hidden shadow-sm transition-all duration-500 bg-white dark:bg-neutral-900/30 h-max">
                                    <div className="p-3 lg:p-4 border-b flex justify-between items-center">
                                        <h3 className="font-bold text-sm flex items-center gap-2">
                                            <UserGroupIcon className="w-4 h-4 text-neutral-400" /> Group {idx + 1}
                                        </h3>
                                        <span className="text-[10px] font-bold text-neutral-400">
                                            {(isResolving && strategy !== 'relationship') ? '???' : `${group?.length || 0} Students`}
                                        </span>
                                    </div>
                                    <div className="p-3 lg:p-4 space-y-2 min-h-30" style={{ height: estimatedHeight > 0 ? 'auto' : undefined }}>
                                        {group?.map((user, sIdx) => (
                                            <div
                                                key={user._id || sIdx}
                                                className={`flex items-center justify-between ${strategy === 'relationship' ? 'animate-in fade-in zoom-in-95 duration-200' : 'animate-in fade-in slide-in-from-top-1 duration-300'}`}
                                                ref={divRef}
                                            >
                                                <span className="text-xs lg:text-sm font-medium truncate pr-2">{user.name}</span>
                                                {user.gender && (
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                                        user.gender === 'male' ? 'text-blue-500 border-blue-100 bg-blue-50 dark:bg-blue-900/20' : 'text-pink-500 border-pink-100 bg-pink-50 dark:bg-pink-900/20'
                                                    }`}>{user.gender[0]}</span>
                                                )}
                                            </div>
                                        ))}

                                        {strategy !== 'relationship' && activeGroupIdx === idx && (
                                            <div className="flex items-center gap-2 animate-pulse mt-2">
                                                <span className="text-[11px] font-bold text-neutral-400 italic">{currentTaunt}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {!isBusy && strategy !== 'relationship' && displayGroups.every(g => g.length === 0) && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-3xl h-full flex flex-col items-center justify-center">
                                {isLoadingData ? (
                                    <>
                                        <ArrowPathIcon className="w-8 h-8 animate-spin text-neutral-300 mb-2"/>
                                        <p className="text-neutral-400 text-sm font-medium">Fetching students...</p>
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-8 h-8 mx-auto text-neutral-200 mb-4" />
                                        <p className="text-neutral-400 text-sm font-medium">Ready to group?</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {strategy === 'relationship' && isAdmin && (
                <div className="w-full md:w-80 shrink-0 overflow-y-auto pb-4 custom-scrollbar">
                    <OptimizationLog
                        generation={ga.generation}
                        topGenomes={ga.topGenomes}
                        renderGene={(groupIdx: number, studentIdx: number) => (
                            <div
                                key={studentIdx}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getGroupColor(groupIdx) }}
                                title={`Student: ${students[studentIdx]?.name} -> Group: ${groupIdx + 1}`}
                            />
                        )}
                    />
                </div>
            )}
        </div>
    );
}