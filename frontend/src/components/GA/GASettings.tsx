import { EyeIcon, BoltIcon } from '@heroicons/react/24/outline';

export function GASettings({
    mutationRate, setMutationRate,
    popSize, setPopSize,
    visMode, setVisMode
}: any) {
    return (
        <div className="flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center border p-1 rounded-md">
                <button onClick={() => setVisMode('visual')} className={`p-1.5 rounded-md ${visMode === 'visual' ? 'border shadow text-indigo-500' : 'text-neutral-400'}`}><EyeIcon className="w-4 h-4" /></button>
                <button onClick={() => setVisMode('instant')} className={`p-1.5 rounded-md ${visMode === 'instant' ? 'border shadow text-amber-500' : 'text-neutral-400'}`}><BoltIcon className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-1 w-24">
                <div className="flex justify-between text-[9px] text-neutral-500 font-bold uppercase">
                    <span>Mutate</span> <span>{Math.round(mutationRate * 100)}%</span>
                </div>
                <input type="range" min="0.01" max="1.0" step="0.01" value={mutationRate} onChange={e => setMutationRate(parseFloat(e.target.value))} className="h-1.5 rounded-lg appearance-none cursor-pointer border" />
            </div>
            <div className="flex flex-col gap-1 w-24">
                <div className="flex justify-between text-[9px] text-neutral-500 font-bold uppercase">
                    <span>Pop</span> <span>{popSize}</span>
                </div>
                <input type="range" min="10" max="5000" step="10" value={popSize} onChange={e => setPopSize(parseInt(e.target.value))} className="h-1.5 rounded-lg appearance-none cursor-pointer border" />
            </div>
        </div>
    );
}