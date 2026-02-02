const express = require('express');
const router = express.Router();
const { fetchImages, getRandomPhoto, getServiceImages } = require('../utils/unsplash');

/**
 * GET /api/unsplash/search
 * Search for images by query
 */
router.get('/search', async (req, res) => {
  try {
    const { query, perPage = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query parameter is required' 
      });
    }

    const images = await fetchImages(query, parseInt(perPage));
    
    res.json({
      success: true,
      data: images,
      count: images.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching images',
      error: error.message 
    });
  }
});

/**
 * GET /api/unsplash/random
 * Get a random photo by query
 */
router.get('/random', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query parameter is required' 
      });
    }

    const image = await getRandomPhoto(query);
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'No image found' 
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching random photo',
      error: error.message 
    });
  }
});

/**
 * GET /api/unsplash/service-images
 * Get images for AI haircut, tutor, and car wash services
 */
router.get('/service-images', async (req, res) => {
  try {
    const images = await getServiceImages();
    
    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching service images',
      error: error.message 
    });
  }
});

module.exports = router;
