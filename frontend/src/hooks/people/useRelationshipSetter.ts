import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Methods, reqToApi } from "@/lib/utils";
import { Classroom, User } from "@/types";
// ↓↓↓ Update this import path to where you saved the file provided
import { useNotification } from "@/context/NotificationsContext";

export const RELATIONSHIP_WEIGHTS = {
    INSEPARABLE: 1000,
    GREAT_VIBES: 20,
    GOOD_COMPANY: 5,
    NEUTRAL: 0,
    PREFER_SPACE: -50,
    NUCLEAR: -10000,
};

type RelationshipResponse = {
    _id: string;
    toStudent: string | User;
    weight: number;
    classroom: string;
};

export const useRelationshipSetter = () => {
    const { data: session, update, status } = useSession();
    const { showSuccess, showError } = useNotification(); // <--- Inject Notification Context

    // Classroom & Roster State
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [localClassId, setLocalClassId] = useState<string | null>(null);

    // Relationship State
    const [selectedInseparable, setSelectedInseparable] = useState<User[]>([]);
    const [selectedGreatVibes, setSelectedGreatVibes] = useState<User[]>([]);
    const [selectedGoodCompany, setSelectedGoodCompany] = useState<User[]>([]);
    const [selectedPreferSpace, setSelectedPreferSpace] = useState<User[]>([]);
    const [selectedNuclear, setSelectedNuclear] = useState<User[]>([]);

    // Loading State (SaveStatus is removed in favor of notifications)
    const [isSavingRelationships, setIsSavingRelationships] = useState(false);
    const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);

    const currentClassId = localClassId || session?.user?.classroomId;

    // 1. Fetch Classrooms
    useEffect(() => {
        if (status !== "authenticated") return;
        const fetchClasses = async () => {
            const res = await reqToApi("class");
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        };
        fetchClasses();
    }, [status]);

    // 2. Sync Session Class ID
    useEffect(() => {
        if (session?.user?.classroomId && !localClassId) {
            setLocalClassId(session.user.classroomId);
        }
    }, [session?.user?.classroomId, localClassId]);

    // 3. Fetch Roster
    useEffect(() => {
        if (!currentClassId || status !== "authenticated") return;

        const fetchRoster = async () => {
            const res = await reqToApi(`class/${currentClassId}`);
            if (res.ok) {
                const data: User[] = await res.json();
                const filteredData = data.filter(user => user._id !== session?.user?.id);
                setStudents(filteredData);
            }
        };
        fetchRoster();
    }, [currentClassId, status, session?.user?.id]);

    // 4. Fetch Relationships
    useEffect(() => {
        if (status !== 'authenticated' || !currentClassId) return;

        const fetchClassRelationships = async () => {
            setIsLoadingRelationships(true);

            // Clear selections while loading
            setSelectedInseparable([]);
            setSelectedGreatVibes([]);
            setSelectedGoodCompany([]);
            setSelectedPreferSpace([]);
            setSelectedNuclear([]);

            try {
                const res = await reqToApi(`relationship?classroomId=${currentClassId}`, session, Methods.GET);
                if (!res.ok) throw new Error("Failed to fetch relationships");

                const data: RelationshipResponse[] = await res.json();

                const bins = {
                    inseparable: [] as User[],
                    greatVibes: [] as User[],
                    goodCompany: [] as User[],
                    neutral: [] as User[],
                    preferSpace: [] as User[],
                    nuclear: [] as User[],
                };

                data.forEach((rel) => {
                    const targetId = typeof rel.toStudent === 'string' ? rel.toStudent : rel.toStudent._id;
                    const matchedStudent = students.find(s => s._id === targetId);

                    if (matchedStudent) {
                        switch (rel.weight) {
                            case RELATIONSHIP_WEIGHTS.INSEPARABLE: bins.inseparable.push(matchedStudent); break;
                            case RELATIONSHIP_WEIGHTS.GREAT_VIBES: bins.greatVibes.push(matchedStudent); break;
                            case RELATIONSHIP_WEIGHTS.GOOD_COMPANY: bins.goodCompany.push(matchedStudent); break;
                            case RELATIONSHIP_WEIGHTS.NEUTRAL: bins.neutral.push(matchedStudent); break;
                            case RELATIONSHIP_WEIGHTS.PREFER_SPACE: bins.preferSpace.push(matchedStudent); break;
                            case RELATIONSHIP_WEIGHTS.NUCLEAR: bins.nuclear.push(matchedStudent); break;
                        }
                    }
                });

                setSelectedInseparable(bins.inseparable);
                setSelectedGreatVibes(bins.greatVibes);
                setSelectedGoodCompany(bins.goodCompany);
                setSelectedPreferSpace(bins.preferSpace);
                setSelectedNuclear(bins.nuclear);

            } catch (err) {
                console.error("Error loading relationships:", err);
                showError("Failed to load existing relationships."); // <--- Notify error
            } finally {
                setIsLoadingRelationships(false);
            }
        };

        fetchClassRelationships();
    }, [currentClassId, session, status, students, showError]);


    // 5. Change Classroom Handler
    const onChangeClassroom = async (classroomId: string) => {
        setLocalClassId(classroomId);
        try {
            const res = await reqToApi(`preferences/classroom/${classroomId}`, session, Methods.PATCH);
            if (!res.ok) throw new Error("Failed to update classroom");

            const newIdFromServer = await res.json();
            if (update) {
                await update({
                    ...session,
                    user: { ...session?.user, classroomId: newIdFromServer }
                });
            }
        } catch (e) {
            console.error("Update failed", e);
            setLocalClassId(session?.user?.classroomId || null);
            showError("Failed to switch classroom."); // <--- Notify error
        }
    };

    // 6. Save Handler
    const saveRelationships = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!currentClassId) {
            showError("Please select a classroom first.");
            return;
        }

        setIsSavingRelationships(true);

        try {
            const rawRelationships = [
                ...selectedInseparable.map(u => ({ targetId: u._id, value: RELATIONSHIP_WEIGHTS.INSEPARABLE })),
                ...selectedGreatVibes.map(u => ({ targetId: u._id, value: RELATIONSHIP_WEIGHTS.GREAT_VIBES })),
                ...selectedGoodCompany.map(u => ({ targetId: u._id, value: RELATIONSHIP_WEIGHTS.GOOD_COMPANY })),
                ...selectedPreferSpace.map(u => ({ targetId: u._id, value: RELATIONSHIP_WEIGHTS.PREFER_SPACE })),
                ...selectedNuclear.map(u => ({ targetId: u._id, value: RELATIONSHIP_WEIGHTS.NUCLEAR })),
            ];

            const payload = {
                classroomId: currentClassId,
                relationships: rawRelationships
            };

            const res = await reqToApi('relationship', session, Methods.POST, payload);
            if (!res.ok) throw new Error("Failed to save");

            showSuccess("Relationships saved successfully!"); // <--- Notify Success
        } catch (error) {
            console.error("Error saving relationships:", error);
            showError("Failed to save relationships. Please try again."); // <--- Notify Error
        } finally {
            setIsSavingRelationships(false);
        }
    };

    // 7. Filtering Helper
    const getAvailableStudents = useCallback((currentList: User[]) => {
        const allLists = [
            selectedInseparable, selectedGreatVibes, selectedGoodCompany,
            selectedPreferSpace, selectedNuclear
        ];

        const otherSelectedIds = new Set<string>();
        allLists.forEach(list => {
            if (list === currentList) return;
            list.forEach(u => otherSelectedIds.add(u._id));
        });

        return students.filter(student => !otherSelectedIds.has(student._id));
    }, [students, selectedInseparable, selectedGreatVibes, selectedGoodCompany, selectedPreferSpace, selectedNuclear]);

    return {
        classes,
        currentClassId,
        students,

        selectedInseparable, setSelectedInseparable,
        selectedGreatVibes, setSelectedGreatVibes,
        selectedGoodCompany, setSelectedGoodCompany,
        selectedPreferSpace, setSelectedPreferSpace,
        selectedNuclear, setSelectedNuclear,

        onChangeClassroom,
        saveRelationships,
        getAvailableStudents,

        isLoadingRelationships,
        isSavingRelationships,
    };
};