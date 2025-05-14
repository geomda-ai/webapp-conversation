'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import './styles.css'

// Types for the component
type ArcGISMapProps = {
  latitude?: number | string
  longitude?: number | string
  zoom?: number | string
  basemap?: string
  height?: string
  width?: string
  yamlConfig?: ArcGISMapYAMLConfig
}

// Type for YAML configuration
type ArcGISMapYAMLConfig = {
  center?: [number, number] | string
  zoom?: number
  basemap?: string
  ui?: {
    attribution?: boolean
    slider?: boolean
    zoom?: boolean
    compass?: boolean
    home?: boolean
    legend?: boolean
    layerList?: boolean
    basemapToggle?: boolean
    scaleBar?: boolean
  }
  services?: any[]
  token?: string
  options?: {
    minZoom?: number
    maxZoom?: number
  }
}

// Dynamically import the ArcGIS loader component (client-side only)
const ArcGISMapLoader = dynamic(() => import('./map-loader'), {
  ssr: false,
})

/**
 * ArcGIS Map component
 * This component loads the ArcGIS JavaScript API map
 */
export function ArcGISMap({
  latitude = 0,
  longitude = 0,
  height = '400px',
  width = '100%',
  yamlConfig,
}: ArcGISMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Convert string values to numbers if needed
  const numLatitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude
  const numLongitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude

  // Validate input coordinates
  useEffect(() => {
    if (numLatitude < -90 || numLatitude > 90 || numLongitude < -180 || numLongitude > 180) {
      setLoadError(`Invalid coordinates: Latitude ${numLatitude}, Longitude ${numLongitude}`)
      setIsLoading(false)
    }
  }, [numLatitude, numLongitude])

  return (
    <div
      className="arcgis-map-container"
      style={{
        height,
        width,
        position: 'relative',
      }}
    >
      {/* Map container */}
      <div
        ref={mapRef}
        className="arcgis-map-content"
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        {/* Client-side only loader */}
        {typeof window !== 'undefined' && !loadError && (
          <ArcGISMapLoader
            mapRef={mapRef}
            yamlConfig={yamlConfig}
            setLoading={setIsLoading}
          />
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="arcgis-map-loading">
          <div>Loading map...</div>
        </div>
      )}

      {/* Error message */}
      {loadError && (
        <div className="arcgis-map-error">
          <div>Error: {loadError}</div>
        </div>
      )}
    </div>
  )
}

export default ArcGISMap
