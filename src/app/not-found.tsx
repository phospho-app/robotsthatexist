"use client";

import Link from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { Bot, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Robot Icon */}
        <div className="mb-8">
          <Bot className="w-24 h-24 text-primary mx-auto mb-4" />
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-bold mb-4">Robot Not Found</h2>
          <p className="text-xl text-muted-foreground mb-6 max-w-md mx-auto">
            Looks like this robot has gone rogue! The page you're looking for doesn't exist in our catalog.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href="/robots">
              <Bot className="w-5 h-5 mr-2" />
              Browse Robots
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Can't find what you're looking for?
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link 
              href="/create" 
              className="text-primary hover:underline"
            >
              Add a Robot
            </Link>
            <span className="text-muted-foreground">•</span>
            <button 
              onClick={() => window.history.back()} 
              className="text-primary hover:underline"
            >
              Go Back
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}