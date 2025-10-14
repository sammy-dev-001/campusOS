export type Poll = {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  votes: {
    id: string;
    userId: string;
    optionId: string;
    createdAt: string;
  }[];
  createdBy: string;
  isMultipleChoice: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePollData = {
  question: string;
  options: string[];
  isMultipleChoice: boolean;
  expiresAt: Date;
  createdBy: string;
  groupId?: string;
  description?: string;
};

export type VoteData = {
  pollId: string;
  optionIds: string[];
  userId: string;
};

export type FetchPollsParams = {
  sortBy?: 'newest' | 'trending' | 'expiring';
  filter?: 'all' | 'active' | 'closed';
  page?: number;
  limit?: number;
};
