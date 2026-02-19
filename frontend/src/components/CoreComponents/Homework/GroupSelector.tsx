import { SearchableSelect } from '@/components/Selector/SearchableSelect'; // adjust import path
import { Group } from "@/types";

interface GroupSelectorProps {
    groups: Group[];
    value: string;
    onChange: (groupId: string) => void;
    isLoading: boolean;
}

export const GroupSelector = ({ groups, value, onChange, isLoading }: GroupSelectorProps) => {
    return (
        <SearchableSelect<Group, string>
            items={groups}
            value={value}
            onChange={onChange}
            isLoading={isLoading}
            // Configuration specific to Groups
            getValue={(group) => group._id}
            getLabel={(group) => group.path}
            placeholder="Search for a group"
            emptyMessage="No matching groups found."
        />
    );
};