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

/**
 * Detect the default branch of a GitHub repository
 * Returns 'main' or 'master' based on what the repo uses
 */
export async function getRepositoryDefaultBranch(githubUrl: string): Promise<string> {
  try {
    // Extract owner/repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return 'main'; // Default fallback
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present

    // Fetch repository info from GitHub API to get default branch
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Robot-Catalog-App',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    if (!response.ok) {
      // If API call fails, try both branches to see which one works
      return await detectBranchByTesting(owner, cleanRepo);
    }

    const repoData = await response.json();
    return repoData.default_branch || 'main';
  } catch (error) {
    console.error('Error getting repository default branch:', error);
    // Fallback: try to detect by testing both branches
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');
      return await detectBranchByTesting(owner, cleanRepo);
    }
    return 'main'; // Ultimate fallback
  }
}

/**
 * Detect branch by testing which one has a README
 */
async function detectBranchByTesting(owner: string, repo: string): Promise<string> {
  // Test common branch names in order of likelihood
  const branchesToTest = ['main', 'master', 'dev', 'develop', 'trunk'];
  
  for (const branch of branchesToTest) {
    try {
      const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme?ref=${branch}`;
      const response = await fetch(readmeUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Robot-Catalog-App',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
        }
      });
      
      if (response.ok) {
        return branch;
      }
    } catch (error) {
      // Continue to next branch
    }
  }
  
  return 'main'; // Default fallback
}