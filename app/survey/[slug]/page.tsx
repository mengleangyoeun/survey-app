"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { responseSchema, type ResponseFormData } from '@/lib/validations'
import { Database } from '@/lib/database.types'

type Survey = Database['public']['Tables']['surveys']['Row']
type Question = Database['public']['Tables']['questions']['Row']

interface SurveyWithQuestions extends Survey {
  questions: Question[]
}

export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSurvey()
  }, [slug])

  const fetchSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

      if (surveyError) throw new Error('Survey not found or not active')

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyData.id)
        .order('order_index')

      if (questionsError) throw questionsError

      setSurvey({
        ...surveyData,
        questions: questionsData || []
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load survey')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const validateCurrentQuestion = () => {
    if (!survey) return false
    const currentQuestion = survey.questions[currentQuestionIndex]
    if (!currentQuestion.required) return true
    
    const answer = answers[currentQuestion.id]
    return answer !== undefined && answer !== '' && answer !== null
  }

  const nextQuestion = () => {
    if (!validateCurrentQuestion()) {
      setError('Please answer this required question before continuing')
      return
    }
    setError(null)
    setCurrentQuestionIndex(prev => prev + 1)
  }

  const previousQuestion = () => {
    setError(null)
    setCurrentQuestionIndex(prev => prev - 1)
  }

  const submitSurvey = async () => {
    if (!survey) return
    
    // Validate all required questions
    const missingRequired = survey.questions.filter(q => 
      q.required && (answers[q.id] === undefined || answers[q.id] === '' || answers[q.id] === null)
    )
    
    if (missingRequired.length > 0) {
      setError(`Please answer all required questions: ${missingRequired.map(q => q.question_text).join(', ')}`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create response
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert({
          survey_id: survey.id,
          participant_id: null, // Anonymous for now
        })
        .select()
        .single()

      if (responseError) throw responseError

      // Create answers
      const answersToInsert = Object.entries(answers).map(([questionId, answer]) => ({
        response_id: response.id,
        question_id: questionId,
        answer_text: typeof answer === 'string' ? answer : null,
        answer_choice: typeof answer === 'object' ? JSON.stringify(answer) : null,
      }))

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert)

      if (answersError) throw answersError

      router.push('/survey/thank-you')
    } catch (err: any) {
      setError(err.message || 'Failed to submit survey')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || ''

    switch (question.question_type) {
      case 'short_answer':
        return (
          <Input
            placeholder="Your answer"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="border-2 border-black focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'long_answer':
        return (
          <Textarea
            placeholder="Your detailed answer"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="border-2 border-black focus:ring-2 focus:ring-blue-500 min-h-24"
          />
        )

      case 'multiple_choice':
        const options = question.options ? JSON.parse(question.options as string) : []
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleAnswerChange(question.id, val)}
            className="space-y-3"
          >
            {options.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`} className="text-base">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case 'likert_scale':
        const scales = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleAnswerChange(question.id, val)}
            className="space-y-3"
          >
            {scales.map((scale, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={scale} id={`${question.id}-scale-${index}`} />
                <Label htmlFor={`${question.id}-scale-${index}`} className="text-base">
                  {scale}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case 'file_upload':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleAnswerChange(question.id, file.name)
                }
              }}
              className="border-2 border-black"
            />
            <p className="text-sm text-gray-500">Upload a file to answer this question</p>
          </div>
        )

      default:
        return <p>Unsupported question type</p>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="text-2xl font-bold text-center">Loading survey...</div>
        </Card>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center p-8">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white max-w-md">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Survey Not Found</h1>
            <p className="text-gray-600">
              The survey you're looking for doesn't exist or is not currently active.
            </p>
            <Button 
              variant="elevated" 
              className="bg-blue-400 hover:bg-blue-500"
              onClick={() => router.push('/')}
            >
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!survey) return null

  const currentQuestion = survey.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100
  const isLastQuestion = currentQuestionIndex === survey.questions.length - 1

  return (
    <div className="min-h-screen bg-yellow-100 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Survey Header */}
        <Card className="p-8 mb-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-black">{survey.title}</h1>
            {survey.description && (
              <p className="text-lg text-gray-700">{survey.description}</p>
            )}
          </div>
        </Card>

        {/* Progress Bar */}
        <Card className="p-4 mb-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Question {currentQuestionIndex + 1} of {survey.questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-3 border-2 border-black" />
          </div>
        </Card>

        {/* Question Card */}
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-black mb-2">
                {currentQuestion.question_text}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </h2>
            </div>

            {error && (
              <Alert className="border-2 border-red-500 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {renderQuestion(currentQuestion)}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                className="border-2 border-black"
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  variant="elevated"
                  className="bg-green-400 hover:bg-green-500"
                  onClick={submitSurvey}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Survey
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="elevated"
                  className="bg-blue-400 hover:bg-blue-500"
                  onClick={nextQuestion}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
