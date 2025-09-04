
/**
 * Phase 1: Credentials Management UI
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { getStoredCredentials, storeCredential, removeCredential, type StoredCredential } from '@/lib/storage';
import { encryptData, decryptData, generateKey } from '@/lib/crypto';

interface CredentialForm {
  name: string;
  type: string;
  data: string;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [form, setForm] = useState<CredentialForm>({ name: '', type: 'api_key', data: '' });
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCredentials(getStoredCredentials());
    
    // Generate or retrieve encryption key
    const storedKey = localStorage.getItem('orion_encryption_key');
    if (storedKey) {
      setEncryptionKey(storedKey);
    } else {
      const newKey = generateKey();
      setEncryptionKey(newKey);
      localStorage.setItem('orion_encryption_key', newKey);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.data || !encryptionKey) return;

    setIsLoading(true);
    try {
      const encrypted = await encryptData(form.data, encryptionKey);
      const credential = {
        id: crypto.randomUUID(),
        name: form.name,
        type: form.type,
        encryptedData: JSON.stringify(encrypted)
      };

      storeCredential(credential);
      setCredentials(getStoredCredentials());
      setForm({ name: '', type: 'api_key', data: '' });
    } catch (error) {
      console.error('Failed to encrypt credential:', error);
      alert('Failed to save credential. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this credential?')) {
      removeCredential(id);
      setCredentials(getStoredCredentials());
    }
  };

  const handleDecrypt = async (credential: StoredCredential) => {
    try {
      const encrypted = JSON.parse(credential.encryptedData);
      const decrypted = await decryptData(encrypted, encryptionKey);
      alert(`Decrypted data: ${decrypted}`);
    } catch (error) {
      console.error('Failed to decrypt credential:', error);
      alert('Failed to decrypt credential. Check your encryption key.');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Credentials Management</h1>
          <p className="text-muted-foreground mt-2">
            Securely store and manage your API keys and credentials using AES-GCM encryption.
          </p>
        </div>

        {/* Encryption Key Display */}
        <Card>
          <CardHeader>
            <CardTitle>Encryption Key</CardTitle>
            <CardDescription>
              Your master encryption key. Keep this safe - you'll need it to decrypt your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input
                type={showKey ? 'text' : 'password'}
                value={encryptionKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add New Credential */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Credential</CardTitle>
            <CardDescription>
              Store a new encrypted credential in your browser's local storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Google Analytics API Key"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="oauth_token">OAuth Token</SelectItem>
                      <SelectItem value="database_url">Database URL</SelectItem>
                      <SelectItem value="webhook_secret">Webhook Secret</SelectItem>
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
                {isLoading ? 'Encrypting...' : 'Add Credential'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stored Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Stored Credentials ({credentials.length})</CardTitle>
            <CardDescription>
              Your encrypted credentials stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {credentials.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No credentials stored yet. Add your first credential above.
              </p>
            ) : (
              <div className="space-y-4">
                {credentials.map((credential) => (
                  <div
                    key={credential.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{credential.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Type: {credential.type} • Created: {new Date(credential.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecrypt(credential)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(credential.id)}
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
      </div>
    </div>
  );
}
