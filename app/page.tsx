"use client"

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Settings, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

type Survey = Database['public']['Tables']['surveys']['Row'];

export default function Home() {
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchActiveSurveys()
  }, [])

  const fetchActiveSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setActiveSurveys(data || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-yellow-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <Card className="p-12 mb-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white text-center">
          <h1 className="text-6xl font-bold mb-4 text-black">
            Research Survey App
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Create, manage, and analyze research surveys with our powerful neobrutalism-styled platform. 
            Perfect for researchers, educators, and organizations.
          </p>
          <div className="flex justify-center">
            <Link href="/admin/login">
              <Button variant="elevated" className="bg-blue-400 hover:bg-blue-500 text-lg px-8 py-3">
                <Settings className="w-5 h-5 mr-2" />
                Admin Login
              </Button>
            </Link>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-400 border-2 border-black rounded-lg flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-black">Create Surveys</h3>
              <p className="text-gray-600">
                Build surveys with multiple question types: multiple choice, text, Likert scales, and file uploads.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-400 border-2 border-black rounded-lg flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-black">Collect Responses</h3>
              <p className="text-gray-600">
                Share public survey links and collect responses with progress tracking and validation.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-400 border-2 border-black rounded-lg flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-black">Analyze Results</h3>
              <p className="text-gray-600">
                View responses in tables, generate charts, and export data to CSV for further analysis.
              </p>
            </div>
          </Card>
        </div>

        {/* Active Surveys Section */}
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-black">Available Surveys</h2>
              <p className="text-lg text-gray-700">
                Participate in active research surveys
              </p>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading surveys...</p>
              </div>
            ) : activeSurveys.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No active surveys available at the moment.</p>
                <p className="text-sm text-gray-500">
                  Check back later for new research opportunities!
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {activeSurveys.map((survey) => (
                  <Card key={survey.id} className="p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-black line-clamp-2">
                          {survey.title}
                        </h3>
                        <Badge className="bg-green-400 border-2 border-green-600 text-black">
                          Active
                        </Badge>
                      </div>
                      
                      {survey.description && (
                        <p className="text-gray-600 text-sm line-clamp-3">
                          {survey.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-gray-500">
                          Created: {new Date(survey.created_at).toLocaleDateString()}
                        </span>
                        <Link href={`/survey/${survey.slug}`}>
                          <Button variant="elevated" className="bg-blue-400 hover:bg-blue-500">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Take Survey
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <p className="text-gray-600 text-sm">
              Created with ❤️ by <span className="font-bold text-black">MengLeang Yoeun</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Built with Next.js, Supabase, and Shadcn/ui
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
