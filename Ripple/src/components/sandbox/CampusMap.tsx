"use client"

import type { KeyboardEvent } from "react"
import type { Building, BuildingStatus } from "@/types"

type CampusMapProps = {
  buildings: Building[]
  selectedBuildingId: string | null
  onSelect: (buildingId: string) => void
  guideStep?: number
}

function statusClass(building: Building, selectedBuildingId: string | null): BuildingStatus {
  if (building.status !== "operational") return building.status
  if (building.id === selectedBuildingId) return "selected"
  return building.status
}

function handleBuildingKeyDown(event: KeyboardEvent<SVGGElement>, buildingId: string, onSelect: (buildingId: string) => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    onSelect(buildingId)
  }
}

export function CampusMap({ buildings, selectedBuildingId, onSelect, guideStep }: CampusMapProps) {
  return (
    <div className="campus-map-wrap">
      <svg className="campus-map" viewBox="0 0 820 480" role="img" aria-label="Interactive architectural campus map">
        <defs>
          <pattern id="campus-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" className="map-grid-line" fill="none" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="820" height="480" fill="url(#campus-grid)" />
        <rect className="map-zone" x="76" y="52" width="650" height="142" rx="2" />
        <rect className="map-zone" x="82" y="258" width="280" height="166" rx="2" />
        <rect className="map-zone" x="458" y="236" width="296" height="178" rx="2" />
        <text className="map-zone-label" x="92" y="70">NORTH KNOWLEDGE ZONE</text>
        <text className="map-zone-label" x="98" y="276">RESIDENTIAL EDGE</text>
        <text className="map-zone-label" x="474" y="254">COLLABORATION ZONE</text>

        <path className="map-road" d="M-30 230 C130 207 212 250 340 232 S586 172 850 210" />
        <path className="map-road-inner" d="M-30 230 C130 207 212 250 340 232 S586 172 850 210" />
        <path className="map-path" d="M48 418 C162 352 282 310 402 239 S595 116 782 75" />
        <path className="map-path" d="M342 438 C376 355 397 303 400 239 S406 139 440 48" />
        <path className={`map-route ${buildings.some((building) => building.status === "offline") ? "route-warning" : ""}`} d="M38 122 C200 122 250 198 396 239 S610 308 784 350" />
        <path className="map-route" d="M46 418 C180 385 246 288 396 239 S584 124 748 92" opacity="0.5" />

        <g aria-label="Campus north indicator" transform="translate(765 25)"><path d="M0 20 L7 0 L14 20 L7 15 Z" fill="var(--text-muted)" /><text className="map-compass" x="4" y="33">N</text></g>

        {buildings.map((building) => {
          const status = statusClass(building, selectedBuildingId)
          const { x, y, width, height, rotation = 0 } = building.footprint
          const centerX = x + width / 2
          const centerY = y + height / 2
          return (
            <g
              className={`map-building ${status} ${guideStep === 2 && building.id === "tt-block" ? "guide-focus" : ""}`}
              key={building.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${building.name}, ${status}`}
              aria-pressed={building.id === selectedBuildingId}
              onClick={() => onSelect(building.id)}
              onKeyDown={(event) => handleBuildingKeyDown(event, building.id, onSelect)}
              transform={`rotate(${rotation} ${centerX} ${centerY})`}
            >
              <rect className="map-building-shape" x={x} y={y} width={width} height={height} />
              <path d={`M ${x + 14} ${y + 20} H ${x + width - 14} M ${x + 14} ${y + 34} H ${x + width - 14} M ${x + width / 2} ${y + 7} V ${y + height - 7}`} fill="none" opacity="0.28" stroke="currentColor" strokeWidth="1" />
              <circle className="map-building-status" cx={x + width - 14} cy={y + 14} r="4" />
              <text className="map-building-label" x={x + 14} y={y + height / 2 + 3}>{building.code}</text>
              <text className="map-building-meta" x={x + 14} y={y + height / 2 + 17}>{building.roomCount} ROOMS</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
