

"use client";

import {
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Settings,
  Clock3,
  Users,
  Timer,
  X,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { Input } from "./ui/input";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import CreateIssuemodel from "./CreateIssuemodel";
import NotificationBell from "./NotificationBell";
import ActiveProjectUsers from "./ActiveProjectUsers";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";

const apiBaseUrl =
  axiosInstance.defaults.baseURL?.replace(/\/$/, "") || "http://localhost:8080";

const resolveImageUrl = (url?: string) => {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
};

const Sidebar = ({ isOpen = false, onClose = () => {} }: { isOpen?: boolean; onClose?: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, selectedProject, setSelectedProject } = useAuth();
  const avatarUrl = useMemo(() => resolveImageUrl(user?.avatar), [user?.avatar]);
  const [project, setProject] = useState([]);
  const [loading, setloading] = useState(false);
  const [showprojectmenu, setShowprojectmenu] = useState(false);
  const [showcreateissuemodel, setShowcreateissuemodel] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(event.target as Node)
      ) {
        setShowprojectmenu(false);
      }
    };
    if (showprojectmenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showprojectmenu]);

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get("/api/projects");
      const userProjects = res.data.filter(
        (proj: any) =>
          proj.ownerId === user.id || proj.memberIds?.includes(user.id),
      );
      setProject(userProjects);
      if (selectedProject) {
        const stillExists = userProjects.some((p: any) => p.id === selectedProject.id);
        if (!stillExists) {
          setSelectedProject(userProjects.length > 0 ? userProjects[0] : null);
        }
      } else if (userProjects.length > 0) {
        setSelectedProject(userProjects[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  useEffect(() => {
    const handleProjectsUpdate = () => {
      fetchProjects();
    };
    window.addEventListener("projects:updated", handleProjectsUpdate);
    return () => {
      window.removeEventListener("projects:updated", handleProjectsUpdate);
    };
  }, [user, selectedProject]);

  if (loading) {
    return (
      <div className="flex h-screen w-64 items-center justify-center border-r bg-[#F4F5F7]">
        <span className="text-sm text-[#6B778C]">Loading projects…</span>
      </div>
    );
  }

  const redirectproject = () => {
    router.push("/create-project");
  };
  const HandleLogout = () => {
    logout();
    router.push("/login");
  };
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-[#F4F5F7] text-[#42526E] transition-transform duration-200 ease-in-out md:sticky md:top-0 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between gap-2 p-4 pt-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0052CC] text-white">
              <FolderKanban className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#172B4D]">
              Jira Clone
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#EBECF0] md:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5 text-[#42526E]" />
            </button>
          </div>
        </div>

      {/* Project Selector */}
      {selectedProject && (
        <div className="px-2 py-3 border-b" ref={projectMenuRef}>
          <div className="relative">
            <button
              onClick={() => setShowprojectmenu(!showprojectmenu)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded bg-white border border-[#DFE1E6] hover:border-[#0052CC] transition-colors text-sm"
            > 
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="flex-1 text-left truncate font-medium text-[#172B4D]">
                {selectedProject?.name}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showprojectmenu ? "rotate-180" : ""}`}
              />
            </button>
            {showprojectmenu && (
              <div className="absolute top-10 left-2 right-2 bg-white border border-[#DFE1E6] rounded shadow-lg z-50">
                {project.map((project: any) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setShowprojectmenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#EBECF0] text-[#42526E]"
                  >
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    {project.name}
                  </button>
                ))}
                <div className="border-t px-3 py-2">
                  <button
                    onClick={redirectproject}
                    className="w-full text-left text-sm flex items-center gap-2 text-[#0052CC] hover:bg-[#EBECF0] py-1.5 px-1"
                  >
                    <Plus className="h-4 w-4" />
                    Create project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <ActiveProjectUsers />

        <nav className="space-y-1">
          <NavItem
            href="/"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Kanban Board"
            active={pathname === "/"}
          />
          <NavItem
            href="/backlog"
            icon={<ListTodo className="h-4 w-4" />}
            label="Backlog"
            active={pathname === "/backlog" || pathname.startsWith("/backlog/")}
          />
          <NavItem
            href="/sprints"
            icon={<Timer className="h-4 w-4" />}
            label="Sprints"
            active={pathname === "/sprints" || pathname.startsWith("/sprints/")}
          />
          <NavItem
            href="/projects"
            icon={<FolderKanban className="h-4 w-4" />}
            label="Projects"
            active={pathname === "/projects" || pathname.startsWith("/projects/")}
          />
          <NavItem
            href="/team"
            icon={<Users className="h-4 w-4" />}
            label="Team"
            active={pathname === "/team" || pathname.startsWith("/team/")}
          />
          {/* <NavItem
            href="/time-tracking"
            icon={<Clock3 className="h-4 w-4" />}
            label="Time Tracking"
            active={pathname === "/time-tracking" || pathname.startsWith("/time-tracking/")}
          /> */}
        </nav>
      </div>
      <div className="border-t p-4 space-y-3">
        {user && (
          <Link href="/profile">
            <div className="flex items-center gap-2 px-2 py-2 rounded bg-white">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {user?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#172B4D] truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-[#6B778C] truncate">{user?.email}</p>
              </div>
            </div>
          </Link>
        )}
        <Button
          className="w-full justify-start gap-2 bg-[#0052CC] text-white hover:bg-[#0747A6]"
          onClick={() => setShowcreateissuemodel(true)}
        >
          <Plus className="h-4 w-4" />
          Create Issue
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[#42526E] hover:bg-[#EBECF0]"
          onClick={HandleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
      <CreateIssuemodel
        isOpen={showcreateissuemodel}
        onClose={() => setShowcreateissuemodel(false)}
      />
    </div>
    </>
  );
};

export default Sidebar;
function NavItem({ href, icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#DEEBFF] text-[#0052CC]"
          : "hover:bg-[#EBECF0] text-[#42526E]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
