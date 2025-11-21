import { AddHomeworkForm } from "@/components/Forms/AddHomeworkForm";
import { Homework, Group } from "@/types";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HomeworkList } from "@/components/CoreComponents/Homework/HomeworkList";
import { reqToApi } from "@/lib/utils";
import { Session } from "next-auth";

async function getInitialData(session: Session | null): Promise<{ homeworks: Homework[]; groups: Group[] }> {
    try {
        const [homeworkRes, groupRes] = await Promise.all([
            reqToApi('homeworks', session),
            reqToApi('groups', session),
        ]);

        const homeworks = homeworkRes.ok ? await homeworkRes.json() : [];
        const groups = groupRes.ok ? await groupRes.json() : [];

        return { homeworks, groups };
    } catch (error) {
        console.error("Failed to fetch initial page data:", error);
        return { homeworks: [], groups: [] };
    }
}

export default async function HomeworkPage() {
    const session = await getServerSession(authOptions);

    const { homeworks: initialHomeworks, groups: initialGroups } = await getInitialData(session);
    return (
        <main className="container mx-auto p-2">
            <header className="mb-8">
                <h1 className="text-4xl font-bold">Homework Tracker</h1>
            </header>
            {session && (
                <AddHomeworkForm />
            )}
            <HomeworkList initialHomeworks={initialHomeworks} initialGroups={initialGroups} />
        </main>
    );
}