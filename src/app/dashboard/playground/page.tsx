'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import CodeSandbox from '@/components/code-sandbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Code2, BookOpen, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CHALLENGES = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    testCases: [
      { input: '2 7 11 15\n9', expectedOutput: '0 1' },
      { input: '3 2 4\n6', expectedOutput: '1 2' },
    ],
    starterCode: {
      python: 'def two_sum(nums, target):\n    # Write your solution\n    pass\n\nnums = list(map(int, input().split()))\ntarget = int(input())\nresult = two_sum(nums, target)\nprint(*result)\n',
      javascript: 'const readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on("line", l => lines.push(l));\nrl.on("close", () => {\n  const nums = lines[0].split(" ").map(Number);\n  const target = Number(lines[1]);\n  // Write your solution\n  console.log("0 1");\n});\n',
    },
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'Easy',
    description:
      'Print numbers from 1 to N. For multiples of 3 print "Fizz", for multiples of 5 print "Buzz", for both print "FizzBuzz".',
    testCases: [
      { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz' },
      { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' },
    ],
    starterCode: {
      python: 'n = int(input())\nfor i in range(1, n+1):\n    # Write your solution\n    print(i)\n',
      javascript: 'const n = parseInt(require("fs").readFileSync("/dev/stdin", "utf8"));\nfor (let i = 1; i <= n; i++) {\n  // Write your solution\n  console.log(i);\n}\n',
    },
  },
  {
    id: 'palindrome',
    title: 'Palindrome Check',
    difficulty: 'Easy',
    description: 'Given a string, determine if it is a palindrome (ignoring case and spaces).',
    testCases: [
      { input: 'racecar', expectedOutput: 'true' },
      { input: 'hello', expectedOutput: 'false' },
      { input: 'A man a plan a canal Panama', expectedOutput: 'true' },
    ],
    starterCode: {
      python: 's = input()\n# Write your solution\n',
      javascript: 'const s = require("fs").readFileSync("/dev/stdin", "utf8").trim();\n// Write your solution\n',
    },
  },
];

export default function CodePlaygroundPage() {
  const { user } = useAuth();
  const [selectedChallenge, setSelectedChallenge] = useState(CHALLENGES[0]);
  const [language, setLanguage] = useState('python');

  const handleSubmitCode = (code: string, lang: string) => {
    toast.success('Code submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Code2 className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-xl">Code Playground</h1>
          </div>
          <Badge variant="outline" className="text-xs">
            {user?.email || 'Guest'}
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Challenges list */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Practice Challenges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CHALLENGES.map((ch) => (
                <button
                  key={ch.id}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedChallenge.id === ch.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedChallenge(ch)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{ch.title}</span>
                    <Badge
                      variant={
                        ch.difficulty === 'Easy'
                          ? 'success'
                          : ch.difficulty === 'Medium'
                          ? 'warning'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {ch.difficulty}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Problem Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{selectedChallenge.description}</p>
              {selectedChallenge.testCases.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Examples:</h4>
                  {selectedChallenge.testCases.map((tc, i) => (
                    <div key={i} className="bg-muted rounded-lg p-3 text-xs font-mono">
                      <div><span className="text-muted-foreground">Input:</span> {tc.input}</div>
                      <div><span className="text-muted-foreground">Output:</span> {tc.expectedOutput}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right - Code editor */}
        <div className="lg:col-span-2">
          <CodeSandbox
            starterCode={
              (selectedChallenge.starterCode as any)[language] || ''
            }
            language={language}
            testCases={selectedChallenge.testCases}
            onSubmit={handleSubmitCode}
          />
        </div>
      </div>
    </div>
  );
}
