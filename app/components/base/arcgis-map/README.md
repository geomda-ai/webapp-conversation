# ArcGIS Map Component

## Overview

The ArcGIS Map component provides a React wrapper for the ArcGIS JavaScript API, allowing you to easily add interactive maps to your Next.js application. The component handles proper loading and cleanup of map resources, and is specifically designed to work with Next.js's server-side rendering.

## Installation

The component uses `@arcgis/core` which is already installed in the project:

```bash
npm install @arcgis/core @types/arcgis-js-api
```

## Usage

### Direct Component Usage

```tsx
import ArcGISMap from '@/app/components/base/arcgis-map'

function MyComponent() {
  return (
    <ArcGISMap 
      latitude={40.7128} 
      longitude={-74.0060} 
      zoom={10} 
      basemap="osm"
      height="500px"
      width="100%"
    />
  )
}
```

### In Markdown Content

You can also embed maps directly in markdown content using the `<arcgis-map>` tag:

```
Check out this map of New York City:

<arcgis-map latitude="40.7128" longitude="-74.0060" zoom="10" basemap="osm" />
```

This works because the Markdown component processes these tags and renders the appropriate map component.

## Props

- `latitude`: Latitude of the map center (default: 0)
- `longitude`: Longitude of the map center (default: 0)
- `zoom`: Zoom level of the map (default: 4)
- `basemap`: Basemap style (default: 'osm')
- `height`: Height of the map (default: '400px')
- `width`: Width of the map (default: '100%')

## Supported Basemaps

The following basemaps work without requiring an API key:

- `osm` (OpenStreetMap) - default
- `satellite`
- `hybrid`
- `gray`
- `dark-gray`
- `oceans`
- `terrain`

Other basemaps like `streets-navigation-vector` require authentication with an ArcGIS account.
- `width`: Width of the map (default: '100%')

## Notes

- Requires an internet connection to load ArcGIS JS API
- You may need to configure an API key for advanced features
