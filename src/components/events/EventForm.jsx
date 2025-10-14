import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Chip,
  IconButton,
  InputAdornment,
  FormHelperText,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  CalendarToday,
  LocationOn,
  Description,
  Category,
  Image,
  Close,
  Add,
  Delete,
  Save,
  ArrowBack,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';

// Event categories
const EVENT_CATEGORIES = [
  'Academic',
  'Social',
  'Sports',
  'Workshop',
  'Conference',
  'Networking',
  'Entertainment',
  'Other',
];

// Form validation schema
const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .max(100, 'Title must be at most 100 characters'),
  description: Yup.string()
    .max(1000, 'Description must be at most 1000 characters'),
  startDate: Yup.date()
    .required('Start date is required')
    .min(new Date(), 'Start date must be in the future'),
  endDate: Yup.date()
    .min(Yup.ref('startDate'), 'End date must be after start date')
    .nullable(),
  location: Yup.string()
    .required('Location is required')
    .max(200, 'Location must be at most 200 characters'),
  category: Yup.string()
    .required('Category is required'),
  isFeatured: Yup.boolean(),
  capacity: Yup.number()
    .positive('Capacity must be a positive number')
    .integer('Capacity must be an integer')
    .nullable(),
  tags: Yup.array()
    .of(Yup.string().max(20, 'Tag must be at most 20 characters')),
});

const EventForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      startDate: new Date(),
      endDate: null,
      location: '',
      category: '',
      isFeatured: false,
      capacity: '',
      tags: [],
      isPublic: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        
        const eventData = {
          ...values,
          capacity: values.capacity || null,
        };
        
        let result;
        
        if (isEditMode) {
          // Update existing event
          result = await eventService.updateEvent(id, eventData, imageFile);
          enqueueSnackbar('Event updated successfully', { variant: 'success' });
        } else {
          // Create new event
          result = await eventService.createEvent(eventData, imageFile);
          enqueueSnackbar('Event created successfully', { variant: 'success' });
        }
        
        // Navigate to the event details page
        navigate(`/events/${result.data._id}`);
      } catch (error) {
        console.error('Error saving event:', error);
        enqueueSnackbar(
          error.response?.data?.message || 'Failed to save event. Please try again.',
          { variant: 'error' }
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Load event data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await eventService.getEvent(id);
        const event = response.data;
        
        // Set form values
        formik.setValues({
          title: event.title,
          description: event.description || '',
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : null,
          location: event.location,
          category: event.category,
          isFeatured: event.isFeatured || false,
          capacity: event.capacity || '',
          tags: event.tags || [],
          isPublic: event.isPublic !== false, // Default to true if not set
        });
        
        // Set image preview if available
        if (event.imageUrl) {
          setImagePreview(event.imageUrl);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        enqueueSnackbar('Failed to load event data', { variant: 'error' });
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      enqueueSnackbar('Please select a valid image file', { variant: 'error' });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('Image size should be less than 5MB', { variant: 'error' });
      return;
    }
    
    setImageFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    // Clear the file input
    document.getElementById('event-image-upload').value = '';
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || formik.values.tags.includes(tagInput.trim())) {
      setTagInput('');
      return;
    }
    
    formik.setFieldValue('tags', [...formik.values.tags, tagInput.trim()]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    formik.setFieldValue(
      'tags',
      formik.values.tags.filter(tag => tag !== tagToRemove)
    );
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton 
            component={Link} 
            to={isEditMode ? `/events/${id}` : '/events'}
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit Event' : 'Create New Event'}
          </Typography>
        </Box>
        
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Event Details
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="title"
                      name="title"
                      label="Event Title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.title && Boolean(formik.errors.title)}
                      helperText={formik.touched.title && formik.errors.title}
                      variant="outlined"
                      margin="normal"
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="Start Date & Time"
                      value={formik.values.startDate}
                      onChange={(date) => formik.setFieldValue('startDate', date, true)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                          helperText={formik.touched.startDate && formik.errors.startDate}
                          required
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <DateTimePicker
                      label="End Date & Time (Optional)"
                      value={formik.values.endDate}
                      onChange={(date) => formik.setFieldValue('endDate', date, true)}
                      minDateTime={formik.values.startDate}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={formik.touched.endDate && Boolean(formik.errors.endDate)}
                          helperText={formik.touched.endDate && formik.errors.endDate}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="location"
                      name="location"
                      label="Location"
                      value={formik.values.location}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.location && Boolean(formik.errors.location)}
                      helperText={formik.touched.location && formik.errors.location}
                      variant="outlined"
                      margin="normal"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOn color="action" />
                          </InputAdornment>
                        ),
                      }}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="description"
                      name="description"
                      label="Event Description"
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      variant="outlined"
                      margin="normal"
                      multiline
                      rows={4}
                      placeholder="Tell people what your event is about..."
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl 
                      fullWidth 
                      margin="normal"
                      error={formik.touched.category && Boolean(formik.errors.category)}
                    >
                      <InputLabel id="category-label">Category *</InputLabel>
                      <Select
                        labelId="category-label"
                        id="category"
                        name="category"
                        value={formik.values.category}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        label="Category *"
                        required
                      >
                        <MenuItem value="">
                          <em>Select a category</em>
                        </MenuItem>
                        {EVENT_CATEGORIES.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.category && formik.errors.category && (
                        <FormHelperText>{formik.errors.category}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="capacity"
                      name="capacity"
                      label="Capacity (Optional)"
                      type="number"
                      value={formik.values.capacity}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.capacity && Boolean(formik.errors.capacity)}
                      helperText={formik.touched.capacity && formik.errors.capacity}
                      variant="outlined"
                      margin="normal"
                      placeholder="Leave empty for unlimited"
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box mb={1}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Tags (Optional)
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <TextField
                          fullWidth
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="Add tags (press Enter or comma to add)"
                          variant="outlined"
                          size="small"
                          margin="none"
                        />
                        <Button
                          onClick={handleAddTag}
                          startIcon={<Add />}
                          sx={{ ml: 1 }}
                          variant="outlined"
                        >
                          Add
                        </Button>
                      </Box>
                      <Box mt={1}>
                        {formik.values.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            onDelete={() => handleRemoveTag(tag)}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Event Image
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box 
                  sx={{
                    border: `2px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                    p: 3,
                    textAlign: 'center',
                    mb: 2,
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: theme.palette.background.paper,
                    backgroundImage: imagePreview ? `url(${imagePreview})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {!imagePreview && (
                    <>
                      <Image fontSize="large" color="action" sx={{ mb: 1 }} />
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Upload an event image (optional)
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                        Recommended size: 1200x630px
                      </Typography>
                    </>
                  )}
                  
                  <input
                    accept="image/*"
                    id="event-image-upload"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  
                  {!imagePreview ? (
                    <label htmlFor="event-image-upload">
                      <Button
                        variant="contained"
                        color="primary"
                        component="span"
                        startIcon={<Image />}
                        sx={{ mt: 1 }}
                      >
                        Choose Image
                      </Button>
                    </label>
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s',
                        '&:hover': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleRemoveImage}
                      >
                        Remove
                      </Button>
                    </Box>
                  )}
                </Box>
                
                <Typography variant="body2" color="textSecondary" align="center">
                  A great image makes your event stand out
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Event Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.isFeatured}
                      onChange={formik.handleChange}
                      name="isFeatured"
                      color="primary"
                    />
                  }
                  label="Feature this event"
                  sx={{ mb: 2, display: 'block' }}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.isPublic}
                      onChange={formik.handleChange}
                      name="isPublic"
                      color="primary"
                    />
                  }
                  label="Make this event public"
                  sx={{ display: 'block' }}
                />
                
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1, mb: 2 }}>
                  {formik.values.isPublic 
                    ? 'Anyone can see and join this event.' 
                    : 'Only people with the link can see and join this event.'}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between" mt={3}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate(isEditMode ? `/events/${id}` : '/events')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
                    disabled={!formik.isValid || isSubmitting}
                  >
                    {isEditMode ? 'Update Event' : 'Create Event'}
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default EventForm;
