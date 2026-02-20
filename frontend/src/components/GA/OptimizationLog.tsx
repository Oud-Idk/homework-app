export function OptimizationLog({ generation, topGenomes, renderGene }: any) {
    return (
        <div className="border rounded-2xl flex-col shrink-0 overflow-hidden shadow-sm h-full hidden sm:flex">
            <div className="p-4 border-b rounded-t-2xl bg-neutral-50 dark:bg-neutral-950 flex justify-between items-center">
                <h2 className="font-bold text-sm">Optimization Log</h2>
                {generation > 0 && <span className="text-xs bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono">Gen {generation}</span>}
            </div>

            {topGenomes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
                    <p className="text-xs font-medium">Click Generate/Run to start.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <div className="grid grid-cols-[24px_40px_1fr] px-2 py-1 text-[10px] text-neutral-400 font-bold uppercase sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10">
                        <div>#</div><div>Score</div><div>Map</div>
                    </div>
                    {topGenomes.map((data: any, rank: number) => (
                        <div key={rank} className={`grid grid-cols-[24px_40px_1fr] items-center px-2 py-1.5 rounded border text-[10px] font-mono ${rank < 5 ? 'bg-indigo-500/10 border-indigo-500' : ''}`}>
                            <div className="font-bold">{rank + 1}</div>
                            <div className={`font-bold ${data.score > 0 ? 'text-green-600' : 'text-red-500'}`}>{Math.round(data.score)}</div>
                            <div className="flex flex-wrap gap-0.5">
                                {data.genome.slice(0, 15).map((gene: number, gIdx: number) => renderGene(gene, gIdx))}
                                {data.genome.length > 15 && <span>...</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}