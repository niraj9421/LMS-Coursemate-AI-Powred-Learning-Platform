import { exec } from 'child_process';
import { promisify } from 'util';
import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);
const TIMEOUT_MS = 8000;

export interface RunResult {
  stdout: string;
  stderr: string;
  status: { description: string };
  time: string;
  memory: number;
  compile_output: string | null;
}

export const CodeRunner = {

  async run(code: string, language: string, stdin: string): Promise<RunResult> {
    const startTime = Date.now();
    try {
      let stdout = '';
      if (language === 'javascript') {
        stdout = await CodeRunner.runJavaScript(code, stdin);
      } else if (language === 'python') {
        stdout = await CodeRunner.runPython(code, stdin);
      } else {
        return {
          stdout: '',
          stderr: `"${language}" requires Judge0 API. JS and Python run locally without configuration.`,
          status: { description: 'Not Supported' },
          time: '0', memory: 0, compile_output: null,
        };
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      return { stdout: stdout.trim(), stderr: '', status: { description: 'Accepted' }, time: elapsed, memory: 0, compile_output: null };
    } catch (err: unknown) {
      const e = err as { message?: string; stderr?: string; killed?: boolean };
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      if (e.killed) return { stdout: '', stderr: 'Time Limit Exceeded', status: { description: 'Time Limit Exceeded' }, time: elapsed, memory: 0, compile_output: null };
      const errMsg = e.stderr ?? e.message ?? 'Runtime Error';
      return { stdout: '', stderr: errMsg, status: { description: 'Runtime Error' }, time: elapsed, memory: 0, compile_output: null };
    }
  },

  async runJavaScript(code: string, stdin: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputs: string[] = [];
      const lines = stdin.split('\n').filter(l => l.trim() !== '');

      const sandbox = {
        console: {
          log: (...args: unknown[]) => outputs.push(
            args.map(a => Array.isArray(a) ? JSON.stringify(a) : (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')
          ),
          error: (...args: unknown[]) => outputs.push(args.map(String).join(' ')),
        },
        JSON, Math, Array, Object, String, Number, Boolean, Map, Set,
        parseInt, parseFloat, isNaN, isFinite,
        process: { stdout: { write: (s: string) => outputs.push(s) }, env: {} },
      };

      // Provide readline and input helpers inside the sandbox
      const inputLines = JSON.stringify(lines);
      const wrappedCode = `
(function() {
  "use strict";
  const __lines = ${inputLines};
  let __i = 0;
  // Input reading helpers — students use these to read test input
  const readline = () => String(__lines[__i++] ?? '');
  const input = readline;
  const readLine = readline;
  const readInt = () => parseInt(readline());
  const readInts = () => readline().trim().replace(/[\\[\\]]/g,'').split(',').map(Number);
  const readArray = () => { try { return JSON.parse(readline()); } catch { return readline().trim().split(','); } };

  ${code}
})();
`;
      try {
        const ctx = vm.createContext(sandbox as vm.Context);
        new vm.Script(wrappedCode).runInContext(ctx, { timeout: TIMEOUT_MS });
        resolve(outputs.join('\n'));
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
          reject({ killed: true, message: 'Timeout' });
        } else {
          reject({ message: e.message ?? 'Script error' });
        }
      }
    });
  },

  async runPython(code: string, stdin: string): Promise<string> {
    const pythonCmd = await CodeRunner.getPythonCmd();
    if (!pythonCmd) {
      throw new Error('Python is not installed on this server. Use JavaScript for code execution.');
    }
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `sol_${Date.now()}.py`);
    const inputFile = path.join(tmpDir, `inp_${Date.now()}.txt`);
    try {
      fs.writeFileSync(tmpFile, code, 'utf8');
      fs.writeFileSync(inputFile, stdin, 'utf8');
      const { stdout, stderr } = await execAsync(
        `${pythonCmd} "${tmpFile}" < "${inputFile}"`,
        { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      );
      if (stderr) throw new Error(stderr);
      return stdout.trim();
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /**/ }
      try { fs.unlinkSync(inputFile); } catch { /**/ }
    }
  },

  async getPythonCmd(): Promise<string | null> {
    for (const cmd of ['python3', 'python']) {
      try { await execAsync(`${cmd} --version`); return cmd; } catch { continue; }
    }
    return null;
  },
};

logger.info('[code-runner] Local code execution (JS sandbox + Python subprocess) initialized');
