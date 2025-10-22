import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Supprimer les icônes par défaut de Leaflet qui causent souvent des problèmes
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/icons/marker-icon-2x.png",
  iconUrl: "/icons/marker-icon.png",
  shadowUrl: "/icons/marker-shadow.png",
});

interface Department {
  code: string;
  name: string;
  riskScore: number;
  riskLevel: string;
  infectionRate?: number;
  hospitalizations?: number;
  deathRate?: number;
  vaccinationRate?: number;
  antibioticResistance?: number;
  medicalCapacity?: number;
  medicalCapacityLevel?: string;
  predictedPeakDate?: string;
  schoolAbsences?: number;
  population?: number;
}

interface GeoJSONDepartment {
  type: "Feature";
  properties: {
    code: string;
    nom: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface GrippeHeatMapProps {
  selectedDepartment: Department | null;
  onDepartmentClick: (department: Department) => void;
  timeframe: "current" | "forecast";
}

function MapControls({ timeframe }: { timeframe: "current" | "forecast" }) {
  const map = useMap();

  useEffect(() => {
    // Réinitialise la vue de la carte lorsque le timeframe change
    map.setView([46.603354, 1.888334], 6);
  }, [timeframe, map]);

  return null;
}

function GrippeHeatMap({ 
  selectedDepartment, 
  onDepartmentClick, 
  timeframe 
}: GrippeHeatMapProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Chargement des données GeoJSON des départements français
        const geoResponse = await axios.get("/api/geojson/departments");
        setGeoData(geoResponse.data);
        
        // Chargement des données de risque selon le timeframe
        const endpoint = timeframe === "current" 
          ? "/api/grippe-alert/current" 
          : "/api/grippe-alert/forecast";
        
        const dataResponse = await axios.get(endpoint);
        setDepartments(dataResponse.data);
        
        setLoading(false);
      } catch (e) {
        setError("Impossible de charger les données de la carte");
        setLoading(false);
      }
    };
    
    loadData();
  }, [timeframe]);

  // Fonction pour déterminer la couleur en fonction du niveau de risque
  const getColor = (riskScore: number) => {
    if (riskScore >= 8) return "#ef4444"; // rouge (très élevé)
    if (riskScore >= 6) return "#f97316"; // orange (élevé)
    if (riskScore >= 4) return "#eab308"; // jaune (modéré)
    if (riskScore >= 2) return "#84cc16"; // vert clair (faible)
    return "#22c55e"; // vert (très faible)
  };

  // Style pour chaque département
  const style = (feature: GeoJSONDepartment) => {
    const departmentData = departments.find(
      (d) => d.code === feature.properties.code
    );
    
    return {
      fillColor: departmentData ? getColor(departmentData.riskScore) : "#cccccc",
      weight: selectedDepartment?.code === feature.properties.code ? 3 : 1,
      opacity: 1,
      color: selectedDepartment?.code === feature.properties.code ? "#3730a3" : "white",
      dashArray: "3",
      fillOpacity: timeframe === "forecast" ? 0.5 : 0.7,
    };
  };

  // Fonction appelée lors du clic sur un département
  const onEachFeature = (feature: GeoJSONDepartment, layer: L.Layer) => {
    layer.on({
      click: (e) => {
        const departmentData = departments.find(
          (d) => d.code === feature.properties.code
        );
        
        if (departmentData) {
          onDepartmentClick(departmentData);
          
          // Animation de mise en évidence
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: "#3730a3",
            fillOpacity: 0.8,
          });
        }
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: "#6366f1",
          fillOpacity: 0.8,
        });
      },
      mouseout: (e) => {
        const layer = e.target;
        const isSelected = selectedDepartment?.code === feature.properties.code;
        
        layer.setStyle({
          weight: isSelected ? 3 : 1,
          color: isSelected ? "#3730a3" : "white",
          fillOpacity: timeframe === "forecast" ? 0.5 : 0.7,
        });
      },
    });

    // Ajouter tooltip au survol
    const departmentData = departments.find(
      (d) => d.code === feature.properties.code
    );
    
    if (departmentData) {
      layer.bindTooltip(
        `<div class="font-sans">
          <div class="font-bold">${feature.properties.nom} (${feature.properties.code})</div>
          <div>Niveau de risque: <span class="font-semibold" style="color:${getColor(departmentData.riskScore)}">${
            departmentData.riskLevel === "very-high" ? "Très Élevé" :
            departmentData.riskLevel === "high" ? "Élevé" :
            departmentData.riskLevel === "medium" ? "Modéré" : "Faible"
          }</span></div>
          <div>Score: ${departmentData.riskScore.toFixed(1)}</div>
          <div>Taux d'infection: ${departmentData.infectionRate?.toFixed(2)}%</div>
        </div>`,
        { 
          direction: "top", 
          sticky: true,
          className: "custom-tooltip" 
        }
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-gray-700 font-medium">Chargement des données cartographiques...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error}. Veuillez rafraîchir la page ou contacter l'administrateur.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4 z-40">
        <div className="bg-white shadow-lg rounded-lg p-3 text-xs">
          <div className="font-bold mb-2">Niveau de risque {timeframe === "forecast" ? "(prévision)" : ""}</div>
          <div className="flex items-center mb-1">
            <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: "#ef4444" }}></div>
            <span>Très élevé (&gt; 8)</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: "#f97316" }}></div>
            <span>Élevé (6-8)</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: "#eab308" }}></div>
            <span>Modéré (4-6)</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: "#84cc16" }}></div>
            <span>Faible (2-4)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: "#22c55e" }}></div>
            <span>Très faible (&lt; 2)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={[46.603354, 1.888334]} // Centre de la France
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {geoData && (
          <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />
        )}

        <MapControls timeframe={timeframe} />
        
        {timeframe === "forecast" && (
          <div className="absolute bottom-4 left-4 z-40 bg-amber-50 p-2 rounded-md border border-amber-200">
            <div className="text-xs font-semibold text-amber-800">
              Mode prévision : données projetées sur 4 semaines
            </div>
          </div>
        )}
      </MapContainer>
    </>
  );
}

export default GrippeHeatMap;