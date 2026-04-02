import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { reqToApi } from "@/lib/utils";
import { Journal } from "@/types";
import JournalList from "@/components/CoreComponents/Journal/JournalList";
import { Pagination } from "@/components/Pagination";

interface PaginatedJournalsResponse {
    data: Journal[];
    currentPage: number;
    totalPages: number;
    totalJournals: number;
}

async function getInitialData(page: number): Promise<PaginatedJournalsResponse> {
    const session = await getServerSession(authOptions);

    const defaultResponse: PaginatedJournalsResponse = {
        data: [],
        currentPage: 1,
        totalPages: 0,
        totalJournals: 0,
    };

    try {
        const journalRes = await reqToApi(`journal?page=${page}`, session)
        return journalRes.ok ? await journalRes.json() : defaultResponse;
    } catch (error) {
        console.error("Failed to fetch initial page data:", error);
        return defaultResponse;
    }
}

export default async function JournalPage({ searchParams }: {
    searchParams?: { page?: string };
}) {
    const sParams = await searchParams;
    const currentPage = Number(sParams?.page) || 1;
    const { data: initialData, totalPages } = await getInitialData(currentPage);

    return (
        <div>
            <JournalList initialData={initialData} />

            <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
            />
        </div>
    )
}