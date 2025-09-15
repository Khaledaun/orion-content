/**
 * Phase 1: Credentials Management UI
 */
"use client";

import { /* useState, */ useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getStoredCredentials,
  storeCredential,
  removeCredential,
  type StoredCredential,
} from "@/lib/storage";
import { encryptData, decryptData, generateKey } from "@/lib/crypto";
import { useDictionary, useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  StateIndicator,
  getConnectionState,
  type ConnectionState,
} from "@/components/ui/state-indicator";
import {
  /* LoadingState, */
  /* ErrorState, */
  EmptyState,
} from "@/components/ui/enhanced-states";
import { SkipLink, useFocusManagement } from "@/components/ui/accessibility";
import { toast } from "sonner";

interface CredentialForm {
  name: string;
  type: string;
  data: string;
}

interface EnhancedStoredCredential extends StoredCredential {
  connectionState?: ConnectionState;
  lastTested?: Date;
  isActive?: boolean;
}

export default function CredentialsPage() {
  const dict = useDictionary();
  const { isRTL } = useLanguage();
  const { _focusMainContent } = useFocusManagement();

  const [credentials, setCredentials] = useState<EnhancedStoredCredential[]>(
    [],
  );
  const [form, setForm] = useState<CredentialForm>({
    name: "",
    type: "api_key",
    data: "",
  });
  const [encryptionKey, setEncryptionKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const loadedCredentials = getStoredCredentials();
    // Enhance credentials with mock connection states for demo
    const enhancedCredentials: EnhancedStoredCredential[] =
      loadedCredentials.map((cred) => ({
        ...cred,
        connectionState: getConnectionState(
          Math.random() > 0.3, // 70% chance of being connected
          Math.random() > 0.8, // 20% chance of error
          Math.random() > 0.9, // 10% chance of needing action
          false,
        ),
        lastTested: new Date(Date.now() - Math.random() * 86400000), // Random last test within 24h
        isActive: Math.random() > 0.2, // 80% chance of being active
      }));
    setCredentials(enhancedCredentials);

    // Generate or retrieve encryption key
    const storedKey = localStorage.getItem("orion_encryption_key");
    if (storedKey) {
      setEncryptionKey(storedKey);
    } else {
      const newKey = generateKey();
      setEncryptionKey(newKey);
      localStorage.setItem("orion_encryption_key", newKey);
    }
  }, []);

  // Simulate testing a credential connection
  const testCredential = async (credentialId: string) => {
    setTestingCredentials((prev) => new Set([...prev, credentialId]));

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(/* resolve, */ 2000));

      // Simulate random test results
      const isSuccess = Math.random() > 0.3;
      const newState: ConnectionState = isSuccess ? "connected" : "error";

      setCredentials((prev) =>
        prev.map((cred) =>
          cred.id === credentialId
            ? { ...cred, connectionState: newState, lastTested: new Date() }
            : cred,
        ),
      );

      toast.success(
        isSuccess ? "Connection test successful" : "Connection test failed",
      );
    } catch (error) {
      toast.error("Failed to test connection");
    } finally {
      setTestingCredentials((prev) => {
        const newSet = new Set(prev);
        newSet.delete(credentialId);
        return newSet;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.data || !encryptionKey) {
      toast.error(
        `${dict.credentials.name} and ${dict.credentials.data} are required`,
      );
      return;
    }

    setIsLoading(true);
    try {
      const encrypted = await encryptData(form.data, encryptionKey);
      const credential: EnhancedStoredCredential = {
        id: crypto.randomUUID(),
        name: form.name,
        type: form.type,
        encryptedData: JSON.stringify(encrypted),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        connectionState: "unknown",
        isActive: true,
      };

      storeCredential(credential);
      const loadedCredentials = getStoredCredentials();
      const enhancedCredentials: EnhancedStoredCredential[] =
        loadedCredentials.map((cred) => ({
          ...cred,
          connectionState:
            cred.id === credential.id
              ? "unknown"
              : credentials.find((c) => c.id === cred.id)?.connectionState ||
                "unknown",
          isActive: true,
        }));
      setCredentials(enhancedCredentials);
      setForm({ name: "", type: "api_key", data: "" });
      toast.success(`${dict.credentials.name} saved successfully`);
    } catch (error) {
      console.error("Failed to encrypt credential:", error);
      toast.error(dict.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (
      confirm(`${dict.common.delete} credential? This action cannot be undone.`)
    ) {
      removeCredential(id);
      const loadedCredentials = getStoredCredentials();
      const enhancedCredentials: EnhancedStoredCredential[] =
        loadedCredentials.map((cred) => ({
          ...cred,
          connectionState:
            credentials.find((c) => c.id === cred.id)?.connectionState ||
            "unknown",
          isActive: true,
        }));
      setCredentials(enhancedCredentials);
      toast.success("Credential deleted successfully");
    }
  };

  const handleDecrypt = async (credential: StoredCredential) => {
    try {
      const encrypted = JSON.parse(credential.encryptedData);
      const decrypted = await decryptData(encrypted, encryptionKey);
      // Create a modal-like display instead of alert
      toast.success(
        `Decrypted: ${decrypted.substring(0, 50)}${decrypted.length > 50 ? "..." : ""}`,
      );
    } catch (error) {
      console.error("Failed to decrypt credential:", error);
      toast.error("Failed to decrypt credential. Check your encryption key.");
    }
  };

  return (
    <div
      className={`container mx-auto py-8 px-4 ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <SkipLink href="#main-content">{dict.accessibility.skipToMain}</SkipLink>

      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{dict.credentials.title}</h1>
            <p className="text-muted-foreground mt-2">
              {dict.credentials.description}
            </p>
          </div>
          <LanguageSwitcher showText />
        </header>

        <main id="main-content" role="main" tabIndex={-1}>
          {/* Encryption Key Display */}
          <Card>
            <CardHeader>
              <CardTitle>{dict.credentials.encryptionKey}</CardTitle>
              <CardDescription>
                Your master encryption key. Keep this safe - you'll need it to
                decrypt your credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={encryptionKey}
                  className="font-mono text-sm"
                  aria-label={dict.credentials.encryptionKey}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={
                    showKey ? "Hide encryption key" : "Show encryption key"
                  }
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add New Credential */}
          <Card>
            <CardHeader>
              <CardTitle>{dict.credentials.addNew}</CardTitle>
              <CardDescription>
                {dict.credentials.addNewDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{dict.credentials.name}</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g., Google Analytics API Key"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">{dict.credentials.type}</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        setForm({ ...form, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="oauth_token">OAuth Token</SelectItem>
                        <SelectItem value="database_url">
                          Database URL
                        </SelectItem>
                        <SelectItem value="webhook_secret">
                          Webhook Secret
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="data">Credential Data</Label>
                  <Textarea
                    id="data"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    placeholder="Enter your credential data (will be encrypted)"
                    rows={3}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isLoading
                    ? dict.common.loading
                    : `${dict.common.create} ${dict.credentials.name}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Stored Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>
                {dict.credentials.title} ({credentials.length})
              </CardTitle>
              <CardDescription>
                Your encrypted credentials stored locally in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {credentials.length === 0 ? (
                <EmptyState
                  title={dict.credentials.noCredentials}
                  description={dict.credentials.addFirstCredential}
                  icon={<Settings className="h-12 w-12" />}
                />
              ) : (
                <div className="space-y-4">
                  {credentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{credential.name}</h3>
                          <StateIndicator
                            state={
                              testingCredentials.has(credential.id)
                                ? "loading"
                                : credential.connectionState || "unknown"
                            }
                            size="sm"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {dict.credentials.type}: {credential.type} • Created:{" "}
                          {new Date(
                            credential.createdAt || Date.now(),
                          ).toLocaleDateString()}
                          {credential.lastTested && (
                            <>
                              {" "}
                              • Last tested:{" "}
                              {credential.lastTested.toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testCredential(credential.id)}
                          disabled={testingCredentials.has(credential.id)}
                          aria-label={`Test ${credential.name} connection`}
                        >
                          {testingCredentials.has(credential.id) ? (
                            <Settings className="h-4 w-4 animate-spin mr-1" />
                          ) : credential.connectionState === "connected" ? (
                            <Wifi className="h-4 w-4 mr-1" />
                          ) : (
                            <WifiOff className="h-4 w-4 mr-1" />
                          )}
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecrypt(credential)}
                          aria-label={`${dict.common.view} ${credential.name}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {dict.common.view}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(credential.id)}
                          aria-label={`${dict.common.delete} ${credential.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
