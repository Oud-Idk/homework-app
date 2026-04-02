// app/utilities/grouper/page.tsx
import clientPromise from '@/lib/mongodb';
import { Classroom } from "@/types";
import {GrouperClient} from "@/components/CoreComponents/People/GrouperClient";
import {Title} from "@/components/EaseOfUse/Title";

export const dynamic = 'force-dynamic';

export default async function GrouperPage() {
    const client = await clientPromise;
    const db = client.db();

    // Fetch classrooms
    const classroomData = await db.collection("classrooms").find({}).toArray();

    // Sanitize for Client Component
    const classrooms: Classroom[] = classroomData.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        students: (c.students || []).map((s: any) => ({
            name: s.name || '',
            // Keep as string for the Grouper
            dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString() : '',
            gender: s.gender || 'male',
        })),
    }));

    return (
        <main>
            <div>
                <Title>Student Grouper</Title>
                <p className="mb-5">
                    Generate balanced teams based on gender or pure randomness.
                </p>
            </div>

            <GrouperClient classrooms={classrooms} />
        </main>
    );
}