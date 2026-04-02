import clientPromise from '@/lib/mongodb';
import { Classroom } from "@/types";
import { ClassesExplorer } from "@/components/CoreComponents/People/ClassesExplorer";
import {Title} from "@/components/EaseOfUse/Title";

export const dynamic = 'force-dynamic';

export default async function ManageClassesPage() {
    const client = await clientPromise;
    const db = client.db();

    // Fetch raw data
    const classroomData = await db.collection("classrooms").find({}).sort({ path: 1 }).toArray();

    // Sanitize data: Convert _ids and Dates to strings
    const classrooms: Classroom[] = classroomData.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        students: (c.students || []).map((s: any) => ({
            name: s.name || '',
            dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString() : '',
            gender: s.gender || 'other',
        })),
    }));

    return (
        <main className="mx-auto">
            <Title>Manage Classes</Title>
            <p className="mb-8">As an admin, you can view, create, and manage classes here.</p>

            <ClassesExplorer initialClassrooms={classrooms} />
        </main>
    );
}