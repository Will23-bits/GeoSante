import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

interface Simulation {
  id: string;
  name: string;
  description: string;
  baseReproductionNumber: number;
  vaccinationRateGoal: number;
  socialDistancingLevel: number;
  publicHealthMeasures: string[];
  results: SimulationResult[];
}

interface SimulationResult {
  week: number;
  date: string;
  infections: number;
  hospitalizations: number;
  deaths: number;
  riskScore: number;
}

interface PredictionAssistantProps {
  selectedDepartment: Department | null;
  timeframe: "current" | "forecast";
}

function PredictionAssistant({ selectedDepartment, timeframe }: PredictionAssistantProps) {
  const [activeTab, setActiveTab] = useState<string>("simulator");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [predictionResults, setPredictionResults] = useState<SimulationResult[] | null>(null);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null);
  const [savedSimulations, setSavedSimulations] = useState<Simulation[]>([]);
  const [messages, setMessages] = useState<{role: string; content: string}[]>([
    {
      role: "system",
      content: "Bonjour, je suis votre assistant de prédiction épidémiologique. Comment puis-je vous aider aujourd'hui?"
    }
  ]);
  
  // Paramètres de simulation
  const [simulationName, setSimulationName] = useState<string>("");
  const [r0Value, setR0Value] = useState<number>(2.5);
  const [vaccinationTarget, setVaccinationTarget] = useState<number>(70);
  const [socialDistancing, setSocialDistancing] = useState<number>(30);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messageInput = useRef<null | HTMLInputElement>(null);

  // Charge les simulations sauvegardées au chargement
  useEffect(() => {
    const loadSavedSimulations = async () => {
      try {
        setLoading(true);
        
        // Dans un environnement réel, nous chargerions depuis une API
        const response = await axios.get("/api/grippe-alert/saved-simulations");
        setSavedSimulations(response.data);
        
        setLoading(false);
      } catch (e) {
        console.error("Erreur lors du chargement des simulations", e);
        setLoading(false);
      }
    };
    
    loadSavedSimulations();
  }, []);
  
  // Scroll automatique vers le bas dans le chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Fonction pour exécuter la simulation
  const runSimulation = async () => {
    if (!selectedDepartment) {
      setError("Veuillez sélectionner un département pour lancer une simulation");
      return;
    }
    
    if (simulationName.trim() === "") {
      setError("Veuillez nommer votre simulation");
      return;
    }
    
    setError(null);
    setSimulating(true);
    
    try {
      // Simulation factice - dans un environnement réel, cela appellerait une API
      // Attente artificielle pour simuler le temps de calcul
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Création de données fictives de simulation
      const startDate = new Date();
      const results: SimulationResult[] = [];
      
      // Calculs basés sur les paramètres
      // Facteurs d'influence: R0, taux de vaccination, distanciation sociale
      const effectiveR0 = r0Value * (1 - vaccinationTarget / 100 * 0.7) * (1 - socialDistancing / 100 * 0.5);
      
      // Simulation sur 12 semaines
      for (let week = 0; week < 12; week++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7);
        
        // Modèle exponentiel simple pour les infections
        // Influencé par l'effectiveR0 et les mesures de santé publique
        const baseInfections = selectedDepartment.infectionRate * selectedDepartment.population / 100;
        const measureImpact = selectedMeasures.length * 0.1; // Chaque mesure réduit de 10%
        
        let infections = baseInfections * Math.pow(effectiveR0 * (1 - measureImpact), week / 3);
        
        // Ajouter un peu de variabilité aléatoire
        infections = infections * (0.9 + Math.random() * 0.2);
        
        // Limiter à la population
        infections = Math.min(infections, selectedDepartment.population);
        
        // Calculer hospitalisations et décès basés sur les infections
        const hospitalizations = infections * 0.05; // 5% des infections
        const deaths = hospitalizations * 0.1; // 10% des hospitalisations
        
        // Risque calculé comme une fonction des infections, hospitalisations et décès
        const riskScore = (infections / selectedDepartment.population * 100) * 0.5 + 
                          (hospitalizations / selectedDepartment.population * 100) * 3 +
                          (deaths / selectedDepartment.population * 100) * 10;
        
        results.push({
          week,
          date: date.toISOString().split('T')[0],
          infections: Math.round(infections),
          hospitalizations: Math.round(hospitalizations),
          deaths: Math.round(deaths),
          riskScore: Math.min(10, riskScore)
        });
      }
      
      // Créer une nouvelle simulation
      const newSimulation: Simulation = {
        id: Date.now().toString(),
        name: simulationName,
        description: `R0: ${r0Value}, Vaccination: ${vaccinationTarget}%, Distanciation: ${socialDistancing}%`,
        baseReproductionNumber: r0Value,
        vaccinationRateGoal: vaccinationTarget,
        socialDistancingLevel: socialDistancing,
        publicHealthMeasures: selectedMeasures,
        results
      };
      
      // Mise à jour de l'état
      setCurrentSimulation(newSimulation);
      setPredictionResults(results);
      setSavedSimulations([...savedSimulations, newSimulation]);
      
      // Passer automatiquement à l'onglet résultats
      setActiveTab("results");
      
    } catch (e) {
      console.error("Erreur lors de la simulation", e);
      setError("Une erreur est survenue lors de la simulation");
    } finally {
      setSimulating(false);
    }
  };

  // Charger une simulation sauvegardée
  const loadSimulation = (simulation: Simulation) => {
    setCurrentSimulation(simulation);
    setPredictionResults(simulation.results);
    setR0Value(simulation.baseReproductionNumber);
    setVaccinationTarget(simulation.vaccinationRateGoal);
    setSocialDistancing(simulation.socialDistancingLevel);
    setSelectedMeasures(simulation.publicHealthMeasures);
    setSimulationName(simulation.name);
    setActiveTab("results");
  };
  
  // Envoyer un message à l'assistant
  const sendMessage = async () => {
    if (!messageInput.current || messageInput.current.value.trim() === "") return;
    
    const userMessage = messageInput.current.value;
    setMessages([...messages, { role: "user", content: userMessage }]);
    messageInput.current.value = "";
    
    // Simuler une réponse du système
    setTimeout(() => {
      let response = "Je suis désolé, je n'ai pas pu traiter votre demande.";
      
      // Réponses basiques basées sur des mots-clés
      if (userMessage.toLowerCase().includes("prévision") || 
          userMessage.toLowerCase().includes("pic") ||
          userMessage.toLowerCase().includes("quand")) {
        response = "Selon nos modèles, le pic épidémique devrait survenir dans 4 à 6 semaines si aucune mesure supplémentaire n'est mise en place. La vaccination ciblée pourrait retarder ce pic de 2 semaines supplémentaires.";
      } else if (userMessage.toLowerCase().includes("efficace") || 
                userMessage.toLowerCase().includes("mesure") ||
                userMessage.toLowerCase().includes("quoi faire")) {
        response = "Les mesures les plus efficaces selon nos simulations sont : 1) Augmenter la couverture vaccinale à plus de 75% de la population, 2) Mettre en place des mesures de distanciation dans les lieux à forte concentration, et 3) Renforcer le dépistage systématique dans les établissements scolaires et de santé.";
      } else if (userMessage.toLowerCase().includes("vaccin")) {
        response = "La vaccination reste l'outil le plus efficace pour limiter la propagation. Avec un taux de couverture de 80%, nos modèles prévoient une réduction de 65% des cas graves nécessitant une hospitalisation.";
      } else if (userMessage.toLowerCase().includes("enfant") || 
                userMessage.toLowerCase().includes("école")) {
        response = "Les établissements scolaires sont effectivement des foyers de transmission importants. Nos données montrent que l'augmentation des absences scolaires de 5% est généralement un indicateur précoce d'une vague épidémique. Des protocoles de ventilation et de dépistage peuvent réduire la transmission de 40%.";
      } else {
        response = "Pour vous aider plus efficacement, pourriez-vous préciser votre question ? Je peux vous renseigner sur les prévisions épidémiques, l'efficacité des mesures sanitaires, ou les stratégies de vaccination optimales.";
      }
      
      setMessages(prev => [...prev, { role: "system", content: response }]);
    }, 1000);
  };
  
  // Gérer la touche Entrée dans l'input du chat
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  // Toggle des mesures de santé publique
  const toggleMeasure = (measure: string) => {
    if (selectedMeasures.includes(measure)) {
      setSelectedMeasures(selectedMeasures.filter(m => m !== measure));
    } else {
      setSelectedMeasures([...selectedMeasures, measure]);
    }
  };
  
  // Formatter les données pour le graphique
  const formatChartData = () => {
    if (!predictionResults) return [];
    
    // Ajouter les données réelles si disponible
    const realData = timeframe === "current" ? predictionResults.slice(0, 4) : [];
    
    return predictionResults.map((result, index) => ({
      ...result,
      week: `S${result.week + 1}`,
      realInfections: index < realData.length ? result.infections * (0.9 + Math.random() * 0.2) : null,
    }));
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="simulator" className="flex-1">
                Simulateur
              </TabsTrigger>
              <TabsTrigger value="results" className="flex-1" disabled={!predictionResults}>
                Résultats
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex-1">
                Sauvegardés
              </TabsTrigger>
              <TabsTrigger value="assistant" className="flex-1">
                Assistant IA
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <TabsContent value="simulator" className="mt-0">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Paramètres de Simulation</CardTitle>
              <CardDescription>
                Configurez les variables pour modéliser l'évolution de l'épidémie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDepartment ? (
                <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertDescription>
                    Veuillez sélectionner un département sur la carte pour lancer une simulation
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center space-x-2 bg-amber-50 p-2 rounded-md border border-amber-200">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-xs font-medium text-amber-800">
                    Simulation pour: {selectedDepartment.name} ({selectedDepartment.code})
                  </span>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom de la simulation</label>
                <Input 
                  placeholder="ex: Scénario vaccination massive" 
                  value={simulationName}
                  onChange={(e) => setSimulationName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Taux de reproduction de base (R0)
                  </label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {r0Value.toFixed(1)}
                  </span>
                </div>
                <Slider 
                  defaultValue={[r0Value]} 
                  min={1} 
                  max={5} 
                  step={0.1}
                  onValueChange={(values) => setR0Value(values[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Faible (1.0)</span>
                  <span>Moyen (2.5)</span>
                  <span>Élevé (5.0)</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Objectif de couverture vaccinale
                  </label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {vaccinationTarget}%
                  </span>
                </div>
                <Slider 
                  defaultValue={[vaccinationTarget]} 
                  min={0} 
                  max={100} 
                  step={5}
                  onValueChange={(values) => setVaccinationTarget(values[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Niveau de distanciation sociale
                  </label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {socialDistancing}%
                  </span>
                </div>
                <Slider 
                  defaultValue={[socialDistancing]} 
                  min={0} 
                  max={100} 
                  step={5}
                  onValueChange={(values) => setSocialDistancing(values[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Aucune</span>
                  <span>Modérée</span>
                  <span>Maximale</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Mesures de santé publique</label>
                <div className="flex flex-wrap gap-2">
                  {["Dépistage intensif", "Masques obligatoires", "Limitations événements", 
                   "Fermeture écoles", "Télétravail", "Traitement précoce", "Campagne sensibilisation",
                   "Restrictions voyage"].map(measure => (
                    <Badge 
                      key={measure}
                      variant={selectedMeasures.includes(measure) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        selectedMeasures.includes(measure) 
                          ? "bg-amber-600 hover:bg-amber-700" 
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => toggleMeasure(measure)}
                    >
                      {measure}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runSimulation} 
                disabled={simulating || !selectedDepartment || simulationName.trim() === ""}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {simulating ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Simulation en cours...
                  </div>
                ) : "Lancer la simulation"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="mt-0">
          {!predictionResults ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 italic">Aucun résultat disponible</div>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold">{currentSimulation?.name}</CardTitle>
                      <CardDescription>
                        {currentSimulation?.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      Simulation
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatChartData()}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="week"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => `Semaine ${value.substring(1)}`}
                          formatter={(value, name) => {
                            if (name === "riskScore") return [value.toFixed(1), "Score de risque"];
                            if (name === "infections") return [value.toLocaleString(), "Infections"];
                            if (name === "realInfections") return [value.toLocaleString(), "Infections (réelles)"];
                            if (name === "hospitalizations") return [value.toLocaleString(), "Hospitalisations"];
                            if (name === "deaths") return [value.toLocaleString(), "Décès"];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="infections" 
                          name="Infections (prévues)"
                          stroke="#f59e0b" 
                          activeDot={{ r: 6 }}
                          strokeWidth={2} 
                        />
                        {timeframe === "current" && (
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="realInfections" 
                            name="Infections (réelles)"
                            stroke="#3b82f6" 
                            strokeDasharray="5 5"
                            dot={{ r: 4 }}
                          />
                        )}
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="hospitalizations" 
                          name="Hospitalisations"
                          stroke="#059669" 
                          strokeWidth={1.5}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="deaths" 
                          name="Décès"
                          stroke="#dc2626"
                          strokeWidth={1.5} 
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="riskScore" 
                          name="Score de risque"
                          stroke="#8b5cf6" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Résultats Détaillés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Semaine</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Infections</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Hospitalisations</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Décès</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Risque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {predictionResults.map((result) => (
                          <tr key={result.week} className={result.week < 4 ? "bg-amber-50" : ""}>
                            <td className="px-4 py-2 font-medium">S{result.week + 1}</td>
                            <td className="px-4 py-2">{result.date}</td>
                            <td className="px-4 py-2">{result.infections.toLocaleString()}</td>
                            <td className="px-4 py-2">{result.hospitalizations.toLocaleString()}</td>
                            <td className="px-4 py-2">{result.deaths.toLocaleString()}</td>
                            <td className="px-4 py-2">
                              <Badge variant={
                                result.riskScore >= 8 ? "destructive" :
                                result.riskScore >= 6 ? "secondary" :
                                result.riskScore >= 4 ? "outline" : "default"
                              }>
                                {result.riskScore.toFixed(1)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Analyse et Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">
                      D'après cette simulation, l'épidémie de grippe 
                      {predictionResults[predictionResults.length - 1].riskScore > 7 ? 
                        " présente un risque élevé " : 
                        predictionResults[predictionResults.length - 1].riskScore > 4 ? 
                          " présente un risque modéré " : 
                          " reste sous contrôle "} 
                      sur la période modélisée.
                    </p>
                    
                    <Alert className={
                      predictionResults[predictionResults.length - 1].riskScore > 7 ? 
                        "bg-red-50 border-red-200 text-red-800" :
                        predictionResults[predictionResults.length - 1].riskScore > 4 ?
                          "bg-amber-50 border-amber-200 text-amber-800" :
                          "bg-green-50 border-green-200 text-green-800"
                    }>
                      <AlertDescription>
                        {predictionResults[predictionResults.length - 1].riskScore > 7 ? 
                          "Des mesures urgentes sont recommandées pour atténuer l'impact de l'épidémie." :
                          predictionResults[predictionResults.length - 1].riskScore > 4 ?
                            "Une vigilance accrue et des mesures préventives sont conseillées." :
                            "Maintenir les mesures de prévention actuelles semble suffisant."}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                      <h4 className="font-bold text-sm mb-2">Recommandations :</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {vaccinationTarget < 70 && (
                          <li className="text-blue-800">
                            Augmenter la couverture vaccinale à au moins 70% de la population
                          </li>
                        )}
                        {socialDistancing < 50 && predictionResults[predictionResults.length - 1].riskScore > 6 && (
                          <li className="text-blue-800">
                            Renforcer les mesures de distanciation sociale dans les espaces publics
                          </li>
                        )}
                        {!selectedMeasures.includes("Dépistage intensif") && (
                          <li className="text-blue-800">
                            Mettre en place un dépistage intensif pour identifier les clusters
                          </li>
                        )}
                        {predictionResults[predictionResults.length - 1].riskScore > 7 && (
                          <li className="text-blue-800">
                            Préparer les services hospitaliers à une augmentation des admissions
                          </li>
                        )}
                        {!selectedMeasures.includes("Campagne sensibilisation") && (
                          <li className="text-blue-800">
                            Lancer une campagne de sensibilisation aux gestes barrières
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="saved" className="mt-0">
          {savedSimulations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <p className="text-sm italic mb-2">Aucune simulation sauvegardée</p>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("simulator")}
              >
                Créer une simulation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Simulations sauvegardées ({savedSimulations.length})
              </h3>
              <div className="grid gap-3">
                {savedSimulations.map((sim) => (
                  <Card 
                    key={sim.id}
                    className="cursor-pointer transition-all hover:border-amber-300 hover:shadow-md"
                    onClick={() => loadSimulation(sim)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{sim.name}</h4>
                          <p className="text-xs text-gray-500">{sim.description}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadSimulation(sim);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="assistant" className="mt-0 h-full overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-1 py-2">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-3/4 rounded-lg px-4 py-2 ${
                      msg.role === "user" 
                        ? "bg-amber-600 text-white" 
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex gap-2">
              <Input
                ref={messageInput}
                placeholder="Posez une question sur l'épidémie de grippe..."
                className="flex-1"
                onKeyPress={handleKeyPress}
              />
              <Button 
                onClick={sendMessage} 
                className="bg-amber-600 hover:bg-amber-700"
                size="icon"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"></path>
                  <path d="M22 2 11 13"></path>
                </svg>
              </Button>
            </div>
          </div>
        </TabsContent>
      </div>
    </div>
  );
}

export default PredictionAssistant;