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
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const lineIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  useEffect(() => {
    if (!isDemo) {
      setDisplayedLines(lines);
      return;
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setDisplayedLines([]);
    lineIndexRef.current = 0;
    charIndexRef.current = 0;
    const typeNextChar = () => {
    if (lineIndexRef.current >= lines.length) {
        return;
    }
    const currentLine = lines[lineIndexRef.current];
    if (typeof currentLine !== 'string') {
        return;
    }
    if (charIndexRef.current < currentLine.length) {
        setDisplayedLines(prev => {
        const newLines = [...prev];
        newLines[lineIndexRef.current] = currentLine.substring(0, charIndexRef.current + 1);
        return newLines;
        });
        charIndexRef.current++;
        timeoutsRef.current.push(setTimeout(typeNextChar, speed));
    } else {
        lineIndexRef.current++;
        charIndexRef.current = 0;
        if (lineIndexRef.current < lines.length) {
        setDisplayedLines(prev => [...prev, '']);
        timeoutsRef.current.push(setTimeout(typeNextChar, delay));
        }
    }
    };
    if (lines.length > 0) {
      setDisplayedLines(['']); 
      timeoutsRef.current.push(setTimeout(typeNextChar, delay));
    }
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [lines, speed, delay, isDemo]); 
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      {displayedLines.map((line, i) => (
        <Text key={i} color={color}>{line}</Text>
      ))}
    </Box>
  );
};