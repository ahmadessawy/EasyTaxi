// app.js - EasyTaxi backend server using Express

// Import the Express library to create the server
const express = require('express');
// Create an Express application
const app = express();
// Set the port for the server to listen on
const PORT = process.env.PORT || 3000;

// Use built-in middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for all routes
const cors = require('cors');
// app.use(cors({ origin: 'https://zakajobs.com' }));

// Add a simple root route for sponsors/demo
app.get('/', (req, res) => {
    res.send('<h2>Welcome to EasyTaxi Backend API</h2><p>Use /api/customers, /api/drivers, /api/rides endpoints.</p>');
});

// In-memory array to store rides (no database for MVP)
let rides = [];
// Counter to assign unique IDs to rides
let nextId = 1;

// Predefined list of 10 customers
const customers = [
    { id: 1, name: 'Customer #1' },
    { id: 2, name: 'Customer #2' },
    { id: 3, name: 'Customer #3' },
    { id: 4, name: 'Customer #4' },
    { id: 5, name: 'Customer #5' },
    { id: 6, name: 'Customer #6' },
    { id: 7, name: 'Customer #7' },
    { id: 8, name: 'Customer #8' },
    { id: 9, name: 'Customer #9' },
    { id: 10, name: 'Customer #10' }
];

// Predefined list of 10 drivers
const drivers = [
    { id: 1, name: 'Driver #1' },
    { id: 2, name: 'Driver #2' },
    { id: 3, name: 'Driver #3' },
    { id: 4, name: 'Driver #4' },
    { id: 5, name: 'Driver #5' },
    { id: 6, name: 'Driver #6' },
    { id: 7, name: 'Driver #7' },
    { id: 8, name: 'Driver #8' },
    { id: 9, name: 'Driver #9' },
    { id: 10, name: 'Driver #10' }
];

// Endpoint: Get list of customers
app.get('/api/customers', (req, res) => {
    // Respond with the predefined customers list
    res.json(customers);
});

// Endpoint: Get list of drivers
app.get('/api/drivers', (req, res) => {
    // Respond with the predefined drivers list
    res.json(drivers);
});

// Endpoint: Customer requests a ride
app.post('/api/rides', (req, res) => {
    // Extract ride details from request body
    const { customerId, station, pickup, dropoff, passengers } = req.body;
    // Validate required fields
    if (!customerId || !station || !pickup || !dropoff || !passengers) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    // Find customer info
    const customer = customers.find(c => c.id == customerId);
    if (!customer) {
        return res.status(400).json({ error: 'Invalid customer' });
    }
        // Check if customer already has an active ride (pending, accepted, ongoing)
        const activeRide = rides.find(r => r.customerId == customerId && ['pending','accepted','ongoing'].includes(r.status));
        if (activeRide) {
            return res.status(400).json({ error: 'Customer already has an active ride' });
        }
    // Create a new ride object
    const ride = {
        id: nextId++, // Unique ride ID
        customerId, // Customer ID
        customerName: customer.name, // Customer name
        station, // Metro station
        pickup, // Pickup location
        dropoff, // Drop-off location
        passengers, // Number of passengers
        status: 'pending', // Initial status
        driverId: null, // Will be set when accepted
        driverName: null // Will be set when accepted
    };
    // Add ride to the array
    rides.push(ride);
    // Respond with the created ride
    res.json(ride);
});

// Endpoint: List rides (optionally filter by status)
app.get('/api/rides', (req, res) => {
    // Get status filter from query string
    const { status } = req.query;
    // If status is provided, filter rides
    let filtered = rides;
    if (status) {
        filtered = rides.filter(r => r.status === status);
    }
    // Respond with filtered rides (including customer/driver info)
    res.json(filtered);
});

