import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';

interface CommandTerminalProps {
  lines: string[];
  speed?: number; 
  delay?: number; 
  isDemo?: boolean; 
  color?: string; 
}

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  lines,
  speed = 10,
  delay = 50,
  isDemo = false,
  color = 'slate.300', 
}) => {
  // State to track the animation progress, triggering re-renders efficiently.
  // Stores the index of the line currently being typed and the character index within it.
  const [currentTypingProgress, setCurrentTypingProgress] = useState<{ lineIndex: number; charIndex: number }>({ lineIndex: 0, charIndex: 0 });
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear existing timeouts on re-render or component unmount to prevent memory leaks and ensure clean restart.
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // If not in demo mode, display all lines immediately by setting progress to the end.
    if (!isDemo) {
      setCurrentTypingProgress({ lineIndex: lines.length, charIndex: 0 }); // Mark all lines as 'typed'
      return;
    }

    // Reset progress for a new demo animation sequence.
    setCurrentTypingProgress({ lineIndex: 0, charIndex: 0 });

    const typeNextChar = () => {
      setCurrentTypingProgress(prev => {
        // Early return if the animation is already complete.
        if (prev.lineIndex >= lines.length) {
          return prev;
        }

        const currentLineContent = lines[prev.lineIndex];
        // Ensure current line is a valid string, early return otherwise to prevent errors.
        if (typeof currentLineContent !== 'string') {
          return prev;
        }

        const nextCharIndex = prev.charIndex + 1;

        if (nextCharIndex <= currentLineContent.length) {
          // If there are more characters to type on the current line.
          // Schedule the next character update.
          timeoutsRef.current.push(setTimeout(typeNextChar, speed));
          return { ...prev, charIndex: nextCharIndex };
        } else {
          // The current line is fully typed.
          const nextLineIndex = prev.lineIndex + 1;
          if (nextLineIndex < lines.length) {
            // If there are more lines to type, move to the next line.
            // Schedule the start of the next line after a delay.
            timeoutsRef.current.push(setTimeout(typeNextChar, delay));
            return { lineIndex: nextLineIndex, charIndex: 0 };
          }
          // All lines have been processed.
          return prev;
        }
      });
    };

    // Initiate the typing animation if there are lines to display.
    if (lines.length > 0) {
      timeoutsRef.current.push(setTimeout(typeNextChar, delay));
    }

    // Cleanup function: clear all scheduled timeouts when the component unmounts or dependencies change.
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [lines, speed, delay, isDemo]); // Dependencies: re-run effect if these props change.

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      {lines.map((line, i) => {
        const isCurrentLine = i === currentTypingProgress.lineIndex;
        const isTyped = i < currentTypingProgress.lineIndex;
        let displayedText = '';

        if (isTyped) {
          // If the line is fully typed, display its entire content.
          displayedText = line;
        } else if (isCurrentLine) {
          // If this is the line currently being typed, display a substring up to the current char index.
          displayedText = line.substring(0, currentTypingProgress.charIndex);
        } else {
          // If this line is yet to be typed, do not render it to save resources.
          return null;
        }

        return <Text key={i} color={color}>{displayedText}</Text>;
      })}
    </Box>
  );
};