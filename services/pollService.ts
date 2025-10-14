import { API_BASE_URL } from '../config/api';
import { Poll, CreatePollData, VoteData, FetchPollsParams } from '../types/poll';
import { getAuthToken } from '../utils/auth';

type ApiError = {
  message: string;
  status?: number;
};

// Helper function to handle API requests
const apiRequest = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw { message: 'Not authenticated', status: 401 };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { 
        message: error.message || 'Something went wrong',
        status: response.status
      };
    }

    return response.json();
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error);
    throw error;
  }
};

export const fetchPolls = async (params: FetchPollsParams = {}): Promise<Poll[]> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    
    if (params.filter) {
      queryParams.append('filter', params.filter);
    }
    
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/polls${queryString ? `?${queryString}` : ''}`;
    
    return await apiRequest<Poll[]>(endpoint);
  } catch (error) {
    console.error('Failed to fetch polls:', error);
    throw error;
  }
};

export const createPoll = async (pollData: Omit<CreatePollData, 'createdBy'>): Promise<Poll> => {
  try {
    const response = await apiRequest<Poll>('/polls', {
      method: 'POST',
      body: JSON.stringify({
        ...pollData,
        expiresAt: pollData.expiresAt.toISOString(),
      }),
    });
    
    // Notify the group about the new poll if it's a group poll
    if (pollData.groupId) {
      // This would be handled by the server via WebSocket in a real implementation
      console.log(`New poll created in group ${pollData.groupId}`);
    }
    
    return response;
  } catch (error) {
    console.error('Failed to create poll:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create poll';
    throw new Error(errorMessage);
  }
};

export const votePoll = async (
  pollId: string, 
  optionIds: string[], 
  userId: string
): Promise<Poll> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    return await apiRequest<Poll>(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        optionIds,
        userId,
      } as VoteData),
    });
  } catch (error) {
    console.error('Failed to submit vote:', error);
    throw error;
  }
};

export const fetchPollResults = async (pollId: string): Promise<Poll> => {
  try {
    return await apiRequest<Poll>(`/polls/${pollId}/results`);
  } catch (error) {
    console.error('Failed to fetch poll results:', error);
    throw error;
  }
};

export const getPollById = async (pollId: string): Promise<Poll> => {
  try {
    return await apiRequest<Poll>(`/polls/${pollId}`);
  } catch (error) {
    console.error('Failed to fetch poll:', error);
    throw error;
  }
};
