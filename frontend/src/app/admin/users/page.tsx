import { UserManagementTable } from '@/components/UserManagement/UserManagementTable';
import clientPromise from '@/lib/mongodb';
import { Filter } from 'mongodb';
import {Title} from "@/components/EaseOfUse/Title";

export const dynamic = 'force-dynamic';

export interface UserForAdmin {
    _id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    classroomName?: string;
}

const USERS_PER_PAGE = 10;

// Update getUsers to handle pagination and searching
async function getUsers(
    { page = 1, limit = USERS_PER_PAGE, query = '' }: { page?: number; limit?: number; query?: string }
): Promise<{ users: UserForAdmin[], totalCount: number }> {
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection("users");

    const searchFilter = query
        ? {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        }
        : {};

    const totalCount = await usersCollection.countDocuments(searchFilter);
    const skip = (page - 1) * limit;

    const usersData = await usersCollection.aggregate([
        // 1. Filter the users
        { $match: searchFilter },

        // 2. Sort users (important to do before skip/limit)
        { $sort: { name: 1 } },

        // 3. Pagination
        { $skip: skip },
        { $limit: limit },

        // 4. Join with the "classrooms" collection
        {
            $lookup: {
                from: "classrooms",           // The name of the collection to join with
                localField: "classroomId",    // The field in the 'users' collection
                foreignField: "_id",          // The field in the 'classrooms' collection
                as: "classroomInfo"           // The temporary array field to store results
            }
        },

        // 5. Flatten the classroomInfo array (since lookup always returns an array)
        {
            $unwind: {
                path: "$classroomInfo",
                preserveNullAndEmptyArrays: true // Keeps the user even if they don't have a classroom
            }
        },

        // 6. Project only the fields you need
        {
            $project: {
                name: 1,
                email: 1,
                image: 1,
                role: 1,
                classroomId: 1,
                classroomName: "$classroomInfo.name" // Extract the name from the joined object
            }
        }
    ]).toArray();

    const users = usersData.map(user => ({
        ...user,
        _id: user._id.toString(),
        classroomId: user.classroomId?.toString()
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
    if (!searchParams) {
        return;
    }

    const { page, query } = await searchParams;

    const currentPage = Number(page) || 1;
    const searchQuery = query || '';

    const { users, totalCount } = await getUsers({ page: currentPage, query: searchQuery });

    const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

    return (
        <main>
            <Title>Manage Users</Title>
            <p className="mb-8">Promote or demote users to and from the admin role.</p>

            <UserManagementTable
                users={users}
                totalPages={totalPages}
                currentPage={currentPage}
            />
        </main>
    );
}