// Endpoint: Driver accepts a ride
app.post('/api/rides/:id/accept', (req, res) => {
    // Get ride ID from URL
    const id = parseInt(req.params.id);
    // Get driverId from request body (for assignment)
    const { driverId } = req.body;
    // Find the ride by ID
    const ride = rides.find(r => r.id === id);
    if (!ride) {
        // If ride not found, respond with error
        return res.status(404).json({ error: 'Ride not found' });
    }
    if (ride.status !== 'pending') {
        return res.status(400).json({ error: 'Ride is not pending' });
    }
    // Find driver info
    const driver = drivers.find(d => d.id == driverId);
    if (!driver) {
        return res.status(400).json({ error: 'Invalid driver' });
    }
    // Assign driver and update status
    ride.status = 'accepted';
    ride.driverId = driver.id;
    ride.driverName = driver.name;
    // Respond with updated ride
    res.json(ride);
    });

    // Endpoint: Driver starts a ride (only if accepted)
    app.post('/api/rides/:id/start', (req, res) => {
        const id = parseInt(req.params.id);
        const { driverId } = req.body;
        const ride = rides.find(r => r.id === id);
        if (!ride) return res.status(404).json({ error: 'Ride not found' });
        if (ride.status !== 'accepted') return res.status(400).json({ error: 'Ride is not accepted' });
        if (ride.driverId !== driverId) return res.status(403).json({ error: 'Only assigned driver can start the ride' });
        // Check if driver already has another ongoing ride
        const ongoing = rides.find(r => r.driverId === driverId && r.status === 'ongoing');
        if (ongoing) return res.status(400).json({ error: 'Driver already has an ongoing ride' });
        ride.status = 'ongoing';
        res.json(ride);
    });

    // Endpoint: End a ride (driver or admin)
    app.post('/api/rides/:id/end', (req, res) => {
        const id = parseInt(req.params.id);
        const { driverId, role } = req.body;
        const ride = rides.find(r => r.id === id);
        console.log('END RIDE DEBUG:', {
            rideId: req.params.id,
            rideDriverId: ride ? ride.driverId : undefined,
            requestDriverId: driverId,
            rideObj: ride
        });
        if (!ride) return res.status(404).json({ error: 'Ride not found' });
        if (ride.status !== 'ongoing') return res.status(400).json({ error: 'Ride is not ongoing' });
        // Only assigned driver or admin can end
            if (role === 'admin' || (role === 'driver' && parseInt(driverId) === parseInt(ride.driverId))) {
            ride.status = 'completed';
            return res.json(ride);
        }
        return res.status(403).json({ error: 'Only assigned driver or admin can end the ride' });
});

// Endpoint: Complete a ride (driver or admin)
app.post('/api/rides/:id/complete', (req, res) => {
    // Get ride ID from URL
    const id = parseInt(req.params.id);
    // Find the ride by ID
    const ride = rides.find(r => r.id === id);
    if (!ride) {
        // If ride not found, respond with error
        return res.status(404).json({ error: 'Ride not found' });
    }
    if (ride.status !== 'accepted') {
        return res.status(400).json({ error: 'Ride is not accepted' });
    }
    // Update ride status to completed
    ride.status = 'completed';
    // Respond with updated ride
    res.json(ride);
});

// Endpoint: Cancel a ride (admin)
app.post('/api/rides/:id/cancel', (req, res) => {
    const id = parseInt(req.params.id);
    const { role, userId } = req.body; // role: 'customer', 'driver', 'admin'
    const ride = rides.find(r => r.id === id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status === 'completed') return res.status(400).json({ error: 'Cannot cancel a completed ride' });
    // Only admin can cancel anytime except completed
    if (role === 'admin') {
        ride.status = 'cancelled';
        return res.json(ride);
    }
    // Customer can cancel only if pending, accepted, ongoing
    if (role === 'customer') {
        if (ride.customerId !== userId) return res.status(403).json({ error: 'Only requesting customer can cancel' });
        if (!['pending','accepted','ongoing'].includes(ride.status)) return res.status(400).json({ error: 'Customer can only cancel active ride' });
        ride.status = 'cancelled';
        return res.json(ride);
    }
    // Driver can cancel only if accepted or ongoing
    if (role === 'driver') {
        if (ride.driverId !== userId) return res.status(403).json({ error: 'Only assigned driver can cancel' });
        if (!['accepted','ongoing'].includes(ride.status)) return res.status(400).json({ error: 'Driver can only cancel accepted or ongoing ride' });
        ride.status = 'cancelled';
        return res.json(ride);
    }
    return res.status(403).json({ error: 'Invalid role or permission' });
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
    // Log a message when server starts
    console.log(`EasyTaxi backend running on http://localhost:${PORT}`);
});
