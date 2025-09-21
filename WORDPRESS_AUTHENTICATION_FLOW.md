# WordPress Authentication Flow in Orion

## Complete User Journey: From Credentials to Publishing

When a client signs into Orion and enters their WordPress username and password, here's exactly what happens:

---

## 🔐 **Step 1: User Authentication (Orion Login)**

### What the user does:
1. **Signs into Orion** using their Orion account credentials (email/password)
2. **Navigates to WordPress Integration** in their site settings
3. **Enters WordPress credentials** in the connection manager form

### What happens behind the scenes:
```typescript
// User authenticates with Orion first
const { userId } = await requireEditAccess(request); // RBAC check
// Only ADMIN/EDITOR roles can manage WordPress integrations
```

---

## 🔗 **Step 2: WordPress Credentials Entry**

### User Interface:
```typescript
// components/wordpress/connection-manager.tsx
const [formData, setFormData] = useState({
  siteUrl: "https://their-wordpress-site.com",
  username: "their-wp-username", 
  appPassword: "their-application-password" // NOT their regular WP password
});
```

### Important Note:
- **NOT their regular WordPress password**
- **Application Password** - a special WordPress feature for API access
- Generated in WordPress Admin → Users → Profile → Application Passwords

---

## 💾 **Step 3: Secure Credential Storage**

### What happens when user clicks "Save & Test":

```typescript
// 1. Form validation
if (!formData.siteUrl || !formData.username || !formData.appPassword) {
  toast.error("Please fill in all required fields");
  return;
}

// 2. API call to save credentials
const response = await fetch("/api/integrations/wordpress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    siteId,
    siteUrl: formData.siteUrl,
    username: formData.username,
    appPassword: formData.appPassword,
  }),
});
```

### Backend Processing:

```typescript
// app/api/integrations/wordpress/route.ts
export async function POST(request: NextRequest) {
  // 1. RBAC Authorization
  const { userId } = await requireEditAccess(request);
  
  // 2. Input validation
  const { siteId, siteUrl, username, appPassword } = body;
  
  // 3. URL validation
  try {
    new URL(siteUrl);
  } catch {
    return NextResponse.json({ error: "Invalid site URL format" }, { status: 400 });
  }
  
  // 4. Save encrypted credentials
  const integration = await wpManager.saveWordPressCredentials(siteId, {
    siteUrl,
    username,
    appPassword,
  });
}
```

### Encryption Process:

```typescript
// lib/integration-manager.ts
async saveCredentials(type: IntegrationType, credentials: IntegrationCredentials, siteId?: string) {
  // 1. Encrypt credentials using AES-256-GCM
  const credentialsEnc = encryptJson(credentials);
  
  // 2. Store in database
  const integration = await prisma.integration.upsert({
    where: { siteId_type: { siteId: siteId || "", type: type } },
    update: {
      credentialsEnc,        // Encrypted credentials
      verified: false,       // Reset verification
      updatedAt: new Date(),
    },
    create: {
      siteId: siteId || "",
      type: IntegrationType.WORDPRESS,
      credentialsEnc,        // Encrypted credentials
      verified: false,
    },
  });
}
```

---

## 🧪 **Step 4: Connection Testing**

### Automatic Test After Save:

```typescript
// lib/wordpress/integration-manager.ts
async saveWordPressCredentials(siteId: string, credentials: WordPressCredentials) {
  // 1. Save credentials
  const integration = await this.saveCredentials(IntegrationType.WORDPRESS, credentials, siteId);
  
  // 2. Test connection immediately
  const testResult = await this.testWordPressConnection(siteId);
  
  return {
    id: integration.id,
    siteId: integration.siteId,
    siteUrl: credentials.siteUrl,
    verified: testResult.success,  // Connection test result
    lastTestAt: testResult.success ? new Date() : null,
    siteInfo: testResult.siteInfo, // WordPress site details
  };
}
```

### WordPress API Test:

