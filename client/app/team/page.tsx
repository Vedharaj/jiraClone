"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Mail, Trash2, UserPlus, Search } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { TableSkeleton } from "@/components/ui/loader-components";
import { EmptyState, ErrorState } from "@/components/ui/feedback-states";

const apiBaseUrl =
  axiosInstance.defaults.baseURL?.replace(/\/$/, "") || "http://localhost:8080";

const resolveImageUrl = (url?: string) => {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
};

import { pageCache } from "@/lib/pageCache";

const TeamPage = () => {
  const { user, selectedProject } = useAuth();
  const cacheKeyMembers = `team_members_${selectedProject?.id || ""}`;

  const [teamMembers, setTeamMembers] = useState<any[]>(() => {
    if (typeof window !== "undefined" && selectedProject?.id) {
      return pageCache.get(cacheKeyMembers) || [];
    }
    return [];
  });
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(() => {
    if (!selectedProject?.id) return false;
    const hasCache = !!pageCache.get(cacheKeyMembers);
    return !hasCache;
  });
  const [error, setError] = useState<string | null>(null);

  // Search/Add member states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!selectedProject?.id) return;
    const cacheKeyMembers = `team_members_${selectedProject.id}`;
    const hasCache = !!pageCache.get(cacheKeyMembers);

    try {
      if (!hasCache) setLoading(true);
      setError(null);
      const res = await axiosInstance.get(`/api/projects/${selectedProject.id}/members`);
      const data = res.data || [];
      setTeamMembers(data);
      pageCache.set(cacheKeyMembers, data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch team members. Please try again.");
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      const cached = pageCache.get(`team_members_${selectedProject.id}`);
      if (cached) {
        setTeamMembers(cached);
        setLoading(false);
      } else {
        setTeamMembers([]);
        setLoading(true);
      }
      fetchMembers();
    } else {
      setTeamMembers([]);
      setLoading(false);
    }
  }, [selectedProject?.id]);

  // Check if current user is owner or manager/admin
  const hasPermission = useMemo(() => {
    if (!selectedProject || !user) return false;
    const isOwner = selectedProject.ownerId === user.id;
    const isManagerOrAdmin = user.role === "PROJECT_MANAGER" || user.role === "ADMIN";
    return isOwner || isManagerOrAdmin;
  }, [selectedProject, user]);

  const handleSearchUsers = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await axiosInstance.get(`/api/users/search?query=${encodeURIComponent(val)}`);
      setSearchResults(res.data || []);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userIdToAdd: string) => {
    if (!selectedProject || !user) return;
    setAddingUser(userIdToAdd);
    setErrorMessage(null);
    try {
      await axiosInstance.post(
        `/api/projects/${selectedProject.id}/members?userId=${userIdToAdd}&actorId=${user.id}`
      );
      setIsAddModalOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      await fetchMembers();
    } catch (error: any) {
      console.error("Add member failed", error);
      setErrorMessage(error.response?.data?.message || "Failed to add member to project.");
    } finally {
      setAddingUser(null);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (!selectedProject || !user) return;
    if (selectedProject.ownerId === memberId) {
      alert("Cannot remove the project owner.");
      return;
    }
    if (!confirm(`Remove ${name} from project?`)) return;
    try {
      setLoading(true);
      await axiosInstance.delete(
        `/api/projects/${selectedProject.id}/members/${memberId}?actorId=${user.id}`
      );
      await fetchMembers();
    } catch (error: any) {
      console.error("Delete member failed", error);
      alert(error.response?.data?.message || "Failed to remove member.");
    } finally {
      setLoading(false);
    }
  };

  const groupMap = new Map<string, any[]>();
  teamMembers.forEach((member: any) => {
    const groupName = member.group || "No group";
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, []);
    }
    groupMap.get(groupName)?.push(member);
  });
  const groups = Array.from(groupMap.keys());
  const filteredMembers = selectedGroup
    ? teamMembers.filter((member: any) => (member.group || "No group") === selectedGroup)
    : teamMembers;

  return (
    <div className="p-4 sm:p-8 min-h-screen lg:h-full flex flex-col bg-[#F4F5F7] relative overflow-y-auto">
      {/* Loader */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
          <p className="text-sm text-[#6B778C]">Updating team…</p>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#172B4D]">Team Management</h1>
          <p className="text-[#5E6C84] text-sm mt-1">
            {teamMembers.length} team members
          </p>
        </div>
        {hasPermission && (
          <Button
            className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
            onClick={() => {
              setErrorMessage(null);
              setIsAddModalOpen(true);
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </header>

      {/* Group Filter */}
      <div className="mb-6 flex flex-wrap gap-2 pb-2">
        <Button
          variant={selectedGroup === null ? "default" : "outline"}
          onClick={() => setSelectedGroup(null)}
          className={selectedGroup === null ? "bg-[#0052CC] text-white" : ""}
        >
          All Members
        </Button>
        {groups.map((group) => (
          <Button
            key={group}
            variant={selectedGroup === group ? "default" : "outline"}
            onClick={() => setSelectedGroup(group)}
            className={selectedGroup === group ? "bg-[#0052CC] text-white" : ""}
          >
            {group}
          </Button>
        ))}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchMembers} isRetrying={loading} message={error} />
      ) : loading && teamMembers.length === 0 ? (
        <TableSkeleton rows={5} cols={hasPermission ? 5 : 4} />
      ) : teamMembers.length === 0 ? (
        <EmptyState type="members" />
      ) : (
        <div className="flex-1 rounded-lg border bg-white overflow-x-auto overflow-y-auto">
          <Table className="min-w-[800px] md:min-w-full">
            <TableHeader className="bg-[#F4F5F7] sticky top-0">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Group</TableHead>
                {hasPermission && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member: any) => {
                  const isOwner = selectedProject?.ownerId === member.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={resolveImageUrl(member.avatar)} />
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {member.name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{member.name}</span>
                            {isOwner && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                Owner
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[#5E6C84]" />
                          {member.email}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={
                            member.role === "ADMIN"
                              ? "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
                              : member.role === "PROJECT_MANAGER"
                              ? "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200"
                          }
                        >
                          {member.role || "USER"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="bg-[#EBECF0]">
                          {member.group || "No group"}
                        </Badge>
                      </TableCell>

                      {hasPermission && (
                        <TableCell>
                          {!isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={hasPermission ? 5 : 4} className="text-center py-8">
                    No members found in this group
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Member Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#172B4D]">
              Add Member to Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#5E6C84]" />
              <Input
                placeholder="Search user by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="pl-9"
              />
            </div>

            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {searching ? (
                <p className="text-center text-sm text-[#6B778C] py-4">Searching...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((user: any) => {
                  const isAlreadyMember = teamMembers.some((m) => m.id === user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between border rounded-md p-2 hover:bg-[#F4F5F7]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={resolveImageUrl(user.avatar)} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {user.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#172B4D] truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-[#6B778C] truncate">{user.email}</p>
                        </div>
                      </div>
                      {isAlreadyMember ? (
                        <span className="text-[10px] font-medium text-[#6B778C] px-2">
                          Member
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-[#0052CC] text-white hover:bg-[#0747A6] text-xs h-7"
                          disabled={addingUser === user.id}
                          onClick={() => handleAddMember(user.id)}
                        >
                          {addingUser === user.id ? "Adding..." : "Add"}
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : searchQuery.trim() ? (
                <p className="text-center text-sm text-[#6B778C] py-4">No users found</p>
              ) : (
                <p className="text-center text-xs text-[#6B778C] py-4">
                  Type name or email to search registered users.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
