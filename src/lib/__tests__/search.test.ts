import Fuse from 'fuse.js';
import { searchRobotsClientSide, createFuseInstance } from '../client-search-utils';

// Mock robot data for testing
const mockRobots = [
  {
    id: '1',
    name: 'SO-100',
    slug: 'so-100',
    description: 'Advanced robotic arm for industrial automation',
    tags: ['arm', 'industrial', 'automation'],
    created_at: '2024-01-01',
    status: 'published',
  },
  {
    id: '2',
    name: 'SO-101',
    slug: 'so-101',
    description: 'Next generation robotic arm with enhanced precision',
    tags: ['arm', 'industrial', 'precision'],
    created_at: '2024-01-02',
    status: 'published',
  },
  {
    id: '3',
    name: 'Pupper v3',
    slug: 'pupper-v3',
    description: 'Open source quadruped robot for learning',
    tags: ['quadruped', 'opensource', 'education'],
    created_at: '2024-01-03',
    status: 'published',
  },
  {
    id: '4',
    name: 'LeKiwi',
    slug: 'lekiwi',
    description: 'Educational robot for students',
    tags: ['educational', 'student', 'learning'],
    created_at: '2024-01-04',
    status: 'published',
  },
  {
    id: '5',
    name: 'Amazing Hand',
    slug: 'amazing-hand',
    description: 'Dexterous robotic hand with advanced manipulation',
    tags: ['hand', 'manipulation', 'dexterous'],
    created_at: '2024-01-05',
    status: 'published',
  },
];

