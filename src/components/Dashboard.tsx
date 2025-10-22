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
  fluCoverage?: number;
  covidCoverage?: number;
  hpvCoverage?: number;
  meningococcalCoverage?: number;
  vaccinationRiskLevel?: string;
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
  const [exportStatus, setExportStatus] = useState<string | null>(null);

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

  // Fonction pour exporter les données de vaccination en CSV
  const exportVaccinationData = async () => {
    setExportStatus("Exportation de la vaccination...");

    try {
      // Récupérer les données de vaccination depuis le fichier flu_vaccination.csv
      const response = await axios.get('/data/processed/flu_vaccination.csv', {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `données_vaccination_grippe_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);

      // Déclencher le téléchargement
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Mettre à jour le statut
      setExportStatus("Exportation réussie");
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error("Erreur lors de l'exportation des données de vaccination", error);
      setExportStatus("Erreur lors de l'exportation");
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  // Fonction pour exporter les données d'incidence en CSV
  const exportIncidenceData = async () => {
    setExportStatus("Exportation de l'incidence...");

    try {
      // Récupérer les données d'incidence depuis le fichier flu_incidence.csv
      const response = await axios.get('/data/processed/flu_incidence.csv', {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `données_incidence_grippe_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);

      // Déclencher le téléchargement
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Mettre à jour le statut
      setExportStatus("Exportation réussie");
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error("Erreur lors de l'exportation des données d'incidence", error);
      setExportStatus("Erreur lors de l'exportation");
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  // Fonction pour exporter les données combinées (both) en CSV
  const exportCombinedData = async () => {
    setExportStatus("Exportation des données combinées...");

    try {
      // Récupérer les données combinées depuis le fichier combined.csv
      const response = await axios.get('/data/processed/combined.csv', {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `données_complètes_grippe_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);

      // Déclencher le téléchargement
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Mettre à jour le statut
      setExportStatus("Exportation réussie");
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error("Erreur lors de l'exportation des données combinées", error);
      setExportStatus("Erreur lors de l'exportation");
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#000091] rounded flex items-center justify-center text-white text-lg font-bold">
                  GS
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#161616]">
                    GeoSante
                  </h1>
                  <p className="text-sm text-[#666666] font-medium">
                    Surveillance épidémiologique intelligente
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('./Simulateur/index.html', '_blank')}
                className="px-6 py-2.5 font-medium text-sm border-[#18753c] text-[#18753c] hover:bg-[#18753c] hover:text-white"
              >
                Simulateur
              </Button>
              <Button
                variant={showChatbot ? "outline" : "default"}
                size="sm"
                onClick={() => setShowChatbot(!showChatbot)}
                className={`px-6 py-2.5 font-medium text-sm ${showChatbot
                  ? "border-[#000091] text-[#000091] hover:bg-[#000091] hover:text-white"
                  : "bg-[#000091] hover:bg-[#1212ff] text-white"
                  }`}
              >
                {showChatbot ? "Fermer l'Assistant" : "Ouvrir l'Assistant"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative">
          <FluRiskMap
            selectedDepartment={selectedDepartment}
            onDepartmentClick={handleDepartmentClick}
          />
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-white border-l border-gray-200 shadow-sm transition-all duration-300 flex flex-col min-h-full">
          {showChatbot ? (
            <div className="flex-1 min-h-0">
              <ChatBot />
            </div>
          ) : (
            <div className="p-6 space-y-6 overflow-y-auto h-full bg-gray-50">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg text-[#161616] font-bold">
                    Statistiques Nationales
                  </CardTitle>
                  <CardDescription className="text-sm text-[#666666] mt-1">
                    Données de santé en temps réel
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-5">
                        <div>
                          <h4 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
                            Départements
                          </h4>
                          <p className="text-3xl font-bold text-[#161616] mb-2">
                            {stats ? stats.totalDepartments : "—"}
                          </p>
                          <p className="text-xs text-[#666666] font-medium">
                            Analysés
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-5">
                        <div>
                          <h4 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
                            Risque Moyen
                          </h4>
                          <p className="text-3xl font-bold text-[#161616] mb-2">
                            {stats ? stats.averageRiskScore.toFixed(2) : "—"}
                          </p>
                          <p className="text-xs text-[#666666] font-medium">
                            Score national
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-5">
                        <div>
                          <h4 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
                            Vaccination
                          </h4>
                          <p className="text-3xl font-bold text-[#161616] mb-2">
                            {stats && stats.averageVaccinationCoverage
                              ? `${(
                                stats.averageVaccinationCoverage * 100
                              ).toFixed(0)}%`
                              : "—"}
                          </p>
                          <p className="text-xs text-[#666666] font-medium">
                            Couverture moyenne
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-5">
                        <div>
                          <h4 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
                            Urgences
                          </h4>
                          <p className="text-3xl font-bold text-[#161616] mb-2">
                            {stats &&
                              typeof stats.totalEmergencyVisits === "number"
                              ? stats.totalEmergencyVisits.toLocaleString()
                              : "—"}
                          </p>
                          <p className="text-xs text-[#666666] font-medium">
                            Visites totales
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Export Section */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg text-[#161616] font-bold">
                    Export des Données
                  </CardTitle>
                  <CardDescription className="text-sm text-[#666666] mt-1">
                    Téléchargez les données au format CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={exportVaccinationData}
                      className="w-full border border-[#18753c] text-[#18753c] hover:bg-[#18753c] hover:text-white font-medium disabled:opacity-50"
                      disabled={!!exportStatus}
                    >
                      {exportStatus && exportStatus.includes("vaccination") ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                          Exportation...
                        </>
                      ) : (
                        <>📊 Export Vaccination</>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportIncidenceData}
                      className="w-full border border-[#d64d00] text-[#d64d00] hover:bg-[#d64d00] hover:text-white font-medium disabled:opacity-50"
                      disabled={!!exportStatus}
                    >
                      {exportStatus && exportStatus.includes("incidence") ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                          Exportation...
                        </>
                      ) : (
                        <>📈 Export Incidence</>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportCombinedData}
                      className="w-full border border-[#6a6af4] text-[#6a6af4] hover:bg-[#6a6af4] hover:text-white font-medium disabled:opacity-50"
                      disabled={!!exportStatus}
                    >
                      {exportStatus && exportStatus.includes("combinées") ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                          Exportation...
                        </>
                      ) : (
                        <>📋 Export Données Complètes</>
                      )}
                    </Button>

                    {exportStatus && !exportStatus.includes("...") && (
                      <div className="text-sm text-green-600 font-medium text-center mt-2">
                        {exportStatus}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {statsError && (
                <Alert variant="destructive">
                  <AlertDescription>{statsError}</AlertDescription>
                </Alert>
              )}

              {selectedDepartment && (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-200 bg-gray-50">
                    <CardTitle className="text-lg text-[#161616] font-bold">
                      {selectedDepartment.name}
                    </CardTitle>
                    <CardDescription className="text-[#666666] text-sm uppercase tracking-wide font-semibold">
                      Département {selectedDepartment.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
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
                        <span className="font-mono text-sm">
                          {selectedDepartment.vaccinationCoverage
                            ? `${(selectedDepartment.vaccinationCoverage * 100).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                      <Progress
                        value={
                          selectedDepartment.vaccinationCoverage
                            ? selectedDepartment.vaccinationCoverage * 100
                            : 0
                        }
                        className="h-2 bg-gray-100"
                      />
                    </div>

                    {selectedDepartment.vaccinationCoverage && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Couverture Vaccinale Globale :
                          </span>
                          <span className="font-mono text-sm">
                            {(
                              selectedDepartment.vaccinationCoverage * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        {selectedDepartment.fluCoverage && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-700">
                              Vaccination Grippe :
                            </span>
                            <span className="font-mono text-sm text-blue-600">
                              {(selectedDepartment.fluCoverage * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.covidCoverage && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-green-700">
                              Vaccination COVID-19 :
                            </span>
                            <span className="font-mono text-sm text-green-600">
                              {(selectedDepartment.covidCoverage * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.hpvCoverage && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-purple-700">
                              Vaccination HPV :
                            </span>
                            <span className="font-mono text-sm text-purple-600">
                              {(selectedDepartment.hpvCoverage * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.meningococcalCoverage && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-orange-700">
                              Vaccination Méningocoque C :
                            </span>
                            <span className="font-mono text-sm text-orange-600">
                              {(selectedDepartment.meningococcalCoverage * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedDepartment.vaccinationRiskLevel && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Risque Vaccinal :</span>
                            <Badge
                              variant={
                                selectedDepartment.vaccinationRiskLevel === "very-high"
                                  ? "destructive"
                                  : selectedDepartment.vaccinationRiskLevel === "high"
                                    ? "secondary"
                                    : selectedDepartment.vaccinationRiskLevel === "medium"
                                      ? "outline"
                                      : "default"
                              }
                              className="text-xs"
                            >
                              {selectedDepartment.vaccinationRiskLevel === "very-high" ? "Très Élevé" :
                                selectedDepartment.vaccinationRiskLevel === "high" ? "Élevé" :
                                  selectedDepartment.vaccinationRiskLevel === "medium" ? "Moyen" : "Faible"}
                            </Badge>
                          </div>
                        )}
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

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg text-[#161616] font-bold uppercase tracking-wider">
                    Guide d'Utilisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3 text-sm text-[#161616]">
                    <li className="flex items-start gap-3 p-3 border-l-4 border-[#000091]">
                      <span className="w-6 h-6 bg-[#000091] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span className="leading-relaxed font-medium">Cliquez sur les départements pour voir les données détaillées</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 border-l-4 border-[#18753c]">
                      <span className="w-6 h-6 bg-[#18753c] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span className="leading-relaxed font-medium">Utilisez les outils de dessin pour créer des zones personnalisées</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 border-l-4 border-[#6a6af4]">
                      <span className="w-6 h-6 bg-[#6a6af4] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span className="leading-relaxed font-medium">Consultez l'assistant IA pour des analyses et prédictions</span>
                    </li>
                    <li className="flex items-start gap-3 p-3 border-l-4 border-[#d64d00]">
                      <span className="w-6 h-6 bg-[#d64d00] text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
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
