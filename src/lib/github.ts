interface GitHubReadmeResponse {
  content?: string
  encoding?: string
  message?: string
}

export async function fetchGitHubReadme(githubUrl: string): Promise<string | null> {
  try {
    // Extract owner/repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present

    // Try to fetch README from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/readme`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Robot-Catalog-App'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No README found
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    // Get the raw markdown content directly
    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error fetching GitHub README:', error);
    throw error;
  }
}

export function isValidGitHubUrl(url: string): boolean {
  return /^https:\/\/github\.com\/[^\/]+\/[^\/]+/.test(url);
}