const express = require('express');
const { Package, StudentPackage } = require('../models');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all packages
router.get('/', verifyToken, async (req, res) => {
  try {
    const packages = await Package.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(packages);
  } catch (error) {
    console.error('Get all packages error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active packages only
router.get('/active', verifyToken, async (req, res) => {
  try {
    const packages = await Package.findAll({
      where: { active: true },
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(packages);
  } catch (error) {
    console.error('Get active packages error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get package by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const packageData = await Package.findByPk(id);
    
    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    return res.json(packageData);
  } catch (error) {
    console.error('Get package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create package (admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      totalClasses, 
      durationMonths, 
      maxReschedules, 
      price 
    } = req.body;
    
    // Validate input
    if (!name || !totalClasses || !price) {
      return res.status(400).json({ 
        message: 'Name, total classes, and price are required' 
      });
    }
    
    // Create package
    const packageData = await Package.create({
      name,
      description: description || null,
      totalClasses,
      durationMonths: durationMonths || 1,
      maxReschedules: maxReschedules || 2,
      price,
      active: true
    });
    
    return res.status(201).json({
      message: 'Package created successfully',
      package: packageData
    });
  } catch (error) {
    console.error('Create package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update package (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      totalClasses, 
      durationMonths, 
      maxReschedules, 
      price, 
      active 
    } = req.body;
    
    const packageData = await Package.findByPk(id);
    
    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Update fields
    if (name) packageData.name = name;
    if (description !== undefined) packageData.description = description;
    if (totalClasses) packageData.totalClasses = totalClasses;
    if (durationMonths) packageData.durationMonths = durationMonths;
    if (maxReschedules !== undefined) packageData.maxReschedules = maxReschedules;
    if (price) packageData.price = price;
    if (active !== undefined) packageData.active = active;
    
    await packageData.save();
    
    return res.json({
      message: 'Package updated successfully',
      package: packageData
    });
  } catch (error) {
    console.error('Update package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students with this package
router.get('/:id/students', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const studentPackages = await StudentPackage.findAll({
      where: { packageId: id },
      include: ['student']
    });
    
    return res.json(studentPackages);
  } catch (error) {
    console.error('Get package students error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 