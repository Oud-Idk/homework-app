import { useState, useMemo } from 'react';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Label
} from '@headlessui/react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

interface SearchableSelectProps<T, V extends string | number> {
    items: T[];
    value: V | null | undefined;
    onChange: (value: V) => void;
    getLabel: (item: T) => string;
    getValue: (item: T) => V;
    label?: string;
    isLoading?: boolean;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
}

export const SearchableSelect = <T, V extends string | number>({
    items,
    value,
    onChange,
    getLabel,
    getValue,
    label,
    isLoading = false,
    placeholder = "Search...",
    emptyMessage = "No matching options found.",
    disabled = false
}: SearchableSelectProps<T, V>) => {
    const [query, setQuery] = useState('');

    const filteredItems = useMemo(() => {
        return query === ''
            ? items
            : items.filter((item) =>
                getLabel(item).toLowerCase().includes(query.toLowerCase())
            );
    }, [items, query, getLabel]);

    const selectedItem = useMemo(() =>
            items.find(item => getValue(item) === value),
        [items, value, getValue]);

    const isDisabled = isLoading || disabled;

    return (
        <Combobox
            value={value}
            onChange={(val) => val !== null && onChange(val)}
            disabled={isDisabled}
            onClose={() => setQuery('')}
        >
            {label && (
                <Label className="block text-sm font-medium mb-1 text-neutral-900 dark:text-neutral-200">
                    {label}
                </Label>
            )}
            <div className="relative">
                <ComboboxInput
                    className="w-full px-3 py-2 border rounded-md pr-10 disabled:bg-neutral-50 disabled:text-neutral-400"
                    displayValue={() => selectedItem ? getLabel(selectedItem) : ''}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={isLoading ? "Loading..." : placeholder}
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDownIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                </ComboboxButton>

                <ComboboxOptions
                    anchor="bottom"
                    transition
                    className="w-(--input-width) z-50 rounded-md border bg-white py-1 text-base shadow-lg sm:text-sm dark:bg-black dark:border-neutral-700 max-h-60 overflow-auto empty:invisible [--anchor-gap:4px] transition duration-100 ease-in data-closed:opacity-0"
                >
                    {isLoading ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-neutral-700 dark:text-neutral-400">
                            Loading...
                        </div>
                    ) : filteredItems.length === 0 && query !== '' ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-neutral-700 dark:text-neutral-400">
                            {emptyMessage}
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const itemKey = getValue(item);
                            const isSelected = itemKey === value;
                            return (
                                <ComboboxOption
                                    key={itemKey}
                                    value={itemKey}
                                    className={({ focus }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            focus ? 'bg-neutral-100 dark:bg-neutral-800' : 'text-neutral-900 dark:text-neutral-200'
                                        }`
                                    }
                                >
                                    <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                        {getLabel(item)}
                                    </span>
                                    {isSelected ? (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-500">
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                    ) : null}
                                </ComboboxOption>
                            );
                        })
                    )}
                </ComboboxOptions>
            </div>
        </Combobox>
    );
};