import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

type SortOption = 'newest' | 'trending' | 'expiring';
type FilterOption = 'all' | 'active' | 'closed';

type FilterBarProps = {
  sortBy: SortOption;
  filter: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
};

export function FilterBar({ sortBy, filter, onSortChange, onFilterChange }: FilterBarProps) {
  return (
    <View className="flex-row space-x-2 mb-4">
      <View className="flex-1 flex-row bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'all' as const, label: 'All' },
          { id: 'active' as const, label: 'Active' },
          { id: 'closed' as const, label: 'Closed' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onFilterChange(item.id)}
            className={`flex-1 py-2 rounded-md items-center ${
              filter === item.id ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === item.id ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-row bg-gray-100 p-1 rounded-lg">
        <TouchableOpacity
          onPress={() => onSortChange('newest')}
          className={`px-3 py-2 rounded-md ${
            sortBy === 'newest' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              sortBy === 'newest' ? 'text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            Newest
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onSortChange('trending')}
          className={`px-3 py-2 rounded-md ${
            sortBy === 'trending' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              sortBy === 'trending' ? 'text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            Popular
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onSortChange('expiring')}
          className={`px-3 py-2 rounded-md ${
            sortBy === 'expiring' ? 'bg-white shadow-sm' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              sortBy === 'expiring' ? 'text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            Ending
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
