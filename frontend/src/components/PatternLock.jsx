import React, { useState } from "react";
import { cn } from "../lib/utils";

/**
 * PatternLock Component - Visual pattern input for Android unlock patterns
 * Allows both drawing patterns and manual text input
 */
export default function PatternLock({ value, onChange, className }) {
  const [pattern, setPattern] = useState(value ? value.split("-").map(Number) : []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Standard Android 3x3 grid positions
  const dots = [
    { id: 1, row: 0, col: 0 },
    { id: 2, row: 0, col: 1 },
    { id: 3, row: 0, col: 2 },
    { id: 4, row: 1, col: 0 },
    { id: 5, row: 1, col: 1 },
    { id: 6, row: 1, col: 2 },
    { id: 7, row: 2, col: 0 },
    { id: 8, row: 2, col: 1 },
    { id: 9, row: 2, col: 2 },
  ];

  const handleDotClick = (id) => {
    if (pattern.includes(id)) return;
    
    const newPattern = [...pattern, id];
    setPattern(newPattern);
    const patternString = newPattern.join("-");
    onChange(patternString);
  };

  const handleClear = () => {
    setPattern([]);
    onChange("");
  };

  const handleMouseEnter = (id, e) => {
    if (isDrawing && !pattern.includes(id)) {
      handleDotClick(id);
    }
  };

  const getPatternDescription = (patternArray) => {
    if (patternArray.length === 0) return "No pattern set";
    if (patternArray.length < 4) return "Pattern too short (min 4 dots)";
    return `Pattern: ${patternArray.join(" → ")}`;
  };

  return (
    <div className={cn("space-y-3", className)} data-testid="pattern-lock">
      {/* Toggle between grid and text */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {showGrid ? "Draw or tap dots" : "Enter pattern manually"}
        </span>
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className="text-xs text-primary hover:underline"
        >
          {showGrid ? "Use text input" : "Use visual grid"}
        </button>
      </div>

      {showGrid ? (
        <>
          {/* Visual Grid */}
          <div 
            className="relative w-40 h-40 mx-auto bg-muted/50 rounded-lg p-2"
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {pattern.length > 1 && pattern.slice(0, -1).map((dotId, index) => {
                const fromDot = dots.find(d => d.id === dotId);
                const toDot = dots.find(d => d.id === pattern[index + 1]);
                if (!fromDot || !toDot) return null;
                
                const x1 = (fromDot.col * 44) + 28;
                const y1 = (fromDot.row * 44) + 28;
                const x2 = (toDot.col * 44) + 28;
                const y2 = (toDot.row * 44) + 28;
                
                return (
                  <line
                    key={`line-${index}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                );
              })}
            </svg>

            {/* Dots */}
            <div className="grid grid-cols-3 gap-3 h-full">
              {dots.map((dot) => {
                const isSelected = pattern.includes(dot.id);
                const orderIndex = pattern.indexOf(dot.id);
                
                return (
                  <button
                    key={dot.id}
                    type="button"
                    onClick={() => handleDotClick(dot.id)}
                    onMouseEnter={(e) => handleMouseEnter(dot.id, e)}
                    className={cn(
                      "relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground scale-110"
                        : "bg-background border-muted-foreground/30 hover:border-primary hover:scale-105"
                    )}
                    data-testid={`pattern-dot-${dot.id}`}
                  >
                    {isSelected ? orderIndex + 1 : dot.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pattern info and clear */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {getPatternDescription(pattern)}
            </span>
            {pattern.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-destructive hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </>
      ) : (
        /* Text input mode */
        <input
          type="text"
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value);
            // Try to parse as pattern
            const nums = e.target.value.split(/[-,\s]/).map(Number).filter(n => n >= 1 && n <= 9);
            setPattern(nums);
          }}
          placeholder="e.g., 1-2-3-6-9 or L-shape"
          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          data-testid="pattern-text-input"
        />
      )}
    </div>
  );
}
