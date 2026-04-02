import Link from "next/link";

export default async function UnauthorizedPage() {
    return <div className="flex justify-center items-center h-full flex-col">
        <p className="text-2xl">Your account must be using <code className="font-jetbrains-mono">@sekolahbim.sch.id</code>. Please try signing in again.</p>
        <Link href="/love" className="text-2xl text-pink-500 hover:underline">Perhaps you can visit me?</Link>
    </div>
}