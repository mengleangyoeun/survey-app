'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { surveyWithQuestionsSchema, type SurveyWithQuestionsData } from '@/lib/validations'
import { Database } from '@/lib/database.types'

type Survey = Database['public']['Tables']['surveys']['Row']
type Question = Database['public']['Tables']['questions']['Row']

type SurveyWithQuestions = Survey & {
  questions: Question[]
}



export default function EditSurvey() {
  const router = useRouter()
  const params = useParams()
  const surveyId = params.surveyId as string
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<SurveyWithQuestionsData>({
    resolver: zodResolver(surveyWithQuestionsSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      status: 'draft',
      questions: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  })

  // Load survey data
  useEffect(() => {
    async function loadSurvey() {
      try {
        // Use the already instantiated supabase client
        
        // Get survey with questions
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select(`
            *,
            questions (*)
          `)
          .eq('id', surveyId)
          .single()

        if (surveyError) throw surveyError



        setSurvey(surveyData as SurveyWithQuestions)

        // Populate form with existing data
        const formData: SurveyWithQuestionsData = {
          title: surveyData.title,
          slug: surveyData.slug,
          description: surveyData.description || '',
          status: surveyData.status as 'draft' | 'active' | 'closed',
          questions: surveyData.questions
            .sort((a: Question, b: Question) => a.order_index - b.order_index)
            .map((q: Question) => ({
              question_text: q.question_text,
              question_type: q.question_type as 'multiple_choice' | 'short_answer' | 'long_answer' | 'likert_scale' | 'file_upload',
              options: q.options ? JSON.parse(q.options as string) : undefined,
              required: q.required,
              order_index: q.order_index
            }))
        }

        reset(formData)
      } catch (err) {
        console.error('Error loading survey:', err)
        setError('Failed to load survey')
      } finally {
        setIsLoading(false)
      }
    }

    if (surveyId) {
      loadSurvey()
    }
  }, [surveyId, reset])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const addQuestion = () => {
    append({
      question_text: '',
      question_type: 'short_answer',
      required: false,
      order_index: fields.length
    })
  }

  const onSubmit = async (data: SurveyWithQuestionsData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Use regular client for client-side operations

      // Update survey
      const { error: surveyError } = await supabase
        .from('surveys')
        .update({
          title: data.title,
          slug: data.slug,
          description: data.description,
          status: data.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId)

      if (surveyError) throw surveyError

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('survey_id', surveyId)

      if (deleteError) throw deleteError

      // Insert updated questions
      const questionsToInsert = data.questions.map((question, index) => ({
        survey_id: surveyId,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options ? JSON.stringify(question.options) : null,
        required: question.required,
        order_index: index
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      router.push('/admin/dashboard')
    } catch (err) {
      console.error('Error updating survey:', err)
      // More detailed error logging
      if (err instanceof Error) {
        console.error('Error message:', err.message)
        setError(`Failed to update survey: ${err.message}`)
      } else {
        console.error('Unknown error:', err)
        setError('Failed to update survey. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
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
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-gray-600">{error}</p>
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/dashboard">
            <Button variant="outline" className="border-2 border-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-black">Edit Survey</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Survey Details */}
          <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
            <h2 className="text-2xl font-bold text-black mb-6">Survey Details</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Survey Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  className="border-2 border-black"
                  placeholder="Enter survey title"
                  onChange={(e) => {
                    register('title').onChange(e)
                    setValue('slug', generateSlug(e.target.value))
                  }}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  className="border-2 border-black"
                  placeholder="survey-url-slug"
                />
                {errors.slug && (
                  <p className="text-red-500 text-sm">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  className="border-2 border-black"
                  placeholder="Brief description of your survey"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as 'draft' | 'active' | 'closed')}
                >
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Questions */}
          <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">Questions</h2>
              <Button
                type="button"
                variant="elevated"
                className="bg-green-400 hover:bg-green-500"
                onClick={addQuestion}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No questions added yet. Click &quot;Add Question&quot; to get started.
              </div>
            ) : (
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-6 border-2 border-gray-300 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-2 border-red-500 text-red-500 hover:bg-red-50"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                          {...register(`questions.${index}.question_text`)}
                          className="border-2 border-black"
                          placeholder="Enter your question"
                        />
                        {errors.questions?.[index]?.question_text && (
                          <p className="text-red-500 text-sm">
                            {errors.questions[index]?.question_text?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={watch(`questions.${index}.question_type`)}
                          onValueChange={(value) => 
                            setValue(`questions.${index}.question_type`, value as 'multiple_choice' | 'short_answer' | 'long_answer' | 'likert_scale' | 'file_upload')
                          }
                        >
                          <SelectTrigger className="border-2 border-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_answer">Short Answer</SelectItem>
                            <SelectItem value="long_answer">Long Answer</SelectItem>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="likert_scale">Likert Scale</SelectItem>
                            <SelectItem value="file_upload">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Options for Multiple Choice Questions */}
                      {watch(`questions.${index}.question_type`) === 'multiple_choice' && (
                        <div className="space-y-2">
                          <Label>Answer Options</Label>
                          <div className="space-y-2">
                            {[0, 1, 2, 3].map((optionIndex) => (
                              <Input
                                key={optionIndex}
                                placeholder={`Option ${optionIndex + 1}`}
                                className="border-2 border-black"
                                value={watch(`questions.${index}.options.${optionIndex}`) || ''}
                                onChange={(e) => {
                                  const currentOptions = watch(`questions.${index}.options`) || []
                                  const newOptions = [...currentOptions]
                                  newOptions[optionIndex] = e.target.value
                                  setValue(`questions.${index}.options`, newOptions.filter(opt => opt && opt.trim() !== ''))
                                }}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            Add at least 2 options for multiple choice questions
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`required-${index}`}
                          checked={watch(`questions.${index}.required`)}
                          onCheckedChange={(checked) => 
                            setValue(`questions.${index}.required`, !!checked)
                          }
                        />
                        <Label htmlFor={`required-${index}`}>Required question</Label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {errors.questions && (
              <Alert className="mt-4 border-2 border-red-500 bg-red-50">
                <AlertDescription className="text-red-700">
                  {errors.questions.message}
                </AlertDescription>
              </Alert>
            )}
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="elevated"
              className="bg-blue-400 hover:bg-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Updating Survey...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Survey
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert className="border-2 border-red-500 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </div>
    </div>
  )
}
