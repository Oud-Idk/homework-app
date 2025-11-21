import { UserManagementTable } from '@/components/UserManagement/UserManagementTable';
import clientPromise from '@/lib/mongodb';
import { Filter } from 'mongodb';

export const dynamic = 'force-dynamic';

export interface UserForAdmin {
    _id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
}

const USERS_PER_PAGE = 10;

// Update getUsers to handle pagination and searching
async function getUsers(
    { page = 1, limit = USERS_PER_PAGE, query = '' }: { page?: number; limit?: number; query?: string }
): Promise<{ users: UserForAdmin[], totalCount: number }> {
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection<UserForAdmin>("users");

    const searchFilter: Filter<UserForAdmin> = query
        ? {
            $or: [
                { name: { $regex: query, $options: 'i' } }, // Case-insensitive search on name
                { email: { $regex: query, $options: 'i' } }, // Case-insensitive search on email
            ],
        }
        : {};

    const totalCount = await usersCollection.countDocuments(searchFilter);

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    const usersData = await usersCollection
        .find(searchFilter)
        .project({ name: 1, email: 1, image: 1, role: 1 })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();

    // Serialize the _id for the client component
    // The `user._id` here is an ObjectId, so .toString() is correct.
    const users = usersData.map(user => ({
        ...user,
        _id: user._id.toString(),
    })) as UserForAdmin[];

    return { users, totalCount };
}

// The page component now accepts searchParams for pagination and search
export default async function ManageUsersPage({
    searchParams,
}: {
    searchParams?: {
        query?: string;
        page?: string;
    };
}) {
    // The admin layout already protects this page.
    if (!searchParams) {
        return;
    }

    const { page, query } = await searchParams;

    const currentPage = Number(page) || 1;
    const searchQuery = query || '';

    const { users, totalCount } = await getUsers({ page: currentPage, query: searchQuery });

    const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

    return (
        <main className="container mx-auto p-2">
            <h1 className="text-4xl font-bold mb-4">Manage Users</h1>
            <p className="mb-8">Promote or demote users to and from the admin role.</p>

            <UserManagementTable
                users={users}
                totalPages={totalPages}
                currentPage={currentPage}
            />
        </main>
    );
}