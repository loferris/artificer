import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectSidebar } from '../ProjectSidebar';
import { trpc } from '../../../lib/trpc/client';

// Mock tRPC
vi.mock('../../../lib/trpc/client', () => ({
  trpc: {
    projects: {
      list: {
        useQuery: vi.fn(),
      },
    },
    conversations: {
      list: {
        useQuery: vi.fn(),
      },
    },
  },
}));

describe('ProjectSidebar', () => {
  const mockProjects = {
    projects: [
      {
        id: 'proj-1',
        name: 'Test Project',
        description: 'A test project',
        documentCount: 5,
        conversationCount: 3,
        updatedAt: new Date('2024-01-01'),
      },
    ],
  };

  const mockConversations = [
    {
      id: 'conv-1',
      title: 'Test Conversation',
      projectId: 'proj-1',
      updatedAt: new Date('2024-01-01'),
    },
  ];

  beforeEach(() => {
    vi.mocked(trpc.projects.list.useQuery).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(trpc.conversations.list.useQuery).mockReturnValue({
      data: mockConversations,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders General category', () => {
    render(
      <ProjectSidebar
        currentProjectId={null}
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('renders projects from query', () => {
    render(
      <ProjectSidebar
        currentProjectId={null}
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('highlights selected project', () => {
    render(
      <ProjectSidebar
        currentProjectId="proj-1"
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    const projectElement = screen.getByText('Test Project').closest('div');
    expect(projectElement).toHaveClass('bg-blue-50');
  });

  it('calls onProjectSelect when project is clicked', () => {
    const handleProjectSelect = vi.fn();
    render(
      <ProjectSidebar
        currentProjectId={null}
        currentConversationId={null}
        onProjectSelect={handleProjectSelect}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    const project = screen.getByText('Test Project');
    fireEvent.click(project);

    expect(handleProjectSelect).toHaveBeenCalledWith('proj-1');
  });

  it('calls onConversationSelect when conversation is clicked', () => {
    const handleConversationSelect = vi.fn();
    render(
      <ProjectSidebar
        currentProjectId="proj-1"
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={handleConversationSelect}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    const conversation = screen.getByText('Test Conversation');
    fireEvent.click(conversation);

    expect(handleConversationSelect).toHaveBeenCalledWith('conv-1');
  });

  it('calls onNewConversation when New button is clicked', () => {
    const handleNewConversation = vi.fn();
    render(
      <ProjectSidebar
        currentProjectId={null}
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={handleNewConversation}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    const newButton = screen.getByText('+ New');
    fireEvent.click(newButton);

    expect(handleNewConversation).toHaveBeenCalled();
  });

  it('shows loading state while fetching projects', () => {
    vi.mocked(trpc.projects.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(
      <ProjectSidebar
        currentProjectId={null}
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it('can be collapsed and expanded', () => {
    render(
      <ProjectSidebar
        currentProjectId={null}
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    // Initially expanded
    expect(screen.getByText('Projects')).toBeInTheDocument();

    // Find and click collapse button
    const collapseButton = screen.getByTitle('Collapse sidebar');
    fireEvent.click(collapseButton);

    // Projects header should no longer be visible
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();

    // Find and click expand button
    const expandButton = screen.getByTitle('Expand sidebar');
    fireEvent.click(expandButton);

    // Projects header should be visible again
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('filters conversations by selected project', () => {
    const conversationsWithDifferentProjects = [
      {
        id: 'conv-1',
        title: 'Project 1 Conversation',
        projectId: 'proj-1',
        updatedAt: new Date(),
      },
      {
        id: 'conv-2',
        title: 'Project 2 Conversation',
        projectId: 'proj-2',
        updatedAt: new Date(),
      },
      {
        id: 'conv-3',
        title: 'Unassigned Conversation',
        projectId: null,
        updatedAt: new Date(),
      },
    ];

    vi.mocked(trpc.conversations.list.useQuery).mockReturnValue({
      data: conversationsWithDifferentProjects,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(
      <ProjectSidebar
        currentProjectId="proj-1"
        currentConversationId={null}
        onProjectSelect={vi.fn()}
        onConversationSelect={vi.fn()}
        onNewConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onProjectManage={vi.fn()}
      />
    );

    // Should only see conversation from proj-1
    expect(screen.getByText('Project 1 Conversation')).toBeInTheDocument();
    expect(screen.queryByText('Project 2 Conversation')).not.toBeInTheDocument();
    expect(screen.queryByText('Unassigned Conversation')).not.toBeInTheDocument();
  });
});
