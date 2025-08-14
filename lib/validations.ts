import { z } from 'zod'

// Survey creation/update schema
export const surveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  status: z.enum(['draft', 'active', 'closed']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

// Question schema
export const questionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['multiple_choice', 'short_answer', 'long_answer', 'likert_scale', 'file_upload']),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
  order_index: z.number().min(0),
}).refine((data) => {
  // For multiple choice questions, require at least 2 options
  if (data.question_type === 'multiple_choice') {
    return data.options && data.options.length >= 2;
  }
  return true;
}, {
  message: "Multiple choice questions must have at least 2 options",
  path: ["options"]
})

// Survey with questions schema
export const surveyWithQuestionsSchema = surveySchema.extend({
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
})

// Response submission schema
export const responseSchema = z.object({
  survey_id: z.string().uuid(),
  participant_id: z.string().optional(),
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    answer_text: z.string().optional(),
    answer_choice: z.array(z.string()).optional(),
    file_url: z.string().optional(),
  })),
})

// Admin login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type SurveyFormData = z.infer<typeof surveySchema>
export type QuestionFormData = z.infer<typeof questionSchema>
export type SurveyWithQuestionsData = z.infer<typeof surveyWithQuestionsSchema>
export type ResponseFormData = z.infer<typeof responseSchema>
export type LoginFormData = z.infer<typeof loginSchema>
