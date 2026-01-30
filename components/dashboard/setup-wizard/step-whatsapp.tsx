'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepWhatsAppProps {
  botId: string
  onComplete: () => void
  onBack: () => void
}

type ConnectionState = 'connecting' | 'waiting_qr' | 'qr' | 'paired' | 'error'

interface WebSocketMessage {
  type: 'qr' | 'paired' | 'error'
  code?: string
  message?: string
}

export function StepWhatsApp({ botId, onComplete, onBack }: StepWhatsAppProps) {
  const [state, setState] = useState<ConnectionState>('connecting')
  const [qrCode, setQrCode] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const wsRef = useRef<WebSocket | null>(null)

  const connect = async () => {
    try {
      setState('connecting')
      setErrorMsg('')

      const res = await fetch(`/api/bots/${botId}/whatsapp`)
      if (!res.ok) throw new Error('Failed to get connection details')
      const { wsUrl } = await res.json()

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setState('waiting_qr')
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)
          
          if (data.type === 'qr' && data.code) {
            setQrCode(data.code)
            setState('qr')
          } else if (data.type === 'paired') {
            setState('paired')
            handlePaired()
          } else if (data.type === 'error') {
            setErrorMsg(data.message || 'Unknown error occurred')
            setState('error')
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err)
        }
      }

      ws.onerror = () => {
        setErrorMsg('Connection error. Please try again.')
        setState('error')
      }

      ws.onclose = () => {
        if (state !== 'paired') {
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect')
      setState('error')
    }
  }

  const handlePaired = async () => {
    try {
      await fetch(`/api/bots/${botId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paired' }),
      })
      
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err) {
      setErrorMsg('Paired successfully but failed to save status')
      setState('error')
    }
  }

  useEffect(() => {
    connect()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [botId])

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Connect WhatsApp</h2>
        <p className="text-muted-foreground">
          Scan the QR code to link your account
        </p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-lg border bg-muted/50 p-8 text-center">
        {state === 'connecting' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparing secure connection...</p>
          </div>
        )}

        {state === 'waiting_qr' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Waiting for QR code...</p>
          </div>
        )}

        {state === 'qr' && (
          <div className="space-y-6 w-full">
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
              <pre className="font-mono text-[10px] leading-none select-all overflow-auto max-w-full p-2 bg-white text-black whitespace-pre-wrap break-all">
                {qrCode}
              </pre>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground max-w-xs mx-auto text-left">
              <p>1. Open WhatsApp on your phone</p>
              <p>2. Go to <strong>Settings</strong> {'>'} <strong>Linked Devices</strong></p>
              <p>3. Tap <strong>Link a Device</strong></p>
              <p>4. Point your camera at the QR code</p>
            </div>
          </div>
        )}

        {state === 'paired' && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
            <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-lg">Successfully Connected!</h3>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Connection Failed</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {errorMsg}
              </p>
            </div>
            <Button onClick={connect} variant="outline" className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Platform Selection
        </Button>
      </div>
    </div>
  )
}
