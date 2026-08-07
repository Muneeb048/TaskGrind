import type { User, Task, TeamMember } from "@workspace/db";

export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

export function serializeTask(task: Task, assignee: User | null) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status as "todo" | "in_progress" | "done",
    priority: task.priority as "low" | "medium" | "high",
    assignee: assignee ? serializeUser(assignee) : null,
    dueDate: task.dueDate ? new Date(`${task.dueDate}T00:00:00.000Z`) : null,
    createdAt: task.createdAt,
  };
}

export function serializeMember(member: TeamMember) {
  return {
    userId: member.userId ?? member.id,
    name: member.name,
    email: member.email,
    avatar: member.avatar,
    role: member.role as "owner" | "admin" | "member",
    status: member.status as "active" | "invited",
  };
}