import React, { useState, useEffect, useCallback } from 'react';
import { Text, Box, useInput, useApp } from 'ink';
import fs from 'fs';
import path from 'path';
import { parseDevScript } from '../core/parser.js';
import { hydrateContext } from '../core/hydrator.js';
import { askGemini } from '../services/gemini.js';
import { buildFinalPrompt } from '../core/builder.js';
import Spinner from 'ink-spinner';

export const RunCommandUI = ({ filePath }: { filePath: string }) => {
  const { exit } = useApp();
  const [data, setData] = useState<any>(null);
  const [hydratedCode, setHydratedCode] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [tokenEstimate, setTokenEstimate] = useState(0);

  useEffect(() => {
    // Rough estimate: 4 chars = 1 token
    setTokenEstimate(Math.ceil(hydratedCode.length / 4));
  }, [hydratedCode]);

  // --- 1. THE AGENT: Apply Changes logic ---
  const applyChanges = useCallback((response: string) => {
    const regex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;
    let count = 0;

    while ((match = regex.exec(response)) !== null) {
      const [, targetPath, content] = match;
      if (targetPath && content !== undefined) {
        try {
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(targetPath, content.trim());
          count++;
        } catch (err) {
          console.error(`Error writing ${targetPath}:`, err);
        }
      }
    }
    return count;
  }, []);

  // --- 2. THE ENGINE: Execute Gemini Logic ---
  const handleRun = useCallback(async () => {
    if (!data || !hydratedCode) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setAiResponse("❌ Error: No API Key found in .env");
      return;
    }

    setIsThinking(true);
    setAiResponse("");
    setSaveStatus("");

    try {
      const finalPrompt = buildFinalPrompt(data, hydratedCode);
      const response = await askGemini(finalPrompt, apiKey);
      if (!response) throw new Error("Empty response from Gemini");
      setAiResponse(response);
    } catch (err: any) {
      setAiResponse(`❌ Execution Failed: ${err.message || "Unknown Error"}`);
    } finally {
      setIsThinking(false);
    }
  }, [data, hydratedCode]);

  // --- 3. THE CONTROLS: Global Input Listener ---
  useInput((input, key) => {
    if (input === 'q') exit();

    if (key.return && !loading && !isThinking) {
      handleRun();
    }

    if (input === 'a' && aiResponse) {
      const count = applyChanges(aiResponse);
      setSaveStatus(`🚀 Applied ${count} changes to disk.`);
    }

    if (input === 's' && aiResponse) {
      fs.writeFileSync(`dev-output-${Date.now()}.md`, aiResponse);
      setSaveStatus("📝 Saved full response to markdown.");
    }
  });

  // --- 4. THE BOOTLOADER: Initialization ---
  useEffect(() => {
      let isMounted = true;

      // We pull the init logic into a reusable function
      const loadData = async () => {
        try {
          if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
          
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const parsed = parseDevScript(rawContent);
          const filesToHydrate = parsed.contextFiles || [];
          const fullContext = await hydrateContext(filesToHydrate);
          
          if (isMounted) {
            setData(parsed);
            setHydratedCode(fullContext);
            setLoading(false);
            // Optional: clear status so you know it reloaded
            setSaveStatus("🔄 Context reloaded from disk.");
            setTimeout(() => setSaveStatus(""), 2000);
          }
        } catch (e: any) {
          if (isMounted) {
            setAiResponse(`❌ Reload Failed: ${e.message}`);
            setLoading(false);
          }
        }
      };

      // Initial load
      loadData();

      // ◈ The Watcher: Listens for file changes
      let watcher: fs.FSWatcher | undefined; // Declare as potentially undefined for defensive check
      try {
        watcher = fs.watch(filePath, (eventType) => {
          if (eventType === 'change') {
            loadData();
          }
        });
      } catch (error: unknown) {
        // Log errors during watcher setup (e.g., permissions issues)
        console.error(`Error setting up file watcher for '${filePath}':`, (error as Error).message);
      }
      

      return () => {
        isMounted = false;
        if (watcher) { // Only close if watcher was successfully initialized
          watcher.close();
        }
      };
    }, [filePath]);

    const ErrorPanel = ({ message }: { message: string }) => (
      <Box flexDirection="column" padding={1} borderStyle="bold" borderColor="red">
        <Text color="red" bold>◈ ENGINE ERROR ◈</Text>
        <Box marginTop={1}>
          <Text color="white">{message}</Text>
        </Box>
        <Text color="dim">Check your .env or .dev syntax | [q] Quit</Text>
      </Box>
    );

    // Use this in your render:
    if (aiResponse.startsWith("❌")) {
      return <ErrorPanel message={aiResponse} />;
    }

  // --- 5. THE VIEW ---
  if (loading) return <Text color="yellow">◈ Loading DevScript Context...</Text>;

  return (
    <Box flexDirection="column" padding={1}>
      {/* ◈ Header */}
      <Box marginBottom={1} justifyContent="center" borderStyle="double" borderColor="cyan">
        <Text color="cyan" bold> ◈ DEVSCRIPT ENGINE v2.0 ◈ </Text>
      </Box>

      <Box flexDirection="row">
        {/* ◈ Sidebar: Metadata */}
        <Box flexDirection="column" width="30%" paddingRight={2} borderStyle="round" borderColor="magenta">
          <Text color="magenta" bold underline>ARCHITECT</Text>
          <Text> <Text color="gray">Role:</Text> {data?.role} </Text>
          <Text> <Text color="gray">Vibe:</Text> {data?.vibe} </Text>
          
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow" bold underline>STACK & RULES</Text>
            {data?.tech.map((t: string) => <Text key={t}>• {t}</Text>)}
            {data?.rules.map((r: string) => <Text key={r} color="dim">→ {r}</Text>)}
          </Box>

          <Box marginTop={1}>
            <Text color="cyan">Context: {hydratedCode.length} ch</Text>
          </Box>

          <Box marginTop={1} flexDirection="column" borderStyle="classic" borderColor="yellow">
            <Text color="yellow" bold> ⚡ MENTAL ENERGY </Text>
            <Text> Chars: {hydratedCode.length.toLocaleString()} </Text>
            <Text> Tokens: ~{tokenEstimate.toLocaleString()} </Text>
            
            {tokenEstimate > 30000 && (
              <Text color="red" backgroundColor="white"> ⚠️ HIGH LOAD </Text>
            )}
          </Box>
        </Box>

        {/* ◈ Main Panel: Response Area */}
        <Box flexDirection="column" width="70%" paddingLeft={1}>
          <Box paddingX={1} borderStyle="single" borderColor={isThinking ? "yellow" : "green"}>
            {isThinking && (
              <Text color="yellow">
              <Spinner type="dots" /> <Text italic>Thinking...</Text>
            </Text>
            )}
          </Box>

          {aiResponse && (
            <Box marginTop={1} height={15} borderStyle="round" borderColor="gray" paddingX={1}>
              <Text color="white">{aiResponse.split('\n').slice(0, 12).join('\n')}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* ◈ Footer: Controls */}
      <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="blue">
        <Text color="white" bold> [Enter] Run | [a] Apply | [s] Save | [q] Quit </Text>
        <Box flexGrow={1} />
        <Text color="white">{path.basename(filePath)}</Text>
      </Box>

      
    </Box>
  );
};