import { useState, useEffect, useCallback } from 'react';
import { User, Relationship } from '@/types';
import { reqToApi } from '@/lib/utils';

export function useClassroomData(classId: string | null, session: any, isAdmin: boolean) {
    const [students, setStudents] = useState<User[]>([]);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [matrix, setMatrix] = useState<number[][]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const buildMatrix = useCallback((users: User[], rels: Relationship[]) => {
        const n = users.length;
        const mat = Array(n).fill(null).map(() => Array(n).fill(0));
        const idMap: Record<string, number> = {};
        users.forEach((u, i) => { idMap[u._id] = i; });

        rels.forEach(r => {
            const from = idMap[r.fromStudent._id];
            const to = idMap[r.toStudent._id];
            if (from !== undefined && to !== undefined) {
                mat[from][to] = r.weight;
            }
        });
        setMatrix(mat);
    }, []);

    useEffect(() => {
        if (!classId) return;

        const fetchData = async () => {
            setIsLoadingData(true);
            setStudents([]);
            setRelationships([]);

            try {
                const studRes = await reqToApi(`class/${classId}`, null);
                let loadedStudents = await studRes.json();

                // Handle possible wrapper object
                if (loadedStudents?.students) loadedStudents = loadedStudents.students;
                if (Array.isArray(loadedStudents)) setStudents(loadedStudents);

                if (isAdmin && session) {
                    const relRes = await reqToApi(`relationship/class/${classId}`, session);
                    if (relRes.ok) {
                        const loadedRels = await relRes.json();
                        setRelationships(loadedRels);
                        buildMatrix(loadedStudents, loadedRels);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [classId, session, isAdmin, buildMatrix]);

    return { students, relationships, matrix, isLoadingData };
}