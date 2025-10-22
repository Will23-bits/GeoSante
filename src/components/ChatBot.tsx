import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

function ChatBot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Bonjour ! Je suis votre assistant d'analyse du risque de grippe. Demandez-moi des informations sur la couverture vaccinale, les niveaux de risque ou les prédictions pour n'importe quel département français.",
      sender: "bot",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/chat", {
        message: inputMessage,
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: "bot",
        timestamp: response.data.timestamp,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Désolé, j'ai des difficultés à traiter votre demande. Veuillez réessayer.",
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none bg-white">
        <CardHeader className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 uppercase tracking-wide">
                Assistant Analytique
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1 font-medium">
                Intelligence artificielle pour l'analyse épidémiologique
              </p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md">
              IA
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <Card
                  className={`max-w-[80%] shadow-md ${message.sender === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-200"
                    }`}
                >
                  <CardContent className="p-3">
                    <div className="mb-1 leading-relaxed">
                      {message.sender === "bot" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-lg font-semibold mb-2 text-gray-900">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-semibold mb-2 text-gray-900">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold mb-1 text-gray-900">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0 text-gray-700">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside mb-2 space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside mb-2 space-y-1">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="mb-1">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-blue-700">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-gray-600">
                                {children}
                              </em>
                            ),
                            code: ({ children }) => (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-gray-100 p-2 rounded overflow-x-auto mb-2 text-gray-800">
                                {children}
                              </pre>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-blue-500 pl-3 my-2 text-gray-600 italic">
                                {children}
                              </blockquote>
                            ),
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      ) : (
                        message.text
                      )}
                    </div>
                    <div className={`text-xs mt-2 ${message.sender === "user"
                      ? "text-blue-100"
                      : "text-gray-500"
                      }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-white border-gray-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                      <span
                        className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="space-y-4 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Demandez des informations sur les données de risque de grippe..."
                rows={2}
                disabled={isLoading}
                className="flex-1 resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-800 placeholder:text-gray-400"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
              >
                Envoyer
              </Button>
            </div>

            <div className="space-y-2 border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">Requêtes Suggérées</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInputMessage(
                      "Quels départements ont le risque de grippe le plus élevé ?"
                    )
                  }
                  className="text-xs border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 font-semibold"
                >
                  Départements à haut risque
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInputMessage("Quelle est la couverture vaccinale à Paris ?")
                  }
                  className="text-xs border-green-300 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all duration-200 font-semibold"
                >
                  Couverture Paris
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInputMessage("Prédisez les tendances du risque de grippe pour la prochaine saison")
                  }
                  className="text-xs border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200 font-semibold"
                >
                  Prédictions
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChatBot;
