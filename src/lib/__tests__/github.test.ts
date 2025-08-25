/**
 * GitHub Integration Tests
 * 
 * These tests make real API calls to GitHub to validate branch detection logic.
 * 
 * Environment Variables:
 * - GITHUB_TOKEN: Optional GitHub personal access token for higher rate limits
 *   Without token: 60 requests/hour
 *   With token: 5000 requests/hour
 * 
 * To run with token: GITHUB_TOKEN=your_token npm test github.test.ts
 * 
 * Test Structure:
 * - Unit Tests: URL validation and basic logic (no network calls)
 * - Integration Tests: Real API calls with retry logic and error handling
 */

import { getRepositoryDefaultBranch, isValidGitHubUrl } from '../github';

// Helper function to add retry logic for network calls
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Retry attempts exhausted');
}

describe('GitHub utilities', () => {
  // Set a longer timeout for all tests since we're making real API calls
  jest.setTimeout(30000);

  beforeEach(() => {
    // Keep any existing GITHUB_TOKEN for authenticated requests
    // This helps avoid rate limiting during tests
  });

  describe('isValidGitHubUrl (Unit Tests)', () => {
    it('should return true for valid GitHub URLs', () => {
      expect(isValidGitHubUrl('https://github.com/owner/repo')).toBe(true);
      expect(isValidGitHubUrl('https://github.com/owner/repo.git')).toBe(true);
      expect(isValidGitHubUrl('https://github.com/owner/repo-name')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidGitHubUrl('https://gitlab.com/owner/repo')).toBe(false);
      expect(isValidGitHubUrl('https://bitbucket.org/owner/repo')).toBe(false);
      expect(isValidGitHubUrl('not-a-url')).toBe(false);
      expect(isValidGitHubUrl('')).toBe(false);
    });
  });

  describe('getRepositoryDefaultBranch (Integration Tests - Real API)', () => {
    it('should return main for phosphobot repository', async () => {
      const result = await withRetry(async () => {
        return await getRepositoryDefaultBranch('https://github.com/phospho-app/phosphobot');
      });
      expect(result).toBe('main');
    });

    it('should return master for hotdog repository', async () => {
      const result = await withRetry(async () => {
        return await getRepositoryDefaultBranch('https://github.com/uavster/hotdog');
      });
      expect(result).toBe('master');
    });

    it('should handle .git suffix in URL', async () => {
      const result = await withRetry(async () => {
        return await getRepositoryDefaultBranch('https://github.com/phospho-app/phosphobot.git');
      });
      expect(result).toBe('main');
    });

    it('should handle invalid GitHub URL gracefully', async () => {
      const result = await getRepositoryDefaultBranch('not-a-github-url');
      expect(result).toBe('main');
    });

    it('should handle non-existent repository gracefully', async () => {
      const result = await withRetry(async () => {
        return await getRepositoryDefaultBranch('https://github.com/non-existent-owner-12345/non-existent-repo-67890');
      });
      expect(result).toBe('main'); // Should fallback to main when repo doesn't exist
    });

    it('should handle private repository (403) with fallback', async () => {
      // Test with a likely private/restricted repo pattern
      const result = await withRetry(async () => {
        return await getRepositoryDefaultBranch('https://github.com/microsoft/internal-test-repo-that-does-not-exist');
      });
      expect(['main', 'master', 'dev', 'develop', 'trunk']).toContain(result);
    });

    it('should respect GitHub token when available', async () => {
      // This test will work better if GITHUB_TOKEN is set in environment
      const tokenExists = !!process.env.GITHUB_TOKEN;
      
      const result = await withRetry(async () => {
        return await getRepositoryDefaultBranch('https://github.com/phospho-app/phosphobot');
      });
      
      expect(result).toBe('main');
      
      if (tokenExists) {
        console.log('✅ Test ran with GitHub token authentication');
      } else {
        console.log('ℹ️  Test ran without GitHub token (rate limited to 60 requests/hour)');
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const requests = Array.from({ length: 3 }, (_, i) => 
        withRetry(async () => {
          return await getRepositoryDefaultBranch(`https://github.com/phospho-app/phosphobot?test=${i}`);
        })
      );
      
      const results = await Promise.allSettled(requests);
      
      // At least one should succeed, others might fail due to rate limiting
      const successes = results.filter(r => r.status === 'fulfilled');
      expect(successes.length).toBeGreaterThan(0);
      
      // All successful results should be 'main'
      successes.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBe('main');
        }
      });
    });
  });

  describe('Edge Cases and Error Handling (Unit Tests)', () => {
    it('should handle invalid URLs', async () => {
      const testCases = [
        '',
        'not-a-url',
        'https://gitlab.com/owner/repo',
        'https://bitbucket.org/owner/repo',
        'github.com/owner/repo', // missing protocol
      ];

      for (const url of testCases) {
        const result = await getRepositoryDefaultBranch(url);
        expect(result).toBe('main');
      }
    });

    it('should handle malformed GitHub URLs', async () => {
      const testCases = [
        'https://github.com/',
        'https://github.com/owner',
        'https://github.com/owner/',
        'https://github.com//repo',
      ];

      for (const url of testCases) {
        const result = await getRepositoryDefaultBranch(url);
        expect(result).toBe('main');
      }
    });

    it('should properly clean .git suffix', () => {
      // This tests the URL processing logic without making API calls
      const urls = [
        'https://github.com/owner/repo.git',
        'https://github.com/owner/repo-name.git',
        'https://github.com/owner/repo',
      ];

      urls.forEach(url => {
        expect(isValidGitHubUrl(url)).toBe(true);
      });
    });
  });
});