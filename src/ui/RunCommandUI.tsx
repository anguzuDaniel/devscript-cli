import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, Box, useInput, useApp } from 'ink';
import fs from 'fs';
import path from 'path';
import Spinner from 'ink-spinner';
import { parseDevScript, type DevScriptData } from '../core/parser.js';
import { hydrateContext } from '../core/hydrator.js';
import { askGemini } from '../services/gemini.js';
import { buildFinalPrompt } from '../core/builder.js';
import { applyChanges } from '../core/writer.js';
import { exec } from 'child_process';
import { CommandTerminal } from '../components/CommandTerminal.js';
import chalk from 'chalk'; // For direct chalk usage if needed, though Ink handles colors

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

  // Memoize token estimation for performance
  const tokenEstimate: number = useMemo(() => Math.ceil(hydratedCode.length / 4), [hydratedCode]);

  // Callback to append lines to the terminal output
  const appendToTerminal = useCallback((line: string) => {
    setTerminalOutput(prev => [...prev, line]);
  }, []);

  // Callback to clear the terminal output
  const clearTerminal = useCallback(() => {
    setTerminalOutput([]);
  }, []);

  // Handler for initiating the AI command run
  const handleRun = useCallback(async () => {
    // Early return if data or hydrated context is missing
    if (!data || !hydratedCode) {
      appendToTerminal("❌ Error: DevScript data or hydrated context is missing. Cannot run.");
      return;
    }

    clearTerminal(); // Clear previous output
    appendToTerminal('◈ DEVSCRIPT ENGINE v2.0 ◈');
    appendToTerminal(`devscript $ devrun ${path.basename(filePath)}`);

    const apiKey: string | undefined = process.env.GEMINI_API_KEY; // Explicitly type API key
    // Early return if API key is not found
    if (!apiKey) {
      appendToTerminal("❌ Error: GEMINI_API_KEY not found in .env. Please configure your API key.");
      exec('say "API key missing. Configuration required."');
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
      exec('say "Processing complete. Review the output architect."'); // Announce completion
      setCurrentStatus("Generation complete. Press 'a' to apply changes.");
    } catch (err: unknown) {
      const error = err as Error; // Type assertion for error handling
      appendToTerminal(`❌ Execution Failed: ${error.message}`);
      setCurrentStatus(`Execution Failed: ${error.message}`);
    } finally {
      setIsThinking(false); // Reset thinking state
    }
  }, [data, hydratedCode, filePath, appendToTerminal, clearTerminal]);

  // Handler for applying AI-generated changes to disk
  const handleApply = useCallback(() => {
    // Early return if system is busy
    if (isThinking) {
      setCurrentStatus("System is busy. Cannot apply changes while generating.");
      return;
    }

    const aiResponseStartIndex: number = terminalOutput.indexOf("--- AI RESPONSE ---");
    // Early return if AI response marker is not found or is at the end
    if (aiResponseStartIndex === -1 || aiResponseStartIndex === terminalOutput.length - 1) {
      setCurrentStatus("No AI response found in terminal to apply.");
      return;
    }

    const rawAiResponse: string = terminalOutput.slice(aiResponseStartIndex + 1).join('\n');
    // Early return if AI response content is empty
    if (!rawAiResponse.trim()) {
      setCurrentStatus("AI response is empty. No content to apply.");
      return;
    }

    setCurrentStatus("Applying changes...");
    const results = applyChanges(rawAiResponse); // Apply changes to file system
    const successfulWrites: number = results.filter(r => r.success).length;

    if (successfulWrites > 0) {
      appendToTerminal(`\n🚀 Successfully applied changes for ${successfulWrites} files.`);
      exec(`say "Build successful. ${successfulWrites} files synchronized."`); // Announce build success
      setCurrentStatus(`🚀 Built ${successfulWrites} files.`);
    } else {
      appendToTerminal("⚠️ No files were created or modified.");
      setCurrentStatus("⚠️ No files built.");
    }
  }, [terminalOutput, isThinking, appendToTerminal]);

  // Handle user input (keyboard shortcuts)
  useInput((input: string, key) => {
    // Quit application on 'q'
    if (input === 'q') {
        exit();
        return;
    }
    // Run command on Enter, if not already thinking
    if (key.return && !isThinking) {
        handleRun();
        return;
    }
    // Apply changes on 'a', if not already thinking
    if (input === 'a' && !isThinking) {
        handleApply();
        return;
    }
    // 's' for Save (currently a placeholder)
    if (input === 's') {
        setCurrentStatus("Saving functionality pending implementation (e.g., saving session logs or prompt).");
        exec('say "Save feature not yet implemented."');
    }
  });

  // Effect for initial data loading and file watching
  useEffect(() => {
    let isMounted: boolean = true; // Flag to prevent state updates on unmounted component

    const loadData = async () => {
      appendToTerminal(`Loading DevScript from ${path.basename(filePath)}...`);
      try {
        // Early return if file does not exist
        if (!fs.existsSync(filePath)) {
          throw new Error(`DevScript file not found at ${filePath}`);
        }

        const rawContent: string = fs.readFileSync(filePath, 'utf-8');
        const parsed: DevScriptData = parseDevScript(rawContent);

        if (parsed.contextFiles.length > 0) {
            appendToTerminal(`Hydrating context from ${parsed.contextFiles.length} source(s)...`);
        } else {
            appendToTerminal(`No @use directives found. Hydration skipped.`);
        }
        const fullContext: string = await hydrateContext(parsed.contextFiles);

        // Update state only if component is still mounted
        if (!isMounted) return;
        setData(parsed);
        setHydratedCode(fullContext);
        setLoading(false);
        appendToTerminal(`Context hydrated. Ready for generation.`);
        setCurrentStatus("System Ready. Press Enter to generate.");
      } catch (e: unknown) {
        const error = e as Error; // Type assertion for error handling
        if (isMounted) {
          appendToTerminal(`❌ Load Failed: ${error.message}`);
          setCurrentStatus(`❌ Load Failed: ${error.message}`);
        }
      }
    };

    loadData(); // Initial data load

    // Set up file watcher for the DevScript file
    const watcher = fs.watch(filePath, (event: string) => {
      if (event === 'change') {
        appendToTerminal(`--- File change detected in ${path.basename(filePath)}. Reloading...`);
        loadData(); // Reload data on file change
      }
    });

    // Cleanup watcher on component unmount
    return () => {
      isMounted = false;
      watcher.close();
    };
  }, [filePath, appendToTerminal]); // Re-run effect if filePath or appendToTerminal changes

  // Loading UI state
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

  // Main UI state
  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Box marginBottom={1} justifyContent="center" borderStyle="double" borderColor="cyan">
        <Text color="cyan" bold> ◈ DEVSCRIPT ENGINE v2.0 ◈ </Text>
      </Box>

      <Box flexDirection="row">
        {/* Left Panel: Architect Info & Stack */}
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

        {/* Right Panel: Terminal Output */}
        <Box flexDirection="column" width="70%" paddingLeft={1} borderStyle="round" borderColor="slate.700">
          <Text color="cyan" bold underline>TERMINAL OUTPUT</Text>
          <Box height={15} overflow="hidden"> {/* Container for the CommandTerminal to manage height */}
            {isThinking ? (
              <Box paddingX={1}>
                <Text color="yellow"><Spinner type="dots" /> {currentStatus}</Text>
                {/* CommandTerminal itself has the glowing border */}
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

      {/* Bottom Panel: Actions and Status */}
      <Box marginTop={1} paddingX={1} borderStyle="single"
           borderColor={isThinking ? "yellow" : "cyan"} // Glowing border for active state
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