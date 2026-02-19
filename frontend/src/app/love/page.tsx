import { MarkdownRenderer } from "@/components/Markdown/MarkdownRenderer";
import fs from 'node:fs/promises';
import path from 'node:path';

export default async function LovePage() {
    const filePath = path.join(process.cwd(), 'Love.md');
    const content = await fs.readFile(filePath, 'utf8');

    const words = content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(words / 225);
    const citationCount = (content.match(/\(\w+ et al\., \d{4}\)|\(\w+, \d{4}\)/g) || []).length;

    return (
        <div className="relative min-h-screen pb-16">
            <main className="max-w-4xl mx-auto px-6 py-10">
                <MarkdownRenderer content={content} />
            </main>

            <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/50 dark:bg-black/50 backdrop-blur-md py-3">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-xs font-jetbrains-mono tracking-widest uppercase">
                    <div className="flex gap-6">
                        <span className="flex flex-col">
                            <span className="text-[10px] italic">Complexity</span>
                            <span>{words.toLocaleString()} Words</span>
                        </span>
                        <span className="flex flex-col">
                            <span className="text-[10px] italic">Investment</span>
                            <span>{readingTime} Min Read</span>
                        </span>
                        <span className="flex flex-col">
                            <span className="text-[10px] italic">Credibility</span>
                            <span>{citationCount} Sources</span>
                        </span>
                    </div>
                    <div className="text-pink-500 animate-pulse">
                        ❤️ SYSTEM_READY
                    </div>
                </div>
            </footer>
        </div>
    );
}