import { useEffect, useState } from "react";
import axios from "axios";
import GrippeHeatMap from "./GrippeHeatMap";
import PredictionAssistant from "./PredictionAssistant";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "./ui/progress";

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

interface Stats {
  totalDepartments: number;
  averageRiskScore: number;
  totalInfections?: number;
  nationalVaccinationRate?: number;
}

function GrippeAlertDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [timeframe, setTimeframe] = useState<"current" | "forecast">("current");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await axios.get("/api/grippe-alert/stats");
        setStats(data);
      } catch (e) {
        setStatsError("Échec du chargement des statistiques");
      }
    };
    loadStats();
  }, []);

  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-gradient-to-br from-rose-600 to-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg tracking-tight">
                  GA
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    GrippeAlert
                  </h1>
                  <p className="text-xs text-gray-600 font-medium">
                    Prévision et simulation d'épidémies de grippe
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setTimeframe("current")}
                  className={`px-4 py-2 text-xs font-medium ${
                    timeframe === "current"
                      ? "bg-amber-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  } border border-gray-200 rounded-l-lg`}
                >
                  SITUATION ACTUELLE
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("forecast")}
                  className={`px-4 py-2 text-xs font-medium ${
                    timeframe === "forecast"
                      ? "bg-amber-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  } border border-l-0 border-gray-200 rounded-r-lg`}
                >
                  PRÉVISION À 4 SEMAINES
                </button>
              </div>
              <Button
                variant={showPrediction ? "outline" : "default"}
                size="sm"
                onClick={() => setShowPrediction(!showPrediction)}
                className={`px-5 py-2.5 font-semibold text-sm transition-all duration-200 uppercase tracking-wide ${
                  showPrediction
                    ? "bg-white border-2 border-amber-600 text-amber-600 hover:bg-amber-50 shadow-sm hover:shadow-md"
                    : "bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg"
                }`}
              >
                {showPrediction ? "Fermer le Simulateur" : "Ouvrir le Simulateur"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Map Section */}
        <div className="flex-1 relative">
          <GrippeHeatMap
            selectedDepartment={selectedDepartment}
            onDepartmentClick={handleDepartmentClick}
            timeframe={timeframe}
          />
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-white border-l border-gray-200 shadow-lg transition-all duration-300 flex flex-col">
          {showPrediction ? (
            <div className="flex-1 overflow-hidden">
              <PredictionAssistant 
                selectedDepartment={selectedDepartment}
                timeframe={timeframe}
              />
            </div>
          ) : (
            <div className="p-6 space-y-5 overflow-y-auto h-full bg-gray-50">
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-base text-gray-900 font-bold uppercase tracking-wider">
                    Statistiques Nationales
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 mt-1">
                    {timeframe === "current" 
                      ? "Données épidémiologiques en temps réel" 
                      : "Prévisions épidémiologiques à 4 semaines"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-l-4 border-amber-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                            Départements
                          </h4>
                          <p className="text-3xl font-bold text-amber-900 mb-1">
                            {stats ? stats.totalDepartments : "—"}
                          </p>
                          <p className="text-xs text-amber-600 font-medium">
                            Sous surveillance
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-l-4 border-rose-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
                            Risque Moyen
                          </h4>
                          <p className="text-3xl font-bold text-rose-900 mb-1">
                            {stats ? stats.averageRiskScore.toFixed(2) : "—"}
                          </p>
                          <p className="text-xs text-rose-600 font-medium">
                            {timeframe === "current" ? "Indice actuel" : "Indice prévu"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-l-4 border-indigo-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
                            Couverture Vaccinale
                          </h4>
                          <p className="text-3xl font-bold text-indigo-900 mb-1">
                            {stats && stats.nationalVaccinationRate
                              ? `${(stats.nationalVaccinationRate * 100).toFixed(1)}%`
                              : "—"}
                          </p>
                          <p className="text-xs text-indigo-600 font-medium">
                            Moyenne nationale
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-l-4 border-emerald-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                            Cas Confirmés
                          </h4>
                          <p className="text-3xl font-bold text-emerald-900 mb-1">
                            {stats && stats.totalInfections
                              ? stats.totalInfections.toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-xs text-emerald-600 font-medium">
                            {timeframe === "current" ? "Cette semaine" : "Prévision"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {selectedDepartment && (
                <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="border-b border-gray-100 pb-3">
                    <CardTitle className="text-base text-gray-900 font-bold">
                      {selectedDepartment.name}
                    </CardTitle>
                    <div className="flex items-center mt-1">
                      <Badge
                        variant={
                          selectedDepartment.riskLevel === "very-high"
                            ? "destructive"
                            : selectedDepartment.riskLevel === "high"
                            ? "secondary"
                            : selectedDepartment.riskLevel === "medium"
                            ? "outline"
                            : "default"
                        }
                        className="text-xs mr-2"
                      >
                        {selectedDepartment.riskLevel === "very-high"
                          ? "Très Élevé"
                          : selectedDepartment.riskLevel === "high"
                          ? "Élevé"
                          : selectedDepartment.riskLevel === "medium"
                          ? "Modéré"
                          : "Faible"}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        Score: {selectedDepartment.riskScore.toFixed(1)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">
                          Taux d'infection:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.infectionRate?.toFixed(2)}%
                        </span>
                      </div>
                      <Progress
                        value={selectedDepartment.infectionRate}
                        className="h-2 bg-gray-100"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">
                          Couverture vaccinale:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.vaccinationRate?.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={selectedDepartment.vaccinationRate}
                        className="h-2 bg-gray-100"
                      />
                    </div>

                    {selectedDepartment.hospitalizations && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Hospitalisations:
                          </span>
                          <span className="font-mono text-sm">
                            {selectedDepartment.hospitalizations}
                          </span>
                        </div>
                        {selectedDepartment.deathRate && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-rose-700">
                              Taux de mortalité:
                            </span>
                            <span className="font-mono text-sm text-rose-600">
                              {selectedDepartment.deathRate.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.antibioticResistance && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-amber-700">
                              Résistance antibiotique:
                            </span>
                            <span className="font-mono text-sm text-amber-600">
                              {selectedDepartment.antibioticResistance.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.medicalCapacity && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-emerald-700">
                              Capacité médicale:
                            </span>
                            <span className="font-mono text-sm text-emerald-600">
                              {selectedDepartment.medicalCapacity}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.medicalCapacityLevel && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Niveau de saturation:</span>
                            <Badge
                              variant={
                                selectedDepartment.medicalCapacityLevel === "critical"
                                  ? "destructive"
                                  : selectedDepartment.medicalCapacityLevel === "high"
                                  ? "secondary"
                                  : selectedDepartment.medicalCapacityLevel === "moderate"
                                  ? "outline"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {selectedDepartment.medicalCapacityLevel === "critical" ? "Critique" :
                                selectedDepartment.medicalCapacityLevel === "high" ? "Élevé" :
                                  selectedDepartment.medicalCapacityLevel === "moderate" ? "Modéré" : "Normal"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedDepartment.predictedPeakDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-purple-700">
                          Pic prévu:
                        </span>
                        <span className="font-mono text-sm text-purple-600">
                          {selectedDepartment.predictedPeakDate}
                        </span>
                      </div>
                    )}
                    {selectedDepartment.schoolAbsences && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Absences scolaires:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.schoolAbsences}%
                        </span>
                      </div>
                    )}
                    {selectedDepartment.population && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Population:
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.population.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-base text-gray-900 font-bold uppercase tracking-wider">
                    Fonctionnalités du Simulateur
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-white border-l-4 border-amber-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-amber-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span className="leading-relaxed font-medium">Simulez l'évolution de l'épidémie avec différents paramètres</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-white border-l-4 border-emerald-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-emerald-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span className="leading-relaxed font-medium">Testez différentes stratégies de vaccination et mesures sanitaires</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-white border-l-4 border-indigo-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span className="leading-relaxed font-medium">Comparez les données réelles avec des modèles prédictifs</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-rose-50 to-white border-l-4 border-rose-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-rose-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <span className="leading-relaxed font-medium">Visualisez l'impact de la résistance aux antibiotiques sur l'épidémie</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-3">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">Source:</span> Santé Publique France & INSERM
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Propulsé par</span>
              <span className="font-semibold text-amber-600">ModelEpi</span>
              <span className="text-gray-400">&</span>
              <span className="font-semibold text-amber-600">GeoData Santé</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default GrippeAlertDashboard;