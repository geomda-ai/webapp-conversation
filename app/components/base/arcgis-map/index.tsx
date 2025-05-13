import React, { useEffect, useRef, useState } from 'react'
import './styles.css'

// Define types for YAML configuration
type ArcGISMapService = {
  type: string
  url: string
  layerId?: number
  outFields?: string[]
  where?: string
  opacity?: number
  [key: string]: any
}

type ArcGISMapYAMLConfig = {
  center?: number[] | string
  zoom?: number
  basemap?: string
  ui?: Record<string, boolean>
  services?: ArcGISMapService[]
  options?: Record<string, any>
  token?: string
  portal?: {
    url: string
    itemId: string
  }
  height?: string
  width?: string
}

// Define props type
type ArcGISMapProps = {
  latitude?: number | string
  longitude?: number | string
  zoom?: number | string
  basemap?: string
  height?: string
  width?: string
  yamlConfig?: ArcGISMapYAMLConfig
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
  yamlConfig,
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
        console.log(`Initializing map with lat: ${numLatitude}, lng: ${numLongitude}, zoom: ${numZoom}, basemap: ${yamlConfig?.basemap || basemap}`)

        // Apply token if provided in YAML config
        if (yamlConfig?.token) {
          console.log('Using token from YAML config')
          // Will be configured after imports
        }

        // Use basemap from YAML config or props
        const effectiveBasemap = yamlConfig?.basemap || basemap

        // ArcGIS API can throw errors when basemaps require authentication
        // Default basemaps that work without API key: 'osm', 'satellite', 'hybrid', 'gray', 'dark-gray', 'oceans', 'terrain'
        let finalBasemap = effectiveBasemap
        try {
          if (!['osm', 'satellite', 'hybrid', 'gray', 'dark-gray', 'oceans', 'terrain'].includes(finalBasemap)) {
            console.warn(`Basemap '${finalBasemap}' might require authentication. Falling back to 'osm'`)
            finalBasemap = 'osm'
          }
        }
        catch (e) {
          console.warn('Error checking basemap, falling back to osm:', e)
          finalBasemap = 'osm'
        }
        // Dynamic import of ArcGIS modules
        const { default: Map } = await import('@arcgis/core/Map')
        const { default: MapView } = await import('@arcgis/core/views/MapView')
        const { default: config } = await import('@arcgis/core/config')

        // Configure API with token if available
        if (yamlConfig?.token) {
          config.apiKey = yamlConfig.token
        }

        // Create the map with basemap
        const map = new Map({
          basemap: finalBasemap,
        })

        // Prepare map view options
        const viewOptions: any = {
          container: mapRef.current,
          map,
          center: [numLongitude, numLatitude],
          zoom: yamlConfig?.zoom || numZoom,
        }

        // Add additional options from YAML config if available
        if (yamlConfig?.options) {
          Object.assign(viewOptions, yamlConfig.options)
        }

        // Create the view with combined options
        const view = new MapView(viewOptions)

        // Configure UI elements if specified
        if (yamlConfig?.ui) {
          view.when(() => {
            try {
              // Handle UI customization
              Object.entries(yamlConfig.ui || {}).forEach(([key, value]) => {
                if (view.ui && typeof value === 'boolean') {
                  if (key === 'attribution' && value === false) {
                    view.ui.remove('attribution')
                  }
                  if (key === 'logo') {
                    view.ui.components = value ? ['logo'] : []
                  }
                }
              })
            } catch (error) {
              console.warn('Error configuring UI:', error)
            }
          })
        }

        // Load layers if services are specified
        if (yamlConfig?.services && Array.isArray(yamlConfig.services)) {
          const loadServices = async () => {
            try {
              // Import layer modules based on service types
              const [{ default: FeatureLayer }, { default: MapImageLayer }, 
                    { default: ImageryLayer }, { default: VectorTileLayer }] = 
                    await Promise.all([
                      import('@arcgis/core/layers/FeatureLayer'),
                      import('@arcgis/core/layers/MapImageLayer'),
                      import('@arcgis/core/layers/ImageryLayer'),
                      import('@arcgis/core/layers/VectorTileLayer'),
                    ])
              
              // Process each service
              (yamlConfig.services || []).forEach((service) => {
                try {
                                  let layer
                  
                  // Use function scope to avoid variable redefinition
                  if (service.type === 'FeatureService') {
                    layer = new FeatureLayer({
                      url: service.url + (service.layerId !== undefined ? `/${service.layerId}` : ''),
                      outFields: service.outFields || ['*'],
                      definitionExpression: service.where,
                      // Exclude properties we've already used
                      ...Object.keys(service)
                        .filter(key => !['url', 'layerId', 'outFields', 'where', 'type'].includes(key))
                        .reduce((obj, key) => ({ ...obj, [key]: service[key] }), {}),
                    })
                  } else if (service.type === 'MapServer') {
                    layer = new MapImageLayer({
                      url: service.url,
                      opacity: service.opacity,
                      // Exclude properties we've already used
                      ...Object.keys(service)
                        .filter(key => !['url', 'opacity', 'type'].includes(key))
                        .reduce((obj, key) => ({ ...obj, [key]: service[key] }), {}),
                    })
                  } else if (service.type === 'ImageServer') {
                    layer = new ImageryLayer({
                      url: service.url,
                      opacity: service.opacity,
                      // Exclude properties we've already used
                      ...Object.keys(service)
                        .filter(key => !['url', 'opacity', 'type'].includes(key))
                        .reduce((obj, key) => ({ ...obj, [key]: service[key] }), {}),
                    })
                  } else if (service.type === 'VectorTileService') {
                    layer = new VectorTileLayer({
                      url: service.url,
                      // Exclude properties we've already used
                      ...Object.keys(service)
                        .filter(key => !['url', 'type'].includes(key))
                        .reduce((obj, key) => ({ ...obj, [key]: service[key] }), {}),
                    })
                  }

                  if (layer) {
                    map.add(layer)
                  }
                } catch (e) {
                  console.error(`Error adding layer from service ${service.url}:`, e)
                }
              })
            } catch (error) {
              console.error('Error loading service layers:', error)
            }
          }
          
          loadServices()
        }

        // Handle portal items if specified
        if (yamlConfig?.portal?.url && yamlConfig?.portal?.itemId) {
          try {
            const loadPortalItem = async () => {
              const { default: PortalItem } = await import('@arcgis/core/portal/PortalItem')
              const { default: Layer } = await import('@arcgis/core/layers/Layer')
              
              const portalItem = new PortalItem({
                url: yamlConfig.portal.url,
                id: yamlConfig.portal.itemId,
              })
              
              const layer = await Layer.fromPortalItem({
                portalItem,
              })
              
              map.add(layer)
            }
            
            loadPortalItem()
          } catch (e) {
            console.error('Error loading portal item:', e)
          }
        }

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
  }, [numLatitude, numLongitude, numZoom, basemap, yamlConfig]) // Re-initialize when these props change

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
