"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Plus, Users, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { CardSkeleton } from "@/components/ui/loader-components";
import { EmptyState, ErrorState } from "@/components/ui/feedback-states";
import { useToast } from "@/lib/ToastContext";

const page = () => {
  const router = useRouter();
  const { user, selectedProject, setSelectedProject } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [project, setProject] = useState<any[]>([]);
  const [issuesbyproject, setissuesbyproject] = useState<any>({});
  const [loading, setloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingMap, setDeletingMap] = useState<Record<string, boolean>>({});

  // Custom dialog states
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingMap((prev) => ({ ...prev, [projectId]: true }));
      await axiosInstance.delete(`/api/projects/${projectId}`);
      showSuccessToast("Project deleted successfully");
      
      if (selectedProject?.id === projectId) {
        const remaining = project.filter((p: any) => p.id !== projectId);
        setSelectedProject(remaining.length > 0 ? remaining[0] : null);
      }

      setProject((prev) => prev.filter((p: any) => p.id !== projectId));
      window.dispatchEvent(new CustomEvent("projects:updated"));
    } catch (err: any) {
      console.error("Delete project error:", err);
      showErrorToast("Failed to delete project. Please try again.");
    } finally {
      setDeletingMap((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const fetchproject = async () => {
    try {
      setloading(true);
      setError(null);
      const res = await axiosInstance.get("/api/projects");
      const userproject = res.data?.filter(
        (p: any) => p.ownerId === user?.id || (p.memberIds && p.memberIds.includes(user?.id)),
      );
      setProject(userproject || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load projects. Please verify your connection or server status.");
    } finally {
      setloading(false);
    }
  };

  const fetchissuesforproject = async (projectid: string) => {
    try {
      const res = await axiosInstance.get(`/api/issues/project/${projectid}`);
      setissuesbyproject((prev: any) => ({
        ...prev,
        [projectid]: res.data,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchproject();
  }, [user]);

  useEffect(() => {
    project.forEach((proj: any) => {
      fetchissuesforproject(proj.id);
    });
  }, [project]);

  const redirectproject = () => {
    router.push("/create-project");
  };

  return (
    <div className="flex h-full flex-col p-6 scrollbar-container">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#172B4D] mb-2">Projects</h1>
        <p className="text-[#5E6C84]">Manage and view all your projects</p>
      </div>

      <Button
        className="mb-6 bg-[#0052CC] text-white hover:bg-[#0747A6] w-fit font-medium"
        onClick={redirectproject}
        disabled={loading}
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Project
      </Button>

      {error ? (
        <ErrorState onRetry={fetchproject} isRetrying={loading} message={error} />
      ) : loading ? (
        <CardSkeleton />
      ) : project.length === 0 ? (
        <EmptyState
          type="projects"
          action={{
            label: "Create your first project",
            onClick: redirectproject,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.map((proj: any) => {
            const projectIssues = issuesbyproject[proj.id] || [];

            return (
              <Card
                key={proj.id}
                className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  deletingMap[proj.id] ? "opacity-50 pointer-events-none animate-pulse" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-[#172B4D] break-all mr-2">
                        {proj.name}
                      </CardTitle>
                      <CardDescription>Key: {proj.key}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{proj.key}</Badge>
                      {proj.ownerId === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-[#5E6C84] hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingMap[proj.id]}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setProjectToDelete(proj);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          {deletingMap[proj.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-[#5E6C84]">
                      {proj.description || "No description"}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-[#5E6C84]">
                        <Users className="h-4 w-4" />
                        <span>{proj.memberIds?.length || 0} members</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#5E6C84]">
                        <span>{projectIssues?.length || 0} issues</span>
                      </div>
                    </div>

                    <Link href={`/`} onClick={() => setSelectedProject(proj)}>
                      <Button
                        variant="outline"
                        className="w-full mt-4 text-[#0052CC] border-[#0052CC] hover:bg-[#DEEBFF] bg-transparent font-medium"
                      >
                        View Board
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Custom Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Project"
        description={
          <span>
            Are you sure you want to delete the project <strong>{projectToDelete?.name}</strong>? 
            This will permanently delete the project and all of its associated issues, sprints, and logs. This action cannot be undone.
          </span>
        }
        confirmText="Delete Project"
        cancelText="Cancel"
        loading={projectToDelete ? deletingMap[projectToDelete.id] : false}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={async () => {
          if (projectToDelete) {
            await handleDeleteProject(projectToDelete.id);
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
          }
        }}
        variant="destructive"
      />
    </div>
  );
};

export default page;
