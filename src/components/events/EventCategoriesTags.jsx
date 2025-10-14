import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Chip, 
  Autocomplete, 
  Typography, 
  IconButton, 
  Tooltip,
  useTheme,
  Divider,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'academic', name: 'Academic', color: '#3f51b5' },
  { id: 'social', name: 'Social', color: '#4caf50' },
  { id: 'sports', name: 'Sports', color: '#f44336' },
  { id: 'workshop', name: 'Workshop', color: '#ff9800' },
  { id: 'conference', name: 'Conference', color: '#9c27b0' },
  { id: 'networking', name: 'Networking', color: '#2196f3' },
  { id: 'entertainment', name: 'Entertainment', color: '#e91e63' },
  { id: 'other', name: 'Other', color: '#607d8b' },
];

const EventCategoriesTags = ({
  categories: propCategories = [],
  tags: propTags = [],
  availableCategories = DEFAULT_CATEGORIES,
  maxCategories = 3,
  maxTags = 10,
  onCategoriesChange,
  onTagsChange,
  showTitle = true,
  fullWidth = true,
  size = 'medium',
  sx = {}
}) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
  // State
  const [categories, setCategories] = useState(propCategories);
  const [tags, setTags] = useState(propTags);
  const [categoryInput, setCategoryInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  
  // Update state when props change
  useEffect(() => {
    setCategories(propCategories);
  }, [propCategories]);
  
  useEffect(() => {
    setTags(propTags);
  }, [propTags]);
  
  // Handle adding a category
  const handleAddCategory = (newCategory) => {
    if (!newCategory) return;
    
    // Check if category is already added
    if (categories.some(cat => cat.id === newCategory.id)) {
      enqueueSnackbar('This category is already added', { variant: 'warning' });
      return;
    }
    
    // Check max categories
    if (categories.length >= maxCategories) {
      enqueueSnackbar(`Maximum ${maxCategories} categories allowed`, { variant: 'error' });
      return;
    }
    
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    setCategoryInput('');
    
    if (onCategoriesChange) {
      onCategoriesChange(updatedCategories);
    }
    
    enqueueSnackbar(`Added category: ${newCategory.name}`, { variant: 'success' });
  };
  
  // Handle removing a category
  const handleRemoveCategory = (categoryId) => {
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    setCategories(updatedCategories);
    
    if (onCategoriesChange) {
      onCategoriesChange(updatedCategories);
    }
    
    const removedCategory = availableCategories.find(cat => cat.id === categoryId);
    if (removedCategory) {
      enqueueSnackbar(`Removed category: ${removedCategory.name}`, { variant: 'info' });
    }
  };
  
  // Handle adding a tag
  const handleAddTag = (e) => {
    e.preventDefault();
    const newTag = tagInput.trim();
    
    if (!newTag) return;
    
    // Check if tag already exists
    if (tags.includes(newTag)) {
      enqueueSnackbar('This tag already exists', { variant: 'warning' });
      return;
    }
    
    // Check max tags
    if (tags.length >= maxTags) {
      enqueueSnackbar(`Maximum ${maxTags} tags allowed`, { variant: 'error' });
      return;
    }
    
    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    setTagInput('');
    
    if (onTagsChange) {
      onTagsChange(updatedTags);
    }
    
    enqueueSnackbar(`Added tag: ${newTag}`, { variant: 'success' });
  };
  
  // Handle removing a tag
  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    if (onTagsChange) {
      onTagsChange(updatedTags);
    }
    
    enqueueSnackbar(`Removed tag: ${tagToRemove}`, { variant: 'info' });
  };
  
  // Filter out already selected categories
  const availableCategoryOptions = availableCategories.filter(
    cat => !categories.some(selectedCat => selectedCat.id === cat.id)
  );
  
  return (
    <Box 
      sx={{
        width: fullWidth ? '100%' : 'auto',
        ...sx
      }}
    >
      {showTitle && (
        <Typography variant="subtitle1" gutterBottom>
          Categories & Tags
        </Typography>
      )}
      
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          borderRadius: 1,
          mb: 2
        }}
      >
        {/* Categories Section */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" mb={1}>
            <CategoryIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" color="textSecondary">
              Categories
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
              {categories.length} / {maxCategories}
            </Typography>
          </Box>
          
          {/* Selected Categories */}
          <Box display="flex" flexWrap="wrap" gap={1} mb={1} minHeight={40}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                onDelete={() => handleRemoveCategory(category.id)}
                size={size}
                sx={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                  border: `1px solid ${category.color}40`,
                  '& .MuiChip-deleteIcon': {
                    color: `${category.color}80`,
                    '&:hover': {
                      color: category.color,
                    },
                  },
                }}
              />
            ))}
          </Box>
          
          {/* Add Category */}
          {categories.length < maxCategories && (
            <Autocomplete
              options={availableCategoryOptions}
              getOptionLabel={(option) => option.name}
              value={null}
              onChange={(event, newValue) => {
                if (newValue) {
                  handleAddCategory(newValue);
                }
              }}
              inputValue={categoryInput}
              onInputChange={(event, newInputValue) => {
                setCategoryInput(newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Add a category..."
                  size={size}
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <CategoryIcon 
                        color="action" 
                        sx={{ mr: 1 }} 
                      />
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box 
                  component="li" 
                  {...props}
                  sx={{
                    '& > span': {
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: option.color,
                      mr: 1,
                      flexShrink: 0
                    }
                  }}
                >
                  <span />
                  {option.name}
                </Box>
              )}
            />
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Tags Section */}
        <Box>
          <Box display="flex" alignItems="center" mb={1}>
            <TagIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" color="textSecondary">
              Tags
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
              {tags.length} / {maxTags}
            </Typography>
          </Box>
          
          {/* Selected Tags */}
          <Box display="flex" flexWrap="wrap" gap={1} mb={1} minHeight={40}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                size={size}
                variant="outlined"
                sx={{
                  '& .MuiChip-deleteIcon': {
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'error.main',
                    },
                  },
                }}
              />
            ))}
          </Box>
          
          {/* Add Tag */}
          {tags.length < maxTags && (
            <Box 
              component="form" 
              onSubmit={handleAddTag}
              display="flex" 
              alignItems="center"
              gap={1}
            >
              <TextField
                fullWidth
                size={size}
                variant="outlined"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <TagIcon 
                      color="action" 
                      sx={{ mr: 1 }} 
                    />
                  ),
                }}
              />
              <Tooltip title="Add tag">
                <span>
                  <IconButton 
                    type="submit" 
                    color="primary"
                    disabled={!tagInput.trim()}
                    size={size}
                  >
                    <AddIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default EventCategoriesTags;
