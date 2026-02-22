import React, { useState, useEffect, useCallback } from 'react';
import { Text, Box, useInput, useApp } from 'ink';
import fs from 'fs';
import { parseDevScript } from '../core/parser.js';
import { hydrateContext } from '../core/hydrator.js';
import { askGemini } from '../services/gemini.js';
import { buildFinalPrompt } from '../core/builder.js';

export const RunCommandUI = ({ filePath }: { filePath: string }) => {
  const { exit } = useApp();
  const [data, setData] = useState<any>(null);
  const [hydratedCode, setHydratedCode] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");

  const handleRun = useCallback(async () => {
    if (!data || !hydratedCode) return;
    
    process.stdout.write('\x1Bc');
    setIsThinking(true);
    setAiResponse(""); 

    try {
      const finalPrompt = buildFinalPrompt(data, hydratedCode);
      const response = await askGemini(finalPrompt, process.env.GEMINI_API_KEY || '');
      setAiResponse(response);
    } catch (err) {
      setAiResponse("API Call Failed. Check your internet or API Key.");
    } finally {
      setIsThinking(false);
    }
  }, [data, hydratedCode]);

  useInput((input, key) => {
    if (input === 'q') exit();
    if (key.return && !loading && !isThinking && data) handleRun();

    if (input === 's' && aiResponse) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `dev-output-${timestamp}.md`;
      try {
        fs.writeFileSync(filename, aiResponse);
        setSaveStatus(`Saved to ${filename}`);
        setTimeout(() => setSaveStatus(""), 3000);
      } catch (err) {
        setSaveStatus("Error saving file.");
      }
    }
  });

  useEffect(() => {
    async function init() {
      try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseDevScript(rawContent);
        const fullContext = await hydrateContext(parsed.contextFiles);
        setData(parsed);
        setHydratedCode(fullContext);
      } catch (e) {
        console.error("Init Error:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [filePath]);

  if (loading) return <Text color="yellow">◈ Loading DevScript...</Text>;

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Text color="cyan" bold>◈ DevScript Engine ◈</Text>
      
      <Box flexDirection="column" marginTop={1}>
        <Text>Persona: {data?.persona}</Text>
        <Text>Style: {data?.style}</Text>
        <Text>Context: {hydratedCode.length} chars</Text>
      </Box>

      <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="cyan">
        {isThinking ? (
          <Text color="white">🧠 Thinking...</Text>
        ) : aiResponse ? (
          <Text color="green">✅ Done! [s] to save | [Enter] to retry</Text>
        ) : (
          <Text color="white">Press [Enter] to Execute | [q] to Quit</Text>
        )}
      </Box>

      {aiResponse && (
        <Box marginTop={1} borderStyle="single" padding={1} borderColor="green">
          <Text>{aiResponse.split('\n').slice(0, 20).join('\n')}</Text>
        </Box>
      )}

      {saveStatus && (
        <Box marginTop={1}>
          <Text backgroundColor="green" color="white"> {saveStatus} </Text>
        </Box>
      )}
    </Box>
  );
};