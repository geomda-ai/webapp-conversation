import React from 'react'
import { Markdown } from '../base/markdown'

const yamlMapExample = `
# ArcGIS Map Examples with YAML Syntax

This is a demonstration of our new YAML-based map syntax that enables rich configuration.

## Example 1: Basic Map

```map-arcgis-yaml
center: 34.056, -117.195
zoom: 12
basemap: topo-vector
height: 400px
width: 100%
```

## Example 2: Map with Services and UI Options

```map-arcgis-yaml
center: 40.7128, -74.0060
zoom: 10
basemap: osm

ui:
  attribution: true
  logo: false
  slider: true

services:
  - type: FeatureService
    url: https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/Landscape_Trees/FeatureServer/0
    layerId: 0
    outFields: ['*']

  - type: MapServer
    url: https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer
    opacity: 0.7

options:
  minZoom: 8
  maxZoom: 18
```

## YAML Map Grammar

The following shows the grammar of our YAML map format:

- **Center**: Can be specified as either an array [lat, lon] or a string "lat, lon"
- **Services**: Multiple map services can be added with different types (FeatureService, MapServer, etc.)
- **UI Options**: Control visibility of attribution, logo, and other UI elements
- **Map Options**: Customize the map behavior with options like min/max zoom levels

`

export default function MapExample() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ArcGIS Map Examples</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <Markdown content={yamlMapExample} />
      </div>
    </div>
  )
}
