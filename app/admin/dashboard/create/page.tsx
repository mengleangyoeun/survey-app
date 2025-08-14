"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { surveyWithQuestionsSchema, type SurveyWithQuestionsData } from '@/lib/validations'

export default function CreateSurvey() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SurveyWithQuestionsData>({
    resolver: zodResolver(surveyWithQuestionsSchema),
    defaultValues: {
      title: '',
      description: '',
      slug: '',
      status: 'draft',
      questions: [
        {
          question_text: '',
          question_type: 'short_answer',
          required: false,
          order_index: 0,
        }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  })

  const onSubmit = async (data: SurveyWithQuestionsData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Create survey
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: data.title,
          description: data.description,
          slug: data.slug,
          status: data.status,
          created_by: user?.email || 'Unknown User',
        })
        .select()
        .single()

      if (surveyError) throw surveyError

      // Create questions
      const questionsToInsert = data.questions.map((question, index) => ({
        survey_id: survey.id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options ? JSON.stringify(question.options) : null,
        order_index: index,
        required: question.required,
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the survey')
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = () => {
    append({
      question_text: '',
      question_type: 'short_answer',
      required: false,
      order_index: fields.length,
    })
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setValue('slug', generateSlug(title))
  }

  return (
    <div className="min-h-screen bg-yellow-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black">Create New Survey</h1>
          <p className="text-gray-700 mt-2">Build your research survey</p>
        </div>

        {error && (
          <Alert className="mb-6 border-2 border-red-500 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Survey Details */}
          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <h2 className="text-2xl font-bold mb-4">Survey Details</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Survey Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter survey title"
                  className="border-2 border-black"
                  {...register('title', {
                    onChange: handleTitleChange
                  })}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  placeholder="survey-url-slug"
                  className="border-2 border-black"
                  {...register('slug')}
                />
                {errors.slug && (
                  <p className="text-sm text-red-600">{errors.slug.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Public URL: /survey/{watch('slug')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your survey"
                  className="border-2 border-black"
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as any)}
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
          <Card className="p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Questions</h2>
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

            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Question {index + 1}</span>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-50"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <Textarea
                        placeholder="Enter your question"
                        className="border-2 border-black"
                        {...register(`questions.${index}.question_text`)}
                      />
                      {errors.questions?.[index]?.question_text && (
                        <p className="text-sm text-red-600">
                          {errors.questions[index]?.question_text?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={watch(`questions.${index}.question_type`)}
                        onValueChange={(value) => 
                          setValue(`questions.${index}.question_type`, value as any)
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
                </div>
              ))}
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="border-2 border-black"
              onClick={() => router.push('/admin/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="elevated"
              className="bg-blue-400 hover:bg-blue-500"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Survey'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
