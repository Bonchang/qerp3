import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import type { MarketQuote, QuantSignal } from '@/types/api';

const execFile = promisify(execFileCallback);

export const DEFAULT_QUANT_THRESHOLD_PERCENT = 2;
const QUANT_WORKER_DIR_ENV = 'QERP3_QUANT_WORKER_DIR';
const QUANT_PYTHON_BIN_ENV = 'QERP3_QUANT_PYTHON_BIN';
const QUANT_WORKER_DIRECTORY_NAME = 'quant-worker';

interface QuantWorkerInput {
  symbol: string;
  observedPrice: number;
  referencePrice: number;
  thresholdPercent?: number;
}

function isQuantWorkerDirectory(candidate: string): boolean {
  return existsSync(path.join(candidate, 'app', 'main.py'));
}

export function normalizeQuantThresholdPercent(rawValue: string | null): number {
  if (!rawValue || rawValue.trim().length === 0) {
    return DEFAULT_QUANT_THRESHOLD_PERCENT;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error('thresholdPercent must be a non-negative number.');
  }

  return parsedValue;
}

export function deriveReferencePriceFromQuote(quote: MarketQuote): number {
  const referencePrice = quote.price - quote.change;

  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new Error('Unable to derive a positive reference price from the latest quote.');
  }

  return Number(referencePrice.toFixed(6));
}

export function buildQuantWorkerArgs(input: QuantWorkerInput): string[] {
  const normalizedSymbol = input.symbol.trim().toUpperCase();
  const thresholdPercent = input.thresholdPercent ?? DEFAULT_QUANT_THRESHOLD_PERCENT;

  return [
    '-m',
    'app.main',
    '--symbol',
    normalizedSymbol,
    '--price',
    String(input.observedPrice),
    '--reference-price',
    String(input.referencePrice),
    '--threshold-percent',
    String(thresholdPercent),
  ];
}

function buildQuantWorkerDirectoryCandidates(startPath: string): string[] {
  const candidates: string[] = [];
  let currentPath = path.resolve(startPath);

  while (true) {
    candidates.push(currentPath, path.join(currentPath, QUANT_WORKER_DIRECTORY_NAME));

    const parentPath = path.dirname(currentPath);

    if (parentPath === currentPath) {
      return candidates;
    }

    currentPath = parentPath;
  }
}

export function resolveQuantWorkerDirectory(cwd = process.cwd(), runtimeEntryPoint = process.argv[1]): string {
  const envCandidate = process.env[QUANT_WORKER_DIR_ENV]?.trim();
  const runtimeEntryDirectory = runtimeEntryPoint ? path.dirname(path.resolve(runtimeEntryPoint)) : null;
  const candidates = [
    envCandidate,
    ...buildQuantWorkerDirectoryCandidates(cwd),
    ...(runtimeEntryDirectory ? buildQuantWorkerDirectoryCandidates(runtimeEntryDirectory) : []),
  ].filter((candidate, index, values): candidate is string => {
    if (!candidate || candidate.length === 0) {
      return false;
    }

    return values.indexOf(candidate) === index;
  });

  const resolvedDirectory = candidates.find((candidate) => isQuantWorkerDirectory(candidate));

  if (!resolvedDirectory) {
    throw new Error('Unable to locate the quant-worker directory from the frontend runtime.');
  }

  return resolvedDirectory;
}

export async function runQuantWorker(input: QuantWorkerInput): Promise<QuantSignal> {
  const pythonExecutable = process.env[QUANT_PYTHON_BIN_ENV]?.trim() || 'python3';
  const workingDirectory = resolveQuantWorkerDirectory();
  const args = buildQuantWorkerArgs(input);

  const { stdout } = await execFile(pythonExecutable, args, {
    cwd: workingDirectory,
    env: process.env,
    maxBuffer: 1024 * 1024,
  });

  try {
    return JSON.parse(stdout) as QuantSignal;
  } catch {
    throw new Error('quant-worker returned invalid JSON.');
  }
}
