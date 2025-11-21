import React, { useState, Fragment, useEffect } from 'react';
import {
    Combobox,
    ComboboxOptions,
    ComboboxOption,
    ComboboxInput,
    ComboboxButton,
    Label,
    Transition,
} from '@headlessui/react';
import { ChevronsUpDownIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Homework } from '@/types';
import { reqToApi } from "@/lib/utils";

interface HomeworkSelectorProps {
    value: string; // The selected homework ID
    onChange: (homeworkId: string) => void;
}

export const HomeworkSelector: React.FC<HomeworkSelectorProps> = ({ value, onChange }) => {
    const { data: session } = useSession();
    const [availableHomeworks, setAvailableHomeworks] = useState<Homework[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        // Fetch only if the list is empty and we have a session
        if (session && availableHomeworks.length === 0) {
            const fetchActiveHomeworks = async () => {
                setIsFetching(true);
                try {
                    const res = await reqToApi('homeworks', session);
                    if (!res.ok) throw new Error('Failed to fetch homeworks');

                    const allHomeworks: Homework[] = await res.json();
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                    // Filter for homework that is not completed and not past its due date
                    const activeHomeworks = allHomeworks.filter(hw => {
                        const dueDate = new Date(hw.dueDate);
                        return !hw.completed && !(dueDate < startOfToday);
                    });

                    setAvailableHomeworks(activeHomeworks);
                } catch (err) {
                    console.error("Failed to load homeworks for dropdown:", err);
                } finally {
                    setIsFetching(false);
                }
            };

            fetchActiveHomeworks();
        }
    }, [session, availableHomeworks.length]);

    const filteredHomeworks = query === ''
        ? availableHomeworks
        : availableHomeworks.filter((hw) =>
            hw.title.toLowerCase().includes(query.toLowerCase())
        );

    return (
        <div>
            <Combobox value={value} onChange={(value) => onChange(value ?? '')}>
                <Label className="block text-sm font-medium mb-1">Related Homework (Optional)</Label>
                <div className="relative">
                    <ComboboxInput
                        className="w-full px-3 py-2 border rounded-md pr-10"
                        displayValue={(homeworkId: string) =>
                            availableHomeworks.find(hw => hw._id === homeworkId)?.title || ''
                        }
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={isFetching ? 'Loading homework...' : 'Search homework or select none...'}
                        disabled={isFetching}
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronsUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </ComboboxButton>

                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                        <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-black py-1 text-base shadow-lg sm:text-sm z-30 border">
                            <ComboboxOption
                                value=""
                                className={({ focus }) =>
                                    `relative cursor-default select-none py-2 px-4 ${
                                        focus ? 'bg-neutral-200 dark:bg-neutral-800' : 'text-gray-900 dark:text-gray-200'
                                    }`
                                }
                            >
                                None (Global Post)
                            </ComboboxOption>

                            {filteredHomeworks.length === 0 && query !== '' && !isFetching ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-400">
                                    Nothing found.
                                </div>
                            ) : (
                                filteredHomeworks.map((hw) => (
                                    <ComboboxOption
                                        key={hw._id}
                                        value={hw._id}
                                        className={({ focus }) =>
                                            `relative cursor-default select-none py-2 px-4 ${
                                                focus ? 'bg-neutral-200 dark:bg-neutral-800' : 'text-gray-900 dark:text-gray-200'
                                            }`
                                        }
                                    >
                                        {hw.title}
                                    </ComboboxOption>
                                ))
                            )}
                        </ComboboxOptions>
                    </Transition>
                </div>
            </Combobox>
        </div>
    );
};