```typescript
// lib/wordpress/connector.ts
async testConnection(): Promise<WordPressConnectionTest> {
  try {
    // 1. Create Basic Auth header
    const authString = `${this.credentials.username}:${this.credentials.appPassword}`;
    const authHeader = `Basic ${Buffer.from(authString).toString("base64")}`;
    
    // 2. Test WordPress REST API
    const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`);
    }
    
    // 3. Get site information
    const siteInfo = await response.json();
    
    return {
      success: true,
      message: "WordPress connection successful",
      siteInfo: {
        name: siteInfo.name,
        description: siteInfo.description,
        url: siteInfo.url,
        version: siteInfo.version,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
    };
  }
}
```

---

## 🔒 **Step 5: Security & Audit Logging**

### Data Redaction:
```typescript
// All sensitive data is redacted in logs
logger.info({
  userId,
  siteId,
  siteUrl: redactSensitive(siteUrl),  // "https://[REDACTED]"
  integrationId: integration.id,
}, "WordPress credentials saved successfully");
```

### Audit Trail:
```typescript
// Complete audit log entry
await this.auditLogManager.recordLog(
  userId,
  "wordpress_integration_saved",
  "Integration",
  integration.id,
  {
    siteId,
    siteUrl: redactSensitive(siteUrl),
    verified: testResult.success,
  }
);
```

---

## 📊 **Step 6: Database Storage**

### What gets stored in the database:

```sql
-- prisma/schema.prisma
model Integration {
  id            String   @id @default(cuid())
  siteId        String
  type          String   // "wordpress"
  credentialsEnc String  // AES-256-GCM encrypted credentials
  verified      Boolean  @default(false)
  lastTestAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([siteId, type])
  @@map("integrations")
}
```

### Encrypted Credentials Structure:
```json
{
  "siteUrl": "https://their-wordpress-site.com",
  "username": "their-wp-username", 
  "appPassword": "their-application-password"
}
```

---

## 🚀 **Step 7: Ready for Publishing**

### Once credentials are saved and verified:

1. **User can now publish content** to their WordPress site
2. **One-click publish button** becomes available
3. **Rulebook QA** runs before publishing
4. **Content streams** to WordPress as draft or published

### Publishing Flow:
```typescript
// When user clicks "Publish to WordPress"
const result = await workflow.executeWorkflow({
  siteId,
  draftId,
  userId,
  publishImmediately: true,
});

// This uses the stored credentials to:
// 1. Create WordPress post via REST API
// 2. Apply rulebook quality checks
// 3. Handle media uploads
// 4. Set categories/tags
// 5. Update Orion draft with WordPress post ID
```

---

## 🔄 **Step 8: Ongoing Usage**

### Every time content is published:

1. **Retrieve encrypted credentials** from database
2. **Decrypt credentials** using AES-256-GCM
3. **Create WordPress connector** with credentials
4. **Make API calls** to WordPress REST API
5. **Log all actions** with redacted sensitive data
6. **Update audit trail** with publishing results

### Credential Management:
- **Credentials are never stored in plain text**
- **All API calls use Basic Auth** with username:appPassword
- **Connection health is monitored** and can be re-tested
- **Credentials can be updated** without losing integration history

---

## 🛡️ **Security Features**

### What makes this secure:

1. **AES-256-GCM Encryption**: All credentials encrypted at rest
2. **RBAC Protection**: Only authorized users can manage integrations
3. **Data Redaction**: Sensitive data never appears in logs
4. **Audit Logging**: Complete trail of all integration actions
5. **Connection Testing**: Immediate validation of credentials
6. **Application Passwords**: WordPress-specific secure authentication
7. **Input Validation**: URL format and required field validation

### What the user sees:
- ✅ "WordPress credentials saved successfully!"
- ✅ Connection status: "Connected" or "Error"
- ✅ Last tested timestamp
- ✅ Site information (name, version, etc.)

### What the user never sees:
- ❌ Their actual credentials in any logs
- ❌ Raw API responses with sensitive data
- ❌ Internal error details that could leak information

---

## 📋 **Summary**

**When a client enters WordPress credentials in Orion:**

1. **Orion authenticates** the user first (RBAC check)
2. **User enters** WordPress site URL, username, and application password
3. **Credentials are encrypted** using AES-256-GCM and stored in database
4. **Connection is tested** immediately against WordPress REST API
5. **Status is updated** and user sees success/error message
6. **Audit log** records the action with redacted sensitive data
7. **User can now publish** content to their WordPress site
8. **All future API calls** use the stored, encrypted credentials

**The entire process is secure, audited, and production-ready with enterprise-grade encryption and access controls.**
