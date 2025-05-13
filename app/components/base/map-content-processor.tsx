import React from 'react'
import ArcGISMap from './arcgis-map'

// Define a standard tag format for ArcGIS maps
// <arcgis-map latitude="40.7128" longitude="-74.0060" zoom="10" />
// <arcgis-map latitude={40.7128} longitude={-74.0060} zoom={10} />

// Function to create a regex pattern that matches both quoted strings and curly brace values
const createMapTagRegex = (tagName: string) => {
  return new RegExp(
    `<${tagName}[\\s\\n]+`
    // Match any attributes, capturing the entire attribute string
    + '([^>]*?)'
    // End of tag
    + `(?:/>|>(?:</${tagName}>))`,
    'g',
  )
}

// Create regex patterns for different tag variants
const MAP_TAG_REGEX = createMapTagRegex('arcgis-map')
const ARCGISMAP_TAG_REGEX = createMapTagRegex('ArcgisMap')
const ARCGIS_MAP_TAG_REGEX = createMapTagRegex('ArcGISMap')

// Type for extracted map parameters
type MapParameters = {
  latitude: number
  longitude: number
  zoom?: number
  basemap?: string
  height?: string
  width?: string
}

// Extract map parameters from attribute string
function extractMapParams(attributeString: string): MapParameters {
  // Create regexes for each attribute with support for both quoted and curly brace formats
  const latitudeRegex = /(?:latitude|lat)=(?:["']([^"']+)["']|\{([^}]+)\})/i
  const longitudeRegex = /(?:longitude|lng|long)=(?:["']([^"']+)["']|\{([^}]+)\})/i
  const zoomRegex = /(?:zoom|z)=(?:["']([^"']+)["']|\{([^}]+)\})/i
  const basemapRegex = /(?:basemap|map)=(?:["']([^"']+)["']|\{([^}]+)\})/i
  const heightRegex = /(?:height|h)=(?:["']([^"']+)["']|\{([^}]+)\})/i
  const widthRegex = /(?:width|w)=(?:["']([^"']+)["']|\{([^}]+)\})/i

  // Extract values
  const latMatch = attributeString.match(latitudeRegex)
  const lngMatch = attributeString.match(longitudeRegex)
  const zoomMatch = attributeString.match(zoomRegex)
  const basemapMatch = attributeString.match(basemapRegex)
  const heightMatch = attributeString.match(heightRegex)
  const widthMatch = attributeString.match(widthRegex)

  // Parse values, if a match exists take the first or second capture group
  const latitude = latMatch ? parseFloat(latMatch[1] || latMatch[2]) : 0
  const longitude = lngMatch ? parseFloat(lngMatch[1] || lngMatch[2]) : 0
  const zoom = zoomMatch ? parseInt(zoomMatch[1] || zoomMatch[2], 10) : undefined
  const basemap = basemapMatch ? (basemapMatch[1] || basemapMatch[2]) : undefined
  const height = heightMatch ? (heightMatch[1] || heightMatch[2]) : undefined
  const width = widthMatch ? (widthMatch[1] || widthMatch[2]) : undefined

  console.log('Extracted parameters (new):', { latitude, longitude, zoom, basemap, height, width })
  return { latitude, longitude, zoom, basemap, height, width }
}

// Process content to extract map parameters and replace tags with placeholders
export function processMapContent(content: string): {
  processedContent: string
  mapComponents: JSX.Element[]
} {
  const mapComponents: JSX.Element[] = []
  let processedContent = content
  let index = 0

  // Process map tags in different formats (kebab-case, PascalCase, etc.)
  const processTagMatches = (regex: RegExp) => {
    // Using a different pattern to avoid linting error with assignment in while condition
    let matchResult
    while (true) {
      matchResult = regex.exec(processedContent)
      if (matchResult === null)
        break
      const match = matchResult
      const placeholder = `__MAP_PLACEHOLDER_${index}__`
      const fullMatch = match[0]
      const attributeString = match[1] || ''
      const params = extractMapParams(attributeString)

      // Log for debugging
      console.log(`Found map tag: ${fullMatch}`)
      console.log('Extracted parameters:', params)

      // Replace the tag with a placeholder
      processedContent = processedContent.replace(fullMatch, placeholder)

      // Create the map component
      mapComponents.push(
        <ArcGISMap
          key={`map-${index}`}
          latitude={params.latitude}
          longitude={params.longitude}
          zoom={params.zoom}
          basemap={params.basemap}
          height={params.height || '400px'}
          width={params.width || '100%'}
        />,
      )

      index++

      // Reset lastIndex because we modified the string
      regex.lastIndex = 0
    }
  }

  // Process all tag formats
  processTagMatches(MAP_TAG_REGEX) // <arcgis-map> format
  processTagMatches(ARCGISMAP_TAG_REGEX) // <ArcgisMap> format
  processTagMatches(ARCGIS_MAP_TAG_REGEX) // <ArcGISMap> format

  return { processedContent, mapComponents }
}

// Component to render content with maps
export function ContentWithMaps({ content }: { content: string }): JSX.Element {
  // Process content to extract maps and get placeholder content
  const { processedContent, mapComponents } = processMapContent(content)

  // If no maps were found, just return the content directly
  if (mapComponents.length === 0)
    return <div dangerouslySetInnerHTML={{ __html: content }} />

  // Split content on placeholders
  const contentParts = processedContent.split(/(__MAP_PLACEHOLDER_\d+__)/)

  // Map index counter
  let mapIndex = 0

  // Render content parts with maps inserted at placeholders
  return (
    <div>
      {contentParts.map((part, i) => {
        if (part.match(/__MAP_PLACEHOLDER_\d+__/)) {
          // This is a placeholder, render corresponding map
          const currentMap = mapComponents[mapIndex]
          mapIndex++
          return <div key={`part-${i}`}>{currentMap}</div>
        }
        else {
          // This is regular content
          return <div key={`part-${i}`} dangerouslySetInnerHTML={{ __html: part }} />
        }
      })}
    </div>
  )
}

export default ContentWithMaps
