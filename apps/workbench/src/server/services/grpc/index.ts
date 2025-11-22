/**
 * gRPC Service Clients
 *
 * Internal gRPC communication infrastructure for service-to-service calls.
 */

export { ServiceDiscovery, getServiceDiscovery, type ServiceEndpoint, type ServiceConfig } from './ServiceDiscovery';
export { GrpcClient, type GrpcClientOptions, type CallMetadata } from './GrpcClient';
export { GrpcConversionClient, getGrpcConversionClient, type PortableTextDocument } from './GrpcConversionClient';
