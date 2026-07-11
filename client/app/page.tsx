import KanbanBoard from "@/components/KanbanBoard";
import { AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { ChevronRight, MoreHorizontal, Share2 } from "lucide-react";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex h-full flex-col p-4 sm:p-6 overflow-hidden">
      <div className="mb-6 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#172B4D]">
            Kanban Board
          </h1>
          {/* <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div> */}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-0">
        <Suspense fallback={<div>Loading board...</div>}>
          <KanbanBoard />
        </Suspense>
      </div>
    </div>
  );
}
