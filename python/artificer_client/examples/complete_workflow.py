"""
Complete Artificer Workflow Example

Demonstrates:
- Creating projects
- Uploading documents
- Semantic search
- Conversations with RAG
- Batch processing
- Export
"""

import time
from artificer_client import ArtificerClient


def main():
    print("=" * 60)
    print("Artificer Python Client - Complete Workflow")
    print("=" * 60)

    # Initialize client
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None  # Set your API key or None for local dev
    )

    # 1. Health check
    print("\n1. Health Check")
    print("-" * 60)
    try:
        health = client.health_check()
        print(f"✓ Service status: {health['status']}")
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return

    # 2. Create project
    print("\n2. Create Project")
    print("-" * 60)
    project = client.projects.create(
        name="Python SDK Demo",
        description="Demonstrating Python SDK capabilities"
    )
    project_id = project['project']['id']
    print(f"✓ Created project: {project_id}")

    # 3. Upload documents (you need actual files for this)
    print("\n3. Upload Documents")
    print("-" * 60)
    print("Note: Skipping document upload (requires actual files)")
    print("Example code:")
    print("""
    with open("document.pdf", "rb") as f:
        doc = client.projects.upload_document(
            project_id,
            "document.pdf",
            f.read(),
            "application/pdf"
        )
    """)

    # 4. Create conversation
    print("\n4. Create Conversation")
    print("-" * 60)
    conv = client.conversations.create(
        title="Demo Conversation",
        project_id=project_id,
        model="gpt-4o-mini"
    )
    conv_id = conv['conversation']['id']
    print(f"✓ Created conversation: {conv_id}")

    # 5. Send chat messages
    print("\n5. Chat Messages")
    print("-" * 60)
    response = client.chat.send_message(
        conv_id,
        "Hello! Can you help me understand how to use this API?"
    )
    print(f"✓ AI Response: {response['message']['content'][:100]}...")
    print(f"  Tokens: {response['message'].get('tokensUsed', 'N/A')}")

    # 6. Intelligent routing
    print("\n6. Intelligent Model Routing")
    print("-" * 60)
    response = client.chat.send_with_orchestration(
        conv_id,
        "Explain quantum computing in simple terms"
    )
    if 'chainMetadata' in response:
        metadata = response['chainMetadata']
        print(f"✓ Model strategy: {metadata.get('strategy', 'N/A')}")
        print(f"  Complexity: {metadata.get('complexity', 'N/A')}/10")
        print(f"  Category: {metadata.get('category', 'N/A')}")

    # 7. List conversations
    print("\n7. List Conversations")
    print("-" * 60)
    conversations = client.conversations.list()
    print(f"✓ Total conversations: {len(conversations)}")
    for conv in conversations[:3]:
        print(f"  - {conv['title']} ({conv.get('messageCount', 0)} messages)")

    # 8. Export conversation
    print("\n8. Export Conversation")
    print("-" * 60)
    export = client.export.export_conversation(
        conv_id,
        format="markdown",
        include_metadata=True
    )
    print(f"✓ Exported {len(export['data'])} characters")
    print(f"  Preview: {export['data'][:100]}...")

    # 9. Monitor Python services
    print("\n9. Python Service Monitoring")
    print("-" * 60)
    try:
        stats = client.monitoring.get_python_service_stats()
        print(f"✓ Python services:")
        print(f"  OCR available: {stats.get('ocr', {}).get('available', 'N/A')}")
        print(f"  Conversion available: {stats.get('conversion', {}).get('available', 'N/A')}")
        print(f"  Text available: {stats.get('text', {}).get('available', 'N/A')}")
    except Exception as e:
        print(f"  (Python services not available: {e})")

    # 10. Batch processing example
    print("\n10. Batch Processing")
    print("-" * 60)
    print("Creating sample batch job...")
    try:
        job = client.batch.create_job(
            name="Demo Batch Job",
            items=[
                {"input": "Summarize: Machine learning is..."},
                {"input": "Summarize: Deep learning is..."},
                {"input": "Summarize: Neural networks are..."}
            ],
            phases=[
                {
                    "name": "Summarize",
                    "taskType": "summarization",
                    "model": "gpt-4o-mini"
                }
            ],
            concurrency=2,
            auto_start=True
        )
        job_id = job['job']['id']
        print(f"✓ Created batch job: {job_id}")

        # Monitor (briefly)
        print("  Monitoring progress...")
        for i in range(3):
            status = client.batch.get_status(job_id)
            progress = status['status']['progress']
            print(f"  Progress: {progress['percentComplete']:.1f}%")
            if status['status']['status'] == 'COMPLETED':
                print("✓ Job completed!")
                break
            time.sleep(2)
    except Exception as e:
        print(f"  (Batch job creation failed: {e})")

    # 11. Cleanup
    print("\n11. Cleanup")
    print("-" * 60)
    try:
        client.projects.delete(project_id)
        print(f"✓ Deleted project: {project_id}")
    except Exception as e:
        print(f"  (Cleanup failed: {e})")

    print("\n" + "=" * 60)
    print("Workflow complete!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
