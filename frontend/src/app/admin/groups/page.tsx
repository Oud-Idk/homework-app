import clientPromise from '@/lib/mongodb';
import { Group } from "@/types";
import { GroupExplorer } from '@/components/CoreComponents/Groups/GroupExplorer'; // We will create this component

export const dynamic = 'force-dynamic';

export default async function ManageGroupsPage() {
    const client = await clientPromise;
    const db = client.db();
    const groupsData = await db.collection("groups").find({}).sort({ path: 1 }).toArray();

    const groups: Group[] = groupsData.map(group => ({
        _id: group._id.toString(),
        name: group.name,
        path: group.path,
        parent: group.parent ? group.parent.toString() : null,
    }));

    return (
        <main className="container mx-auto p-4 md:p-8">
            <h1 className="text-4xl font-bold mb-4">Manage Groups</h1>
            <p className="mb-8">As an admin, you can view, create, and manage groups here.</p>

            {/* The new explorer component will handle the layout */}
            <GroupExplorer initialGroups={groups} />
        </main>
    );
}