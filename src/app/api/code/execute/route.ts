import { NextRequest, NextResponse } from 'next/server';
import { executeCodeSchema } from '@/lib/validations';

const PISTON_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

// Language to Piston runtime mapping
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  java: { language: 'java', version: '15.0.2' },
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  'c++': { language: 'c++', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
  ruby: { language: 'ruby', version: '3.0.1' },
  php: { language: 'php', version: '8.2.3' },
};

// POST /api/code/execute - Execute code in sandbox
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = executeCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { language, code, stdin } = validation.data;

    const runtime = LANGUAGE_MAP[language.toLowerCase()];
    if (!runtime) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    // Execute via Piston API
    const response = await fetch(`${PISTON_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: `main`, content: code }],
        stdin: stdin || '',
        run_timeout: 10000, // 10s max
        compile_timeout: 10000,
        compile_memory_limit: 256000000, // 256MB
        run_memory_limit: 256000000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Piston error:', errText);
      return NextResponse.json(
        { error: 'Code execution service unavailable' },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      output: result.run?.output || '',
      stderr: result.run?.stderr || '',
      exitCode: result.run?.code ?? -1,
      signal: result.run?.signal || null,
      compileOutput: result.compile?.output || '',
      compileError: result.compile?.stderr || '',
    });
  } catch (error) {
    console.error('Code execution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
