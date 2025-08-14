"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Download, Filter, Eye, BarChart3, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Database } from '@/lib/database.types'

type Survey = Database['public']['Tables']['surveys']['Row']
type Question = Database['public']['Tables']['questions']['Row']
type Response = Database['public']['Tables']['responses']['Row']
type Answer = Database['public']['Tables']['answers']['Row']

interface SurveyWithQuestions extends Survey {
  questions: Question[]
}

interface ResponseWithAnswers extends Response {
  answers: Answer[]
}

interface AnalyticsData {
  totalResponses: number
  completionRate: number
  averageTime: number
  responsesByDay: { date: string; responses: number }[]
  questionAnalytics: {
    questionId: string
    questionText: string
    questionType: string
    responses: any[]
    chartData: any[]
  }[]
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

export default function SurveyResultsPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null)
  const [responses, setResponses] = useState<ResponseWithAnswers[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentView, setCurrentView] = useState<'responses' | 'analytics'>('analytics')

  useEffect(() => {
    checkAuth()
    fetchSurveyData()
  }, [surveyId])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin/login')
    }
  }

  const fetchSurveyData = async () => {
    try {
      // Fetch survey with questions
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single()

      if (surveyError) throw surveyError

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index')

      if (questionsError) throw questionsError

      setSurvey({
        ...surveyData,
        questions: questionsData || []
      })

      // Fetch responses with answers
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          answers (*)
        `)
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })

      if (responsesError) throw responsesError

      const formattedResponses = responsesData?.map(response => ({
        ...response,
        answers: response.answers || []
      })) || []

      setResponses(formattedResponses)

      // Generate analytics
      generateAnalytics(surveyData, questionsData || [], formattedResponses)

    } catch (error) {
      console.error('Error fetching survey data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAnalytics = (surveyData: Survey, questions: Question[], responses: ResponseWithAnswers[]) => {
    const totalResponses = responses.length
    const completionRate = 100 // Assuming all fetched responses are complete

    // Responses by day (last 7 days)
    const responsesByDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = format(date, 'MMM dd')
      const dayResponses = responses.filter(r => 
        format(new Date(r.submitted_at), 'MMM dd') === dateStr
      ).length
      return { date: dateStr, responses: dayResponses }
    }).reverse()

    // Question analytics
    const questionAnalytics = questions.map(question => {
      const questionResponses = responses.flatMap(r => 
        r.answers.filter(a => a.question_id === question.id)
      )

      let chartData: any[] = []

      if (question.question_type === 'multiple_choice' || question.question_type === 'likert_scale') {
        const answerCounts: Record<string, number> = {}
        questionResponses.forEach(answer => {
          const choice = answer.answer_choice ? JSON.parse(answer.answer_choice as string) : answer.answer_text
          const key = Array.isArray(choice) ? choice[0] : choice
          answerCounts[key] = (answerCounts[key] || 0) + 1
        })

        chartData = Object.entries(answerCounts).map(([answer, count]) => ({
          answer: answer?.substring(0, 20) + (answer?.length > 20 ? '...' : ''),
          count,
          fullAnswer: answer
        }))
      }

      return {
        questionId: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        responses: questionResponses,
        chartData
      }
    })

    setAnalytics({
      totalResponses,
      completionRate,
      averageTime: 0, // Would need to track timing
      responsesByDay,
      questionAnalytics
    })
  }

  const exportToCSV = () => {
    if (!survey || !responses.length) return

    const headers = ['Response ID', 'Submitted At', ...survey.questions.map(q => q.question_text)]
    const rows = responses.map(response => {
      const row = [response.id, format(new Date(response.submitted_at), 'yyyy-MM-dd HH:mm:ss')]
      
      survey.questions.forEach(question => {
        const answer = response.answers.find(a => a.question_id === question.id)
        let answerValue = ''
        
        if (answer) {
          if (answer.answer_text) {
            answerValue = answer.answer_text
          } else if (answer.answer_choice) {
            const choice = JSON.parse(answer.answer_choice as string)
            answerValue = Array.isArray(choice) ? choice.join(', ') : choice
          }
        }
        
        row.push(answerValue)
      })
      
      return row
    })

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${survey.slug}-responses.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center">
        <div className="text-2xl font-bold">Loading survey results...</div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center p-8">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Survey Not Found</h1>
            <Link href="/admin/dashboard">
              <Button variant="elevated" className="bg-blue-400 hover:bg-blue-500">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yellow-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" className="border-2 border-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-black">{survey.title}</h1>
              <div className="text-gray-700 mt-1 space-y-1">
                <p>Survey Results & Analytics</p>
                {survey.created_by && (
                  <p className="text-sm">Created by: {survey.created_by}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant={currentView === 'analytics' ? 'elevated' : 'outline'}
              className={currentView === 'analytics' ? 'bg-blue-400 hover:bg-blue-500' : 'border-2 border-black'}
              onClick={() => setCurrentView('analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={currentView === 'responses' ? 'elevated' : 'outline'}
              className={currentView === 'responses' ? 'bg-blue-400 hover:bg-blue-500' : 'border-2 border-black'}
              onClick={() => setCurrentView('responses')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Responses
            </Button>
            <Button
              variant="elevated"
              className="bg-green-400 hover:bg-green-500"
              onClick={exportToCSV}
              disabled={!responses.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-400 border-2 border-black rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold text-black">{analytics?.totalResponses || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-400 border-2 border-black rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-black">{analytics?.completionRate || 0}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400 border-2 border-black rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-2xl font-bold text-black">{survey.questions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="flex items-center gap-4">
              <Badge className={`px-3 py-1 border-2 text-black ${
                survey.status === 'active' ? 'bg-green-400 border-green-600' :
                survey.status === 'draft' ? 'bg-yellow-400 border-yellow-600' :
                'bg-red-400 border-red-600'
              }`}>
                {survey.status.toUpperCase()}
              </Badge>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold text-black">Survey {survey.status}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content based on current view */}
        {currentView === 'analytics' && analytics && (
          <div className="space-y-8">
            {/* Responses Over Time */}
            <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <h2 className="text-2xl font-bold text-black mb-4">Responses Over Time (Last 7 Days)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.responsesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responses" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Question Analytics */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-black">Question Analytics</h2>
              {analytics.questionAnalytics.map((qa, index) => (
                <Card key={qa.questionId} className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-black mb-2">
                      Q{index + 1}: {qa.questionText}
                    </h3>
                    <Badge className="bg-gray-200 border-2 border-gray-400 text-black">
                      {qa.questionType.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="ml-2 text-sm text-gray-600">
                      {qa.responses.length} responses
                    </span>
                  </div>

                  {qa.chartData.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {qa.questionType === 'multiple_choice' || qa.questionType === 'likert_scale' ? (
                          <PieChart>
                            <Pie
                              data={qa.chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ answer, count }) => `${answer}: ${count}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {qa.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-600">Text responses cannot be visualized in charts.</p>
                            <p className="text-sm text-gray-500 mt-2">
                              View individual responses in the "Responses" tab.
                            </p>
                          </div>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentView === 'responses' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-2 border-black max-w-xs"
                />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="border-2 border-black max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Responses</SelectItem>
                    <SelectItem value="recent">Recent (Last 7 days)</SelectItem>
                    <SelectItem value="older">Older</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Responses Table */}
            <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-black mb-4">Individual Responses</h2>
                {responses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xl text-gray-600 mb-4">No responses yet</p>
                    <p className="text-gray-500">Share your survey link to start collecting responses!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">Response ID</TableHead>
                          <TableHead className="font-bold">Submitted</TableHead>
                          {survey.questions.slice(0, 3).map((question, index) => (
                            <TableHead key={question.id} className="font-bold">
                              Q{index + 1}: {question.question_text.substring(0, 30)}...
                            </TableHead>
                          ))}
                          <TableHead className="font-bold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {responses.slice(0, 10).map((response) => (
                          <TableRow key={response.id}>
                            <TableCell className="font-mono text-xs">
                              {response.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              {format(new Date(response.submitted_at), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            {survey.questions.slice(0, 3).map((question) => {
                              const answer = response.answers.find(a => a.question_id === question.id)
                              let displayValue = 'No answer'
                              
                              if (answer) {
                                if (answer.answer_text) {
                                  displayValue = answer.answer_text.substring(0, 50) + 
                                    (answer.answer_text.length > 50 ? '...' : '')
                                } else if (answer.answer_choice) {
                                  const choice = JSON.parse(answer.answer_choice as string)
                                  displayValue = Array.isArray(choice) ? choice.join(', ') : choice
                                }
                              }
                              
                              return (
                                <TableCell key={question.id} className="max-w-xs truncate">
                                  {displayValue}
                                </TableCell>
                              )
                            })}
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-2 border-black">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {responses.length > 10 && (
                      <div className="mt-4 text-center">
                        <p className="text-gray-600">
                          Showing 10 of {responses.length} responses. Export CSV to see all data.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
