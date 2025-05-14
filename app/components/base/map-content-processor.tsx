import React from 'react'
import yaml from 'js-yaml'
import ArcGISMap from './arcgis-map'
import type { ArcGISMapYAMLConfig } from './arcgis-map'
import './arcgis-map/styles.css'
// Regex for YAML-based map blocks - support both formats
const MAP_YAML_REGEX = /```(?:map-arcgis-yaml|arcgis-map)\n([\s\S]*?)```/g

/**
 * Process YAML map blocks within content
 */
function processYamlMatches(content: string): {
  processedContent: string
  mapComponents: JSX.Element[]
} {
  const mapComponents: JSX.Element[] = []
  let processedContent = content
  let currentIndex = 0

  // Make a copy of the content to iterate over matches
  const contentCopy = content

  // Find all YAML map blocks
  let match
  // Reset regex index
  MAP_YAML_REGEX.lastIndex = 0

  // eslint-disable-next-line no-cond-assign
  while ((match = MAP_YAML_REGEX.exec(contentCopy)) !== null) {
    try {
      const yamlContent = match[1]
      // Skip creating a placeholder - just record the full match to replace later
      const fullMatch = match[0]

      // Clean up any potential markdown-formatted links in YAML before parsing
      const cleanYamlContent = yamlContent.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$2')
      // Parse YAML content
      const parsedConfig = yaml.load(cleanYamlContent) as ArcGISMapYAMLConfig
      console.log('Parsed YAML map config:', parsedConfig)

      // Convert center string to coordinates if needed
      let latitude = 0
      let longitude = 0

      if (typeof parsedConfig.center === 'string') {
        // Parse "lat, lon" format
        const parts = parsedConfig.center.split(',').map(part => parseFloat(part.trim()))
        if (parts.length === 2) {
          latitude = parts[0]
          longitude = parts[1]
        }
      }
      else if (Array.isArray(parsedConfig.center) && parsedConfig.center.length >= 2) {
        latitude = parsedConfig.center[0]
        longitude = parsedConfig.center[1]
      }

      // Replace YAML block with placeholder - using empty string to not show the placeholder
      processedContent = processedContent.replace(fullMatch, '')

      // Create map component with YAML config
      mapComponents.push(
        <ArcGISMap
          key={`map-${currentIndex}`}
          yamlConfig={parsedConfig}
          latitude={latitude}
          longitude={longitude}
          zoom={parsedConfig.zoom}
          basemap={parsedConfig.basemap}
          height={parsedConfig.height || '400px'}
          width={parsedConfig.width || '100%'}
        />,
      )

      currentIndex++
    }
    catch (error) {
      console.error('Error parsing YAML map configuration:', error)
    }
  }

  return { processedContent, mapComponents }
}

/**
 * Process content to extract map parameters and replace tags with placeholders
 */
export function processMapContent(content: string): {
  processedContent: string
  mapComponents: JSX.Element[]
} {
  // Process YAML blocks only
  return processYamlMatches(content)
}

/**
 * Component to render content with maps
 */
export function ContentWithMaps({ content }: { content: string }): JSX.Element {
  // Process content to extract maps and get placeholder content
  const { processedContent, mapComponents } = processMapContent(content)

  // If no maps were found, just return the content directly
  if (mapComponents.length === 0)
    return <div dangerouslySetInnerHTML={{ __html: content }} />

  // Instead of splitting on placeholders, we'll just render the maps in a container
  // This avoids having placeholder text visible in the output
  // We'll render the content directly without any splitting

  // Render the cleaned content and maps separately
  return (
    <div className="map-content-wrapper">
      {/* Regular content without placeholders */}
      <div dangerouslySetInnerHTML={{ __html: processedContent }} />

      {/* Maps are rendered after the content */}
      {mapComponents.length > 0 && (
        <div className="maps-container">
          {mapComponents.map((map, index) => (
            <div
              key={`map-${index}`}
              id={`map-container-${index}`}
              className="arcgis-map-container map-md"
            >
              {map}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ContentWithMaps
