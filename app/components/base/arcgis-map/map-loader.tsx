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
          console.log(`Loading service: ${service.title || 'Unnamed layer'}`, service)

          // Import layer modules dynamically based on service type
          if (service.type === 'FeatureServer' || service.type === 'FeatureService' || service.url?.toLowerCase().includes('featureserver')) {
            const FeatureLayer = (await import('@arcgis/core/layers/FeatureLayer')).default
            const layer = new FeatureLayer({
              url: service.url,
              outFields: service.outFields || ['*'],
              opacity: service.opacity !== undefined ? service.opacity : 1,
              visible: service.visible !== false,
              title: service.title || 'Feature Layer',
              // Add popup template if enabled
              popupTemplate: service.popup?.enabled
                ? {
                  title: service.title || 'Feature Information',
                  content: '*', // Show all fields
                }
                : undefined,
            })
            map.add(layer)
          }
          else if (service.type === 'MapServer' || service.url?.toLowerCase().includes('mapserver')) {
            const MapImageLayer = (await import('@arcgis/core/layers/MapImageLayer')).default
            const layer = new MapImageLayer({
              url: service.url,
              opacity: service.opacity !== undefined ? service.opacity : 1,
              visible: service.visible !== false,
              title: service.title || 'Map Layer',
            })
            map.add(layer)
          }
          else if (service.type === 'ImageServer' || service.url?.toLowerCase().includes('imageserver')) {
            const ImageryLayer = (await import('@arcgis/core/layers/ImageryLayer')).default
            const layer = new ImageryLayer({
              url: service.url,
              opacity: service.opacity !== undefined ? service.opacity : 1,
              visible: service.visible !== false,
              title: service.title || 'Imagery Layer',
            })
            map.add(layer)
          }
          else if (service.type === 'VectorTileServer' || service.url?.toLowerCase().includes('vectortileserver')) {
            const VectorTileLayer = (await import('@arcgis/core/layers/VectorTileLayer')).default
            const layer = new VectorTileLayer({
              url: service.url,
              opacity: service.opacity !== undefined ? service.opacity : 1,
              visible: service.visible !== false,
              title: service.title || 'Vector Tile Layer',
            })
            map.add(layer)
          }
          else {
            console.warn(`Unsupported layer type for service: ${service.title || 'Unnamed layer'}`, service)
          }
        }
      }
      catch (error) {
        console.error('Error loading layers:', error)
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
          view.destroy()
        }
        catch (error) {
          console.error('Error destroying view:', error)
        }
        console.error('Error loading ArcGIS map:', error)
        setLoading(false)
      }
    }

    // Call the loadMap function
    loadMap()

    // Cleanup function
    return () => {
      if (view) {
        try {
          view.destroy()
        }
        catch (destroyError) {
          // Ignore errors when destroying the view
        }
      }
    }
  }, [mapRef, yamlConfig, setLoading])

  return null
}

export default MapLoader
