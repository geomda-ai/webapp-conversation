'use client'

import React, { useCallback, useEffect, useState } from 'react'
import yaml from 'js-yaml'
import ArcGISMap from '../components/base/arcgis-map'

// Import styles for modern ArcGIS web components
import '../components/base/arcgis-map/styles.css'

// Default YAML configuration
const defaultYamlConfig = `center: 40.7128, -74.0060
zoom: 10
basemap: osm

ui:
  attribution: true
  slider: false
  zoom: true
  legend: true
  layerList: true
  basemapToggle: true
  compass: true

services:
  # Feature Service with custom styling for points
  - type: FeatureService
    url: https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Landscape_Trees/FeatureServer/0
    layerId: 0
    outFields: ['*']
    opacity: 0.8
    title: 'Landscape Trees'
    style:
      geometryType: point
      color: [50, 150, 50, 0.8]
      size: 6
      outline:
        color: [0, 0, 0, 0.5]
        width: 1

  # Map Server with multiple sublayers
  - type: MapServer
    url: https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer
    opacity: 0.7
    title: 'USA Map Layers'
    visible: true

  # Image Service example
  - type: ImageServer
    url: https://sampleserver6.arcgisonline.com/arcgis/rest/services/NLCDLandCover2001/ImageServer
    opacity: 0.6
    title: 'NLCD Land Cover'
    visible: true

  # Vector Tile Service example
  - type: VectorTileService
    url: https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer
    opacity: 0.5
    title: 'World Basemap'
    visible: false

options:
  minZoom: 5
  maxZoom: 18`

export default function ArcGISMapPage() {
  const [yamlInput, setYamlInput] = useState(defaultYamlConfig)
  const [mapConfig, setMapConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Function to parse YAML and update map
  const parseYamlAndUpdateMap = useCallback(() => {
    try {
      // Parse the YAML configuration
      const parsedConfig = yaml.load(yamlInput) as any
      setMapConfig(parsedConfig)
      setError(null)
    }
    catch (err) {
      setError(`Error parsing YAML: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [yamlInput])

  // Parse YAML on component mount
  useEffect(() => {
    parseYamlAndUpdateMap()
  }, [parseYamlAndUpdateMap])

  // Extract center coordinates if map config exists
  let latitude = 0
  let longitude = 0

  if (mapConfig && typeof mapConfig.center === 'string') {
    // Parse "lat, lon" format
    const parts = mapConfig.center.split(',').map((part: string) => {
      return parseFloat(part.trim())
    })
    if (parts.length === 2) {
      latitude = parts[0]
      longitude = parts[1]
    }
  }
  else if (mapConfig && Array.isArray(mapConfig.center) && mapConfig.center.length >= 2) {
    latitude = mapConfig.center[0]
    longitude = mapConfig.center[1]
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ArcGIS Map Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">YAML Configuration</h2>
          <textarea
            className="w-full h-96 font-mono p-2 border rounded"
            value={yamlInput}
            onChange={(e) => {
              setYamlInput(e.target.value)
            }}
          />
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={parseYamlAndUpdateMap}
          >
            Update Map
          </button>
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        <div>
          {mapConfig
            ? (
              <div className="h-96 border rounded overflow-hidden relative" style={{ minHeight: '500px' }}>
                <ArcGISMap
                  yamlConfig={mapConfig}
                  latitude={latitude}
                  longitude={longitude}
                  zoom={mapConfig.zoom}
                  basemap={mapConfig.basemap}
                  height="100%"
                  width="100%"
                />
              </div>
            )
            : (
              <div className="h-96 border rounded flex items-center justify-center bg-gray-100">
                {error
                  ? 'Fix YAML errors to display map'
                  : 'Loading map...'}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
