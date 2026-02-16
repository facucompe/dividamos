import { NextResponse } from 'next/server';
import type { ExpenseData, GroupedExpenseData } from '@/types';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // format: "username/repo"
const FILE_PATH = 'data/expenses.json';

async function getFileFromGitHub(): Promise<{ content: ExpenseData | GroupedExpenseData; sha: string }> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    // Fallback to local file if GitHub not configured
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), FILE_PATH);
    const content = await fs.readFile(filePath, 'utf-8');
    return { content: JSON.parse(content), sha: '' };
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  return { content, sha: data.sha };
}

async function updateFileInGitHub(content: ExpenseData | GroupedExpenseData, sha: string): Promise<void> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    // Fallback to local file if GitHub not configured
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), FILE_PATH);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update expenses - ${new Date().toISOString()}`,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
}

export async function GET() {
  try {
    const { content } = await getFileFromGitHub();
    return NextResponse.json(content);
  } catch (error) {
    console.error('Error reading expenses:', error);
    return NextResponse.json(
      { error: 'Failed to read expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const newData: GroupedExpenseData = await request.json();
    const { sha } = await getFileFromGitHub();
    await updateFileInGitHub(newData, sha);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating expenses:', error);
    return NextResponse.json(
      { error: 'Failed to update expenses' },
      { status: 500 }
    );
  }
}
