import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Homework } from '@/types';
import { reqToApi } from "@/lib/utils";
import { SearchableSelect } from './SearchableSelect';

// Define a simple shape for our dropdown items
interface SelectOption {
    id: string;
    label: string;
}

interface HomeworkSelectorProps {
    value: string;
    onChange: (homeworkId: string) => void;
}

export const HomeworkSelect: React.FC<HomeworkSelectorProps> = ({ value, onChange }) => {
    const { data: session } = useSession();
    const [fetchedHomeworks, setFetchedHomeworks] = useState<Homework[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    // 1. Fetch Logic
    useEffect(() => {
        if (session && fetchedHomeworks.length === 0) {
            const fetchActiveHomeworks = async () => {
                setIsFetching(true);
                try {
                    const res = await reqToApi('homeworks', session);
                    if (!res.ok) return; // Add error toast here if needed

                    const allHomeworks: Homework[] = await res.json();

                    // Filter: Not completed and not expired (older than today)
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                    const activeHomeworks = allHomeworks.filter(hw => {
                        const dueDate = new Date(hw.dueDate);
                        return !hw.completed && !(dueDate < startOfToday);
                    });

                    setFetchedHomeworks(activeHomeworks);
                } catch (err) {
                    console.error("Network crash loading homeworks:", err);
                } finally {
                    setIsFetching(false);
                }
            };
            void fetchActiveHomeworks();
        }
    }, [session, fetchedHomeworks.length]);

    // 2. Data Transformation
    // Combine the "None" option with the fetched homeworks into a uniform structure
    const options: SelectOption[] = useMemo(() => {
        const defaultOption: SelectOption = { id: "", label: "None (Global Post)" };

        const homeworkOptions: SelectOption[] = fetchedHomeworks.map(hw => ({
            id: hw._id,
            label: hw.title
        }));

        return [defaultOption, ...homeworkOptions];
    }, [fetchedHomeworks]);

    // 3. Render Generic Component
    return (
        <SearchableSelect<SelectOption, string>
            label="Related Homework (Optional)"
            items={options}
            value={value}
            onChange={onChange}
            isLoading={isFetching}
            // Tell the component how to read our simple object
            getValue={(item) => item.id}
            getLabel={(item) => item.label}
            placeholder={isFetching ? "Loading homework..." : "Search homework or select none..."}
            emptyMessage="No active homework found."
        />
    );
};