"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/components/ui/loader-components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  KeyRound,
  Mail,
  Save,
  ShieldAlert,
  Upload,
  UserRound,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type AuditLog = {
  id: string;
  action: string;
  timestamp: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
};

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 2 * 1024 * 1024;

const apiBaseUrl =
  axiosInstance.defaults.baseURL?.replace(/\/$/, "") || "http://localhost:8080";

const resolveImageUrl = (url?: string) => {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
};

const passwordRules = [
  "At least 8 characters",
  "Uppercase and lowercase letters",
  "One number",
  "One special character",
];

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(user?.emailNotificationsEnabled ?? true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [verificationLink, setVerificationLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const avatarUrl = useMemo(() => resolveImageUrl(user?.avatar), [user?.avatar]);

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        const [profileRes, auditRes] = await Promise.all([
          axiosInstance.get(`/api/profile/${user.id}`),
          axiosInstance.get(`/api/profile/${user.id}/audit-log`),
        ]);
        updateUser(profileRes.data.data);
        setName(profileRes.data.data.name || "");
        setPhone(profileRes.data.data.phone || "");
        setEmailNotificationsEnabled(profileRes.data.data.emailNotificationsEnabled ?? true);
        setAuditLogs(auditRes.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || "Could not load profile");
      }
    };

    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const res = await axiosInstance.get(`/api/profile/verify-email?token=${token}`);
        updateUser(res.data.data);
        router.replace(`/verification-success?token=${token}`);
      } catch (err: any) {
        setError(err.response?.data?.message || "Email verification failed");
      }
    };

    verifyEmail();
  }, [searchParams, router, updateUser]);

  const refreshAuditLog = async () => {
    if (!user?.id) return;
    const res = await axiosInstance.get(`/api/profile/${user.id}/audit-log`);
    setAuditLogs(res.data.data || []);
  };

  const showSuccess = (text: string) => {
    setMessage(text);
    setError("");
  };

  const showError = (text: string) => {
    setError(text);
    setMessage("");
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || isSaving) return;

    setIsSaving(true);
    try {
      const res = await axiosInstance.put(`/api/profile/${user.id}`, { name, phone });
      updateUser(res.data.data);
      await refreshAuditLog();
      showSuccess("Profile updated.");
    } catch (err: any) {
      showError(err.response?.data?.message || "Profile update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!allowedImageTypes.includes(file.type)) {
      showError("Profile image must be jpg, jpeg, png, or webp.");
      return;
    }
    if (file.size > maxImageSize) {
      showError("Profile image must be 2MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axiosInstance.post(`/api/profile/${user.id}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(res.data.data);
      await refreshAuditLog();
      showSuccess("Profile image updated.");
    } catch (err: any) {
      showError(err.response?.data?.message || "Image upload failed");
    } finally {
      event.target.value = "";
    }
  };

  const requestEmailChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || isGeneratingLink) return;

    setIsGeneratingLink(true);
    try {
      const res = await axiosInstance.post(`/api/profile/${user.id}/change-email`, {
        newEmail,
      });
      const token = String(res.data.data.verificationLink).split("token=")[1];
      setVerificationLink(`${window.location.origin}/verification-success?token=${token}`);
      setNewEmail("");
      await refreshAuditLog();
      showSuccess("Verification link generated.");
    } catch (err: any) {
      showError(err.response?.data?.message || "Email change failed");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || isChangingPassword) return;

    if (newPassword !== confirmPassword) {
      showError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await axiosInstance.post(`/api/profile/${user.id}/change-password`, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshAuditLog();
      showSuccess("Password changed.");
    } catch (err: any) {
      showError(err.response?.data?.message || "Password change failed");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateEmailPreference = async () => {
    if (!user?.id || isUpdatingPreferences) return;
    const nextValue = !emailNotificationsEnabled;
    setIsUpdatingPreferences(true);
    try {
      const res = await axiosInstance.put(`/api/notifications/users/${user.id}/email-preferences`, {
        emailNotificationsEnabled: nextValue,
      });
      setEmailNotificationsEnabled(nextValue);
      updateUser(res.data.data);
      showSuccess("Email notification preference updated.");
    } catch (err: any) {
      showError(err.response?.data?.message || "Could not update email notification preference");
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const deactivateAccount = async () => {
    if (!user?.id || isDeactivating) return;
    setIsDeactivating(true);
    try {
      await axiosInstance.post(`/api/profile/${user.id}/deactivate`);
      logout();
      router.push("/login");
    } catch (err: any) {
      showError(err.response?.data?.message || "Account deactivation failed");
      setDeactivateOpen(false);
    } finally {
      setIsDeactivating(false);
    }
  };

  if (!user) {
    return <div className="p-6">User not found</div>;
  }

  return (
    <div className="flex scrollbar-container flex-col bg-[#F4F5F7] p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#172B4D]">Profile Settings</h1>
        <p className="text-[#5E6C84]">Manage your account, security, and contact details</p>
      </div>

      {(message || error) && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-md border p-3 text-sm ${error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
            }`}
        >
          {error ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[40%_60%] pr-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#172B4D]">About You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex flex-col items-center">
                <Avatar className="mb-4 h-24 w-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold text-[#172B4D]">{user.name}</h2>
                <Badge className="mt-2">{user.role}</Badge>
              </div>

              <Label
                htmlFor="profile-image"
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-[#0052CC] text-sm font-semibold text-white hover:bg-[#0747A6]"
              >
                <Camera className="h-4 w-4" />
                Upload image
              </Label>
              <Input
                id="profile-image"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={uploadImage}
              />
              <p className="text-center text-xs text-[#6B778C]">JPG, JPEG, PNG, or WEBP. Max 2MB.</p>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-[#5E6C84]" />
                  <span className="text-[#172B4D]">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <UserRound className="h-4 w-4 text-[#5E6C84]" />
                  <Badge variant="outline">{user.group || "No team"}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-[#172B4D]">Personal Information</CardTitle>
            <CardDescription>Update your name and phone number</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-1 text-[#172B4D]">
                  Full Name
                </Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1 text-[#172B4D]">
                  Phone
                </Label>
                <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div className="flex justify-end">
                <ButtonLoader type="submit" loading={isSaving} className="bg-[#0052CC] text-white hover:bg-[#0747A6] cursor-pointer">
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </ButtonLoader>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-[#172B4D]">Email Verification</CardTitle>
          <CardDescription>Request a verification link before changing your email</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={requestEmailChange} className="space-y-4">
            <Input
              type="email"
              placeholder="new.email@company.com"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              required
            />
            {user.pendingEmail && (
              <p className="text-sm text-[#6B778C]">Pending verification: {user.pendingEmail}</p>
            )}
            {/* {verificationLink && (
              <div className="rounded border border-[#DFE1E6] bg-white p-3 text-sm text-[#172B4D]">
                <p className="mb-2 font-semibold">Verification link</p>
                <a className="break-all text-[#0052CC] hover:underline" href={verificationLink}>
                  {verificationLink}
                </a>
              </div>
            )} */}
            <ButtonLoader type="submit" loading={isGeneratingLink} className="bg-[#0052CC] text-white hover:bg-[#0747A6] cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Generate link
            </ButtonLoader>
          </form>
        </CardContent>
      </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">Change Password</CardTitle>
          <CardDescription>Confirm your current password before setting a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <Input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <div className="grid gap-1 text-xs text-[#6B778C] sm:grid-cols-2">
              {passwordRules.map((rule) => (
                <span key={rule}>{rule}</span>
              ))}
            </div>
            <ButtonLoader type="submit" loading={isChangingPassword} className="bg-[#0052CC] text-white hover:bg-[#0747A6] cursor-pointer">
              <KeyRound className="mr-2 h-4 w-4" />
              Change password
            </ButtonLoader>
          </form>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle className="text-[#172B4D]">Notification Preferences</CardTitle>
              <CardDescription>Control whether in-app notifications are also sent by email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 rounded border border-[#DFE1E6] bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-[#172B4D]">Email notifications</p>
                  <p className="mt-1 text-sm text-[#6B778C]">
                    {emailNotificationsEnabled ? "Enabled for task, sprint, and reminder events." : "Only in-app notifications will be sent."}
                  </p>
                </div>
                <ButtonLoader type="button" variant={emailNotificationsEnabled ? "default" : "outline"} loading={isUpdatingPreferences} onClick={updateEmailPreference}>
                  {emailNotificationsEnabled ? "Enabled" : "Disabled"}
                </ButtonLoader>
              </div>
            </CardContent>
          </Card> */}

          <Card>
        <CardHeader>
          <CardTitle className="text-[#172B4D]">Audit Log</CardTitle>
          <CardDescription>Recent profile and account changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLogs.length === 0 && <p className="text-sm text-[#6B778C]">No profile changes yet.</p>}
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded border border-[#DFE1E6] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#172B4D]">{log.action.replaceAll("_", " ")}</span>
                  <span className="text-xs text-[#6B778C]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Deactivate Account</CardTitle>
          <CardDescription>Deactivate login access while keeping project history intact</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="cursor-pointer" onClick={() => setDeactivateOpen(true)}>
            <ShieldAlert className="mr-2 h-4 w-4" />
            Deactivate account
          </Button>
        </CardContent>
      </Card>


      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate account?</DialogTitle>
            <DialogDescription>
              You will be logged out immediately and future logins will be blocked. Existing issue and project
              history will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <ButtonLoader variant="destructive" className="cursor-pointer" loading={isDeactivating} onClick={deactivateAccount}>
              Deactivate
            </ButtonLoader>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default ProfilePage;
