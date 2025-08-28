import { API_BASE_URL } from '../config/api';
import { Poll, CreatePollData, VoteData, FetchPollsParams } from '../types/poll';

// Mock data for development
let mockPolls: Poll[] = [];
let mockPollId = 1;

// Helper function to generate mock polls for development
const generateMockPolls = (count: number = 5): Poll[] => {
  const now = new Date();
  const polls: Poll[] = [];
  
  for (let i = 0; i < count; i++) {
    const pollId = `poll-${mockPollId++}`;
    const options = [
      { id: `${pollId}-opt-1`, text: `Option 1` },
      { id: `${pollId}-opt-2`, text: `Option 2` },
      { id: `${pollId}-opt-3`, text: `Option 3` },
    ];
    
    const votes = [];
    // Random votes for mock data
    for (let j = 0; j < Math.floor(Math.random() * 50); j++) {
      const optionIndex = Math.floor(Math.random() * options.length);
      votes.push({
        id: `vote-${pollId}-${j}`,
        userId: `user-${Math.floor(Math.random() * 10)}`,
        optionId: options[optionIndex].id,
        createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.floor(Math.random() * 30) + 1);
    
    polls.push({
      id: pollId,
      question: `Sample Poll Question ${mockPollId}?`,
      options,
      votes,
      createdBy: `user-${Math.floor(Math.random() * 5)}`,
      isMultipleChoice: Math.random() > 0.5,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return polls;
};

// Initialize with some mock data
if (process.env.NODE_ENV === 'development') {
  mockPolls = generateMockPolls(10);
}

export const fetchPolls = async (params: FetchPollsParams = {}): Promise<Poll[]> => {
  const { sortBy = 'newest', filter = 'all', page = 1, limit = 20 } = params;
  
  try {
    // In a real app, you would make an API call like this:
    // const response = await fetch(
    //   `${API_BASE_URL}/polls?sortBy=${sortBy}&filter=${filter}&page=${page}&limit=${limit}`
    // );
    // const data = await response.json();
    // return data;
    
    // For now, we'll use mock data
    let filteredPolls = [...mockPolls];
    
    // Apply filter
    const now = new Date();
    if (filter === 'active') {
      filteredPolls = filteredPolls.filter(poll => new Date(poll.expiresAt) > now);
    } else if (filter === 'closed') {
      filteredPolls = filteredPolls.filter(poll => new Date(poll.expiresAt) <= now);
    }
    
    // Apply sorting
    filteredPolls.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'trending') {
        return b.votes.length - a.votes.length;
      } else if (sortBy === 'expiring') {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      return 0;
    });
    
    // Apply pagination
    const start = (page - 1) * limit;
    return filteredPolls.slice(start, start + limit);
  } catch (error) {
    console.error('Error fetching polls:', error);
    throw error;
  }
};

export const createPoll = async (pollData: CreatePollData): Promise<Poll> => {
  try {
    // In a real app, you would make an API call like this:
    // const response = await fetch(`${API_BASE_URL}/polls`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(pollData),
    // });
    // const data = await response.json();
    // return data;
    
    // For now, we'll create a mock poll
    const now = new Date();
    const pollId = `poll-${mockPollId++}`;
    
    const newPoll: Poll = {
      id: pollId,
      question: pollData.question,
      options: pollData.options.map((text, index) => ({
        id: `${pollId}-opt-${index + 1}`,
        text,
      })),
      votes: [],
      createdBy: pollData.createdBy,
      isMultipleChoice: pollData.isMultipleChoice,
      expiresAt: pollData.expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    mockPolls.unshift(newPoll);
    return newPoll;
  } catch (error) {
    console.error('Error creating poll:', error);
    throw error;
  }
};

export const votePoll = async (
  pollId: string, 
  optionIds: string[], 
  userId: string
): Promise<Poll> => {
  try {
    // In a real app, you would make an API call like this:
    // const response = await fetch(`${API_BASE_URL}/polls/${pollId}/vote`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ optionIds, userId }),
    // });
    // const data = await response.json();
    // return data;
    
    // For now, we'll update the mock data
    const pollIndex = mockPolls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
      throw new Error('Poll not found');
    }
    
    const poll = { ...mockPolls[pollIndex] };
    
    // Remove existing votes from this user
    poll.votes = poll.votes.filter(vote => vote.userId !== userId);
    
    // Add new votes
    const now = new Date();
    optionIds.forEach(optionId => {
      poll.votes.push({
        id: `vote-${pollId}-${Date.now()}-${optionId}`,
        userId,
        optionId,
        createdAt: now.toISOString(),
      });
    });
    
    mockPolls[pollIndex] = poll;
    return poll;
  } catch (error) {
    console.error('Error voting on poll:', error);
    throw error;
  }
};

export const fetchPollResults = async (pollId: string): Promise<Poll> => {
  try {
    // In a real app, you would make an API call like this:
    // const response = await fetch(`${API_BASE_URL}/polls/${pollId}/results`);
    // const data = await response.json();
    // return data;
    
    // For now, we'll return the poll from our mock data
    const poll = mockPolls.find(p => p.id === pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }
    
    return poll;
  } catch (error) {
    console.error('Error fetching poll results:', error);
    throw error;
  }
};
