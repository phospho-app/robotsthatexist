"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface SeedResult {
  success?: string;
  error?: string;
  info?: string;
}

export default function AdminSeedPage() {
  const { user, profile, loading } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<SeedResult[]>([]);

  // Redirect if not admin
  if (!loading && (!user || profile?.role !== 'admin')) {
    redirect('/');
  }

  const handleSeedData = async () => {
    setIsSeeding(true);
    setResults([]);

    try {
      const response = await fetch('/api/seed-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
      } else {
        setResults([{ error: data.error || 'Unknown error occurred' }]);
      }
    } catch (error: any) {
      setResults([{ error: `Network error: ${error.message}` }]);
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Database className="h-8 w-8 mr-3 text-primary" />
            Database Seeding
          </h1>
          <p className="text-muted-foreground">
            Add sample files and social links to existing robots in the database.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seed Sample Data</CardTitle>
            <CardDescription>
              This will add URDF files, STL files, and social links to existing robots like SOARM100 and Phosphobot Starter Pack.
              Existing data will not be duplicated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="w-full"
              size="lg"
            >
              {isSeeding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Seeding Data...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Seed Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Seeding Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {result.success && (
                      <>
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-primary">{result.success}</p>
                      </>
                    )}
                    {result.error && (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-red-700 dark:text-red-400">{result.error}</p>
                      </>
                    )}
                    {result.info && (
                      <>
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-700 dark:text-blue-400">{result.info}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}