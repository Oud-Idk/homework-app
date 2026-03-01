// components/GA/OptimizationLog.tsx
export function OptimizationLog({ generation, connections }: any) {
    const { positives = [], negatives = [] } = connections || {};

    return (
        <div className="border rounded-2xl flex-col shrink-0 overflow-hidden shadow-sm h-full hidden sm:flex w-64 lg:w-72 transition-colors duration-200">
            <div className="p-4 border-b rounded-t-2xl bg-neutral-50 dark:bg-neutral-950 flex justify-between items-center transition-colors">
                <h2 className="font-bold text-sm">Score Analysis</h2>
                {generation > 0 && <span className="text-xs bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono">Gen {generation}</span>}
            </div>

            {positives.length === 0 && negatives.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
                    <p className="text-xs font-medium text-center">Assign students to see relationship impacts.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-6">
                    {/* Top Contributing (Positives) */}
                    {positives.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-500 sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10 py-1">
                                Top Contributing
                            </div>
                            <div className="space-y-1.5">
                                {positives.map((c: any, idx: number) => (
                                    <div key={`pos-${idx}`} className="flex justify-between items-center p-2 rounded-lg border bg-green-500/10 border-green-500/30 text-xs">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="font-semibold truncate">{c.nameA}</span>
                                            <span className="text-neutral-500 dark:text-neutral-400 text-[10px] flex items-center gap-1 truncate">
                                                <span className="text-green-600/50">↔</span> {c.nameB}
                                            </span>
                                        </div>
                                        <span className="font-mono text-green-600 dark:text-green-400 font-bold shrink-0">
                                            +{c.score.toFixed(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Most Damaging (Negatives) */}
                    {negatives.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-500 sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10 py-1">
                                Most Damaging
                            </div>
                            <div className="space-y-1.5">
                                {negatives.map((c: any, idx: number) => (
                                    <div key={`neg-${idx}`} className="flex justify-between items-center p-2 rounded-lg border bg-red-500/10 border-red-500/30 text-xs">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="font-semibold truncate">{c.nameA}</span>
                                            <span className="text-neutral-500 dark:text-neutral-400 text-[10px] flex items-center gap-1 truncate">
                                                <span className="text-red-600/50">↔</span> {c.nameB}
                                            </span>
                                        </div>
                                        <span className="font-mono text-red-600 dark:text-red-400 font-bold shrink-0">
                                            {c.score.toFixed(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}