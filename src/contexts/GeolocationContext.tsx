'use client'

import React, { createContext, useContext, useState, useRef, useCallback } from 'react'

export type LocationStatus = 
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'permission_required'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'
  | 'error'

export type LocationErrorType = 
  | 'LOCATION_PERMISSION_DENIED'
  | 'LOCATION_UNAVAILABLE'
  | 'LOCATION_TIMEOUT'
  | 'LOCATION_UNSUPPORTED'
  | 'LOCATION_UNKNOWN'

export interface GeolocationState {
  status: LocationStatus
  errorType: LocationErrorType | null
  coords: GeolocationCoordinates | null
  requestLocation: (timeoutMs?: number) => Promise<GeolocationCoordinates | null>
}

const GeolocationContext = createContext<GeolocationState | undefined>(undefined)

const DEFAULT_TIMEOUT = 8000

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [errorType, setErrorType] = useState<LocationErrorType | null>(null)
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null)
  
  // Track ongoing request to handle concurrency
  const ongoingRequestRef = useRef<Promise<GeolocationCoordinates | null> | null>(null)

  const requestLocation = useCallback((timeoutMs: number = DEFAULT_TIMEOUT): Promise<GeolocationCoordinates | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      setErrorType('LOCATION_UNSUPPORTED')
      return Promise.resolve(null)
    }

    // Return existing promise if concurrent request
    if (ongoingRequestRef.current) {
      return ongoingRequestRef.current
    }

    setStatus('requesting')
    setErrorType(null)

    const promise = new Promise<GeolocationCoordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStatus('granted')
          setCoords(position.coords)
          setErrorType(null)
          ongoingRequestRef.current = null
          resolve(position.coords)
        },
        (error) => {
          let appError: LocationErrorType = 'LOCATION_UNKNOWN'
          let appStatus: LocationStatus = 'error'

          if (error.code === error.PERMISSION_DENIED) {
            appError = 'LOCATION_PERMISSION_DENIED'
            appStatus = 'denied'
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            appError = 'LOCATION_UNAVAILABLE'
            appStatus = 'unavailable'
          } else if (error.code === error.TIMEOUT) {
            appError = 'LOCATION_TIMEOUT'
            appStatus = 'timeout'
          }

          setStatus(appStatus)
          setErrorType(appError)
          ongoingRequestRef.current = null
          resolve(null)
        },
        { timeout: timeoutMs, enableHighAccuracy: true }
      )
    })

    ongoingRequestRef.current = promise
    return promise
  }, [])

  return (
    <GeolocationContext.Provider value={{ status, errorType, coords, requestLocation }}>
      {children}
    </GeolocationContext.Provider>
  )
}

export function useGeolocation() {
  const context = useContext(GeolocationContext)
  if (context === undefined) {
    throw new Error('useGeolocation must be used within a GeolocationProvider')
  }
  return context
}
