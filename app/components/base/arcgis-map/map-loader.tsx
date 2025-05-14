'use client'

import type React from 'react'
import { useEffect } from 'react'

// Types for props
type MapLoaderProps = {
  yamlConfig: any
  mapRef: React.RefObject<HTMLDivElement>
  setLoading: (loading: boolean) => void
}

/**
 * ArcGIS Map Loader Component
 * This component loads the ArcGIS JavaScript API on the client side
 * and initializes the map with the configuration from YAML
 */
const MapLoader: React.FC<MapLoaderProps> = ({
  yamlConfig,
  mapRef,
  setLoading,
}) => {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined')
      return

    let view: any = null

    // Function to load map services/layers - moved before usage
    const loadLayers = async (services: any[], map: any, _view: any) => {
      try {
        for (const service of services) {
          // Disabled all logging for performance reasons
          // No logging here

          try {
            // Build service URL with proper handling for layer IDs and special characters
            let serviceUrl = service.url
            if (service.layerId !== undefined)
              serviceUrl = `${service.url}/${service.layerId}`

            // Make sure URL special characters are properly encoded
            try {
              // Only encode the URL part after the domain to avoid encoding the protocol
              const urlParts = serviceUrl.split('/')
              const domain = urlParts.slice(0, 3).join('/')
              const path = urlParts.slice(3).join('/')
              const encodedPath = encodeURI(decodeURI(path)) // Fix double-encoding issues
              serviceUrl = `${domain}/${encodedPath}`
              // No need to log encoded URL
            }
            catch (error) {
              console.warn('Error encoding service URL:', error)
              // Continue with original URL if encoding fails
            }

            // Configure popup template regardless of layer type
            // Use content array format which has better support across different ArcGIS versions
            const popupTemplate = {
              title: service.title || 'Feature Information',
              content: [
                {
                  type: 'fields',
                  fieldInfos: [
                    { fieldName: '*' },
                  ],
                },
              ],
            }

            // No need to log popup configuration

            // Import layer modules dynamically based on service type
            if (service.type === 'FeatureServer' || service.type === 'FeatureService'
              || (service.url && service.url.toLowerCase().includes('featureserver'))) {
              // Import FeatureLayer class
              const FeatureLayer = (await import('@arcgis/core/layers/FeatureLayer')).default

              // Create the feature layer with error handling
              const layer = new FeatureLayer({
                url: serviceUrl,
                outFields: ['*'], // Force '*' to ensure all fields are available for popup
                opacity: service.opacity !== undefined ? service.opacity : 1,
                visible: service.visible !== false,
                title: service.title || 'Feature Layer',
                // Apply SQL where clause filter if provided
                definitionExpression: service.where || null,
                popupTemplate: {
                  title: '{name}', // Use the name field as the title
                  content: [
                    {
                      type: 'fields',
                      fieldInfos: [
                        { fieldName: 'name', label: 'Station Name', visible: true },
                        { fieldName: 'brand', label: 'Brand', visible: true },
                        { fieldName: 'address', label: 'Address', visible: true },
                        { fieldName: 'services', label: 'Services', visible: true },
                        { fieldName: 'ObjectId', label: 'ID', visible: true },
                      ],
                    },
                  ],
                },
              })

              // Add error handling for the layer but reduce logging
              layer.when(
                () => { /* Success - no need to log */ },
                (error: any) => console.warn(`Error loading layer: ${service.title || 'Unnamed layer'}`, error),
              )

              map.add(layer)
            }
            else if (service.type === 'MapServer'
              || (service.url && service.url.toLowerCase().includes('mapserver'))) {
              // Import MapImageLayer class
              const MapImageLayer = (await import('@arcgis/core/layers/MapImageLayer')).default

              // Create MapImageLayer
              const layer = new MapImageLayer({
                url: serviceUrl,
                opacity: service.opacity !== undefined ? service.opacity : 1,
                visible: service.visible !== false,
                title: service.title || 'Map Layer',
                // For MapImageLayer, popups are set on sublayers
                sublayers: [
                  {
                    id: 0, // Use appropriate sublayer ID
                    popupTemplate,
                  },
                ],
              })

              // Add error handling with reduced logging
              layer.when(
                () => { /* Success - no need to log */ },
                (error: any) => console.warn(`Error loading MapServer layer: ${service.title || 'Unnamed layer'}`, error),
              )

              map.add(layer)
            }
            else if (service.type === 'ImageServer'
              || (service.url && service.url.toLowerCase().includes('imageserver'))) {
              // Import ImageryLayer class
              const ImageryLayer = (await import('@arcgis/core/layers/ImageryLayer')).default

              // Create ImageryLayer
              const layer = new ImageryLayer({
                url: serviceUrl,
                opacity: service.opacity !== undefined ? service.opacity : 1,
                visible: service.visible !== false,
                title: service.title || 'Imagery Layer',
              })

              // Add error handling with reduced logging
              layer.when(
                () => { /* Success - no need to log */ },
                (error: any) => console.warn(`Error loading ImageServer layer: ${service.title || 'Unnamed layer'}`, error),
              )

              map.add(layer)
            }
            else if (service.type === 'VectorTileServer'
              || (service.url && service.url.toLowerCase().includes('vectortileserver'))) {
              // Import VectorTileLayer class
              const VectorTileLayer = (await import('@arcgis/core/layers/VectorTileLayer')).default

              // Create VectorTileLayer
              const layer = new VectorTileLayer({
                url: serviceUrl,
                opacity: service.opacity !== undefined ? service.opacity : 1,
                visible: service.visible !== false,
                title: service.title || 'Vector Tile Layer',
              })

              // Add error handling with reduced logging
              layer.when(
                () => { /* Success - no need to log */ },
                (error: any) => console.warn(`Error loading VectorTile layer: ${service.title || 'Unnamed layer'}`, error),
              )

              map.add(layer)
            }
            else {
              console.warn(`Unsupported layer type for service: ${service.title || 'Unnamed layer'}`, service)
            }
          }
          catch (layerError) {
            console.error(`Error creating layer for service ${service.title || 'Unnamed layer'}:`, layerError)
          }
        }
      }
      catch (error) {
        console.error('Error in loadLayers:', error)
      }
    }

    const loadMap = async () => {
      try {
        setLoading(true)

        // Dynamically import ArcGIS modules
        const [
          esriConfig,
          Map,
          MapView,
          Zoom,
          Home,
          Compass,
          BasemapToggle,
          ScaleBar,
          Legend,
          LayerList,
          Expand,
        ] = await Promise.all([
          import('@arcgis/core/config').then(m => m.default),
          import('@arcgis/core/Map').then(m => m.default),
          import('@arcgis/core/views/MapView').then(m => m.default),
          import('@arcgis/core/widgets/Zoom').then(m => m.default),
          import('@arcgis/core/widgets/Home').then(m => m.default),
          import('@arcgis/core/widgets/Compass').then(m => m.default),
          import('@arcgis/core/widgets/BasemapToggle').then(m => m.default),
          import('@arcgis/core/widgets/ScaleBar').then(m => m.default),
          import('@arcgis/core/widgets/Legend').then(m => m.default),
          import('@arcgis/core/widgets/LayerList').then(m => m.default),
          import('@arcgis/core/widgets/Expand').then(m => m.default),
        ])

        // Configure API Key if provided
        if (yamlConfig?.token)
          esriConfig.apiKey = yamlConfig.token

        // Create map instance
        const map = new Map({
          basemap: yamlConfig?.basemap || 'osm',
        })

        // Parse center coordinates
        let center = [0, 0]
        if (typeof yamlConfig?.center === 'string') {
          const parts = yamlConfig.center.split(',').map((part: string) => parseFloat(part.trim()))
          if (parts.length === 2)
            center = [parts[1], parts[0]] // [lon, lat] format
        }
        else if (Array.isArray(yamlConfig?.center) && yamlConfig.center.length >= 2) {
          center = [yamlConfig.center[1], yamlConfig.center[0]]
        }

        // Ensure map container exists
        if (!mapRef.current) {
          console.error('Map container reference is not available')
          setLoading(false)
          return
        }

        // Create map view
        view = new MapView({
          container: mapRef.current,
          map,
          center,
          zoom: yamlConfig?.zoom || 4,
          constraints: {
            minZoom: yamlConfig?.options?.minZoom || 1,
            maxZoom: yamlConfig?.options?.maxZoom || 18,
          },
          popup: {
            dockEnabled: true,
            dockOptions: {
              buttonEnabled: true,
              breakpoint: false,
              position: 'top-right',
            },
          },
        })

        // Add click handler to ensure popups work for all features
        view.on('click', (event: __esri.ViewClickEvent) => {
          // Perform hitTest to check for features without excessive logging
          view.hitTest(event).then((response: __esri.HitTestResult) => {
            // Check for graphic results with proper type guard
            const graphicResults = response.results.filter((result) => {
              return result && 'graphic' in result && result.graphic !== null
            })
            if (graphicResults.length > 0 && 'graphic' in graphicResults[0]) {
              // Get the first feature
              const firstFeature = graphicResults[0].graphic as __esri.Graphic

              // Force popup to show even if the feature has no popup template
              if (!firstFeature.popupTemplate) {
                firstFeature.popupTemplate = {
                  title: 'Feature Information',
                  content: [
                    {
                      type: 'fields',
                      fieldInfos: [
                        { fieldName: '*', label: '*', visible: true },
                      ],
                    },
                  ],
                }
              }
            }
          })
        })

        // Get UI configuration
        const uiConfig = yamlConfig?.ui || {}

        // Widgets are added after this section with the Legend and LayerList

        if (uiConfig.home !== false) {
          const home = new Home({ view })
          view.ui.add(home, 'top-right')
        }

        if (uiConfig.compass !== false) {
          const compass = new Compass({ view })
          view.ui.add(compass, 'top-right')
        }

        if (uiConfig.basemapToggle !== false) {
          const basemapToggle = new BasemapToggle({
            view,
            nextBasemap: 'satellite',
          })
          view.ui.add(basemapToggle, 'bottom-right')
        }

        if (uiConfig.scaleBar !== false) {
          const scaleBar = new ScaleBar({
            view,
            unit: 'metric',
          })
          view.ui.add(scaleBar, 'bottom-left')
        }

        // Only add zoom widget if enabled in the UI config
        // This prevents duplicate zoom controls (one from the YAML, one from page.tsx)
        if (uiConfig.zoom !== false) {
          const zoom = new Zoom({ view })
          view.ui.add(zoom, 'top-right')
        }

        // Use Expand widget to make LayerList a compact icon
        if (uiConfig.layerList !== false) {
          const layerList = new LayerList({
            view,
            listItemCreatedFunction: (event) => {
              const item = event.item
              if (item.panel && item.panel.content)
                item.panel.open = false // Default to closed
            },
          })

          const layerListExpand = new Expand({
            view,
            content: layerList,
            expandIcon: 'layers', // Use layers icon
            expandTooltip: 'Layers',
            group: 'top-left',
          })

          view.ui.add(layerListExpand, 'top-left')
        }

        // Use Expand widget to make Legend a compact icon
        if (uiConfig.legend !== false) {
          const legend = new Legend({
            view,
            style: 'card',
          })

          const legendExpand = new Expand({
            view,
            content: legend,
            expandIcon: 'legend',
            expandTooltip: 'Legend',
            group: 'bottom-left',
          })

          view.ui.add(legendExpand, 'bottom-left')
        }

        // Load layers when map is ready
        view.when(() => {
          if (yamlConfig?.services && Array.isArray(yamlConfig.services))
            loadLayers(yamlConfig.services, map, view)

          setLoading(false)
        })
      }
      catch (error) {
        try {
          view?.destroy()
        }
        catch (error) {
          console.error('Error destroying view:', error)
        }
        console.error('Error loading ArcGIS map:', error)
        setLoading(false)
      }
    }

    // Load the map only once when the component mounts
    loadMap()

    // Return cleanup function to destroy view when component unmounts
    return () => {
      if (view) {
        try {
          view.destroy()
        }
        catch (error) {
          console.error('Error destroying view:', error)
        }
      }
    }
    // Empty dependency array ensures this only runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default MapLoader
