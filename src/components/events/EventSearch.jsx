import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  IconButton, 
  Paper, 
  Typography, 
  Button, 
  Chip, 
  Divider, 
  Popover, 
  Checkbox, 
  FormControlLabel, 
  FormGroup, 
  Slider, 
  MenuItem, 
  Select, 
  InputLabel, 
  FormControl, 
  useTheme,
  useMediaQuery,
  ClickAwayListener,
  Popper,
  Grow,
  MenuList,
  Collapse,
  Stack
} from '@mui/material';
import { 
  Search as SearchIcon, 
  FilterList as FilterListIcon, 
  Close as CloseIcon, 
  DateRange as DateRangeIcon,
  Event as EventIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// Available event categories
const EVENT_CATEGORIES = [
  'Academic',
  'Social',
  'Sports',
  'Workshop',
  'Conference',
  'Networking',
  'Entertainment',
  'Other'
];

// Available event types
const EVENT_TYPES = [
  'In-Person',
  'Online',
  'Hybrid'
];

// Available sort options
const SORT_OPTIONS = [
  { value: 'date-asc', label: 'Date (Earliest First)' },
  { value: 'date-desc', label: 'Date (Latest First)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'popularity', label: 'Most Popular' },
];

const EventSearch = ({ 
  onSearch, 
  initialValues = {},
  showResultsCount = true,
  autoSearch = true,
  placeholder = 'Search events...',
  variant = 'standard',
  fullWidth = true,
  elevation = 1,
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedFilters, setExpandedFilters] = useState({
    categories: false,
    dateRange: false,
    type: false,
    price: false,
    location: false,
    sort: false
  });
  
  const formik = useFormik({
    initialValues: {
      query: '',
      categories: [],
      dateRange: [null, null],
      eventType: [],
      priceRange: [0, 100],
      location: '',
      sortBy: 'date-asc',
      ...initialValues
    },
    validationSchema: Yup.object({
      query: Yup.string(),
      categories: Yup.array().of(Yup.string()),
      dateRange: Yup.array().of(Yup.date().nullable(true)),
      eventType: Yup.array().of(Yup.string()),
      priceRange: Yup.array().of(Yup.number().min(0).max(1000)),
      location: Yup.string(),
      sortBy: Yup.string()
    }),
    onSubmit: (values) => {
      // Convert date range to ISO strings for URL
      const params = new URLSearchParams();
      
      if (values.query) params.set('q', values.query);
      if (values.categories.length > 0) params.set('categories', values.categories.join(','));
      if (values.dateRange[0]) params.set('startDate', values.dateRange[0].toISOString());
      if (values.dateRange[1]) params.set('endDate', values.dateRange[1].toISOString());
      if (values.eventType.length > 0) params.set('type', values.eventType.join(','));
      if (values.priceRange[0] > 0 || values.priceRange[1] < 100) {
        params.set('minPrice', values.priceRange[0]);
        params.set('maxPrice', values.priceRange[1]);
      }
      if (values.location) params.set('location', values.location);
      if (values.sortBy) params.set('sort', values.sortBy);
      
      // Update URL
      navigate(`${location.pathname}?${params.toString()}`);
      
      // Call the onSearch callback with form values
      if (onSearch) {
        onSearch(values);
      }
      
      // Close the filter panel on mobile
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    enableReinitialize: true
  });
  
  // Parse URL parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const values = { ...formik.initialValues };
    
    if (params.has('q')) values.query = params.get('q');
    if (params.has('categories')) values.categories = params.get('categories').split(',');
    if (params.has('startDate') || params.has('endDate')) {
      values.dateRange = [
        params.has('startDate') ? new Date(params.get('startDate')) : null,
        params.has('endDate') ? new Date(params.get('endDate')) : null
      ];
    }
    if (params.has('type')) values.eventType = params.get('type').split(',');
    if (params.has('minPrice') || params.has('maxPrice')) {
      values.priceRange = [
        params.has('minPrice') ? Number(params.get('minPrice')) : 0,
        params.has('maxPrice') ? Number(params.get('maxPrice')) : 100
      ];
    }
    if (params.has('location')) values.location = params.get('location');
    if (params.has('sort')) values.sortBy = params.get('sort');
    
    formik.setValues(values);
    
    // Trigger search if autoSearch is enabled
    if (autoSearch && Object.keys(params).length > 0) {
      formik.submitForm();
    }
  }, [location.search]);
  
  // Handle filter toggle
  const handleFilterToggle = (filter) => {
    if (isMobile) {
      setActiveFilter(activeFilter === filter ? null : filter);
    } else {
      setExpandedFilters(prev => ({
        ...prev,
        [filter]: !prev[filter]
      }));
    }
  };
  
  // Handle category toggle
  const handleCategoryToggle = (category) => {
    const currentIndex = formik.values.categories.indexOf(category);
    const newCategories = [...formik.values.categories];
    
    if (currentIndex === -1) {
      newCategories.push(category);
    } else {
      newCategories.splice(currentIndex, 1);
    }
    
    formik.setFieldValue('categories', newCategories);
  };
  
  // Handle event type toggle
  const handleEventTypeToggle = (type) => {
    const currentIndex = formik.values.eventType.indexOf(type);
    const newTypes = [...formik.values.eventType];
    
    if (currentIndex === -1) {
      newTypes.push(type);
    } else {
      newTypes.splice(currentIndex, 1);
    }
    
    formik.setFieldValue('eventType', newTypes);
  };
  
  // Handle clear all filters
  const handleClearAll = () => {
    formik.resetForm({
      values: {
        ...formik.initialValues,
        query: formik.values.query // Keep the search query
      }
    });
    
    // Navigate to clean URL
    navigate(location.pathname);
    
    // Trigger search if autoSearch is enabled
    if (autoSearch) {
      formik.submitForm();
    }
  };
  
  // Check if any filters are active
  const hasActiveFilters = 
    formik.values.categories.length > 0 ||
    formik.values.dateRange.some(Boolean) ||
    formik.values.eventType.length > 0 ||
    formik.values.priceRange[0] > 0 || 
    formik.values.priceRange[1] < 100 ||
    formik.values.location ||
    formik.values.sortBy !== 'date-asc';
  
  // Format date range for display
  const formatDateRange = (start, end) => {
    if (!start && !end) return 'Any date';
    
    if (start && end) {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    
    return start ? `From ${format(start, 'MMM d, yyyy')}` : `Until ${format(end, 'MMM d, yyyy')}`;
  };
  
  // Render filter chips for active filters
  const renderActiveFilters = () => {
    const chips = [];
    
    // Categories
    formik.values.categories.forEach(category => {
      chips.push({
        key: `category-${category}`,
        label: category,
        onDelete: () => {
          const newCategories = formik.values.categories.filter(c => c !== category);
          formik.setFieldValue('categories', newCategories);
          if (autoSearch) formik.submitForm();
        }
      });
    });
    
    // Date range
    if (formik.values.dateRange[0] || formik.values.dateRange[1]) {
      chips.push({
        key: 'date-range',
        label: formatDateRange(formik.values.dateRange[0], formik.values.dateRange[1]),
        onDelete: () => {
          formik.setFieldValue('dateRange', [null, null]);
          if (autoSearch) formik.submitForm();
        }
      });
    }
    
    // Event types
    formik.values.eventType.forEach(type => {
      chips.push({
        key: `type-${type}`,
        label: type,
        onDelete: () => {
          const newTypes = formik.values.eventType.filter(t => t !== type);
          formik.setFieldValue('eventType', newTypes);
          if (autoSearch) formik.submitForm();
        }
      });
    });
    
    // Price range
    if (formik.values.priceRange[0] > 0 || formik.values.priceRange[1] < 100) {
      chips.push({
        key: 'price-range',
        label: `$${formik.values.priceRange[0]} - $${formik.values.priceRange[1]}`,
        onDelete: () => {
          formik.setFieldValue('priceRange', [0, 100]);
          if (autoSearch) formik.submitForm();
        }
      });
    }
    
    // Location
    if (formik.values.location) {
      chips.push({
        key: 'location',
        label: `Near: ${formik.values.location}`,
        onDelete: () => {
          formik.setFieldValue('location', '');
          if (autoSearch) formik.submitForm();
        }
      });
    }
    
    // Sort by
    if (formik.values.sortBy && formik.values.sortBy !== 'date-asc') {
      const sortLabel = SORT_OPTIONS.find(opt => opt.value === formik.values.sortBy)?.label || 'Sorted';
      chips.push({
        key: 'sort',
        label: sortLabel,
        onDelete: () => {
          formik.setFieldValue('sortBy', 'date-asc');
          if (autoSearch) formik.submitForm();
        }
      });
    }
    
    return chips;
  };
  
  // Render filter section
  const renderFilterSection = (title, icon, filterKey, children) => {
    const isExpanded = isMobile ? activeFilter === filterKey : expandedFilters[filterKey];
    const Icon = icon || EventIcon;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Box 
          onClick={() => handleFilterToggle(filterKey)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 1.5,
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <Box display="flex" alignItems="center">
            <Icon color="action" fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="subtitle2" fontWeight="medium">
              {title}
            </Typography>
          </Box>
          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 3, pr: 1, py: 1 }}>
            {children}
          </Box>
        </Collapse>
        
        <Divider sx={{ my: 1 }} />
      </Box>
    );
  };
  
  // Render filter panel
  const renderFilterPanel = () => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        borderRadius: 2,
        position: isMobile ? 'fixed' : 'static',
        top: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : 'auto',
        height: isMobile ? '80vh' : 'auto',
        zIndex: isMobile ? theme.zIndex.modal : 'auto',
        overflowY: 'auto',
        ...sx
      }}
    >
      {isMobile && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={() => setMobileOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      
      <form onSubmit={formik.handleSubmit}>
        {/* Categories */}
        {renderFilterSection(
          'Categories', 
          CategoryIcon, 
          'categories',
          <FormGroup>
            {EVENT_CATEGORIES.map((category) => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox
                    checked={formik.values.categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    size="small"
                    color="primary"
                  />
                }
                label={category}
                sx={{ 
                  '& .MuiFormControlLabel-label': { 
                    fontSize: '0.875rem',
                    color: formik.values.categories.includes(category) 
                      ? 'primary.main' 
                      : 'text.primary'
                  },
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              />
            ))}
          </FormGroup>
        )}
        
        {/* Date Range */}
        {renderFilterSection(
          'Date Range', 
          DateRangeIcon, 
          'dateRange',
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateRangePicker
              value={formik.values.dateRange}
              onChange={(newValue) => {
                formik.setFieldValue('dateRange', newValue);
                if (autoSearch) formik.submitForm();
              }}
              renderInput={(startProps, endProps) => (
                <Box display="flex" alignItems="center" flexWrap="wrap">
                  <Box flex={1} mr={1}>
                    <TextField
                      {...startProps}
                      label="Start date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Box flex={1} ml={1}>
                    <TextField
                      {...endProps}
                      label="End date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Box>
              )}
            />
          </LocalizationProvider>
        )}
        
        {/* Event Type */}
        {renderFilterSection(
          'Event Type', 
          EventIcon, 
          'type',
          <FormGroup>
            {EVENT_TYPES.map((type) => (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={formik.values.eventType.includes(type)}
                    onChange={() => handleEventTypeToggle(type)}
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    size="small"
                    color="primary"
                  />
                }
                label={type}
                sx={{ 
                  '& .MuiFormControlLabel-label': { 
                    fontSize: '0.875rem',
                    color: formik.values.eventType.includes(type) 
                      ? 'primary.main' 
                      : 'text.primary'
                  },
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              />
            ))}
          </FormGroup>
        )}
        
        {/* Price Range */}
        {renderFilterSection(
          'Price Range', 
          null, 
          'price',
          <Box sx={{ px: 1 }}>
            <Slider
              value={formik.values.priceRange}
              onChange={(e, newValue) => {
                formik.setFieldValue('priceRange', newValue);
              }}
              onChangeCommitted={() => {
                if (autoSearch) formik.submitForm();
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `$${value}`}
              min={0}
              max={100}
              step={5}
              sx={{ mt: 3 }}
            />
            <Box display="flex" justifyContent="space-between" mt={-1}>
              <Typography variant="caption" color="textSecondary">
                ${formik.values.priceRange[0]}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ${formik.values.priceRange[1]}
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Location */}
        {renderFilterSection(
          'Location', 
          LocationIcon, 
          'location',
          <TextField
            fullWidth
            size="small"
            placeholder="City, state, or venue"
            value={formik.values.location}
            onChange={(e) => {
              formik.setFieldValue('location', e.target.value);
              if (autoSearch) formik.submitForm();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: formik.values.location && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      formik.setFieldValue('location', '');
                      if (autoSearch) formik.submitForm();
                    }}
                    edge="end"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
        
        {/* Sort By */}
        {renderFilterSection(
          'Sort By', 
          null, 
          'sort',
          <FormControl fullWidth size="small">
            <Select
              value={formik.values.sortBy}
              onChange={(e) => {
                formik.setFieldValue('sortBy', e.target.value);
                if (autoSearch) formik.submitForm();
              }}
              displayEmpty
              fullWidth
              sx={{ fontSize: '0.875rem' }}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        {/* Action Buttons */}
        <Box display="flex" justifyContent="space-between" mt={3}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
            startIcon={<ClearIcon />}
          >
            Clear All
          </Button>
          
          {!autoSearch && (
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="small"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Applying...' : 'Apply Filters'}
            </Button>
          )}
        </Box>
      </form>
    </Paper>
  );
  
  return (
    <Box sx={{ width: '100%', ...sx }}>
      {/* Search Bar */}
      <Paper 
        component="form" 
        onSubmit={formik.handleSubmit}
        elevation={elevation}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          borderRadius: 2,
          ...sx
        }}
      >
        <TextField
          fullWidth
          variant={variant}
          placeholder={placeholder}
          value={formik.values.query}
          onChange={(e) => {
            formik.setFieldValue('query', e.target.value);
            if (autoSearch) formik.submitForm();
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {formik.values.query && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      formik.setFieldValue('query', '');
                      if (autoSearch) formik.submitForm();
                    }}
                    edge="end"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
                
                <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                
                <Tooltip title="Filters">
                  <IconButton 
                    color={hasActiveFilters ? 'primary' : 'default'}
                    onClick={() => isMobile ? setMobileOpen(true) : setAnchorEl(document.getElementById('filter-button'))}
                    id="filter-button"
                    aria-label="filters"
                    aria-controls={anchorEl ? 'filter-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={anchorEl ? 'true' : undefined}
                  >
                    <Badge 
                      color="primary" 
                      variant="dot" 
                      invisible={!hasActiveFilters}
                      overlap="circular"
                    >
                      <FilterListIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
            disableUnderline: variant === 'standard' ? false : undefined,
          }}
          sx={{
            '& .MuiInputBase-root': {
              pl: 1.5,
            },
            '& .MuiInputBase-input': {
              py: variant === 'standard' ? 1.5 : 1,
            },
          }}
        />
        
        {!autoSearch && (
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            sx={{ ml: 1, whiteSpace: 'nowrap' }}
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? 'Searching...' : 'Search'}
          </Button>
        )}
      </Paper>
      
      {/* Active Filters */}
      {(hasActiveFilters || !autoSearch) && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {renderActiveFilters().map(chip => (
            <Chip
              key={chip.key}
              label={chip.label}
              onDelete={chip.onDelete}
              size="small"
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
          
          {hasActiveFilters && (
            <Button 
              size="small" 
              onClick={handleClearAll}
              startIcon={<ClearIcon />}
              sx={{ ml: 'auto' }}
            >
              Clear All
            </Button>
          )}
        </Box>
      )}
      
      {/* Filter Panel - Desktop */}
      {!isMobile && (
        <Popover
          id="filter-menu"
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              width: 320,
              maxHeight: '80vh',
              overflowY: 'auto',
              borderRadius: 2,
              mt: 1,
              boxShadow: theme.shadows[3],
            },
          }}
        >
          {renderFilterPanel()}
        </Popover>
      )}
      
      {/* Filter Panel - Mobile */}
      {isMobile && (
        <Box>
          <Collapse in={mobileOpen} timeout="auto" unmountOnExit>
            {renderFilterPanel()}
          </Collapse>
          
          {/* Mobile filter button */}
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TuneIcon />}
            endIcon={mobileOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mt: 1 }}
          >
            {mobileOpen ? 'Hide Filters' : 'Show Filters'}
            {hasActiveFilters && (
              <Box 
                component="span" 
                sx={{
                  ml: 1,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                }}
              >
                {renderActiveFilters().length}
              </Box>
            )}
          </Button>
        </Box>
      )}
      
      {/* Results Count */}
      {showResultsCount && formik.values.query && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Showing results for "{formik.values.query}"
        </Typography>
      )}
    </Box>
  );
};

export default EventSearch;
