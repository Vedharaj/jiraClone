"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import axiosInstance from "@/lib/Axiosinstance";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const inProgressTokens = new Set<string>();

const VerificationSuccessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const sessionKey = `verified_token_${token}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey) === "true") {
      setStatus("success");
      setMessage("Your email was successfully verified.");
      return;
    }

    if (inProgressTokens.has(token)) {
      return;
    }
    inProgressTokens.add(token);

    const verifyEmail = async () => {
      try {
        await axiosInstance.get(`/api/profile/verify-email?token=${token}`);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(sessionKey, "true");
        }
        setStatus("success");
        setMessage("Your email was successfully verified.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Email verification failed.");
      } finally {
        inProgressTokens.delete(token);
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {status === "loading"
              ? "Please hold while we confirm your new email address."
              : status === "success"
              ? "Verification complete. You can now continue to your profile."
              : "There was a problem verifying your email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-[#172B4D]">
            <p>{message}</p>
            {status === "success" && (
              <Button className="bg-[#0052CC] text-white hover:bg-[#0747A6]" onClick={() => router.push("/profile")}> 
                Go to profile
              </Button>
            )}
            {status === "error" && (
              <Button variant="outline" onClick={() => router.push("/profile")}> 
                Back to profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationSuccessPage;