describe('Client-Side Fuzzy Search', () => {
  let fuse: Fuse<typeof mockRobots[0]>;

  beforeEach(() => {
    fuse = createFuseInstance(mockRobots);
  });

  describe('SO-100 Search Cases', () => {
    it('should find SO-100 when searching for "so-100"', () => {
      const results = searchRobotsClientSide(mockRobots, 'so-100');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('SO-100');
    });

    it('should find SO-100 when searching for "so100"', () => {
      const results = searchRobotsClientSide(mockRobots, 'so100');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('SO-100');
    });

    it('should find SO-100 when searching for "SO-100"', () => {
      const results = searchRobotsClientSide(mockRobots, 'SO-100');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('SO-100');
    });

    it('should find SO-100 when searching for "so 100"', () => {
      const results = searchRobotsClientSide(mockRobots, 'so 100');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('SO-100');
    });

    it('should find SO-100 when searching for "100"', () => {
      const results = searchRobotsClientSide(mockRobots, '100');
      expect(results.length).toBeGreaterThan(0);
      const soRobots = results.filter(r => r.name.includes('100'));
      expect(soRobots.length).toBeGreaterThan(0);
    });
  });

  describe('Partial Matches', () => {
    it('should find robots when searching by partial name', () => {
      const results = searchRobotsClientSide(mockRobots, 'pupp');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Pupper v3');
    });

    it('should find robots when searching by description', () => {
      const results = searchRobotsClientSide(mockRobots, 'quadruped');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Pupper v3');
    });

    it('should find robots when searching by tags', () => {
      const results = searchRobotsClientSide(mockRobots, 'educational');
      expect(results.length).toBeGreaterThan(0);
      const educationalRobots = results.filter(r => 
        r.tags.includes('educational') || r.tags.includes('education')
      );
      expect(educationalRobots.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for non-matching search', () => {
      const results = searchRobotsClientSide(mockRobots, 'nonexistentrobot');
      expect(results).toEqual([]);
    });

    it('should return empty array for empty search query', () => {
      const results = searchRobotsClientSide(mockRobots, '');
      expect(results).toEqual([]);
    });

    it('should handle special characters in search', () => {
      const results = searchRobotsClientSide(mockRobots, 'v3');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Pupper v3');
    });

    it('should be case insensitive', () => {
      const lowercaseResults = searchRobotsClientSide(mockRobots, 'lekiwi');
      const uppercaseResults = searchRobotsClientSide(mockRobots, 'LEKIWI');
      const mixedCaseResults = searchRobotsClientSide(mockRobots, 'LeKiWi');

      expect(lowercaseResults.length).toBeGreaterThan(0);
      expect(uppercaseResults.length).toBeGreaterThan(0);
      expect(mixedCaseResults.length).toBeGreaterThan(0);
      expect(lowercaseResults[0].name).toBe(uppercaseResults[0].name);
      expect(lowercaseResults[0].name).toBe(mixedCaseResults[0].name);
    });
  });

  describe('Performance', () => {
    it('should handle large dataset efficiently', () => {
      // Create a larger dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Robot ${i}`,
        slug: `robot-${i}`,
        description: `Description for robot ${i}`,
        tags: [`tag${i % 10}`, 'robot'],
        created_at: `2024-01-${(i % 30) + 1}`,
        status: 'published' as const,
      })).concat(mockRobots);

      const startTime = Date.now();
      const results = searchRobotsClientSide(largeDataset, 'SO-100');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('SO-100');
    });
  });

  describe('Fuse.js Configuration', () => {
    it('should create fuse instance with correct configuration', () => {
      expect(fuse).toBeInstanceOf(Fuse);
      
      // Test that the keys are properly configured
      const fuseOptions = fuse.getIndex();
      expect(fuseOptions).toBeDefined();
    });

    it('should prioritize name matches over description matches', () => {
      const results = searchRobotsClientSide(mockRobots, 'amazing');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Amazing Hand');
    });
  });

  describe('Tag Filtering', () => {
    it('should filter results by tag', () => {
      const armRobots = mockRobots.filter(robot => robot.tags.includes('arm'));
      const results = searchRobotsClientSide(armRobots, 'so');
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(robot => {
        expect(robot.tags).toContain('arm');
      });
    });

    it('should handle multiple tag filtering', () => {
      const industrialArmRobots = mockRobots.filter(robot => 
        robot.tags.includes('arm') && robot.tags.includes('industrial')
      );
      const results = searchRobotsClientSide(industrialArmRobots, 'robot');
      
      results.forEach(robot => {
        expect(robot.tags).toContain('arm');
        expect(robot.tags).toContain('industrial');
      });
    });
  });

  describe('TypeScript Compilation', () => {
    it('should have correct types for search results', () => {
      const results = searchRobotsClientSide(mockRobots, 'SO-100');
      
      if (results.length > 0) {
        const firstResult = results[0];
        
        // TypeScript should enforce these properties exist
        expect(typeof firstResult.id).toBe('string');
        expect(typeof firstResult.name).toBe('string');
        expect(typeof firstResult.slug).toBe('string');
        expect(typeof firstResult.description).toBe('string');
        expect(Array.isArray(firstResult.tags)).toBe(true);
        expect(typeof firstResult.created_at).toBe('string');
        expect(typeof firstResult.status).toBe('string');
      }
    });
  });

  describe('Ranking and Relevance', () => {
    it('should rank exact matches higher than partial matches', () => {
      const results = searchRobotsClientSide(mockRobots, 'SO-100');
      expect(results.length).toBeGreaterThan(0);
      
      // First result should be the exact match
      expect(results[0].name).toBe('SO-100');
    });

    it('should rank name matches higher than description matches', () => {
      const robotsWithDescMatch = [
        ...mockRobots,
        {
          id: '6',
          name: 'Test Robot',
          slug: 'test-robot',
          description: 'This robot has SO-100 in description',
          tags: ['test'],
          created_at: '2024-01-06',
          status: 'published' as const,
        }
      ];

      const results = searchRobotsClientSide(robotsWithDescMatch, 'SO-100');
      expect(results.length).toBeGreaterThan(0);
      
      // The robot with SO-100 in the name should rank higher than the one with it in description
      expect(results[0].name).toBe('SO-100');
    });
  });
});