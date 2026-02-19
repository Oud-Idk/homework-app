'use client';

import {useRef, useState} from 'react';
import { Classroom } from '@/types';
import {
    UserGroupIcon,
    SparklesIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import {useGrouper} from "@/hooks/people/useGrouper";
import {useGroupReveal} from "@/hooks/people/useGroupReveal";
import {SearchableSelect} from "@/components/Selector/SearchableSelect";

export function GrouperClient({ classrooms }: { classrooms: Classroom[] }) {
    const [selectedId, setSelectedId] = useState(classrooms[0]?._id || '');
    const [numGroups, setNumGroups] = useState(4);
    const [strategy, setStrategy] = useState<'random' | 'balanced'>('balanced');
    const [isResolving, setIsResolving] = useState(false);
    const divRef = useRef<HTMLDivElement | null>(null);

    const selectedClass = classrooms.find(c => c._id === selectedId);
    const { finalGroups, generate } = useGrouper(
        selectedClass?.students || [],
        numGroups,
        strategy
    );

    const { visibleGroups, activeGroupIdx, currentTaunt } = useGroupReveal(
        finalGroups,
        () => setIsResolving(false)
    );

    const generateGroups = () => {
        setIsResolving(true);
        generate();
    };

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl items-end">
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Classroom</label>
                    <SearchableSelect<Classroom, string>
                        items={classrooms}
                        value={selectedId}
                        onChange={(str) => setSelectedId(str)}
                        getLabel={classroom => classroom.name}
                        getValue={classroom => classroom._id}
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Groups</label>
                    <input
                        type="number"
                        value={numGroups}
                        onChange={(e) => setNumGroups(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-800 py-1 focus:outline-none text-sm"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Strategy</label>
                    <div className="flex border border-neutral-200 dark:border-neutral-800 p-1 rounded-md">
                        <button
                            onClick={() => setStrategy('random')}
                            className={`flex-1 text-[10px] font-bold uppercase py-1 rounded transition-colors ${strategy === 'random' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-500'}`}
                        >
                            Random
                        </button>
                        <button
                            onClick={() => setStrategy('balanced')}
                            className={`flex-1 text-[10px] font-bold uppercase py-1 rounded transition-colors ${strategy === 'balanced' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-500'}`}
                        >
                            Balanced
                        </button>
                    </div>
                </div>

                <button
                    onClick={generateGroups}
                    disabled={isResolving}
                    className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                >
                    {isResolving ? (
                        <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            Revealing...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-4 h-4" />
                            Generate
                        </>
                    )}
                </button>
            </div>

            {/* RESULTS GRID (Original Styling) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {visibleGroups.map((group, idx) => {
                    const finalSize = finalGroups[idx]?.length || 0;
                    const estimatedHeight = finalSize * ((divRef.current?.offsetHeight ?? 20) + 14);

                    return (
                        <div key={idx} className={`border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-500`}>
                            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    <UserGroupIcon className="w-4 h-4 text-neutral-400" />
                                    Group {idx + 1}
                                </h3>
                                <span className="text-[10px] font-bold text-neutral-400">
                                    {isResolving ? '???' : `${group.length} Students`}
                                </span>
                            </div>
                            <div className={`p-4 space-y-3`} style={{ minHeight: `${estimatedHeight}px` }}>
                                {group.map((student, sIdx) => (
                                    <div
                                        key={sIdx}
                                        className="flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-300"
                                        ref={divRef}
                                    >
                                        <span className="text-sm font-medium">{student.name}</span>
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                            student.gender === 'male'
                                                ? 'text-blue-500 border-blue-100'
                                                : 'text-red-400 border-red-100'
                                        }`}>
                                        {student.gender[0]}
                                    </span>
                                    </div>
                                ))}

                                {/* The "Slot Machine" Active Slot with taunts */}
                                {activeGroupIdx === idx && (
                                    <div className="flex items-center gap-2 animate-pulse">
                                        <span className="text-[11px] font-bold text-neutral-400 italic">
                                            {currentTaunt}
                                        </span>
                                    </div>
                                )}

                                {isResolving && activeGroupIdx !== idx && group.length === 0 && (
                                    <div className="h-4 w-1/2 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />
                                )}
                            </div>
                        </div>
                    )
                })}

                {!isResolving && visibleGroups.length === 0 && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-neutral-100 dark:border-neutral-900 rounded-3xl">
                        <SparklesIcon className="w-8 h-8 mx-auto text-neutral-200 mb-4" />
                        <p className="text-neutral-400 text-sm font-medium">Ready to ruin or make someone's day?</p>
                    </div>
                )}
            </div>
        </div>
    );
}