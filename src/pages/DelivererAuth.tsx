import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Home, Upload, FileCheck, AlertCircle } from "lucide-react";

const DelivererAuth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'deliverer')
          .single();
        
        if (roles) {
          navigate('/deliverer-dashboard');
        } else {
          // Controlla se ha una richiesta pending
          const { data: request } = await supabase
            .from('deliverer_requests')
            .select('status')
            .eq('user_id', session.user.id)
            .single();
          
          if (request?.status === 'pending') {
            await supabase.auth.signOut();
            toast.info("La tua richiesta è in attesa di approvazione");
          } else if (request?.status === 'rejected') {
            await supabase.auth.signOut();
            toast.error("La tua richiesta è stata rifiutata");
          }
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'deliverer')
          .single()
          .then(({ data: roles }) => {
            if (roles) {
              navigate('/deliverer-dashboard');
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato file non supportato. Usa JPG, PNG, WEBP o PDF.");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Il file è troppo grande. Massimo 10MB.");
        return;
      }
      setDocumentFile(file);
    }
  };

  const uploadDocument = async (userId: string): Promise<string | null> => {
    if (!documentFile) return null;

    const fileExt = documentFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('deliverer-documents')
      .upload(fileName, documentFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error("Errore nel caricamento del documento");
    }

    return fileName;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Login effettuato con successo!");
      } else {
        // Validate registration fields
        if (!documentType) {
          toast.error("Seleziona il tipo di documento");
          setLoading(false);
          return;
        }
        if (!documentFile) {
          toast.error("Carica un documento d'identità valido");
          setLoading(false);
          return;
        }

        // Sign up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              phone,
            },
            emailRedirectTo: `${window.location.origin}/deliverer-dashboard`,
          },
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Upload document
          const documentUrl = await uploadDocument(authData.user.id);

          // Crea richiesta di registrazione
          console.log('Creating deliverer request for user:', authData.user.id);
          const { data: requestData, error: requestError } = await supabase
            .from('deliverer_requests')
            .insert({
              user_id: authData.user.id,
              name,
              email,
              phone,
              status: 'pending',
              document_url: documentUrl,
              document_type: documentType,
            })
            .select()
            .single();

          if (requestError) {
            console.error('Error creating request:', requestError);
            throw requestError;
          }

          console.log('Request created:', requestData);
          toast.success("Richiesta inviata! Attendi l'approvazione dell'admin.");
          
          // Logout automatico fino all'approvazione
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <Home className="h-4 w-4" />
        Torna alla Home
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Truck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">
            {isLogin ? "Login Fattorino" : "Registrati come Fattorino"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? "Accedi al tuo account per gestire le consegne"
              : "Crea un account per iniziare a fare consegne"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome completo
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Mario Rossi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Telefono
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                {/* Document Upload Section */}
                <div className="space-y-3 p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <AlertCircle className="h-4 w-4" />
                    Documento d'identità (obbligatorio)
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="documentType" className="text-sm font-medium">
                      Tipo di documento
                    </label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo documento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carta_identita">Carta d'Identità</SelectItem>
                        <SelectItem value="patente">Patente di Guida</SelectItem>
                        <SelectItem value="passaporto">Passaporto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Carica documento
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {documentFile ? (
                        <span className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-500" />
                          {documentFile.name.length > 25 
                            ? documentFile.name.substring(0, 25) + '...' 
                            : documentFile.name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Seleziona file (JPG, PNG, PDF)
                        </span>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Carica una foto chiara del tuo documento. Max 10MB.
                    </p>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="mario.rossi@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Caricamento..." : isLogin ? "Accedi" : "Registrati"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? "Non hai un account? Registrati"
                : "Hai già un account? Accedi"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelivererAuth;