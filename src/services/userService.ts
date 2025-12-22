import { API_BASE_URL } from '../config/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const updateUserPushToken = async (userId: string, pushToken: string): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication token if needed
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || 'Failed to update push token',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error updating push token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};
