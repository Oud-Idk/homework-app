import { MarkdownRenderer } from "@/components/Markdown/MarkdownRenderer";
import fs from 'node:fs/promises';
import path from 'node:path';
import { headers } from "next/headers";

function countLinesAfterString(text: string, target: string) {
    const lines = text.split('\n');
    const index = lines.findIndex(line => line.includes(target));

    if (index === -1) return 0;

    return (lines.length - 1) - index;
}

async function sendDiscordNotification() {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return console.error("Webhook URL missing");

    // Grab headers to see who the "intruder" is
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || 'Unknown Toaster';
    const referer = headerList.get('referer') || 'Direct Link/Easter Egg';

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: "Love Bot 💘",
            embeds: [{
                title: "🚨 Love Page Intruder Detected!",
                description: `Someone just found the secret link. Their brain is officially a toaster.`,
                color: 0xff69b4,
                fields: [
                    { name: "Agent", value: userAgent, inline: true },
                    { name: "Source", value: referer, inline: true },
                    { name: "Status", value: "Arousal + Cognitive Labeling in progress...", inline: false }
                ],
                timestamp: new Date().toISOString()
            }]
        })
    }).catch(err => console.error("Webhook failed to narc:", err));
}

export default async function LovePage() {
    void sendDiscordNotification();
    const filePath = path.join(process.cwd(), 'Love.md');
    const content = await fs.readFile(filePath, 'utf8');

    const words = content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(words / 225);
    const citationCount = countLinesAfterString(content, "# References");

    return (
        <div className="relative min-h-screen pb-16">
            <main className="mx-auto px-6 py-10">
                <MarkdownRenderer content={content} />
            </main>

            <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/50 dark:bg-black/50 backdrop-blur-md py-3">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-xs font-jetbrains-mono tracking-widest gap-4 uppercase">
                    <div className="flex gap-6">
                        <span className="flex flex-col">
                            <span className="text-[10px] italic">Word Count</span>
                            <span>{words.toLocaleString()}</span>
                        </span>
                        <span className="flex flex-col">
                            <span className="text-[10px] italic">Time</span>
                            <span>{readingTime} Min</span>
                        </span>
                        <span className="flex flex-col">
                            <span className="text-[10px] italic">Cites</span>
                            <span>{citationCount}</span>
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}