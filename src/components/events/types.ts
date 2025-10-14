export interface Event {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  // Add other event properties as needed
}

export interface EventListProps {
  events: any[];
  onEventPress: (event: any) => void;
  emptyMessage?: string;
  sx?: any;
}

export interface CalendarViewProps {
  events: any[];
  onEventPress: (event: any) => void;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  sx?: any;
}

export interface SearchValues {
  query: string;
  // Add other search filter fields as needed
}

export interface EventSearchProps {
  onSearch: (values: SearchValues) => void;
  initialValues?: Partial<SearchValues>;
  showResultsCount?: boolean;
  autoSearch?: boolean;
  placeholder?: string;
  variant?: 'standard' | 'outlined' | 'filled';
  fullWidth?: boolean;
  elevation?: number;
  sx?: any;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface EventCategoriesTagsProps {
  categories: Category[];
  tags: Tag[];
  availableCategories?: Category[];
  maxCategories?: number;
  maxTags?: number;
  onCategoriesChange: (categories: Category[]) => void;
  onTagsChange: (tags: Tag[]) => void;
  showTitle?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: any;
}
