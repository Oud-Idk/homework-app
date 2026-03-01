import React from 'react';
import { Settings2, Zap, Eye, Dna, Users, Repeat } from 'lucide-react'; // Added Repeat icon

export function GASettings({
    mutationRate, setMutationRate,
    popSize, setPopSize,
    visMode, setVisMode,
    maxGenerations, setMaxGenerations // <--- NEW PROPS
}: any) {
    return (
        <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <Settings2 size={16} className="text-neutral-500" />
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Algorithm Settings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Mode Selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Mode</label>
                    <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg">
                        <button
                            onClick={() => setVisMode('visual')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${visMode === 'visual' ? 'bg-white dark:bg-neutral-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            <Eye size={14} /> Visual
                        </button>
                        <button
                            onClick={() => setVisMode('instant')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${visMode === 'instant' ? 'bg-white dark:bg-neutral-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            <Zap size={14} /> Instant
                        </button>
                    </div>
                </div>

                {/* Population Size */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                        <Users size={12} /> Population: <span className="text-neutral-900 dark:text-neutral-100">{popSize}</span>
                    </label>
                    <input
                        type="range" min="50" max="5000" step="50"
                        value={popSize}
                        onChange={(e) => setPopSize(Number(e.target.value))}
                        className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* NEW: Max Generations Input */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                        <Repeat size={12} /> Generations
                    </label>
                    <div className="flex items-center">
                        <input
                            type="number" min="100" max="50000" step="100"
                            value={maxGenerations}
                            onChange={(e) => setMaxGenerations(Number(e.target.value))}
                            disabled={visMode === 'visual'} // Disable for visual mode as it runs infinitely
                            className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 transition-all"
                        />
                    </div>
                </div>

                {/* Mutation Rate */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                        <Dna size={12} /> Mutation: <span className="text-neutral-900 dark:text-neutral-100">{Math.round(mutationRate * 100)}%</span>
                    </label>
                    <input
                        type="range" min="0.05" max="0.8" step="0.05"
                        value={mutationRate}
                        onChange={(e) => setMutationRate(Number(e.target.value))}
                        className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
        </div>
    );
}