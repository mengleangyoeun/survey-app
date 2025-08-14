"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, BarChart3, Trash2, Edit, LogOut, Home } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/database.types'

type Survey = Database['public']['Tables']['surveys']['Row']

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin/login')
    }
  }, [router])

  const fetchSurveys = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSurveys(data || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
    fetchSurveys()
  }, [checkAuth, fetchSurveys])

  const deleteSurvey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this survey?')) return

    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSurveys(surveys.filter(survey => survey.id !== id))
    } catch (error) {
      console.error('Error deleting survey:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-400 border-green-600'
      case 'draft': return 'bg-yellow-400 border-yellow-600'
      case 'closed': return 'bg-red-400 border-red-600'
      default: return 'bg-gray-400 border-gray-600'
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yellow-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">Survey Dashboard</h1>
            <p className="text-gray-700 mt-2">Manage your research surveys</p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" className="border-2 border-black">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/admin/dashboard/create">
              <Button variant="elevated" className="bg-green-400 hover:bg-green-500">
                <Plus className="w-4 h-4 mr-2" />
                Create Survey
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="border-2 border-black hover:bg-red-50"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {surveys.length === 0 ? (
          <Card className="p-12 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
            <h2 className="text-2xl font-bold mb-4">No surveys yet</h2>
            <p className="text-gray-600 mb-6">Create your first survey to get started</p>
            <Link href="/admin/dashboard/create">
              <Button variant="elevated" className="bg-blue-400 hover:bg-blue-500">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Survey
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <Card key={survey.id} className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-black line-clamp-2">
                      {survey.title}
                    </h3>
                    <Badge className={`border-2 text-black ${getStatusColor(survey.status)}`}>
                      {survey.status}
                    </Badge>
                  </div>

                  {survey.description && (
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {survey.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Created: {new Date(survey.created_at).toLocaleDateString()}</div>
                    {survey.created_by && (
                      <div>Created by: {survey.created_by}</div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/survey/${survey.slug}`} target="_blank">
                      <Button size="sm" variant="outline" className="border-2 border-black">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/admin/dashboard/edit/${survey.id}`}>
                      <Button size="sm" variant="outline" className="border-2 border-black">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/admin/dashboard/${survey.id}`}>
                      <Button size="sm" variant="outline" className="border-2 border-black">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Results
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-2 border-black"
                      onClick={() => deleteSurvey(survey.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
