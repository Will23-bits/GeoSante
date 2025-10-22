import { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Badge import removed (unused)
import { Button } from "@/components/ui/button";

interface Department {
  code: string;
  name: string;
  riskScore: number;
  riskLevel: string;
  vaccinationCoverage?: number;
  fluCoverage?: number;
  covidCoverage?: number;
  hpvCoverage?: number;
  meningococcalCoverage?: number;
  vaccinationRiskLevel?: string;
  emergencyVisits?: number;
  sosMedecinsActs?: number;
  population?: number;
  geometry?: any;
  lat?: number;
  lng?: number;
}

interface FluRiskMapProps {
  selectedDepartment: Department | null;
  onDepartmentClick: (department: Department) => void;
}

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Geoman Drawing Controls Component
function GeomanControls({ onZoneCreated }: { onZoneCreated?: (layer: any) => void }) {
  const map = useMap();

  useEffect(() => {
    // Initialize Geoman on the map
    map.pm.addControls({
      position: "topleft",
      drawCircle: true,
      drawMarker: true,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    // Listen for when shapes are created
    map.on("pm:create", (e: any) => {
      const layer = e.layer;
      const layerType = e.layerType;

      // Add risk level properties to the created layer
      (layer.options as any).riskLevel = "medium";
      (layer.options as any).riskScore = 0.5;
      (layer.options as any).description = `Custom ${layerType} risk zone`;

      // Style the layer based on risk level
      if (layerType === "polygon" || layerType === "rectangle") {
        (layer as any).setStyle({
          color: "#FF9800",
          fillColor: "#FF9800",
          fillOpacity: 0.3,
          weight: 2,
        });
      } else if (layerType === "circle") {
        (layer as any).setStyle({
          color: "#FF9800",
          fillColor: "#FF9800",
          fillOpacity: 0.3,
          weight: 2,
        });
      }

      // Add popup with risk information
      layer.bindPopup(`
        <div>
          <h4>Custom Risk Zone</h4>
          <p><strong>Type:</strong> ${layerType}</p>
          <p><strong>Risk Level:</strong> ${(layer.options as any).riskLevel}</p>
          <p><strong>Risk Score:</strong> ${(layer.options as any).riskScore}</p>
          <p><strong>Description:</strong> ${(layer.options as any).description}</p>
          <button onclick="this.closest('.leaflet-popup')._source.setStyle({color: '#4CAF50', fillColor: '#4CAF50'})">Mark as Low Risk</button>
          <button onclick="this.closest('.leaflet-popup')._source.setStyle({color: '#FF9800', fillColor: '#FF9800'})">Mark as Medium Risk</button>
          <button onclick="this.closest('.leaflet-popup')._source.setStyle({color: '#F44336', fillColor: '#F44336'})">Mark as High Risk</button>
        </div>
      `);

      // Notify parent component
      onZoneCreated && onZoneCreated(layer);
    });

    // Listen for when shapes are edited
    map.on("pm:edit", (e: any) => {
      console.log("Shape edited:", e.layer);
    });

    // Listen for when shapes are removed
    map.on("pm:remove", (e: any) => {
      console.log("Shape removed:", e.layer);
    });

    return () => {
      // Clean up event listeners
      map.off("pm:create");
      map.off("pm:edit");
      map.off("pm:remove");
    };
  }, [map, onZoneCreated]);

  return null;
}

// Department Choropleth Layer
function DepartmentsChoropleth({ departments }: { departments: Department[] }) {
  const map = useMap();
  const [geoLayer, setGeoLayer] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadGeo() {
      try {
        // Public GeoJSON of French departments
        const res = await fetch(
          "https://france-geojson.gregoiredavid.fr/repo/departements.geojson"
        );
        const gj = await res.json();

        // Build quick lookup by department code
        const byCode = new Map(
          (departments || []).map((d) => [String(d.code).padStart(2, "0"), d])
        );

        const style = (feature: any) => {
          const props = feature.properties || {};
          const code = String(
            props.code || props.code_insee || props.code_dep || ""
          ).padStart(2, "0");
          const d = byCode.get(code);
          const level = (d as any)?.riskLevel || "very-low";
          const color = getRiskColor(level);
          return {
            color: "#ffffff",
            weight: 1,
            fillColor: color,
            fillOpacity: 0.5,
          };
        };

        const onEachFeature = (feature: any, layer: any) => {
          const props = feature.properties || {};
          const code = String(
            props.code || props.code_insee || props.code_dep || ""
          ).padStart(2, "0");
          const d = byCode.get(code);
          const name = props.nom || props.nom_dep || (d as any)?.name || "Département";

          if (d) {
            // Flu risk data (from sentiweb_data.csv)
            const fluData = `
              <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                <h4 style="margin: 0 0 8px 0; color: #2c3e50;">🦠 Flu Risk Data</h4>
                <p style="margin: 2px 0;"><strong>Risk Level:</strong> ${(d as any).riskLevel}</p>
                <p style="margin: 2px 0;"><strong>Risk Score:</strong> ${((d as any).riskScore * 100).toFixed(1)}%</p>
              </div>
            `;

            // Vaccination data (from couvertures-vaccinales CSV) - only flu coverage
            const fluVacc = (d as any).fluCoverage !== undefined && (d as any).fluCoverage !== null
              ? `${(((d as any).fluCoverage) * 100).toFixed(1)}%`
              : null;

            const vaccinationData = fluVacc
              ? `
                <div style="margin-bottom: 15px;">
                  <h4 style="margin: 0 0 8px 0; color: #27ae60;">💉 Vaccination Coverage</h4>
                  <p style="margin: 2px 0;"><strong>Flu Vaccination:</strong> ${fluVacc}</p>
                </div>
              `
              : "";

            layer.bindPopup(`
              <div>
                <h3>${name} (${code})</h3>
                ${fluData}
                ${vaccinationData}
              </div>
            `);
          } else {
            layer.bindPopup(
              `<div><h3>${name} (${code})</h3><p>No data</p></div>`
            );
          }

          layer.on({
            mouseover: (e: any) => {
              const target = e.target;
              target.setStyle({ weight: 2, fillOpacity: 0.65 });
            },
            mouseout: (e: any) => {
              geo.resetStyle(e.target);
            },
            click: () => {
              if (d) {
                map.fitBounds(layer.getBounds(), {
                  maxZoom: 9,
                  padding: [20, 20],
                });
              }
            },
          });
        };

        const geo = L.geoJSON(gj, { style, onEachFeature });
        if (!isMounted) return;
        geo.addTo(map);
        setGeoLayer(geo);

        return () => {
          if (geo) map.removeLayer(geo);
        };
      } catch (e) {
        console.error("Failed to load departments GeoJSON", e);
      }
    }
    loadGeo();
    return () => {
      isMounted = false;
      if (geoLayer) map.removeLayer(geoLayer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(departments)]);

  return null;
}

// Department Markers Component
function DepartmentMarkers({ departments, onDepartmentClick }: { departments: Department[], onDepartmentClick: (department: Department) => void }) {
  const map = useMap();

  useEffect(() => {
    if (departments && departments.length > 0) {
      // const isOverseas = (code: string) =>
      //   [
      //     "971", // Guadeloupe
      //     "972", // Martinique
      //     "973", // Guyane
      //     "974", // La Réunion
      //     "975", // Saint-Pierre-et-Miquelon
      //     "976", // Mayotte
      //     "977", // Saint-Barthélemy
      //     "978", // Saint-Martin
      //     "984", // Terres australes et antarctiques françaises
      //     "986", // Wallis-et-Futuna
      //     "987", // Polynésie française
      //     "988", // Nouvelle-Calédonie
      //   ].includes(String(code));

      // Mainland France markers - removed dots, keeping only popup functionality
      const mainlandMarkers: any[] = [];

      // Overseas territories markers (DOM-TOM) - removed dots, keeping only popup functionality
      const overseasMarkers: any[] = [];

      if (mainlandMarkers.length === 0 && overseasMarkers.length === 0) return () => { };

      const mainlandGroup = L.layerGroup(mainlandMarkers);
      const overseasGroup = L.layerGroup(overseasMarkers);

      mainlandGroup.addTo(map);
      overseasGroup.addTo(map);

      return () => {
        map.removeLayer(mainlandGroup);
        map.removeLayer(overseasGroup);
      };
    }
  }, [map, departments, onDepartmentClick]);

  return null;
}

// Concentric rings to show epicenter with distance-based colors
// function ConcentricRiskRings({ departments }: { departments: Department[] }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!departments || departments.length === 0) return;

//     const groupLayers: any[] = [];

//     const getColorAt = (t: number) => {
//       // t in [0,1], center red -> outer blue
//       const stops = [
//         { t: 0.0, color: "#e53e3e" }, // red
//         { t: 0.5, color: "#ed8936" }, // orange
//         { t: 0.75, color: "#f6e05e" }, // yellow
//         { t: 1.0, color: "#2b6cb0" }, // blue
//       ];
//       for (let i = 1; i < stops.length; i++) {
//         if (t <= stops[i].t) return stops[i].color;
//       }
//       return stops[stops.length - 1].color;
//     };

//     // Scale radius by risk (in meters)
//     const baseRadiusForRisk = (risk: number) => {
//       // 5km to 35km
//       const min = 5000;
//       const max = 35000;
//       return min + (max - min) * Math.max(0, Math.min(1, risk));
//     };

//     departments.forEach((dept: Department) => {
//       const risk = dept.riskScore ?? 0.5;
//       const base = baseRadiusForRisk(risk);
//       const rings = 5; // number of rings
//       const ringLayers = [];

//       for (let i = 0; i < rings; i++) {
//         const t = i / (rings - 1);
//         const radius = base * (0.4 + 0.6 * t); // inner 40% to full
//         const color = getColorAt(t);
//         const opacity = 0.35 * (1 - t) + 0.1; // fade outward

//         const c = L.circle([dept.lat!, dept.lng!], {
//           radius,
//           color: color,
//           weight: 1,
//           fillColor: color,
//           fillOpacity: opacity,
//           stroke: false,
//           pmIgnore: true,
//         });

//         ringLayers.push(c);
//       }

//       const lg = L.layerGroup(ringLayers);
//       lg.addTo(map);
//       groupLayers.push(lg);
//     });

//     return () => {
//       groupLayers.forEach((lg) => map.removeLayer(lg));
//     };
//   }, [map, departments]);

//   return null;
// }

// Get color based on risk level (optimized for 30-50% range)
function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case "low":
      return "#2E7D32"; // Dark Green (< 30%)
    case "low-medium":
      return "#4CAF50"; // Green (30-35%)
    case "medium":
      return "#8BC34A"; // Light Green (35-40%)
    case "medium-high":
      return "#FFC107"; // Yellow (40-45%)
    case "high":
      return "#FF9800"; // Orange (>= 45%)
    default:
      return "#F44336"; // Red (fallback)
  }
}

// Map Instance Component
function MapInstance({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);

    // Define Metropolitan France bounds (strict)
    const metropolitanBounds = L.latLngBounds(
      L.latLng(41.0, -5.5),  // Southwest corner of Metropolitan France
      L.latLng(51.5, 9.5)    // Northeast corner of Metropolitan France
    );

    // Set max bounds to Metropolitan France only
    map.setMaxBounds(metropolitanBounds);

    // Prevent zooming out too far
    map.setMinZoom(5);
    map.setMaxZoom(18);

    // Add strict panning restriction
    map.on('drag', () => {
      map.panInsideBounds(metropolitanBounds, { animate: false });
    });

  }, [map, onMapReady]);

  return null;
}

