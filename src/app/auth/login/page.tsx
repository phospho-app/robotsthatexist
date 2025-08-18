"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github } from "lucide-react";

export default function Login() {
  const { signInWithGitHub } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to robots that exist
          </CardTitle>
          <CardDescription>
            Sign in with GitHub to leave reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={signInWithGitHub} className="w-full" size="lg">
            <Github className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
