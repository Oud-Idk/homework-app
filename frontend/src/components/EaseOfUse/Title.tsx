import {ReactNode} from "react";

export const Title = ({ children }: { children: ReactNode })=>  {
    return <p className="text-3xl font-semibold">{children}</p>
}