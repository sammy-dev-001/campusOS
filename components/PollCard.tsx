import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// Custom date formatter to avoid date-fns dependency issues
const formatTimeRemaining = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  
  if (diffInSeconds < 0) return 'Ended';
  
  const days = Math.floor(diffInSeconds / (3600 * 24));
  const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
  return `Ends in ${minutes}m`;
};
import { Ionicons } from '@expo/vector-icons';

// Define types locally since we're having issues with the import
type Vote = {
  id: string;
  userId: string;
  optionId: string;
  createdAt: string;
};

type PollOption = {
  id: string;
  text: string;
};

type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  votes: Vote[];
  createdBy: string;
  isMultipleChoice: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type PollCardProps = {
  poll: Poll;
  userId: string;
  onVote: (pollId: string, optionIds: string[]) => Promise<void>;
};

export function PollCard({ poll, userId, onVote }: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasVoted = poll.votes.some((vote: Vote) => vote.userId === userId);
  const totalVotes = poll.votes.length;
  const isExpired = new Date(poll.expiresAt) < new Date();

  // Calculate percentage for each option
  const optionsWithStats = poll.options.map((option: PollOption) => {
    const votes = poll.votes.filter((vote: Vote) => vote.optionId === option.id).length;
    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
    const isWinning = !isExpired ? false : 
      votes === Math.max(...poll.options.map((o: PollOption) => 
        poll.votes.filter((v: Vote) => v.optionId === o.id).length
      )) && votes > 0;
      
    return {
      ...option,
      votes,
      percentage,
      isWinning
    };
  });

  const handleVote = async (): Promise<void> => {
    if (selectedOptions.length === 0 || hasVoted || isExpired) return;
    
    try {
      setIsSubmitting(true);
      await onVote(poll.id, selectedOptions);
      setSelectedOptions([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOption = (optionId: string): void => {
    if (hasVoted || isExpired) return;
    
    if (poll.isMultipleChoice) {
      setSelectedOptions((prev: string[]) => 
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const isOptionSelected = (optionId: string): boolean => {
    return selectedOptions.includes(optionId);
  };

  return (
    <View className="bg-white rounded-xl shadow-sm overflow-hidden">
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <Text className="text-lg font-semibold text-gray-900 flex-1">
            {poll.question}
          </Text>
          <View className="bg-blue-50 px-2 py-1 rounded-full">
            <Text className="text-xs font-medium text-blue-700">
              {poll.isMultipleChoice ? 'Survey' : 'Poll'}
            </Text>
          </View>
        </View>

        <View className="space-y-3 mb-4">
          {optionsWithStats.map((option) => {
            const isSelected = isOptionSelected(option.id);
            const showResults = hasVoted || isExpired;
            
            return (
              <View key={option.id} className="space-y-1">
                <TouchableOpacity
                  onPress={() => toggleOption(option.id)}
                  disabled={hasVoted || isExpired}
                  className={`p-3 rounded-lg border ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  } ${(hasVoted || isExpired) ? 'opacity-80' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text 
                      className={`${isSelected ? 'text-blue-700 font-medium' : 'text-gray-800'}`}
                    >
                      {option.text}
                    </Text>
                    
                    {showResults && (
                      <Text className="text-xs font-medium text-gray-500">
                        {option.percentage}%
                      </Text>
                    )}
                  </View>

                  {showResults && (
                    <View className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <View 
                        className={`h-full rounded-full ${
                          option.isWinning ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${option.percentage}%` }}
                      />
                    </View>
                  )}
                </TouchableOpacity>
                
                {showResults && (
                  <View className="flex-row justify-between px-1">
                    <Text className="text-xs text-gray-500">
                      {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                    </Text>
                    {option.isWinning && (
                      <View className="flex-row items-center">
                        <Ionicons name="trophy" size={12} color="#f59e0b" />
                        <Text className="text-xs text-amber-600 ml-1 font-medium">
                          Leading
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="people" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </Text>
            
            <View className="w-px h-4 bg-gray-200 mx-3" />
            
            <Ionicons 
              name={isExpired ? 'time-outline' : 'time'} 
              size={14} 
              color={isExpired ? '#ef4444' : '#6b7280'} 
            />
            <Text 
              className={`text-xs ml-1 ${
                isExpired ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {formatTimeRemaining(poll.expiresAt)}
            </Text>
          </View>

          {!hasVoted && !isExpired && (
            <TouchableOpacity
              onPress={handleVote}
              disabled={selectedOptions.length === 0 || isSubmitting}
              className={`px-4 py-2 rounded-full ${
                selectedOptions.length > 0 
                  ? 'bg-blue-500' 
                  : 'bg-gray-200'
              }`}
            >
              <Text className="text-sm font-medium text-white">
                {isSubmitting ? 'Submitting...' : 'Vote'}
              </Text>
            </TouchableOpacity>
          )}
          
          {(hasVoted || isExpired) && (
            <View className="px-3 py-1.5 bg-gray-100 rounded-full">
              <Text className="text-xs font-medium text-gray-600">
                {isExpired ? 'Poll closed' : 'Voted'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  }
});

export default PollCard;
