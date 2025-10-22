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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

function ChatBot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "**Assistant IA Prédictive** - Bonjour ! Je suis spécialisé dans l'analyse du risque de grippe en France. Grâce à mon entraînement sur 5 ans de données épidémiologiques, je peux vous fournir des analyses actuelles et des **prédictions pour les années futures**. Demandez-moi des informations sur la couverture vaccinale, les niveaux de risque ou les tendances à venir !",
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

    // Auto-scroll to bottom after user message
    setTimeout(() => {
      const messagesContainer = document.querySelector('.chat-messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);

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

      // Auto-scroll to bottom after bot message
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Désolé, j'ai des difficultés à traiter votre demande. Veuillez réessayer.",
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Auto-scroll to bottom after error message
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
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
      <Card className="flex-1 flex flex-col border-0 shadow-none bg-white overflow-y-auto">
        <CardHeader className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#161616] uppercase tracking-wide">
                Assistant IA Prédictive
              </CardTitle>
              <p className="text-sm text-[#666666] mt-1 font-medium">
                Analyse épidémiologique & prédictions grippales
              </p>
            </div>
            <div className="w-10 h-10 bg-[#000091] rounded flex items-center justify-center text-white text-xs font-bold">
              IA
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="chat-messages-container flex-1 overflow-y-auto space-y-4 p-4 min-h-[300px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <Card
                  className={`max-w-[85%] ${message.sender === "user"
                    ? "bg-[#000091] text-white border-0"
                    : "bg-gray-50 border border-gray-200"
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="mb-2 leading-relaxed text-sm">
                      {message.sender === "bot" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-700">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-700">{children}</ol>,
                            li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
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
                <Card className="bg-gray-50 border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex gap-2 items-center">
                      <span className="w-3 h-3 bg-[#000091] rounded-full animate-pulse"></span>
                      <span
                        className="w-3 h-3 bg-[#000091] rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></span>
                      <span
                        className="w-3 h-3 bg-[#000091] rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="space-y-3 flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-4">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez vos questions sur les risques grippaux, la vaccination, ou demandez des prédictions..."
                rows={3}
                disabled={isLoading}
                className="flex-1 resize-none border border-gray-300 bg-white focus:ring-2 focus:ring-[#000091] focus:border-[#000091] rounded text-gray-800 placeholder:text-gray-500 text-sm leading-relaxed"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-[#000091] hover:bg-[#1212ff] text-white px-8 py-3 font-medium text-base rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "..." : "Envoyer"}
              </Button>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-3">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-sm text-[#161616] font-bold uppercase tracking-wide">Requêtes Suggérées</p>
                <Badge className="text-xs bg-[#6a6af4] hover:bg-[#5a5ae4] text-white border-0 px-3 py-1 font-medium">
                  IA Prédictive
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setInputMessage(
                      "Quels départements ont le risque de grippe le plus élevé ?"
                    )
                  }
                  className="text-sm border border-gray-300 text-[#161616] hover:bg-[#000091] hover:text-white font-medium h-auto py-3 px-4 text-left justify-start"
                >
                  Départements à haut risque
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setInputMessage("Quelle est la couverture vaccinale à Paris ?")
                  }
                  className="text-sm border border-gray-300 text-[#161616] hover:bg-[#000091] hover:text-white font-medium h-auto py-3 px-4 text-left justify-start"
                >
                  Couverture Paris
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setInputMessage("Quelle sera la tendance grippale pour 2026 ?")
                  }
                  className="text-sm border border-gray-300 text-[#161616] hover:bg-[#000091] hover:text-white font-medium h-auto py-3 px-4 text-left justify-start"
                >
                  Prédictions 2026
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setInputMessage("Comment évoluera le risque grippal dans les années à venir ?")
                  }
                  className="text-sm border border-gray-300 text-[#161616] hover:bg-[#000091] hover:text-white font-medium h-auto py-3 px-4 text-left justify-start"
                >
                  Tendances futures
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
