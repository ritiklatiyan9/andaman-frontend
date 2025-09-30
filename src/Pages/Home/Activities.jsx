// src/Pages/Home/Activities.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Search, 
  MapPin, 
  Star, 
  Calendar, 
  Users, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_BASE_URL } from '../../config/api';

// Zod schema for booking form validation
const bookingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  participants: z.number().min(1, "At least 1 participant required").max(20, "Maximum 20 participants"),
  specialRequests: z.string().max(500, "Special requests must be less than 500 characters").optional()
});

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    destination: '',
    minPrice: 0,
    maxPrice: 100000
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState('activities');
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch activities
  useEffect(() => {
    if (view !== 'activities') return;
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/api/activities`, { headers });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error('Unauthorized access - please log in');
            setError('Please log in to view activities');
          } else {
            throw new Error(`Failed to fetch activities: ${response.status}`);
          }
          return;
        }
        
        const data = await response.json();
        setActivities(data.data?.activities || []);
        setFilteredActivities(data.data?.activities || []);
        const total = data.data?.pagination?.total || data.data?.activities?.length || 0;
        setTotalPages(Math.ceil(total / 6));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [view]);

  // Fetch user bookings
  useEffect(() => {
    if (view !== 'my-bookings') return;
    const fetchBookings = async () => {
      try {
        setMyBookingsLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('No access token found');
          setMyBookingsLoading(false);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/activities/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error('Unauthorized access - please log in');
          } else {
            throw new Error(`Failed to fetch bookings: ${response.status}`);
          }
          setMyBookingsLoading(false);
          return;
        }
        
        const data = await response.json();
        setBookings(data.data?.bookings || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err.message);
      } finally {
        setMyBookingsLoading(false);
      }
    };
    fetchBookings();
  }, [view]);

  // Apply filters and search for activities
  useEffect(() => {
    if (view !== 'activities') return;
    let result = activities;

    if (searchQuery) {
      result = result.filter(activity => 
        activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.destination.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.category) {
      result = result.filter(activity => 
        activity.category.toLowerCase() === filters.category.toLowerCase()
      );
    }
    
    if (filters.destination) {
      result = result.filter(activity => 
        activity.destination.toLowerCase() === filters.destination.toLowerCase()
      );
    }
    
    result = result.filter(activity => 
      activity.price >= filters.minPrice && activity.price <= filters.maxPrice
    );

    setFilteredActivities(result);
    setTotalPages(Math.ceil(result.length / 6));
    setCurrentPage(1);
  }, [searchQuery, filters, activities, view]);

  // Pagination for activities
  const startIndex = (currentPage - 1) * 6;
  const currentActivities = filteredActivities.slice(startIndex, startIndex + 6);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(e.target.search.value);
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      category: '',
      destination: '',
      minPrice: 0,
      maxPrice: 100000
    });
    setSearchQuery('');
  };

  // Handle booking form submission
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(bookingSchema)
  });

  const onSubmitBooking = async (data) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('Please log in to make a booking');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/activities/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_id: selectedActivity.activity_id,
          activity_date: data.date,
          participants_count: data.participants,
          total_amount: selectedActivity.price * data.participants,
          special_requests: data.specialRequests
        })
      });

      if (response.ok) {
        alert('Booking created successfully!');
        setShowBookingModal(false);
        reset();
        if (view === 'my-bookings') {
            const updatedBookings = await (await fetch(`${API_BASE_URL}/api/activities/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })).json();
          setBookings(updatedBookings.data?.bookings || []);
        }
      } else {
        const error = await response.json();
        alert(`Booking failed: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error occurred');
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('Please log in to cancel a booking');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/activities/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setBookings(prev => prev.map(booking => 
          booking.booking_id === bookingId 
            ? { ...booking, booking_status: result.data.booking_status } 
            : booking
        ));
        alert('Booking cancelled successfully');
      } else {
        const error = await response.json();
        alert(`Cancellation failed: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error occurred');
    }
  };

  const switchToMyBookings = () => {
    setView('my-bookings');
  };

  const switchToActivities = () => {
    setView('activities');
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === 'upcoming') return booking.booking_status === 'confirmed' || booking.booking_status === 'pending';
    if (activeTab === 'past') return booking.booking_status === 'completed';
    return booking.booking_status === 'cancelled';
  });

  // --- Render Logic ---
  if (view === 'activities') {
    if (loading) return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

    if (error) return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-red-500">Error: {error}</p>
      </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with My Bookings Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Activities</h2>
            <Button
              onClick={switchToMyBookings}
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              My Bookings
            </Button>
          </div>

          {/* Search and Filters Section */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    name="search"
                    placeholder="Search activities..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Search
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden flex items-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </form>

            {/* Filters Panel */}
            <div className={`bg-white p-4 rounded-xl shadow-sm mb-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">All Categories</option>
                    <option value="adventure">Adventure</option>
                    <option value="nature">Nature</option>
                    <option value="cultural">Cultural</option>
                    <option value="water">Water Sports</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Destination</label>
                  <select
                    value={filters.destination}
                    onChange={(e) => handleFilterChange('destination', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">All Destinations</option>
                    <option value="paris">Paris</option>
                    <option value="tokyo">Tokyo</option>
                    <option value="new york">New York</option>
                    <option value="bali">Bali</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Price Range</label>
                  <div className="flex items-center space-x-2">
                    <span>₹{filters.minPrice}</span>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
                      className="w-full"
                    />
                    <span>₹{filters.maxPrice}</span>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetFilters}
                    className="w-full"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Activities List */}
          {filteredActivities.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No activities found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {currentActivities.map((activity) => (
                  <motion.div
                    key={activity.activity_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <img 
                          src={activity.photos?.[0] || 'https://placehold.co/400x200?text=Activity+Image'} 
                          alt={activity.name} 
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="ml-1 text-sm">{activity.average_rating || '4.8'}</span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{activity.name}</h3>
                            <div className="flex items-center text-gray-600 mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="text-sm">{activity.destination}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₹{activity.price}</p>
                            <p className="text-xs text-gray-500">per person</p>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                          {activity.description}
                        </p>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/activities/${activity.activity_id}`)}
                          >
                            View Details
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedActivity(activity);
                              setShowBookingModal(true);
                            }}
                          >
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-full ${currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-full ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-full ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Booking Modal */}
        {showBookingModal && selectedActivity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Book {selectedActivity.name}</h3>
                <button 
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      {...register('date')}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 p-2 border rounded-lg"
                    />
                  </div>
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Participants</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="number"
                      {...register('participants', { valueAsNumber: true })}
                      min="1"
                      max="20"
                      className="w-full pl-10 p-2 border rounded-lg"
                    />
                  </div>
                  {errors.participants && <p className="text-red-500 text-sm mt-1">{errors.participants.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Special Requests</label>
                  <textarea
                    {...register('specialRequests')}
                    rows="3"
                    placeholder="Any special requests..."
                    className="w-full p-2 border rounded-lg"
                  ></textarea>
                  {errors.specialRequests && <p className="text-red-500 text-sm mt-1">{errors.specialRequests.message}</p>}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowBookingModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Book Activity
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  } else if (view === 'my-bookings') {
    if (myBookingsLoading) return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

    if (error) return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-red-500">Error loading bookings: {error}</p>
        <Button onClick={switchToActivities} className="mt-4">Back to Activities</Button>
      </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Back Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Bookings</h1>
            <Button
              onClick={switchToActivities}
              variant="outline"
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Back to Activities
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {filteredBookings.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No bookings found in this category</p>
              <Button onClick={switchToActivities} className="mt-4">Browse Activities</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map(booking => (
                <Card key={booking.booking_id} className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{booking.activity_name}</h3>
                      <p className="text-gray-600 mt-1">
                        {new Date(booking.activity_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.booking_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col items-end">
                      <p className="text-lg font-bold">₹{booking.total_amount}</p>
                      <p className="text-gray-600">{booking.participants_count} {booking.participants_count === 1 ? 'person' : 'people'}</p>
                      {booking.booking_status === 'confirmed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelBooking(booking.booking_id)}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// Activity Detail Page Component
export const ActivityDetail = ({ id }) => {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/activities/${id}`);
        if (!response.ok) throw new Error(`Failed to fetch activity: ${response.status}`);
        const data = await response.json();
        setActivity(data.data.activity);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(bookingSchema)
  });

  const onSubmitBooking = async (data) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('Please log in to make a booking');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/activities/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_id: activity.activity_id,
          activity_date: data.date,
          participants_count: data.participants,
          total_amount: activity.price * data.participants,
          special_requests: data.specialRequests
        })
      });

      if (response.ok) {
        alert('Booking created successfully!');
        setShowBookingModal(false);
      } else {
        const error = await response.json();
        alert(`Booking failed: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error occurred');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-center py-10">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <p className="mt-2 text-red-500">Error: {error}</p>
    </div>
  );

  if (!activity) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/activities')}
          className="mb-6 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Activities
        </Button>
        
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <img 
            src={activity.photos?.[0] || 'https://placehold.co/1200x400?text=Activity+Image'} 
            alt={activity.name} 
            className="w-full h-96 object-cover"
          />
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h1 className="text-3xl font-bold">{activity.name}</h1>
                <div className="flex items-center mt-2">
                  <MapPin className="h-5 w-5 text-gray-500 mr-1" />
                  <span className="text-gray-600">{activity.destination}</span>
                  <div className="flex items-center ml-4">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="ml-1 font-medium">{activity.average_rating || '4.8'}</span>
                    <span className="text-gray-500 ml-1">({activity.total_reviews || 120} reviews)</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <p className="text-3xl font-bold">₹{activity.price}</p>
                <p className="text-gray-600">per person</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h2 className="text-xl font-bold mb-3">About this activity</h2>
                <p className="text-gray-700 leading-relaxed">
                  {activity.description}
                </p>
                
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-3">What's included</h3>
                  <ul className="space-y-2">
                    {(activity.inclusions || []).map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-3">What's excluded</h3>
                  <ul className="space-y-2">
                    {(activity.exclusions || []).map((item, index) => (
                      <li key={index} className="flex items-start">
                        <X className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div>
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Available Dates</h3>
                  <div className="space-y-3">
                    {(activity.available_days || []).map((day, index) => (
                      <div key={index} className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-500 mr-2" />
                        <span>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowBookingModal(true)}
                  >
                    Book Now
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Book {activity.name}</h3>
              <button 
                onClick={() => setShowBookingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    {...register('date')}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 p-2 border rounded-lg"
                  />
                </div>
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Number of Participants</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="number"
                    {...register('participants', { valueAsNumber: true })}
                    min="1"
                    max="20"
                    className="w-full pl-10 p-2 border rounded-lg"
                  />
                </div>
                {errors.participants && <p className="text-red-500 text-sm mt-1">{errors.participants.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Special Requests</label>
                <textarea
                  {...register('specialRequests')}
                  rows="3"
                  placeholder="Any special requests..."
                  className="w-full p-2 border rounded-lg"
                ></textarea>
                {errors.specialRequests && <p className="text-red-500 text-sm mt-1">{errors.specialRequests.message}</p>}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Book Activity
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Activities;