// Main Map Component
function FluRiskMap({ onDepartmentClick }: FluRiskMapProps) {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/risk-data");
      setMapData(response.data);
    } catch (err) {
      setError("Échec du chargement des données de la carte");
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="relative h-screen w-full">
        <div className="flex items-center justify-center h-full text-lg text-gray-600">
          Chargement des données de la carte...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative h-screen w-full">
        <div className="flex items-center justify-center h-full text-lg text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapContainer
        center={[46.2276, 2.2137]}
        zoom={6}
        minZoom={5}
        maxZoom={18}
        style={{ height: "100%", width: "100%" }}
        maxBounds={[
          [41.0, -5.5],
          [51.5, 9.5]
        ]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Choropleth by department risk */}
        <DepartmentsChoropleth departments={mapData?.departments || []} />

        {/* Geoman Drawing Controls */}
        <GeomanControls />

        {/* Department Markers */}
        <DepartmentMarkers
          departments={mapData?.departments}
          onDepartmentClick={onDepartmentClick}
        />

        {/* Map Instance Handler */}
        <MapInstance onMapReady={setMapInstance} />
      </MapContainer>

      {/* Compact Legend */}
      <Card className="absolute top-4 right-4 z-[1000] w-48 bg-white/95 backdrop-blur-sm shadow-lg border-gray-200">
        <CardHeader className="pb-2 pt-2 border-b border-gray-100">
          <CardTitle className="text-xs text-gray-900 font-bold uppercase tracking-wide">
            Légende Risque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pb-3 pt-2">
          <div className="flex items-center gap-2 p-1 rounded hover:bg-green-50 transition-colors cursor-default">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#2E7D32" }}></div>
            <span className="text-xs text-gray-800 font-medium">Très Faible (&lt;30%)</span>
          </div>
          <div className="flex items-center gap-2 p-1 rounded hover:bg-green-50 transition-colors cursor-default">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#4CAF50" }}></div>
            <span className="text-xs text-gray-800 font-medium">Faible (30-35%)</span>
          </div>
          <div className="flex items-center gap-2 p-1 rounded hover:bg-lime-50 transition-colors cursor-default">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8BC34A" }}></div>
            <span className="text-xs text-gray-800 font-medium">Moyen-Bas (35-40%)</span>
          </div>
          <div className="flex items-center gap-2 p-1 rounded hover:bg-yellow-50 transition-colors cursor-default">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FFC107" }}></div>
            <span className="text-xs text-gray-800 font-medium">Moyen-Haut (40-45%)</span>
          </div>
          <div className="flex items-center gap-2 p-1 rounded hover:bg-orange-50 transition-colors cursor-default">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF9800" }}></div>
            <span className="text-xs text-gray-800 font-medium">Élevé (≥45%)</span>
          </div>
          <div className="h-px bg-gray-200 my-1"></div>
          <div className="flex items-center gap-2 p-1 rounded hover:bg-blue-50 transition-colors cursor-default">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-gray-700 shadow-sm"></div>
            <span className="text-xs text-gray-800 font-medium">TOM</span>
          </div>
        </CardContent>
      </Card>

      {/* Professional Navigation Control */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-gray-200">
          <CardHeader className="pb-2 pt-3 border-b border-gray-100">
            <CardTitle className="text-xs text-gray-900 font-bold uppercase tracking-wide">
              Navigation Rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (mapInstance) {
                    // Reset to Metropolitan France
                    const metropolitanBounds = L.latLngBounds(
                      L.latLng(41.0, -5.5),
                      L.latLng(51.5, 9.5)
                    );
                    mapInstance.setMaxBounds(metropolitanBounds);
                    mapInstance.setMinZoom(5);
                    mapInstance.fitBounds(metropolitanBounds);
                  }
                }}
                className="bg-white border border-blue-200 hover:bg-blue-600 hover:text-white text-xs h-7 px-3 text-gray-800 font-semibold transition-all duration-200 justify-start"
              >
                France Métropolitaine
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (mapInstance) {
                    // Unlock bounds and go to Caribbean
                    const caribbeanBounds = L.latLngBounds(
                      L.latLng(14.0, -62.0),
                      L.latLng(18.5, -60.0)
                    );
                    mapInstance.setMaxBounds(caribbeanBounds);
                    mapInstance.setMinZoom(7);
                    mapInstance.fitBounds(caribbeanBounds);
                  }
                }}
                className="bg-white border border-green-200 hover:bg-green-600 hover:text-white text-xs h-7 px-3 text-gray-800 font-semibold transition-all duration-200 justify-start"
              >
                Caraïbes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (mapInstance) {
                    // Unlock bounds and go to Indian Ocean
                    const indianBounds = L.latLngBounds(
                      L.latLng(-22.0, 44.5),
                      L.latLng(-12.0, 56.0)
                    );
                    mapInstance.setMaxBounds(indianBounds);
                    mapInstance.setMinZoom(7);
                    mapInstance.fitBounds(indianBounds);
                  }
                }}
                className="bg-white border border-purple-200 hover:bg-purple-600 hover:text-white text-xs h-7 px-3 text-gray-800 font-semibold transition-all duration-200 justify-start"
              >
                Océan Indien
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (mapInstance) {
                    // Unlock bounds and go to Pacific
                    const pacificBounds = L.latLngBounds(
                      L.latLng(-23.0, -179.0),
                      L.latLng(-8.0, 164.0)
                    );
                    mapInstance.setMaxBounds(pacificBounds);
                    mapInstance.setMinZoom(4);
                    mapInstance.fitBounds(pacificBounds);
                  }
                }}
                className="bg-white border border-cyan-200 hover:bg-cyan-600 hover:text-white text-xs h-7 px-3 text-gray-800 font-semibold transition-all duration-200 justify-start"
              >
                Pacifique
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Drawing Tools Panel */}
      <Card className="absolute bottom-4 left-4 z-[1000] w-64 bg-white/95 backdrop-blur-sm shadow-lg border-gray-200">
        <CardHeader className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs text-gray-900 font-bold uppercase tracking-wide">
              Outils de Cartographie
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="h-5 w-5 p-0 hover:bg-gray-100 text-gray-700 font-bold transition-colors text-sm"
            >
              {isControlsOpen ? "−" : "+"}
            </Button>
          </div>
        </CardHeader>

        {isControlsOpen && (
          <CardContent className="pt-3 pb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded hover:bg-blue-50 transition-colors border-l-2 border-transparent hover:border-blue-500 cursor-default">
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21L3 17l4-4m0 8l6.5-6.5m0 0L17 21l4-4-3-3M10.5 14.5L3 7l4-4 3.5 3.5" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 font-semibold">Polygone</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded hover:bg-green-50 transition-colors border-l-2 border-transparent hover:border-green-500 cursor-default">
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 border-2 border-white rounded-full"></div>
                </div>
                <span className="text-xs text-gray-700 font-semibold">Cercle</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded hover:bg-orange-50 transition-colors border-l-2 border-transparent hover:border-orange-500 cursor-default">
                <div className="w-5 h-5 bg-orange-600 rounded flex items-center justify-center">
                  <div className="w-3 h-2 border border-white"></div>
                </div>
                <span className="text-xs text-gray-700 font-semibold">Rectangle</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded hover:bg-purple-50 transition-colors border-l-2 border-transparent hover:border-purple-500 cursor-default">
                <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 font-semibold">Modifier</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded hover:bg-red-50 transition-colors border-l-2 border-transparent hover:border-red-500 cursor-default">
                <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <span className="text-xs text-gray-700 font-semibold">Supprimer</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded">
              <p className="text-xs text-gray-600 text-center font-medium">
                Contrôles visibles en haut à gauche
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default FluRiskMap;
