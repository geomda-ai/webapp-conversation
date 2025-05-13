import React, { useEffect, useRef, useState } from 'react'
import './styles.css'

// Define props type
type ArcGISMapProps = {
  latitude?: number | string
  longitude?: number | string
  zoom?: number | string
  basemap?: string
  height?: string
  width?: string
}

/**
 * ArcGIS Map component that uses the latest ArcGIS JavaScript API
 * with proper handling for Next.js server-side rendering
 */
export function ArcGISMap({
  latitude = 0,
  longitude = 0,
  zoom = 4,
  basemap = 'osm',
  height = '400px',
  width = '100%',
}: ArcGISMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [_mapView, setMapView] = useState<any>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Convert string values to numbers if needed
  const numLatitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude
  const numLongitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude
  const numZoom = typeof zoom === 'string' ? parseFloat(zoom) : zoom
  // Load and initialize the map
  useEffect(() => {
    // Validate input coordinates
    if (numLatitude < -90 || numLatitude > 90 || numLongitude < -180 || numLongitude > 180) {
      setLoadError(`Invalid coordinates: Latitude ${numLatitude}, Longitude ${numLongitude}`)
      setIsLoading(false)
      return
    }

    if (!mapRef.current) {
      setLoadError('Map container ref is null')
      setIsLoading(false)
      return
    }

    // Create and initialize the map
    let cleanup: (() => void) | undefined

    // Use dynamic import to ensure ArcGIS modules are only loaded client-side
    const initializeMap = async () => {
      try {
        console.log(`Initializing map with lat: ${numLatitude}, lng: ${numLongitude}, zoom: ${numZoom}, basemap: ${basemap}`)

        // ArcGIS API can throw errors when basemaps require authentication
        // Default basemaps that work without API key: 'osm', 'satellite', 'hybrid', 'gray', 'dark-gray', 'oceans', 'terrain'
        try {
          if (!['osm', 'satellite', 'hybrid', 'gray', 'dark-gray', 'oceans', 'terrain'].includes(basemap)) {
            console.warn(`Basemap '${basemap}' might require authentication. Falling back to 'osm'`)
            basemap = 'osm'
          }
        }
        catch (e) {
          console.warn('Error checking basemap, falling back to osm:', e)
          basemap = 'osm'
        }
        // Dynamic import of ArcGIS modules
        const { default: Map } = await import('@arcgis/core/Map')
        const { default: MapView } = await import('@arcgis/core/views/MapView')
        const { default: _config } = await import('@arcgis/core/config')

        // Configure API
        // NOTE: In a production app, you'd want to use an environment variable for this
        // config.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY

        // Create the map
        const map = new Map({
          basemap,
        })

        // Create the view
        const view = new MapView({
          container: mapRef.current,
          map,
          center: [numLongitude, numLatitude],
          zoom: numZoom,
        })

        // Wait for the view to load
        view.when(() => {
          console.log('Map view is ready')
          setIsLoading(false)
        })

        // Store the view in the ref to ensure proper cleanup
        setMapView(view)

        // Cleanup function to properly destroy the map when component unmounts
        cleanup = () => {
          if (view) {
            try {
              // Properly clean up event listeners and DOM elements to avoid React conflicts
              view.container = null
              view.destroy()
            }
            catch (err) {
              console.warn('Error during map cleanup:', err)
            }
          }
        }
      }
      catch (error) {
        console.error('Error initializing ArcGIS map:', error)
        setLoadError(`Error loading map: ${error instanceof Error ? error.message : String(error)}`)
        setIsLoading(false)
      }
    }

    // Only run on the client side
    if (typeof window !== 'undefined')
      initializeMap()

    // Cleanup on unmount
    return () => {
      if (cleanup)
        cleanup()
    }
  }, [numLatitude, numLongitude, numZoom, basemap]) // Re-initialize when these props change

  // Update view properties when they change - disabled to avoid React DOM conflicts
  // useEffect(() => {
  //   if (mapView) {
  //     // Update center and zoom if the view exists and props change
  //     mapView.center = [numLongitude, numLatitude]
  //     mapView.zoom = numZoom
  //   }
  // }, [mapView, numLatitude, numLongitude, numZoom])

  // Calculate size classes based on height prop
  let sizeClass = 'map-md'
  if (height) {
    const heightValue = parseInt(String(height))
    if (heightValue <= 300)
      sizeClass = 'map-sm'

    else if (heightValue >= 500)
      sizeClass = 'map-lg'
  }

  // Use a unique container key to force the map to be recreated when key props change
  // This avoids React update issues with ArcGIS
  const mapContainerKey = `map-${numLatitude}-${numLongitude}-${numZoom}`

  // Show error state if map fails to load
  if (loadError)
    return <div className="arcgis-map-error">{loadError}</div>

  // Render the map container
  return (
    <div
      className={`arcgis-map-container ${sizeClass}`}
      style={{ width, height }}
    >
      {/* Key forces recreation instead of updates */}
      <div key={mapContainerKey} ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {isLoading && (
        <div className="arcgis-map-loading">
          <div>
            <div>Loading map...</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>Please wait while the map initializes</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArcGISMap
