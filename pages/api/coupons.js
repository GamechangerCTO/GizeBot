// Coupons Management API Endpoint
// Full CRUD operations for promotional coupons

const fs = require('fs');
const path = require('path');

// File to store coupons data
const COUPONS_FILE = path.join(process.cwd(), 'data', 'coupons.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(COUPONS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load coupons from file
function loadCoupons() {
  ensureDataDir();
  try {
    if (fs.existsSync(COUPONS_FILE)) {
      const data = fs.readFileSync(COUPONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading coupons:', error);
  }
  
  // Return default structure if file doesn't exist or error
  return {
    coupons: [],
    lastUpdated: new Date().toISOString(),
    totalCreated: 0
  };
}

// Save coupons to file
function saveCoupons(couponsData) {
  ensureDataDir();
  try {
    couponsData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(couponsData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving coupons:', error);
    return false;
  }
}

// Generate coupon ID
function generateCouponId() {
  return 'COUPON_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

export default async function handler(req, res) {
  try {
    console.log(`📋 Coupons API - ${req.method} request...`);

    const couponsData = loadCoupons();

    switch (req.method) {
      
      // GET - List all coupons or get specific coupon
      case 'GET': {
        const { code, active, expired, type } = req.query;
        
        let filteredCoupons = couponsData.coupons;

        // Filter by specific code
        if (code) {
          filteredCoupons = filteredCoupons.filter(c => c.code.toLowerCase() === code.toLowerCase());
        }

        // Filter by active status
        if (active !== undefined) {
          const now = new Date();
          if (active === 'true') {
            filteredCoupons = filteredCoupons.filter(c => 
              c.isActive && 
              (!c.expiryDate || new Date(c.expiryDate) > now) &&
              (!c.maxUses || c.usedCount < c.maxUses)
            );
          } else if (active === 'false') {
            filteredCoupons = filteredCoupons.filter(c => !c.isActive);
          }
        }

        // Filter by expired status
        if (expired !== undefined) {
          const now = new Date();
          if (expired === 'true') {
            filteredCoupons = filteredCoupons.filter(c => 
              c.expiryDate && new Date(c.expiryDate) <= now
            );
          }
        }

        // Filter by type
        if (type) {
          filteredCoupons = filteredCoupons.filter(c => c.type === type);
        }

        // Sort by creation date (newest first)
        filteredCoupons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({
          success: true,
          coupons: filteredCoupons,
          count: filteredCoupons.length,
          totalCoupons: couponsData.coupons.length,
          filters: { code, active, expired, type },
          timestamp: new Date().toISOString()
        });
      }

      // POST - Create new coupon
      case 'POST': {
        const {
          code,
          type = 'general',
          value,
          description,
          maxUses = null,
          expiryDate = null,
          isActive = true,
          metadata = {}
        } = req.body;

        // Validation
        if (!code || !value || !description) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: 'Code, value, and description are required'
          });
        }

        // Check if code already exists
        const existingCoupon = couponsData.coupons.find(c => c.code.toLowerCase() === code.toLowerCase());
        if (existingCoupon) {
          return res.status(400).json({
            success: false,
            error: 'Duplicate code',
            message: 'A coupon with this code already exists'
          });
        }

        // Create new coupon
        const newCoupon = {
          id: generateCouponId(),
          code: code.toUpperCase(),
          type: type,
          value: value,
          description: description,
          maxUses: maxUses,
          usedCount: 0,
          expiryDate: expiryDate,
          isActive: isActive,
          metadata: metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        couponsData.coupons.push(newCoupon);
        couponsData.totalCreated++;

        if (saveCoupons(couponsData)) {
          return res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            coupon: newCoupon,
            timestamp: new Date().toISOString()
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Save failed',
            message: 'Failed to save coupon data'
          });
        }
      }

      // PUT - Update existing coupon
      case 'PUT': {
        const { id } = req.query;
        const updates = req.body;

        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Missing coupon ID',
            message: 'Coupon ID is required for updates'
          });
        }

        const couponIndex = couponsData.coupons.findIndex(c => c.id === id);
        if (couponIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Coupon not found',
            message: 'No coupon found with the specified ID'
          });
        }

        // If updating code, check for duplicates
        if (updates.code) {
          const existingCoupon = couponsData.coupons.find(c => 
            c.id !== id && c.code.toLowerCase() === updates.code.toLowerCase()
          );
          if (existingCoupon) {
            return res.status(400).json({
              success: false,
              error: 'Duplicate code',
              message: 'Another coupon with this code already exists'
            });
          }
          updates.code = updates.code.toUpperCase();
        }

        // Update coupon
        const updatedCoupon = {
          ...couponsData.coupons[couponIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        couponsData.coupons[couponIndex] = updatedCoupon;

        if (saveCoupons(couponsData)) {
          return res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            coupon: updatedCoupon,
            timestamp: new Date().toISOString()
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Save failed',
            message: 'Failed to save coupon updates'
          });
        }
      }

      // DELETE - Delete coupon
      case 'DELETE': {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Missing coupon ID',
            message: 'Coupon ID is required for deletion'
          });
        }

        const couponIndex = couponsData.coupons.findIndex(c => c.id === id);
        if (couponIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Coupon not found',
            message: 'No coupon found with the specified ID'
          });
        }

        const deletedCoupon = couponsData.coupons.splice(couponIndex, 1)[0];

        if (saveCoupons(couponsData)) {
          return res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully',
            deletedCoupon: deletedCoupon,
            timestamp: new Date().toISOString()
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Save failed',
            message: 'Failed to save after deletion'
          });
        }
      }

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          message: 'Supported methods: GET, POST, PUT, DELETE'
        });
    }

  } catch (error) {
    console.error('❌ Error in coupons endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process coupon request',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}