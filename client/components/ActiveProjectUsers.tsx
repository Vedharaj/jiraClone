"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const ActiveProjectUsers = () => {
  const { user } = useAuth();
  const [userIds, setUserIds] = useState<string[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      setUserIds(((event as CustomEvent).detail || []) as string[]);
    };
    window.addEventListener("project:active-users", handler);
    return () => window.removeEventListener("project:active-users", handler);
  }, []);

  if (userIds.length === 0) return null;

  return (
    <div className="mx-2 mb-3 rounded border border-[#DFE1E6] bg-white px-3 py-2 text-xs text-[#42526E]">
      <div className="mb-2 flex items-center gap-2 font-semibold text-[#172B4D]">
        <Users className="h-3.5 w-3.5" />
        Active now
      </div>
      <div className="flex flex-wrap gap-1.5">
        {userIds.map((id) => (
          <span key={id} className="rounded-full bg-[#E3FCEF] px-2 py-0.5 text-[#216E4E]">
            {id === user?.id ? "You" : id.slice(0, 6)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ActiveProjectUsers;
