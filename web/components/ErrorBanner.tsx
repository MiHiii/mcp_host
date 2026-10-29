import React from "react";
import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 my-2">
      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
      <span className="font-sans leading-normal">{message}</span>
    </div>
  );
}