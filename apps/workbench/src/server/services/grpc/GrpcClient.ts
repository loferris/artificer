/**
 * Base gRPC Client
 *
 * Provides common functionality for gRPC service clients including
 * connection management, error handling, and health checks.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { logger } from '../../utils/logger';
import { getServiceDiscovery } from './ServiceDiscovery';

export interface GrpcClientOptions {
  serviceId: string;
  protoPath: string;
  packageName: string;
  serviceName: string;
  correlationId?: string;
}

export interface CallMetadata {
  correlationId?: string;
  deadline?: number;
}

export abstract class GrpcClient {
  protected client: any;
  protected serviceId: string;
  protected serviceName: string;
  protected connected: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(options: GrpcClientOptions) {
    this.serviceId = options.serviceId;
    this.serviceName = options.serviceName;

    // Load proto definition
    const protoPath = path.resolve(process.cwd(), '..', '..', options.protoPath);

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [path.resolve(process.cwd(), '..', '..', 'proto')],
    });

    const proto = grpc.loadPackageDefinition(packageDefinition);

    // Navigate to the service in the package
    const packageParts = options.packageName.split('.');
    let servicePackage: any = proto;
    for (const part of packageParts) {
      servicePackage = servicePackage[part];
    }

    const ServiceClass = servicePackage[options.serviceName];
    if (!ServiceClass) {
      throw new Error(`Service ${options.serviceName} not found in package ${options.packageName}`);
    }

    // Get endpoint from service discovery
    const discovery = getServiceDiscovery();
    const address = discovery.getAddress(this.serviceId);
    const endpoint = discovery.getEndpoint(this.serviceId);

    // Create credentials
    const credentials = endpoint.useTls
      ? grpc.credentials.createSsl()
      : grpc.credentials.createInsecure();

    // Create client
    this.client = new ServiceClass(address, credentials);

    logger.info(`gRPC client created for ${this.serviceName}`, {
      serviceId: this.serviceId,
      address,
      tls: endpoint.useTls,
    });

    // Start health checks
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    // Initial check
    this.checkHealth();

    // Periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  private async checkHealth(): Promise<void> {
    try {
      // Wait for the channel to be ready with a short deadline
      const deadline = new Date(Date.now() + 5000);

      await new Promise<void>((resolve, reject) => {
        this.client.waitForReady(deadline, (error: Error | null) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.connected = true;
      getServiceDiscovery().setHealthStatus(this.serviceId, true);
    } catch (error) {
      this.connected = false;
      getServiceDiscovery().setHealthStatus(this.serviceId, false);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Create metadata for gRPC call
   */
  protected createMetadata(callMeta?: CallMetadata): grpc.Metadata {
    const metadata = new grpc.Metadata();

    if (callMeta?.correlationId) {
      metadata.set('x-correlation-id', callMeta.correlationId);
    }

    return metadata;
  }

  /**
   * Create call options with deadline
   */
  protected createCallOptions(callMeta?: CallMetadata): grpc.CallOptions {
    const options: grpc.CallOptions = {};

    if (callMeta?.deadline) {
      options.deadline = new Date(Date.now() + callMeta.deadline);
    } else {
      // Default 30 second deadline
      options.deadline = new Date(Date.now() + 30000);
    }

    return options;
  }

  /**
   * Make unary call with standard error handling
   */
  protected async unaryCall<TRequest, TResponse>(
    method: string,
    request: TRequest,
    callMeta?: CallMetadata
  ): Promise<TResponse> {
    if (!this.connected) {
      throw new Error(`Service ${this.serviceName} is not connected`);
    }

    const metadata = this.createMetadata(callMeta);
    const options = this.createCallOptions(callMeta);

    return new Promise((resolve, reject) => {
      this.client[method](request, metadata, options, (error: grpc.ServiceError | null, response: TResponse) => {
        if (error) {
          logger.error(`gRPC call failed: ${this.serviceName}.${method}`, {
            code: error.code,
            message: error.message,
            correlationId: callMeta?.correlationId,
          });
          reject(this.mapError(error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Map gRPC errors to standard errors
   */
  private mapError(error: grpc.ServiceError): Error {
    const mapped = new Error(error.message);
    (mapped as any).code = error.code;
    (mapped as any).details = error.details;
    return mapped;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.client) {
      this.client.close();
    }
  }
}
