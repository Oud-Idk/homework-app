import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Label
} from '@headlessui/react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface MultiSelectProps<T> {
    items: T[];
    selected: T[];
    onChange: (selected: T[]) => void;
    getLabel: (item: T) => string;
    getValue: (item: T) => string | number;
    label?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const SearchableMultiSelect = <T,>({
    items,
    selected,
    onChange,
    getLabel,
    getValue,
    label,
    placeholder = "Select options...",
    className = "w-full",
    disabled = false,
}: MultiSelectProps<T>) => {
    const [query, setQuery] = useState('');

    // Refs for measurement
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // State for layout calculations
    const [layout, setLayout] = useState({ width: 0, marginLeft: 0 });

    const availableItems = useMemo(() => {
        return items.filter(
            (item) => !selected.find((s) => getValue(s) === getValue(item))
        );
    }, [items, selected, getValue]);

    const filteredItems = useMemo(() => {
        return query === ''
            ? availableItems
            : availableItems.filter((item) =>
                getLabel(item).toLowerCase().includes(query.toLowerCase())
            );
    }, [availableItems, query, getLabel]);

    // Measure and update position whenever selected items change or window resizes
    useLayoutEffect(() => {
        const updateLayout = () => {
            if (!containerRef.current || !inputRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const inputRect = inputRef.current.getBoundingClientRect();

            setLayout({
                // Match the dropdown width to the main container
                width: containerRect.width,
                // Shift the dropdown left so it aligns with the container, not the input
                marginLeft: containerRect.left - inputRect.left
            });
        };

        // Run immediately
        updateLayout();

        // Run on resize
        const observer = new ResizeObserver(updateLayout);
        if (containerRef.current) observer.observe(containerRef.current);

        // Cleanup
        return () => observer.disconnect();
    }, [selected]); // Re-run when chips are added/removed (since input moves)

    const handleUnselect = (itemToRemove: T) => {
        onChange(selected.filter((p) => getValue(p) !== getValue(itemToRemove)));
    };

    return (
        <div className={className}>
            <Combobox
                value={selected}
                onChange={onChange}
                multiple
                disabled={disabled}
                onClose={() => setQuery('')}
            >
                {label && (
                    <Label className="block text-sm font-medium mb-1 text-neutral-900 dark:text-neutral-200">
                        {label}
                    </Label>
                )}

                <div className="relative">
                    <div
                        ref={containerRef}
                        className="flex flex-wrap items-center border rounded-md bg-white dark:bg-black min-h-8.5 relative pr-8"
                    >
                        {selected.map((item) => (
                            <span
                                key={getValue(item)}
                                className="flex ml-1 my-1 items-center gap-1 rounded px-2 py-0.5 text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-200"
                            >
                                {getLabel(item)}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnselect(item);
                                    }}
                                    className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}

                        <ComboboxInput
                            ref={inputRef}
                            className="flex-1 min-w-20 bg-transparent border-none py-1 pl-2 text-sm outline-none ring-0 focus:ring-0 dark:text-white"
                            placeholder={selected.length === 0 ? placeholder : ""}
                            displayValue={() => ""}
                            onChange={(event) => setQuery(event.target.value)}
                        />

                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDownIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </ComboboxButton>
                    </div>

                    <ComboboxOptions
                        anchor="bottom start" // Enables automatic flipping/positioning
                        transition
                        // Apply calculated width and offset to align with container
                        style={{
                            width: layout.width,
                            marginLeft: layout.marginLeft
                        }}
                        className="z-50 rounded-md border bg-white text-base shadow-lg sm:text-sm dark:bg-black max-h-60 overflow-auto empty:invisible [--anchor-gap:8px] transition duration-100 ease-in data-closed:opacity-0"
                    >
                        {filteredItems.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-neutral-500">
                                Nothing found.
                            </div>
                        ) : (
                            filteredItems.map((item) => {
                                const itemKey = getValue(item);
                                return (
                                    <ComboboxOption
                                        key={itemKey}
                                        value={item}
                                        className={({ focus }) =>
                                            `relative cursor-default select-none py-2 pl-10 pr-4 outline-none ${
                                                focus ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-900 dark:text-neutral-200'
                                            }`
                                        }
                                    >
                                        {({ selected: isSelected }) => (
                                            <>
                                                <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                                    {getLabel(item)}
                                                </span>
                                                {isSelected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </ComboboxOption>
                                );
                            })
                        )}
                    </ComboboxOptions>
                </div>
            </Combobox>
        </div>
    );
};