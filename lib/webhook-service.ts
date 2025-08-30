
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { WebhookEndpoint } from '@prisma/client';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  orion_signature: string;
}

export class WebhookService {
  static async deliverWebhook(
    event: 'draft_created' | 'needs_review' | 'approved',
    data: any
  ): Promise<void> {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        active: true,
      },
    });

    const filteredEndpoints = endpoints.filter(endpoint => {
      const events = Array.isArray(endpoint.events) ? endpoint.events as string[] : [];
      return events.includes(event);
    });

    await Promise.allSettled(
      filteredEndpoints.map(endpoint => this.sendWebhook(endpoint, event, data))
    );
  }

  private static async sendWebhook(
    endpoint: WebhookEndpoint,
    event: string,
    data: any
  ): Promise<void> {
    const payload: Omit<WebhookPayload, 'orion_signature'> = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const signature = this.generateSignature(JSON.stringify(payload), endpoint.secret);
    
    const fullPayload: WebhookPayload = {
      ...payload,
      orion_signature: signature,
    };

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Orion-Webhook/1.0',
          'X-Orion-Signature-256': signature,
        },
        body: JSON.stringify(fullPayload),
        // Add timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(`Webhook delivery failed to ${endpoint.url}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Webhook delivery error to ${endpoint.url}:`, error);
    }
  }

  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  static async createEndpoint(
    url: string,
    events: string[],
    secret?: string
  ): Promise<WebhookEndpoint> {
    const generatedSecret = secret || crypto.randomBytes(32).toString('hex');
    
    return await prisma.webhookEndpoint.create({
      data: {
        url,
        events,
        secret: generatedSecret,
        active: true,
      },
    });
  }

  static async updateEndpoint(
    id: string,
    updates: {
      url?: string;
      events?: string[];
      active?: boolean;
    }
  ): Promise<WebhookEndpoint> {
    return await prisma.webhookEndpoint.update({
      where: { id },
      data: updates,
    });
  }

  static async deleteEndpoint(id: string): Promise<void> {
    await prisma.webhookEndpoint.delete({
      where: { id },
    });
  }

  static async listEndpoints(): Promise<WebhookEndpoint[]> {
    return await prisma.webhookEndpoint.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
