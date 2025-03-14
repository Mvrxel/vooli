"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedTextareaProps {
  placeholder?: string;
  initialValue?: string;
  onButtonClick?: () => void;
  onValueChange?: (value: string) => void;
  buttonIcon?: React.ReactNode;
  className?: string;
  rows?: number;
  isDisabled?: boolean;
}

export default function EnhancedTextarea({
  placeholder = "What can I find for you?",
  initialValue = "",
  onButtonClick = () => console.log("Button clicked"),
  onValueChange,
  buttonIcon = <ArrowRight className="h-4 w-4" />,
  className,
  rows = 1,
  isDisabled = false,
}: EnhancedTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update internal state when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onButtonClick();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={isDisabled}
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
