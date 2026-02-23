import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Text, Box, useInput, useApp, type Key } from 'ink';
import fs from 'fs';
import path from 'path';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { parseDevScript, type DevScriptData } from '../core/parser.js';
import { hydrateContext } from '../core/hydrator.js';
import { engine } from '../core/engine.js';
import { buildFinalPrompt } from '../core/builder.js';
import { applyChanges, type FileWriteResult } from '../core/writer.js';
import { exec } from 'child_process';
import { CommandTerminal } from '../components/CommandTerminal.js';

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
  const [currentStatus, setCurrentStatus] = useState<string>("Initializing...");

  // Use a ref for terminal output to avoid closure issues and reduce re-renders if needed
  const terminalRef = useRef<string[]>([]);

  const appendToTerminal = useCallback((line: string) => {
    terminalRef.current = [...terminalRef.current, line].slice(-100); // Keep last 100 lines
    setTerminalOutput(terminalRef.current);
  }, []);

  const clearTerminal = useCallback(() => {
    terminalRef.current = [];
    setTerminalOutput([]);
  }, []);

  const tokenEstimate: number = useMemo(() => Math.ceil(hydratedCode.length / 4), [hydratedCode]);

  const handleRun = useCallback(async () => {
    if (!data || !hydratedCode) return;

    clearTerminal();
    appendToTerminal('◈ DEVSCRIPT ENGINE v2.0 ◈');
    appendToTerminal(`devscript $ devrun ${path.basename(filePath)}`);

    setIsThinking(true);
    const provider = engine.getAuthService().getActiveProvider();
    setCurrentStatus(`Consulting ${provider}...`);

    try {
      const finalPrompt: string = buildFinalPrompt(data, hydratedCode);
      const response: string = await engine.generateResponse(finalPrompt);
      
      appendToTerminal(`\n--- ${provider.toUpperCase()} RESPONSE ---`);
      response.split('\n').forEach((line: string) => appendToTerminal(line));

      if (response.startsWith("[API ERROR]")) {
        setCurrentStatus("❌ Generation Failed. Review terminal.");
      } else {
        setCurrentStatus("✔ Generation complete. Press 'a' to apply.");
      }
    } catch (err: any) {
      appendToTerminal(`❌ Execution Failed: ${err.message}`);
      setCurrentStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsThinking(false);
    }
  }, [data, hydratedCode, filePath, appendToTerminal, clearTerminal]);

  const handleApply = useCallback(() => {
    if (isThinking || terminalOutput.length === 0) return;

    // Find response start
    const provider = engine.getAuthService().getActiveProvider().toUpperCase();
    const marker = `--- ${provider} RESPONSE ---`;
    const startIndex = terminalOutput.findIndex(line => line.includes(marker));
    
    if (startIndex === -1) return;
    
    const rawAiResponse: string = terminalOutput.slice(startIndex + 1).join('\n');
    if (!rawAiResponse.trim()) return;

    setCurrentStatus("Applying changes...");
    const results = applyChanges(rawAiResponse); 
    const successful = results.filter(r => r.success).length;

    if (successful > 0) {
      appendToTerminal(`\n🚀 Successfully manifested ${successful} files.`);
      setCurrentStatus(`🚀 Built ${successful} files.`);
    } else {
      setCurrentStatus("⚠️ No files manifested.");
    }
  }, [terminalOutput, isThinking, appendToTerminal]);

  useInput((input, key) => { 
    if (input === 'q') exit();
    if (key.return && !isThinking && !loading) handleRun();
    if (input === 'a' && !isThinking && !loading) handleApply();
  });

  // Centralized Load Logic to avoid infinite loops
  const loadData = useCallback(async () => {
    try {
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseDevScript(rawContent);
      const fullContext = await hydrateContext(parsed.contextFiles);

      setData(parsed);
      setHydratedCode(fullContext);
      setLoading(false);
      setCurrentStatus("System Ready. [Enter] to run.");
    } catch (e: any) {
      setCurrentStatus(`❌ Load Failed: ${e.message}`);
    }
  }, [filePath]);

  useEffect(() => {
    loadData();
    const watcher = fs.watch(filePath, (event) => {
      if (event === 'change') loadData();
    });
    return () => watcher.close();
  }, [loadData, filePath]);

  if (loading) {
    return (
      <Box flexDirection="column" padding={1} width="100%">
        <Gradient name="pastel">
          <BigText text="DevScript" font="tiny" />
        </Gradient>
        <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="yellow">
          <Text color="yellow"><Spinner type="dots" /> Hydrating "{path.basename(filePath)}"...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} width="100%">
      <Box marginBottom={1} justifyContent="center">
        <Gradient name="pastel">
          <BigText text="DevScript" font="tiny" />
        </Gradient>
      </Box>

      <Box flexDirection="row" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
        {/* Architect Panel */}
        <Box flexDirection="column" width="30%" paddingRight={1} marginRight={1}>
          <Box borderStyle="single" borderColor="slate" flexDirection="column" paddingX={1}>
            <Text color="cyan" bold underline>ARCHITECT</Text>
            <Box marginTop={1}>
                <Text>Role: <Text color="green" bold>{data?.role || 'Engineer'}</Text></Text>
            </Box>
            <Text>Vibe: <Text color="magenta">{data?.vibe || 'Neutral'}</Text></Text>
            
            <Box marginTop={1} flexDirection="column">
                <Text color="cyan" bold underline>STACK</Text>
                {data?.tech && data.tech.length > 0 ? (
                data.tech.slice(0, 3).map((t) => <Text key={t} color="white" dimColor>• {t}</Text>)
                ) : (
                <Text color="gray">Default (TS)</Text>
                )}
            </Box>

            <Box marginTop={1} borderStyle="classic" borderColor={tokenEstimate > 10000 ? "yellow" : "green"} paddingX={1}>
                <Text bold color={tokenEstimate > 10000 ? "yellow" : "green"}>
                    ⚡ {tokenEstimate.toLocaleString()} tokens
                </Text>
            </Box>
          </Box>
        </Box>

        {/* Terminal Panel */}
        <Box flexDirection="column" width="70%">
          <Text color="cyan" bold>  TERMINAL</Text>
          <Box height={16} overflow="hidden" borderStyle="single" borderColor="gray" paddingX={1}>
             <CommandTerminal lines={terminalOutput} speed={10} delay={0} isDemo={true} color="white" />
          </Box>
          <Box paddingX={1}>
            {isThinking ? (
                <Text color="yellow"><Spinner type="dots" /> <Text italic>Agent is processing architectural logic...</Text></Text>
            ) : (
                <Text color="gray" dimColor>IDLE - Waiting for command</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} paddingX={1} borderStyle="double" borderColor={isThinking ? "yellow" : "cyan"} justifyContent="space-between">
        <Box>
          <Text bold color="white"> [Enter] </Text><Text color="gray">Run</Text>
          <Text bold color="white">  [a] </Text><Text color="gray">Apply</Text>
          <Text bold color="white">  [q] </Text><Text color="gray">Quit</Text>
        </Box>
        <Box>
          <Text bold color={currentStatus.includes("Error") || currentStatus.includes("Failed") ? "red" : "cyan"}>
            {currentStatus}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
