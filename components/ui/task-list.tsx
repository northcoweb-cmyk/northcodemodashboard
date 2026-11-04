"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type TaskItem = {
  id: string;
  title: string;
  badge: { text: string; color: string };
  date?: string;
  /** Crew assigned to the job. Rendered as initials, since people don't have photos. */
  avatars?: { name: string; color: string }[];
  done?: boolean;
};

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const TaskLists = ({ title = "Task List", tasks, onToggle, className }: { title?: string; tasks: TaskItem[]; onToggle?: (id: string, done: boolean) => void; className?: string }) => {
  return (
    <Card className={cn("pb-4 p-0", className)}>
      <h3 className="text-lg font-semibold text-foreground p-7">{title}</h3>

      <div className="flex flex-col gap-6 px-7 pb-6">
        {tasks.map((task) => (
          <div key={task.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Checkbox id={`task-${task.id}`} checked={!!task.done} onCheckedChange={(v) => onToggle?.(task.id, v === true)} />
              <label htmlFor={`task-${task.id}`} className={cn("flex-1 cursor-pointer text-sm font-medium", task.done && "text-muted-foreground line-through")}>
                {task.title}
              </label>
              <Badge className={cn(task.badge.color)}>{task.badge.text}</Badge>
            </div>

            <div className="pl-7 flex items-center gap-2">
              {task.date && <p className="text-xs text-muted-foreground">{task.date}</p>}
              {task.avatars && (
                <div className="flex -space-x-2">
                  {task.avatars.map((a) => (
                    <span key={a.name} title={a.name} className="flex size-[30px] items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white" style={{ background: a.color }}>{initials(a.name)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TaskLists;
