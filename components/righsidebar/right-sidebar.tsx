import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MemberRole } from "@/lib/generated/prisma/client";
import { ScrollArea } from "../ui/scroll-area";
import { Crown, Shield, Users, DiamondPlus } from "lucide-react";
import { MemberItem } from "./member-item";

interface ServerSidebarProps {
  serverId: string;
}

const roleConfig = {
  [MemberRole.ADMIN]: {
    label: "Admin",
    icon: Crown,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
  },
  [MemberRole.MODERATOR]: {
    label: "Moderator", 
    icon: Shield,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
  },
  [MemberRole.GUEST]: {
    label: "Member",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
};

export const ShowMemberChannel = async ({ serverId }: ServerSidebarProps) => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  const server = await db.server.findUnique({
    where: { id: serverId },
    include: {
      members: {
        include: { 
          profile: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              isPremium: true,
              status: true,
            }
          } 
        },
        orderBy: { role: "asc" },
      },
    },
  });

  if (!server) {
    return redirect("/");
  }

  const role = server.members.find((m) => m.profileId === profile.id)?.role;

  // Tách members theo vai trò
  const admins = server.members.filter((m) => m.role === MemberRole.ADMIN);
  const moderators = server.members.filter((m) => m.role === MemberRole.MODERATOR);
  const guests = server.members.filter((m) => m.role === MemberRole.GUEST);

  const renderSection = (
    members: typeof server.members,
    roleType: MemberRole
  ) => {
    if (!members.length) return null;
    
    const config = roleConfig[roleType];
    const Icon = config.icon;

    return (
      <div className="mb-4">
        {/* Section Header */}
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${config.bgColor} border ${config.borderColor} mb-2`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
            {members.length}
          </span>
        </div>
        
        {/* Members List */}
        <div className="space-y-0.5">
          {members.map((member) => (
            <MemberItem 
              key={member.id}
              member={member}
              server={server}
              roleType={roleType}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Members
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {server.members.length} total
        </p>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1 px-2 py-3">
        {renderSection(admins, MemberRole.ADMIN)}
        {renderSection(moderators, MemberRole.MODERATOR)}
        {renderSection(guests, MemberRole.GUEST)}
      </ScrollArea>
    </div>
  );
};
