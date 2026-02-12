'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Loader2, CheckCircle, XCircle, RotateCcw, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface CodeSandboxProps {
  starterCode?: string;
  language?: string;
  testCases?: TestCase[];
  readOnly?: boolean;
  onSubmit?: (code: string, language: string) => void;
}

const LANGUAGES = [
  { value: 'python', label: 'Python 3', monacoId: 'python', pistonVersion: '3.10.0' },
  { value: 'javascript', label: 'JavaScript', monacoId: 'javascript', pistonVersion: '18.15.0' },
  { value: 'typescript', label: 'TypeScript', monacoId: 'typescript', pistonVersion: '5.0.3' },
  { value: 'java', label: 'Java', monacoId: 'java', pistonVersion: '15.0.2' },
  { value: 'c', label: 'C', monacoId: 'c', pistonVersion: '10.2.0' },
  { value: 'c++', label: 'C++', monacoId: 'cpp', pistonVersion: '10.2.0' },
  { value: 'go', label: 'Go', monacoId: 'go', pistonVersion: '1.16.2' },
  { value: 'rust', label: 'Rust', monacoId: 'rust', pistonVersion: '1.68.2' },
  { value: 'ruby', label: 'Ruby', monacoId: 'ruby', pistonVersion: '3.0.1' },
  { value: 'php', label: 'PHP', monacoId: 'php', pistonVersion: '8.2.3' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: '# Write your solution here\n\ndef solution():\n    pass\n\nsolution()\n',
  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n\nsolution();\n',
  typescript: '// Write your solution here\n\nfunction solution(): void {\n  \n}\n\nsolution();\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  'c++': '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\t// Write your solution here\n\tfmt.Println("Hello")\n}\n',
  rust: 'fn main() {\n    // Write your solution here\n    println!("Hello");\n}\n',
  ruby: '# Write your solution here\n\nputs "Hello"\n',
  php: '<?php\n// Write your solution here\n\necho "Hello";\n',
};

export default function CodeSandbox({
  starterCode,
  language: defaultLang = 'python',
  testCases = [],
  readOnly = false,
  onSubmit,
}: CodeSandboxProps) {
  const [language, setLanguage] = useState(defaultLang);
  const [code, setCode] = useState(starterCode || DEFAULT_CODE[defaultLang] || '');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<{ passed: boolean; input: string; expected: string; actual: string }[]>([]);
  const editorRef = useRef<any>(null);

  const langInfo = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0];

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput('');
    setTestResults([]);

    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, stdin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOutput(`Error: ${data.error || 'Execution failed'}`);
        toast.error('Execution failed');
        return;
      }

      const result = data.run || data;
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = result.code;

      let outputText = '';
      if (stdout) outputText += stdout;
      if (stderr) outputText += (outputText ? '\n' : '') + `[stderr] ${stderr}`;
      if (exitCode !== 0) outputText += `\n[Exit code: ${exitCode}]`;

      setOutput(outputText || '(No output)');

      // Run test cases if present
      if (testCases.length > 0) {
        const results = [];
        for (const tc of testCases) {
          const tcRes = await fetch('/api/code/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, stdin: tc.input }),
          });
          const tcData = await tcRes.json();
          const actual = (tcData.run?.stdout || tcData.stdout || '').trim();
          results.push({
            passed: actual === tc.expectedOutput.trim(),
            input: tc.input,
            expected: tc.expectedOutput.trim(),
            actual,
          });
        }
        setTestResults(results);
        const allPassed = results.every((r) => r.passed);
        if (allPassed) toast.success('All test cases passed!');
        else toast.error(`${results.filter((r) => !r.passed).length} test case(s) failed`);
      }
    } catch {
      setOutput('Error: Failed to connect to execution server');
      toast.error('Connection failed');
    } finally {
      setRunning(false);
    }
  }, [code, language, stdin, testCases]);

  const handleReset = () => {
    setCode(starterCode || DEFAULT_CODE[language] || '');
    setOutput('');
    setTestResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Select value={language} onValueChange={(v) => {
          setLanguage(v);
          if (!starterCode) setCode(DEFAULT_CODE[v] || '');
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
          <Button
            variant="arena"
            size="sm"
            onClick={handleRun}
            disabled={running || !code.trim()}
          >
            {running ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            Run
          </Button>
          {onSubmit && (
            <Button
              size="sm"
              onClick={() => onSubmit(code, language)}
              disabled={!code.trim()}
            >
              Submit Code
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <Card className="overflow-hidden">
        <div className="h-[400px]">
          <MonacoEditor
            height="100%"
            language={langInfo.monacoId}
            value={code}
            onChange={(v) => setCode(v || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              readOnly,
              folding: true,
              renderLineHighlight: 'gutter',
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      </Card>

      {/* Stdin input */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Input (stdin)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <textarea
            className="w-full h-20 bg-zinc-900 text-green-400 font-mono text-sm p-3 resize-y border-0 focus:outline-none"
            placeholder="Standard input for your program..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Output */}
      {output && (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Output
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="bg-zinc-900 text-green-400 font-mono text-sm p-3 overflow-auto max-h-60 whitespace-pre-wrap">
              {output}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">
              Test Results ({testResults.filter((r) => r.passed).length}/{testResults.length} passed)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {testResults.map((r, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${r.passed ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {r.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">Test Case {i + 1}</span>
                </div>
                <div className="font-mono text-xs space-y-1 mt-2">
                  <div><span className="text-muted-foreground">Input:</span> {r.input || '(none)'}</div>
                  <div><span className="text-muted-foreground">Expected:</span> {r.expected}</div>
                  {!r.passed && (
                    <div><span className="text-muted-foreground">Got:</span> <span className="text-red-400">{r.actual || '(empty)'}</span></div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
