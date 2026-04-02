import { PostFeed } from "@/components/CoreComponents/Feed/PostFeed";
import { Suspense } from "react";

export default function FeedsPage() {
    return (
        <Suspense fallback={<>...</>}>
            <PostFeed />
        </Suspense>
    )
}