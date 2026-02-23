import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, Box, useInput, useApp, type Key } from 'ink'; // Import Key type for strict typing
import fs from 'fs';
import path from 'path';
import Spinner from 'ink-spinner';
import { parseDevScript, type DevScriptData } from '../core/parser.js';
import { hydrateContext } from '../core/hydrator.js';
import { askGemini } from '../services/gemini.js';
import { buildFinalPrompt } from '../core/builder.js';
import { applyChanges, type FileWriteResult } from '../core/writer.js'; // Import FileWriteResult for DRY
import { exec } from 'child_process';
import { CommandTerminal } from '../components/CommandTerminal.js';
// Removed unused 'chalk' import as it's not directly utilized in this file's JSX or logic.

interface RunCommandProps {
  filePath: string;
  hasImage?: boolean;
}

export const RunCommandUI: React.FC<RunCommandProps> = ({ filePath, hasImage }) => {
  const { exit } = useApp();
  const [data, setData] = useState<DevScriptData | null>(null);
  const [hydratedCode, setHydratedCode] = useState<string>("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentStatus, setCurrentStatus] = useState<string>("");

  // Memoize token estimation to prevent unnecessary recalculations, optimizing performance.
  const tokenEstimate: number = useMemo(() => Math.ceil(hydratedCode.length / 4), [hydratedCode]);

  // Memoized callback for appending to terminal output, ensuring referential stability.
  const appendToTerminal = useCallback((line: string) => {
    setTerminalOutput(prev => [...prev, line]);
  }, []);

  // Memoized callback for clearing terminal output, ensuring referential stability.
  const clearTerminal = useCallback(() => {
    setTerminalOutput([]);
  }, []);

  // Main logic to handle running the DevScript and interacting with Gemini.
  const handleRun = useCallback(async () => {
    // Early return: check for essential data before proceeding.
    if (!data || !hydratedCode) {
      appendToTerminal("❌ Error: DevScript data or hydrated context is missing. Cannot run.");
      setCurrentStatus("❌ Generation Failed: Missing data.");
      return;
    }

    clearTerminal(); // Clear terminal before a new run for a clean slate.
    appendToTerminal('◈ DEVSCRIPT ENGINE v2.0 ◈');
    appendToTerminal(`devscript $ devrun ${path.basename(filePath)}`);

    const apiKey: string | undefined = process.env.GEMINI_API_KEY; 
    // Early return: enforce API key presence.
    if (!apiKey) {
      appendToTerminal("❌ Error: GEMINI_API_KEY not found in .env. Please configure your API key.");
      exec('say "API key missing. Configuration required."'); 
      setCurrentStatus("❌ Generation Failed: API Key Missing.");
      return;
    }

    setIsThinking(true);
    appendToTerminal("Generating architectural response...");
    setCurrentStatus("Generating...");

    try {
      const finalPrompt: string = buildFinalPrompt(data, hydratedCode);
      const response: string = await askGemini(finalPrompt, apiKey);
      
      appendToTerminal("\n--- AI RESPONSE ---");
      response.split('\n').forEach((line: string) => appendToTerminal(line));

      // Differentiate status messages based on the AI response content,
      // providing more precise feedback for API errors.
      if (response.startsWith("[API ERROR]")) {
        exec('say "API processing failed. Review output for errors."');
        setCurrentStatus("❌ Generation Failed (API Error). Review terminal.");
      } else {
        exec('say "Processing complete. Review the output architect."'); 
        setCurrentStatus("Generation complete. Press 'a' to apply changes.");
      }
    } catch (err: unknown) {
      const error = err as Error; // Type assertion for generic error handling.
      appendToTerminal(`❌ Execution Failed: ${error.message}`);
      setCurrentStatus(`❌ Execution Failed: ${error.message}`);
    } finally {
      setIsThinking(false); // Ensure thinking state is always reset.
    }
  }, [data, hydratedCode, filePath, appendToTerminal, clearTerminal]); // Dependencies for useCallback.

  // Logic to apply changes parsed from the AI response.
  const handleApply = useCallback(() => {
    // Early return: prevent applying changes while generation is in progress.
    if (isThinking) {
      setCurrentStatus("System is busy. Cannot apply changes while generating.");
      return;
    }

    const aiResponseStartIndex: number = terminalOutput.indexOf("--- AI RESPONSE ---");
    // Early return: check if AI response marker is present and has content after it.
    if (aiResponseStartIndex === -1 || aiResponseStartIndex === terminalOutput.length - 1) {
      setCurrentStatus("No AI response found in terminal to apply.");
      return;
    }
    
    const rawAiResponse: string = terminalOutput.slice(aiResponseStartIndex + 1).join('\n');
    // Early return: check if AI response content is empty or only whitespace.
    if (!rawAiResponse.trim()) {
      setCurrentStatus("AI response is empty. No content to apply.");
      return;
    }

    setCurrentStatus("Applying changes...");
    const results: FileWriteResult[] = applyChanges(rawAiResponse); 
    const successfulWrites: number = results.filter(r => r.success).length;
    const failedWrites: number = results.filter(r => !r.success).length;

    // Provide detailed status based on write results for clarity.
    if (successfulWrites > 0 || failedWrites > 0) {
      if (successfulWrites > 0) {
        appendToTerminal(`\n🚀 Successfully applied changes for ${successfulWrites} files.`);
        exec(`say "Build successful. ${successfulWrites} files synchronized."`); 
      }
      if (failedWrites > 0) {
        appendToTerminal(`\n❌ Failed to apply changes for ${failedWrites} files.`);
        exec(`say "Build failed for ${failedWrites} files. Review errors."`); 
      }
      setCurrentStatus(`🚀 Built ${successfulWrites} files, Failed ${failedWrites}.`);
    } else {
      appendToTerminal("⚠️ No files were created or modified.");
      setCurrentStatus("⚠️ No files built.");
    }
  }, [terminalOutput, isThinking, appendToTerminal]); // Dependencies for useCallback.

  // Input handling for UI actions, utilizing Ink's 'Key' type for improved type safety.
  useInput((input: string, key: Key) => { 
    if (input === 'q') {
        exit(); // Quit application.
        return;
    }
    if (key.return && !isThinking) {
        handleRun(); // Run generation on Enter.
        return;
    }
    if (input === 'a' && !isThinking) {
        handleApply(); // Apply changes on 'a'.
        return;
    }
    if (input === 's') {
        setCurrentStatus("Saving functionality pending implementation (e.g., saving session logs or prompt).");
        exec('say "Save feature not yet implemented."'); 
    }
  });

  // Effect hook for initial data loading and file watching.
  useEffect(() => {
    let isMounted: boolean = true; // Flag to prevent state updates on unmounted component.
    
    const loadData = async () => {
      appendToTerminal(`Loading DevScript from ${path.basename(filePath)}...`);
      try {
        // Early return: check for DevScript file existence.
        if (!fs.existsSync(filePath)) {
          throw new Error(`DevScript file not found at ${filePath}`);
        }

        const rawContent: string = fs.readFileSync(filePath, 'utf-8');
        const parsed: DevScriptData = parseDevScript(rawContent);

        // Inform user about hydration status more explicitly.
        if (parsed.contextFiles.length > 0) {
            appendToTerminal(`Hydrating context from ${parsed.contextFiles.length} source(s)...`);
        } else {
            appendToTerminal(`No @use directives found. Hydration skipped.`);
        }

        const fullContext: string = await hydrateContext(parsed.contextFiles);

        // Only update state if the component is still mounted, preventing warnings/errors.
        if (!isMounted) return; 
        setData(parsed);
        setHydratedCode(fullContext);
        setLoading(false);
        appendToTerminal(`Context hydrated. Ready for generation.`);
        setCurrentStatus("System Ready. Press Enter to generate.");
      } catch (e: unknown) {
        const error = e as Error; // Type assertion for generic error handling.
        // Only update state if the component is still mounted.
        if (isMounted) {
          appendToTerminal(`❌ Load Failed: ${error.message}`);
          setCurrentStatus(`❌ Load Failed: ${error.message}`);
        }
      }
    };

    loadData(); // Initial data load upon component mount.

    // Setup file watcher for the DevScript file to enable automatic reloading on changes.
    const watcher = fs.watch(filePath, (event: string) => {
      if (event === 'change') {
        appendToTerminal(`--- File change detected in ${path.basename(filePath)}. Reloading...`);
        loadData(); // Reload data when the DevScript file is modified.
      }
    });

    // Cleanup function for effect: Mark component as unmounted and close the file watcher.
    return () => {
      isMounted = false; 
      watcher.close(); 
    };
  }, [filePath, appendToTerminal]); // Dependencies for effect.

  // Render loading state while context is being hydrated.
  if (loading) {
    return (
      <Box flexDirection="column" padding={1} width="100%" >
        <Text color="cyan" bold>◈ DEVSCRIPT ENGINE v2.0 ◈</Text>
        <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="yellow">
          <Text color="yellow"><Spinner type="dots" /> Hydrating Context and DevScript...</Text>
        </Box>
        <Box marginTop={1} height={10} overflow="hidden">
          <CommandTerminal lines={terminalOutput} speed={5} delay={100} isDemo={true} color="slate.300" />
        </Box>
      </Box>
    );
  }

  // Render main UI once loading is complete.
  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Box marginBottom={1} justifyContent="center" borderStyle="double" borderColor="cyan">
        <Text color="cyan" bold> ◈ DEVSCRIPT ENGINE v2.0 ◈ </Text>
      </Box>
      <Box flexDirection="row">
        {/* Architect Panel - Displays DevScript metadata */}
        <Box flexDirection="column" width="30%" paddingRight={2} borderStyle="round" borderColor="slate.700" marginRight={1}>
          <Text color="cyan" bold underline>ARCHITECT</Text>
          <Text color="slate.300"> <Text color="slate.500">Role:</Text> {data?.role || 'Undefined'} </Text>
          <Text color="slate.300"> <Text color="slate.500">Vibe:</Text> {data?.vibe || 'Undefined'} </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan" bold underline>STACK</Text>
            {data?.tech && data.tech.length > 0
              ? data.tech.slice(0, 5).map((t: string) => <Text key={t} color="slate.300">• {t}</Text>)
              : <Text color="slate.500">None Specified</Text>}
          </Box>
          <Box marginTop={1} flexDirection="column" borderStyle="classic"
               borderColor={tokenEstimate > 30000 ? "red" : (tokenEstimate > 10000 ? "yellow" : "green")}
          >
            <Text color="cyan" bold> ⚡ ENERGY </Text>
            <Text color="slate.300"> Tokens: ~{tokenEstimate.toLocaleString()} </Text>
            {hasImage && <Text color="cyan">📸 Image Attached (Vision Model)</Text>}
          </Box>
        </Box>
        {/* Terminal Output Panel - Displays execution and AI response */}
        <Box flexDirection="column" width="70%" paddingLeft={1} borderStyle="round" borderColor="slate.700">
          <Text color="cyan" bold underline>TERMINAL OUTPUT</Text>
          <Box height={15} overflow="hidden"> 
            {isThinking ? (
              <Box paddingX={1}>
                <Text color="yellow"><Spinner type="dots" /> {currentStatus}</Text>
                <CommandTerminal lines={terminalOutput} speed={5} delay={100} isDemo={true} color="gray" />
              </Box>
            ) : (
              <Box paddingX={1} >
                <CommandTerminal lines={terminalOutput} speed={5} delay={100} isDemo={true} color="gray" />
              </Box>
            )}
          </Box>
          {currentStatus && <Text color="cyan" bold>{currentStatus}</Text>}
        </Box>
      </Box>
      {/* Footer / Controls - User interaction guide */}
      <Box marginTop={1} paddingX={1} borderStyle="single"
           borderColor={isThinking ? "yellow" : "cyan"} 
           justifyContent="space-between"
           >
        <Box flexDirection="row">
          <Text color="slate.300" bold> [</Text>
          <Text color={!isThinking ? "cyan" : "slate.500"} bold>Enter</Text><Text color="slate.300">] Run </Text>
          <Text color="slate.300" bold> | [</Text>
          <Text color={!isThinking ? "cyan" : "slate.500"} bold>a</Text><Text color="slate.300">] Apply </Text>
          <Text color="slate.300" bold> | [</Text>
          <Text color={"slate.500"} bold>s</Text><Text color="slate.300">] Save </Text>
          <Text color="slate.300" bold> | [</Text>
          <Text color="cyan" bold>q</Text><Text color="slate.300">] Quit </Text>
          <Text color="slate.300" bold>]</Text>
        </Box>
        <Box>
            <Text color="slate.500">{path.basename(filePath)}</Text>
        </Box>
      </Box>
    </Box>
  );
};