import { reqToApi } from "@/lib/utils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SinglePostView } from "./SinglePostView";
import { Post } from "@/types";
import { notFound } from "next/navigation";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function IndividualFeedPage(props: PageProps) {
    const params = await props.params;
    const postId = params.id;
    const session = await getServerSession(authOptions);

    const getPost = async (id: string) => {
        const res = await reqToApi(`posts/${id}`, session);
        if (!res.ok) return null;
        return res.json();
    };

    const data = await getPost(postId);

    const post: Post | null = data?.data || data || null;

    if (!post) {
        return notFound();
    }

    return (
        <main className="min-h-screen">
            <SinglePostView initialPost={post} />
        </main>
    );
}