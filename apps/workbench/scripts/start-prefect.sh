#!/bin/bash
#
# Start Prefect workflows environment
#
# This script starts all required services for running Prefect workflows:
# - Prefect server (UI and API)
# - PostgreSQL database
# - Artificer gRPC server
# - Artificer REST server
# - Mock FableForge service (for testing)
#

set -e

echo "🚀 Starting Prefect + Artificer environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

# Start services
echo "📦 Starting services with docker-compose..."
docker-compose -f docker-compose.prefect.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check Prefect server
echo "🔍 Checking Prefect server..."
for i in {1..30}; do
    if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
        echo "✅ Prefect server is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Prefect server failed to start"
        docker-compose -f docker-compose.prefect.yml logs prefect-server
        exit 1
    fi
    sleep 2
done

# Check Artificer gRPC
echo "🔍 Checking Artificer gRPC..."
for i in {1..30}; do
    if docker exec artificer-grpc python -c "import grpc; grpc.channel_ready_future(grpc.insecure_channel('localhost:50051')).result(timeout=5)" 2>/dev/null; then
        echo "✅ Artificer gRPC is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Artificer gRPC failed to start"
        docker logs artificer-grpc
        exit 1
    fi
    sleep 2
done

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Prefect UI:        http://localhost:4200"
echo "   Artificer gRPC:    localhost:50051"
echo "   Artificer REST:    http://localhost:8000"
echo "   FableForge Mock:   http://localhost:8080"
echo ""
echo "📖 Next steps:"
echo "   1. Open Prefect UI: open http://localhost:4200"
echo "   2. Run example:     cd python && python flows/examples/hello_workflow.py"
echo "   3. Run pipeline:    cd python && python flows/translation_pipeline.py"
echo ""
echo "🛑 To stop services: docker-compose -f docker-compose.prefect.yml down"
echo ""
