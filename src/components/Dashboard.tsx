import { useEffect, useState } from "react";
import axios from "axios";
import FluRiskMap from "./FluRiskMap";
import ChatBot from "./ChatBot";
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
  vaccinationCoverage?: number;
  emergencyVisits?: number;
  sosMedecinsActs?: number;
  population?: number;
}

interface Stats {
  totalDepartments: number;
  averageRiskScore: number;
  averageVaccinationCoverage?: number;
  totalEmergencyVisits?: number;
}

function Dashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await axios.get("/api/risk-data/stats");
        setStats(data);
      } catch (e) {
        setStatsError("Failed to load stats");
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
                <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg tracking-tight">
                  GS
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    GeoSante
                  </h1>
                  <p className="text-xs text-gray-600 font-medium">
                    Surveillance épidémiologique de la grippe
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant={showChatbot ? "outline" : "default"}
                size="sm"
                onClick={() => setShowChatbot(!showChatbot)}
                className={`px-5 py-2.5 font-semibold text-sm transition-all duration-200 uppercase tracking-wide ${showChatbot
                  ? "bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow-md"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  }`}
              >
                {showChatbot ? "Fermer l'Assistant" : "Ouvrir l'Assistant"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Map Section */}
        <div className="flex-1 relative">
          <FluRiskMap
            selectedDepartment={selectedDepartment}
            onDepartmentClick={handleDepartmentClick}
          />
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-white border-l border-gray-200 shadow-lg transition-all duration-300 flex flex-col">
          {showChatbot ? (
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          ) : (
            <div className="p-6 space-y-5 overflow-y-auto h-full bg-gray-50">
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-base text-gray-900 font-bold uppercase tracking-wider">
                    Statistiques Nationales
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 mt-1">
                    Données de santé en temps réel
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-l-4 border-blue-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                            Départements
                          </h4>
                          <p className="text-3xl font-bold text-blue-900 mb-1">
                            {stats ? stats.totalDepartments : "—"}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            Analysés
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-l-4 border-orange-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">
                            Risque Moyen
                          </h4>
                          <p className="text-3xl font-bold text-orange-900 mb-1">
                            {stats ? stats.averageRiskScore.toFixed(2) : "—"}
                          </p>
                          <p className="text-xs text-orange-600 font-medium">
                            Score national
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-l-4 border-green-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                            Vaccination
                          </h4>
                          <p className="text-3xl font-bold text-green-900 mb-1">
                            {stats && stats.averageVaccinationCoverage
                              ? `${(
                                stats.averageVaccinationCoverage * 100
                              ).toFixed(0)}%`
                              : "—"}
                          </p>
                          <p className="text-xs text-green-600 font-medium">
                            Couverture moyenne
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-l-4 border-red-600 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div>
                          <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                            Urgences
                          </h4>
                          <p className="text-3xl font-bold text-red-900 mb-1">
                            {stats &&
                              typeof stats.totalEmergencyVisits === "number"
                              ? stats.totalEmergencyVisits.toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-xs text-red-600 font-medium">
                            Visites totales
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
              {statsError && (
                <Alert variant="destructive">
                  <AlertDescription>{statsError}</AlertDescription>
                </Alert>
              )}

              {selectedDepartment && (
                <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow border-l-4 border-indigo-600">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-base text-gray-900 font-bold">
                      {selectedDepartment.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-xs uppercase tracking-wide font-semibold">
                      Département {selectedDepartment.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Niveau de Risque :</span>
                      <Badge
                        variant={
                          selectedDepartment.riskLevel === "high"
                            ? "destructive"
                            : selectedDepartment.riskLevel === "medium"
                              ? "secondary"
                              : "default"
                        }
                        className="text-xs"
                      >
                        {selectedDepartment.riskLevel}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Score de Risque :</span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.riskScore}
                        </span>
                      </div>
                      <Progress
                        value={selectedDepartment.riskScore * 100}
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        {selectedDepartment.riskScore < 0.3 ? "Risque Faible" :
                          selectedDepartment.riskScore < 0.6 ? "Risque Moyen" :
                            selectedDepartment.riskScore < 0.8 ? "Risque Élevé" : "Risque Très Élevé"}
                      </div>
                    </div>
                    {selectedDepartment.vaccinationCoverage && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Couverture Vaccinale :
                        </span>
                        <span className="font-mono text-sm">
                          {(
                            selectedDepartment.vaccinationCoverage * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    )}
                    {selectedDepartment.emergencyVisits && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Visites d'Urgence :
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.emergencyVisits}
                        </span>
                      </div>
                    )}
                    {selectedDepartment.sosMedecinsActs && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Actes SOS Médecins :
                        </span>
                        <span className="font-mono text-sm">
                          {selectedDepartment.sosMedecinsActs}
                        </span>
                      </div>
                    )}
                    {selectedDepartment.population && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Population :
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
                    Guide d'Utilisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-white border-l-4 border-blue-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span className="leading-relaxed font-medium">Cliquez sur les marqueurs pour voir les données détaillées</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-white border-l-4 border-green-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span className="leading-relaxed font-medium">Utilisez les outils de dessin pour créer des zones personnalisées</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-white border-l-4 border-purple-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span className="leading-relaxed font-medium">Consultez l'assistant IA pour des analyses et prédictions</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-white border-l-4 border-orange-500 hover:shadow-sm transition-all">
                      <span className="w-6 h-6 bg-orange-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <span className="leading-relaxed font-medium">Modifiez les formes dessinées selon vos besoins</span>
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
              <span className="font-medium text-gray-700">Source:</span> Données ouvertes du gouvernement français
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Propulsé par</span>
              <span className="font-semibold text-blue-600">OpenStreetMap</span>
              <span className="text-gray-400">&</span>
              <span className="font-semibold text-blue-600">Geoman.io</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
