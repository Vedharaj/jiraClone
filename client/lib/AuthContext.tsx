"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  group?: string;
  active?: boolean;
  emailVerified?: boolean;
  emailNotificationsEnabled?: boolean;
  pendingEmail?: string;
  createdAt?: any;
  updatedAt?: any;
};
export type Project = {
  id: string;
  name: string;
  key?: string;
  ownerId?: string;
  memberIds?: string[];
  description?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  selectedProject: Project | null;
  setSelectedProject: (Project: Project | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Load user from localStorage on first load (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsHydrated(true);
      return;
    }

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "undefined" && storedUser.length > 0) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser === "object") {
          setUser(parsedUser);
        }
      }

      const storedProject = localStorage.getItem("selectedProject");
      if (storedProject && storedProject !== "undefined" && storedProject.length > 0) {
        const parsedProject = JSON.parse(storedProject);
        if (parsedProject && typeof parsedProject === "object") {
          setSelectedProject(parsedProject);
        }
      }
    } catch (error) {
      console.error("Error loading auth data from localStorage:", error);
      // Clear corrupted data
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("selectedProject");
      } catch (e) {
        // Silently fail if we can't clear
      }
    }
    setIsHydrated(true);
  }, []);

  const login = useCallback((userData: User) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(userData));
    }
  }, []);

  const updateUser = useCallback((userData: User) => {
    login(userData);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  }, []);
  
  const handleSelectProject = (project: Project | null) => {
    setSelectedProject(project);
    if (typeof window !== "undefined") {
      if (project) {
        localStorage.setItem("selectedProject", JSON.stringify(project));
      } else {
        localStorage.removeItem("selectedProject");
      }
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        updateUser,
        logout,
        selectedProject,
        setSelectedProject: handleSelectProject,
      }}
    >
      {isHydrated ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
