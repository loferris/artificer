/**
 * Service Discovery
 *
 * Manages service endpoint discovery for internal gRPC communication.
 * Supports environment variables, DNS-based discovery, and static configuration.
 */

import { logger } from '../../utils/logger';

export interface ServiceEndpoint {
  host: string;
  port: number;
  useTls: boolean;
}

export interface ServiceConfig {
  name: string;
  defaultHost: string;
  defaultPort: number;
  envVar?: string;
  healthPath?: string;
}

// Service registry - define all internal services
const SERVICE_REGISTRY: Record<string, ServiceConfig> = {
  'conversion': {
    name: 'Document Conversion Service',
    defaultHost: 'localhost',
    defaultPort: 50051,
    envVar: 'GRPC_CONVERSION_SERVICE',
    healthPath: '/health',
  },
  'text': {
    name: 'Text Processing Service',
    defaultHost: 'localhost',
    defaultPort: 50051,
    envVar: 'GRPC_TEXT_SERVICE',
  },
  'ocr': {
    name: 'OCR Service',
    defaultHost: 'localhost',
    defaultPort: 50051,
    envVar: 'GRPC_OCR_SERVICE',
  },
  'workflow': {
    name: 'Workflow Service',
    defaultHost: 'localhost',
    defaultPort: 50051,
    envVar: 'GRPC_WORKFLOW_SERVICE',
  },
  'metrics': {
    name: 'Metrics Service',
    defaultHost: 'localhost',
    defaultPort: 50051,
    envVar: 'GRPC_METRICS_SERVICE',
  },
};

export class ServiceDiscovery {
  private static instance: ServiceDiscovery;
  private endpointCache: Map<string, ServiceEndpoint> = new Map();
  private healthStatus: Map<string, boolean> = new Map();

  private constructor() {
    // Initialize endpoints from environment
    this.initializeEndpoints();
  }

  static getInstance(): ServiceDiscovery {
    if (!ServiceDiscovery.instance) {
      ServiceDiscovery.instance = new ServiceDiscovery();
    }
    return ServiceDiscovery.instance;
  }

  private initializeEndpoints(): void {
    for (const [serviceId, config] of Object.entries(SERVICE_REGISTRY)) {
      const endpoint = this.resolveEndpoint(serviceId, config);
      this.endpointCache.set(serviceId, endpoint);

      logger.info(`Service discovery: ${config.name}`, {
        serviceId,
        endpoint: `${endpoint.host}:${endpoint.port}`,
        tls: endpoint.useTls,
      });
    }
  }

  private resolveEndpoint(serviceId: string, config: ServiceConfig): ServiceEndpoint {
    // Check environment variable first
    if (config.envVar && process.env[config.envVar]) {
      return this.parseEndpoint(process.env[config.envVar]!);
    }

    // Check generic gRPC service URL
    const genericUrl = process.env.GRPC_SERVICE_URL;
    if (genericUrl) {
      return this.parseEndpoint(genericUrl);
    }

    // Use defaults
    return {
      host: config.defaultHost,
      port: config.defaultPort,
      useTls: process.env.GRPC_USE_TLS === 'true',
    };
  }

  private parseEndpoint(url: string): ServiceEndpoint {
    // Parse URL format: host:port or grpc://host:port or grpcs://host:port
    let host = 'localhost';
    let port = 50051;
    let useTls = false;

    if (url.startsWith('grpcs://')) {
      useTls = true;
      url = url.substring(8);
    } else if (url.startsWith('grpc://')) {
      url = url.substring(7);
    }

    const parts = url.split(':');
    if (parts.length >= 1) {
      host = parts[0];
    }
    if (parts.length >= 2) {
      port = parseInt(parts[1], 10);
    }

    return { host, port, useTls };
  }

  /**
   * Get endpoint for a service
   */
  getEndpoint(serviceId: string): ServiceEndpoint {
    const endpoint = this.endpointCache.get(serviceId);
    if (!endpoint) {
      throw new Error(`Unknown service: ${serviceId}`);
    }
    return endpoint;
  }

  /**
   * Get gRPC address string for a service
   */
  getAddress(serviceId: string): string {
    const endpoint = this.getEndpoint(serviceId);
    return `${endpoint.host}:${endpoint.port}`;
  }

  /**
   * Check if a service is healthy
   */
  isHealthy(serviceId: string): boolean {
    return this.healthStatus.get(serviceId) ?? false;
  }

  /**
   * Update health status for a service
   */
  setHealthStatus(serviceId: string, healthy: boolean): void {
    const wasHealthy = this.healthStatus.get(serviceId);
    this.healthStatus.set(serviceId, healthy);

    if (wasHealthy !== healthy) {
      const config = SERVICE_REGISTRY[serviceId];
      if (healthy) {
        logger.info(`Service recovered: ${config?.name || serviceId}`);
      } else {
        logger.warn(`Service unhealthy: ${config?.name || serviceId}`);
      }
    }
  }

  /**
   * Get all registered services
   */
  getServices(): string[] {
    return Object.keys(SERVICE_REGISTRY);
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceId: string): ServiceConfig | undefined {
    return SERVICE_REGISTRY[serviceId];
  }
}

// Export singleton getter
export function getServiceDiscovery(): ServiceDiscovery {
  return ServiceDiscovery.getInstance();
}
