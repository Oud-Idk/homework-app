import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="flex flex-col items-center p-6 text-center h-full justify-center">

            <div className="max-w-2xl space-y-8">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter italic">
                    404: Not Found
                </h1>

                <div className="space-y-4 text-lg md:text-xl leading-relaxed font-light">
                    <p>
                        It seems you were lost, so you ended up here. Either you mistyped the URL or you are trying to find an easter egg here.
                    </p>
                    <p className="italic text-base opacity-75">
                        If you are here for the latter, [REDACTED].
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link
                        href="/"
                        className="w-full sm:w-auto px-8 py-3 rounded-md border hover:bg-neutral-500/10 transition-all font-medium"
                    >
                        Back to Reality
                        <span className="block text-[10px] uppercase tracking-widest opacity-60">Go do your homework</span>
                    </Link>

                    <Link
                        href="/love"
                        className="w-full sm:w-auto px-8 py-3 rounded-md bg-transparent border border-pink-700 text-pink-700 dark:text-pink-400 hover:bg-pink-500/10 transition-all font-medium"
                    >
                        Embrace the Crisis
                        <span className="block text-[10px] uppercase tracking-widest opacity-60">If you are lonely</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}