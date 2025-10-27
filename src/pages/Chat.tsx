import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Send, Image, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "shopper",
      text: "Ciao! Sono Marco, il tuo shopper. Ho iniziato a fare la spesa per te 🛒",
      time: "14:45",
    },
    {
      id: 2,
      sender: "user",
      text: "Perfetto, grazie!",
      time: "14:46",
    },
    {
      id: 3,
      sender: "shopper",
      text: "Le mele che volevi non sono disponibili. Vanno bene le Golden invece delle Fuji?",
      time: "14:52",
    },
    {
      id: 4,
      sender: "user",
      text: "Sì, va benissimo. Grazie per avermi avvisato!",
      time: "14:53",
    },
    {
      id: 5,
      sender: "shopper",
      text: "Perfetto! Ho quasi finito, arrivo tra 20 minuti circa 🚗",
      time: "15:10",
    },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        sender: "user",
        text: message,
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Chat con lo shopper</h1>
              <p className="text-muted-foreground">Marco Rossi</p>
            </div>
            <Badge className="bg-green-500">Online</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-300px)] flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">MR</span>
              </div>
              <div>
                <CardTitle className="text-base">Marco Rossi</CardTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  Ordine #ORD-2025-001 in corso
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">{msg.time}</p>
                </div>
              </div>
            ))}
          </CardContent>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Image className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Scrivi un messaggio..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Chat;
