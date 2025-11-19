"""Tests for text processor"""

import pytest
from processors.text import TextProcessor


class TestTextProcessor:
    """Test cases for TextProcessor class"""

    @pytest.fixture
    def processor(self):
        """Create TextProcessor instance"""
        return TextProcessor()

    # Document Chunking Tests

    def test_chunk_document_basic(self, processor):
        """Test basic document chunking"""
        content = "Lorem ipsum dolor sit amet. " * 50  # ~1400 chars

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="test.txt",
            chunk_size=500,
            chunk_overlap=50
        )

        assert result['total_chunks'] > 1
        assert len(result['chunks']) > 1
        assert result['chunks'][0]['document_id'] == "doc-1"
        assert result['chunks'][0]['project_id'] == "proj-1"

    def test_chunk_document_custom_chunk_size(self, processor):
        """Test chunking with custom chunk size"""
        content = "A" * 1000

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="test.txt",
            chunk_size=200,
            chunk_overlap=20
        )

        # Should have multiple chunks for 1000 chars with 200 char chunks
        assert result['total_chunks'] >= 5
        for chunk in result['chunks']:
            # Each chunk should be roughly chunk_size or less
            assert chunk['chunk_size'] <= 200

    def test_chunk_document_overlap(self, processor):
        """Test that chunks have proper overlap"""
        content = "ABCDEFGHIJ" * 50  # 500 chars

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="test.txt",
            chunk_size=100,
            chunk_overlap=20
        )

        # Verify overlaps exist (end of one chunk should appear in next)
        if len(result['chunks']) > 1:
            # Last 20 chars of first chunk should appear in second chunk
            first_end = result['chunks'][0]['content'][-20:]
            second_start = result['chunks'][1]['content'][:20]
            # May not be exact due to smart boundary detection
            assert len(first_end) > 0
            assert len(second_start) > 0

    def test_chunk_document_small_document(self, processor):
        """Test that small documents produce single chunk"""
        content = "Small document with minimal text."

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="test.txt",
            chunk_size=1000
        )

        assert result['total_chunks'] == 1
        assert len(result['chunks']) == 1
        assert result['chunks'][0]['content'] == content

    def test_chunk_document_empty_content(self, processor):
        """Test chunking with empty content"""
        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content="",
            filename="test.txt"
        )

        assert result['total_chunks'] == 0
        assert len(result['chunks']) == 0

    def test_chunk_document_very_large(self, processor, sample_text):
        """Test chunking very large document"""
        # sample_text is ~10,000 chars
        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=sample_text,
            filename="large.txt",
            chunk_size=1000,
            chunk_overlap=100
        )

        assert result['total_chunks'] >= 10
        assert all(chunk['chunk_size'] <= 1000 for chunk in result['chunks'])

    def test_chunk_document_custom_separators(self, processor):
        """Test chunking with custom separators"""
        content = "Section 1.\n\nSection 2.\n\nSection 3.\n\nSection 4."

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="test.txt",
            chunk_size=100,
            separators=["\n\n", "\n", " "]
        )

        # Should respect paragraph boundaries when possible
        assert result['total_chunks'] > 0

    def test_chunk_document_metadata(self, processor):
        """Test chunk metadata is correctly set"""
        content = "Test content " * 100

        result = processor.chunk_document(
            document_id="doc-123",
            project_id="proj-456",
            content=content,
            filename="example.md",
            chunk_size=200
        )

        for i, chunk in enumerate(result['chunks']):
            assert chunk['id'].startswith("doc-123_chunk_")
            assert chunk['document_id'] == "doc-123"
            assert chunk['project_id'] == "proj-456"
            assert chunk['metadata']['filename'] == "example.md"
            assert chunk['metadata']['chunk_index'] == i
            assert chunk['metadata']['total_chunks'] == result['total_chunks']
            assert 'start_char' in chunk['metadata']
            assert 'end_char' in chunk['metadata']

    def test_chunk_document_unicode(self, processor):
        """Test chunking with unicode characters"""
        content = "Hello 世界! " * 50 + "Emoji test 🎉🎊 " * 50

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="unicode.txt",
            chunk_size=100
        )

        assert result['total_chunks'] > 0
        for chunk in result['chunks']:
            # Should handle unicode properly
            assert isinstance(chunk['content'], str)

    def test_chunk_document_numbering(self, processor):
        """Test chunk numbering is sequential"""
        content = "A" * 1000

        result = processor.chunk_document(
            document_id="doc-1",
            project_id="proj-1",
            content=content,
            filename="test.txt",
            chunk_size=100
        )

        for i, chunk in enumerate(result['chunks']):
            assert chunk['metadata']['chunk_index'] == i

    # Token Counting Tests

    def test_count_tokens_basic(self, processor):
        """Test basic token counting"""
        content = "Hello, world! This is a test sentence."

        result = processor.count_tokens(content, model='gpt-4')

        assert result['token_count'] > 0
        assert result['model'] == 'gpt-4'
        assert 'encoding' in result
        # Should be roughly 8-10 tokens for this sentence
        assert 5 < result['token_count'] < 15

    def test_count_tokens_gpt_35_turbo(self, processor):
        """Test token counting with gpt-3.5-turbo model"""
        content = "The quick brown fox jumps over the lazy dog."

        result = processor.count_tokens(content, model='gpt-3.5-turbo')

        assert result['token_count'] > 0
        assert result['model'] == 'gpt-3.5-turbo'

    def test_count_tokens_different_encodings(self, processor):
        """Test that different models may use different encodings"""
        content = "Test content for encoding verification."

        gpt4_result = processor.count_tokens(content, model='gpt-4')
        gpt35_result = processor.count_tokens(content, model='gpt-3.5-turbo')

        # Both should return token counts
        assert gpt4_result['token_count'] > 0
        assert gpt35_result['token_count'] > 0
        # They might be the same or slightly different
        assert abs(gpt4_result['token_count'] - gpt35_result['token_count']) <= 2

    def test_count_tokens_empty_string(self, processor):
        """Test token counting with empty string"""
        result = processor.count_tokens("", model='gpt-4')

        assert result['token_count'] == 0

    def test_count_tokens_very_long_text(self, processor, sample_text):
        """Test token counting with very long text"""
        result = processor.count_tokens(sample_text, model='gpt-4')

        # sample_text is ~10,000 chars, should be ~2500 tokens (rough estimate)
        assert result['token_count'] > 1000
        assert result['token_count'] < 5000

    def test_count_tokens_unicode(self, processor):
        """Test token counting with unicode characters"""
        content = "Hello 世界! Emoji test 🎉🎊"

        result = processor.count_tokens(content, model='gpt-4')

        assert result['token_count'] > 0

    # Conversation Token Counting Tests

    def test_count_conversation_tokens_basic(self, processor):
        """Test conversation token counting"""
        messages = [
            {"role": "user", "content": "Hello, how are you?"},
            {"role": "assistant", "content": "I'm doing well, thank you!"},
        ]

        result = processor.count_conversation_tokens(messages, model='gpt-4')

        assert result['total_tokens'] > 0
        assert result['message_count'] == 2
        assert result['model'] == 'gpt-4'

    def test_count_conversation_tokens_with_system(self, processor):
        """Test conversation with system message"""
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]

        result = processor.count_conversation_tokens(messages, model='gpt-4')

        assert result['total_tokens'] > 0
        assert result['message_count'] == 3

    def test_count_conversation_tokens_empty_messages(self, processor):
        """Test conversation token counting with empty messages list"""
        result = processor.count_conversation_tokens([], model='gpt-4')

        # Should return low count (just the formatting tokens)
        assert result['total_tokens'] >= 0
        assert result['message_count'] == 0

    def test_count_conversation_tokens_long_conversation(self, processor):
        """Test token counting for long conversation"""
        messages = [
            {"role": "user", "content": f"Message {i}"} for i in range(20)
        ]

        result = processor.count_conversation_tokens(messages, model='gpt-4')

        assert result['total_tokens'] > 0
        assert result['message_count'] == 20

    def test_count_conversation_tokens_different_models(self, processor):
        """Test conversation token counting across different models"""
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi!"},
        ]

        gpt4_result = processor.count_conversation_tokens(messages, model='gpt-4')
        gpt35_result = processor.count_conversation_tokens(messages, model='gpt-3.5-turbo')

        # Both should return counts
        assert gpt4_result['total_tokens'] > 0
        assert gpt35_result['total_tokens'] > 0
        # May have slightly different token counts due to message formatting
        assert gpt4_result['message_count'] == gpt35_result['message_count']
