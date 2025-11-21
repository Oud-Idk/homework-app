import { Fragment, useState } from 'react';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Transition
} from '@headlessui/react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'; // Using lucide-react for consistency
import { Group } from "@/types";

interface GroupSelectorProps {
    groups: Group[];
    value: string; // Changed from selectedGroupId for consistency with input components
    onChange: (groupId: string) => void;
    isLoading: boolean;
}

export const GroupSelector = ({ groups, value, onChange, isLoading }: GroupSelectorProps) => {
    const [query, setQuery] = useState('');

    const filteredGroups = query === ''
        ? groups
        : groups.filter(group =>
            group.path.toLowerCase().includes(query.toLowerCase())
        );

    return (
        <Combobox value={value} onChange={(newValue) => onChange(newValue ?? '')} disabled={isLoading}>
            <div className="relative">
                <ComboboxInput
                    className="relative w-full cursor-default text-left p-2 pr-10 border rounded-md bg-white dark:bg-neutral-900 dark:text-white dark:border-neutral-600 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed dark:disabled:bg-neutral-700/50"
                    displayValue={(groupId: string) =>
                        groups.find(g => g._id === groupId)?.path || ''
                    }
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={isLoading ? "Loading groups..." : "Search for a group"}
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDownIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                </ComboboxButton>

                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery('')}
                >
                    <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 text-base shadow-lg focus:outline-none sm:text-sm dark:bg-neutral-800 dark:border-neutral-700">
                        {isLoading ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-neutral-700 dark:text-neutral-400">
                                Loading...
                            </div>
                        ) : filteredGroups.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-neutral-700 dark:text-neutral-400">
                                No matching groups found.
                            </div>
                        ) : (
                            filteredGroups.map((group) => (
                                <ComboboxOption
                                    key={group._id}
                                    value={group._id}
                                    className={({ focus }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            focus ? 'bg-neutral-100 dark:bg-neutral-700' : 'text-neutral-900 dark:text-neutral-200'
                                        }`
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                {group.path}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-500">
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>
                </Transition>
            </div>
        </Combobox>
    );
};