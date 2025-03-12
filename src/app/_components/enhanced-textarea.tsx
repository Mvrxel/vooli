"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedTextareaProps {
  placeholder?: string;
  initialValue?: string;
  onButtonClick?: () => void;
  buttonIcon?: React.ReactNode;
  className?: string;
  rows?: number;
}

export default function EnhancedTextarea({
  placeholder = "What can I find for you?",
  initialValue = "",
  onButtonClick = () => console.log("Button clicked"),
  buttonIcon = <ArrowRight className="h-4 w-4" />,
  className,
  rows = 1,
}: EnhancedTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={cn("relative w-full", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="min-h-[100px] w-full resize-none rounded-[30px] border-none bg-white px-6 py-5 text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none"
      />

      <Button
        type="button"
        onClick={onButtonClick}
        size="icon"
        className="absolute bottom-1 right-3 h-8 w-8 -translate-y-1/2 rounded-xl bg-gray-800 text-white hover:bg-gray-600"
      >
        {buttonIcon}
      </Button>
    </div>
  );
}
