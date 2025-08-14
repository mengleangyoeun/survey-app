"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, Home, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function ThankYouPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yellow-100 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.6,
          ease: "easeOut"
        }}
        className="w-full max-w-2xl"
      >
        <Card className="p-12 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.3,
              duration: 0.5,
              type: "spring",
              stiffness: 200
            }}
            className="mb-8"
          >
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-6"
          >
            <h1 className="text-5xl font-bold text-black mb-4">
              Thank You!
            </h1>
            
            <p className="text-xl text-gray-700 leading-relaxed">
              Your response has been successfully submitted. We appreciate you taking the time to participate in our research survey.
            </p>

            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 my-8">
              <h2 className="text-lg font-bold text-yellow-800 mb-2">
                What happens next?
              </h2>
              <ul className="text-yellow-700 text-left space-y-2">
                <li>• Your responses are being processed and analyzed</li>
                <li>• All data is kept confidential and secure</li>
                <li>• Results may be used for research purposes</li>
                <li>• You may be contacted if follow-up is needed</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link href="/">
                <Button 
                  variant="elevated" 
                  className="bg-blue-400 hover:bg-blue-500 w-full sm:w-auto"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
              
              <Link href="/">
                <Button 
                  variant="outline" 
                  className="border-2 border-black w-full sm:w-auto"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Take Another Survey
                </Button>
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="pt-8 border-t-2 border-gray-200"
            >
              <p className="text-sm text-gray-500">
                Survey powered by Research Survey App
              </p>
            </motion.div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}
