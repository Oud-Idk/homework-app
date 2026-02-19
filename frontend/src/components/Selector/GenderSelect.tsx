import { Fragment } from 'react'
import {Listbox, ListboxButton, Transition} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid' // Ensure you have heroicons installed or use text

const genders = [
    { id: 'male', name: 'Male' },
    { id: 'female', name: 'Female' },
    { id: 'other', name: 'Other' },
]

export default function GenderSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const selectedGender = genders.find(g => g.id === value) || genders[0];

    return (
        <div className="w-full">
            <Listbox value={selectedGender.id} onChange={onChange}>
                <div className="relative mt-1">
                    <ListboxButton className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md
            focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75
            focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm border dark:bg-zinc-800 dark:border-zinc-700">
                        <span className="block truncate">{selectedGender.name}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </span>
                    </ListboxButton>

                    {/* THE OPTIONS: Animated and styled perfectly */}
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 dark:bg-zinc-800">
                            {genders.map((person) => (
                                <Listbox.Option
                                    key={person.id}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            active ? 'bg-amber-100 text-amber-900 dark:bg-blue-900/30 dark:text-blue-100' : 'text-neutral-900 dark:text-zinc-200'
                                        }`
                                    }
                                    value={person.id}
                                >
                                    {({ selected }) => (
                                        <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {person.name}
                      </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600 dark:text-blue-400">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    )
}